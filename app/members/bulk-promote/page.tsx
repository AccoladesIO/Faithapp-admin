"use client";

import React, { useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { useRouter } from "next/navigation";
import {
    Search, ChevronLeft, ChevronRight, CheckSquare, Square,
    ArrowLeft, Users, CheckCircle2,
} from "lucide-react";
import { useMembers, BulkPromoteResult } from "@/hooks/use-member";
import { useDepartments } from "@/hooks/use-departments";

function BulkPromotePage() {
    const router = useRouter();
    const { members, pagination, isLoading, isSubmitting, goToPage, refetch, bulkPromote, search, onSearchChange } = useMembers(20, "MEMBER");
    const { departments, isLoading: depsLoading } = useDepartments();

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [departmentId, setDepartmentId] = useState("");
    const [profession, setProfession] = useState("");
    const [yearJoinedWorkforce, setYearJoinedWorkforce] = useState("");
    const [result, setResult] = useState<BulkPromoteResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const allOnPageSelected =
        members.length > 0 && members.every((m) => selectedIds.has(m.id));

    const toggleAll = () => {
        if (allOnPageSelected) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                members.forEach((m) => next.delete(m.id));
                return next;
            });
        } else {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                members.forEach((m) => next.add(m.id));
                return next;
            });
        }
    };

    const toggle = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleSubmit = async () => {
        if (selectedIds.size === 0 || !departmentId) return;
        setError(null);
        setResult(null);
        try {
            const res = await bulkPromote({
                memberIds: Array.from(selectedIds),
                departmentId,
                profession: profession.trim() || undefined,
                yearJoinedWorkforce: yearJoinedWorkforce.trim() || undefined,
            });
            setResult(res);
            setSelectedIds(new Set());
            refetch();
        } catch (err: any) {
            setError(err?.message || "Something went wrong.");
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
                    <h1 className="text-lg font-semibold text-[#121212]">Bulk Promote to Worker</h1>
                    <p className="text-xs text-[#8A817C]">Select members and assign them to a department</p>
                </div>
            </div>

            {/* Result banner */}
            {result && (
                <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-green-800 text-sm space-y-2">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                            {result.promoted} member{result.promoted !== 1 ? "s" : ""} promoted
                            {result.skipped > 0 ? `, ${result.skipped} skipped` : ""}.
                        </span>
                    </div>
                    {result.failures.length > 0 && (
                        <ul className="pl-6 space-y-0.5 text-xs text-green-700 list-disc">
                            {result.failures.map(f => (
                                <li key={f.memberId}>
                                    <span className="font-mono">{f.memberId.slice(0, 8)}…</span> — {f.reason}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-12 gap-4">
                {/* Member list */}
                <div className="col-span-12 lg:col-span-7 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-[#121212]/5 flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A817C]" />
                            <input
                                type="text"
                                placeholder="Search members..."
                                value={search}
                                onChange={(e) => onSearchChange(e.target.value)}
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
                                    <th className="p-4 text-left text-xs font-semibold text-[#8A817C] uppercase tracking-wider">Member</th>
                                    <th className="p-4 text-left text-xs font-semibold text-[#8A817C] uppercase tracking-wider">Email</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i} className="border-b border-[#121212]/5">
                                            <td className="p-4"><div className="h-4 w-4 bg-[#F4F1EA] rounded animate-pulse" /></td>
                                            <td className="p-4"><div className="h-3.5 bg-[#F4F1EA] rounded w-32 animate-pulse" /></td>
                                            <td className="p-4"><div className="h-3.5 bg-[#F4F1EA] rounded w-44 animate-pulse" /></td>
                                        </tr>
                                    ))
                                ) : members.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-sm text-[#8A817C]">
                                            No eligible members found.
                                        </td>
                                    </tr>
                                ) : (
                                    members.map((m) => {
                                        const checked = selectedIds.has(m.id);
                                        return (
                                            <tr
                                                key={m.id}
                                                onClick={() => toggle(m.id)}
                                                className={`border-b border-[#121212]/5 cursor-pointer transition-colors ${checked ? "bg-[#EADCC9]/40" : "hover:bg-[#F4F1EA]/50"}`}
                                            >
                                                <td className="p-4">
                                                    {checked
                                                        ? <CheckSquare className="w-4 h-4 text-[#121212]" />
                                                        : <Square className="w-4 h-4 text-[#8A817C]" />}
                                                </td>
                                                <td className="p-4 font-medium text-[#121212]">
                                                    {m.firstname} {m.lastname}
                                                </td>
                                                <td className="p-4 text-[#8A817C]">{m.email}</td>
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
                <div className="col-span-12 lg:col-span-5 space-y-4">
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-6 space-y-5">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#8A817C]" />
                            <h2 className="text-sm font-semibold text-[#121212]">Promotion Settings</h2>
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
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-[#8A817C] uppercase tracking-wider">
                                Profession <span className="text-[#8A817C] font-normal">(optional)</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Sound Engineer"
                                value={profession}
                                onChange={(e) => setProfession(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-[#121212]/10 rounded-lg bg-[#F4F1EA] text-[#121212] placeholder:text-[#8A817C] focus:outline-none focus:ring-1 focus:ring-[#121212]/20"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-[#8A817C] uppercase tracking-wider">
                                Year Joined Workforce <span className="text-[#8A817C] font-normal">(optional)</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. 2019"
                                maxLength={4}
                                value={yearJoinedWorkforce}
                                onChange={(e) => setYearJoinedWorkforce(e.target.value.replace(/\D/g, ""))}
                                className="w-full px-3 py-2 text-sm border border-[#121212]/10 rounded-lg bg-[#F4F1EA] text-[#121212] placeholder:text-[#8A817C] focus:outline-none focus:ring-1 focus:ring-[#121212]/20"
                            />
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className="w-full py-2.5 px-4 rounded-lg bg-[#121212] text-white text-sm font-medium hover:bg-[#121212]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting
                                ? "Promoting..."
                                : `Promote ${selectedIds.size > 0 ? selectedIds.size : ""} Member${selectedIds.size !== 1 ? "s" : ""}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default withAuth(BulkPromotePage, { requiredPermission: 'members:write' });
