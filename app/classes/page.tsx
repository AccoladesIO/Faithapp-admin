"use client";

import React, { useState, useMemo } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    GraduationCap, Plus, X, Check, Pencil, Trash2, RefreshCw,
    ChevronLeft, ChevronRight, Users, UserPlus, Calendar,
    ShieldAlert, CheckCircle2, Eye,
} from "lucide-react";
import {
    useClasses,
    ChurchClass,
    ClassType,
    EnrollmentStatus,
    Enrollment,
    CreateClassPayload,
} from "@/hooks/use-classes";
import { useMembers } from "@/hooks/use-member";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fullName = (p: { firstname: string; lastname: string }) =>
    [p?.firstname, p?.lastname].filter(Boolean).join(" ");

const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
    });
};

const formatClassType = (type: ClassType) =>
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const CLASS_TYPES: ClassType[] = ["BELIEVERS", "BAPTISMAL", "WORKERS_IN_TRAINING"];

// ─── Badges ───────────────────────────────────────────────────────────────────

function ClassTypeBadge({ type }: { type: ClassType }) {
    const map: Record<ClassType, string> = {
        BELIEVERS: "bg-blue-50 border-blue-100 text-blue-700",
        BAPTISMAL: "bg-purple-50 border-purple-100 text-purple-700",
        WORKERS_IN_TRAINING: "bg-[#EADCC9] border-[#EADCC9] text-[#121212]",
    };
    return (
        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${map[type]}`}>
            {formatClassType(type)}
        </span>
    );
}

function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
    const map: Record<EnrollmentStatus, string> = {
        IN_PROGRESS: "bg-blue-50 border-blue-100 text-blue-700",
        COMPLETED: "bg-green-50 border-green-100 text-green-700",
        CANCELLED: "bg-red-50 border-red-100 text-red-600",
    };
    return (
        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${map[status]}`}>
            {status.replace("_", " ")}
        </span>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
    return (
        <tr className="border-b border-[#121212]/5 animate-pulse">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="p-4"><div className="h-3 bg-[#F4F1EA] rounded w-3/4" /></td>
            ))}
        </tr>
    );
}

// ─── Default form ─────────────────────────────────────────────────────────────

const defaultForm: CreateClassPayload = {
    name: "",
    type: "BELIEVERS",
    description: "",
    facilitatorId: "",
    startDate: "",
    endDate: "",
};

// ─── Main page ────────────────────────────────────────────────────────────────

type PanelTab = "details" | "enrollments";

const ClassesPage = () => {
    const {
        classes,
        pagination,
        typeFilter,
        isLoading,
        isSubmitting,
        error,
        goToPage,
        applyTypeFilter,
        refetch,
        createClass,
        updateClass,
        deleteClass,
        enrollMember,
        fetchEnrollments,
        updateEnrollmentStatus,
    } = useClasses("", 10);

    const { members } = useMembers(100);

    // Create form
    const [createForm, setCreateForm] = useState<CreateClassPayload>(defaultForm);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createSuccess, setCreateSuccess] = useState<string | null>(null);

    // Edit
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: "", description: "", startDate: "", endDate: "" });

    // Delete confirm
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Detail panel
    const [selectedClass, setSelectedClass] = useState<ChurchClass | null>(null);
    const [panelTab, setPanelTab] = useState<PanelTab>("details");
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
    const [enrollmentsPagination, setEnrollmentsPagination] = useState<any>(null);
    const [enrollmentsPage, setEnrollmentsPage] = useState(1);

    // Enroll form
    const [enrollMemberId, setEnrollMemberId] = useState("");
    const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);
    const [enrollError, setEnrollError] = useState<string | null>(null);

    // ── Create ────────────────────────────────────────────────────────────────
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);
        setCreateSuccess(null);
        try {
            await createClass(createForm);
            setCreateForm(defaultForm);
            setCreateSuccess("Class created successfully.");
            setTimeout(() => setCreateSuccess(null), 3000);
        } catch (err: any) {
            setCreateError(err?.message ?? "Failed to create class.");
        }
    };

    // ── Edit ──────────────────────────────────────────────────────────────────
    const startEdit = (c: ChurchClass) => {
        setEditingId(c.id);
        setEditForm({
            name: c.name,
            description: c.description,
            startDate: c.startDate,
            endDate: c.endDate,
        });
    };

    const handleSaveEdit = async (classId: string) => {
        try {
            const updated = await updateClass(classId, editForm);
            if (selectedClass?.id === classId) setSelectedClass(updated);
            setEditingId(null);
        } catch {
            // surfaced via hook
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = async (classId: string) => {
        try {
            await deleteClass(classId);
            if (selectedClass?.id === classId) setSelectedClass(null);
            setDeletingId(null);
        } catch {
            // surfaced via hook
        }
    };

    // ── Enrollments ───────────────────────────────────────────────────────────
    const loadEnrollments = async (classId: string, page = 1) => {
        setEnrollmentsLoading(true);
        const { enrollments, pagination } = await fetchEnrollments(classId, page);
        setEnrollments(enrollments);
        setEnrollmentsPagination(pagination);
        setEnrollmentsPage(page);
        setEnrollmentsLoading(false);
    };

    const selectClass = (c: ChurchClass) => {
        setSelectedClass(c);
        setPanelTab("details");
        setEnrollMemberId("");
        setEnrollSuccess(null);
        setEnrollError(null);
        loadEnrollments(c.id, 1);
    };

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClass || !enrollMemberId) return;
        setEnrollError(null);
        setEnrollSuccess(null);
        try {
            await enrollMember({ memberId: enrollMemberId, classId: selectedClass.id });
            setEnrollMemberId("");
            setEnrollSuccess("Member enrolled successfully.");
            loadEnrollments(selectedClass.id, 1);
            setTimeout(() => setEnrollSuccess(null), 3000);
        } catch (err: any) {
            setEnrollError(err?.message ?? "Failed to enroll member.");
        }
    };

    const handleStatusChange = async (enrollmentId: string, status: EnrollmentStatus) => {
        try {
            await updateEnrollmentStatus(enrollmentId, status);
            if (selectedClass) loadEnrollments(selectedClass.id, enrollmentsPage);
        } catch {
            // surfaced via hook
        }
    };

    // Members not already enrolled (best-effort filter using current enrollments list)
    const enrollableMembers = useMemo(() => {
        const enrolledIds = new Set(enrollments.map((e) => e.member.id));
        return members.filter((m) => !enrolledIds.has(m.id));
    }, [members, enrollments]);

    return (
        <div className="space-y-10 font-sans">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                        Discipleship Classes
                    </h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Manage believers, baptismal, and workers-in-training class tracks
                    </p>
                </div>
                <button
                    onClick={refetch}
                    disabled={isLoading}
                    className="p-2 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-40 self-start sm:self-auto"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-xs text-red-700">
                    <strong className="block font-semibold uppercase tracking-wider text-[11px] mb-1">Error</strong>
                    {error}
                </div>
            )}

            {/* Type filter */}
            <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl w-fit flex-wrap">
                <button
                    onClick={() => applyTypeFilter("")}
                    disabled={isLoading}
                    className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-40 ${typeFilter === "" ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"
                        }`}
                >
                    All Classes
                </button>
                {CLASS_TYPES.map((t) => (
                    <button
                        key={t}
                        onClick={() => applyTypeFilter(t)}
                        disabled={isLoading}
                        className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-40 ${typeFilter === t ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"
                            }`}
                    >
                        {formatClassType(t)}
                    </button>
                ))}
            </div>

            {/* Create + Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Create form */}
                <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] mb-6 flex items-center space-x-2">
                        <Plus className="w-4 h-4 text-[#8A817C]" />
                        <span>Create Class</span>
                    </h2>

                    {createSuccess && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700 mb-4">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            {createSuccess}
                        </div>
                    )}
                    {createError && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 mb-4">
                            <ShieldAlert className="w-4 h-4 shrink-0" />
                            {createError}
                        </div>
                    )}

                    <form onSubmit={handleCreate} className="space-y-5">
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Class Name
                            </label>
                            <input
                                type="text"
                                required
                                value={createForm.name}
                                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                                placeholder="e.g., New Believers Class"
                                className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Class Type
                            </label>
                            <select
                                value={createForm.type}
                                onChange={(e) => setCreateForm((p) => ({ ...p, type: e.target.value as ClassType }))}
                                className="w-full h-11 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                            >
                                {CLASS_TYPES.map((t) => (
                                    <option key={t} value={t}>{formatClassType(t)}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Description
                            </label>
                            <textarea
                                rows={3}
                                value={createForm.description}
                                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                                placeholder="Foundation class for new members..."
                                className="w-full p-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Facilitator
                            </label>
                            <select
                                required
                                value={createForm.facilitatorId}
                                onChange={(e) => setCreateForm((p) => ({ ...p, facilitatorId: e.target.value }))}
                                className="w-full h-11 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                            >
                                <option value="">-- Select facilitator --</option>
                                {members.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {fullName(m)} — {m.email}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={createForm.startDate}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, startDate: e.target.value }))}
                                    className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={createForm.endDate}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, endDate: e.target.value }))}
                                    className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 rounded-xl"
                        >
                            {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <GraduationCap className="w-3.5 h-3.5" />}
                            <span>{isSubmitting ? "Creating..." : "Create Class"}</span>
                        </button>
                    </form>
                </div>

                {/* Table */}
                <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Class</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Facilitator</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Duration</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                {isLoading ? (
                                    Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                                ) : classes.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                            No classes found.
                                        </td>
                                    </tr>
                                ) : (
                                    classes.map((c) => (
                                        <tr
                                            key={c.id}
                                            onClick={() => selectClass(c)}
                                            className={`transition-colors cursor-pointer ${selectedClass?.id === c.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"
                                                }`}
                                        >
                                            <td className="p-4">
                                                {editingId === c.id ? (
                                                    <input
                                                        value={editForm.name}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                                                        className="w-full h-8 px-2 bg-[#F4F1EA]/60 border border-[#121212]/20 text-sm text-[#121212] focus:outline-none focus:border-[#121212] rounded"
                                                    />
                                                ) : (
                                                    <>
                                                        <div className="text-sm font-medium text-[#121212]">{c.name}</div>
                                                        <div className="mt-1"><ClassTypeBadge type={c.type} /></div>
                                                    </>
                                                )}
                                            </td>
                                            <td className="p-4 text-xs text-[#121212]">
                                                <div className="font-medium">{fullName(c.facilitator)}</div>
                                                <div className="text-[#8A817C] font-mono mt-0.5">{c.facilitator?.email}</div>
                                            </td>
                                            <td className="p-4 text-xs font-mono text-[#121212]">
                                                {editingId === c.id ? (
                                                    <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="date"
                                                            value={editForm.startDate}
                                                            onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))}
                                                            className="h-7 px-2 bg-[#F4F1EA]/60 border border-[#121212]/20 text-[10px] rounded"
                                                        />
                                                        <input
                                                            type="date"
                                                            value={editForm.endDate}
                                                            onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))}
                                                            className="h-7 px-2 bg-[#F4F1EA]/60 border border-[#121212]/20 text-[10px] rounded"
                                                        />
                                                    </div>
                                                ) : (
                                                    <>
                                                        {formatDate(c.startDate)}
                                                        <div className="text-[#8A817C]">→ {formatDate(c.endDate)}</div>
                                                    </>
                                                )}
                                            </td>
                                            <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                {editingId === c.id ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => handleSaveEdit(c.id)}
                                                            disabled={isSubmitting}
                                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            className="p-2 text-[#8A817C] hover:bg-[#F4F1EA] rounded-lg transition-colors"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : deletingId === c.id ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => handleDelete(c.id)}
                                                            disabled={isSubmitting}
                                                            className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingId(null)}
                                                            className="p-2 text-[#8A817C] hover:bg-[#F4F1EA] rounded-lg transition-colors"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => selectClass(c)}
                                                            className="p-2 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 hover:border-[#121212] rounded-lg transition-colors"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => startEdit(c)}
                                                            className="p-2 text-[#8A817C] hover:text-[#121212] rounded-lg hover:bg-[#F4F1EA] transition-colors"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingId(c.id)}
                                                            className="p-2 text-[#8A817C] hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {pagination && pagination.totalPages > 1 && (
                        <div className="p-4 border-t border-[#121212]/10 bg-[#F4F1EA]/10 flex items-center justify-between">
                            <span className="text-xs font-mono text-[#8A817C]">
                                Page {pagination.page} of {pagination.totalPages}
                                <span className="ml-2 text-[#121212]/30">({pagination.totalCount} total)</span>
                            </span>
                            <div className="flex space-x-1">
                                <button
                                    disabled={pagination.page <= 1 || isLoading}
                                    onClick={() => goToPage(pagination.page - 1)}
                                    className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212] hover:bg-[#F4F1EA]"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    disabled={pagination.page >= pagination.totalPages || isLoading}
                                    onClick={() => goToPage(pagination.page + 1)}
                                    className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212] hover:bg-[#F4F1EA]"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail panel */}
            {selectedClass && (
                <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative">
                    <button
                        onClick={() => setSelectedClass(null)}
                        className="absolute top-6 right-6 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md z-10"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="p-6 border-b border-[#121212]/5">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">
                            Class Detail
                        </div>
                        <h2 className="text-xl font-light tracking-tight text-[#121212] pr-10">
                            {selectedClass.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-2">
                            <ClassTypeBadge type={selectedClass.type} />
                            <span className="text-xs font-mono text-[#8A817C]">
                                {formatDate(selectedClass.startDate)} → {formatDate(selectedClass.endDate)}
                            </span>
                        </div>

                        <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl mt-4 w-fit">
                            {(["details", "enrollments"] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setPanelTab(tab)}
                                    className={`flex items-center space-x-1.5 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${panelTab === tab ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"
                                        }`}
                                >
                                    {tab === "details" ? <GraduationCap className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                                    <span>{tab === "details" ? "Details" : "Enrollments"}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Details tab */}
                    {panelTab === "details" && (
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-[#121212]/80 font-light leading-relaxed bg-[#F4F1EA]/30 p-4 border border-[#121212]/5 rounded-lg">
                                {selectedClass.description || "No description provided."}
                            </p>
                            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                                <div className="p-4 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-lg">
                                    <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">
                                        Facilitator
                                    </span>
                                    <span className="text-[#121212] font-medium">{fullName(selectedClass.facilitator)}</span>
                                    <div className="text-[#8A817C] mt-0.5">{selectedClass.facilitator.email}</div>
                                </div>
                                <div className="p-4 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-lg">
                                    <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">
                                        Duration
                                    </span>
                                    <span className="text-[#121212]">
                                        {formatDate(selectedClass.startDate)} — {formatDate(selectedClass.endDate)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Enrollments tab */}
                    {panelTab === "enrollments" && (
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">

                            {/* Enroll form */}
                            <div className="lg:col-span-4 bg-[#F4F1EA]/20 border border-[#121212]/10 p-5 rounded-xl space-y-4 h-fit">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212] flex items-center gap-2">
                                    <UserPlus className="w-4 h-4 text-[#8A817C]" />
                                    Enroll Member
                                </h3>

                                {enrollSuccess && (
                                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700">
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                        {enrollSuccess}
                                    </div>
                                )}
                                {enrollError && (
                                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                                        <ShieldAlert className="w-4 h-4 shrink-0" />
                                        {enrollError}
                                    </div>
                                )}

                                <form onSubmit={handleEnroll} className="space-y-3">
                                    <select
                                        required
                                        value={enrollMemberId}
                                        onChange={(e) => setEnrollMemberId(e.target.value)}
                                        className="w-full h-10 px-3 bg-white border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                    >
                                        <option value="">-- Select member --</option>
                                        {enrollableMembers.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {fullName(m)} — {m.email}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !enrollMemberId}
                                        className="w-full h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 rounded-lg"
                                    >
                                        {isSubmitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                                        Enroll
                                    </button>
                                </form>
                            </div>

                            {/* Enrollment list */}
                            <div className="lg:col-span-8">
                                <div className="border border-[#121212]/10 rounded-xl overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Member</th>
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Enrolled</th>
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                            {enrollmentsLoading ? (
                                                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={3} />)
                                            ) : enrollments.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                                        No enrollments yet.
                                                    </td>
                                                </tr>
                                            ) : (
                                                enrollments.map((enr) => (
                                                    <tr key={enr.id} className="hover:bg-[#F4F1EA]/10 transition-colors">
                                                        <td className="p-4">
                                                            <div className="text-sm font-medium text-[#121212]">
                                                                {fullName(enr.member)}
                                                            </div>
                                                            <div className="text-xs font-mono text-[#8A817C] mt-0.5">
                                                                {enr.member.email}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-xs font-mono text-[#8A817C]">
                                                            {formatDate(enr.enrolledAt)}
                                                            {enr.completedAt && (
                                                                <div className="text-green-700 mt-0.5">
                                                                    Completed: {formatDate(enr.completedAt)}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            <select
                                                                value={enr.status}
                                                                onChange={(e) =>
                                                                    handleStatusChange(enr.id, e.target.value as EnrollmentStatus)
                                                                }
                                                                disabled={isSubmitting}
                                                                className="h-8 px-2 bg-white border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-md appearance-none disabled:opacity-50"
                                                            >
                                                                <option value="IN_PROGRESS">In Progress</option>
                                                                <option value="COMPLETED">Completed</option>
                                                                <option value="CANCELLED">Cancelled</option>
                                                            </select>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {enrollmentsPagination && enrollmentsPagination.totalPages > 1 && (
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="text-xs font-mono text-[#8A817C]">
                                            Page {enrollmentsPagination.page} of {enrollmentsPagination.totalPages}
                                        </span>
                                        <div className="flex space-x-1">
                                            <button
                                                disabled={enrollmentsPage <= 1 || enrollmentsLoading}
                                                onClick={() => loadEnrollments(selectedClass.id, enrollmentsPage - 1)}
                                                className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212] hover:bg-[#F4F1EA]"
                                            >
                                                <ChevronLeft className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                disabled={enrollmentsPage >= enrollmentsPagination.totalPages || enrollmentsLoading}
                                                onClick={() => loadEnrollments(selectedClass.id, enrollmentsPage + 1)}
                                                className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212] hover:bg-[#F4F1EA]"
                                            >
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default withAuth(ClassesPage);