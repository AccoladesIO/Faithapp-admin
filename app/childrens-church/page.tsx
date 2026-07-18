"use client";

import React, { useState, useEffect } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    Baby, Plus, X, Check, Pencil, Trash2, RefreshCw, Flag, ClipboardList, History,
} from "lucide-react";
import {
    useChildrenChurch,
    ChildAgeGroup,
    ChildClassGroup,
    ChildCheckIn,
    ChildCheckInStatusEnum,
} from "@/hooks/use-children-church";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { DismissibleError } from "@/components/ui/dismissible-error";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

type Tab = "age-groups" | "class-groups" | "check-ins";

function SkeletonRow({ cols }: { cols: number }) {
    return (
        <tr className="border-b border-[#121212]/5 animate-pulse">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="p-4">
                    <div className="h-3 bg-[#F4F1EA] rounded w-3/4" />
                </td>
            ))}
        </tr>
    );
}


const inputCls = "w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg";
const labelCls = "block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5";
const submitBtnCls = "w-full h-11 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded-xl";

const ChildrensChurchPage = () => {
    const hook = useChildrenChurch(20);
    const {
        ageGroups, classGroups, activeCheckIns, checkInHistory, checkInHistoryPagination,
        isLoading, isSubmitting, error,
        fetchAgeGroups, createAgeGroup, updateAgeGroup, deleteAgeGroup,
        fetchClassGroups, createClassGroup, updateClassGroup, deleteClassGroup,
        fetchActiveCheckInsAdmin, fetchCheckInHistory, flagCheckIn,
    } = hook;

    const [tab, setTab] = useState<Tab>("age-groups");
    const [checkInSubTab, setCheckInSubTab] = useState<"active" | "history">("active");
    const [historyStatusFilter, setHistoryStatusFilter] = useState<ChildCheckInStatusEnum | "">("");
    const [historyClassFilter, setHistoryClassFilter] = useState("");
    const [historyPage, setHistoryPage] = useState(1);
    const [activeClassFilter, setActiveClassFilter] = useState("");

    useEffect(() => {
        if (tab === "age-groups") fetchAgeGroups();
        else if (tab === "class-groups") { fetchAgeGroups(); fetchClassGroups(); }
        else if (tab === "check-ins") {
            fetchAgeGroups();
            fetchClassGroups();
            if (checkInSubTab === "active") fetchActiveCheckInsAdmin(activeClassFilter || undefined);
            else fetchCheckInHistory({ page: historyPage, status: historyStatusFilter || undefined, classGroupId: historyClassFilter || undefined });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, checkInSubTab]);



    const [ageGroupForm, setAgeGroupForm] = useState({ name: "", minAgeMonths: "", maxAgeMonths: "", displayOrder: "" });
    const [ageGroupFormError, setAgeGroupFormError] = useState<string | null>(null);
    const [editingAgeGroup, setEditingAgeGroup] = useState<ChildAgeGroup | null>(null);
    const [editAgeGroupForm, setEditAgeGroupForm] = useState({ name: "", minAgeMonths: "", maxAgeMonths: "", displayOrder: "" });
    const [deletingAgeGroupId, setDeletingAgeGroupId] = useState<string | null>(null);

    const handleCreateAgeGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        setAgeGroupFormError(null);
        try {
            await createAgeGroup({
                name: ageGroupForm.name,
                minAgeMonths: Number(ageGroupForm.minAgeMonths),
                maxAgeMonths: Number(ageGroupForm.maxAgeMonths),
                ...(ageGroupForm.displayOrder ? { displayOrder: Number(ageGroupForm.displayOrder) } : {}),
            });
            setAgeGroupForm({ name: "", minAgeMonths: "", maxAgeMonths: "", displayOrder: "" });
        } catch (err: unknown) {
            const e = err as ApiError;
            setAgeGroupFormError(e?.message ?? "Failed to create age group.");
        }
    };

    const handleSaveEditAgeGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAgeGroup) return;
        try {
            await updateAgeGroup(editingAgeGroup.id, {
                name: editAgeGroupForm.name,
                minAgeMonths: Number(editAgeGroupForm.minAgeMonths),
                maxAgeMonths: Number(editAgeGroupForm.maxAgeMonths),
                ...(editAgeGroupForm.displayOrder ? { displayOrder: Number(editAgeGroupForm.displayOrder) } : {}),
            });
            setEditingAgeGroup(null);
        } catch {
            // surfaced via hook
        }
    };

    const handleDeleteAgeGroup = async (id: string) => {
        try {
            await deleteAgeGroup(id);
            setDeletingAgeGroupId(null);
        } catch {
            // surfaced via hook
        }
    };

    const [classGroupForm, setClassGroupForm] = useState({ ageGroupId: "", name: "", capacity: "", teacherNote: "" });
    const [classGroupFormError, setClassGroupFormError] = useState<string | null>(null);
    const [editingClassGroup, setEditingClassGroup] = useState<ChildClassGroup | null>(null);
    const [editClassGroupForm, setEditClassGroupForm] = useState({ ageGroupId: "", name: "", capacity: "", teacherNote: "" });
    const [deletingClassGroupId, setDeletingClassGroupId] = useState<string | null>(null);
    const [classGroupAgeFilter, setClassGroupAgeFilter] = useState("");

    const handleCreateClassGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        setClassGroupFormError(null);
        try {
            await createClassGroup({
                ageGroupId: classGroupForm.ageGroupId,
                name: classGroupForm.name,
                ...(classGroupForm.capacity ? { capacity: Number(classGroupForm.capacity) } : {}),
                ...(classGroupForm.teacherNote ? { teacherNote: classGroupForm.teacherNote } : {}),
            });
            setClassGroupForm({ ageGroupId: "", name: "", capacity: "", teacherNote: "" });
        } catch (err: unknown) {
            const e = err as ApiError;
            setClassGroupFormError(e?.message ?? "Failed to create class group.");
        }
    };

    const handleSaveEditClassGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClassGroup) return;
        try {
            await updateClassGroup(editingClassGroup.id, {
                ageGroupId: editClassGroupForm.ageGroupId || undefined,
                name: editClassGroupForm.name,
                ...(editClassGroupForm.capacity ? { capacity: Number(editClassGroupForm.capacity) } : {}),
                ...(editClassGroupForm.teacherNote ? { teacherNote: editClassGroupForm.teacherNote } : {}),
            });
            setEditingClassGroup(null);
        } catch {
            // surfaced via hook
        }
    };

    const handleDeleteClassGroup = async (id: string) => {
        try {
            await deleteClassGroup(id);
            setDeletingClassGroupId(null);
        } catch {
            // surfaced via hook
        }
    };

    const filteredClassGroups = classGroupAgeFilter
        ? classGroups.filter((g) => g.ageGroup?.id === classGroupAgeFilter)
        : classGroups;

    const [flaggingCheckIn, setFlaggingCheckIn] = useState<ChildCheckIn | null>(null);
    const [flagReason, setFlagReason] = useState("");
    const [flagError, setFlagError] = useState<string | null>(null);

    const handleFlagCheckIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!flaggingCheckIn) return;
        setFlagError(null);
        try {
            await flagCheckIn(flaggingCheckIn.id, flagReason);
            setFlaggingCheckIn(null);
            setFlagReason("");
        } catch (err: unknown) {
            const e = err as ApiError;
            setFlagError(e?.message ?? "Failed to flag check-in.");
        }
    };

    const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: "age-groups", label: "Age Groups", icon: <Baby className="w-3.5 h-3.5" /> },
        { key: "class-groups", label: "Class Groups", icon: <ClipboardList className="w-3.5 h-3.5" /> },
        { key: "check-ins", label: "Check-ins", icon: <Flag className="w-3.5 h-3.5" /> },
    ];

    return (
        <div className="space-y-10 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Children&#39;s Church</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Manage children, guardians, check-ins, and class groups
                    </p>
                </div>
                <button
                    onClick={() => {
                        if (tab === "age-groups") fetchAgeGroups();
                        else if (tab === "class-groups") fetchClassGroups(classGroupAgeFilter || undefined);
                        else if (checkInSubTab === "active") fetchActiveCheckInsAdmin(activeClassFilter || undefined);
                        else fetchCheckInHistory({ page: historyPage, status: historyStatusFilter || undefined, classGroupId: historyClassFilter || undefined });
                    }}
                    disabled={isLoading}
                    className="p-2 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-40 self-start sm:self-auto"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                </button>
            </div>

            <DismissibleError message={error} />

            <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl w-fit flex-wrap gap-0.5">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${tab === t.key ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                    >
                        {t.icon}
                        {t.label}
                    </button>
                ))}
            </div>



            {tab === "age-groups" && (
                <div className="space-y-6">
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 space-y-4">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[#121212]">Add Age Group</h2>
                        {ageGroupFormError && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                                <X className="w-4 h-4 shrink-0" />{ageGroupFormError}
                            </div>
                        )}
                        <form onSubmit={handleCreateAgeGroup} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                            <div>
                                <label className={labelCls}>Name</label>
                                <input
                                    type="text"
                                    required
                                    value={ageGroupForm.name}
                                    onChange={(e) => setAgeGroupForm((p) => ({ ...p, name: e.target.value }))}
                                    placeholder="e.g., Nursery"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Min Age (months)</label>
                                <input
                                    type="number"
                                    required
                                    min={0}
                                    value={ageGroupForm.minAgeMonths}
                                    onChange={(e) => setAgeGroupForm((p) => ({ ...p, minAgeMonths: e.target.value }))}
                                    placeholder="0"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Max Age (months)</label>
                                <input
                                    type="number"
                                    required
                                    min={0}
                                    value={ageGroupForm.maxAgeMonths}
                                    onChange={(e) => setAgeGroupForm((p) => ({ ...p, maxAgeMonths: e.target.value }))}
                                    placeholder="36"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Display Order</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        min={0}
                                        value={ageGroupForm.displayOrder}
                                        onChange={(e) => setAgeGroupForm((p) => ({ ...p, displayOrder: e.target.value }))}
                                        placeholder="Optional"
                                        className={inputCls}
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="shrink-0 h-10 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 rounded-lg flex items-center gap-1.5"
                                    >
                                        {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                        Add
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className={`${editingAgeGroup ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden transition-all`}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Name</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Age Range</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden sm:table-cell">Display Order</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                        {isLoading ? (
                                            Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                                        ) : ageGroups.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                                    No age groups configured.
                                                </td>
                                            </tr>
                                        ) : (
                                            ageGroups.map((ag) => (
                                                <tr key={ag.id} className={`hover:bg-[#F4F1EA]/10 transition-colors ${editingAgeGroup?.id === ag.id ? "bg-[#F4F1EA]/50" : ""}`}>
                                                    <td className="p-4 text-sm font-medium text-[#121212]">{ag.name}</td>
                                                    <td className="p-4 text-xs font-mono text-[#121212]">
                                                        {ag.minAgeMonths}–{ag.maxAgeMonths} mo
                                                    </td>
                                                    <td className="p-4 text-xs font-mono text-[#8A817C] hidden sm:table-cell">
                                                        {ag.displayOrder ?? "—"}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        {deletingAgeGroupId === ag.id ? (
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button
                                                                    onClick={() => handleDeleteAgeGroup(ag.id)}
                                                                    disabled={isSubmitting}
                                                                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
                                                                >
                                                                    Confirm
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeletingAgeGroupId(null)}
                                                                    className="p-2 text-[#8A817C] hover:bg-[#F4F1EA] rounded-lg"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingAgeGroup(ag);
                                                                        setEditAgeGroupForm({
                                                                            name: ag.name,
                                                                            minAgeMonths: String(ag.minAgeMonths),
                                                                            maxAgeMonths: String(ag.maxAgeMonths),
                                                                            displayOrder: ag.displayOrder != null ? String(ag.displayOrder) : "",
                                                                        });
                                                                    }}
                                                                    className="p-2 text-[#8A817C] hover:text-[#121212] rounded-lg hover:bg-[#F4F1EA] transition-colors"
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeletingAgeGroupId(ag.id)}
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
                        </div>

                        {editingAgeGroup && (
                            <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
                                <div className="flex items-center justify-between px-5 py-4 border-b border-[#121212]/5">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">Edit</p>
                                        <h2 className="text-sm font-light text-[#121212]">{editingAgeGroup.name}</h2>
                                    </div>
                                    <button onClick={() => setEditingAgeGroup(null)} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 rounded-md transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <form onSubmit={handleSaveEditAgeGroup} className="p-5 space-y-4">
                                    <div>
                                        <label className={labelCls}>Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={editAgeGroupForm.name}
                                            onChange={(e) => setEditAgeGroupForm((p) => ({ ...p, name: e.target.value }))}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelCls}>Min Age (months)</label>
                                            <input
                                                type="number"
                                                required
                                                min={0}
                                                value={editAgeGroupForm.minAgeMonths}
                                                onChange={(e) => setEditAgeGroupForm((p) => ({ ...p, minAgeMonths: e.target.value }))}
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Max Age (months)</label>
                                            <input
                                                type="number"
                                                required
                                                min={0}
                                                value={editAgeGroupForm.maxAgeMonths}
                                                onChange={(e) => setEditAgeGroupForm((p) => ({ ...p, maxAgeMonths: e.target.value }))}
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Display Order <span className="normal-case font-light">(optional)</span></label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={editAgeGroupForm.displayOrder}
                                            onChange={(e) => setEditAgeGroupForm((p) => ({ ...p, displayOrder: e.target.value }))}
                                            placeholder="Optional"
                                            className={inputCls}
                                        />
                                    </div>
                                    <div className="flex gap-3 justify-end pt-2 border-t border-[#121212]/5">
                                        <button
                                            type="button"
                                            onClick={() => setEditingAgeGroup(null)}
                                            className="h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={isSubmitting} className={submitBtnCls.replace("w-full h-11", "h-9 px-5")}>
                                            {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {tab === "class-groups" && (
                <div className="space-y-6">
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 space-y-4">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[#121212]">Add Class Group</h2>
                        {classGroupFormError && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                                <X className="w-4 h-4 shrink-0" />{classGroupFormError}
                            </div>
                        )}
                        <form onSubmit={handleCreateClassGroup} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Age Group</label>
                                <select
                                    required
                                    value={classGroupForm.ageGroupId}
                                    onChange={(e) => setClassGroupForm((p) => ({ ...p, ageGroupId: e.target.value }))}
                                    className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                >
                                    <option value="">Select age group…</option>
                                    {ageGroups.map((ag) => (
                                        <option key={ag.id} value={ag.id}>{ag.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Name</label>
                                <input
                                    type="text"
                                    required
                                    value={classGroupForm.name}
                                    onChange={(e) => setClassGroupForm((p) => ({ ...p, name: e.target.value }))}
                                    placeholder="e.g., Sunbeams"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Capacity (optional)</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={classGroupForm.capacity}
                                    onChange={(e) => setClassGroupForm((p) => ({ ...p, capacity: e.target.value }))}
                                    placeholder="e.g., 20"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Teacher Note (optional)</label>
                                <input
                                    type="text"
                                    value={classGroupForm.teacherNote}
                                    onChange={(e) => setClassGroupForm((p) => ({ ...p, teacherNote: e.target.value }))}
                                    placeholder="Any note for the teacher…"
                                    className={inputCls}
                                />
                            </div>
                            <div className="sm:col-span-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 rounded-lg flex items-center gap-2"
                                >
                                    {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                    Add Class Group
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Filter by Age Group</label>
                        <select
                            value={classGroupAgeFilter}
                            onChange={(e) => {
                                setClassGroupAgeFilter(e.target.value);
                                fetchClassGroups(e.target.value || undefined);
                            }}
                            className="h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                        >
                            <option value="">All</option>
                            {ageGroups.map((ag) => (
                                <option key={ag.id} value={ag.id}>{ag.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className={`${editingClassGroup ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden transition-all`}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Name</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Age Group</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden sm:table-cell">Capacity</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                        {isLoading ? (
                                            Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                                        ) : filteredClassGroups.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                                    No class groups found.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredClassGroups.map((cg) => (
                                                <tr key={cg.id} className={`hover:bg-[#F4F1EA]/10 transition-colors ${editingClassGroup?.id === cg.id ? "bg-[#F4F1EA]/50" : ""}`}>
                                                    <td className="p-4 text-sm font-medium text-[#121212]">{cg.name}</td>
                                                    <td className="p-4 text-xs text-[#121212]">{cg.ageGroup?.name ?? "—"}</td>
                                                    <td className="p-4 text-xs font-mono text-[#8A817C] hidden sm:table-cell">{cg.capacity ?? "—"}</td>
                                                    <td className="p-4 text-right">
                                                        {deletingClassGroupId === cg.id ? (
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button
                                                                    onClick={() => handleDeleteClassGroup(cg.id)}
                                                                    disabled={isSubmitting}
                                                                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
                                                                >
                                                                    Confirm
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeletingClassGroupId(null)}
                                                                    className="p-2 text-[#8A817C] hover:bg-[#F4F1EA] rounded-lg"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingClassGroup(cg);
                                                                        setEditClassGroupForm({
                                                                            ageGroupId: cg.ageGroup?.id ?? "",
                                                                            name: cg.name,
                                                                            capacity: cg.capacity != null ? String(cg.capacity) : "",
                                                                            teacherNote: cg.teacherNote ?? "",
                                                                        });
                                                                    }}
                                                                    className="p-2 text-[#8A817C] hover:text-[#121212] rounded-lg hover:bg-[#F4F1EA] transition-colors"
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeletingClassGroupId(cg.id)}
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
                        </div>

                        {editingClassGroup && (
                            <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
                                <div className="flex items-center justify-between px-5 py-4 border-b border-[#121212]/5">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">Edit</p>
                                        <h2 className="text-sm font-light text-[#121212]">{editingClassGroup.name}</h2>
                                    </div>
                                    <button onClick={() => setEditingClassGroup(null)} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 rounded-md transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <form onSubmit={handleSaveEditClassGroup} className="p-5 space-y-4">
                                    <div>
                                        <label className={labelCls}>Age Group</label>
                                        <select
                                            value={editClassGroupForm.ageGroupId}
                                            onChange={(e) => setEditClassGroupForm((p) => ({ ...p, ageGroupId: e.target.value }))}
                                            className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                        >
                                            <option value="">Select age group…</option>
                                            {ageGroups.map((ag) => (
                                                <option key={ag.id} value={ag.id}>{ag.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={editClassGroupForm.name}
                                            onChange={(e) => setEditClassGroupForm((p) => ({ ...p, name: e.target.value }))}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelCls}>Capacity <span className="normal-case font-light">(optional)</span></label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={editClassGroupForm.capacity}
                                                onChange={(e) => setEditClassGroupForm((p) => ({ ...p, capacity: e.target.value }))}
                                                placeholder="e.g., 20"
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Teacher Note <span className="normal-case font-light">(optional)</span></label>
                                            <input
                                                type="text"
                                                value={editClassGroupForm.teacherNote}
                                                onChange={(e) => setEditClassGroupForm((p) => ({ ...p, teacherNote: e.target.value }))}
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 justify-end pt-2 border-t border-[#121212]/5">
                                        <button
                                            type="button"
                                            onClick={() => setEditingClassGroup(null)}
                                            className="h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={isSubmitting} className={submitBtnCls.replace("w-full h-11", "h-9 px-5")}>
                                            {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}

        {/* ── Check-ins Tab ───────────────────────────────────────────────────── */}
            {tab === "check-ins" && (
                <div className="space-y-4">
                    {/* Sub-tab toggle */}
                    <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl w-fit gap-0.5">
                        <button
                            onClick={() => setCheckInSubTab("active")}
                            className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${checkInSubTab === "active" ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                        >
                            <Flag className="w-3.5 h-3.5" /> Active
                        </button>
                        <button
                            onClick={() => setCheckInSubTab("history")}
                            className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${checkInSubTab === "history" ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                        >
                            <History className="w-3.5 h-3.5" /> History
                        </button>
                    </div>

                    {/* ── Active sub-tab ── */}
                    {checkInSubTab === "active" && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <label className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Class Group</label>
                                <select
                                    value={activeClassFilter}
                                    onChange={(e) => {
                                        setActiveClassFilter(e.target.value);
                                        fetchActiveCheckInsAdmin(e.target.value || undefined);
                                    }}
                                    className="h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                >
                                    <option value="">All Classes</option>
                                    {classGroups.map((cg) => (
                                        <option key={cg.id} value={cg.id}>{cg.name}</option>
                                    ))}
                                </select>
                                <span className="text-[11px] text-[#8A817C] font-light">{activeCheckIns.length} currently checked in</span>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                <div className={`${flaggingCheckIn ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden transition-all`}>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-[#121212]/5 bg-[#F4F1EA]/30">
                                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Child</th>
                                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden sm:table-cell">Class</th>
                                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Status</th>
                                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden md:table-cell">Pickup Code</th>
                                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden lg:table-cell">Checked In</th>
                                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {isLoading ? (
                                                    Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                                                ) : activeCheckIns.length === 0 ? (
                                                    <tr><td colSpan={6} className="p-8 text-center text-sm text-[#8A817C] font-light">No children are currently checked in.</td></tr>
                                                ) : activeCheckIns.map((ci) => (
                                                    <tr key={ci.id} className={`border-b border-[#121212]/5 hover:bg-[#F4F1EA]/20 transition-colors ${flaggingCheckIn?.id === ci.id ? "bg-[#F4F1EA]/50" : ""}`}>
                                                        <td className="p-4">
                                                            <div className="text-sm text-[#121212] font-light">{ci.child.firstname} {ci.child.lastname}</div>
                                                            {ci.droppedOffByName && <div className="text-[10px] text-[#8A817C]">Drop-off: {ci.droppedOffByName}</div>}
                                                        </td>
                                                        <td className="p-4 text-xs text-[#8A817C] font-light hidden sm:table-cell">{ci.child.classGroup?.name ?? "—"}</td>
                                                        <td className="p-4">
                                                            <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${ci.status === "FLAGGED" ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                                                                {ci.status === "FLAGGED" ? "Flagged" : "Checked In"}
                                                            </span>
                                                            {ci.flagReason && <div className="text-[10px] text-red-600 mt-0.5">{ci.flagReason}</div>}
                                                        </td>
                                                        <td className="p-4 text-xs font-mono text-[#8A817C] hidden md:table-cell">{ci.pickupCode}</td>
                                                        <td className="p-4 text-xs text-[#8A817C] font-light hidden lg:table-cell">
                                                            {new Date(ci.checkinTime).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}
                                                        </td>
                                                        <td className="p-4">
                                                            {ci.status !== "FLAGGED" && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setFlaggingCheckIn(ci); setFlagReason(""); setFlagError(null); }}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                >
                                                                    <Flag className="w-3 h-3" /> Flag
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {flaggingCheckIn && (
                                    <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
                                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#121212]/5">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">Flag Check-in</p>
                                                <h2 className="text-sm font-light text-[#121212]">{flaggingCheckIn.child.firstname} {flaggingCheckIn.child.lastname}</h2>
                                            </div>
                                            <button onClick={() => { setFlaggingCheckIn(null); setFlagReason(""); setFlagError(null); }} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 rounded-md transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <form onSubmit={handleFlagCheckIn} className="p-5 space-y-4">
                                            {flagError && (
                                                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">{flagError}</div>
                                            )}
                                            <div>
                                                <label htmlFor="flag-reason" className={labelCls}>Reason for flagging</label>
                                                <input
                                                    id="flag-reason"
                                                    type="text"
                                                    required
                                                    value={flagReason}
                                                    onChange={(e) => setFlagReason(e.target.value)}
                                                    placeholder="e.g. Unauthorised pickup attempt"
                                                    className={inputCls}
                                                />
                                            </div>
                                            <div className="flex gap-3 justify-end pt-2 border-t border-[#121212]/5">
                                                <button
                                                    type="button"
                                                    onClick={() => { setFlaggingCheckIn(null); setFlagReason(""); setFlagError(null); }}
                                                    className="h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button type="submit" disabled={isSubmitting} className="h-9 px-5 bg-red-600 text-white text-xs font-semibold uppercase tracking-widest hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2 rounded-lg">
                                                    {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
                                                    Flag Check-in
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── History sub-tab ── */}
                    {checkInSubTab === "history" && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <label className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Status</label>
                                <select
                                    value={historyStatusFilter}
                                    onChange={(e) => {
                                        const val = e.target.value as ChildCheckInStatusEnum | "";
                                        setHistoryStatusFilter(val);
                                        setHistoryPage(1);
                                        fetchCheckInHistory({ page: 1, status: val || undefined, classGroupId: historyClassFilter || undefined });
                                    }}
                                    className="h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="CHECKED_IN">Checked In</option>
                                    <option value="CHECKED_OUT">Checked Out</option>
                                    <option value="FLAGGED">Flagged</option>
                                </select>
                                <label className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Class</label>
                                <select
                                    value={historyClassFilter}
                                    onChange={(e) => {
                                        setHistoryClassFilter(e.target.value);
                                        setHistoryPage(1);
                                        fetchCheckInHistory({ page: 1, status: historyStatusFilter || undefined, classGroupId: e.target.value || undefined });
                                    }}
                                    className="h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                >
                                    <option value="">All Classes</option>
                                    {classGroups.map((cg) => (
                                        <option key={cg.id} value={cg.id}>{cg.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[#121212]/5 bg-[#F4F1EA]/30">
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Child</th>
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden sm:table-cell">Class</th>
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Status</th>
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden md:table-cell">Pickup Code</th>
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden lg:table-cell">Check-in</th>
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden lg:table-cell">Check-out</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {isLoading ? (
                                                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                                            ) : checkInHistory.length === 0 ? (
                                                <tr><td colSpan={6} className="p-8 text-center text-sm text-[#8A817C] font-light">No check-in records found.</td></tr>
                                            ) : checkInHistory.map((ci) => (
                                                <tr key={ci.id} className="border-b border-[#121212]/5 hover:bg-[#F4F1EA]/20 transition-colors">
                                                    <td className="p-4">
                                                        <div className="text-sm text-[#121212] font-light">{ci.child.firstname} {ci.child.lastname}</div>
                                                        {ci.droppedOffByName && <div className="text-[10px] text-[#8A817C]">Drop-off: {ci.droppedOffByName}</div>}
                                                        {ci.pickedUpByName && <div className="text-[10px] text-[#8A817C]">Pick-up: {ci.pickedUpByName}</div>}
                                                    </td>
                                                    <td className="p-4 text-xs text-[#8A817C] font-light hidden sm:table-cell">{ci.child.classGroup?.name ?? "—"}</td>
                                                    <td className="p-4">
                                                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${ci.status === "FLAGGED" ? "bg-red-50 text-red-700 border-red-200" : ci.status === "CHECKED_OUT" ? "bg-[#F4F1EA] text-[#8A817C] border-[#121212]/10" : "bg-green-50 text-green-700 border-green-200"}`}>
                                                            {ci.status === "FLAGGED" ? "Flagged" : ci.status === "CHECKED_OUT" ? "Checked Out" : "Checked In"}
                                                        </span>
                                                        {ci.flagReason && <div className="text-[10px] text-red-600 mt-0.5">{ci.flagReason}</div>}
                                                    </td>
                                                    <td className="p-4 text-xs font-mono text-[#8A817C] hidden md:table-cell">{ci.pickupCode}</td>
                                                    <td className="p-4 text-xs text-[#8A817C] font-light hidden lg:table-cell">
                                                        {new Date(ci.checkinTime).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}
                                                    </td>
                                                    <td className="p-4 text-xs text-[#8A817C] font-light hidden lg:table-cell">
                                                        {ci.checkoutTime ? new Date(ci.checkoutTime).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }) : "—"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {checkInHistoryPagination && checkInHistoryPagination.totalPages > 1 && (
                                    <div className="p-4 border-t border-[#121212]/5">
                                        <PaginationBar
                                            pagination={checkInHistoryPagination}
                                            onPage={(p) => {
                                                setHistoryPage(p);
                                                fetchCheckInHistory({ page: p, status: historyStatusFilter || undefined, classGroupId: historyClassFilter || undefined });
                                            }}
                                        />
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

export default withAuth(ChildrensChurchPage, { requiredPermission: 'children_church:read' });
