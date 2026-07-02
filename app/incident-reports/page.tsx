"use client";

import React, { useEffect, useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    AlertTriangle,
    SlidersHorizontal,
    RefreshCw,
    X,
    MousePointerClick,
    CheckCircle2,
    Clock,
    AlertCircle,
} from "lucide-react";
import {
    useIncidentReports,
    IncidentReport,
    IncidentReportFilters,
    IncidentStatus,
    UpdateStatusPayload,
} from "@/hooks/use-incident-reports";
import { useAuth } from "@/context/auth-context";
import { DismissibleError } from "@/components/ui/dismissible-error";
import { PaginationBar } from "@/components/ui/pagination-bar";

const SKELETON_ROWS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const SKELETON_COLS = ["ti", "re", "st", "dt"] as const;

function fmtDateTime(iso: string): string {
    return new Date(iso).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function StatusBadge({ status }: Readonly<{ status: IncidentStatus }>) {
    if (status === "OPEN") {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700">
                <AlertCircle className="w-2.5 h-2.5" />
                Open
            </span>
        );
    }
    if (status === "IN_PROGRESS") {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700">
                <Clock className="w-2.5 h-2.5" />
                In Progress
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-green-50 text-green-700">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Resolved
        </span>
    );
}

function reporterLabel(report: IncidentReport): string {
    if (report.isAnonymous || !report.reporter) return "Anonymous";
    return `${report.reporter.firstname} ${report.reporter.lastname}`;
}

const IncidentReportsPage = withAuth(() => {
    const { reports, pagination, isLoading, isUpdating, error, fetchReports, applyFilters, goToPage, updateStatus } =
        useIncidentReports(20);
    const { hasPermission } = useAuth();
    const canWrite = hasPermission("incident_report:write");

    const [draftFilters, setDraftFilters] = useState<IncidentReportFilters>({ status: "", dateFrom: "", dateTo: "" });
    const [showFilters, setShowFilters] = useState(false);
    const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);

    const [updateDraft, setUpdateDraft] = useState<{ status: IncidentStatus; adminNotes: string }>({
        status: "OPEN",
        adminNotes: "",
    });
    const [updateSuccess, setUpdateSuccess] = useState(false);

    useEffect(() => { fetchReports(1, {}); }, [fetchReports]);

    useEffect(() => {
        if (selectedReport) {
            setUpdateDraft({
                status: selectedReport.status,
                adminNotes: selectedReport.adminNotes ?? "",
            });
            setUpdateSuccess(false);
        }
    }, [selectedReport]);

    function handleApply() {
        const active: IncidentReportFilters = {};
        if (draftFilters.status) active.status = draftFilters.status;
        if (draftFilters.dateFrom) active.dateFrom = draftFilters.dateFrom;
        if (draftFilters.dateTo) active.dateTo = draftFilters.dateTo;
        applyFilters(active);
    }

    function handleClear() {
        setDraftFilters({ status: "", dateFrom: "", dateTo: "" });
        applyFilters({});
    }

    async function handleUpdateStatus() {
        if (!selectedReport) return;
        const payload: UpdateStatusPayload = { status: updateDraft.status };
        if (updateDraft.adminNotes.trim()) payload.adminNotes = updateDraft.adminNotes.trim();
        const ok = await updateStatus(selectedReport.id, payload);
        if (ok) {
            setSelectedReport((prev) =>
                prev ? { ...prev, status: updateDraft.status, adminNotes: updateDraft.adminNotes || prev.adminNotes } : null
            );
            setUpdateSuccess(true);
            setTimeout(() => setUpdateSuccess(false), 3000);
        }
    }

    const hasActiveFilters = !!(draftFilters.status || draftFilters.dateFrom || draftFilters.dateTo);

    return (
        <div className="space-y-6 font-sans">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Incident Reports</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Member-submitted reports
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchReports(1, {})}
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="f-status" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Status</label>
                            <select
                                id="f-status"
                                value={draftFilters.status ?? ""}
                                onChange={(e) => setDraftFilters((p) => ({ ...p, status: e.target.value as IncidentStatus | "" }))}
                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg"
                            >
                                <option value="">All statuses</option>
                                <option value="OPEN">Open</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="RESOLVED">Resolved</option>
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
                            <button
                                onClick={handleClear}
                                className="h-9 px-4 border border-[#121212]/10 text-xs font-semibold uppercase tracking-wider text-[#8A817C] rounded-lg hover:bg-[#F4F1EA]/50"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}

            <DismissibleError message={error} />

            {/* Table + detail panel */}
            <div className="grid grid-cols-12 gap-4">
                <div className={selectedReport ? "col-span-12 lg:col-span-7" : "col-span-12"}>
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-[#121212]/5">
                                    <th className="text-left px-4 py-3 text-[11px] text-[#8A817C] font-semibold uppercase tracking-wider">Title</th>
                                    <th className="text-left px-4 py-3 text-[11px] text-[#8A817C] font-semibold uppercase tracking-wider hidden sm:table-cell">Reporter</th>
                                    <th className="text-left px-4 py-3 text-[11px] text-[#8A817C] font-semibold uppercase tracking-wider">Status</th>
                                    <th className="text-left px-4 py-3 text-[11px] text-[#8A817C] font-semibold uppercase tracking-wider hidden md:table-cell">Date</th>
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
                                {!isLoading && reports.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-16 text-center text-[#8A817C] font-light">
                                            <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-[#8A817C]/30" />
                                            No incident reports found for the selected filters.
                                        </td>
                                    </tr>
                                )}
                                {!isLoading && reports.map((report) => (
                                    <tr
                                        key={report.id}
                                        onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
                                        className={`border-b border-[#121212]/5 last:border-0 cursor-pointer transition-colors hover:bg-[#F4F1EA]/20 ${selectedReport?.id === report.id ? "bg-[#F4F1EA]/30" : ""}`}
                                    >
                                        <td className="px-4 py-3 text-sm font-medium text-[#121212] truncate max-w-[200px]">{report.title}</td>
                                        <td className="px-4 py-3 text-[#8A817C] font-light hidden sm:table-cell">
                                            {reporterLabel(report)}
                                        </td>
                                        <td className="px-4 py-3"><StatusBadge status={report.status} /></td>
                                        <td className="px-4 py-3 font-mono text-[#8A817C] whitespace-nowrap hidden md:table-cell">{fmtDateTime(report.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {pagination && pagination.totalPages > 1 && (
                        <div className="mt-4">
                            <PaginationBar pagination={pagination} onPage={goToPage} isLoading={isLoading} label="reports" />
                        </div>
                    )}

                    {!selectedReport && reports.length > 0 && (
                        <div className="flex items-center justify-center gap-2 text-xs text-[#8A817C] font-light py-2">
                            <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
                            Click any row to view details
                        </div>
                    )}
                </div>

                {/* Detail panel */}
                {selectedReport && (
                    <div className="col-span-12 lg:col-span-5">
                        <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 space-y-4 sticky top-4">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#F4F1EA] text-[#8A817C] mb-1">Incident Report</span>
                                    <h2 className="text-lg font-light tracking-tight text-[#121212] leading-snug">
                                        {selectedReport.title}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedReport(null)}
                                    className="absolute top-4 right-4 text-[#8A817C] hover:text-[#121212] transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div className="flex gap-4">
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Status</p>
                                        <StatusBadge status={selectedReport.status} />
                                    </div>
                                    {selectedReport.resolvedAt && (
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Resolved at</p>
                                            <p className="font-mono text-[#121212]">{fmtDateTime(selectedReport.resolvedAt)}</p>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Reporter</p>
                                    {selectedReport.isAnonymous || !selectedReport.reporter ? (
                                        <p className="text-[#8A817C] italic">Anonymous</p>
                                    ) : (
                                        <>
                                            <p className="text-[#121212] font-medium">
                                                {selectedReport.reporter.firstname} {selectedReport.reporter.lastname}
                                            </p>
                                            <p className="text-[#8A817C] font-mono">{selectedReport.reporter.email}</p>
                                        </>
                                    )}
                                </div>

                                {selectedReport.location && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Location</p>
                                        <p className="text-[#121212] font-light">{selectedReport.location}</p>
                                    </div>
                                )}

                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Submitted</p>
                                    <p className="font-mono text-[#121212]">{fmtDateTime(selectedReport.createdAt)}</p>
                                </div>

                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Description</p>
                                    <p className="text-[#121212] font-light leading-relaxed whitespace-pre-wrap">{selectedReport.description}</p>
                                </div>

                                {selectedReport.images && selectedReport.images.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">
                                            Images ({selectedReport.images.length})
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedReport.images.map((url, i) => (
                                                <a
                                                    key={url}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] font-mono text-blue-600 underline underline-offset-2"
                                                >
                                                    Image {i + 1}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedReport.adminNotes && !canWrite && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Admin Notes</p>
                                        <p className="text-[#121212] font-light leading-relaxed">{selectedReport.adminNotes}</p>
                                    </div>
                                )}

                                {/* Update form — write permission only */}
                                {canWrite && (
                                    <div className="border-t border-[#121212]/5 pt-4 space-y-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">Update</p>

                                        <div>
                                            <label htmlFor="u-status" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Status</label>
                                            <select
                                                id="u-status"
                                                value={updateDraft.status}
                                                onChange={(e) => setUpdateDraft((p) => ({ ...p, status: e.target.value as IncidentStatus }))}
                                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg"
                                            >
                                                <option value="OPEN">Open</option>
                                                <option value="IN_PROGRESS">In Progress</option>
                                                <option value="RESOLVED">Resolved</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="u-notes" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Admin Notes</label>
                                            <textarea
                                                id="u-notes"
                                                rows={3}
                                                value={updateDraft.adminNotes}
                                                onChange={(e) => setUpdateDraft((p) => ({ ...p, adminNotes: e.target.value }))}
                                                placeholder="Add internal notes..."
                                                className="w-full px-3 py-2 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] placeholder:text-[#8A817C]/60 focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleUpdateStatus}
                                                disabled={isUpdating}
                                                className="h-9 px-5 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors disabled:opacity-40"
                                            >
                                                {isUpdating ? "Saving…" : "Save"}
                                            </button>
                                            {updateSuccess && (
                                                <span className="text-xs text-green-600 font-semibold">
                                                    <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                                                    Saved
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}, { requiredPermission: "incident_report:read" });

export default IncidentReportsPage;
