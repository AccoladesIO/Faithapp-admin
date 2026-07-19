"use client";

import React, { useEffect, useRef, useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { useAuth } from "@/context/auth-context";
import {
    Users2, Plus, Trash2, Pencil, X, Check, RefreshCw, Search,
    UserPlus, CheckSquare, Square, UserMinus, Info, Phone, Import,
} from "lucide-react";
import {
    useGroups, Group, GroupMemberEntry, GroupMembersPagination,
} from "@/hooks/use-groups";
import { api } from "@/utils/auth/axios-client";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { DismissibleError } from "@/components/ui/dismissible-error";
import { DatePreset, presetRange } from "@/utils/date-presets";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

const fullName = (p: { firstname: string; lastname: string }) =>
    [p.firstname, p.lastname].filter(Boolean).join(" ");

interface MemberResult {
    id: string;
    firstname: string;
    lastname: string;
    phoneNumber: string | null;
    role: string;
}

// phone[, label] per line, e.g. "+2348012345678, Jane Doe"
function parsePhoneLines(text: string): { phoneNumber: string; label?: string }[] {
    return text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => {
            const [phoneNumber, ...rest] = line.split(",").map((s) => s.trim());
            const label = rest.filter(Boolean).join(", ");
            return label ? { phoneNumber, label } : { phoneNumber };
        });
}

// ─── Multi-select member search (used for both single & bulk add) ─────────────

function MemberMultiSearch({
    excludeIds,
    onAdd,
}: Readonly<{ excludeIds: Set<string>; onAdd: (ids: string[]) => void }>) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<MemberResult[]>([]);
    const [selected, setSelected] = useState<Map<string, MemberResult>>(new Map());
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const doSearch = async (q: string) => {
        if (!q.trim()) { setResults([]); return; }
        setLoading(true);
        try {
            const res = await api.get(`/members?page=1&limit=10&search=${encodeURIComponent(q)}`);
            const list: MemberResult[] = res.data?.data?.data ?? [];
            setResults(list.filter((m) => !excludeIds.has(m.id)));
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setQuery(q);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(q), 300);
    };

    const toggle = (m: MemberResult) => {
        setSelected((prev) => {
            const next = new Map(prev);
            if (next.has(m.id)) next.delete(m.id); else next.set(m.id, m);
            return next;
        });
    };

    const handleAdd = () => {
        onAdd(Array.from(selected.keys()));
        setSelected(new Map());
        setQuery("");
        setResults([]);
    };

    return (
        <div className="space-y-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A817C]" />
                <input
                    type="text"
                    value={query}
                    onChange={handleInput}
                    placeholder="Search members or workers by name/email…"
                    className="w-full h-10 pl-8 pr-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                />
                {loading && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A817C] animate-spin" />}
            </div>

            {results.length > 0 && (
                <div className="border border-[#121212]/10 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                    {results.map((m) => {
                        const checked = selected.has(m.id);
                        return (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => toggle(m)}
                                className={`w-full flex items-center gap-3 text-left px-3 py-2.5 border-b border-[#121212]/5 last:border-0 transition-colors ${checked ? "bg-[#EADCC9]/40" : "hover:bg-[#F4F1EA]/60"}`}
                            >
                                {checked ? <CheckSquare className="w-4 h-4 text-[#121212] shrink-0" /> : <Square className="w-4 h-4 text-[#8A817C] shrink-0" />}
                                <div className="min-w-0">
                                    <div className="text-sm text-[#121212] font-light truncate">{fullName(m)}</div>
                                    <div className="text-[10px] text-[#8A817C] font-mono truncate">{m.phoneNumber ?? "No phone on file"} · {m.role}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {selected.size > 0 && (
                <button
                    type="button"
                    onClick={handleAdd}
                    className="w-full h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 hover:bg-[#121212]/90 transition-colors"
                >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add {selected.size} Selected
                </button>
            )}
        </div>
    );
}

// ─── Group detail panel ────────────────────────────────────────────────────────

function GroupDetailPanel({
    group,
    canWrite,
    onClose,
    onDeleted,
}: Readonly<{ group: Group; canWrite: boolean; onClose: () => void; onDeleted: (id: string) => void }>) {
    const {
        fetchGroupMembers, addMember, bulkAddMembers, addPhoneEntries, addFirstTimersToGroup,
        removeEntry, bulkRemoveEntries, updateGroup, deleteGroup, isSubmitting,
    } = useGroups();

    const [members, setMembers] = useState<GroupMemberEntry[]>([]);
    const [pagination, setPagination] = useState<GroupMembersPagination | null>(null);
    const [page, setPage] = useState(1);
    const [rosterLoading, setRosterLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState(group.name);
    const [editDescription, setEditDescription] = useState(group.description ?? "");

    const [phoneText, setPhoneText] = useState("");
    const [importResult, setImportResult] = useState<string | null>(null);

    const [datePreset, setDatePreset] = useState<DatePreset>("7d");
    const [ftDateFrom, setFtDateFrom] = useState(presetRange("7d").dateFrom);
    const [ftDateTo, setFtDateTo] = useState(presetRange("7d").dateTo);

    const loadRoster = async (targetPage = 1) => {
        setRosterLoading(true);
        const { members: list, pagination: pag } = await fetchGroupMembers(group.id, targetPage, 20);
        setMembers(list);
        setPagination(pag);
        setPage(targetPage);
        setRosterLoading(false);
    };

    useEffect(() => {
        setEditing(false);
        setEditName(group.name);
        setEditDescription(group.description ?? "");
        setSelectedIds(new Set());
        loadRoster(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [group.id]);

    const memberIds = new Set(
        members.filter((m) => m.member).map((m) => m.member!.id)
    );

    const toggleSelected = (entryId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(entryId)) next.delete(entryId); else next.add(entryId);
            return next;
        });
    };

    const handleSaveEdit = async () => {
        try {
            await updateGroup(group.id, { name: editName, description: editDescription });
            setEditing(false);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.message ?? "Failed to update group.");
        }
    };

    const handleAdd = async (ids: string[]) => {
        setError(null);
        try {
            if (ids.length === 1) {
                await addMember(group.id, ids[0]);
            } else {
                await bulkAddMembers(group.id, ids);
            }
            await loadRoster(page);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.message ?? "Failed to add member(s).");
        }
    };

    const handleRemoveOne = async (entryId: string) => {
        setError(null);
        try {
            await removeEntry(group.id, entryId);
            await loadRoster(page);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.message ?? "Failed to remove entry.");
        }
    };

    const handleAddPhoneEntries = async () => {
        const entries = parsePhoneLines(phoneText);
        if (entries.length === 0) return;
        setError(null);
        setImportResult(null);
        try {
            const result = await addPhoneEntries(group.id, entries);
            setPhoneText("");
            setImportResult(`${result.added ?? 0} added, ${result.skipped ?? 0} already in group.`);
            await loadRoster(page);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.message ?? "Failed to add phone numbers.");
        }
    };

    const handleApplyDatePreset = (preset: DatePreset) => {
        setDatePreset(preset);
        if (preset === "custom") return;
        const range = presetRange(preset);
        setFtDateFrom(range.dateFrom);
        setFtDateTo(range.dateTo);
    };

    const handleImportFirstTimers = async () => {
        if (!ftDateFrom || !ftDateTo) return;
        setError(null);
        setImportResult(null);
        try {
            const result = await addFirstTimersToGroup(group.id, ftDateFrom, ftDateTo);
            setImportResult(`${result.added ?? 0} added, ${result.skipped ?? 0} already in group.`);
            await loadRoster(page);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.message ?? "Failed to import first-timers.");
        }
    };

    const handleBulkRemove = async () => {
        if (selectedIds.size === 0) return;
        setError(null);
        try {
            await bulkRemoveEntries(group.id, Array.from(selectedIds));
            setSelectedIds(new Set());
            await loadRoster(page);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.message ?? "Failed to remove selected members.");
        }
    };

    const handleDelete = async () => {
        try {
            await deleteGroup(group.id);
            onDeleted(group.id);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.message ?? "Failed to delete group.");
        }
    };

    return (
        <div className="bg-white border border-[#121212]/10 rounded-xl flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-[#121212]/5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        {editing ? (
                            <div className="space-y-2">
                                <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full h-9 px-3 bg-[#F4F1EA]/60 border border-[#121212]/20 text-sm font-medium text-[#121212] rounded focus:outline-none focus:border-[#121212]"
                                />
                                <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    placeholder="Description (optional)"
                                    rows={2}
                                    className="w-full px-3 py-2 bg-[#F4F1EA]/60 border border-[#121212]/20 text-xs font-light text-[#121212] rounded focus:outline-none focus:border-[#121212] resize-none"
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleSaveEdit} disabled={isSubmitting || !editName.trim()} className="px-3 py-1.5 bg-[#121212] text-white text-[10px] font-bold uppercase tracking-wider rounded disabled:opacity-50 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Save
                                    </button>
                                    <button onClick={() => setEditing(false)} className="px-3 py-1.5 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded hover:text-[#121212]">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-lg font-medium text-[#121212] truncate">{group.name}</h2>
                                <p className="text-xs text-[#8A817C] font-light mt-1">{group.description || "No description"}</p>
                                <p className="text-[10px] text-[#8A817C] font-mono uppercase tracking-wider mt-2">
                                    {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                                </p>
                            </>
                        )}
                    </div>
                    {!editing && (
                        <div className="flex items-center gap-1 shrink-0">
                            {canWrite && (
                                <button onClick={() => setEditing(true)} className="p-1.5 text-[#8A817C] hover:text-[#121212] rounded-md hover:bg-[#F4F1EA]" title="Rename / edit description">
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {canWrite && (
                                <button onClick={() => setConfirmingDelete(true)} className="p-1.5 text-[#8A817C] hover:text-red-600 rounded-md hover:bg-red-50" title="Delete group">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button onClick={onClose} className="p-1.5 text-[#8A817C] hover:text-[#121212] rounded-md hover:bg-[#F4F1EA]" title="Close">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                {confirmingDelete && (
                    <div className="mt-4 p-3 bg-[#fdfaf2] border border-dashed border-[#121212]/15 rounded-lg text-xs space-y-2">
                        <p className="text-[#121212] font-light">Delete &ldquo;{group.name}&rdquo; permanently? This removes all its members.</p>
                        <div className="flex gap-2">
                            <button onClick={handleDelete} disabled={isSubmitting} className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider rounded hover:bg-red-700 disabled:opacity-50">
                                Confirm Delete
                            </button>
                            <button onClick={() => setConfirmingDelete(false)} className="px-3 py-1.5 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded hover:text-[#121212]">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <DismissibleError message={error} />

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {canWrite && (
                    <div>
                        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                            Add Members
                        </h3>
                        <MemberMultiSearch excludeIds={memberIds} onAdd={handleAdd} />
                    </div>
                )}

                {canWrite && (
                    <div>
                        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                            Add by Phone Number
                        </h3>
                        <p className="text-[10px] text-[#8A817C] font-light mb-2">
                            One per line — e.g. &ldquo;+2348012345678, Jane Doe&rdquo;. For people with no member account, like first-timers.
                        </p>
                        <div className="space-y-2">
                            <textarea
                                rows={3}
                                value={phoneText}
                                onChange={(e) => setPhoneText(e.target.value)}
                                placeholder={"+2348012345678, Jane Doe\n+2348098765432"}
                                className="w-full px-3 py-2 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                            />
                            {importResult && (
                                <p className="text-[10px] text-[#8A817C] font-mono">{importResult}</p>
                            )}
                            <button
                                type="button"
                                onClick={handleAddPhoneEntries}
                                disabled={isSubmitting || parsePhoneLines(phoneText).length === 0}
                                className="h-9 px-4 bg-[#121212] text-white text-[10px] font-bold uppercase tracking-wider rounded-lg disabled:opacity-50 flex items-center gap-2"
                            >
                                <Phone className="w-3.5 h-3.5" /> Add Numbers
                            </button>
                        </div>
                    </div>
                )}

                {canWrite && (
                    <div>
                        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                            Add from First-Timers
                        </h3>
                        <p className="text-[10px] text-[#8A817C] font-light mb-2">
                            Import every first-timer captured in a date range as a phone-only entry.
                        </p>
                        <div className="space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                                {(["7d", "30d", "month", "custom"] as DatePreset[]).map((p) => {
                                    const labels: Record<DatePreset, string> = {
                                        all: "All time", "7d": "Last 7 days", "30d": "Last 30 days",
                                        month: "This month", custom: "Custom",
                                    };
                                    return (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => handleApplyDatePreset(p)}
                                            className={`h-7 px-2.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${datePreset === p
                                                    ? "bg-[#121212] text-white"
                                                    : "border border-[#121212]/10 text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA]"
                                                }`}
                                        >
                                            {labels[p]}
                                        </button>
                                    );
                                })}
                            </div>
                            {datePreset === "custom" && (
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={ftDateFrom}
                                        onChange={(e) => setFtDateFrom(e.target.value)}
                                        className="h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                    />
                                    <input
                                        type="date"
                                        value={ftDateTo}
                                        onChange={(e) => setFtDateTo(e.target.value)}
                                        className="h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                    />
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={handleImportFirstTimers}
                                disabled={isSubmitting || !ftDateFrom || !ftDateTo}
                                className="h-9 px-4 bg-[#121212] text-white text-[10px] font-bold uppercase tracking-wider rounded-lg disabled:opacity-50 flex items-center gap-2"
                            >
                                <Import className="w-3.5 h-3.5" /> Import First-Timers
                            </button>
                        </div>
                    </div>
                )}

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">
                            Current Members
                        </h3>
                        {canWrite && selectedIds.size > 0 && (
                            <button onClick={handleBulkRemove} disabled={isSubmitting} className="text-[10px] font-bold uppercase tracking-wider text-red-600 hover:text-red-700 flex items-center gap-1 disabled:opacity-50">
                                <UserMinus className="w-3 h-3" /> Remove {selectedIds.size} Selected
                            </button>
                        )}
                    </div>

                    <div className="border border-[#121212]/10 rounded-lg overflow-hidden">
                        {rosterLoading ? (
                            <div className="p-6 space-y-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-4 bg-[#F4F1EA] rounded animate-pulse" />
                                ))}
                            </div>
                        ) : members.length === 0 ? (
                            <div className="p-8 text-center">
                                <Users2 className="w-6 h-6 text-[#8A817C]/40 mx-auto mb-2" />
                                <p className="text-xs text-[#8A817C] font-light">No members in this group yet.</p>
                            </div>
                        ) : (
                            members.map((entry) => {
                                const checked = selectedIds.has(entry.id);
                                return (
                                    <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#121212]/5 last:border-0 hover:bg-[#F4F1EA]/40">
                                        {canWrite && (
                                            <button onClick={() => toggleSelected(entry.id)} className="shrink-0 text-[#8A817C] hover:text-[#121212]">
                                                {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                            </button>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            {entry.member ? (
                                                <>
                                                    <div className="text-sm text-[#121212] font-light truncate">{fullName(entry.member)}</div>
                                                    <div className="text-[10px] text-[#8A817C] font-mono truncate">{entry.member.email} · {entry.member.role}</div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="text-sm text-[#121212] font-light truncate flex items-center gap-1.5">
                                                        {entry.label || "Unnamed"}
                                                        <span className="shrink-0 px-1.5 py-0.5 bg-[#F4F1EA] text-[#8A817C] text-[9px] font-semibold uppercase tracking-wider rounded">Guest</span>
                                                    </div>
                                                    <div className="text-[10px] text-[#8A817C] font-mono truncate">{entry.phoneNumber}</div>
                                                </>
                                            )}
                                        </div>
                                        {canWrite && (
                                            <button onClick={() => handleRemoveOne(entry.id)} className="shrink-0 p-1 text-[#8A817C] hover:text-red-600 rounded" title="Remove from group">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <PaginationBar pagination={pagination} onPage={loadRoster} isLoading={rosterLoading} label="members" />
                </div>
            </div>
        </div>
    );
}

// ─── Main page ──────────────────────────────────────────────────────────────

function GroupsPage() {
    const { hasPermission } = useAuth();
    const canWrite = hasPermission("groups:write");
    const { groups, isLoading, isSubmitting, error, createGroup } = useGroups();

    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [createError, setCreateError] = useState<string | null>(null);

    const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setCreateError(null);
        try {
            const created = await createGroup({ name: newName.trim(), description: newDescription.trim() || undefined });
            setNewName("");
            setNewDescription("");
            setCreating(false);
            setSelectedGroupId(created.id);
        } catch (err: unknown) {
            const e2 = err as ApiError;
            setCreateError(e2?.message ?? "Failed to create group.");
        }
    };

    return (
        <div className="space-y-8 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Groups</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Reusable rosters of members &amp; workers for targeted announcements
                    </p>
                </div>
                {canWrite && (
                    <button
                        onClick={() => setCreating((c) => !c)}
                        className="h-10 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-lg flex items-center gap-2 hover:bg-[#121212]/90 transition-colors self-start sm:self-auto"
                    >
                        <Plus className="w-3.5 h-3.5" /> New Group
                    </button>
                )}
            </div>

            <DismissibleError message={error} />

            {creating && (
                <form onSubmit={handleCreate} className="bg-white border border-[#121212]/10 rounded-xl p-6 space-y-4">
                    {createError && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">{createError}</div>
                    )}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Group Name</label>
                            <input
                                required
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g., Call Leaders"
                                className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Description (optional)</label>
                            <input
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="What is this group for?"
                                className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" disabled={isSubmitting || !newName.trim()} className="h-10 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-lg disabled:opacity-50 flex items-center gap-2">
                            {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />} Create Group
                        </button>
                        <button type="button" onClick={() => setCreating(false)} className="h-10 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-widest rounded-lg hover:text-[#121212]">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className={`space-y-3 ${selectedGroup ? "lg:col-span-5" : "lg:col-span-12"}`}>
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="p-5 border border-[#121212]/10 rounded-xl animate-pulse space-y-2">
                                <div className="h-4 w-1/3 bg-[#F4F1EA] rounded" />
                                <div className="h-3 w-2/3 bg-[#F4F1EA] rounded" />
                            </div>
                        ))
                    ) : groups.length === 0 ? (
                        <div className="border-2 border-dashed border-[#121212]/10 flex flex-col items-center justify-center text-center p-12 bg-[#F4F1EA]/20 rounded-xl">
                            <Users2 className="w-8 h-8 text-[#8A817C]/40 mb-3" />
                            <div className="text-xs uppercase tracking-wider font-semibold text-[#121212]">No Groups Yet</div>
                            <p className="text-xs text-[#8A817C] font-light max-w-xs mt-1 flex items-center gap-1">
                                <Info className="w-3 h-3 shrink-0" /> Create a group like &ldquo;Call Leaders&rdquo; to target announcements at a fixed roster.
                            </p>
                        </div>
                    ) : (
                        groups.map((g) => (
                            <button
                                key={g.id}
                                onClick={() => setSelectedGroupId(g.id)}
                                className={`w-full text-left p-5 border rounded-xl transition-colors ${selectedGroupId === g.id ? "border-[#121212] bg-[#F4F1EA]/40" : "border-[#121212]/10 bg-white hover:border-[#121212]/30"}`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-[#121212] truncate">{g.name}</div>
                                        <div className="text-xs text-[#8A817C] font-light truncate mt-0.5">{g.description || "No description"}</div>
                                    </div>
                                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 bg-[#F4F1EA] text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded">
                                        <Users2 className="w-3 h-3" /> {g.memberCount}
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {selectedGroup && (
                    <div className="lg:col-span-7 h-[720px]">
                        <GroupDetailPanel
                            group={selectedGroup}
                            canWrite={canWrite}
                            onClose={() => setSelectedGroupId(null)}
                            onDeleted={() => setSelectedGroupId(null)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default withAuth(GroupsPage, { requiredPermission: 'groups:read' });
