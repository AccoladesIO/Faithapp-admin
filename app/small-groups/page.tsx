"use client";

import React, { useEffect, useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { Plus, X, Users, Trash2, RefreshCw, CalendarClock, History, Pencil } from "lucide-react";
import {
    useSmallGroupsAdmin,
    SmallGroup,
    SmallGroupPayload,
    SmallGroupMemberRow,
    SmallGroupAttendanceRow,
} from "@/hooks/use-small-groups";
import { MemberSearchSelect } from "@/components/ui/member-search-select";
import { DismissibleError } from "@/components/ui/dismissible-error";
import { PaginationBar } from "@/components/ui/pagination-bar";

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const EMPTY_DRAFT: SmallGroupPayload = { name: "", description: "", leaderId: "", meetingDay: "", meetingLocation: "" };

function GroupFormPanel({ editing, onClose, onSave, isSubmitting }: Readonly<{
    editing: SmallGroup | null;
    onClose: () => void;
    onSave: (payload: SmallGroupPayload) => Promise<SmallGroup>;
    isSubmitting: boolean;
}>) {
    const [draft, setDraft] = useState<SmallGroupPayload>(editing ? {
        name: editing.name,
        description: editing.description ?? "",
        leaderId: editing.leader?.id ?? "",
        meetingDay: editing.meetingDay ?? "",
        meetingLocation: editing.meetingLocation ?? "",
    } : EMPTY_DRAFT);
    const [leaderLabel, setLeaderLabel] = useState(editing?.leader ? `${editing.leader.firstname} ${editing.leader.lastname}` : "");
    const [formError, setFormError] = useState<string | null>(null);
    let submitLabel = editing ? "Save Changes" : "Create Fellowship";
    if (isSubmitting) submitLabel = "Saving…";

    const handleSubmit = async () => {
        setFormError(null);
        if (!draft.name.trim()) {
            setFormError("Name is required.");
            return;
        }
        try {
            await onSave({
                name: draft.name.trim(),
                description: draft.description?.trim() || undefined,
                leaderId: draft.leaderId || undefined,
                meetingDay: draft.meetingDay?.trim() || undefined,
                meetingLocation: draft.meetingLocation?.trim() || undefined,
            });
            onClose();
        } catch {
            // error surfaced via the hook's own error state
        }
    };

    return (
        <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl space-y-4 relative">
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="pr-8">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Fellowships</div>
                <h2 className="text-xl font-light tracking-tight text-[#121212]">{editing ? "Edit Fellowship" : "New Fellowship"}</h2>
            </div>

            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Name</label>
                <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    placeholder="e.g. Westside Cell"
                />
            </div>

            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Description (optional)</label>
                <textarea
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                    rows={2}
                    className="w-full p-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                />
            </div>

            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Leader (optional)</label>
                <MemberSearchSelect
                    value={draft.leaderId ?? ""}
                    label={leaderLabel}
                    onChange={(id, label) => { setDraft((d) => ({ ...d, leaderId: id })); setLeaderLabel(label); }}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Meeting Day</label>
                    <input
                        type="text"
                        value={draft.meetingDay}
                        onChange={(e) => setDraft((d) => ({ ...d, meetingDay: e.target.value }))}
                        placeholder="e.g. Wednesday"
                        className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Location</label>
                    <input
                        type="text"
                        value={draft.meetingLocation}
                        onChange={(e) => setDraft((d) => ({ ...d, meetingLocation: e.target.value }))}
                        placeholder="e.g. 12 Ronke Street"
                        className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>
            </div>

            {formError && (
                <div className="p-2.5 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs">{formError}</div>
            )}

            <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors disabled:opacity-50"
            >
                {submitLabel}
            </button>
        </div>
    );
}

function DetailPanel({ group, roster, attendance, isLoading, onClose, onRemoveMember }: Readonly<{
    group: SmallGroup;
    roster: SmallGroupMemberRow[];
    attendance: SmallGroupAttendanceRow[];
    isLoading: boolean;
    onClose: () => void;
    onRemoveMember: (memberId: string) => void;
}>) {
    const [tab, setTab] = useState<"roster" | "attendance">("roster");

    return (
        <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl space-y-4 relative">
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="pr-8">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Fellowship</div>
                <h2 className="text-xl font-light tracking-tight text-[#121212]">{group.name}</h2>
            </div>

            <div className="flex gap-1">
                <button
                    onClick={() => setTab("roster")}
                    className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest rounded-lg transition-colors ${tab === "roster" ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                >
                    <Users className="w-3.5 h-3.5" /> Roster
                </button>
                <button
                    onClick={() => setTab("attendance")}
                    className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest rounded-lg transition-colors ${tab === "attendance" ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                >
                    <History className="w-3.5 h-3.5" /> Attendance
                </button>
            </div>

            {isLoading ? (
                <div className="space-y-2 animate-pulse">
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-[#F4F1EA] rounded-lg" />)}
                </div>
            ) : tab === "roster" ? (
                roster.length === 0 ? (
                    <p className="text-xs text-[#8A817C] text-center py-6">No members yet.</p>
                ) : (
                    <div className="space-y-1.5">
                        {roster.map((r) => (
                            <div key={r.id} className="flex items-center justify-between bg-[#F4F1EA]/50 rounded-lg px-3 py-2 text-xs">
                                <span className="text-[#121212] font-medium">{r.member.firstname} {r.member.lastname}</span>
                                <button onClick={() => onRemoveMember(r.member.id)} className="text-[#8A817C] hover:text-red-600 transition-colors" title="Remove from group">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )
            ) : attendance.length === 0 ? (
                <p className="text-xs text-[#8A817C] text-center py-6">No attendance recorded yet.</p>
            ) : (
                <div className="space-y-1.5">
                    {attendance.map((a) => (
                        <div key={a.id} className="flex items-center justify-between bg-[#F4F1EA]/50 rounded-lg px-3 py-2 text-xs">
                            <span className="text-[#121212] font-medium">{a.member.firstname} {a.member.lastname}</span>
                            <span className="text-[#8A817C] font-mono">{fmtDate(a.meetingDate)} — {a.status}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

type PanelMode = "form" | "detail" | null;

const SmallGroupsPage = withAuth(function SmallGroupsPage() {
    const {
        groups, pagination, isLoading, isSubmitting, error,
        fetchGroups, createGroup, updateGroup, deleteGroup, fetchRoster, removeMember, fetchAttendanceHistory,
    } = useSmallGroupsAdmin();

    const [panelMode, setPanelMode] = useState<PanelMode>(null);
    const [editingGroup, setEditingGroup] = useState<SmallGroup | null>(null);
    const [detailFor, setDetailFor] = useState<SmallGroup | null>(null);
    const [roster, setRoster] = useState<SmallGroupMemberRow[]>([]);
    const [attendance, setAttendance] = useState<SmallGroupAttendanceRow[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => { fetchGroups(1); }, [fetchGroups]);

    const closePanel = () => {
        setPanelMode(null);
        setEditingGroup(null);
        setDetailFor(null);
    };

    const openCreate = () => {
        setEditingGroup(null);
        setPanelMode("form");
    };

    const openEdit = (g: SmallGroup) => {
        setEditingGroup(g);
        setPanelMode("form");
    };

    const openDetail = async (g: SmallGroup) => {
        setDetailFor(g);
        setPanelMode("detail");
        setDetailLoading(true);
        try {
            const [r, a] = await Promise.all([fetchRoster(g.id), fetchAttendanceHistory(g.id)]);
            setRoster(r);
            setAttendance(a);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!detailFor) return;
        try {
            await removeMember(detailFor.id, memberId);
            setRoster((prev) => prev.filter((r) => r.member.id !== memberId));
        } catch {
            // error already surfaced via the hook's own error state
        }
    };

    const panelOpen = panelMode !== null;

    return (
        <div className="space-y-10 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Fellowships</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Cells and home fellowships members can join
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors w-fit"
                    >
                        <Plus className="w-3.5 h-3.5" /> New Fellowship
                    </button>
                    <button
                        onClick={() => fetchGroups(1)}
                        disabled={isLoading}
                        className="p-2 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-40"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            <DismissibleError message={error} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className={panelOpen ? "lg:col-span-7" : "lg:col-span-12"}>
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Name</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Leader</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Meets</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        Array.from({ length: 4 }).map((_, i) => (
                                            <tr key={i} className="border-b border-[#121212]/5 animate-pulse">
                                                {Array.from({ length: 4 }).map((__, j) => (
                                                    <td key={j} className="p-4"><div className="h-3 bg-[#F4F1EA] rounded w-3/4" /></td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : groups.length === 0 ? (
                                        <tr><td colSpan={4} className="p-8 text-center text-xs text-[#8A817C]">No fellowships yet.</td></tr>
                                    ) : (
                                        groups.map((g) => (
                                            <tr
                                                key={g.id}
                                                onClick={() => openDetail(g)}
                                                className={`transition-colors cursor-pointer ${detailFor?.id === g.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
                                            >
                                                <td className="p-4 text-sm text-[#121212] font-medium">{g.name}</td>
                                                <td className="p-4 text-xs text-[#8A817C]">
                                                    {g.leader ? `${g.leader.firstname} ${g.leader.lastname}` : "—"}
                                                </td>
                                                <td className="p-4 text-xs text-[#8A817C]">
                                                    {g.meetingDay ? (
                                                        <span className="flex items-center gap-1">
                                                            <CalendarClock className="w-3 h-3" /> {g.meetingDay}
                                                            {g.meetingLocation ? ` · ${g.meetingLocation}` : ""}
                                                        </span>
                                                    ) : "—"}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openDetail(g); }}
                                                            className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md transition-colors"
                                                            title="View roster & attendance"
                                                        >
                                                            <Users className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openEdit(g); }}
                                                            className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md transition-colors"
                                                            title="Edit fellowship"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteGroup(g.id); }}
                                                            className="p-1.5 text-[#8A817C] hover:text-red-600 border border-[#121212]/5 hover:border-red-200 rounded-md transition-colors"
                                                            title="Delete fellowship"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {pagination && (
                            <PaginationBar pagination={pagination} onPage={(p) => fetchGroups(p)} isLoading={isLoading} label="fellowships" />
                        )}
                    </div>
                </div>

                {panelMode === "form" && (
                    <div className="lg:col-span-5">
                        <GroupFormPanel
                            editing={editingGroup}
                            onClose={closePanel}
                            onSave={(payload) => editingGroup ? updateGroup(editingGroup.id, payload) : createGroup(payload)}
                            isSubmitting={isSubmitting}
                        />
                    </div>
                )}
                {panelMode === "detail" && detailFor && (
                    <div className="lg:col-span-5">
                        <DetailPanel
                            group={detailFor}
                            roster={roster}
                            attendance={attendance}
                            isLoading={detailLoading}
                            onClose={closePanel}
                            onRemoveMember={handleRemoveMember}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}, { requiredPermission: "small_group:read" });

export default SmallGroupsPage;
