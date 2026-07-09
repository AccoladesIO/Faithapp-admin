"use client";

import { DismissibleError } from "@/components/ui/dismissible-error";

import React, { useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { Target, Plus, X, RefreshCw, Pencil } from "lucide-react";
import { useBudgets, Budget, BudgetPeriod, CreateBudgetPayload, UpdateBudgetPayload } from "@/hooks/use-budgets";
import { useAccounts } from "@/hooks/use-accounts";
import { useFunds } from "@/hooks/use-funds";
import { currencySymbol, formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/utils/currency";



const PERIOD_OPTIONS: { value: BudgetPeriod; label: string }[] = [
    { value: "MONTHLY", label: "Monthly" },
    { value: "ANNUAL", label: "Annual" },
    { value: "CUSTOM", label: "Custom" },
];

function CardSkeleton() {
    return (
        <div className="bg-white border border-[#121212]/10 p-6 rounded-xl space-y-3">
            <div className="h-3 w-32 bg-[#F4F1EA] rounded animate-pulse" />
            <div className="h-4 w-24 bg-[#F4F1EA] rounded animate-pulse" />
            <div className="h-2 w-full bg-[#F4F1EA] rounded-full animate-pulse" />
        </div>
    );
}

const emptyForm = (): CreateBudgetPayload => ({
    name: "", accountId: "", fundId: "", period: "MONTHLY", amount: 0, startDate: "", endDate: "",
});

export default withAuth(function BudgetsPage() {
    const { budgets, isLoading, isSubmitting, error, activeFilter, applyFilter, createBudget, updateBudget, deactivateBudget, reactivateBudget, refetch } = useBudgets();
    const { accounts } = useAccounts();
    const { funds } = useFunds();

    const [showCreate, setShowCreate] = useState(false);
    const [editing, setEditing] = useState<Budget | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [form, setForm] = useState<CreateBudgetPayload>(emptyForm());
    const [editForm, setEditForm] = useState<UpdateBudgetPayload>({});

    async function handleCreate() {
        if (!form.name || !form.accountId || !form.fundId || !form.period || !form.amount || !form.startDate || !form.endDate) return;
        setActionError(null);
        try {
            await createBudget(form);
            setShowCreate(false);
            setForm(emptyForm());
        } catch (e: unknown) { setActionError((e as Error).message); }
    }

    async function handleUpdate() {
        if (!editing) return;
        setActionError(null);
        try {
            await updateBudget(editing.id, editForm);
            setEditing(null);
            setEditForm({});
        } catch (e: unknown) { setActionError((e as Error).message); }
    }

    async function handleDeactivate() {
        if (!editing) return;
        setActionError(null);
        try {
            await deactivateBudget(editing.id);
            setEditing(null);
        } catch (e: unknown) { setActionError((e as Error).message); }
    }

    async function handleReactivate() {
        if (!editing) return;
        setActionError(null);
        try {
            await reactivateBudget(editing.id);
            setEditing(null);
        } catch (e: unknown) { setActionError((e as Error).message); }
    }

    function openEdit(b: Budget) {
        setEditing(b);
        setEditForm({ name: b.name, amount: b.amount, startDate: b.startDate, endDate: b.endDate });
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

            <DismissibleError message={error} />

            <div className="flex items-center space-x-1">
                {([
                    { label: "All", value: undefined },
                    { label: "Active", value: true },
                    { label: "Inactive", value: false },
                ] as { label: string; value: boolean | undefined }[]).map((tab) => (
                    <button
                        key={tab.label}
                        onClick={() => applyFilter(tab.value)}
                        className={`h-8 px-4 rounded-full text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                            activeFilter === tab.value
                                ? "bg-[#121212] text-white"
                                : "bg-[#F4F1EA]/60 text-[#8A817C] hover:bg-[#F4F1EA]"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex gap-6 items-start">
                <div className="flex-1 min-w-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {isLoading ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />) :
                            budgets.length === 0 ? (
                                <div className="col-span-3 bg-white border border-[#121212]/10 rounded-xl p-10 text-center text-xs text-[#8A817C] font-light">No budgets found. Create one to get started.</div>
                            ) : budgets.map((b) => {
                                const pct = Math.min(b.utilizationPct ?? 0, 100);
                                const barColor = (b.utilizationPct ?? 0) >= 100 ? "bg-red-500" : (b.utilizationPct ?? 0) >= 80 ? "bg-amber-500" : "bg-green-500";
                                const textColor = (b.utilizationPct ?? 0) >= 100 ? "text-red-700" : (b.utilizationPct ?? 0) >= 80 ? "text-amber-700" : "text-green-700";
                                return (
                                    <div key={b.id} className={`border p-6 rounded-xl space-y-4 transition-colors ${b.isActive ? "bg-white border-[#121212]/10" : "bg-[#F4F1EA]/40 border-[#121212]/5"}`}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className={`text-xs font-semibold ${b.isActive ? "text-[#121212]" : "text-[#8A817C]"}`}>{b.name}</p>
                                                    {!b.isActive && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-widest bg-[#8A817C]/15 text-[#8A817C]">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-[#8A817C] mt-0.5">{b.account?.name}</p>
                                            </div>
                                            <button onClick={() => openEdit(b)} className="text-[#8A817C] hover:text-[#121212] ml-2 shrink-0">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className={`space-y-1 ${!b.isActive ? "opacity-60" : ""}`}>
                                            <div className="flex justify-between text-[10px] font-mono">
                                                <span className="text-[#8A817C]">Actuals</span>
                                                <span className={`font-semibold ${textColor}`}>{formatCurrency(b.actuals ?? 0)}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-mono">
                                                <span className="text-[#8A817C]">Budget</span>
                                                <span className={b.isActive ? "text-[#121212]" : "text-[#8A817C]"}>{formatCurrency(b.amount)}</span>
                                            </div>
                                        </div>
                                        <div className={!b.isActive ? "opacity-60" : ""}>
                                            <div className="h-2 bg-[#F4F1EA] rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                                            </div>
                                            <div className="flex justify-between mt-1">
                                                <p className="text-[10px] text-[#8A817C] font-mono">{b.fund?.name}</p>
                                                <p className={`text-[10px] font-mono font-semibold ${textColor}`}>{(b.utilizationPct ?? 0).toFixed(1)}%</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-[9px] text-[#8A817C] font-mono">
                                            <span>{new Date(b.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                            <span>→</span>
                                            <span>{new Date(b.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
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
                        <DismissibleError message={actionError} />
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Name *</label>
                            <input type="text" value={form.name} placeholder="Budget name"
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Amount *</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#8A817C] select-none pointer-events-none">{currencySymbol}</span>
                                <input type="text" inputMode="decimal" value={formatCurrencyInput(form.amount)} placeholder="0"
                                    onChange={(e) => setForm((f) => ({ ...f, amount: parseCurrencyInput(e.target.value) }))}
                                    className="w-full h-10 pl-7 pr-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none font-mono" />
                            </div>
                        </div>
                        {[
                            { label: "Start Date *", key: "startDate", placeholder: "" },
                            { label: "End Date *", key: "endDate", placeholder: "" },
                        ].map(({ label, key, placeholder }) => (
                            <div key={key}>
                                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">{label}</label>
                                <input type="date" value={(form[key as keyof CreateBudgetPayload] as string) || ""} placeholder={placeholder}
                                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                                    className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none" />
                            </div>
                        ))}
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Period *</label>
                            <select value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value as BudgetPeriod }))}
                                className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none">
                                {PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
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
                        <button onClick={handleCreate} disabled={isSubmitting || !form.name || !form.accountId || !form.fundId || !form.amount || !form.startDate || !form.endDate}
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
                        <DismissibleError message={actionError} />
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Name</label>
                            <input type="text" value={editForm.name ?? ""}
                                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#8A817C] select-none pointer-events-none">{currencySymbol}</span>
                                <input type="text" inputMode="decimal" value={formatCurrencyInput(editForm.amount ?? 0)} placeholder="0"
                                    onChange={(e) => setEditForm((f) => ({ ...f, amount: parseCurrencyInput(e.target.value) }))}
                                    className="w-full h-10 pl-7 pr-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none font-mono" />
                            </div>
                        </div>
                        {[
                            { label: "Start Date", key: "startDate" },
                            { label: "End Date", key: "endDate" },
                        ].map(({ label, key }) => (
                            <div key={key}>
                                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">{label}</label>
                                <input type="date" value={(editForm[key as keyof UpdateBudgetPayload] as string) ?? ""}
                                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                                    className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none" />
                            </div>
                        ))}
                        <button onClick={handleUpdate} disabled={isSubmitting}
                            className="w-full h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-xl disabled:opacity-40">
                            {isSubmitting ? "Saving…" : "Save Changes"}
                        </button>
                        {editing.isActive ? (
                            <button onClick={handleDeactivate} disabled={isSubmitting}
                                className="w-full h-10 border border-red-200 text-red-600 text-xs font-semibold uppercase tracking-widest rounded-xl hover:bg-red-50 disabled:opacity-40 transition-colors">
                                {isSubmitting ? "Deactivating…" : "Deactivate Budget"}
                            </button>
                        ) : (
                            <button onClick={handleReactivate} disabled={isSubmitting}
                                className="w-full h-10 border border-green-200 text-green-700 text-xs font-semibold uppercase tracking-widest rounded-xl hover:bg-green-50 disabled:opacity-40 transition-colors">
                                {isSubmitting ? "Reactivating…" : "Reactivate Budget"}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}, { requiredPermission: 'finance:read' });
