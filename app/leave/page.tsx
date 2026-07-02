"use client";

import React, { useState, useEffect } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    X, CheckCircle2, XCircle, Clock, RefreshCw, MousePointerClick,
} from "lucide-react";
import { useLeave, LeaveRequest, LeaveStatus } from "@/hooks/use-leave";
import { DismissibleError } from "@/components/ui/dismissible-error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fullName = (m: Readonly<{ firstname: string; lastname: string }>) =>
    [m.firstname, m.lastname].filter(Boolean).join(" ");

const fmtDate = (val: string | null) => {
    if (!val) return "—";
    return new Date(val).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtDateTime = (val: string | null) => {
    if (!val) return "—";
    return new Date(val).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
    });
};

const STATUS_TABS: Readonly<{ label: string; value: LeaveStatus | "" }[]> = [
    { label: "All",      value: "" },
    { label: "Pending",  value: "PENDING" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
];

const SKELETON_COLS = ["w", "d", "r", "s", "t"] as const;

// ─── Badge ────────────────────────────────────────────────────────────────────

function LeaveStatusBadge({ status }: Readonly<{ status: LeaveStatus }>) {
    const map: Record<LeaveStatus, string> = {
        PENDING:  "bg-amber-50 border-amber-100 text-amber-700",
        APPROVED: "bg-green-50 border-green-100 text-green-700",
        REJECTED: "bg-red-50 border-red-100 text-red-600",
    };
    const icons: Record<LeaveStatus, React.ReactNode> = {
        PENDING:  <Clock className="w-2.5 h-2.5" />,
        APPROVED: <CheckCircle2 className="w-2.5 h-2.5" />,
        REJECTED: <XCircle className="w-2.5 h-2.5" />,
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${map[status]}`}>
            {icons[status]}
            {status}
        </span>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
    return (
        <tr className="border-b border-[#121212]/5 animate-pulse">
            {SKELETON_COLS.map((col) => (
                <td key={col} className="p-4">
                    <div className="h-3 bg-[#F4F1EA] rounded w-3/4" />
                </td>
            ))}
        </tr>
    );
}

// ─── Empty cell ───────────────────────────────────────────────────────────────

function EmptyRow({ statusFilter }: Readonly<{ statusFilter: string }>) {
    const message = statusFilter
        ? `No ${statusFilter.toLowerCase()} leave requests.`
        : "No leave requests found.";
    return (
        <tr>
            <td colSpan={5} className="p-12 text-center text-xs text-[#8A817C] font-light">
                {message}
            </td>
        </tr>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function LeavePage() {
    const {
        requests, pagination, statusFilter,
        isLoading, isSubmitting, error,
        fetchLeaveRequests, applyFilter, goToPage, actionLeave,
    } = useLeave();

    const [selected, setSelected] = useState<LeaveRequest | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    useEffect(() => {
        if (selected) {
            const updated = requests.find(r => r.id === selected.id);
            if (updated) setSelected(updated);
        }
    }, [requests, selected]);

    const closePanel = () => {
        setSelected(null);
        setActionError(null);
    };

    const handleAction = async (status: "APPROVED" | "REJECTED") => {
        if (!selected) return;
        setActionError(null);
        try {
            await actionLeave(selected.id, status);
            closePanel();
        } catch (e: any) {
            setActionError(e?.message || "Action failed.");
        }
    };

    const panelOpen = !!selected;

    return (
        <div className="space-y-10 font-sans">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                        Leave Requests
                    </h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Review and action worker leave requests
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => fetchLeaveRequests(1, statusFilter)}
                    disabled={isLoading}
                    className="p-2 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-40"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                </button>
            </div>

            <DismissibleError message={error} />

            {/* Status tabs */}
            <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl w-fit">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.value}
                        type="button"
                        onClick={() => applyFilter(tab.value)}
                        className={`flex items-center px-4 py-2 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${
                            statusFilter === tab.value
                                ? "bg-[#121212] text-[#FFFFFF]"
                                : "text-[#8A817C] hover:text-[#121212]"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Table */}
                <div className={`${panelOpen ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col transition-all`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Worker</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Date Range</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Reason</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Status</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden md:table-cell">Submitted</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                {isLoading && SKELETON_COLS.map((col) => <SkeletonRow key={col} />)}
                                {!isLoading && requests.length === 0 && <EmptyRow statusFilter={statusFilter} />}
                                {!isLoading && requests.map(req => {
                                    const worker = req.workerProfile?.member;
                                    const isSelected = selected?.id === req.id;
                                    return (
                                        <tr
                                            key={req.id}
                                            onClick={() => { setSelected(req); setActionError(null); }}
                                            className={`cursor-pointer transition-colors ${isSelected ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
                                        >
                                            <td className="p-4">
                                                <div className="text-sm font-medium text-[#121212]">{worker ? fullName(worker) : "—"}</div>
                                                <div className="text-xs font-mono text-[#8A817C] mt-0.5">{worker?.email ?? "—"}</div>
                                            </td>
                                            <td className="p-4 text-xs font-mono text-[#8A817C] whitespace-nowrap">
                                                {fmtDate(req.dateFrom)} – {fmtDate(req.dateTo)}
                                            </td>
                                            <td className="p-4 text-xs font-light text-[#8A817C] max-w-[200px]">
                                                <span className="line-clamp-2">{req.reason}</span>
                                            </td>
                                            <td className="p-4">
                                                <LeaveStatusBadge status={req.status} />
                                            </td>
                                            <td className="p-4 text-xs font-mono text-[#8A817C] hidden md:table-cell whitespace-nowrap">
                                                {fmtDate(req.createdAt)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {pagination && pagination.totalPages > 1 && (
                        <div className="p-4 border-t border-[#121212]/10 bg-[#F4F1EA]/10 flex items-center justify-between">
                            <span className="text-xs font-mono text-[#8A817C]">
                                {pagination.totalCount} total · Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <div className="flex space-x-1">
                                <button
                                    type="button"
                                    disabled={pagination.page <= 1 || isLoading}
                                    onClick={() => goToPage(pagination.page - 1)}
                                    className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212] hover:bg-[#F4F1EA]"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <button
                                    type="button"
                                    disabled={pagination.page >= pagination.totalPages || isLoading}
                                    onClick={() => goToPage(pagination.page + 1)}
                                    className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212] hover:bg-[#F4F1EA]"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Detail panel */}
                {panelOpen && selected && (
                    <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative overflow-hidden">

                        <button
                            type="button"
                            onClick={closePanel}
                            className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md z-10 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="p-6 border-b border-[#121212]/5">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Leave Detail</div>
                            <h2 className="text-lg font-light tracking-tight text-[#121212] pr-8">
                                {fullName(selected.workerProfile.member)}
                            </h2>
                            <div className="text-xs font-mono text-[#8A817C] mt-1 truncate">
                                {selected.workerProfile.member.email}
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                <LeaveStatusBadge status={selected.status} />
                                {selected.actionedBy && (
                                    <span className="text-[10px] font-mono text-[#8A817C]/60">
                                        by {fullName(selected.actionedBy)}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="p-6 space-y-6">

                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212]">Worker</h3>
                                <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Phone</div>
                                    <div className="text-xs font-mono text-[#121212]">{selected.workerProfile.member.phoneNumber ?? "—"}</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212]">Leave Period</h3>
                                <div className="space-y-2">
                                    <div>
                                        <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">From</div>
                                        <div className="text-xs font-mono text-[#121212]">{fmtDate(selected.dateFrom)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">To</div>
                                        <div className="text-xs font-mono text-[#121212]">{fmtDate(selected.dateTo)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Submitted</div>
                                        <div className="text-xs font-mono text-[#121212]">{fmtDateTime(selected.createdAt)}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212]">Reason</h3>
                                <p className="text-xs font-light text-[#8A817C] leading-relaxed">{selected.reason}</p>
                            </div>

                            {selected.status === "PENDING" && (
                                <div className="pt-4 border-t border-[#121212]/5 space-y-3">
                                    <DismissibleError message={actionError} />
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleAction("APPROVED")}
                                            disabled={isSubmitting}
                                            className="flex-1 h-10 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {isSubmitting ? "Saving…" : "Approve"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleAction("REJECTED")}
                                            disabled={isSubmitting}
                                            className="flex-1 h-10 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                            {isSubmitting ? "Saving…" : "Reject"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {!panelOpen && requests.length > 0 && (
                    <div className="lg:col-span-12 flex items-center justify-center gap-2 text-xs text-[#8A817C] font-light py-2">
                        <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
                        Click any row to view leave details
                    </div>
                )}
            </div>
        </div>
    );
}

export default withAuth(LeavePage, { requiredPermission: "leave:read" });
