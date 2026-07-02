"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    Network, Search, Plus, UserPlus, X, Briefcase,
    ShieldCheck, ArrowUpDown, ChevronLeft, ChevronRight,
    Eye, RefreshCw, Pencil, Trash2, Check, Users,
    ShieldAlert, CheckCircle2,
} from "lucide-react";
import {
    useDepartments,
    Department,
    DepartmentLead,
    DepartmentWorker,
} from "@/hooks/use-departments";
import { useMembers } from "@/hooks/use-member";
import Error from "@/components/layout/error";
import { TableEmptyState } from "@/components/ui/table-empty-state";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fullName = (o: { firstname: string; lastname: string }) =>
    [o.firstname, o.lastname].filter(Boolean).join(" ");

const formatKey = (key: string) =>
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// ─── Skeleton ─────────────────────────────────────────────────────────────────

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

// ─── Default forms ────────────────────────────────────────────────────────────

const defaultCreateForm = { name: "", description: "", key: "" };

function isWorkerInDept(m: { role: string; workerProfile: any }, deptId: string): boolean {
    if (m.role !== "WORKER") return false;
    const primary = m.workerProfile?.department?.id;
    const secondary = m.workerProfile?.secondaryDepartment?.id;
    return primary === deptId || secondary === deptId;
}

// ─── Main page ────────────────────────────────────────────────────────────────

type SortKey = "name" | "key" | "createdAt";
type SortOrder = "asc" | "desc";
type PanelTab = "details" | "workers";

export default withAuth(function DepartmentsPage() {
    const {
        departments,
        departmentKeys,
        isLoading,
        isSubmitting,
        error,
        fetchDepartments,
        createDepartment,
        updateDepartment,
        deleteDepartment,
        assignLead,
        removeLead,
        fetchDepartmentLeads,
        fetchDepartmentWorkers,
    } = useDepartments();

    const { members } = useMembers(100);

    // ── Table state ───────────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("name");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // ── Create form ───────────────────────────────────────────────────────────
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createForm, setCreateForm] = useState(defaultCreateForm);

    // ── Edit state ────────────────────────────────────────────────────────────
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState(defaultCreateForm);

    // ── Delete confirm ────────────────────────────────────────────────────────
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // ── Detail panel ──────────────────────────────────────────────────────────
    const [selectedDept, setSelectedDept] = useState<Department | null>(null);
    const [panelTab, setPanelTab] = useState<PanelTab>("details");
    const [leads, setLeads] = useState<DepartmentLead[]>([]);
    const [leadsLoading, setLeadsLoading] = useState(false);
    const [workers, setWorkers] = useState<DepartmentWorker[]>([]);
    const [workersLoading, setWorkersLoading] = useState(false);
    const [workersPagination, setWorkersPagination] = useState<any>(null);
    const [workersPage, setWorkersPage] = useState(1);

    // ── Assign/remove lead ────────────────────────────────────────────────────
    const [assignType, setAssignType] = useState<"head" | "assistant">("head");
    const [assignMemberId, setAssignMemberId] = useState("");
    const [leadSuccess, setLeadSuccess] = useState<string | null>(null);
    const [leadError, setLeadError] = useState<string | null>(null);

    // ── Feedback ──────────────────────────────────────────────────────────────
    const [createSuccess, setCreateSuccess] = useState<string | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);

    // ── Sort + filter ─────────────────────────────────────────────────────────
    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
        else { setSortKey(key); setSortOrder("asc"); }
    };

    const processed = useMemo(() => {
        let result = [...departments];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (d) =>
                    d.name.toLowerCase().includes(q) ||
                    d.key.toLowerCase().includes(q) ||
                    d.id.toLowerCase().includes(q)
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
    }, [departments, searchQuery, sortKey, sortOrder]);

    const totalPages = Math.ceil(processed.length / itemsPerPage);
    const paginated = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return processed.slice(start, start + itemsPerPage);
    }, [processed, currentPage]);

    // ── Load leads ────────────────────────────────────────────────────────────
    const loadLeads = useCallback(async (deptId: string) => {
        setLeadsLoading(true);
        const data = await fetchDepartmentLeads(deptId);
        setLeads(data);
        setLeadsLoading(false);
    }, [fetchDepartmentLeads]);

    // ── Load workers ──────────────────────────────────────────────────────────
    const loadWorkers = useCallback(async (deptId: string, page = 1) => {
        setWorkersLoading(true);
        const { workers, pagination } = await fetchDepartmentWorkers(deptId, page);
        setWorkers(workers);
        setWorkersPagination(pagination);
        setWorkersPage(page);
        setWorkersLoading(false);
    }, [fetchDepartmentWorkers]);

    // ── Select department ─────────────────────────────────────────────────────
    const selectDept = useCallback((dept: Department) => {
        setSelectedDept(dept);
        setShowCreateForm(false);
        setPanelTab("details");
        setLeadSuccess(null);
        setLeadError(null);
        setAssignMemberId("");
        setAssignType("head");
        loadLeads(dept.id);
        loadWorkers(dept.id, 1);
    }, [loadLeads, loadWorkers]);

    // ── Create ────────────────────────────────────────────────────────────────
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);
        setCreateSuccess(null);
        try {
            const created = await createDepartment(createForm);
            setCreateForm(defaultCreateForm);
            setSelectedDept(created);
            setShowCreateForm(false);
            setCreateSuccess("Department created successfully.");
            selectDept(created);
            setTimeout(() => setCreateSuccess(null), 3000);
        } catch (err: any) {
            setCreateError(err?.message ?? "Failed to create department.");
        }
    };

    // ── Edit ──────────────────────────────────────────────────────────────────
    const startEdit = (dept: Department) => {
        setEditingId(dept.id);
        setEditForm({ name: dept.name, description: dept.description ?? "", key: dept.key });
    };

    const handleUpdate = async (deptId: string) => {
        try {
            const updated = await updateDepartment(deptId, editForm);
            if (selectedDept?.id === deptId) setSelectedDept(updated);
            setEditingId(null);
        } catch {
            // error surfaced via hook
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = async (deptId: string) => {
        try {
            await deleteDepartment(deptId);
            if (selectedDept?.id === deptId) setSelectedDept(null);
            setDeletingId(null);
        } catch {
            // error surfaced via hook
        }
    };

    // ── Assign lead ───────────────────────────────────────────────────────────
    const handleAssignLead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDept || !assignMemberId) return;
        setLeadError(null);
        setLeadSuccess(null);
        try {
            await assignLead({
                departmentId: selectedDept.id,
                type: assignType,
                memberId: assignMemberId,
            });
            setAssignMemberId("");
            setLeadSuccess(`${assignType === "head" ? "Head" : "Assistant"} assigned successfully.`);
            loadLeads(selectedDept.id);
            setTimeout(() => setLeadSuccess(null), 3000);
        } catch (err: any) {
            setLeadError(err?.message ?? "Failed to assign lead.");
        }
    };

    // ── Remove lead ───────────────────────────────────────────────────────────
    const handleRemoveLead = async (type: "head" | "assistant") => {
        if (!selectedDept) return;
        setLeadError(null);
        setLeadSuccess(null);
        try {
            await removeLead({ departmentId: selectedDept.id, type });
            setLeadSuccess(`${type === "head" ? "Head" : "Assistant"} removed successfully.`);
            loadLeads(selectedDept.id);
            setTimeout(() => setLeadSuccess(null), 3000);
        } catch (err: any) {
            setLeadError(err?.message ?? "Failed to remove lead.");
        }
    };

    // ── Workers eligible for lead assignment in the selected department ───────
    const workerMembers = useMemo(() => {
        const deptId = selectedDept?.id;
        return deptId ? members.filter((m) => isWorkerInDept(m, deptId)) : [];
    }, [members, selectedDept]);

    const openCreateForm = () => {
        setShowCreateForm(true);
        setSelectedDept(null);
        setCreateError(null);
        setCreateSuccess(null);
        setEditingId(null);
        setDeletingId(null);
    };

    const closePanel = () => {
        setShowCreateForm(false);
        setSelectedDept(null);
        setEditingId(null);
        setDeletingId(null);
    };

    const panelOpen = showCreateForm || selectedDept !== null;

    return (
        <div className="space-y-10 font-sans">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                        Ministry Departments
                    </h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Create and manage ministry departments, assign leadership, and view team members
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[#8A817C]">{departments.length} department{departments.length !== 1 ? "s" : ""}</span>
                    <button
                        type="button"
                        onClick={openCreateForm}
                        className="flex items-center gap-1.5 h-9 px-4 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Department
                    </button>
                    <button
                        onClick={fetchDepartments}
                        disabled={isLoading}
                        className="p-2 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-40"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Global error */}
            {error && (
                <Error error={error} />
            )}

            {/* Search */}
            <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                <div className="w-full xl:max-w-md relative">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8A817C]" />
                    <input
                        type="text"
                        placeholder="Search by name, key, or ID..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="w-full h-11 pl-11 pr-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>
            </div>

            {/* List + contextual panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Table */}
                <div className={`${panelOpen ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col transition-all`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    <th
                                        onClick={() => handleSort("name")}
                                        className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212] select-none"
                                    >
                                        <div className="flex items-center space-x-1.5">
                                            <span>Department</span>
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort("key")}
                                        className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212] select-none"
                                    >
                                        <div className="flex items-center space-x-1.5">
                                            <span>Key</span>
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">
                                        Leadership
                                    </th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                {isLoading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <SkeletonRow key={i} cols={4} />
                                    ))
                                ) : paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center">
                                            <TableEmptyState
                                                title={
                                                    searchQuery.trim()
                                                        ? "No departments match the current search."
                                                        : "No departments yet."
                                                }
                                                action={
                                                    !searchQuery.trim()
                                                        ? { label: "Add Department", onClick: () => setShowCreateForm(true) }
                                                        : undefined
                                                }
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((dept) => (
                                        <tr
                                            key={dept.id}
                                            onClick={() => selectDept(dept)}
                                            className={`transition-colors cursor-pointer ${selectedDept?.id === dept.id
                                                    ? "bg-[#F4F1EA]/50"
                                                    : "hover:bg-[#F4F1EA]/10"
                                                }`}
                                        >
                                            <td className="p-4">
                                                {editingId === dept.id ? (
                                                    <input
                                                        value={editForm.name}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                                                        className="w-full h-8 px-2 bg-[#F4F1EA]/60 border border-[#121212]/20 text-sm text-[#121212] focus:outline-none focus:border-[#121212] rounded"
                                                    />
                                                ) : (
                                                    <>
                                                        <div className="text-sm font-medium text-[#121212]">{dept.name}</div>
                                                        <div className="text-xs text-[#8A817C] font-light mt-0.5 truncate max-w-[180px]">
                                                            {dept.description}
                                                        </div>
                                                    </>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {editingId === dept.id ? (
                                                    <select
                                                        value={editForm.key}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => setEditForm((p) => ({ ...p, key: e.target.value }))}
                                                        className="h-8 px-2 bg-[#F4F1EA]/60 border border-[#121212]/20 text-xs text-[#121212] focus:outline-none rounded appearance-none"
                                                    >
                                                        {departmentKeys.map((k) => (
                                                            <option key={k} value={k}>{formatKey(k)}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="inline-block px-2 py-0.5 bg-[#F4F1EA] border border-[#121212]/5 text-[#121212] text-[9px] font-bold uppercase tracking-wider rounded">
                                                        {formatKey(dept.key)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-xs font-mono text-[#8A817C]">
                                                {dept.leads?.length
                                                    ? dept.leads.map((l) => (
                                                        <div key={l.id} className="truncate max-w-[140px]">
                                                            {fullName(l)}
                                                        </div>
                                                    ))
                                                    : <span className="text-[#8A817C]/50 italic">No leads</span>}
                                            </td>
                                            <td
                                                className="p-4 text-right"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {editingId === dept.id ? (
                                                    <div className="flex items-center justify-end space-x-1">
                                                        <button
                                                            onClick={() => handleUpdate(dept.id)}
                                                            disabled={isSubmitting}
                                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg border border-transparent hover:border-green-100 transition-colors"
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
                                                ) : deletingId === dept.id ? (
                                                    <div className="flex items-center justify-end space-x-1">
                                                        <button
                                                            onClick={() => handleDelete(dept.id)}
                                                            disabled={isSubmitting}
                                                            className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
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
                                                    <div className="flex items-center justify-end space-x-1">
                                                        <button
                                                            onClick={() => selectDept(dept)}
                                                            className="p-2 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 hover:border-[#121212] rounded-lg transition-colors"
                                                            title="View"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => startEdit(dept)}
                                                            className="p-2 text-[#8A817C] hover:text-[#121212] rounded-lg hover:bg-[#F4F1EA] border border-transparent transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingId(dept.id)}
                                                            className="p-2 text-[#8A817C] hover:text-red-600 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                                                            title="Delete"
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

                    {totalPages > 1 && (
                        <div className="p-4 border-t border-[#121212]/10 bg-[#F4F1EA]/10 flex items-center justify-between">
                            <span className="text-xs font-mono text-[#8A817C]">
                                Page {currentPage} of {totalPages}
                                <span className="ml-2 text-[#121212]/30">({processed.length} total)</span>
                            </span>
                            <div className="flex space-x-1">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage((p) => p - 1)}
                                    className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212] hover:bg-[#F4F1EA]"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage((p) => p + 1)}
                                    className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212] hover:bg-[#F4F1EA]"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Create panel */}
                {showCreateForm && (
                    <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative overflow-hidden">
                        <button
                            type="button"
                            onClick={closePanel}
                            className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md z-10 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="p-6">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">New Department</div>
                            <h2 className="text-lg font-light tracking-tight text-[#121212] mb-6 pr-8">Create Department</h2>

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
                                        Department Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                                        placeholder="e.g., Technical Media"
                                        className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={createForm.description}
                                        onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                                        placeholder="Detail core operational responsibilities..."
                                        className="w-full p-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                        Department Key
                                    </label>
                                    <select
                                        required
                                        value={createForm.key}
                                        onChange={(e) => setCreateForm((p) => ({ ...p, key: e.target.value }))}
                                        className="w-full h-11 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                    >
                                        <option value="">-- Select a key --</option>
                                        {departmentKeys.map((k) => (
                                            <option key={k} value={k}>{formatKey(k)}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-12 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 rounded-xl"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? "animate-spin" : "hidden"}`} />
                                    <span>{isSubmitting ? "Creating..." : "Create Department"}</span>
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Detail panel */}
                {selectedDept && (
                <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative overflow-hidden">
                    <button
                        onClick={closePanel}
                        className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md z-10 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* Panel header */}
                    <div className="p-6 border-b border-[#121212]/5">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">
                            Department Detail
                        </div>
                        <h2 className="text-xl font-light tracking-tight text-[#121212] pr-10">
                            {selectedDept.name}
                        </h2>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="inline-block px-2 py-0.5 bg-[#F4F1EA] border border-[#121212]/5 text-[#121212] text-[9px] font-bold uppercase tracking-wider rounded">
                                {formatKey(selectedDept.key)}
                            </span>
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl mt-4 w-fit">
                            {(["details", "workers"] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setPanelTab(tab)}
                                    className={`flex items-center space-x-1.5 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${panelTab === tab
                                            ? "bg-[#121212] text-[#FFFFFF]"
                                            : "text-[#8A817C] hover:text-[#121212]"
                                        }`}
                                >
                                    {tab === "details"
                                        ? <Network className="w-3 h-3" />
                                        : <Users className="w-3 h-3" />}
                                    <span>{tab === "details" ? "Details & Leads" : "Workers"}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Details tab */}
                    {panelTab === "details" && (
                        <div className="p-6 space-y-6">

                            {/* Left — info + leads */}
                            <div className="space-y-6">
                                {selectedDept.description && (
                                    <p className="text-xs text-[#121212]/80 font-light leading-relaxed bg-[#F4F1EA]/30 p-4 border border-[#121212]/5 rounded-lg">
                                        {selectedDept.description}
                                    </p>
                                )}

                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212] mb-3 flex items-center space-x-2">
                                        <ShieldCheck className="w-4 h-4 text-[#8A817C]" />
                                        <span>Current Leads</span>
                                    </h3>

                                    {leadsLoading ? (
                                        <div className="space-y-2">
                                            {Array.from({ length: 2 }).map((_, i) => (
                                                <div key={i} className="h-14 bg-[#F4F1EA] rounded-lg animate-pulse" />
                                            ))}
                                        </div>
                                    ) : leads.length === 0 ? (
                                        <div className="text-xs text-[#8A817C] font-light italic p-4 border border-dashed border-[#121212]/10 rounded-lg">
                                            No leads assigned to this department yet.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {leads.map((lead) => (
                                                <div
                                                    key={lead.id}
                                                    className="p-4 border border-[#121212]/10 rounded-lg flex items-center justify-between"
                                                >
                                                    <div>
                                                        <div className="text-sm font-medium text-[#121212]">
                                                            {fullName(lead)}
                                                        </div>
                                                        <div className="text-xs font-mono text-[#8A817C] mt-0.5">
                                                            {lead.email}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${lead.type === "head"
                                                                ? "bg-[#EADCC9] border-[#EADCC9] text-[#121212]"
                                                                : "bg-[#F4F1EA] border-[#121212]/5 text-[#8A817C]"
                                                            }`}>
                                                            {lead.type === "head" ? "HOD" : "Asst HOD"}
                                                        </span>
                                                        <button
                                                            onClick={() => handleRemoveLead(lead.type)}
                                                            disabled={isSubmitting}
                                                            className="p-1.5 text-[#8A817C] hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                                                            title="Remove lead"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right — assign lead */}
                            <div className="bg-[#F4F1EA]/20 border border-[#121212]/10 p-6 rounded-xl space-y-5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212] flex items-center space-x-2">
                                    <UserPlus className="w-4 h-4 text-[#8A817C]" />
                                    <span>Assign Lead</span>
                                </h3>

                                {leadSuccess && (
                                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700">
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                        {leadSuccess}
                                    </div>
                                )}
                                {leadError && (
                                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                                        <ShieldAlert className="w-4 h-4 shrink-0" />
                                        {leadError}
                                    </div>
                                )}

                                <form onSubmit={handleAssignLead} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                            Lead Type
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(["head", "assistant"] as const).map((type) => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setAssignType(type)}
                                                    className={`h-9 text-[11px] font-semibold uppercase tracking-wider border rounded-lg transition-colors ${assignType === type
                                                            ? "bg-[#121212] text-white border-[#121212]"
                                                            : "bg-white text-[#8A817C] border-[#121212]/10 hover:text-[#121212]"
                                                        }`}
                                                >
                                                    {type === "head" ? "HOD" : "Asst HOD"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                            Select Worker
                                        </label>
                                        <select
                                            required
                                            value={assignMemberId}
                                            onChange={(e) => setAssignMemberId(e.target.value)}
                                            className="w-full h-10 px-3 bg-white border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                        >
                                            <option value="">-- Select worker --</option>
                                            {workerMembers.length === 0 ? (
                                                <option value="" disabled>No workers in this department</option>
                                            ) : workerMembers.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {[m.firstname, m.lastname].filter(Boolean).join(" ")} — {m.email}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-[#8A817C] mt-1 font-mono">
                                            Only workers in this department appear here.
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !assignMemberId}
                                        className="w-full h-10 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-40 flex items-center justify-center space-x-2 rounded-lg"
                                    >
                                        {isSubmitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                                        <span>{isSubmitting ? "Assigning..." : "Assign Lead"}</span>
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Workers tab */}
                    {panelTab === "workers" && (
                        <div className="p-6">
                            <div className="border border-[#121212]/10 rounded-xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">
                                                Worker
                                            </th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">
                                                Contact
                                            </th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">
                                                Role
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                        {workersLoading ? (
                                            Array.from({ length: 5 }).map((_, i) => (
                                                <SkeletonRow key={i} cols={3} />
                                            ))
                                        ) : workers.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                                    No workers assigned to this department.
                                                </td>
                                            </tr>
                                        ) : (
                                            workers.map((worker) => (
                                                <tr key={worker.id} className="hover:bg-[#F4F1EA]/10 transition-colors">
                                                    <td className="p-4">
                                                        <div className="text-sm font-medium text-[#121212]">
                                                            {fullName(worker)}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-xs font-mono text-[#8A817C]">
                                                        {worker.email}
                                                        {worker.phoneNumber && (
                                                            <div className="mt-0.5">{worker.phoneNumber}</div>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="inline-block px-2 py-0.5 bg-[#EADCC9] border-[#EADCC9] text-[#121212] text-[9px] font-bold uppercase tracking-wider rounded">
                                                            {worker.role}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {workersPagination && workersPagination.totalPages > 1 && (
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-xs font-mono text-[#8A817C]">
                                        Page {workersPagination.page} of {workersPagination.totalPages}
                                        <span className="ml-2 text-[#121212]/30">
                                            ({workersPagination.totalCount} total)
                                        </span>
                                    </span>
                                    <div className="flex space-x-1">
                                        <button
                                            disabled={workersPage <= 1 || workersLoading}
                                            onClick={() => loadWorkers(selectedDept.id, workersPage - 1)}
                                            className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212] hover:bg-[#F4F1EA]"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            disabled={workersPage >= workersPagination.totalPages || workersLoading}
                                            onClick={() => loadWorkers(selectedDept.id, workersPage + 1)}
                                            className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212] hover:bg-[#F4F1EA]"
                                        >
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
        </div>
    );
}, { requiredPermission: 'departments:read' });
