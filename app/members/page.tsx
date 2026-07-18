"use client";

import React, { useState, useMemo } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { useRouter } from "next/navigation";
import {
    Search, SlidersHorizontal,
    ArrowUpDown, Eye, X, UserPlus, ShieldAlert, CheckCircle2,
    RefreshCw, KeyRound, ToggleLeft, ToggleRight, BadgeCheck,
    Phone, Mail, Calendar, Users, Church, UserMinus,
} from "lucide-react";
import {
    useMembers, Member, PastorType, PASTOR_TYPE_LABELS, PromoteToWorkerPayload,
} from "@/hooks/use-member";
import { useDepartments } from "@/hooks/use-departments";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { DismissibleError } from "@/components/ui/dismissible-error";

type ApiError = { response?: { data?: { message?: string } }; message?: string };
// ─── Helpers ──────────────────────────────────────────────────────────────────

const fullName = (m: Member) =>
    [m.firstname, m.lastname].filter(Boolean).join(" ") || m.email;

const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
    return (
        <tr className="border-b border-[#121212]/5">
            <td className="p-4">
                <div className="h-3.5 bg-[#F4F1EA] rounded w-32 mb-2 animate-pulse" />
                <div className="h-2.5 bg-[#F4F1EA] rounded w-44 animate-pulse" />
            </td>
            <td className="p-4">
                <div className="h-5 bg-[#F4F1EA] rounded w-16 animate-pulse" />
            </td>
            <td className="p-4">
                <div className="h-5 bg-[#F4F1EA] rounded w-14 animate-pulse" />
            </td>
            <td className="p-4 flex justify-end">
                <div className="h-8 w-8 bg-[#F4F1EA] rounded-lg animate-pulse" />
            </td>
        </tr>
    );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: Member["role"] }) {
    const styles: Record<Member["role"], string> = {
        WORKER: "bg-[#EADCC9] border-[#EADCC9] text-[#121212]",
        MEMBER: "bg-[#F4F1EA] border-[#121212]/5 text-[#8A817C]",
    };
    return (
        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${styles[role]}`}>
            {role}
        </span>
    );
}

function StatusBadge({ status }: { status: Member["status"] }) {
    return (
        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${status === "ACTIVE"
                ? "bg-green-50 border-green-100 text-green-700"
                : "bg-red-50 border-red-100 text-red-600"
            }`}>
            {status}
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
}: {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
}) {
    return (
        <div className="p-4 bg-[#fdfaf2] border border-dashed border-[#121212]/15 rounded-lg text-xs space-y-3">
            <p className="text-[#121212] font-light leading-relaxed">{message}</p>
            <div className="flex gap-2">
                <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className="px-4 py-1.5 bg-[#121212] text-white text-[10px] font-bold uppercase tracking-wider rounded disabled:opacity-50 flex items-center gap-1.5"
                >
                    {isLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                    Confirm
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

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "firstname" | "role" | "status" | "createdAt";
type SortOrder = "asc" | "desc";
type ConfirmAction =
    | "promote"
    | "deactivate"
    | "activate"
    | "reset-password"
    | "assign-pastor"
    | "edit-pastor"
    | "remove-pastor"
    | null;

// ─── Main page ────────────────────────────────────────────────────────────────

export default withAuth(function MembersPage() {
    const router = useRouter();
    const {
        members,
        pagination,
        isLoading,
        isSubmitting,
        error,
        goToPage,
        refetch,
        promoteToWorker,
        changeStatus,
        resetPassword,
        assignPastor,
        updatePastorType,
        removePastor,
        search: searchQuery,
        onSearchChange,
    } = useMembers(10);
    const { departments } = useDepartments();

    const [promoteForm, setPromoteForm] = useState<PromoteToWorkerPayload>({
        departmentId: "",
        profession: "",
        yearJoinedWorkforce: "",
    });
    const [pastorType, setPastorType] = useState<PastorType>("ASSOCIATE");
    // Detail panel
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    // Filters
    const [roleFilter, setRoleFilter] = useState<string>("All");
    const [statusFilter, setStatusFilter] = useState<string>("All");

    // Sort
    const [sortKey, setSortKey] = useState<SortKey>("firstname");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortOrder("asc");
        }
    };

    const selectMember = (m: Member) => {
        setSelectedMember(m);
        setConfirmAction(null);
        setActionError(null);
        setActionSuccess(null);
    };

    // Client-side filter + sort on current server page (search is server-side)
    const processed = useMemo(() => {
        let result = [...members];

        if (roleFilter !== "All") result = result.filter((m) => m.role === roleFilter);
        if (statusFilter !== "All") result = result.filter((m) => m.status === statusFilter);

        result.sort((a, b) => {
            const valA = String(a[sortKey] ?? "").toLowerCase();
            const valB = String(b[sortKey] ?? "").toLowerCase();
            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

        return result;
    }, [members, roleFilter, statusFilter, sortKey, sortOrder]);

    // ── Actions ───────────────────────────────────────────────────────────────

    const confirmMessages: Record<NonNullable<ConfirmAction>, string> = {
        promote: `Promote ${selectedMember ? fullName(selectedMember) : "this member"} to Worker? This cannot be undone.`,
        deactivate: `Deactivate ${selectedMember ? fullName(selectedMember) : "this member"}? They will lose system access.`,
        activate: `Re-activate ${selectedMember ? fullName(selectedMember) : "this member"}?`,
        "reset-password": `Send a password reset link to ${selectedMember?.email}?`,
        "assign-pastor": `Designate ${selectedMember ? fullName(selectedMember) : "this member"} as a pastor?`,
        "edit-pastor": `Update the pastor type for ${selectedMember ? fullName(selectedMember) : "this member"}?`,
        "remove-pastor": `Remove the pastor designation from ${selectedMember ? fullName(selectedMember) : "this member"}? This is purely informational and does not affect their login or worker access.`,
    };

    const handleConfirm = async () => {
        if (!selectedMember || !confirmAction) return;
        setActionError(null);
        setActionSuccess(null);
        try {
            if (confirmAction === "promote") {
                const updated = await promoteToWorker(selectedMember.id, promoteForm);
                setSelectedMember((prev) => prev ? { ...prev, ...updated } : prev);
                setActionSuccess("Member successfully promoted to Worker.");
            } else if (confirmAction === "deactivate") {
                const updated = await changeStatus(selectedMember.id, "INACTIVE");
                setSelectedMember((prev) => prev ? { ...prev, ...updated } : prev);
                setActionSuccess("Member status set to Inactive.");
            } else if (confirmAction === "activate") {
                const updated = await changeStatus(selectedMember.id, "ACTIVE");
                setSelectedMember((prev) => prev ? { ...prev, ...updated } : prev);
                setActionSuccess("Member status set to Active.");
            } else if (confirmAction === "reset-password") {
                await resetPassword(selectedMember.id);
                setActionSuccess("Password reset email sent successfully.");
            } else if (confirmAction === "assign-pastor") {
                const updated = await assignPastor(selectedMember.id, pastorType);
                setSelectedMember((prev) => prev ? { ...prev, ...updated } : prev);
                setActionSuccess("Pastor designation assigned.");
            } else if (confirmAction === "edit-pastor") {
                const updated = await updatePastorType(selectedMember.id, pastorType);
                setSelectedMember((prev) => prev ? { ...prev, ...updated } : prev);
                setActionSuccess("Pastor type updated.");
            } else if (confirmAction === "remove-pastor") {
                await removePastor(selectedMember.id);
                setSelectedMember((prev) => prev ? { ...prev, pastorType: null } : prev);
                setActionSuccess("Pastor designation removed.");
            }
            setConfirmAction(null);
        } catch (err: unknown) {
            const e = err as ApiError;
            setActionError(e?.message ?? "Action failed.");
            setConfirmAction(null);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-10 font-sans">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                        Member Directory
                    </h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        View member profiles, manage statuses, and authorize role changes
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {pagination && (
                        <span className="text-[10px] font-mono text-[#8A817C] border border-[#121212]/10 px-3 py-1.5 rounded-lg">
                            {pagination.totalCount} members
                        </span>
                    )}
                    <button
                        onClick={() => router.push("/members/bulk-import")}
                        className="flex items-center gap-1.5 h-9 px-4 border border-[#121212]/10 text-[#121212] text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#F4F1EA] transition-colors"
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        Bulk Import
                    </button>
                    <button
                        onClick={() => router.push("/members/bulk-promote")}
                        className="flex items-center gap-1.5 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors"
                    >
                        <Users className="w-3.5 h-3.5" />
                        Bulk Promote
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

            {/* Global error */}
            <DismissibleError message={error} />

            {/* Filters */}
            <div className="flex flex-col xl:flex-row gap-6 items-center justify-between bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                <div className="w-full xl:max-w-md relative">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8A817C]" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or ID..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full h-11 pl-11 pr-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>

                <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#8A817C] shrink-0" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] shrink-0">
                            Role:
                        </span>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none min-w-[130px]"
                        >
                            <option value="All">All Roles</option>
                            <option value="MEMBER">Member</option>
                            <option value="WORKER">Worker</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] shrink-0">
                            Status:
                        </span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none min-w-[130px]"
                        >
                            <option value="All">All Statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table + detail */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Table */}
                <div className={`${selectedMember ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col transition-all`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    <th
                                        onClick={() => handleSort("firstname")}
                                        className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212] select-none"
                                    >
                                        <div className="flex items-center space-x-1.5">
                                            <span>Full Name</span>
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort("role")}
                                        className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212] select-none"
                                    >
                                        <div className="flex items-center space-x-1.5">
                                            <span>Role</span>
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
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
                                                    members.length === 0
                                                        ? "No members registered yet."
                                                        : "No members match the current search or filters."
                                                }
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    processed.map((member) => (
                                        <tr
                                            key={member.id}
                                            onClick={() => selectMember(member)}
                                            className={`transition-colors cursor-pointer ${selectedMember?.id === member.id
                                                    ? "bg-[#F4F1EA]/50"
                                                    : "hover:bg-[#F4F1EA]/10"
                                                }`}
                                        >
                                            <td className="p-4">
                                                <div className="text-sm font-medium text-[#121212]">
                                                    {fullName(member)}
                                                </div>
                                                <div className="text-xs text-[#8A817C] font-mono mt-0.5 truncate max-w-[200px]">
                                                    {member.email}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <RoleBadge role={member.role} />
                                            </td>
                                            <td className="p-4">
                                                <StatusBadge status={member.status} />
                                            </td>
                                            <td
                                                className="p-4 text-right"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <button
                                                    onClick={() => selectMember(member)}
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
                        label="members"
                    />
                </div>

                {/* Detail panel */}
                {selectedMember && (
                    <div className="lg:col-span-5">
                        <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl space-y-6 relative">
                            <button
                                onClick={() => setSelectedMember(null)}
                                className="absolute top-6 right-6 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Name + badges */}
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">
                                    Member Profile
                                </div>
                                <h2 className="text-xl font-light tracking-tight text-[#121212] pr-8">
                                    {fullName(selectedMember)}
                                </h2>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <RoleBadge role={selectedMember.role} />
                                    <StatusBadge status={selectedMember.status} />
                                    {selectedMember.workerProfile && (
                                        <span className="inline-block px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-[9px] font-bold uppercase tracking-wider rounded">
                                            Worker Profile Active
                                        </span>
                                    )}
                                    {selectedMember.pastorType && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EADCC9]/60 border border-[#EADCC9] text-[#121212] text-[9px] font-bold uppercase tracking-wider rounded">
                                            <Church className="w-2.5 h-2.5" />
                                            {PASTOR_TYPE_LABELS[selectedMember.pastorType]}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Contact */}
                            <div className="space-y-2 border-y border-[#121212]/5 py-4">
                                <div className="flex items-center gap-2 text-xs text-[#121212]">
                                    <Mail className="w-3.5 h-3.5 text-[#8A817C] shrink-0" />
                                    <span className="font-mono truncate">{selectedMember.email}</span>
                                </div>
                                {selectedMember.phoneNumber && (
                                    <div className="flex items-center gap-2 text-xs text-[#121212]">
                                        <Phone className="w-3.5 h-3.5 text-[#8A817C] shrink-0" />
                                        <span className="font-mono">{selectedMember.phoneNumber}</span>
                                    </div>
                                )}
                                {selectedMember.dateJoinedChurch && (
                                    <div className="flex items-center gap-2 text-xs text-[#121212]">
                                        <Calendar className="w-3.5 h-3.5 text-[#8A817C] shrink-0" />
                                        <span className="font-mono">
                                            Joined: {formatDate(selectedMember.dateJoinedChurch)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Details grid */}
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <DetailRow label="Gender" value={selectedMember.gender} />
                                <DetailRow label="Marital Status" value={selectedMember.maritalStatus} />
                                <DetailRow label="Year Born Again" value={selectedMember.yearBornAgain} />
                                <DetailRow label="Year Baptized" value={selectedMember.yearBaptized} />
                                <DetailRow
                                    label="Holy Ghost Baptism"
                                    value={selectedMember.baptizedWithHolyGhost ? "Yes" : "No"}
                                />
                                <DetailRow
                                    label="Password Changed"
                                    value={selectedMember.changedPassword ? "Yes" : "No"}
                                />
                                <DetailRow
                                    label="Account Created"
                                    value={formatDate(selectedMember.createdAt)}
                                />
                                <DetailRow
                                    label="Last Updated"
                                    value={formatDate(selectedMember.updatedAt)}
                                />
                            </div>

                            {/* Feedback */}
                            {actionSuccess && (
                                <div className="flex items-start gap-2.5 p-4 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700">
                                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{actionSuccess}</span>
                                </div>
                            )}
                            {actionError && (
                                <div className="flex items-start gap-2.5 p-4 bg-[#fdfaf2] border border-dashed border-[#121212]/15 rounded-lg text-xs text-[#121212]">
                                    <ShieldAlert className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="block font-semibold uppercase tracking-wider text-[11px] mb-0.5">
                                            Action Failed
                                        </strong>
                                        {actionError}
                                    </div>
                                </div>
                            )}

                            {confirmAction === "promote" && (
                                <div className="p-4 bg-[#fdfaf2] border border-dashed border-[#121212]/15 rounded-lg space-y-4">
                                    <div>
                                        <strong className="block text-[11px] font-semibold uppercase tracking-wider text-[#121212] mb-0.5">
                                            Promote to Worker
                                        </strong>
                                        <p className="text-xs text-[#8A817C] font-light">
                                            Fill in the worker details before confirming promotion.
                                        </p>
                                    </div>

                                    {/* Department */}
                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                            Department
                                        </label>
                                        <select
                                            value={promoteForm.departmentId}
                                            onChange={(e) =>
                                                setPromoteForm((p) => ({ ...p, departmentId: e.target.value }))
                                            }
                                            className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                        >
                                            <option value="">-- Select department --</option>
                                            {departments.map((d) => (
                                                <option key={d.id} value={d.id}>
                                                    {d.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Profession */}
                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                            Profession
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Software Engineer"
                                            value={promoteForm.profession}
                                            onChange={(e) =>
                                                setPromoteForm((p) => ({ ...p, profession: e.target.value }))
                                            }
                                            className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                        />
                                    </div>

                                    {/* Year joined workforce */}
                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                            Year Joined Workforce
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 2020"
                                            min={1950}
                                            max={new Date().getFullYear()}
                                            value={promoteForm.yearJoinedWorkforce}
                                            onChange={(e) =>
                                                setPromoteForm((p) => ({ ...p, yearJoinedWorkforce: e.target.value }))
                                            }
                                            className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                        />
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={handleConfirm}
                                            disabled={
                                                isSubmitting ||
                                                !promoteForm.departmentId ||
                                                !promoteForm.profession ||
                                                !promoteForm.yearJoinedWorkforce
                                            }
                                            className="px-4 py-1.5 bg-[#121212] text-white text-[10px] font-bold uppercase tracking-wider rounded disabled:opacity-50 flex items-center gap-1.5"
                                        >
                                            {isSubmitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                                            Confirm Promotion
                                        </button>
                                        <button
                                            onClick={() => setConfirmAction(null)}
                                            disabled={isSubmitting}
                                            className="px-4 py-1.5 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded hover:text-[#121212] disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(confirmAction === "assign-pastor" || confirmAction === "edit-pastor") && (
                                <div className="p-4 bg-[#fdfaf2] border border-dashed border-[#121212]/15 rounded-lg space-y-4">
                                    <div>
                                        <strong className="block text-[11px] font-semibold uppercase tracking-wider text-[#121212] mb-0.5">
                                            {confirmAction === "assign-pastor" ? "Assign Pastor Designation" : "Change Pastor Type"}
                                        </strong>
                                        <p className="text-xs text-[#8A817C] font-light">
                                            Purely informational — does not affect login, check-in, or worker/department access.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                            Pastor Type
                                        </label>
                                        <select
                                            value={pastorType}
                                            onChange={(e) => setPastorType(e.target.value as PastorType)}
                                            className="w-full h-10 px-3 bg-[#FFFFFF] border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                        >
                                            {(Object.keys(PASTOR_TYPE_LABELS) as PastorType[]).map((key) => (
                                                <option key={key} value={key}>
                                                    {PASTOR_TYPE_LABELS[key]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={handleConfirm}
                                            disabled={isSubmitting}
                                            className="px-4 py-1.5 bg-[#121212] text-white text-[10px] font-bold uppercase tracking-wider rounded disabled:opacity-50 flex items-center gap-1.5"
                                        >
                                            {isSubmitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                                            Confirm
                                        </button>
                                        <button
                                            onClick={() => setConfirmAction(null)}
                                            disabled={isSubmitting}
                                            className="px-4 py-1.5 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded hover:text-[#121212] disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {confirmAction &&
                                confirmAction !== "promote" &&
                                confirmAction !== "assign-pastor" &&
                                confirmAction !== "edit-pastor" && (
                                <ConfirmBanner
                                    message={confirmMessages[confirmAction]}
                                    onConfirm={handleConfirm}
                                    onCancel={() => setConfirmAction(null)}
                                    isLoading={isSubmitting}
                                />
                            )}

                            {/* Action buttons */}
                            {!confirmAction && (
                                <div className="space-y-3 pt-2">
                                    {selectedMember.role === "MEMBER" ? (
                                        <button
                                            onClick={() => {
                                                setConfirmAction("promote");
                                                setPromoteForm({ departmentId: "", profession: "", yearJoinedWorkforce: "" });
                                            }}
                                            disabled={isSubmitting}
                                            className="w-full h-11 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors flex items-center justify-center space-x-2 rounded-xl disabled:opacity-50"
                                        >
                                            <UserPlus className="w-3.5 h-3.5" />
                                            <span>Promote to Worker</span>
                                        </button>
                                    ) : (
                                        <div className="w-full h-11 bg-[#F4F1EA] text-[#8A817C] text-xs font-semibold uppercase tracking-widest flex items-center justify-center space-x-2 rounded-xl border border-[#121212]/5">
                                            <BadgeCheck className="w-4 h-4 text-green-600" />
                                            <span>Authorized Worker</span>
                                        </div>
                                    )}

                                    <button
                                        onClick={() =>
                                            setConfirmAction(
                                                selectedMember.status === "ACTIVE"
                                                    ? "deactivate"
                                                    : "activate"
                                            )
                                        }
                                        disabled={isSubmitting}
                                        className="w-full h-11 border border-[#121212]/10 text-[#121212] text-xs font-semibold uppercase tracking-widest hover:bg-[#F4F1EA] transition-colors flex items-center justify-center space-x-2 rounded-xl disabled:opacity-50"
                                    >
                                        {selectedMember.status === "ACTIVE" ? (
                                            <>
                                                <ToggleLeft className="w-4 h-4 text-[#8A817C]" />
                                                <span>Deactivate Member</span>
                                            </>
                                        ) : (
                                            <>
                                                <ToggleRight className="w-4 h-4 text-green-600" />
                                                <span>Re-activate Member</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => setConfirmAction("reset-password")}
                                        disabled={isSubmitting}
                                        className="w-full h-11 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-widest hover:bg-[#F4F1EA] hover:text-[#121212] transition-colors flex items-center justify-center space-x-2 rounded-xl disabled:opacity-50"
                                    >
                                        <KeyRound className="w-3.5 h-3.5" />
                                        <span>Reset Password</span>
                                    </button>

                                    {selectedMember.pastorType ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setPastorType(selectedMember.pastorType!);
                                                    setConfirmAction("edit-pastor");
                                                }}
                                                disabled={isSubmitting}
                                                className="flex-1 h-11 border border-[#121212]/10 text-[#121212] text-xs font-semibold uppercase tracking-widest hover:bg-[#F4F1EA] transition-colors flex items-center justify-center space-x-2 rounded-xl disabled:opacity-50"
                                            >
                                                <Church className="w-3.5 h-3.5" />
                                                <span>Change Pastor Type</span>
                                            </button>
                                            <button
                                                onClick={() => setConfirmAction("remove-pastor")}
                                                disabled={isSubmitting}
                                                className="h-11 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors flex items-center justify-center rounded-xl disabled:opacity-50"
                                                title="Remove pastor designation"
                                            >
                                                <UserMinus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setPastorType("ASSOCIATE");
                                                setConfirmAction("assign-pastor");
                                            }}
                                            disabled={isSubmitting}
                                            className="w-full h-11 border border-[#121212]/10 text-[#121212] text-xs font-semibold uppercase tracking-widest hover:bg-[#F4F1EA] transition-colors flex items-center justify-center space-x-2 rounded-xl disabled:opacity-50"
                                        >
                                            <Church className="w-3.5 h-3.5" />
                                            <span>Assign Pastor Designation</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}, { requiredPermission: 'members:read' });