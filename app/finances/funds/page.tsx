"use client";

import { DismissibleError } from "@/components/ui/dismissible-error";

import React, { useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { Landmark, Plus, X, RefreshCw, Pencil } from "lucide-react";
import { useFunds, Fund, CreateFundPayload, UpdateFundPayload, FundType } from "@/hooks/use-funds";

function RowSkeleton() {
    return (
        <tr className="border-b border-[#121212]/5">
            {[40, 20, 30, 10].map((w, i) => (
                <td key={i} className="p-4">
                    <div className="h-3 bg-[#F4F1EA] rounded animate-pulse" style={{ width: `${w * 4}px` }} />
                </td>
            ))}
        </tr>
    );
}

export default withAuth(function FundsPage() {
    const { funds, isLoading, isSubmitting, error, createFund, updateFund, refetch } = useFunds();

    const [showCreate, setShowCreate] = useState(false);
    const [editing, setEditing] = useState<Fund | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [form, setForm] = useState<CreateFundPayload>({ name: "", type: "UNRESTRICTED", description: "" });
    const [editForm, setEditForm] = useState<UpdateFundPayload>({});

    async function handleCreate() {
        if (!form.name) return;
        setActionError(null);
        try {
            await createFund({ ...form, description: form.description || undefined });
            setShowCreate(false);
            setForm({ name: "", type: "UNRESTRICTED", description: "" });
        } catch (e: any) { setActionError(e.message); }
    }

    async function handleUpdate() {
        if (!editing) return;
        setActionError(null);
        try {
            await updateFund(editing.id, editForm);
            setEditing(null);
        } catch (e: any) { setActionError(e.message); }
    }

    function openEdit(f: Fund) {
        setEditing(f);
        setEditForm({ name: f.name, description: f.description ?? "", isActive: f.isActive });
        setShowCreate(false);
        setActionError(null);
    }

    return (
        <div className="space-y-8 font-sans">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Funds</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Restricted &amp; Unrestricted pools &bull; Every account and offering belongs to a fund
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={refetch} disabled={isLoading} className="h-10 px-4 border border-[#121212]/10 text-xs font-semibold uppercase tracking-widest text-[#121212] hover:bg-[#F4F1EA]/40 disabled:opacity-40 transition-colors rounded-xl flex items-center space-x-2">
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                    </button>
                    <button onClick={() => { setShowCreate((v) => !v); setEditing(null); setActionError(null); }} className="h-10 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/80 rounded-xl flex items-center space-x-2">
                        <Plus className="w-3.5 h-3.5" /><span>New Fund</span>
                    </button>
                </div>
            </div>

                            <DismissibleError message={error} />

            <div className="flex gap-6 items-start">
                <div className="flex-1 min-w-0 bg-white border border-[#121212]/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["Name", "Type", "Description", "Status", ""].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5">
                                {isLoading ? Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />) :
                                    funds.length === 0 ? (
                                        <tr><td colSpan={5} className="p-10 text-center text-xs text-[#8A817C] font-light">No funds found.</td></tr>
                                    ) : funds.map((f) => (
                                        <tr key={f.id} className="hover:bg-[#F4F1EA]/20 transition-colors">
                                            <td className="p-4 text-xs font-medium text-[#121212]">{f.name}</td>
                                            <td className="p-4">
                                                <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${f.type === "RESTRICTED" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                                                    {f.type}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs text-[#8A817C]">{f.description ?? "—"}</td>
                                            <td className="p-4">
                                                <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${f.isActive ? "bg-green-100 text-green-800" : "bg-[#F4F1EA] text-[#8A817C]"}`}>
                                                    {f.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <button onClick={() => openEdit(f)} className="text-[#8A817C] hover:text-[#121212]">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Create panel */}
                {showCreate && (
                    <div className="w-[340px] shrink-0 bg-white border border-[#121212]/10 rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-widest text-[#121212] flex items-center space-x-2"><Landmark className="w-3.5 h-3.5" /><span>New Fund</span></p>
                            <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-[#8A817C]" /></button>
                        </div>
                        <DismissibleError message={actionError} />
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Name *</label>
                            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Fund name"
                                className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Type *</label>
                            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as FundType }))}
                                className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none">
                                <option value="UNRESTRICTED">Unrestricted</option>
                                <option value="RESTRICTED">Restricted</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Description</label>
                            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
                                className="w-full px-3 py-2 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none resize-none" />
                        </div>
                        <button onClick={handleCreate} disabled={isSubmitting || !form.name}
                            className="w-full h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-xl disabled:opacity-40">
                            {isSubmitting ? "Creating…" : "Create Fund"}
                        </button>
                    </div>
                )}

                {/* Edit panel */}
                {editing && !showCreate && (
                    <div className="w-[340px] shrink-0 bg-white border border-[#121212]/10 rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-widest text-[#121212]">Edit Fund</p>
                            <button onClick={() => setEditing(null)}><X className="w-4 h-4 text-[#8A817C]" /></button>
                        </div>
                        <DismissibleError message={actionError} />
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Name</label>
                            <input value={editForm.name ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Description</label>
                            <textarea value={editForm.description ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={2}
                                className="w-full px-3 py-2 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none resize-none" />
                        </div>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={editForm.isActive ?? true} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded" />
                            <span className="text-xs font-semibold uppercase tracking-widest text-[#8A817C]">Active</span>
                        </label>
                        <button onClick={handleUpdate} disabled={isSubmitting}
                            className="w-full h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-xl disabled:opacity-40">
                            {isSubmitting ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}, { requiredPermission: 'finance:read' });
