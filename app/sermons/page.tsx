"use client";

import React, { useEffect, useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    BookOpen,
    RefreshCw,
    X,
    MousePointerClick,
    Radio,
    Plus,
    Trash2,
    CheckCircle2,
} from "lucide-react";
import { useSermons, Sermon, SermonPayload, LivePlatform } from "@/hooks/use-sermons";
import { useAuth } from "@/context/auth-context";
import { DismissibleError } from "@/components/ui/dismissible-error";
import { PaginationBar } from "@/components/ui/pagination-bar";

const SKELETON_ROWS = ["a", "b", "c", "d", "e", "f"] as const;

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
    });
}

const EMPTY_DRAFT: SermonPayload = {
    title: "", speakerName: "", date: "", description: "", youtubeUrl: "", mixlrUrl: "", series: "",
};

const SermonsPage = withAuth(() => {
    const {
        sermons, pagination, isLoading, isSaving, error,
        fetchSermons, createSermon, updateSermon, deleteSermon, announceLive,
    } = useSermons(20);
    const { hasPermission } = useAuth();
    const canWrite = hasPermission("sermon:write");

    const [selected, setSelected] = useState<Sermon | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [draft, setDraft] = useState<SermonPayload>(EMPTY_DRAFT);
    const [showAnnounce, setShowAnnounce] = useState(false);
    const [announceDraft, setAnnounceDraft] = useState<{ platform: LivePlatform; url: string; title: string }>({
        platform: "YOUTUBE", url: "", title: "",
    });
    const [announceSuccess, setAnnounceSuccess] = useState(false);

    useEffect(() => { fetchSermons(1); }, [fetchSermons]);

    useEffect(() => {
        if (selected) {
            setDraft({
                title: selected.title,
                speakerName: selected.speakerName,
                date: selected.date.slice(0, 10),
                description: selected.description ?? "",
                youtubeUrl: selected.youtubeUrl ?? "",
                mixlrUrl: selected.mixlrUrl ?? "",
                series: selected.series ?? "",
            });
            setIsCreating(false);
        }
    }, [selected]);

    function openCreate() {
        setSelected(null);
        setDraft(EMPTY_DRAFT);
        setIsCreating(true);
    }

    function closePanel() {
        setSelected(null);
        setIsCreating(false);
    }

    function toPayload(d: SermonPayload): SermonPayload {
        return {
            title: d.title.trim(),
            speakerName: d.speakerName.trim(),
            date: new Date(d.date).toISOString(),
            description: d.description?.trim() || undefined,
            youtubeUrl: d.youtubeUrl?.trim() || undefined,
            mixlrUrl: d.mixlrUrl?.trim() || undefined,
            series: d.series?.trim() || undefined,
        };
    }

    async function handleSave() {
        const payload = toPayload(draft);
        if (isCreating) {
            const ok = await createSermon(payload);
            if (ok) closePanel();
        } else if (selected) {
            const ok = await updateSermon(selected.id, payload);
            if (ok) closePanel();
        }
    }

    async function handleDelete() {
        if (!selected) return;
        if (!window.confirm(`Delete "${selected.title}"? This cannot be undone.`)) return;
        const ok = await deleteSermon(selected.id);
        if (ok) closePanel();
    }

    async function handleAnnounce() {
        const ok = await announceLive(
            announceDraft.platform,
            announceDraft.url.trim(),
            announceDraft.title.trim() || undefined,
        );
        if (ok) {
            setAnnounceSuccess(true);
            setAnnounceDraft({ platform: "YOUTUBE", url: "", title: "" });
            setTimeout(() => { setAnnounceSuccess(false); setShowAnnounce(false); }, 1500);
        }
    }

    const panelOpen = isCreating || !!selected;

    return (
        <div className="space-y-6 font-sans">

            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Sermon Archive</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Link-based sermon library
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchSermons(pagination?.page ?? 1)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 h-9 px-3 border border-[#121212]/10 rounded-lg text-xs font-semibold uppercase tracking-wider text-[#8A817C] hover:bg-[#F4F1EA]/50 disabled:opacity-40"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                    {canWrite && (
                        <button
                            onClick={() => setShowAnnounce(true)}
                            className="flex items-center gap-1.5 h-9 px-3 border border-red-200 bg-red-50 text-red-700 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-red-100 transition-colors"
                        >
                            <Radio className="w-3.5 h-3.5" />
                            Announce Live
                        </button>
                    )}
                    {canWrite && (
                        <button
                            onClick={openCreate}
                            className="flex items-center gap-1.5 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            New Sermon
                        </button>
                    )}
                </div>
            </div>

            <DismissibleError message={error} />

            <div className="grid grid-cols-12 gap-4">
                <div className={panelOpen ? "col-span-12 lg:col-span-7" : "col-span-12"}>
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-[#121212]/5">
                                    <th className="text-left px-4 py-3 text-[11px] text-[#8A817C] font-semibold uppercase tracking-wider">Title</th>
                                    <th className="text-left px-4 py-3 text-[11px] text-[#8A817C] font-semibold uppercase tracking-wider hidden sm:table-cell">Speaker</th>
                                    <th className="text-left px-4 py-3 text-[11px] text-[#8A817C] font-semibold uppercase tracking-wider hidden md:table-cell">Series</th>
                                    <th className="text-left px-4 py-3 text-[11px] text-[#8A817C] font-semibold uppercase tracking-wider">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && SKELETON_ROWS.map((row) => (
                                    <tr key={row} className="border-b border-[#121212]/5">
                                        {["a", "b", "c", "d"].map((col) => (
                                            <td key={col} className="px-4 py-3">
                                                <div className="h-3 bg-[#F4F1EA] rounded animate-pulse w-3/4" />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {!isLoading && sermons.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-16 text-center text-[#8A817C] font-light">
                                            <BookOpen className="w-8 h-8 mx-auto mb-3 text-[#8A817C]/30" />
                                            No sermons in the archive yet.
                                        </td>
                                    </tr>
                                )}
                                {!isLoading && sermons.map((sermon) => (
                                    <tr
                                        key={sermon.id}
                                        onClick={() => setSelected(selected?.id === sermon.id ? null : sermon)}
                                        className={`border-b border-[#121212]/5 last:border-0 cursor-pointer transition-colors hover:bg-[#F4F1EA]/20 ${selected?.id === sermon.id ? "bg-[#F4F1EA]/30" : ""}`}
                                    >
                                        <td className="px-4 py-3 text-sm font-medium text-[#121212] truncate max-w-[220px]">{sermon.title}</td>
                                        <td className="px-4 py-3 text-[#8A817C] font-light hidden sm:table-cell">{sermon.speakerName}</td>
                                        <td className="px-4 py-3 text-[#8A817C] font-light hidden md:table-cell">{sermon.series ?? "—"}</td>
                                        <td className="px-4 py-3 font-mono text-[#8A817C] whitespace-nowrap">{fmtDate(sermon.date)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {pagination && pagination.totalPages > 1 && (
                        <div className="mt-4">
                            <PaginationBar pagination={pagination} onPage={(p) => fetchSermons(p)} isLoading={isLoading} label="sermons" />
                        </div>
                    )}

                    {!panelOpen && sermons.length > 0 && (
                        <div className="flex items-center justify-center gap-2 text-xs text-[#8A817C] font-light py-2">
                            <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
                            Click any row to view or edit
                        </div>
                    )}
                </div>

                {panelOpen && (
                    <div className="col-span-12 lg:col-span-5">
                        <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 space-y-4 sticky top-4 relative">
                            <div className="flex items-start justify-between gap-2">
                                <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#F4F1EA] text-[#8A817C]">
                                    {isCreating ? "New Sermon" : "Edit Sermon"}
                                </span>
                                <button type="button" onClick={closePanel} className="absolute top-4 right-4 text-[#8A817C] hover:text-[#121212] transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {(isCreating || (selected && canWrite)) ? (
                                <div className="space-y-3 text-xs">
                                    <div>
                                        <label htmlFor="s-title" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Title</label>
                                        <input id="s-title" value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                                            className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg" />
                                    </div>
                                    <div>
                                        <label htmlFor="s-speaker" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Speaker</label>
                                        <input id="s-speaker" value={draft.speakerName} onChange={(e) => setDraft((p) => ({ ...p, speakerName: e.target.value }))}
                                            className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="s-date" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Date</label>
                                            <input id="s-date" type="date" value={draft.date} onChange={(e) => setDraft((p) => ({ ...p, date: e.target.value }))}
                                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg" />
                                        </div>
                                        <div>
                                            <label htmlFor="s-series" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Series (optional)</label>
                                            <input id="s-series" value={draft.series} onChange={(e) => setDraft((p) => ({ ...p, series: e.target.value }))}
                                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg" />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="s-youtube" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">YouTube URL</label>
                                        <input id="s-youtube" value={draft.youtubeUrl} onChange={(e) => setDraft((p) => ({ ...p, youtubeUrl: e.target.value }))}
                                            placeholder="https://youtube.com/watch?v=..."
                                            className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] placeholder:text-[#8A817C]/60 focus:outline-none focus:border-[#121212] rounded-lg" />
                                    </div>
                                    <div>
                                        <label htmlFor="s-mixlr" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Mixlr URL</label>
                                        <input id="s-mixlr" value={draft.mixlrUrl} onChange={(e) => setDraft((p) => ({ ...p, mixlrUrl: e.target.value }))}
                                            placeholder="https://mixlr.com/..."
                                            className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] placeholder:text-[#8A817C]/60 focus:outline-none focus:border-[#121212] rounded-lg" />
                                    </div>
                                    <p className="text-[10px] text-[#8A817C]">At least one of YouTube or Mixlr is required.</p>
                                    <div>
                                        <label htmlFor="s-desc" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Description (optional)</label>
                                        <textarea id="s-desc" rows={3} value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                                            className="w-full px-3 py-2 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg resize-none" />
                                    </div>

                                    <div className="flex items-center gap-2 pt-2 border-t border-[#121212]/5">
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving || !draft.title.trim() || !draft.speakerName.trim() || !draft.date || (!draft.youtubeUrl?.trim() && !draft.mixlrUrl?.trim())}
                                            className="h-9 px-5 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors disabled:opacity-40"
                                        >
                                            {isSaving ? "Saving…" : "Save"}
                                        </button>
                                        {!isCreating && selected && (
                                            <button
                                                onClick={handleDelete}
                                                disabled={isSaving}
                                                className="flex items-center gap-1.5 h-9 px-4 border border-red-200 text-red-700 text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                selected && (
                                    <div className="space-y-3 text-xs">
                                        <h2 className="text-lg font-light tracking-tight text-[#121212] leading-snug">{selected.title}</h2>
                                        <p className="text-[#8A817C]">{selected.speakerName} — {fmtDate(selected.date)}</p>
                                        {selected.series && <p className="text-[#8A817C]">Series: {selected.series}</p>}
                                        {selected.description && <p className="text-[#121212] font-light leading-relaxed whitespace-pre-wrap">{selected.description}</p>}
                                        {selected.youtubeUrl && (
                                            <a href={selected.youtubeUrl} target="_blank" rel="noopener noreferrer" className="block text-blue-600 underline underline-offset-2">Watch on YouTube</a>
                                        )}
                                        {selected.mixlrUrl && (
                                            <a href={selected.mixlrUrl} target="_blank" rel="noopener noreferrer" className="block text-blue-600 underline underline-offset-2">Listen on Mixlr</a>
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showAnnounce && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4 relative">
                        <button type="button" onClick={() => setShowAnnounce(false)} className="absolute top-4 right-4 text-[#8A817C] hover:text-[#121212]">
                            <X className="w-4 h-4" />
                        </button>
                        <div>
                            <h2 className="text-lg font-light tracking-tight text-[#121212]">Announce Live</h2>
                            <p className="text-xs text-[#8A817C] mt-1">Publishes an announcement to every member instantly.</p>
                        </div>
                        <div className="flex gap-2">
                            {(["YOUTUBE", "MIXLR"] as LivePlatform[]).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setAnnounceDraft((d) => ({ ...d, platform: p }))}
                                    className={`flex-1 h-10 text-xs font-semibold uppercase tracking-wider rounded-lg border transition-colors ${announceDraft.platform === p ? "border-[#121212] bg-[#121212] text-white" : "border-[#121212]/10 text-[#8A817C]"}`}
                                >
                                    {p === "YOUTUBE" ? "YouTube" : "Mixlr"}
                                </button>
                            ))}
                        </div>
                        <div>
                            <label htmlFor="a-url" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Livestream URL</label>
                            <input id="a-url" value={announceDraft.url} onChange={(e) => setAnnounceDraft((d) => ({ ...d, url: e.target.value }))}
                                placeholder="https://..."
                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] placeholder:text-[#8A817C]/60 focus:outline-none focus:border-[#121212] rounded-lg" />
                        </div>
                        <div>
                            <label htmlFor="a-title" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Title (optional)</label>
                            <input id="a-title" value={announceDraft.title} onChange={(e) => setAnnounceDraft((d) => ({ ...d, title: e.target.value }))}
                                placeholder={`🔴 Live Now on ${announceDraft.platform === "YOUTUBE" ? "YouTube" : "Mixlr"}`}
                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] placeholder:text-[#8A817C]/60 focus:outline-none focus:border-[#121212] rounded-lg" />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleAnnounce}
                                disabled={isSaving || !announceDraft.url.trim()}
                                className="h-9 px-5 bg-red-600 text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40"
                            >
                                {isSaving ? "Sending…" : "Send Announcement"}
                            </button>
                            {announceSuccess && (
                                <span className="text-xs text-green-600 font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                                    Sent
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}, { requiredPermission: "sermon:read" });

export default SermonsPage;
