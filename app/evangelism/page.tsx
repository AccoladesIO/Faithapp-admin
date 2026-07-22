"use client";

import React, { useState, useEffect, useRef } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { RefreshCw, X, MousePointerClick, Flame, History, ChevronDown, ChevronUp } from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { DismissibleError } from "@/components/ui/dismissible-error";
import { api } from "@/utils/auth/axios-client";
import {
    useEvangelismAdmin,
    fetchEvangelismWorkerOptions,
    ConvertRecord,
    ConvertStatus,
    EvangelismWorkerOption,
    FollowUpLogRecord,
} from "@/hooks/use-evangelism";

const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Never";

const STATUS_LABELS: Record<ConvertStatus, string> = {
    UNSAVED: "Unsaved",
    SAVED: "Saved",
    UNDERGOING_DISCIPLESHIP: "Undergoing Discipleship",
};

const STATUS_STYLES: Record<ConvertStatus, string> = {
    UNSAVED: "bg-amber-50 border-amber-100 text-amber-700",
    SAVED: "bg-blue-50 border-blue-100 text-blue-700",
    UNDERGOING_DISCIPLESHIP: "bg-green-50 border-green-100 text-green-700",
};

function StatusBadge({ status }: { status: ConvertStatus }) {
    return (
        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${STATUS_STYLES[status]}`}>
            {STATUS_LABELS[status]}
        </span>
    );
}

function ReassignControl({
    convert,
    onReassign,
    isSubmitting,
}: Readonly<{
    convert: ConvertRecord;
    onReassign: (workerProfileId: string) => Promise<void>;
    isSubmitting: boolean;
}>) {
    const [options, setOptions] = useState<EvangelismWorkerOption[] | null>(null);
    const [selected, setSelected] = useState("");

    useEffect(() => {
        fetchEvangelismWorkerOptions().then(setOptions).catch(() => setOptions([]));
    }, []);

    if (options === null) return <p className="text-[10px] text-[#8A817C]">Loading Evangelism workers…</p>;
    if (options.length === 0) return <p className="text-[10px] text-[#8A817C]">No Evangelism department workers found.</p>;

    return (
        <div className="flex gap-2">
            <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="flex-1 h-9 px-2 bg-white border border-[#121212]/10 text-xs rounded-lg"
            >
                <option value="">Select a worker…</option>
                {options.map((o) => (
                    <option key={o.workerProfileId} value={o.workerProfileId}>{o.firstname} {o.lastname}</option>
                ))}
            </select>
            <button
                type="button"
                onClick={() => selected && onReassign(selected)}
                disabled={isSubmitting || !selected}
                className="px-3 text-[10px] font-bold uppercase tracking-widest bg-[#121212] text-white rounded-lg disabled:opacity-40"
            >
                {convert.assignedTo ? "Reassign" : "Assign"}
            </button>
        </div>
    );
}

function LinkMemberControl({
    onLink,
    isSubmitting,
}: Readonly<{
    onLink: (memberId: string) => Promise<void>;
    isSubmitting: boolean;
}>) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<{ id: string; firstname: string; lastname: string }[]>([]);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const search = async (q: string) => {
        if (!q.trim()) { setResults([]); return; }
        try {
            const res = await api.get(`/members?page=1&limit=10&search=${encodeURIComponent(q)}`);
            setResults(res.data?.data?.data ?? []);
        } catch {
            setResults([]);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setQuery(q);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(q), 300);
    };

    return (
        <div className="space-y-1.5">
            <input
                type="text"
                value={query}
                onChange={handleInput}
                placeholder="Search members by name…"
                className="w-full h-9 px-2 bg-white border border-[#121212]/10 text-xs rounded-lg"
            />
            {results.length > 0 && (
                <div className="border border-[#121212]/10 rounded-lg overflow-hidden divide-y divide-[#121212]/5">
                    {results.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => { onLink(m.id); setQuery(""); setResults([]); }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-[#F4F1EA]/50 disabled:opacity-40"
                        >
                            {m.firstname} {m.lastname}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function FollowUpHistorySection({
    convertId,
    fetchFollowUpHistory,
}: Readonly<{
    convertId: string;
    fetchFollowUpHistory: (id: string, page?: number) => Promise<{ logs: FollowUpLogRecord[]; pagination: { page: number; totalPages: number } | null }>;
}>) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<FollowUpLogRecord[] | null>(null);

    const toggle = async () => {
        if (open) { setOpen(false); return; }
        setOpen(true);
        if (logs === null) {
            setLoading(true);
            const { logs: fetched } = await fetchFollowUpHistory(convertId, 1);
            setLogs(fetched);
            setLoading(false);
        }
    };

    return (
        <div>
            <button
                type="button"
                onClick={toggle}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8A817C] hover:text-[#121212]"
            >
                <History className="w-3 h-3" /> Follow-Up History
                {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {open && (
                loading ? (
                    <p className="text-[11px] text-[#8A817C] mt-1.5">Loading…</p>
                ) : logs && logs.length === 0 ? (
                    <p className="text-[11px] text-[#8A817C] mt-1.5">No follow-up logged yet.</p>
                ) : (
                    <div className="mt-1.5 space-y-2 border-l border-[#121212]/10 pl-3">
                        {logs?.map((l) => (
                            <div key={l.id} className="text-[11px]">
                                <span className="text-[#8A817C] font-mono">{formatDate(l.contactedAt)} · {l.loggedByName}</span>
                                {l.note && <p className="text-[#121212] font-light">{l.note}</p>}
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}

const EvangelismAdminPage = () => {
    const {
        converts, pagination, isLoading, isSubmitting, error,
        fetchConverts, reassignConvert, linkToMember, fetchFollowUpHistory,
    } = useEvangelismAdmin();

    const [statusFilter, setStatusFilter] = useState<ConvertStatus | "">("");
    const [selected, setSelected] = useState<ConvertRecord | null>(null);

    useEffect(() => {
        fetchConverts(1, statusFilter || undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const panelOpen = selected !== null;

    const handleReassign = async (workerProfileId: string) => {
        if (!selected) return;
        try {
            const updated = await reassignConvert(selected.id, workerProfileId);
            setSelected(updated);
        } catch { /* surfaced via hook */ }
    };

    const handleLinkMember = async (memberId: string) => {
        if (!selected) return;
        try {
            const updated = await linkToMember(selected.id, memberId);
            setSelected(updated);
        } catch { /* surfaced via hook */ }
    };

    return (
        <div className="space-y-8 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                        Evangelism
                    </h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1 flex items-center gap-1.5">
                        <Flame className="w-3 h-3" />
                        Convert onboarding, follow-up, and reassignment
                    </p>
                </div>
                <button
                    onClick={() => fetchConverts(pagination?.page ?? 1, statusFilter || undefined)}
                    disabled={isLoading}
                    className="p-2 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-40"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                </button>
            </div>

            <DismissibleError message={error} />

            <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl w-fit gap-0.5">
                {(["", "UNSAVED", "SAVED", "UNDERGOING_DISCIPLESHIP"] as const).map((s) => (
                    <button
                        key={s || "ALL"}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${statusFilter === s ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                    >
                        {s ? STATUS_LABELS[s] : "All"}
                    </button>
                ))}
            </div>

            <div className={`grid grid-cols-1 gap-6 ${panelOpen ? "lg:grid-cols-12" : ""}`}>
                <div className={`${panelOpen ? "lg:col-span-7" : ""} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Name</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden sm:table-cell">Assigned To</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={3} className="p-4"><div className="h-3 bg-[#F4F1EA] rounded w-3/4" /></td>
                                        </tr>
                                    ))
                                ) : converts.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                            No converts found.
                                        </td>
                                    </tr>
                                ) : (
                                    converts.map((c) => (
                                        <tr
                                            key={c.id}
                                            onClick={() => setSelected(c)}
                                            className={`cursor-pointer transition-colors ${selected?.id === c.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
                                        >
                                            <td className="p-4 text-sm font-medium text-[#121212]">
                                                {c.name}
                                                <div className="text-[10px] font-mono text-[#8A817C] mt-0.5">Onboarded by {c.onboardedByName}</div>
                                            </td>
                                            <td className="p-4 text-xs text-[#8A817C] hidden sm:table-cell">
                                                {c.assignedTo ? `${c.assignedTo.member.firstname} ${c.assignedTo.member.lastname}` : "Unassigned"}
                                            </td>
                                            <td className="p-4"><StatusBadge status={c.status} /></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <PaginationBar
                        pagination={pagination}
                        onPage={(p) => fetchConverts(p, statusFilter || undefined)}
                        isLoading={isLoading}
                        label="converts"
                    />

                    {!panelOpen && (
                        <div className="p-4 border-t border-[#121212]/5 text-center text-[11px] text-[#8A817C] font-light flex items-center justify-center gap-2">
                            <MousePointerClick className="w-3.5 h-3.5" />
                            Click any row to view details, reassign, or link to a member
                        </div>
                    )}
                </div>

                {panelOpen && selected && (
                    <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative flex flex-col">
                        <div className="p-5 border-b border-[#121212]/5 flex items-start justify-between gap-4">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Convert Detail</div>
                                <h2 className="text-lg font-light tracking-tight text-[#121212]">{selected.name}</h2>
                                {selected.phone && <span className="text-[11px] font-mono text-[#8A817C]">{selected.phone}</span>}
                            </div>
                            <button
                                onClick={() => setSelected(null)}
                                className="shrink-0 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                            {selected.notes && (
                                <div className="p-3 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-lg">
                                    <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Notes</span>
                                    <p className="text-[#121212] font-light text-xs whitespace-pre-wrap">{selected.notes}</p>
                                </div>
                            )}

                            <div className="text-xs text-[#8A817C] space-y-1">
                                <p>Onboarded by {selected.onboardedByName}</p>
                                <p>Last contacted: {formatDate(selected.lastContactedAt)}</p>
                                {selected.member && <p className="text-green-700 font-medium">Linked to member: {selected.member.firstname} {selected.member.lastname}</p>}
                            </div>

                            <div className="border-t border-[#121212]/5 pt-4 space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212]">Status</h3>
                                <StatusBadge status={selected.status} />
                            </div>

                            <div className="border-t border-[#121212]/5 pt-4 space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212]">
                                    {selected.assignedTo ? "Reassign Follow-Up" : "Assign Follow-Up"}
                                </h3>
                                <ReassignControl convert={selected} onReassign={handleReassign} isSubmitting={isSubmitting} />
                            </div>

                            {!selected.member && (
                                <div className="border-t border-[#121212]/5 pt-4 space-y-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212]">Link to Member</h3>
                                    <LinkMemberControl onLink={handleLinkMember} isSubmitting={isSubmitting} />
                                </div>
                            )}

                            <div className="border-t border-[#121212]/5 pt-4">
                                <FollowUpHistorySection convertId={selected.id} fetchFollowUpHistory={fetchFollowUpHistory} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default withAuth(EvangelismAdminPage, { requiredPermission: 'evangelism:read' });
