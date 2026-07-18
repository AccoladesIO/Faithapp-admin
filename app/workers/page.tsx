"use client";

import React, { useState, useMemo } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { useRouter } from "next/navigation";
import {
    Search, SlidersHorizontal,
    ArrowUpDown, Eye, X, RefreshCw, CheckCircle2,
    UserMinus, Pencil, Phone, Mail,
    Calendar, Check, Building2,
} from "lucide-react";
import { useWorkers, Worker, WorkerDepartment, UpdateWorkerProfilePayload } from "@/hooks/use-workers";
import { useDepartments } from "@/hooks/use-departments";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { DismissibleError } from "@/components/ui/dismissible-error";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fullName = (w: Worker) =>
    [w.firstname, w.lastname].filter(Boolean).join(" ") || w.email;

const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatYear = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).getFullYear().toString();
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
    return (
        <tr className="border-b border-[#121212]/5 animate-pulse">
            <td className="p-4">
                <div className="h-3.5 bg-[#F4F1EA] rounded w-32 mb-2" />
                <div className="h-2.5 bg-[#F4F1EA] rounded w-44" />
            </td>
            <td className="p-4"><div className="h-3 bg-[#F4F1EA] rounded w-24" /></td>
            <td className="p-4"><div className="h-5 bg-[#F4F1EA] rounded w-16" /></td>
            <td className="p-4 flex justify-end"><div className="h-8 w-8 bg-[#F4F1EA] rounded-lg" /></td>
        </tr>
    );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function WorkerStatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        ACTIVE: "bg-green-50 border-green-100 text-green-700",
        INACTIVE: "bg-red-50 border-red-100 text-red-600",
        SUSPENDED: "bg-orange-50 border-orange-100 text-orange-700",
        ON_LEAVE: "bg-yellow-50 border-yellow-100 text-yellow-700",
    };
    return (
        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${map[status] ?? "bg-[#F4F1EA] border-[#121212]/5 text-[#8A817C]"}`}>
            {status.replace("_", " ")}
        </span>
    );
}

// ─── Bool badge ───────────────────────────────────────────────────────────────

function BoolBadge({ value, label }: { value: boolean; label: string }) {
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${value
                ? "bg-green-50 border-green-100 text-green-700"
                : "bg-[#F4F1EA] border-[#121212]/5 text-[#8A817C]"
            }`}>
            {value ? <CheckCircle2 className="w-2.5 h-2.5" /> : null}
            {label}
        </span>
    );
}

// ─── Detail row ───────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">
                {label}
            </span>
            <span className="text-xs font-mono text-[#121212]">{value ?? "—"}</span>
        </div>
    );
}

// ─── Confirm banner ───────────────────────────────────────────────────────────

function ConfirmBanner({
    message,
    onConfirm,
    onCancel,
    isLoading,
    confirmLabel = "Confirm",
    danger = false,
}: {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
    confirmLabel?: string;
    danger?: boolean;
}) {
    return (
        <div className="p-4 bg-[#fdfaf2] border border-dashed border-[#121212]/15 rounded-lg text-xs space-y-3">
            <p className="text-[#121212] font-light leading-relaxed">{message}</p>
            <div className="flex gap-2">
                <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className={`px-4 py-1.5 text-white text-[10px] font-bold uppercase tracking-wider rounded disabled:opacity-50 flex items-center gap-1.5 ${danger ? "bg-red-600 hover:bg-red-700" : "bg-[#121212] hover:bg-[#121212]/90"
                        }`}
                >
                    {isLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                    {confirmLabel}
                </button>
                <button
                    onClick={onCancel}
                    disabled={isLoading}
                    className="px-4 py-1.5 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded hover:text-[#121212] disabled:opacity-50"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

// ─── Profile edit form ────────────────────────────────────────────────────────

const WORKER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "ON_LEAVE"] as const;

function ProfileEditForm({
    worker,
    departments,
    onSave,
    onCancel,
    isSubmitting,
}: {
    worker: Worker;
    departments: { id: string; name: string }[];
    onSave: (payload: UpdateWorkerProfilePayload) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}) {
    const [form, setForm] = useState<UpdateWorkerProfilePayload>({
        departmentId: (worker.workerProfile?.department as WorkerDepartment)?.id ?? "",
        status: worker.workerProfile?.status ?? "ACTIVE",
        profession: worker.workerProfile?.profession ?? "",
        yearJoinedWorkforce: worker.workerProfile?.yearJoinedWorkforce
            ? new Date(worker.workerProfile.yearJoinedWorkforce).getFullYear().toString()
            : "",
        completedSOD: worker.workerProfile?.completedSOD ?? false,
        completedBibleCollege: worker.workerProfile?.completedBibleCollege ?? false,
        secondaryDepartmentId: worker.workerProfile?.secondaryDepartment?.id ?? null,
    });

    return (
        <div className="space-y-4 p-4 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">
                Edit Worker Profile
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* Status */}
                <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">
                        Status
                    </label>
                    <select
                        value={form.status}
                        onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as UpdateWorkerProfilePayload["status"] }))}
                        className="w-full h-9 px-2 bg-white border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                    >
                        {WORKER_STATUSES.map((s) => (
                            <option key={s} value={s}>{s.replace("_", " ")}</option>
                        ))}
                    </select>
                </div>

                {/* Profession */}
                <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">
                        Profession
                    </label>
                    <input
                        type="text"
                        value={form.profession}
                        onChange={(e) => setForm((p) => ({ ...p, profession: e.target.value }))}
                        placeholder="e.g. Accountant"
                        className="w-full h-9 px-2 bg-white border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>

                {/* Year joined */}
                <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">
                        Year Joined Workforce
                    </label>
                    <input
                        type="number"
                        min={1950}
                        max={new Date().getFullYear()}
                        value={form.yearJoinedWorkforce}
                        onChange={(e) => setForm((p) => ({ ...p, yearJoinedWorkforce: e.target.value }))}
                        placeholder="e.g. 2021"
                        className="w-full h-9 px-2 bg-white border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>

                {/* Primary dept */}
                <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">
                        Primary Department
                    </label>
                    <select
                        value={form.departmentId}
                        onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
                        className="w-full h-9 px-2 bg-white border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                    >
                        <option value="">-- Select department --</option>
                        {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </div>

                {/* Secondary dept */}
                <div className="col-span-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">
                        Secondary Department
                        <span className="normal-case font-normal text-[#8A817C]/60 ml-1">(optional)</span>
                    </label>
                    <select
                        value={form.secondaryDepartmentId ?? ""}
                        onChange={(e) =>
                            setForm((p) => ({
                                ...p,
                                secondaryDepartmentId: e.target.value === "" ? null : e.target.value,
                            }))
                        }
                        className="w-full h-9 px-2 bg-white border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                    >
                        <option value="">-- None (clear assignment) --</option>
                        {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Checkboxes */}
            <div className="flex gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={form.completedSOD ?? false}
                        onChange={(e) => setForm((p) => ({ ...p, completedSOD: e.target.checked }))}
                        className="w-4 h-4 rounded border-[#121212]/10 focus:ring-0"
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#121212]">
                        Completed SOD
                    </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={form.completedBibleCollege ?? false}
                        onChange={(e) => setForm((p) => ({ ...p, completedBibleCollege: e.target.checked }))}
                        className="w-4 h-4 rounded border-[#121212]/10 focus:ring-0"
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#121212]">
                        Completed Bible College
                    </span>
                </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
                <button
                    onClick={() => onSave(form)}
                    disabled={isSubmitting}
                    className="px-4 py-1.5 bg-[#121212] text-white text-[10px] font-bold uppercase tracking-wider rounded disabled:opacity-50 flex items-center gap-1.5"
                >
                    {isSubmitting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Save Changes
                </button>
                <button
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="px-4 py-1.5 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded hover:text-[#121212] disabled:opacity-50"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "firstname" | "status" | "createdAt";
type SortOrder = "asc" | "desc";

const STATUS_OPTIONS = ["ALL", "ACTIVE", "INACTIVE", "SUSPENDED", "ON_LEAVE"] as const;

// ─── Main page ────────────────────────────────────────────────────────────────

export default withAuth(function WorkersPage() {
    const router = useRouter();
    const {
        workers,
        pagination,
        statusFilter,
        isLoading,
        isSubmitting,
        error,
        goToPage,
        applyStatusFilter,
        refetch,
        updateWorkerProfile,
        revokeWorker,
    } = useWorkers(10);

    const { departments } = useDepartments();

    // Panel state
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [confirmRevoke, setConfirmRevoke] = useState(false);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    // Client-side search + sort (within server page)
    const [searchQuery, setSearchQuery] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("firstname");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
        else { setSortKey(key); setSortOrder("asc"); }
    };

    const selectWorker = (w: Worker) => {
        setSelectedWorker(w);
        setIsEditing(false);
        setConfirmRevoke(false);
        setActionSuccess(null);
        setActionError(null);
    };

    const processed = useMemo(() => {
        let result = [...workers];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (w) =>
                    fullName(w).toLowerCase().includes(q) ||
                    w.email.toLowerCase().includes(q) ||
                    w.id.toLowerCase().includes(q)
            );
        }
        result.sort((a, b) => {
            const valA = String(a[sortKey] ?? "").toLowerCase();
            const valB = String(b[sortKey] ?? "").toLowerCase();
            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });
        return result;
    }, [workers, searchQuery, sortKey, sortOrder]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleUpdateProfile = async (payload: UpdateWorkerProfilePayload) => {
        if (!selectedWorker) return;
        setActionError(null);
        setActionSuccess(null);
        try {
            const updated = await updateWorkerProfile(selectedWorker.id, payload);
            setSelectedWorker((prev) => prev ? { ...prev, ...updated } : prev);
            setIsEditing(false);
            setActionSuccess("Worker profile updated successfully.");
            setTimeout(() => setActionSuccess(null), 3000);
        } catch (err: unknown) {
            const e = err as ApiError;
            setActionError(e?.message ?? "Failed to update profile.");
        }
    };

    const handleRevoke = async () => {
        if (!selectedWorker) return;
        setActionError(null);
        setActionSuccess(null);
        try {
            await revokeWorker(selectedWorker.id);
            setSelectedWorker(null);
            setConfirmRevoke(false);
        } catch (err: unknown) {
            const e = err as ApiError;
            setActionError(e?.message ?? "Failed to revoke worker role.");
            setConfirmRevoke(false);
        }
    };

    const deptName = (w: Worker) => {
        const dept = w.workerProfile?.department as WorkerDepartment | undefined;
        return dept?.name ?? "—";
    };

    return (
        <div className="space-y-10 font-sans">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                        Ministry Workers
                    </h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        View worker roles, department assignments, and training progress
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {pagination && (
                        <span className="text-[10px] font-mono text-[#8A817C] border border-[#121212]/10 px-3 py-1.5 rounded-lg">
                            {pagination.totalCount} workers
                        </span>
                    )}
                    <button
                        onClick={() => router.push("/workers/bulk-department")}
                        className="flex items-center gap-1.5 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors"
                    >
                        <Building2 className="w-3.5 h-3.5" />
                        Bulk Assign
                    </button>
                    <button
                        onClick={refetch}
                        disabled={isLoading}
                        className="p-2 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-40"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            <DismissibleError message={error} />

            {/* Filters */}
            <div className="flex flex-col xl:flex-row gap-6 items-center justify-between bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                <div className="w-full xl:max-w-md relative">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8A817C]" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 pl-11 pr-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>

                <div className="flex items-center gap-2 w-full xl:w-auto">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#8A817C] shrink-0" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] shrink-0">
                        Status:
                    </span>
                    <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl flex-wrap gap-1">
                        {STATUS_OPTIONS.map((s) => (
                            <button
                                key={s}
                                onClick={() => applyStatusFilter(s)}
                                disabled={isLoading}
                                className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-40 ${statusFilter === s
                                        ? "bg-[#121212] text-white"
                                        : "text-[#8A817C] hover:text-[#121212]"
                                    }`}
                            >
                                {s.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table + detail */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Table */}
                <div className={`${selectedWorker ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col transition-all`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    <th
                                        onClick={() => handleSort("firstname")}
                                        className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212] select-none"
                                    >
                                        <div className="flex items-center space-x-1.5">
                                            <span>Worker</span>
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">
                                        Department
                                    </th>
                                    <th
                                        onClick={() => handleSort("status")}
                                        className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212] select-none"
                                    >
                                        <div className="flex items-center space-x-1.5">
                                            <span>Status</span>
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] text-right">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                {isLoading ? (
                                    Array.from({ length: 10 }).map((_, i) => (
                                        <SkeletonRow key={i} />
                                    ))
                                ) : processed.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center">
                                            <TableEmptyState
                                                title={
                                                    workers.length === 0
                                                        ? "No workers assigned yet."
                                                        : "No workers match the current search or filters."
                                                }
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    processed.map((worker) => (
                                        <tr
                                            key={worker.id}
                                            onClick={() => selectWorker(worker)}
                                            className={`transition-colors cursor-pointer ${selectedWorker?.id === worker.id
                                                    ? "bg-[#F4F1EA]/50"
                                                    : "hover:bg-[#F4F1EA]/10"
                                                }`}
                                        >
                                            <td className="p-4">
                                                <div className="text-sm font-medium text-[#121212]">
                                                    {fullName(worker)}
                                                </div>
                                                <div className="text-xs text-[#8A817C] font-mono mt-0.5 truncate max-w-[200px]">
                                                    {worker.email}
                                                </div>
                                            </td>
                                            <td className="p-4 text-xs font-light text-[#121212]">
                                                {deptName(worker)}
                                            </td>
                                            <td className="p-4">
                                                <WorkerStatusBadge
                                                    status={worker.workerProfile?.status ?? worker.status}
                                                />
                                            </td>
                                            <td
                                                className="p-4 text-right"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <button
                                                    onClick={() => selectWorker(worker)}
                                                    className="p-2 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 hover:border-[#121212] rounded-lg transition-colors"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <PaginationBar
                        pagination={pagination}
                        onPage={goToPage}
                        isLoading={isLoading}
                        label="workers"
                    />
                </div>

                {/* Detail panel */}
                {selectedWorker && (
                    <div className="lg:col-span-5">
                        <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl space-y-6 relative">
                            <button
                                onClick={() => setSelectedWorker(null)}
                                className="absolute top-6 right-6 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Name */}
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">
                                    Worker Profile
                                </div>
                                <h2 className="text-xl font-light tracking-tight text-[#121212] pr-8">
                                    {fullName(selectedWorker)}
                                </h2>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <WorkerStatusBadge
                                        status={selectedWorker.workerProfile?.status ?? selectedWorker.status}
                                    />
                                    {selectedWorker.workerProfile?.completedSOD && (
                                        <BoolBadge value={true} label="SOD" />
                                    )}
                                    {selectedWorker.workerProfile?.completedBibleCollege && (
                                        <BoolBadge value={true} label="Bible College" />
                                    )}
                                </div>
                            </div>

                            {/* Contact */}
                            <div className="space-y-2 border-y border-[#121212]/5 py-4">
                                <div className="flex items-center gap-2 text-xs text-[#121212]">
                                    <Mail className="w-3.5 h-3.5 text-[#8A817C] shrink-0" />
                                    <span className="font-mono truncate">{selectedWorker.email}</span>
                                </div>
                                {selectedWorker.phoneNumber && (
                                    <div className="flex items-center gap-2 text-xs text-[#121212]">
                                        <Phone className="w-3.5 h-3.5 text-[#8A817C] shrink-0" />
                                        <span className="font-mono">{selectedWorker.phoneNumber}</span>
                                    </div>
                                )}
                                {selectedWorker.dateJoinedChurch && (
                                    <div className="flex items-center gap-2 text-xs text-[#121212]">
                                        <Calendar className="w-3.5 h-3.5 text-[#8A817C] shrink-0" />
                                        <span className="font-mono">Joined: {formatDate(selectedWorker.dateJoinedChurch)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Worker profile details */}
                            {!isEditing && (
                                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                    <DetailRow
                                        label="Profession"
                                        value={selectedWorker.workerProfile?.profession}
                                    />
                                    <DetailRow
                                        label="Year Joined Workforce"
                                        value={formatYear(selectedWorker.workerProfile?.yearJoinedWorkforce ?? null)}
                                    />
                                    <DetailRow
                                        label="Primary Department"
                                        value={deptName(selectedWorker)}
                                    />
                                    <DetailRow
                                        label="Secondary Department"
                                        value={
                                            selectedWorker.workerProfile?.secondaryDepartment?.name ?? "—"
                                        }
                                    />
                                    <DetailRow
                                        label="Completed SOD"
                                        value={
                                            <BoolBadge
                                                value={selectedWorker.workerProfile?.completedSOD ?? false}
                                                label={selectedWorker.workerProfile?.completedSOD ? "Yes" : "No"}
                                            />
                                        }
                                    />
                                    <DetailRow
                                        label="Bible College"
                                        value={
                                            <BoolBadge
                                                value={selectedWorker.workerProfile?.completedBibleCollege ?? false}
                                                label={selectedWorker.workerProfile?.completedBibleCollege ? "Yes" : "No"}
                                            />
                                        }
                                    />
                                    <DetailRow
                                        label="Account Created"
                                        value={formatDate(selectedWorker.createdAt)}
                                    />
                                    <DetailRow
                                        label="Last Updated"
                                        value={formatDate(selectedWorker.updatedAt)}
                                    />
                                </div>
                            )}

                            {/* Edit form */}
                            {isEditing && (
                                <ProfileEditForm
                                    worker={selectedWorker}
                                    departments={departments}
                                    onSave={handleUpdateProfile}
                                    onCancel={() => setIsEditing(false)}
                                    isSubmitting={isSubmitting}
                                />
                            )}

                            {/* Feedback */}
                            {actionSuccess && (
                                <div className="flex items-start gap-2.5 p-4 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700">
                                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{actionSuccess}</span>
                                </div>
                            )}
                            <DismissibleError message={actionError} />

                            {/* Revoke confirm */}
                            {confirmRevoke && (
                                <ConfirmBanner
                                    message={`Revoke the worker role from ${fullName(selectedWorker)}? They will revert to a standard member. This cannot be undone.`}
                                    onConfirm={handleRevoke}
                                    onCancel={() => setConfirmRevoke(false)}
                                    isLoading={isSubmitting}
                                    confirmLabel="Revoke Role"
                                    danger
                                />
                            )}

                            {/* Action buttons */}
                            {!isEditing && !confirmRevoke && (
                                <div className="space-y-3 pt-2">
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        disabled={isSubmitting}
                                        className="w-full h-11 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors flex items-center justify-center space-x-2 rounded-xl disabled:opacity-50"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                        <span>Edit Worker Profile</span>
                                    </button>

                                    <button
                                        onClick={() => setConfirmRevoke(true)}
                                        disabled={isSubmitting}
                                        className="w-full h-11 border border-red-200 text-red-600 text-xs font-semibold uppercase tracking-widest hover:bg-red-50 transition-colors flex items-center justify-center space-x-2 rounded-xl disabled:opacity-50"
                                    >
                                        <UserMinus className="w-3.5 h-3.5" />
                                        <span>Revoke Worker Role</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}, { requiredPermission: 'departments:read' });