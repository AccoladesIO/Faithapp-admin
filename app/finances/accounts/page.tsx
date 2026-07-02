"use client";

import React, { useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { BarChart3, Plus, AlertCircle, X, RefreshCw, Pencil } from "lucide-react";
import {
    useAccounts,
    FinanceAccount,
    CreateAccountPayload,
    UpdateAccountPayload,
    AccountType,
    NormalBalance,
} from "@/hooks/use-accounts";
import { useFunds } from "@/hooks/use-funds";

const TYPE_COLORS: Record<AccountType, string> = {
    ASSET: "bg-blue-100 text-blue-800",
    LIABILITY: "bg-purple-100 text-purple-800",
    INCOME: "bg-green-100 text-green-800",
    EXPENSE: "bg-red-100 text-red-800",
};

const fmt = (n: number | string) =>
    `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function RowSkeleton() {
    return (
        <tr className="border-b border-[#121212]/5">
            {[10, 35, 15, 20, 25].map((w, i) => (
                <td key={i} className="p-4">
                    <div className="h-3 bg-[#F4F1EA] rounded animate-pulse" style={{ width: `${w * 5}px` }} />
                </td>
            ))}
        </tr>
    );
}

export default withAuth(function AccountsPage() {
    const { accounts, isLoading, isSubmitting, error, createAccount, updateAccount, refetch } = useAccounts();
    const { funds } = useFunds();

    const [showCreate, setShowCreate] = useState(false);
    const [editing, setEditing] = useState<FinanceAccount | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState<AccountType | "">("");
    const [form, setForm] = useState<CreateAccountPayload>({ name: "", code: "", type: "ASSET", normalBalance: "DEBIT", subtype: "", fundId: "" });
    const [editForm, setEditForm] = useState<UpdateAccountPayload>({});

    const filtered = typeFilter ? accounts.filter((a) => a.type === typeFilter) : accounts;

    async function handleCreate() {
        if (!form.name || !form.code) return;
        setActionError(null);
        try {
            await createAccount({ ...form, subtype: form.subtype || undefined, fundId: form.fundId || undefined });
            setShowCreate(false);
            setForm({ name: "", code: "", type: "ASSET", normalBalance: "DEBIT", subtype: "", fundId: "" });
        } catch (e: any) { setActionError(e.message); }
    }

    async function handleUpdate() {
        if (!editing) return;
        setActionError(null);
        try {
            await updateAccount(editing.id, editForm);
            setEditing(null);
        } catch (e: any) { setActionError(e.message); }
    }

    function openEdit(a: FinanceAccount) {
        setEditing(a);
        setEditForm({ name: a.name, subtype: a.subtype ?? "", isActive: a.isActive });
        setShowCreate(false);
        setActionError(null);
    }

    return (
        <div className="space-y-8 font-sans">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Chart of Accounts</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Asset · Liability · Income · Expense
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={refetch} disabled={isLoading} className="h-10 px-4 border border-[#121212]/10 text-xs font-semibold uppercase tracking-widest text-[#121212] hover:bg-[#F4F1EA]/40 disabled:opacity-40 transition-colors rounded-xl flex items-center space-x-2">
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                    </button>
                    <button onClick={() => { setShowCreate((v) => !v); setEditing(null); setActionError(null); }} className="h-10 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/80 rounded-xl flex items-center space-x-2">
                        <Plus className="w-3.5 h-3.5" /><span>New Account</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center space-x-2 text-red-600 text-xs bg-red-50 border border-red-200 p-4 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
                </div>
            )}

            {/* Type filter */}
            <div className="flex items-center space-x-2">
                {(["", "ASSET", "LIABILITY", "INCOME", "EXPENSE"] as const).map((t) => (
                    <button key={t} onClick={() => setTypeFilter(t)}
                        className={`h-8 px-3 text-[10px] font-semibold uppercase tracking-widest rounded-lg transition-colors ${typeFilter === t ? "bg-[#121212] text-white" : "border border-[#121212]/10 text-[#8A817C] hover:text-[#121212]"}`}>
                        {t === "" ? "All" : t}
                    </button>
                ))}
            </div>

            <div className="flex gap-6 items-start">
                <div className="flex-1 min-w-0 bg-white border border-[#121212]/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["Code", "Name", "Type", "Normal Balance", "Balance", ""].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5">
                                {isLoading ? Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />) :
                                    filtered.length === 0 ? (
                                        <tr><td colSpan={6} className="p-10 text-center text-xs text-[#8A817C] font-light">No accounts found.</td></tr>
                                    ) : filtered.map((a) => (
                                        <tr key={a.id} className={`hover:bg-[#F4F1EA]/20 transition-colors ${!a.isActive ? "opacity-50" : ""}`}>
                                            <td className="p-4 font-mono text-xs text-[#8A817C]">{a.code}</td>
                                            <td className="p-4 text-xs font-medium text-[#121212]">{a.name}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${TYPE_COLORS[a.type]}`}>{a.type}</span>
                                            </td>
                                            <td className="p-4 text-[10px] font-mono text-[#8A817C]">{a.normalBalance}</td>
                                            <td className="p-4 font-mono text-xs font-medium text-[#121212]">{fmt(a.currentBalance)}</td>
                                            <td className="p-4">
                                                <button onClick={() => openEdit(a)} className="text-[#8A817C] hover:text-[#121212]">
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
                            <p className="text-xs font-semibold uppercase tracking-widest text-[#121212] flex items-center space-x-2"><BarChart3 className="w-3.5 h-3.5" /><span>New Account</span></p>
                            <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-[#8A817C]" /></button>
                        </div>
                        {actionError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{actionError}</p>}
                        {[
                            { label: "Code *", key: "code", placeholder: "e.g. 1001" },
                            { label: "Name *", key: "name", placeholder: "Account name" },
                            { label: "Subtype", key: "subtype", placeholder: "e.g. Bank, Cash" },
                        ].map(({ label, key, placeholder }) => (
                            <div key={key}>
                                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">{label}</label>
                                <input value={(form as any)[key] ?? ""} placeholder={placeholder}
                                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                                    className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none" />
                            </div>
                        ))}
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Type *</label>
                            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AccountType }))}
                                className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none">
                                {(["ASSET", "LIABILITY", "INCOME", "EXPENSE"] as AccountType[]).map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Normal Balance *</label>
                            <select value={form.normalBalance} onChange={(e) => setForm((f) => ({ ...f, normalBalance: e.target.value as NormalBalance }))}
                                className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none">
                                <option value="DEBIT">Debit</option>
                                <option value="CREDIT">Credit</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Fund (optional)</label>
                            <select value={form.fundId} onChange={(e) => setForm((f) => ({ ...f, fundId: e.target.value }))}
                                className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none">
                                <option value="">No fund</option>
                                {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>
                        <button onClick={handleCreate} disabled={isSubmitting || !form.name || !form.code}
                            className="w-full h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-xl disabled:opacity-40">
                            {isSubmitting ? "Creating…" : "Create Account"}
                        </button>
                    </div>
                )}

                {/* Edit panel */}
                {editing && !showCreate && (
                    <div className="w-[340px] shrink-0 bg-white border border-[#121212]/10 rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-widest text-[#121212]">Edit Account</p>
                            <button onClick={() => setEditing(null)}><X className="w-4 h-4 text-[#8A817C]" /></button>
                        </div>
                        {actionError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{actionError}</p>}
                        <div className="text-[10px] font-mono text-[#8A817C] bg-[#F4F1EA]/40 rounded-lg px-3 py-2">
                            {editing.code} · {editing.type} · {editing.normalBalance}
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Name</label>
                            <input value={editForm.name ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Subtype</label>
                            <input value={editForm.subtype ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, subtype: e.target.value }))}
                                className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none" />
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
