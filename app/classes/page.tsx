"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { useRouter } from "next/navigation";
import {
    GraduationCap, Plus, X, Check, Pencil, Trash2, RefreshCw,
    Users, UserPlus,
    ShieldAlert, CheckCircle2, MousePointerClick, UserRoundPlus,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
    useClasses,
    ChurchClass,
    ClassType,
    EnrollmentStatus,
    Enrollment,
    CreateClassPayload,
} from "@/hooks/use-classes";
import { useMembers } from "@/hooks/use-member";
import { useWorkers } from "@/hooks/use-workers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fullName = (p: { firstname: string; lastname: string }) =>
    [p?.firstname, p?.lastname].filter(Boolean).join(" ");

const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
    });
};

const CLASS_TYPES: ClassType[] = ["BELIEVERS", "BAPTISMAL", "WORKERS_IN_TRAINING", "BIBLE_COLLEGE", "SCHOOL_OF_DISCIPLESHIP"];

const CLASS_TYPE_LABELS: Record<ClassType, string> = {
    BELIEVERS: "Believers",
    BAPTISMAL: "Baptismal",
    WORKERS_IN_TRAINING: "Workers in Training",
    BIBLE_COLLEGE: "Bible College",
    SCHOOL_OF_DISCIPLESHIP: "School of Discipleship",
};

// ─── Badges ───────────────────────────────────────────────────────────────────

function ClassTypeBadge({ type }: { type: ClassType }) {
    const map: Record<ClassType, string> = {
        BELIEVERS: "bg-blue-50 border-blue-100 text-blue-700",
        BAPTISMAL: "bg-purple-50 border-purple-100 text-purple-700",
        WORKERS_IN_TRAINING: "bg-[#EADCC9] border-[#EADCC9] text-[#121212]",
        BIBLE_COLLEGE: "bg-amber-50 border-amber-100 text-amber-700",
        SCHOOL_OF_DISCIPLESHIP: "bg-green-50 border-green-100 text-green-700",
    };
    return (
        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${map[type]}`}>
            {CLASS_TYPE_LABELS[type]}
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

// ─── Searchable combobox ──────────────────────────────────────────────────────

interface ComboOption { id: string; label: string; sub?: string; }

function PersonCombobox({
    options,
    value,
    onChange,
    placeholder = "Search by name…",
    required,
}: {
    options: ComboOption[];
    value: string;
    onChange: (id: string) => void;
    placeholder?: string;
    required?: boolean;
}) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selected = useMemo(() => options.find((o) => o.id === value), [options, value]);

    const filtered = useMemo(() => {
        const q = query.toLowerCase();
        const list = q
            ? options.filter((o) => o.label.toLowerCase().includes(q) || o.sub?.toLowerCase().includes(q))
            : options;
        return list.slice(0, 60);
    }, [query, options]);

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    const select = (id: string) => { onChange(id); setQuery(""); setOpen(false); };
    const clear = (e: React.MouseEvent) => { e.stopPropagation(); onChange(""); setQuery(""); };

    return (
        <div ref={containerRef} className="relative">
            {/* hidden input so browser required validation works */}
            {required && <input tabIndex={-1} required value={value} onChange={() => {}} className="sr-only" />}
            <div
                className="flex items-center w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 rounded-lg focus-within:border-[#121212] transition-colors cursor-text gap-2"
                onClick={() => { setOpen(true); }}
            >
                {selected && !open ? (
                    <>
                        <span className="flex-1 text-sm text-[#121212] font-light truncate">{selected.label}</span>
                        <button type="button" onClick={clear} className="shrink-0 text-[#8A817C] hover:text-[#121212]">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </>
                ) : (
                    <input
                        autoFocus={open}
                        type="text"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                        placeholder={selected ? selected.label : placeholder}
                        className="flex-1 bg-transparent text-sm text-[#121212] font-light outline-none placeholder:text-[#8A817C]/60"
                    />
                )}
            </div>
            {open && (
                <div className="absolute z-30 top-full mt-1 w-full bg-white border border-[#121212]/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="p-3 text-xs text-[#8A817C] text-center">No results</div>
                    ) : (
                        filtered.map((o) => (
                            <button
                                key={o.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => select(o.id)}
                                className={`w-full text-left px-3 py-2.5 hover:bg-[#F4F1EA] transition-colors ${o.id === value ? "bg-[#F4F1EA]/70" : ""}`}
                            >
                                <div className="text-xs font-medium text-[#121212]">{o.label}</div>
                                {o.sub && <div className="text-[11px] text-[#8A817C] font-mono mt-0.5 truncate">{o.sub}</div>}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
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
    const router = useRouter();

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
        closeClass,
    } = useClasses("", 10);

    const { workers } = useWorkers(200);
    const { members } = useMembers(200);

    const facilitatorOptions = useMemo<ComboOption[]>(() =>
        workers.map((w) => ({ id: w.id, label: fullName(w), sub: w.email })),
        [workers]
    );

    // Panel state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedClass, setSelectedClass] = useState<ChurchClass | null>(null);
    const panelOpen = showCreateForm || selectedClass !== null;

    // Create form
    const [createForm, setCreateForm] = useState<CreateClassPayload>(defaultForm);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createSuccess, setCreateSuccess] = useState<string | null>(null);

    // Edit (inline in table)
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: "", description: "", startDate: "", endDate: "" });

    // Facilitator edit (in detail panel)
    const [editingFacilitator, setEditingFacilitator] = useState(false);
    const [facilitatorDraft, setFacilitatorDraft] = useState("");

    // Delete confirm
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Enrollments
    const [panelTab, setPanelTab] = useState<PanelTab>("details");
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
    const [enrollmentsPagination, setEnrollmentsPagination] = useState<{ page: number; limit: number; totalPages: number; totalCount: number } | null>(null);
    const [enrollmentsPage, setEnrollmentsPage] = useState(1);

    // Enroll form
    const [enrollMemberId, setEnrollMemberId] = useState("");
    const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);
    const [enrollError, setEnrollError] = useState<string | null>(null);

    // Close class
    const [closeSuccess, setCloseSuccess] = useState<string | null>(null);
    const [closeError, setCloseError] = useState<string | null>(null);

    // Overdue: ACTIVE classes whose end date is in the past
    const today = new Date().toISOString().split("T")[0];
    const overdueClasses = useMemo(
        () => classes.filter((c) => c.status === "ACTIVE" && c.endDate && c.endDate < today),
        [classes, today]
    );

    // ── Panel controls ────────────────────────────────────────────────────────

    const openCreateForm = () => {
        setShowCreateForm(true);
        setSelectedClass(null);
        setCreateError(null);
        setCreateSuccess(null);
        setCreateForm(defaultForm);
    };

    const closePanel = () => {
        setShowCreateForm(false);
        setSelectedClass(null);
    };

    const selectClass = (c: ChurchClass) => {
        setSelectedClass(c);
        setShowCreateForm(false);
        setPanelTab("details");
        setEnrollMemberId("");
        setEnrollSuccess(null);
        setEnrollError(null);
        loadEnrollments(c.id, 1);
    };

    // ── Create ────────────────────────────────────────────────────────────────

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);
        setCreateSuccess(null);
        try {
            await createClass(createForm);
            setCreateSuccess("Class created successfully.");
            setTimeout(() => {
                setCreateSuccess(null);
                setShowCreateForm(false);
            }, 2000);
        } catch (err: any) {
            setCreateError(err?.message ?? "Failed to create class.");
        }
    };

    // ── Edit (inline) ─────────────────────────────────────────────────────────

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

    // ── Facilitator ───────────────────────────────────────────────────────────

    const startEditFacilitator = () => {
        setFacilitatorDraft(selectedClass?.facilitator?.id ?? "");
        setEditingFacilitator(true);
    };

    const handleSaveFacilitator = async () => {
        if (!selectedClass) return;
        try {
            const updated = await updateClass(selectedClass.id, { facilitatorId: facilitatorDraft || undefined });
            setSelectedClass(updated);
            setEditingFacilitator(false);
        } catch {
            // surfaced via hook error
        }
    };

    // ── Close class ───────────────────────────────────────────────────────────

    const handleCloseClass = async (classId: string) => {
        setCloseError(null);
        setCloseSuccess(null);
        try {
            const result = await closeClass(classId);
            if (selectedClass?.id === classId) {
                setSelectedClass((prev) => prev ? { ...prev, status: "CLOSED" } : prev);
            }
            setCloseSuccess(`Class closed. ${result.closedEnrollments} enrollment(s) marked complete.`);
            setTimeout(() => setCloseSuccess(null), 4000);
        } catch (err: any) {
            setCloseError(err?.message ?? "Failed to close class.");
        }
    };

    // ── Enrollments ───────────────────────────────────────────────────────────

    const loadEnrollments = async (classId: string, page = 1) => {
        setEnrollmentsLoading(true);
        const { enrollments, pagination } = await fetchEnrollments(classId, page);
        setEnrollments(enrollments);
        setEnrollmentsPagination(
            pagination ? { page: pagination.page, limit: pagination.limit ?? 10, totalPages: pagination.totalPages, totalCount: pagination.totalCount } : null
        );
        setEnrollmentsPage(page);
        setEnrollmentsLoading(false);
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

    const enrollableOptions = useMemo<ComboOption[]>(() => {
        const enrolledIds = new Set(enrollments.map((e) => e.member.id));
        return members
            .filter((m) => !enrolledIds.has(m.id))
            .map((m) => ({ id: m.id, label: fullName(m), sub: m.email }));
    }, [members, enrollments]);

    return (
        <div className="space-y-8 font-sans">

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
                <div className="flex items-center gap-3 self-start sm:self-auto">
                    <button
                        onClick={refetch}
                        disabled={isLoading}
                        className="p-2 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-40"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                    <button
                        onClick={() => router.push("/classes/bulk-enroll")}
                        className="flex items-center gap-2 px-4 py-2 border border-[#121212]/20 text-[#121212] text-xs font-semibold uppercase tracking-widest hover:bg-[#F4F1EA] transition-colors rounded-lg"
                    >
                        <UserRoundPlus className="w-3.5 h-3.5" />
                        Bulk Enrol
                    </button>
                    <button
                        onClick={openCreateForm}
                        className="flex items-center gap-2 px-4 py-2 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors rounded-lg"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Class
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-xs text-red-700">
                    <strong className="block font-semibold uppercase tracking-wider text-[11px] mb-1">Error</strong>
                    {error}
                </div>
            )}

            {/* Overdue banner */}
            {overdueClasses.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                        {overdueClasses.length} class{overdueClasses.length > 1 ? "es" : ""} past end date — ready to close
                    </p>
                    <div className="space-y-1.5">
                        {overdueClasses.map((c) => (
                            <div key={c.id} className="flex items-center justify-between gap-4">
                                <span className="text-xs text-amber-900 font-light">
                                    <span className="font-medium">{c.name}</span>
                                    <span className="text-amber-600 ml-2">— ended {formatDate(c.endDate)}</span>
                                </span>
                                <button
                                    onClick={() => handleCloseClass(c.id)}
                                    disabled={isSubmitting}
                                    className="shrink-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-700 text-white hover:bg-amber-800 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Close
                                </button>
                            </div>
                        ))}
                    </div>
                    {closeSuccess && (
                        <p className="text-xs text-green-700 font-medium flex items-center gap-1.5 pt-1">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />{closeSuccess}
                        </p>
                    )}
                    {closeError && (
                        <p className="text-xs text-red-700 font-medium pt-1">{closeError}</p>
                    )}
                </div>
            )}

            {/* Type filter */}
            <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl w-fit flex-wrap gap-0.5">
                <button
                    onClick={() => applyTypeFilter("")}
                    disabled={isLoading}
                    className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-40 ${typeFilter === "" ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                >
                    All
                </button>
                {CLASS_TYPES.map((t) => (
                    <button
                        key={t}
                        onClick={() => applyTypeFilter(t)}
                        disabled={isLoading}
                        className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-40 ${typeFilter === t ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                    >
                        {CLASS_TYPE_LABELS[t]}
                    </button>
                ))}
            </div>

            {/* Table + Right Panel */}
            <div className={`grid grid-cols-1 gap-6 ${panelOpen ? "lg:grid-cols-12" : ""}`}>

                {/* Table */}
                <div className={`${panelOpen ? "lg:col-span-7" : ""} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Class</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden sm:table-cell">Facilitator</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden md:table-cell">Duration</th>
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
                                            onClick={() => editingId !== c.id && deletingId !== c.id && selectClass(c)}
                                            className={`transition-colors ${editingId === c.id || deletingId === c.id ? "" : "cursor-pointer"} ${selectedClass?.id === c.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
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
                                                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                                            <ClassTypeBadge type={c.type} />
                                                            {c.status === "CLOSED" && (
                                                                <span className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border bg-[#F4F1EA] border-[#121212]/10 text-[#8A817C]">
                                                                    Closed
                                                                </span>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </td>
                                            <td className="p-4 text-xs text-[#121212] hidden sm:table-cell">
                                                <div className="font-medium">{c.facilitator ? fullName(c.facilitator) : "—"}</div>
                                                <div className="text-[#8A817C] font-mono mt-0.5">{c.facilitator?.email ?? ""}</div>
                                            </td>
                                            <td className="p-4 text-xs font-mono text-[#121212] hidden md:table-cell">
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

                    <PaginationBar
                        pagination={pagination}
                        onPage={goToPage}
                        isLoading={isLoading}
                        label="classes"
                    />

                    {!panelOpen && (
                        <div className="p-4 border-t border-[#121212]/5 text-center text-[11px] text-[#8A817C] font-light flex items-center justify-center gap-2">
                            <MousePointerClick className="w-3.5 h-3.5" />
                            Click any row to view class details and enrollments
                        </div>
                    )}
                </div>

                {/* Right panel */}
                {panelOpen && (
                    <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative flex flex-col">

                        {/* Panel header */}
                        <div className="p-5 border-b border-[#121212]/5 flex items-start justify-between gap-4">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">
                                    {showCreateForm ? "New Class" : "Class Detail"}
                                </div>
                                {selectedClass && (
                                    <>
                                        <h2 className="text-lg font-light tracking-tight text-[#121212] pr-2">
                                            {selectedClass.name}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            <ClassTypeBadge type={selectedClass.type} />
                                            {selectedClass.status === "CLOSED" ? (
                                                <span className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border bg-[#F4F1EA] border-[#121212]/10 text-[#8A817C]">Closed</span>
                                            ) : (
                                                <span className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border bg-green-50 border-green-100 text-green-700">Active</span>
                                            )}
                                            <span className="text-[11px] font-mono text-[#8A817C]">
                                                {formatDate(selectedClass.startDate)} → {formatDate(selectedClass.endDate)}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                            <button
                                onClick={closePanel}
                                className="shrink-0 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Create form */}
                        {showCreateForm && (
                            <div className="p-5 flex-1 overflow-y-auto">
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

                                <form onSubmit={handleCreate} className="space-y-4">
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                            Class Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={createForm.name}
                                            onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                                            placeholder="e.g., New Believers Class"
                                            className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                            Class Type
                                        </label>
                                        <select
                                            value={createForm.type}
                                            onChange={(e) => setCreateForm((p) => ({ ...p, type: e.target.value as ClassType }))}
                                            className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                        >
                                            {CLASS_TYPES.map((t) => (
                                                <option key={t} value={t}>{CLASS_TYPE_LABELS[t]}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                            Description
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={createForm.description}
                                            onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                                            placeholder="Foundation class for new members..."
                                            className="w-full p-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                            Facilitator
                                        </label>
                                        <PersonCombobox
                                            options={facilitatorOptions}
                                            value={createForm.facilitatorId}
                                            onChange={(id) => setCreateForm((p) => ({ ...p, facilitatorId: id }))}
                                            placeholder="Search workers by name…"
                                            required
                                        />
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
                                        className="w-full h-11 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded-xl"
                                    >
                                        {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <GraduationCap className="w-3.5 h-3.5" />}
                                        {isSubmitting ? "Creating..." : "Create Class"}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Class detail */}
                        {selectedClass && (
                            <>
                                {/* Tabs */}
                                <div className="px-5 pt-4 border-b border-[#121212]/5">
                                    <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl w-fit">
                                        {(["details", "enrollments"] as const).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setPanelTab(tab)}
                                                className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${panelTab === tab ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                                            >
                                                {tab === "details" ? <GraduationCap className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                                                {tab === "details" ? "Details" : "Enrollments"}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Details tab */}
                                {panelTab === "details" && (
                                    <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                                        <p className="text-xs text-[#121212]/80 font-light leading-relaxed bg-[#F4F1EA]/30 p-4 border border-[#121212]/5 rounded-lg">
                                            {selectedClass.description || "No description provided."}
                                        </p>
                                        <div className="space-y-3 text-xs">
                                            {/* Facilitator — editable */}
                                            <div className="p-4 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[#8A817C] text-[10px] font-semibold uppercase tracking-widest">
                                                        Facilitator
                                                    </span>
                                                    {!editingFacilitator ? (
                                                        <button
                                                            onClick={startEditFacilitator}
                                                            className="text-[10px] font-semibold uppercase tracking-wider text-[#8A817C] hover:text-[#121212] transition-colors flex items-center gap-1"
                                                        >
                                                            <Pencil className="w-3 h-3" /> Change
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={handleSaveFacilitator}
                                                                disabled={isSubmitting}
                                                                className="text-[10px] font-semibold uppercase tracking-wider text-green-700 hover:text-green-800 disabled:opacity-40"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingFacilitator(false)}
                                                                className="text-[10px] font-semibold uppercase tracking-wider text-[#8A817C] hover:text-[#121212]"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                {editingFacilitator ? (
                                                    <PersonCombobox
                                                        options={facilitatorOptions}
                                                        value={facilitatorDraft}
                                                        onChange={setFacilitatorDraft}
                                                        placeholder="Search workers by name…"
                                                    />
                                                ) : (
                                                    <div className="font-mono">
                                                        <span className="font-medium text-[#121212]">
                                                            {selectedClass.facilitator ? fullName(selectedClass.facilitator) : "—"}
                                                        </span>
                                                        <div className="text-[#8A817C] mt-0.5">{selectedClass.facilitator?.email ?? ""}</div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-4 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-lg font-mono">
                                                <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">
                                                    Duration
                                                </span>
                                                <span className="text-[#121212]">
                                                    {formatDate(selectedClass.startDate)} — {formatDate(selectedClass.endDate)}
                                                </span>
                                            </div>
                                        </div>

                                        {selectedClass.status !== "CLOSED" && (
                                            <div className="border-t border-[#121212]/5 pt-4 space-y-2">
                                                {closeSuccess && (
                                                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700">
                                                        <CheckCircle2 className="w-4 h-4 shrink-0" />{closeSuccess}
                                                    </div>
                                                )}
                                                {closeError && (
                                                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                                                        {closeError}
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => handleCloseClass(selectedClass.id)}
                                                    disabled={isSubmitting}
                                                    className="w-full h-10 border border-[#121212]/20 text-[#121212] text-xs font-semibold uppercase tracking-widest hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors disabled:opacity-40 rounded-lg"
                                                >
                                                    Close This Class
                                                </button>
                                                <p className="text-[10px] text-[#8A817C] text-center">
                                                    Marks the class closed and completes all in-progress enrollments
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Enrollments tab */}
                                {panelTab === "enrollments" && (
                                    <div className="p-5 flex-1 overflow-y-auto space-y-4">

                                        {/* Enroll form — hidden when class is closed */}
                                        {selectedClass.status !== "CLOSED" && (
                                        <div className="bg-[#F4F1EA]/20 border border-[#121212]/10 p-4 rounded-xl space-y-3">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212] flex items-center gap-2">
                                                <UserPlus className="w-3.5 h-3.5 text-[#8A817C]" />
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

                                            <form onSubmit={handleEnroll} className="space-y-2">
                                                <PersonCombobox
                                                    options={enrollableOptions}
                                                    value={enrollMemberId}
                                                    onChange={setEnrollMemberId}
                                                    placeholder="Search members by name…"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting || !enrollMemberId}
                                                    className="w-full h-9 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 rounded-lg"
                                                >
                                                    {isSubmitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                                                    Enroll Member
                                                </button>
                                            </form>
                                        </div>
                                        )}

                                        {/* Enrollment list */}
                                        <div className="border border-[#121212]/10 rounded-xl overflow-hidden">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Member</th>
                                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden sm:table-cell">Enrolled</th>
                                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                                    {enrollmentsLoading ? (
                                                        Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={3} />)
                                                    ) : enrollments.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={3} className="p-8 text-center text-xs text-[#8A817C] font-light">
                                                                No enrollments yet.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        enrollments.map((enr) => (
                                                            <tr key={enr.id} className="hover:bg-[#F4F1EA]/10 transition-colors">
                                                                <td className="p-3">
                                                                    <div className="text-xs font-medium text-[#121212]">
                                                                        {fullName(enr.member)}
                                                                    </div>
                                                                    <div className="text-[11px] font-mono text-[#8A817C] mt-0.5 truncate max-w-[120px]">
                                                                        {enr.member.email}
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 text-[11px] font-mono text-[#8A817C] hidden sm:table-cell">
                                                                    {formatDate(enr.enrolledAt)}
                                                                    {enr.completedAt && (
                                                                        <div className="text-green-700 mt-0.5">
                                                                            ✓ {formatDate(enr.completedAt)}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="p-3">
                                                                    <select
                                                                        value={enr.status}
                                                                        onChange={(e) =>
                                                                            handleStatusChange(enr.id, e.target.value as EnrollmentStatus)
                                                                        }
                                                                        disabled={isSubmitting}
                                                                        className="h-7 px-2 bg-white border border-[#121212]/10 text-[10px] text-[#121212] focus:outline-none rounded-md appearance-none disabled:opacity-50 w-full"
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

                                        <PaginationBar
                                            pagination={enrollmentsPagination}
                                            onPage={(p) => loadEnrollments(selectedClass.id, p)}
                                            isLoading={enrollmentsLoading}
                                            label="enrollments"
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default withAuth(ClassesPage, { requiredPermission: 'classes:read' });
