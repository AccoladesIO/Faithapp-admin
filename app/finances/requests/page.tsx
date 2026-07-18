"use client";

import React, { useState, useEffect, useCallback } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { useToast } from "@/context/toast-context";
import {
    Search,
    X,
    ExternalLink,
    CheckCircle2,
    XCircle,
    Plus,
    Eye,
    Filter,
    RefreshCw,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { DismissibleError } from "@/components/ui/dismissible-error";
import { formatCurrency } from "@/utils/currency";
import {
    useFinanceRequests,
    FinanceRequest,
    FinanceRequestStatus,
} from "@/hooks/use-finance-request";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });


const fullName = (m: { firstname: string; lastname: string }) =>
    [m.firstname, m.lastname].filter(Boolean).join(" ");

type Tab = "requests" | "categories";

const STATUS_OPTIONS: { value: FinanceRequestStatus | ""; label: string }[] = [
    { value: "", label: "All" },
    { value: "PENDING", label: "Pending" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
];

function StatusBadge({ status }: { status: FinanceRequestStatus }) {
    const map: Record<FinanceRequestStatus, string> = {
        PENDING:  "bg-amber-50 border-amber-200 text-amber-700",
        APPROVED: "bg-green-50 border-green-200 text-green-700",
        REJECTED: "bg-red-50 border-red-200 text-red-600",
    };
    return (
        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${map[status]}`}>
            {status}
        </span>
    );
}

function SkeletonRow({ cols }: { cols: number }) {
    return (
        <tr className="border-b border-[#121212]/5 animate-pulse">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="p-4"><div className="h-3 bg-[#F4F1EA] rounded w-3/4" /></td>
            ))}
        </tr>
    );
}

function reviewActionLabel(status: FinanceRequestStatus): string {
    if (status === "APPROVED") return "Approved";
    if (status === "REJECTED") return "Rejected";
    return "Reviewed";
}

// ─── Request detail side panel ────────────────────────────────────────────────

interface DetailPanelProps {
    request: FinanceRequest;
    isSubmitting: boolean;
    onClose: () => void;
    onApprove: (id: string) => Promise<void>;
    onReject: (id: string, reason: string) => Promise<void>;
}

function DetailPanel({ request, isSubmitting, onClose, onApprove, onReject }: DetailPanelProps) {
    const [rejectMode, setRejectMode] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);
    const { success, error: toastError } = useToast();

    useEffect(() => {
        setRejectMode(false);
        setRejectionReason("");
        setLocalError(null);
    }, [request.id]);

    const handleApprove = async () => {
        setLocalError(null);
        try {
            await onApprove(request.id);
            success(`Request from ${fullName(request.requestedBy)} approved.`);
            onClose();
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.message || "Failed to approve.";
            setLocalError(msg);
            toastError(msg);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) { setLocalError("Please provide a rejection reason."); return; }
        setLocalError(null);
        try {
            await onReject(request.id, rejectionReason.trim());
            toastError(`Request from ${fullName(request.requestedBy)} rejected.`);
            onClose();
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.message || "Failed to reject.";
            setLocalError(msg);
            toastError(msg);
        }
    };

    return (
        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#121212]/5">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">Finance Request</p>
                        <h2 className="text-sm font-light text-[#121212] truncate">{fullName(request.requestedBy)}</h2>
                    </div>
                    <StatusBadge status={request.status} />
                </div>
                <button onClick={onClose} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 rounded-md transition-colors shrink-0">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                <section className="space-y-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Request Info</h3>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <div>
                            <dt className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Requested by</dt>
                            <dd className="text-sm font-light text-[#121212]">{fullName(request.requestedBy)}</dd>
                            <dd className="text-xs text-[#8A817C] font-mono">{request.requestedBy.email}</dd>
                        </div>
                        <div>
                            <dt className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Department</dt>
                            <dd className="text-sm font-light text-[#121212]">{request.department.name}</dd>
                        </div>
                        <div>
                            <dt className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Category</dt>
                            <dd className="text-sm font-light text-[#121212]">{request.category.name}</dd>
                        </div>
                        <div>
                            <dt className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Amount</dt>
                            <dd className="text-base font-light text-[#121212]">{formatCurrency(request.amount)}</dd>
                        </div>
                        <div className="col-span-2">
                            <dt className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Reason</dt>
                            <dd className="text-sm font-light text-[#121212] leading-relaxed">{request.reason}</dd>
                        </div>
                        <div>
                            <dt className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Submitted</dt>
                            <dd className="text-sm font-light text-[#121212]">{fmtDate(request.createdAt)}</dd>
                        </div>
                        {request.reviewedAt && (
                            <div>
                                <dt className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">
                                    {reviewActionLabel(request.status)}
                                </dt>
                                <dd className="text-sm font-light text-[#121212]">
                                    {request.reviewedBy?.member
                                        ? `${request.reviewedBy.member.firstname} ${request.reviewedBy.member.lastname}`
                                        : "Admin"}
                                    <span className="text-[#8A817C]"> · </span>
                                    {fmtDate(request.reviewedAt)}
                                </dd>
                            </div>
                        )}
                    </dl>
                </section>

                <section className="space-y-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Bank Details</h3>
                    <dl className="grid grid-cols-1 gap-y-3">
                        <div>
                            <dt className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Bank</dt>
                            <dd className="text-sm font-light text-[#121212]">{request.recipientBankName}</dd>
                        </div>
                        <div>
                            <dt className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Account name</dt>
                            <dd className="text-sm font-light text-[#121212]">{request.recipientAccountName}</dd>
                        </div>
                        <div>
                            <dt className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Account number</dt>
                            <dd className="text-sm font-light text-[#121212] font-mono tracking-wider">{request.recipientAccountNumber}</dd>
                        </div>
                    </dl>
                </section>

                {request.attachmentUrl && (
                    <section className="space-y-2">
                        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Attachment</h3>
                        <a href={request.attachmentUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-[#121212] hover:text-[#8A817C] underline transition-colors">
                            View attachment <ExternalLink className="w-3 h-3" />
                        </a>
                    </section>
                )}

                {request.rejectionReason && (
                    <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm font-light text-red-700">
                        <span className="font-semibold">Rejection reason: </span>
                        {request.rejectionReason}
                    </div>
                )}

                {localError && (
                    <p className="text-xs font-light text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
                        {localError}
                    </p>
                )}
            </div>

            {/* Action footer — PENDING only */}
            {request.status === "PENDING" && (
                <div className="px-5 py-4 border-t border-[#121212]/5">
                    {rejectMode ? (
                        <div className="space-y-3">
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">
                                Rejection reason <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                className="w-full px-3 py-2 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                                rows={3}
                                placeholder="Explain why this request is being rejected…"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <button onClick={handleReject} disabled={isSubmitting}
                                    className="flex-1 flex items-center justify-center gap-1.5 h-9 px-4 bg-red-600 text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                                    {isSubmitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                                    <XCircle className="w-3.5 h-3.5" />
                                    {isSubmitting ? "Rejecting…" : "Confirm Reject"}
                                </button>
                                <button onClick={() => { setRejectMode(false); setLocalError(null); }}
                                    className="h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button onClick={handleApprove} disabled={isSubmitting}
                                className="flex-1 flex items-center justify-center gap-1.5 h-9 px-4 bg-green-600 text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                                {isSubmitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {isSubmitting ? "Approving…" : "Approve"}
                            </button>
                            <button onClick={() => setRejectMode(true)} disabled={isSubmitting}
                                className="flex-1 flex items-center justify-center gap-1.5 h-9 px-4 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors">
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Add category panel ────────────────────────────────────────────────────────

interface AddCategoryPanelProps {
    isSubmitting: boolean;
    onClose: () => void;
    onSave: (dto: { name: string; description?: string }) => Promise<void>;
}

function AddCategoryPanel({ isSubmitting, onClose, onSave }: AddCategoryPanelProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);
    const { success } = useToast();

    const handleSave = async () => {
        if (!name.trim()) { setLocalError("Category name is required."); return; }
        setLocalError(null);
        try {
            await onSave({ name: name.trim(), description: description.trim() || undefined });
            success(`Category "${name.trim()}" created.`);
            onClose();
        } catch (err: unknown) {
            const e = err as ApiError;
            setLocalError(e?.message || "Failed to create category.");
        }
    };

    return (
        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#121212]/5">
                <h2 className="text-sm font-light text-[#121212]">Add Category</h2>
                <button onClick={onClose} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div className="p-5 space-y-4">
                <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                        Name <span className="text-red-500">*</span>
                    </label>
                    <input type="text"
                        className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                        placeholder="e.g. Equipment Purchase"
                        value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                        Description <span className="text-[#8A817C] font-normal normal-case tracking-normal">(optional)</span>
                    </label>
                    <textarea
                        className="w-full px-3 py-2 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                        rows={2} placeholder="Brief description of this category"
                        value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <DismissibleError message={localError} />
                <div className="flex gap-2 pt-1">
                    <button onClick={handleSave} disabled={isSubmitting}
                        className="flex-1 flex items-center gap-2 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-50 transition-colors justify-center">
                        {isSubmitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                        {isSubmitting ? "Saving…" : "Save Category"}
                    </button>
                    <button onClick={onClose} className="h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function FinanceRequestsPage() {
    const [activeTab, setActiveTab] = useState<Tab>("requests");
    const [statusFilter, setStatusFilter] = useState<FinanceRequestStatus | "">("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [search, setSearch] = useState("");
    const [selectedRequest, setSelectedRequest] = useState<FinanceRequest | null>(null);
    const [showAddCategory, setShowAddCategory] = useState(false);

    const {
        requests, pagination, categories,
        isLoading, isSubmitting, error,
        fetchRequests, approveRequest, rejectRequest,
        fetchCategories, createCategory, goToPage,
    } = useFinanceRequests(15);

    useEffect(() => {
        fetchRequests({ page: 1 });
        fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleApplyFilters = useCallback(() => {
        fetchRequests({
            page: 1,
            status: statusFilter || undefined,
            categoryId: categoryFilter || undefined,
            search: search.trim() || undefined,
        });
    }, [statusFilter, categoryFilter, search, fetchRequests]);

    const handleApprove = async (id: string) => {
        await approveRequest(id);
        setSelectedRequest((prev) => prev?.id === id ? { ...prev, status: "APPROVED" } : prev);
    };

    const handleReject = async (id: string, reason: string) => {
        const updated = await rejectRequest(id, reason);
        setSelectedRequest((prev) => prev?.id === id ? updated : prev);
    };

    const panelOpen = selectedRequest !== null;
    const tabCls = (t: Tab) =>
        `px-4 py-2 text-[11px] font-semibold uppercase tracking-widest transition-colors rounded-lg ${activeTab === t ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`;

    return (
        <div className="space-y-8 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Finance Requests</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Review and manage fund requests from departments
                    </p>
                </div>
            </div>

            <div className="flex gap-1">
                <button className={tabCls("requests")} onClick={() => setActiveTab("requests")}>Requests</button>
                <button className={tabCls("categories")} onClick={() => setActiveTab("categories")}>Categories</button>
            </div>

            <DismissibleError message={error} />

            {/* ── Requests tab ── */}
            {activeTab === "requests" && (
                <div className="space-y-5">
                    {/* Filters */}
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 p-5 rounded-xl">
                        <div className="flex flex-wrap items-end gap-3">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Status</label>
                                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as FinanceRequestStatus | "")}
                                    className="h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none">
                                    {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Category</label>
                                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none">
                                    <option value="">All categories</option>
                                    {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[180px]">
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Search</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8A817C]" />
                                    <input type="text" placeholder="Search requests…" value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                                        className="w-full h-9 pl-9 pr-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg" />
                                </div>
                            </div>
                            <button onClick={handleApplyFilters}
                                className="flex items-center gap-2 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors">
                                <Filter className="w-3.5 h-3.5" /> Apply
                            </button>
                        </div>
                    </div>

                    {/* Split-panel grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        {/* Table */}
                        <div className={`${panelOpen ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden`}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Requester</th>
                                            {!panelOpen && <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Department</th>}
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Category</th>
                                            {!panelOpen && <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] hidden md:table-cell">Reason</th>}
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Amount</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Status</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] hidden sm:table-cell">Date</th>
                                            <th className="p-4 w-10" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading
                                            ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={panelOpen ? 6 : 8} />)
                                            : requests.length === 0
                                            ? <tr><td colSpan={8} className="p-12 text-center text-xs text-[#8A817C] font-light">No requests found.</td></tr>
                                            : requests.map((req) => (
                                                <tr key={req.id}
                                                    onClick={() => setSelectedRequest(selectedRequest?.id === req.id ? null : req)}
                                                    className={`border-b border-[#121212]/5 cursor-pointer transition-colors ${selectedRequest?.id === req.id ? "bg-[#F4F1EA]/60" : "hover:bg-[#F4F1EA]/20"}`}>
                                                    <td className="p-4">
                                                        <div className="text-sm font-light text-[#121212]">{fullName(req.requestedBy)}</div>
                                                        <div className="text-xs text-[#8A817C] font-mono">{req.requestedBy.email}</div>
                                                    </td>
                                                    {!panelOpen && <td className="p-4 text-sm text-[#121212] font-light">{req.department.name}</td>}
                                                    <td className="p-4 text-sm text-[#121212] font-light">{req.category.name}</td>
                                                    {!panelOpen && <td className="p-4 text-sm text-[#8A817C] font-light max-w-[160px] truncate hidden md:table-cell" title={req.reason}>{req.reason}</td>}
                                                    <td className="p-4 text-sm text-[#121212] font-light whitespace-nowrap">{formatCurrency(req.amount)}</td>
                                                    <td className="p-4"><StatusBadge status={req.status} /></td>
                                                    <td className="p-4 text-sm text-[#8A817C] font-light whitespace-nowrap hidden sm:table-cell">{fmtDate(req.createdAt)}</td>
                                                    <td className="p-4">
                                                        <Eye className={`w-3.5 h-3.5 ${selectedRequest?.id === req.id ? "text-[#121212]" : "text-[#8A817C]/40"}`} />
                                                    </td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>
                            </div>
                            <PaginationBar
                                pagination={pagination}
                                onPage={goToPage}
                                label="requests"
                            />
                        </div>

                        {/* Detail panel */}
                        {selectedRequest && (
                            <DetailPanel
                                key={selectedRequest.id}
                                request={selectedRequest}
                                isSubmitting={isSubmitting}
                                onClose={() => setSelectedRequest(null)}
                                onApprove={handleApprove}
                                onReject={handleReject}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* ── Categories tab ── */}
            {activeTab === "categories" && (
                <div className="space-y-5">
                    <div className="flex justify-end">
                        <button onClick={() => setShowAddCategory(true)}
                            className="flex items-center gap-2 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors">
                            <Plus className="w-3.5 h-3.5" /> Add Category
                        </button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        <div className={`${showAddCategory ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden transition-all`}>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Name</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.length === 0
                                        ? <tr><td colSpan={2} className="p-12 text-center text-xs text-[#8A817C] font-light">No categories yet. Add one above.</td></tr>
                                        : categories.map((cat) => (
                                            <tr key={cat.id} className="border-b border-[#121212]/5 hover:bg-[#F4F1EA]/20 transition-colors">
                                                <td className="p-4 text-sm text-[#121212] font-light">{cat.name}</td>
                                                <td className="p-4 text-sm text-[#8A817C] font-light">{cat.description ?? "—"}</td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>

                        {showAddCategory && (
                            <AddCategoryPanel
                                isSubmitting={isSubmitting}
                                onClose={() => setShowAddCategory(false)}
                                onSave={handleCreateCategory}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    async function handleCreateCategory(dto: { name: string; description?: string }) {
        await createCategory(dto);
    }
}

export default withAuth(FinanceRequestsPage, { requiredPermission: 'finance:approve' });
