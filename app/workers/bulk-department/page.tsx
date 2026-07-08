"use client";

import React, { useState, useMemo } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { useRouter } from "next/navigation";
import {
    Search, ChevronLeft, ChevronRight, CheckSquare, Square,
    ArrowLeft, Building2, CheckCircle2,
} from "lucide-react";
import { useWorkers, Worker } from "@/hooks/use-workers";
import { useDepartments } from "@/hooks/use-departments";
import { DismissibleError } from "@/components/ui/dismissible-error";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

const fullName = (w: Worker) =>
    [w.firstname, w.lastname].filter(Boolean).join(" ") || w.email;

function BulkDepartmentPage() {
    const router = useRouter();
    const { workers, pagination, isLoading, goToPage, refetch } = useWorkers(20);
    const { departments, isLoading: depsLoading, isSubmitting, bulkAssignDepartment } = useDepartments();

    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [departmentId, setDepartmentId] = useState("");
    const [result, setResult] = useState<{ updated: number; skipped: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const filtered = useMemo(() => {
        if (!search.trim()) return workers;
        const s = search.toLowerCase();
        return workers.filter(
            (w) =>
                w.firstname.toLowerCase().includes(s) ||
                w.lastname.toLowerCase().includes(s) ||
                w.email.toLowerCase().includes(s)
        );
    }, [workers, search]);

    const allOnPageSelected =
        filtered.length > 0 && filtered.every((w) => selectedIds.has(w.id));

    const toggleAll = () => {
        if (allOnPageSelected) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                filtered.forEach((w) => next.delete(w.id));
                return next;
            });
        } else {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                filtered.forEach((w) => next.add(w.id));
                return next;
            });
        }
    };

    const toggle = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleSubmit = async () => {
        if (selectedIds.size === 0 || !departmentId) return;
        setError(null);
        setResult(null);
        try {
            const res = await bulkAssignDepartment(departmentId, {
                memberIds: Array.from(selectedIds),
            });
            setResult(res);
            setSelectedIds(new Set());
            refetch();
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.message || "Something went wrong.");
        }
    };

    const canSubmit = selectedIds.size > 0 && !!departmentId && !isSubmitting;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-lg border border-[#121212]/10 hover:bg-[#F4F1EA] transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 text-[#8A817C]" />
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-[#121212]">Bulk Assign Department</h1>
                    <p className="text-xs text-[#8A817C]">Move workers to a new primary department</p>
                </div>
            </div>

            {/* Result banner */}
            {result && (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 border border-green-100 text-green-800 text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                        {result.updated} worker{result.updated !== 1 ? "s" : ""} updated
                        {result.skipped > 0 ? `, ${result.skipped} skipped (not found)` : ""}.
                    </span>
                </div>
            )}

            <DismissibleError message={error} />

            <div className="grid grid-cols-12 gap-4">
                {/* Worker list */}
                <div className="col-span-12 lg:col-span-7 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-[#121212]/5 flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A817C]" />
                            <input
                                type="text"
                                placeholder="Search workers..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 text-sm border border-[#121212]/10 rounded-lg bg-[#F4F1EA] text-[#121212] placeholder:text-[#8A817C] focus:outline-none focus:ring-1 focus:ring-[#121212]/20"
                            />
                        </div>
                        <span className="text-xs text-[#8A817C] shrink-0">
                            {selectedIds.size} selected
                        </span>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#121212]/5 bg-[#F4F1EA]">
                                    <th className="p-4 w-10">
                                        <button onClick={toggleAll} className="text-[#8A817C] hover:text-[#121212]">
                                            {allOnPageSelected
                                                ? <CheckSquare className="w-4 h-4" />
                                                : <Square className="w-4 h-4" />}
                                        </button>
                                    </th>
                                    <th className="p-4 text-left text-xs font-semibold text-[#8A817C] uppercase tracking-wider">Worker</th>
                                    <th className="p-4 text-left text-xs font-semibold text-[#8A817C] uppercase tracking-wider">Current Department</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i} className="border-b border-[#121212]/5">
                                            <td className="p-4"><div className="h-4 w-4 bg-[#F4F1EA] rounded animate-pulse" /></td>
                                            <td className="p-4"><div className="h-3.5 bg-[#F4F1EA] rounded w-32 animate-pulse" /></td>
                                            <td className="p-4"><div className="h-3.5 bg-[#F4F1EA] rounded w-24 animate-pulse" /></td>
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-sm text-[#8A817C]">
                                            No workers found.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((w) => {
                                        const checked = selectedIds.has(w.id);
                                        const deptName =
                                            w.workerProfile?.department && "name" in w.workerProfile.department
                                                ? w.workerProfile.department.name
                                                : "—";
                                        return (
                                            <tr
                                                key={w.id}
                                                onClick={() => toggle(w.id)}
                                                className={`border-b border-[#121212]/5 cursor-pointer transition-colors ${checked ? "bg-[#EADCC9]/40" : "hover:bg-[#F4F1EA]/50"}`}
                                            >
                                                <td className="p-4">
                                                    {checked
                                                        ? <CheckSquare className="w-4 h-4 text-[#121212]" />
                                                        : <Square className="w-4 h-4 text-[#8A817C]" />}
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-medium text-[#121212]">{fullName(w)}</div>
                                                    <div className="text-xs text-[#8A817C]">{w.email}</div>
                                                </td>
                                                <td className="p-4 text-[#8A817C]">{deptName}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="p-4 border-t border-[#121212]/5 flex items-center justify-between">
                            <span className="text-xs text-[#8A817C]">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => goToPage(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    className="p-1.5 rounded-lg border border-[#121212]/10 hover:bg-[#F4F1EA] disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => goToPage(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.totalPages}
                                    className="p-1.5 rounded-lg border border-[#121212]/10 hover:bg-[#F4F1EA] disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Config panel */}
                <div className="col-span-12 lg:col-span-5">
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-6 space-y-5">
                        <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-[#8A817C]" />
                            <h2 className="text-sm font-semibold text-[#121212]">Target Department</h2>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-[#8A817C] uppercase tracking-wider">
                                Department <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={departmentId}
                                onChange={(e) => setDepartmentId(e.target.value)}
                                disabled={depsLoading}
                                className="w-full px-3 py-2 text-sm border border-[#121212]/10 rounded-lg bg-[#F4F1EA] text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20 disabled:opacity-60"
                            >
                                <option value="">Select department...</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-[#8A817C]">
                                This will replace each selected worker&apos;s primary department.
                            </p>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className="w-full py-2.5 px-4 rounded-lg bg-[#121212] text-white text-sm font-medium hover:bg-[#121212]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting
                                ? "Assigning..."
                                : `Assign ${selectedIds.size > 0 ? selectedIds.size : ""} Worker${selectedIds.size !== 1 ? "s" : ""}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default withAuth(BulkDepartmentPage, { requiredPermission: 'departments:write' });
