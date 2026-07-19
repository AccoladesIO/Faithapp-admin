"use client";

import { DismissibleError } from "@/components/ui/dismissible-error";

import React, { useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { Repeat, Plus, Pencil, X, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import {
    useRecurringEntries,
    RecurringEntry,
    CreateRecurringEntryPayload,
    RecurringFrequency,
} from "@/hooks/use-recurring-entries";
import { useAccounts } from "@/hooks/use-accounts";
import { useFunds } from "@/hooks/use-funds";
import { currencySymbol, formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/utils/currency";


const FREQ_LABELS: Record<RecurringFrequency, string> = {
    WEEKLY: "Weekly",
    MONTHLY: "Monthly",
    QUARTERLY: "Quarterly",
};

const FREQ_COLORS: Record<RecurringFrequency, string> = {
    WEEKLY: "bg-blue-100 text-blue-800",
    MONTHLY: "bg-purple-100 text-purple-800",
    QUARTERLY: "bg-amber-100 text-amber-800",
};

const BLANK: CreateRecurringEntryPayload = {
    description: "",
    debitAccountId: "",
    creditAccountId: "",
    amount: 0,
    frequency: "MONTHLY",
    fundId: "",
    nextDueAt: "",
};

function RowSkeleton() {
    return (
        <tr className="border-b border-[#121212]/5 animate-pulse">
            {[48, 24, 24, 20, 16, 20, 16].map((w, i) => (
                <td key={i} className="p-4">
                    <div className="h-3 bg-[#F4F1EA] rounded" style={{ width: `${w * 3}px` }} />
                </td>
            ))}
            <td className="p-4"><div className="h-3 w-16 bg-[#F4F1EA] rounded" /></td>
        </tr>
    );
}

export default withAuth(function RecurringEntriesPage() {
    const { entries, isLoading, isSubmitting, error, createEntry, updateEntry, refetch } =
        useRecurringEntries();
    const { accounts } = useAccounts();
    const { funds } = useFunds();

    const [showCreate, setShowCreate] = useState(false);
    const [editing, setEditing] = useState<RecurringEntry | null>(null);
    const [form, setForm] = useState<CreateRecurringEntryPayload>(BLANK);
    const [editForm, setEditForm] = useState<{ description?: string; amount?: number; nextDueAt?: string; isActive?: boolean }>({});
    const [actionError, setActionError] = useState<string | null>(null);

    function openCreate() {
        setEditing(null);
        setForm(BLANK);
        setActionError(null);
        setShowCreate(true);
    }

    function openEdit(e: RecurringEntry) {
        setEditing(e);
        setEditForm({ description: e.description, amount: e.amount, nextDueAt: e.nextDueAt.slice(0, 10), isActive: e.isActive });
        setActionError(null);
        setShowCreate(false);
    }

    function closePanel() {
        setShowCreate(false);
        setEditing(null);
        setActionError(null);
    }

    async function handleCreate() {
        if (!form.description || !form.debitAccountId || !form.creditAccountId || !form.amount || !form.fundId || !form.nextDueAt) return;
        setActionError(null);
        try {
            await createEntry(form);
            closePanel();
        } catch (e: unknown) {
            setActionError((e as Error).message);
        }
    }

    async function handleUpdate() {
        if (!editing) return;
        setActionError(null);
        try {
            await updateEntry(editing.id, editForm);
            closePanel();
        } catch (e: unknown) {
            setActionError((e as Error).message);
        }
    }

    async function toggleActive(entry: RecurringEntry) {
        try {
            await updateEntry(entry.id, { isActive: !entry.isActive });
        } catch (e: unknown) {
            setActionError((e as Error).message);
        }
    }

    const panelOpen = showCreate || !!editing;

    return (
        <div className="space-y-8 font-sans">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Recurring Entries</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Scheduled journal entries — auto-posted on due date
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={refetch}
                        disabled={isLoading}
                        className="h-10 px-4 border border-[#121212]/10 text-[#121212] text-xs font-semibold uppercase tracking-widest hover:bg-[#F4F1EA]/40 disabled:opacity-40 transition-colors rounded-xl flex items-center space-x-2"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={openCreate}
                        className="h-10 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/80 transition-colors rounded-xl flex items-center space-x-2"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Entry</span>
                    </button>
                </div>
            </div>

                            <DismissibleError message={error} />

                            <DismissibleError message={actionError} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className={`${panelOpen ? "lg:col-span-7" : "lg:col-span-12"} bg-white border border-[#121212]/10 rounded-xl overflow-hidden transition-all`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["Description", "Debit Account", "Credit Account", "Amount", "Frequency", "Next Due", "Status", ""].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
                                ) : entries.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-10 text-center text-xs text-[#8A817C] font-light">
                                            No recurring entries. Add one to automate regular journal postings.
                                        </td>
                                    </tr>
                                ) : (
                                    entries.map((e) => (
                                        <tr key={e.id} className={`hover:bg-[#F4F1EA]/20 transition-colors ${!e.isActive ? "opacity-50" : ""} ${editing?.id === e.id ? "bg-[#F4F1EA]/50" : ""}`}>
                                            <td className="p-4 text-xs font-medium text-[#121212]">
                                                <div className="flex items-center space-x-2">
                                                    <Repeat className="w-3.5 h-3.5 text-[#8A817C] shrink-0" />
                                                    <span>{e.description}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-xs text-[#8A817C]">
                                                <div>{e.debitAccount.name}</div>
                                                <div className="font-mono text-[10px]">{e.debitAccount.code}</div>
                                            </td>
                                            <td className="p-4 text-xs text-[#8A817C]">
                                                <div>{e.creditAccount.name}</div>
                                                <div className="font-mono text-[10px]">{e.creditAccount.code}</div>
                                            </td>
                                            <td className="p-4 font-mono text-xs font-medium text-[#121212]">{formatCurrency(e.amount)}</td>
                                            <td className="p-4">
                                                <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${FREQ_COLORS[e.frequency]}`}>
                                                    {FREQ_LABELS[e.frequency]}
                                                </span>
                                            </td>
                                            <td className="p-4 font-mono text-xs text-[#8A817C]">
                                                {new Date(e.nextDueAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                            </td>
                                            <td className="p-4">
                                                {e.isActive ? (
                                                    <span className="inline-flex items-center space-x-1 text-[9px] font-bold uppercase tracking-wider text-green-700">
                                                        <CheckCircle className="w-3 h-3" /><span>Active</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center space-x-1 text-[9px] font-bold uppercase tracking-wider text-[#8A817C]">
                                                        <XCircle className="w-3 h-3" /><span>Paused</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center space-x-2 justify-end">
                                                    <button
                                                        onClick={() => toggleActive(e)}
                                                        disabled={isSubmitting}
                                                        className="h-7 px-2.5 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider hover:bg-[#F4F1EA]/40 rounded-lg transition-colors disabled:opacity-40"
                                                    >
                                                        {e.isActive ? "Pause" : "Resume"}
                                                    </button>
                                                    <button
                                                        onClick={() => openEdit(e)}
                                                        className="h-7 px-2.5 border border-[#121212]/10 text-[#121212] text-[10px] font-semibold uppercase tracking-wider hover:bg-[#F4F1EA]/40 rounded-lg flex items-center space-x-1.5 transition-colors"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                        <span>Edit</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {panelOpen && (
                    <div className="lg:col-span-5 bg-white border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#121212]/10">
                            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#121212]">
                                {editing ? "Edit Recurring Entry" : "New Recurring Entry"}
                            </h2>
                            <button onClick={closePanel} className="text-[#8A817C] hover:text-[#121212] transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 flex-1">
                            <DismissibleError message={actionError} />

                            {editing ? (
                                <>
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Description</label>
                                        <input className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20" value={editForm.description ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#8A817C] select-none pointer-events-none">{currencySymbol}</span>
                                            <input type="text" inputMode="decimal" value={formatCurrencyInput(editForm.amount ?? 0)} placeholder="0"
                                                onChange={(e) => setEditForm((f) => ({ ...f, amount: parseCurrencyInput(e.target.value) }))}
                                                className="w-full border border-[#121212]/10 rounded-xl pl-7 pr-3 py-2.5 text-xs font-mono text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Next Due Date</label>
                                        <input type="date" className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20" value={editForm.nextDueAt ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, nextDueAt: e.target.value }))} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Description</label>
                                        <input className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20" placeholder="e.g. Monthly office rent" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Debit Account</label>
                                            <select className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20 bg-white" value={form.debitAccountId} onChange={(e) => setForm((f) => ({ ...f, debitAccountId: e.target.value }))}>
                                                <option value="">Select…</option>
                                                {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Credit Account</label>
                                            <select className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20 bg-white" value={form.creditAccountId} onChange={(e) => setForm((f) => ({ ...f, creditAccountId: e.target.value }))}>
                                                <option value="">Select…</option>
                                                {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Amount</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#8A817C] select-none pointer-events-none">{currencySymbol}</span>
                                                <input type="text" inputMode="decimal" value={formatCurrencyInput(form.amount)} placeholder="0"
                                                    onChange={(e) => setForm((f) => ({ ...f, amount: parseCurrencyInput(e.target.value) }))}
                                                    className="w-full border border-[#121212]/10 rounded-xl pl-7 pr-3 py-2.5 text-xs font-mono text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Frequency</label>
                                            <select className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20 bg-white" value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as RecurringFrequency }))}>
                                                {(["WEEKLY", "MONTHLY", "QUARTERLY"] as RecurringFrequency[]).map((f) => <option key={f} value={f}>{FREQ_LABELS[f]}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Fund</label>
                                            <select className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20 bg-white" value={form.fundId} onChange={(e) => setForm((f) => ({ ...f, fundId: e.target.value }))}>
                                                <option value="">Select…</option>
                                                {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">First Due Date</label>
                                            <input type="date" className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20" value={form.nextDueAt} onChange={(e) => setForm((f) => ({ ...f, nextDueAt: e.target.value }))} />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-[#121212]/10 flex justify-end space-x-3">
                            <button onClick={closePanel} className="h-9 px-4 border border-[#121212]/10 text-[#121212] text-xs font-semibold uppercase tracking-widest rounded-xl hover:bg-[#F4F1EA]/40 transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={editing ? handleUpdate : handleCreate}
                                disabled={isSubmitting}
                                className="h-9 px-5 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-xl hover:bg-[#121212]/80 disabled:opacity-40 transition-colors"
                            >
                                {isSubmitting ? "Saving…" : editing ? "Update" : "Create"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}, { requiredPermission: 'finance:read' });
