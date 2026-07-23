"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { withAuth } from "@/utils/auth/with-auth";
import {
    Gamepad2,
    RefreshCw,
    X,
    MousePointerClick,
    Plus,
    Trash2,
    ListChecks,
} from "lucide-react";
import { useGames, Game, GamePayload } from "@/hooks/use-games";
import { useAuth } from "@/context/auth-context";
import { DismissibleError } from "@/components/ui/dismissible-error";
import { PaginationBar } from "@/components/ui/pagination-bar";

const SKELETON_ROWS = ["a", "b", "c", "d", "e", "f"] as const;

const STATUS_LABEL: Record<Game["status"], string> = {
    DRAFT: "Draft",
    LIVE_SESSION_ACTIVE: "Live",
    ARCHIVED: "Archived",
};

const STATUS_STYLE: Record<Game["status"], string> = {
    DRAFT: "bg-[#F4F1EA] text-[#8A817C]",
    LIVE_SESSION_ACTIVE: "bg-red-50 text-red-700",
    ARCHIVED: "bg-[#F4F1EA] text-[#8A817C]",
};

const EMPTY_DRAFT: GamePayload = { title: "", description: "" };

const GamesPage = withAuth(() => {
    const { games, pagination, isLoading, isSaving, error, fetchGames, createGame, updateGame, deleteGame } =
        useGames(20);
    const { hasPermission } = useAuth();
    const canWrite = hasPermission("games:write");
    const router = useRouter();

    const [selected, setSelected] = useState<Game | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [draft, setDraft] = useState<GamePayload>(EMPTY_DRAFT);

    useEffect(() => { fetchGames(1); }, [fetchGames]);

    useEffect(() => {
        if (selected) {
            setDraft({ title: selected.title, description: selected.description ?? "" });
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

    async function handleSave() {
        const payload: GamePayload = {
            title: draft.title.trim(),
            description: draft.description?.trim() || undefined,
        };
        if (isCreating) {
            const created = await createGame(payload);
            if (created) router.push(`/games/${created.id}`);
        } else if (selected) {
            const ok = await updateGame(selected.id, payload);
            if (ok) closePanel();
        }
    }

    async function handleDelete() {
        if (!selected) return;
        if (!window.confirm(`Delete "${selected.title}"? This cannot be undone.`)) return;
        const ok = await deleteGame(selected.id);
        if (ok) closePanel();
    }

    const panelOpen = isCreating || !!selected;

    return (
        <div className="space-y-6 font-sans">

            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Games</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Kahoot-style live quizzes
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchGames(pagination?.page ?? 1)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 h-9 px-3 border border-[#121212]/10 rounded-lg text-xs font-semibold uppercase tracking-wider text-[#8A817C] hover:bg-[#F4F1EA]/50 disabled:opacity-40"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                    {canWrite && (
                        <button
                            onClick={openCreate}
                            className="flex items-center gap-1.5 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            New Game
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
                                    <th className="text-left px-4 py-3 text-[11px] text-[#8A817C] font-semibold uppercase tracking-wider hidden sm:table-cell">Status</th>
                                    <th className="text-left px-4 py-3 text-[11px] text-[#8A817C] font-semibold uppercase tracking-wider" />
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && SKELETON_ROWS.map((row) => (
                                    <tr key={row} className="border-b border-[#121212]/5">
                                        {["a", "b", "c"].map((col) => (
                                            <td key={col} className="px-4 py-3">
                                                <div className="h-3 bg-[#F4F1EA] rounded animate-pulse w-3/4" />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {!isLoading && games.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-16 text-center text-[#8A817C] font-light">
                                            <Gamepad2 className="w-8 h-8 mx-auto mb-3 text-[#8A817C]/30" />
                                            No games yet.
                                        </td>
                                    </tr>
                                )}
                                {!isLoading && games.map((game) => (
                                    <tr
                                        key={game.id}
                                        onClick={() => setSelected(selected?.id === game.id ? null : game)}
                                        className={`border-b border-[#121212]/5 last:border-0 cursor-pointer transition-colors hover:bg-[#F4F1EA]/20 ${selected?.id === game.id ? "bg-[#F4F1EA]/30" : ""}`}
                                    >
                                        <td className="px-4 py-3 text-sm font-medium text-[#121212] truncate max-w-[240px]">{game.title}</td>
                                        <td className="px-4 py-3 hidden sm:table-cell">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${STATUS_STYLE[game.status]}`}>
                                                {STATUS_LABEL[game.status]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); router.push(`/games/${game.id}`); }}
                                                className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#8A817C] hover:text-[#121212]"
                                            >
                                                <ListChecks className="w-3 h-3" />
                                                Questions
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {pagination && pagination.totalPages > 1 && (
                        <div className="mt-4">
                            <PaginationBar pagination={pagination} onPage={(p) => fetchGames(p)} isLoading={isLoading} label="games" />
                        </div>
                    )}

                    {!panelOpen && games.length > 0 && (
                        <div className="flex items-center justify-center gap-2 text-xs text-[#8A817C] font-light py-2">
                            <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
                            Click any row to view or edit — &ldquo;Questions&rdquo; opens the question builder
                        </div>
                    )}
                </div>

                {panelOpen && (
                    <div className="col-span-12 lg:col-span-5">
                        <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 space-y-4 sticky top-4 relative">
                            <div className="flex items-start justify-between gap-2">
                                <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#F4F1EA] text-[#8A817C]">
                                    {isCreating ? "New Game" : "Edit Game"}
                                </span>
                                <button type="button" onClick={closePanel} className="absolute top-4 right-4 text-[#8A817C] hover:text-[#121212] transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {(isCreating || (selected && canWrite)) ? (
                                <div className="space-y-3 text-xs">
                                    <div>
                                        <label htmlFor="g-title" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Title</label>
                                        <input id="g-title" value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                                            className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg" />
                                    </div>
                                    <div>
                                        <label htmlFor="g-desc" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Description (optional)</label>
                                        <textarea id="g-desc" rows={3} value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                                            className="w-full px-3 py-2 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg resize-none" />
                                    </div>

                                    <div className="flex items-center gap-2 pt-2 border-t border-[#121212]/5">
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving || !draft.title.trim()}
                                            className="h-9 px-5 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors disabled:opacity-40"
                                        >
                                            {isSaving ? "Saving…" : isCreating ? "Create & Add Questions" : "Save"}
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
                                        {selected.description && <p className="text-[#121212] font-light leading-relaxed">{selected.description}</p>}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}, { requiredPermission: "games:read" });

export default GamesPage;
