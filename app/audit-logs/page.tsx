"use client";

import React, { useEffect, useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { Shield, SlidersHorizontal, RefreshCw, X, MousePointerClick } from "lucide-react";
import { DismissibleError } from "@/components/ui/dismissible-error";
import {
    useAuditLogs,
    AuditAction,
    AuditLogFilters,
} from "@/hooks/use-audit-logs";
import { useAdminUsers } from "@/hooks/use-admin-management";
import { PaginationBar } from "@/components/ui/pagination-bar";

const ACTION_OPTIONS: AuditAction[] = [
    "ADMIN_CREATED", "ADMIN_LOGIN", "ADMIN_PASSWORD_RESET",
    "ADMIN_ROLE_CREATED", "ADMIN_ROLE_UPDATED", "ADMIN_ROLE_DELETED",
    "ADMIN_USER_CREATED", "ADMIN_USER_UPDATED", "ADMIN_USER_DEACTIVATED",
    "MEMBER_SIGNED_UP", "MEMBER_LOGIN", "MEMBER_LOGOUT",
    "MEMBER_ACTIVATED", "MEMBER_DEACTIVATED", "MEMBER_UPDATED",
    "PASSWORD_CHANGED", "PASSWORD_RESET_REQUESTED", "PASSWORD_RESET_COMPLETED",
    "DEVICE_PURGED", "DEVICE_RESET_REQUESTED", "DEVICE_RESET_COMPLETED",
    "WORKER_PROMOTED", "WORKER_REVOKED", "WORKER_PROFILE_UPDATED", "BULK_WORKER_PROMOTED",
    "DEPARTMENT_CREATED", "DEPARTMENT_UPDATED", "DEPARTMENT_DELETED",
    "DEPARTMENT_LEAD_ASSIGNED", "DEPARTMENT_LEAD_REMOVED", "BULK_DEPARTMENT_ASSIGNED",
    "ANNOUNCEMENT_CREATED", "ANNOUNCEMENT_UPDATED", "ANNOUNCEMENT_DELETED",
    "EVENT_CREATED", "EVENT_UPDATED", "EVENT_DELETED",
    "NOTE_CREATED", "NOTE_UPDATED", "NOTE_DELETED",
    "LEAVE_APPROVED", "LEAVE_REJECTED",
    "TITHE_ACCOUNT_CREATED", "TITHE_ACCOUNT_UPDATED",
    "TITHE_BATCH_QUEUED", "TITHE_UNMATCHED_RESOLVED",
];

const ACTION_COLORS: Record<string, string> = {
    CREATED: "bg-green-50 text-green-700",
    SIGNED_UP: "bg-green-50 text-green-700",
    APPROVED: "bg-green-50 text-green-700",
    PROMOTED: "bg-blue-50 text-blue-700",
    ASSIGNED: "bg-blue-50 text-blue-700",
    LOGIN: "bg-[#F4F1EA] text-[#8A817C]",
    LOGOUT: "bg-[#F4F1EA] text-[#8A817C]",
    UPDATED: "bg-amber-50 text-amber-700",
    CHANGED: "bg-amber-50 text-amber-700",
    RESET: "bg-amber-50 text-amber-700",
    QUEUED: "bg-amber-50 text-amber-700",
    DEACTIVATED: "bg-red-50 text-red-700",
    DELETED: "bg-red-50 text-red-700",
    REVOKED: "bg-red-50 text-red-700",
    PURGED: "bg-red-50 text-red-700",
    REJECTED: "bg-red-50 text-red-700",
};

function actionBadgeClass(action: string): string {
    for (const [key, cls] of Object.entries(ACTION_COLORS)) {
        if (action.endsWith(key)) return cls;
    }
    return "bg-[#F4F1EA] text-[#8A817C]";
}

function formatAction(action: string): string {
    return action.replaceAll("_", " ");
}

function fmtDateTime(iso: string): string {
    return new Date(iso).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

const SKELETON_ROWS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const SKELETON_COLS = ["t", "ac", "at", "tg"] as const;

const AuditLogsPage = withAuth(() => {
    const { logs, pagination, isLoading, error, fetchLogs, applyFilters, goToPage } = useAuditLogs(20);
    const { admins, fetchAdmins } = useAdminUsers();

    const [draftFilters, setDraftFilters] = useState<AuditLogFilters>({
        action: "", actorId: "", targetEmail: "", dateFrom: "", dateTo: "",
    });
    const [showFilters, setShowFilters] = useState(false);
    const [selectedLog, setSelectedLog] = useState<(typeof logs)[number] | null>(null);

    useEffect(() => {
        fetchLogs(1, {});
        fetchAdmins();
    }, [fetchLogs, fetchAdmins]);

    function handleApply() {
        const active: AuditLogFilters = {};
        if (draftFilters.action) active.action = draftFilters.action;
        if (draftFilters.actorId) active.actorId = draftFilters.actorId;
        if (draftFilters.targetEmail?.trim()) active.targetEmail = draftFilters.targetEmail.trim();
        if (draftFilters.dateFrom) active.dateFrom = draftFilters.dateFrom;
        if (draftFilters.dateTo) active.dateTo = draftFilters.dateTo;
        applyFilters(active);
    }

    function handleClear() {
        setDraftFilters({ action: "" as const, actorId: "", targetEmail: "", dateFrom: "", dateTo: "" });
        applyFilters({});
    }

    const hasActiveFilters = !!(draftFilters.action || draftFilters.actorId || draftFilters.targetEmail || draftFilters.dateFrom || draftFilters.dateTo);

    return (
        <div className="space-y-6 font-sans">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Audit Trail</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Admin action history
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="f-action" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Action</label>
                            <select
                                id="f-action"
                                value={draftFilters.action ?? ""}
                                onChange={(e) => setDraftFilters((p) => ({ ...p, action: e.target.value as AuditAction | "" }))}
                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg"
                            >
                                <option value="">All actions</option>
                                {ACTION_OPTIONS.map((a) => (
                                    <option key={a} value={a}>{formatAction(a)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="f-actor" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Performed by</label>
                            <select
                                id="f-actor"
                                value={draftFilters.actorId ?? ""}
                                onChange={(e) => setDraftFilters((p) => ({ ...p, actorId: e.target.value }))}
                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg"
                            >
                                <option value="">All admins</option>
                                {admins.map((a) => (
                                    <option key={a.member.id} value={a.member.id}>
                                        {a.member.firstname} {a.member.lastname}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="f-target-email" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Target email</label>
                            <input
                                id="f-target-email"
                                type="text"
                                value={draftFilters.targetEmail ?? ""}
                                onChange={(e) => setDraftFilters((p) => ({ ...p, targetEmail: e.target.value }))}
                                placeholder="Search by email..."
                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] placeholder:text-[#8A817C]/60 focus:outline-none focus:border-[#121212] rounded-lg"
                            />
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
                                    <th className="text-left px-4 py-3 text-[#8A817C] font-semibold uppercase tracking-wider">Time</th>
                                    <th className="text-left px-4 py-3 text-[#8A817C] font-semibold uppercase tracking-wider">Action</th>
                                    <th className="text-left px-4 py-3 text-[#8A817C] font-semibold uppercase tracking-wider hidden sm:table-cell">Actor</th>
                                    <th className="text-left px-4 py-3 text-[#8A817C] font-semibold uppercase tracking-wider hidden md:table-cell">Target</th>
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
                                            <Shield className="w-8 h-8 mx-auto mb-3 text-[#8A817C]/30" />
                                            No audit logs found for the selected filters.
                                        </td>
                                    </tr>
                                )}
                                {!isLoading && logs.map((log) => (
                                    <tr
                                        key={log.id}
                                        onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                                        className={`border-b border-[#121212]/5 last:border-0 cursor-pointer transition-colors hover:bg-[#F4F1EA]/20 ${selectedLog?.id === log.id ? "bg-[#F4F1EA]/30" : ""}`}
                                    >
                                        <td className="px-4 py-3 font-mono text-[#8A817C] whitespace-nowrap">{fmtDateTime(log.createdAt)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${actionBadgeClass(log.action)}`}>
                                                {formatAction(log.action)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-[#121212] font-light hidden sm:table-cell">
                                            {log.actor ? `${log.actor.firstname} ${log.actor.lastname}` : <span className="text-[#8A817C]">System</span>}
                                        </td>
                                        <td className="px-4 py-3 text-[#121212] font-light hidden md:table-cell">
                                            {log.targetName ?? log.targetEmail ?? "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {pagination && pagination.totalPages > 1 && (
                        <div className="mt-4">
                            <PaginationBar
                                pagination={pagination}
                                onPage={goToPage}
                                isLoading={isLoading}
                                label="logs"
                            />
                        </div>
                    )}
                </div>

                {!selectedLog && logs.length > 0 && (
                    <div className="col-span-12 flex items-center justify-center gap-2 text-xs text-[#8A817C] font-light py-2">
                        <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
                        Click any row to view details
                    </div>
                )}

                {/* Detail panel */}
                {selectedLog && (
                    <div className="col-span-12 lg:col-span-5">
                        <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 space-y-4 sticky top-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-light tracking-tight text-[#121212]">Log Detail</h2>
                                <button onClick={() => setSelectedLog(null)} className="text-[#8A817C] hover:text-[#121212]">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Action</p>
                                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${actionBadgeClass(selectedLog.action)}`}>
                                        {formatAction(selectedLog.action)}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Timestamp</p>
                                    <p className="font-mono text-[#121212]">{fmtDateTime(selectedLog.createdAt)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Actor</p>
                                    <p className="text-[#121212] font-light">
                                        {selectedLog.actor
                                            ? `${selectedLog.actor.firstname} ${selectedLog.actor.lastname}`
                                            : "System / Automated"}
                                    </p>
                                    {selectedLog.actor && (
                                        <p className="font-mono text-[#8A817C] mt-0.5">{selectedLog.actor.id}</p>
                                    )}
                                </div>
                                {(selectedLog.targetName || selectedLog.targetEmail || selectedLog.targetId) && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Target</p>
                                        {selectedLog.targetName && <p className="text-[#121212] font-light">{selectedLog.targetName}</p>}
                                        {selectedLog.targetEmail && <p className="text-[#8A817C] font-light mt-0.5">{selectedLog.targetEmail}</p>}
                                        {selectedLog.targetId && <p className="font-mono text-[#8A817C]/60 text-[10px] mt-0.5">{selectedLog.targetId}</p>}
                                    </div>
                                )}
                                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Metadata</p>
                                        <pre className="bg-[#F4F1EA]/60 rounded-lg p-3 text-[10px] font-mono text-[#121212] overflow-x-auto whitespace-pre-wrap break-all">
                                            {JSON.stringify(selectedLog.metadata, null, 2)}
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
}, { requiredPermission: "audit:read" });

export default AuditLogsPage;
