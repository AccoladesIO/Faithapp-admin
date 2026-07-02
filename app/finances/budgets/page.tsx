"use client";

import React, { useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { Target, Plus, AlertCircle, X, RefreshCw, Pencil } from "lucide-react";
import { useBudgets, Budget, CreateBudgetPayload, UpdateBudgetPayload } from "@/hooks/use-budgets";
import { useAccounts } from "@/hooks/use-accounts";
import { useFunds } from "@/hooks/use-funds";

const fmt = (n: number | string) =>
    `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function CardSkeleton() {
    return (
        <div className="bg-white border border-[#121212]/10 p-6 rounded-xl space-y-3">
            <div className="h-3 w-32 bg-[#F4F1EA] rounded animate-pulse" />
            <div className="h-4 w-24 bg-[#F4F1EA] rounded animate-pulse" />
            <div className="h-2 w-full bg-[#F4F1EA] rounded-full animate-pulse" />
        </div>
    );
}

export default withAuth(function BudgetsPage() {
    const { budgets, isLoading, isSubmitting, error, createBudget, updateBudget, refetch } = useBudgets();
    const { accounts } = useAccounts();
    const { funds } = useFunds();

    const [showCreate, setShowCreate] = useState(false);
    const [editing, setEditing] = useState<Budget | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [form, setForm] = useState<CreateBudgetPayload>({ name: "", accountId: "", fundId: "", totalAmount: 0, fromDate: "", toDate: "" });
    const [editForm, setEditForm] = useState<UpdateBudgetPayload>({});

    async function handleCreate() {
        if (!form.name || !form.accountId || !form.fundId || !form.totalAmount || !form.fromDate || !form.toDate) return;
        setActionError(null);
        try {
            await createBudget(form);
            setShowCreate(false);
            setForm({ name: "", accountId: "", fundId: "", totalAmount: 0, fromDate: "", toDate: "" });
        } catch (e: any) { setActionError(e.message); }
    }

    async function handleUpdate() {
        if (!editing) return;
        setActionError(null);
        try {
            await updateBudget(editing.id, editForm);
            setEditing(null);
            setEditForm({});
        } catch (e: any) { setActionError(e.message); }
    }

    function openEdit(b: Budget) {
        setEditing(b);
        setEditForm({ name: b.name, totalAmount: b.totalAmount, fromDate: b.fromDate, toDate: b.toDate });
        setShowCreate(false);
        setActionError(null);
    }

    return (
        <div className="space-y-8 font-sans">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Budgets</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Budget vs actuals &bull; Alert at 80% and 100%
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={refetch} disabled={isLoading} className="h-10 px-4 border border-[#121212]/10 text-xs font-semibold uppercase tracking-widest text-[#121212] hover:bg-[#F4F1EA]/40 disabled:opacity-40 transition-colors rounded-xl flex items-center space-x-2">
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                    </button>
                    <button onClick={() => { setShowCreate((v) => !v); setEditing(null); setActionError(null); }} className="h-10 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/80 rounded-xl flex items-center space-x-2">
                        <Plus className="w-3.5 h-3.5" /><span>New Budget</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center space-x-2 text-red-600 text-xs bg-red-50 border border-red-200 p-4 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
                </div>
            )}

            <div className="flex gap-6 items-start">
                <div className="flex-1 min-w-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {isLoading ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />) :
                            budgets.length === 0 ? (
                                <div className="col-span-3 bg-white border border-[#121212]/10 rounded-xl p-10 text-center text-xs text-[#8A817C] font-light">No budgets found. Create one to get started.</div>
                            ) : budgets.map((b) => {
                                const pct = Math.min(b.utilizationPct ?? 0, 100);
                                const barColor = b.utilizationPct >= 100 ? "bg-red-500" : b.utilizationPct >= 80 ? "bg-amber-500" : "bg-green-500";
                                const textColor = b.utilizationPct >= 100 ? "text-red-700" : b.utilizationPct >= 80 ? "text-amber-700" : "text-green-700";
                                return (
                                    <div key={b.id} className="bg-white border border-[#121212]/10 p-6 rounded-xl space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-xs font-semibold text-[#121212]">{b.name}</p>
                                                <p className="text-[10px] text-[#8A817C] mt-0.5">{b.account?.name}</p>
                                            </div>
                                            <button onClick={() => openEdit(b)} className="text-[#8A817C] hover:text-[#121212]">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] font-mono">
                                                <span className="text-[#8A817C]">Actuals</span>
                                                <span className={`font-semibold ${textColor}`}>{fmt(b.actuals ?? 0)}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-mono">
                                                <span className="text-[#8A817C]">Budget</span>
                                                <span className="text-[#121212]">{fmt(b.totalAmount)}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="h-2 bg-[#F4F1EA] rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                                            </div>
                                            <div className="flex justify-between mt-1">
                                                <p className="text-[10px] text-[#8A817C] font-mono">{b.fund?.name}</p>
                                                <p className={`text-[10px] font-mono font-semibold ${textColor}`}>{(b.utilizationPct ?? 0).toFixed(1)}%</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-[9px] text-[#8A817C] font-mono">
                                            <span>{new Date(b.fromDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                            <span>→</span>
                                            <span>{new Date(b.toDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* Create panel */}
                {showCreate && (
                    <div className="w-[360px] shrink-0 bg-white border border-[#121212]/10 rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-widest text-[#121212] flex items-center space-x-2"><Target className="w-3.5 h-3.5" /><span>New Budget</span></p>
                            <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-[#8A817C]" /></button>
                        </div>
                        {actionError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{actionError}</p>}
                        {[
                            { label: "Name *", key: "name", type: "text", placeholder: "Budget name" },
                            { label: "Total Amount *", key: "totalAmount", type: "number", placeholder: "0.00" },
                            { label: "From Date *", key: "fromDate", type: "date", placeholder: "" },
                            { label: "To Date *", key: "toDate", type: "date", placeholder: "" },
                        ].map(({ label, key, type, placeholder }) => (
                            <div key={key}>
                                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">{label}</label>
                                <input type={type} value={(form as any)[key] || ""} placeholder={placeholder}
                                    onChange={(e) => setForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                                    className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none" />
                            </div>
                        ))}
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Account *</label>
                            <select value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                                className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none">
                                <option value="">Select account</option>
                                {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Fund *</label>
                            <select value={form.fundId} onChange={(e) => setForm((f) => ({ ...f, fundId: e.target.value }))}
                                className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none">
                                <option value="">Select fund</option>
                                {funds.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.type})</option>)}
                            </select>
                        </div>
                        <button onClick={handleCreate} disabled={isSubmitting || !form.name || !form.accountId || !form.fundId || !form.totalAmount || !form.fromDate || !form.toDate}
                            className="w-full h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-xl disabled:opacity-40">
                            {isSubmitting ? "Creating…" : "Create Budget"}
                        </button>
                    </div>
                )}

                {/* Edit panel */}
                {editing && !showCreate && (
                    <div className="w-[360px] shrink-0 bg-white border border-[#121212]/10 rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-widest text-[#121212]">Edit Budget</p>
                            <button onClick={() => setEditing(null)}><X className="w-4 h-4 text-[#8A817C]" /></button>
                        </div>
                        {actionError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{actionError}</p>}
                        {[
                            { label: "Name", key: "name", type: "text" },
                            { label: "Total Amount", key: "totalAmount", type: "number" },
                            { label: "From Date", key: "fromDate", type: "date" },
                            { label: "To Date", key: "toDate", type: "date" },
                        ].map(({ label, key, type }) => (
                            <div key={key}>
                                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">{label}</label>
                                <input type={type} value={(editForm as any)[key] ?? ""}
                                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
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
