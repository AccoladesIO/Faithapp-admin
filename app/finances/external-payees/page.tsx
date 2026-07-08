"use client";

import { DismissibleError } from "@/components/ui/dismissible-error";

import React, { useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { Users2, Plus, X, RefreshCw, Pencil } from "lucide-react";
import {
    useExternalPayees,
    ExternalPayee,
    ExternalPayeeType,
    CreatePayeePayload,
    UpdatePayeePayload,
} from "@/hooks/use-external-payees";

const PAYEE_TYPES: ExternalPayeeType[] = [
    "VENDOR", "UTILITY", "REMITTANCE", "CONTRACTOR",
    "GOVERNMENT", "MISSION", "BENEVOLENCE", "OTHER",
];

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

const EMPTY_FORM: CreatePayeePayload = {
    name: "", type: "VENDOR", bankName: "", accountNumber: "",
    contactEmail: "", contactPhone: "", notes: "",
};

export default withAuth(function ExternalPayeesPage() {
    const { payees, isLoading, isSubmitting, error, createPayee, updatePayee, refetch } = useExternalPayees();

    const [showCreate, setShowCreate] = useState(false);
    const [editing, setEditing] = useState<ExternalPayee | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [form, setForm] = useState<CreatePayeePayload>({ ...EMPTY_FORM });
    const [editForm, setEditForm] = useState<UpdatePayeePayload>({});

    async function handleCreate() {
        if (!form.name) return;
        setActionError(null);
        try {
            await createPayee({
                name: form.name,
                type: form.type,
                ...(form.bankName && { bankName: form.bankName }),
                ...(form.accountNumber && { accountNumber: form.accountNumber }),
                ...(form.contactEmail && { contactEmail: form.contactEmail }),
                ...(form.contactPhone && { contactPhone: form.contactPhone }),
                ...(form.notes && { notes: form.notes }),
            });
            setShowCreate(false);
            setForm({ ...EMPTY_FORM });
        } catch (e: unknown) { setActionError((e as Error).message); }
    }

    async function handleUpdate() {
        if (!editing) return;
        setActionError(null);
        try {
            const payload: UpdatePayeePayload = {};
            if (editForm.name)          payload.name          = editForm.name;
            if (editForm.type)          payload.type          = editForm.type;
            if (editForm.bankName)      payload.bankName      = editForm.bankName;
            if (editForm.accountNumber) payload.accountNumber = editForm.accountNumber;
            if (editForm.contactEmail)  payload.contactEmail  = editForm.contactEmail;
            if (editForm.contactPhone)  payload.contactPhone  = editForm.contactPhone;
            if (editForm.notes)         payload.notes         = editForm.notes;
            if (editForm.isActive !== undefined) payload.isActive = editForm.isActive;
            await updatePayee(editing.id, payload);
            setEditing(null);
        } catch (e: unknown) { setActionError((e as Error).message); }
    }

    function openEdit(p: ExternalPayee) {
        setEditing(p);
        setEditForm({
            name: p.name,
            type: p.type ?? undefined,
            bankName: p.bankName ?? undefined,
            accountNumber: p.accountNumber ?? undefined,
            contactEmail: p.contactEmail ?? undefined,
            contactPhone: p.contactPhone ?? undefined,
            notes: p.notes ?? undefined,
        });
        setShowCreate(false);
        setActionError(null);
    }

    const textFields: { label: string; key: keyof CreatePayeePayload; placeholder: string }[] = [
        { label: "Bank Name", key: "bankName", placeholder: "Bank name" },
        { label: "Account Number", key: "accountNumber", placeholder: "Account number" },
        { label: "Email", key: "contactEmail", placeholder: "contact@example.com" },
        { label: "Phone", key: "contactPhone", placeholder: "+234..." },
    ];

    const selectCls = "w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none";
    const inputCls  = "w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none";
    const labelCls  = "block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1";

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

                            <DismissibleError message={error} />

            <div className="flex gap-6 items-start">
                <div className="flex-1 min-w-0 bg-white border border-[#121212]/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["Name", "Type", "Bank", "Contact", ""].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5">
                                {isLoading ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />) :
                                    payees.length === 0 ? (
                                        <tr><td colSpan={5} className="p-10 text-center text-xs text-[#8A817C] font-light">No external payees found.</td></tr>
                                    ) : payees.map((p) => (
                                        <tr key={p.id} className={`hover:bg-[#F4F1EA]/20 transition-colors ${!p.isActive ? "opacity-50" : ""}`}>
                                            <td className="p-4 text-xs font-medium text-[#121212]">{p.name}</td>
                                            <td className="p-4 text-xs text-[#8A817C] uppercase tracking-wider">{p.type ?? "—"}</td>
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
                        <DismissibleError message={actionError} />
                        <div>
                            <label className={labelCls}>Name *</label>
                            <input value={form.name} placeholder="Payee name"
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Type *</label>
                            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ExternalPayeeType }))}
                                className={selectCls}>
                                {PAYEE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        {textFields.map(({ label, key, placeholder }) => (
                            <div key={key}>
                                <label className={labelCls}>{label}</label>
                                <input value={(form[key] ?? "") as string} placeholder={placeholder}
                                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                                    className={inputCls} />
                            </div>
                        ))}
                        <div>
                            <label className={labelCls}>Notes</label>
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
                        <DismissibleError message={actionError} />
                        <div>
                            <label className={labelCls}>Name</label>
                            <input value={editForm.name ?? ""} placeholder="Payee name"
                                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Type</label>
                            <select value={editForm.type ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value as ExternalPayeeType || undefined }))}
                                className={selectCls}>
                                <option value="">— unchanged —</option>
                                {PAYEE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        {textFields.map(({ label, key, placeholder }) => (
                            <div key={key}>
                                <label className={labelCls}>{label}</label>
                                <input value={(editForm[key as keyof UpdatePayeePayload] ?? "") as string} placeholder={placeholder}
                                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                                    className={inputCls} />
                            </div>
                        ))}
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
