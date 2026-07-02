"use client";

import React, { useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { Users2, Plus, AlertCircle, X, RefreshCw, Pencil } from "lucide-react";
import { useExternalPayees, ExternalPayee, CreatePayeePayload, UpdatePayeePayload } from "@/hooks/use-external-payees";

function RowSkeleton() {
    return (
        <tr className="border-b border-[#121212]/5">
            {[30, 20, 25, 25, 10].map((w, i) => (
                <td key={i} className="p-4">
                    <div className="h-3 bg-[#F4F1EA] rounded animate-pulse" style={{ width: `${w * 4}px` }} />
                </td>
            ))}
        </tr>
    );
}

export default withAuth(function ExternalPayeesPage() {
    const { payees, isLoading, isSubmitting, error, createPayee, updatePayee, refetch } = useExternalPayees();

    const [showCreate, setShowCreate] = useState(false);
    const [editing, setEditing] = useState<ExternalPayee | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [form, setForm] = useState<CreatePayeePayload>({ name: "", category: "", bankName: "", accountNumber: "", contactEmail: "", contactPhone: "", notes: "" });
    const [editForm, setEditForm] = useState<UpdatePayeePayload>({});

    async function handleCreate() {
        if (!form.name) return;
        setActionError(null);
        try {
            const clean: CreatePayeePayload = {
                name: form.name,
                ...(form.category && { category: form.category }),
                ...(form.bankName && { bankName: form.bankName }),
                ...(form.accountNumber && { accountNumber: form.accountNumber }),
                ...(form.contactEmail && { contactEmail: form.contactEmail }),
                ...(form.contactPhone && { contactPhone: form.contactPhone }),
                ...(form.notes && { notes: form.notes }),
            };
            await createPayee(clean);
            setShowCreate(false);
            setForm({ name: "", category: "", bankName: "", accountNumber: "", contactEmail: "", contactPhone: "", notes: "" });
        } catch (e: any) { setActionError(e.message); }
    }

    async function handleUpdate() {
        if (!editing) return;
        setActionError(null);
        try {
            await updatePayee(editing.id, editForm);
            setEditing(null);
        } catch (e: any) { setActionError(e.message); }
    }

    function openEdit(p: ExternalPayee) {
        setEditing(p);
        setEditForm({ name: p.name, category: p.category ?? "", bankName: p.bankName ?? "", accountNumber: p.accountNumber ?? "", contactEmail: p.contactEmail ?? "", contactPhone: p.contactPhone ?? "", notes: p.notes ?? "" });
        setShowCreate(false);
        setActionError(null);
    }

    const fields: { label: string; key: keyof CreatePayeePayload; placeholder: string; required?: boolean }[] = [
        { label: "Name", key: "name", placeholder: "Payee name", required: true },
        { label: "Category", key: "category", placeholder: "e.g. Vendor, Utility" },
        { label: "Bank Name", key: "bankName", placeholder: "Bank name" },
        { label: "Account Number", key: "accountNumber", placeholder: "Account number" },
        { label: "Email", key: "contactEmail", placeholder: "contact@example.com" },
        { label: "Phone", key: "contactPhone", placeholder: "+234..." },
    ];

    return (
        <div className="space-y-8 font-sans">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">External Payees</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Vendors, utilities, contractors, remittances
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={refetch} disabled={isLoading} className="h-10 px-4 border border-[#121212]/10 text-xs font-semibold uppercase tracking-widest text-[#121212] hover:bg-[#F4F1EA]/40 disabled:opacity-40 transition-colors rounded-xl flex items-center space-x-2">
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /><span>Refresh</span>
                    </button>
                    <button onClick={() => { setShowCreate((v) => !v); setEditing(null); setActionError(null); }} className="h-10 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/80 rounded-xl flex items-center space-x-2">
                        <Plus className="w-3.5 h-3.5" /><span>New Payee</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center space-x-2 text-red-600 text-xs bg-red-50 border border-red-200 p-4 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
                </div>
            )}

            <div className="flex gap-6 items-start">
                <div className="flex-1 min-w-0 bg-white border border-[#121212]/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["Name", "Category", "Bank", "Contact", ""].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5">
                                {isLoading ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />) :
                                    payees.length === 0 ? (
                                        <tr><td colSpan={5} className="p-10 text-center text-xs text-[#8A817C] font-light">No external payees found.</td></tr>
                                    ) : payees.map((p) => (
                                        <tr key={p.id} className="hover:bg-[#F4F1EA]/20 transition-colors">
                                            <td className="p-4 text-xs font-medium text-[#121212]">{p.name}</td>
                                            <td className="p-4 text-xs text-[#8A817C]">{p.category ?? "—"}</td>
                                            <td className="p-4 text-xs text-[#8A817C]">{p.bankName ? `${p.bankName}${p.accountNumber ? ` · ${p.accountNumber}` : ""}` : "—"}</td>
                                            <td className="p-4 text-xs text-[#8A817C]">{p.contactEmail ?? p.contactPhone ?? "—"}</td>
                                            <td className="p-4">
                                                <button onClick={() => openEdit(p)} className="text-[#8A817C] hover:text-[#121212]">
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
                    <div className="w-[360px] shrink-0 bg-white border border-[#121212]/10 rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-widest text-[#121212] flex items-center space-x-2"><Users2 className="w-3.5 h-3.5" /><span>New Payee</span></p>
                            <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-[#8A817C]" /></button>
                        </div>
                        {actionError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{actionError}</p>}
                        {fields.map(({ label, key, placeholder, required }) => (
                            <div key={key}>
                                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">{label}{required ? " *" : ""}</label>
                                <input value={(form[key] ?? "") as string} placeholder={placeholder}
                                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                                    className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none" />
                            </div>
                        ))}
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Notes</label>
                            <textarea value={form.notes ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
                                className="w-full px-3 py-2 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none resize-none" />
                        </div>
                        <button onClick={handleCreate} disabled={isSubmitting || !form.name}
                            className="w-full h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-xl disabled:opacity-40">
                            {isSubmitting ? "Creating…" : "Create Payee"}
                        </button>
                    </div>
                )}

                {/* Edit panel */}
                {editing && !showCreate && (
                    <div className="w-[360px] shrink-0 bg-white border border-[#121212]/10 rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-widest text-[#121212]">Edit Payee</p>
                            <button onClick={() => setEditing(null)}><X className="w-4 h-4 text-[#8A817C]" /></button>
                        </div>
                        {actionError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{actionError}</p>}
                        {fields.map(({ label, key }) => (
                            <div key={key}>
                                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">{label}</label>
                                <input value={(editForm[key as keyof UpdatePayeePayload] ?? "") as string}
                                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                                    className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none" />
                            </div>
                        ))}
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
