"use client";

import React, { useEffect, useMemo, useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { MessageSquare, SlidersHorizontal, RefreshCw, X, MousePointerClick, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { useSmsLogs, SmsLogEntry, SmsLogFilters } from "@/hooks/use-sms-logs";
import { DismissibleError } from "@/components/ui/dismissible-error";
import { PaginationBar } from "@/components/ui/pagination-bar";

const SKELETON_ROWS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const SKELETON_COLS = ["r", "s", "st", "t"] as const;

function fmtDateTime(raw: string): string {
    if (!raw) return "—";
    const d = new Date(raw.replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
    const normalized = status.toLowerCase();
    if (normalized === "delivered" || normalized === "sent" || normalized === "success") {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-green-50 text-green-700">
                <CheckCircle2 className="w-2.5 h-2.5" />
                {status}
            </span>
        );
    }
    if (normalized === "failed" || normalized === "expired" || normalized === "undelivered" || normalized === "rejected") {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-700">
                <XCircle className="w-2.5 h-2.5" />
                {status}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#F4F1EA] text-[#8A817C]">
            <HelpCircle className="w-2.5 h-2.5" />
            {status || "Unknown"}
        </span>
    );
}

const SmsLogsPage = withAuth(() => {
    const { logs, pagination, isLoading, error, fetchLogs, applyFilters, goToPage } = useSmsLogs();

    const [draftFilters, setDraftFilters] = useState<SmsLogFilters>({ recipient: "", status: "" });
    const [showFilters, setShowFilters] = useState(false);
    const [selectedLog, setSelectedLog] = useState<SmsLogEntry | null>(null);
    const [allStatuses, setAllStatuses] = useState<string[]>([]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    // Termii statuses are free-text, not a fixed enum — the filter's
    // options are derived from whatever values actually came back, rather
    // than a guessed static list.
    useEffect(() => {
        if (logs.length === 0) return;
        setAllStatuses((prev) => {
            const merged = new Set(prev);
            logs.forEach((l) => l.status && merged.add(l.status));
            return Array.from(merged).sort();
        });
    }, [logs]);

    function handleApply() {
        const active: SmsLogFilters = {};
        if (draftFilters.recipient?.trim()) active.recipient = draftFilters.recipient.trim();
        if (draftFilters.status) active.status = draftFilters.status;
        applyFilters(active);
    }

    function handleClear() {
        setDraftFilters({ recipient: "", status: "" });
        applyFilters({});
    }

    const hasActiveFilters = !!(draftFilters.recipient || draftFilters.status);

    const messagePreview = useMemo(() => {
        if (!selectedLog) return "";
        return selectedLog.message.length > 400 ? `${selectedLog.message.slice(0, 400)}…` : selectedLog.message;
    }, [selectedLog]);

    return (
        <div className="space-y-6 font-sans">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">SMS Logs</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Live delivery history from Termii — not stored locally
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchLogs()}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 h-9 px-3 border border-[#121212]/10 rounded-lg text-xs font-semibold uppercase tracking-wider text-[#8A817C] hover:bg-[#F4F1EA]/50 disabled:opacity-40"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowFilters((v) => !v)}
                        className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${showFilters ? "border-[#121212] bg-[#121212] text-white" : "border-[#121212]/10 text-[#8A817C] hover:bg-[#F4F1EA]/50"}`}
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        Filters {hasActiveFilters && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />}
                    </button>
                </div>
            </div>

            {/* Filter panel */}
            {showFilters && (
                <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="f-recipient" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Recipient</label>
                            <input
                                id="f-recipient"
                                type="text"
                                value={draftFilters.recipient ?? ""}
                                onChange={(e) => setDraftFilters((p) => ({ ...p, recipient: e.target.value }))}
                                placeholder="Search by phone number..."
                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] placeholder:text-[#8A817C]/60 focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>
                        <div>
                            <label htmlFor="f-status" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Status</label>
                            <select
                                id="f-status"
                                value={draftFilters.status ?? ""}
                                onChange={(e) => setDraftFilters((p) => ({ ...p, status: e.target.value }))}
                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg"
                            >
                                <option value="">All statuses</option>
                                {allStatuses.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                        <button
                            onClick={handleApply}
                            className="h-9 px-5 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors"
                        >
                            Apply
                        </button>
                        {hasActiveFilters && (
                            <button onClick={handleClear} className="h-9 px-4 border border-[#121212]/10 text-xs font-semibold uppercase tracking-wider text-[#8A817C] rounded-lg hover:bg-[#F4F1EA]/50">
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}

            <DismissibleError message={error} />

            {/* Table + detail panel */}
            <div className="grid grid-cols-12 gap-4">
                <div className={selectedLog ? "col-span-12 lg:col-span-7" : "col-span-12"}>
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-[#121212]/5">
                                    <th className="text-left px-4 py-3 text-[11px] text-[#8A817C] font-semibold uppercase tracking-wider">Recipient</th>
                                    <th className="text-left px-4 py-3 text-[11px] text-[#8A817C] font-semibold uppercase tracking-wider hidden sm:table-cell">Message</th>
                                    <th className="text-left px-4 py-3 text-[11px] text-[#8A817C] font-semibold uppercase tracking-wider">Status</th>
                                    <th className="text-left px-4 py-3 text-[11px] text-[#8A817C] font-semibold uppercase tracking-wider hidden md:table-cell">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && SKELETON_ROWS.map((row) => (
                                    <tr key={row} className="border-b border-[#121212]/5">
                                        {SKELETON_COLS.map((col) => (
                                            <td key={col} className="px-4 py-3">
                                                <div className="h-3 bg-[#F4F1EA] rounded animate-pulse w-3/4" />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {!isLoading && logs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-16 text-center text-[#8A817C] font-light">
                                            <MessageSquare className="w-8 h-8 mx-auto mb-3 text-[#8A817C]/30" />
                                            No SMS logs found for the selected filters.
                                        </td>
                                    </tr>
                                )}
                                {!isLoading && logs.map((log, i) => (
                                    <tr
                                        key={`${log.messageId}-${i}`}
                                        onClick={() => setSelectedLog(selectedLog?.messageId === log.messageId ? null : log)}
                                        className={`border-b border-[#121212]/5 last:border-0 cursor-pointer transition-colors hover:bg-[#F4F1EA]/20 ${selectedLog?.messageId === log.messageId ? "bg-[#F4F1EA]/30" : ""}`}
                                    >
                                        <td className="px-4 py-3 text-sm font-medium text-[#121212] truncate max-w-[180px] font-mono">{log.recipient}</td>
                                        <td className="px-4 py-3 text-[#8A817C] font-light truncate max-w-[280px] hidden sm:table-cell">{log.message}</td>
                                        <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                                        <td className="px-4 py-3 font-mono text-[#8A817C] whitespace-nowrap hidden md:table-cell">{fmtDateTime(log.sentAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {pagination.totalPages > 1 && (
                        <div className="mt-4">
                            <PaginationBar pagination={pagination} onPage={goToPage} isLoading={isLoading} label="messages" />
                        </div>
                    )}

                    {!selectedLog && logs.length > 0 && (
                        <div className="col-span-12 flex items-center justify-center gap-2 text-xs text-[#8A817C] font-light py-2">
                            <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
                            Click any row to view details
                        </div>
                    )}
                </div>

                {/* Detail panel */}
                {selectedLog && (
                    <div className="col-span-12 lg:col-span-5">
                        <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 space-y-4 sticky top-4 relative">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#F4F1EA] text-[#8A817C] mb-1">SMS Log</span>
                                    <h2 className="text-lg font-light tracking-tight text-[#121212] leading-snug break-all font-mono">
                                        {selectedLog.recipient}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedLog(null)}
                                    className="absolute top-4 right-4 text-[#8A817C] hover:text-[#121212] transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Status</p>
                                    <StatusBadge status={selectedLog.status} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Message</p>
                                    <p className="text-[#121212] font-light whitespace-pre-wrap">{messagePreview}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Sent at</p>
                                    <p className="font-mono text-[#121212]">{fmtDateTime(selectedLog.sentAt)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Type</p>
                                    <p className="text-[#121212] font-light">{selectedLog.type || "—"}</p>
                                </div>
                                {selectedLog.sender && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Sender ID</p>
                                        <p className="font-mono text-[#8A817C]">{selectedLog.sender}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Message ID</p>
                                    <p className="font-mono text-[#8A817C] break-all">{selectedLog.messageId || "—"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}, { requiredPermission: "sms:read" });

export default SmsLogsPage;
