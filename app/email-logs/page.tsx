"use client";

import React, { useEffect, useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { Mail, SlidersHorizontal, RefreshCw, X, MousePointerClick, CheckCircle2, XCircle } from "lucide-react";
import { useEmailLogs, EmailLog, EmailLogFilters, EmailLogStatus } from "@/hooks/use-email-logs";
import { DismissibleError } from "@/components/ui/dismissible-error";
import { PaginationBar } from "@/components/ui/pagination-bar";

const SKELETON_ROWS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const SKELETON_COLS = ["r", "s", "st", "t"] as const;

function fmtDateTime(iso: string): string {
    return new Date(iso).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function StatusBadge({ status }: Readonly<{ status: EmailLogStatus }>) {
    if (status === "sent") {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-green-50 text-green-700">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Sent
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-700">
            <XCircle className="w-2.5 h-2.5" />
            Failed
        </span>
    );
}

const EmailLogsPage = withAuth(() => {
    const { logs, pagination, isLoading, error, fetchLogs, applyFilters, goToPage } = useEmailLogs(20);

    const [draftFilters, setDraftFilters] = useState<EmailLogFilters>({
        recipient: "", status: "", dateFrom: "", dateTo: "",
    });
    const [showFilters, setShowFilters] = useState(false);
    const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

    useEffect(() => { fetchLogs(1, {}); }, [fetchLogs]);

    function handleApply() {
        const active: EmailLogFilters = {};
        if (draftFilters.recipient?.trim()) active.recipient = draftFilters.recipient.trim();
        if (draftFilters.status) active.status = draftFilters.status;
        if (draftFilters.dateFrom) active.dateFrom = draftFilters.dateFrom;
        if (draftFilters.dateTo) active.dateTo = draftFilters.dateTo;
        applyFilters(active);
    }

    function handleClear() {
        setDraftFilters({ recipient: "", status: "", dateFrom: "", dateTo: "" });
        applyFilters({});
    }

    const hasActiveFilters = !!(draftFilters.recipient || draftFilters.status || draftFilters.dateFrom || draftFilters.dateTo);

    return (
        <div className="space-y-6 font-sans">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Email Logs</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Delivery history
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchLogs(1, {})}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label htmlFor="f-recipient" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Recipient</label>
                            <input
                                id="f-recipient"
                                type="text"
                                value={draftFilters.recipient ?? ""}
                                onChange={(e) => setDraftFilters((p) => ({ ...p, recipient: e.target.value }))}
                                placeholder="Search by email..."
                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] placeholder:text-[#8A817C]/60 focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>
                        <div>
                            <label htmlFor="f-status" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Status</label>
                            <select
                                id="f-status"
                                value={draftFilters.status ?? ""}
                                onChange={(e) => setDraftFilters((p) => ({ ...p, status: e.target.value as EmailLogStatus | "" }))}
                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg"
                            >
                                <option value="">All statuses</option>
                                <option value="sent">Sent</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="f-date-from" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">From</label>
                            <input
                                id="f-date-from"
                                type="date"
                                value={draftFilters.dateFrom ?? ""}
                                onChange={(e) => setDraftFilters((p) => ({ ...p, dateFrom: e.target.value }))}
                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>
                        <div>
                            <label htmlFor="f-date-to" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">To</label>
                            <input
                                id="f-date-to"
                                type="date"
                                value={draftFilters.dateTo ?? ""}
                                onChange={(e) => setDraftFilters((p) => ({ ...p, dateTo: e.target.value }))}
                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg"
                            />
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
                                    <th className="text-left px-4 py-3 text-[11px] text-[#8A817C] font-semibold uppercase tracking-wider hidden sm:table-cell">Subject</th>
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
                                            <Mail className="w-8 h-8 mx-auto mb-3 text-[#8A817C]/30" />
                                            No email logs found for the selected filters.
                                        </td>
                                    </tr>
                                )}
                                {!isLoading && logs.map((log) => (
                                    <tr
                                        key={log.id}
                                        onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                                        className={`border-b border-[#121212]/5 last:border-0 cursor-pointer transition-colors hover:bg-[#F4F1EA]/20 ${selectedLog?.id === log.id ? "bg-[#F4F1EA]/30" : ""}`}
                                    >
                                        <td className="px-4 py-3 text-sm font-medium text-[#121212] truncate max-w-[180px]">{log.recipient}</td>
                                        <td className="px-4 py-3 text-[#8A817C] font-light truncate max-w-[220px] hidden sm:table-cell">{log.subject ?? "—"}</td>
                                        <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                                        <td className="px-4 py-3 font-mono text-[#8A817C] whitespace-nowrap hidden md:table-cell">{fmtDateTime(log.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {pagination && pagination.totalPages > 1 && (
                        <div className="mt-4">
                            <PaginationBar pagination={pagination} onPage={goToPage} isLoading={isLoading} label="emails" />
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
                        <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 space-y-4 sticky top-4">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#F4F1EA] text-[#8A817C] mb-1">Email Log</span>
                                    <h2 className="text-lg font-light tracking-tight text-[#121212] leading-snug break-all">
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
                                {selectedLog.subject && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Subject</p>
                                        <p className="text-[#121212] font-light">{selectedLog.subject}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Sent at</p>
                                    <p className="font-mono text-[#121212]">{fmtDateTime(selectedLog.createdAt)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Attempts</p>
                                    <p className="text-[#121212] font-light">{selectedLog.attemptsMade}</p>
                                </div>
                                {selectedLog.jobId && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Job ID</p>
                                        <p className="font-mono text-[#8A817C]">{selectedLog.jobId}</p>
                                    </div>
                                )}
                                {selectedLog.errorMessage && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Error</p>
                                        <pre className="bg-red-50 border border-red-100 rounded-lg p-3 text-[10px] font-mono text-red-700 overflow-x-auto whitespace-pre-wrap break-all">
                                            {selectedLog.errorMessage}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}, { requiredPermission: "email_logs:read" });

export default EmailLogsPage;
