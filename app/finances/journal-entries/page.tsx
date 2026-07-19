"use client";

import { DismissibleError } from "@/components/ui/dismissible-error";

import React, { useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    BookOpen, Plus, CheckCircle2, XCircle, Clock, X, RefreshCw, Trash2,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
    useJournalEntries,
    JournalEntry,
    JournalEntryStatus,
    JournalEntryFilters,
    CreateJournalEntryPayload,
    CreateJournalLinePayload,
    LineType,
} from "@/hooks/use-journal-entries";
import { FinanceAccount, useAccounts } from "@/hooks/use-accounts";
import { AccountingPeriod, useAccountingPeriods } from "@/hooks/use-accounting-periods";
import { toLocalDate } from "@/utils/parse-local-time";
import { currencySymbol, formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/utils/currency";

const STATUS_CONFIG: Record<JournalEntryStatus, { label: string; cls: string; Icon: React.FC<{ className?: string }> }> = {
    DRAFT: { label: "Draft", cls: "bg-gray-100 text-gray-600", Icon: Clock },
    PENDING_APPROVAL: { label: "Pending Approval", cls: "bg-amber-100 text-amber-800", Icon: Clock },
    POSTED: { label: "Posted", cls: "bg-green-100 text-green-800", Icon: CheckCircle2 },
    VOIDED: { label: "Voided", cls: "bg-red-100 text-red-800", Icon: XCircle },
};


const fmtDate = (iso: string) =>
    new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const EMPTY_LINE: CreateJournalLinePayload = { accountId: "", entryType: "DEBIT", amount: 0 };

function RowSkeleton() {
    return (
        <tr className="border-b border-[#121212]/5">
            {[40, 20, 30, 20, 20].map((w, i) => (
                <td key={i} className="p-4">
                    <div className="h-3 bg-[#F4F1EA] rounded animate-pulse" style={{ width: `${w * 3}px` }} />
                </td>
            ))}
        </tr>
    );
}

// ── Create panel ────────────────────────────────────────────────────────────

interface CreateEntryPanelProps {
    isSubmitting: boolean;
    openPeriods: AccountingPeriod[];
    accounts: FinanceAccount[];
    onClose: () => void;
    onSubmit: (payload: CreateJournalEntryPayload) => Promise<unknown>;
}

function CreateEntryPanel({ isSubmitting, openPeriods, accounts, onClose, onSubmit }: CreateEntryPanelProps) {
    const [form, setForm] = useState({
        description: "", date: toLocalDate(), reference: "", accountingPeriodId: "",
        lines: [{ ...EMPTY_LINE }, { ...EMPTY_LINE, entryType: "CREDIT" as LineType }],
    });
    const [error, setError] = useState<string | null>(null);

    const debitTotal = form.lines.filter((l) => l.entryType === "DEBIT").reduce((s, l) => s + Number(l.amount), 0);
    const creditTotal = form.lines.filter((l) => l.entryType === "CREDIT").reduce((s, l) => s + Number(l.amount), 0);
    const isBalanced = debitTotal === creditTotal && debitTotal > 0;
    const validationErrors: string[] = [];
    if (!form.accountingPeriodId) validationErrors.push("Accounting period is required.");
    if (!form.description) validationErrors.push("Description is required.");
    if (form.lines.some((l) => !l.accountId)) validationErrors.push("All lines must have an account selected.");
    if (form.lines.some((l) => Number(l.amount) <= 0)) validationErrors.push("All line amounts must be greater than zero.");
    if (!isBalanced && debitTotal > 0) validationErrors.push(`Debits (${formatCurrency(debitTotal)}) must equal credits (${formatCurrency(creditTotal)}).`);
    if (debitTotal === 0) validationErrors.push("Entry must have at least one debit and one credit.");
    const canSubmit = validationErrors.length === 0;

    function addLine() { setForm((f) => ({ ...f, lines: [...f.lines, { ...EMPTY_LINE }] })); }
    function removeLine(i: number) { setForm((f) => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) })); }
    function updateLine(i: number, patch: Partial<CreateJournalLinePayload>) {
        setForm((f) => { const lines = [...f.lines]; lines[i] = { ...lines[i], ...patch }; return { ...f, lines }; });
    }

    async function handleSubmit() {
        if (!canSubmit) return;
        setError(null);
        try {
            await onSubmit({
                date: form.date,
                description: form.description,
                reference: form.reference || undefined,
                source: "MANUAL",
                entryType: "STANDARD",
                accountingPeriodId: form.accountingPeriodId,
                idempotencyKey: crypto.randomUUID(),
                lines: form.lines.map((l) => ({ accountId: l.accountId, entryType: l.entryType, amount: Number(l.amount) })),
            });
            onClose();
        } catch (e: unknown) { setError((e as Error).message); }
    }

    return (
        <div className="w-[420px] shrink-0 bg-white border border-[#121212]/10 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#121212]">New Journal Entry</p>
                <button onClick={onClose}><X className="w-4 h-4 text-[#8A817C]" /></button>
            </div>

            <DismissibleError message={error} />

            <div className="space-y-3">
                <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Accounting Period *</label>
                    <select value={form.accountingPeriodId} onChange={(e) => setForm((f) => ({ ...f, accountingPeriodId: e.target.value }))}
                        className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none">
                        <option value="">Select period</option>
                        {openPeriods.map((p) => (
                            <option key={p.id} value={p.id}>{p.year}-{String(p.month).padStart(2, "0")}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Entry Date *</label>
                    <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                        className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none" />
                </div>
                <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Description *</label>
                    <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="Entry description"
                        className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none" />
                </div>
                <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Reference</label>
                    <input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                        placeholder="Optional reference"
                        className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none" />
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">Lines</p>
                    <button onClick={addLine} className="text-[10px] font-semibold uppercase tracking-widest text-[#121212] flex items-center space-x-1">
                        <Plus className="w-3 h-3" /><span>Add</span>
                    </button>
                </div>
                {form.lines.map((line, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_80px_24px] gap-2 items-center">
                        <select value={line.accountId} onChange={(e) => updateLine(i, { accountId: e.target.value })}
                            className="h-8 px-2 border border-[#121212]/10 text-[10px] text-[#121212] bg-[#F4F1EA]/30 rounded-lg focus:outline-none">
                            <option value="">Account</option>
                            {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                        </select>
                        <select value={line.entryType} onChange={(e) => updateLine(i, { entryType: e.target.value as LineType })}
                            className="h-8 px-2 border border-[#121212]/10 text-[10px] text-[#121212] bg-[#F4F1EA]/30 rounded-lg focus:outline-none">
                            <option value="DEBIT">DR</option>
                            <option value="CREDIT">CR</option>
                        </select>
                        <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-[#8A817C] select-none pointer-events-none">{currencySymbol}</span>
                            <input type="text" inputMode="decimal" value={formatCurrencyInput(line.amount)} placeholder="0"
                                onChange={(e) => updateLine(i, { amount: parseCurrencyInput(e.target.value) })}
                                className="h-8 pl-4 pr-2 border border-[#121212]/10 text-[10px] font-mono text-[#121212] bg-[#F4F1EA]/30 rounded-lg focus:outline-none" />
                        </div>
                        <button onClick={() => removeLine(i)} disabled={form.lines.length <= 2}
                            className="text-[#8A817C] hover:text-red-500 disabled:opacity-20">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
                <div className={`flex justify-between text-[10px] font-mono font-semibold pt-1 ${isBalanced ? "text-green-700" : "text-red-600"}`}>
                    <span>DR {formatCurrency(debitTotal)}</span>
                    <span>{isBalanced ? "✓ Balanced" : "✗ Unbalanced"}</span>
                    <span>CR {formatCurrency(creditTotal)}</span>
                </div>
            </div>

            {validationErrors.length > 0 && (
                <ul className="space-y-1 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    {validationErrors.map((msg) => (
                        <li key={msg} className="text-[11px] text-amber-800 flex items-start gap-1.5">
                            <span className="mt-0.5 shrink-0">·</span>{msg}
                        </li>
                    ))}
                </ul>
            )}

            <button onClick={handleSubmit} disabled={isSubmitting || !canSubmit}
                className="w-full h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-xl disabled:opacity-40">
                {isSubmitting ? "Creating…" : "Create Entry"}
            </button>
        </div>
    );
}

// ── Detail panel ─────────────────────────────────────────────────────────────

interface EntryDetailPanelProps {
    entry: JournalEntry;
    isDetailLoading: boolean;
    isSubmitting: boolean;
    actionError: string | null;
    onClose: () => void;
    onApprove: () => void;
    onReject: () => void;
    onResubmit: () => void;
    onDelete: () => void;
    onVoid: () => void;
}

function EntryDetailPanel({ entry, isDetailLoading, isSubmitting, actionError, onClose, onApprove, onReject, onResubmit, onDelete, onVoid }: EntryDetailPanelProps) {
    const cfg = STATUS_CONFIG[entry.status];
    return (
        <div className="w-[380px] shrink-0 bg-white border border-[#121212]/10 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#121212] flex items-center space-x-2">
                    <BookOpen className="w-3.5 h-3.5" /><span>Entry Detail</span>
                </p>
                <button onClick={onClose}><X className="w-4 h-4 text-[#8A817C]" /></button>
            </div>

            <DismissibleError message={actionError} />

            <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-[#8A817C]">Date</span><span className="font-mono">{fmtDate(entry.date)}</span></div>
                <div className="flex justify-between"><span className="text-[#8A817C]">Reference</span><span className="font-mono">{entry.reference ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-[#8A817C]">Type</span><span>{entry.entryType}</span></div>
                <div className="flex justify-between items-center">
                    <span className="text-[#8A817C]">Status</span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${cfg.cls}`}>{cfg.label}</span>
                </div>
                {entry.createdBy?.member && (
                    <div className="flex justify-between">
                        <span className="text-[#8A817C]">Created by</span>
                        <span>{entry.createdBy.member.firstname} {entry.createdBy.member.lastname}</span>
                    </div>
                )}
                {entry.approvedBy?.member && (
                    <div className="flex justify-between">
                        <span className="text-[#8A817C]">Approved by</span>
                        <span>{entry.approvedBy.member.firstname} {entry.approvedBy.member.lastname}</span>
                    </div>
                )}
            </div>

            <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Description</p>
                <p className="text-xs text-[#121212]">{entry.description}</p>
            </div>

            <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Lines</p>
                {isDetailLoading ? (
                    <div className="space-y-2">
                        {[70, 90, 70].map((w, i) => <div key={i} className="h-3 bg-[#F4F1EA] rounded animate-pulse" style={{ width: `${w}%` }} />)}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {(entry.lines ?? []).map((line) => (
                            <div key={line.id} className="flex items-center justify-between gap-3 text-xs">
                                <div className="min-w-0">
                                    <span className="font-mono text-[10px] text-[#8A817C]">{line.account?.code}</span>
                                    <span className="text-[#8A817C] mx-1">·</span>
                                    <span className="text-[#121212]">{line.account?.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${line.entryType === "DEBIT" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                                        {line.entryType === "DEBIT" ? "DR" : "CR"}
                                    </span>
                                    <span className="font-mono font-semibold text-[#121212]">{formatCurrency(line.amount)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {entry.status === "DRAFT" && (
                <div className="space-y-3 pt-2 border-t border-[#121212]/10">
                    <button onClick={onResubmit} disabled={isSubmitting}
                        className="w-full h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-xl disabled:opacity-40 flex items-center justify-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5" /><span>{isSubmitting ? "Submitting…" : "Resubmit for Approval"}</span>
                    </button>
                    <button onClick={onDelete} disabled={isSubmitting}
                        className="w-full h-9 border border-red-300 text-red-700 text-xs font-semibold uppercase tracking-widest rounded-xl disabled:opacity-40">
                        {isSubmitting ? "Deleting…" : "Delete Entry"}
                    </button>
                </div>
            )}

            {entry.status === "PENDING_APPROVAL" && (
                <div className="space-y-3 pt-2 border-t border-[#121212]/10">
                    <button onClick={onApprove} disabled={isSubmitting}
                        className="w-full h-10 bg-green-700 text-white text-xs font-semibold uppercase tracking-widest rounded-xl disabled:opacity-40 flex items-center justify-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5" /><span>{isSubmitting ? "Processing…" : "Approve & Post"}</span>
                    </button>
                    <button onClick={onReject} disabled={isSubmitting}
                        className="w-full h-9 border border-amber-300 text-amber-700 text-xs font-semibold uppercase tracking-widest rounded-xl disabled:opacity-40">
                        {isSubmitting ? "Declining…" : "Decline"}
                    </button>
                </div>
            )}

            {entry.status === "POSTED" && (
                <div className="pt-2 border-t border-[#121212]/10">
                    <button onClick={onVoid} disabled={isSubmitting}
                        className="w-full h-9 border border-red-300 text-red-700 text-xs font-semibold uppercase tracking-widest rounded-xl disabled:opacity-40">
                        {isSubmitting ? "Voiding…" : "Void Entry"}
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default withAuth(function JournalEntriesPage() {
    const {
        entries, pagination, isLoading, isSubmitting, error,
        goToPage, applyFilters, createEntry, fetchEntryById,
        approveEntry, rejectEntry, resubmitEntry, deleteEntry, voidEntry, refetch,
    } = useJournalEntries();
    const { accounts } = useAccounts();
    const { periods } = useAccountingPeriods();
    const openPeriods = periods.filter((p) => p.status === "OPEN");

    const [selected, setSelected] = useState<JournalEntry | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [draftFilters, setDraftFilters] = useState<JournalEntryFilters>({});
    const [actionError, setActionError] = useState<string | null>(null);

    async function openDetail(id: string) {
        setIsDetailLoading(true);
        setShowCreate(false);
        setActionError(null);
        try {
            setSelected(await fetchEntryById(id));
        } catch { /* keep panel open with stale data */ } finally {
            setIsDetailLoading(false);
        }
    }

    async function run(action: () => Promise<unknown>, afterId?: string) {
        setActionError(null);
        try {
            await action();
            if (afterId) await openDetail(afterId);
        } catch (e: unknown) { setActionError((e as Error).message); }
    }

    return (
        <div className="space-y-8 font-sans">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Journal Entries</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Double-entry ledger &bull; Segregated approval
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={refetch} disabled={isLoading} className="h-10 px-4 border border-[#121212]/10 text-xs font-semibold uppercase tracking-widest text-[#121212] hover:bg-[#F4F1EA]/40 disabled:opacity-40 transition-colors rounded-xl flex items-center space-x-2">
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /><span>Refresh</span>
                    </button>
                    <button onClick={() => { setShowCreate((v) => !v); setSelected(null); }} className="h-10 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/80 transition-colors rounded-xl flex items-center space-x-2">
                        <Plus className="w-3.5 h-3.5" /><span>New Entry</span>
                    </button>
                </div>
            </div>

                            <DismissibleError message={error} />

            <div className="flex flex-wrap gap-3 items-end">
                <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Status</label>
                    <select value={draftFilters.status ?? ""} onChange={(e) => setDraftFilters((f) => ({ ...f, status: e.target.value as JournalEntryStatus | "" }))}
                        className="h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-white rounded-xl focus:outline-none">
                        <option value="">All</option>
                        <option value="DRAFT">Draft</option>
                        <option value="PENDING_APPROVAL">Pending Approval</option>
                        <option value="POSTED">Posted</option>
                        <option value="VOIDED">Voided</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">From</label>
                    <input type="date" value={draftFilters.fromDate ?? ""} onChange={(e) => setDraftFilters((f) => ({ ...f, fromDate: e.target.value }))}
                        className="h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-white rounded-xl focus:outline-none" />
                </div>
                <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">To</label>
                    <input type="date" value={draftFilters.toDate ?? ""} onChange={(e) => setDraftFilters((f) => ({ ...f, toDate: e.target.value }))}
                        className="h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-white rounded-xl focus:outline-none" />
                </div>
                <button onClick={() => applyFilters(draftFilters)} className="h-10 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-xl">Apply</button>
                <button onClick={() => { setDraftFilters({}); applyFilters({}); }} className="h-10 px-4 border border-[#121212]/10 text-xs font-semibold uppercase tracking-widest text-[#8A817C] rounded-xl">Reset</button>
            </div>

            <div className={`flex gap-6 ${showCreate || selected ? "items-start" : ""}`}>
                <div className="flex-1 min-w-0">
                    <div className="bg-white border border-[#121212]/10 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                        {["Date", "Reference", "Description", "Lines", "Status"].map((h) => (
                                            <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#121212]/5">
                                    {isLoading ? Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />) :
                                        entries.length === 0 ? (
                                            <tr><td colSpan={5} className="p-10 text-center text-xs text-[#8A817C] font-light">No journal entries found.</td></tr>
                                        ) : entries.map((entry) => {
                                            const cfg = STATUS_CONFIG[entry.status];
                                            return (
                                                <tr key={entry.id} onClick={() => openDetail(entry.id)}
                                                    className={`cursor-pointer hover:bg-[#F4F1EA]/20 transition-colors ${selected?.id === entry.id ? "bg-[#F4F1EA]/30" : ""}`}>
                                                    <td className="p-4 font-mono text-xs text-[#8A817C]">{fmtDate(entry.date)}</td>
                                                    <td className="p-4 text-xs text-[#8A817C] font-mono">{entry.reference ?? "—"}</td>
                                                    <td className="p-4 text-xs text-[#121212] font-medium max-w-[200px] truncate">{entry.description}</td>
                                                    <td className="p-4 font-mono text-xs text-[#8A817C]">{entry.lines?.length ?? 0}</td>
                                                    <td className="p-4">
                                                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${cfg.cls}`}>
                                                            <cfg.Icon className="w-3 h-3" />
                                                            <span>{cfg.label}</span>
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <PaginationBar pagination={pagination} onPage={goToPage} isLoading={isLoading} label="entries" />
                </div>

                {showCreate && (
                    <CreateEntryPanel
                        isSubmitting={isSubmitting}
                        openPeriods={openPeriods}
                        accounts={accounts}
                        onClose={() => setShowCreate(false)}
                        onSubmit={createEntry}
                    />
                )}

                {selected && !showCreate && (
                    <EntryDetailPanel
                        entry={selected}
                        isDetailLoading={isDetailLoading}
                        isSubmitting={isSubmitting}
                        actionError={actionError}
                        onClose={() => setSelected(null)}
                        onApprove={() => run(() => approveEntry(selected.id), selected.id)}
                        onReject={() => run(() => rejectEntry(selected.id), selected.id)}
                        onResubmit={() => run(() => resubmitEntry(selected.id), selected.id)}
                        onDelete={() => run(async () => { await deleteEntry(selected.id); setSelected(null); })}
                        onVoid={async () => {
                            setActionError(null);
                            try { const u = await voidEntry(selected.id); await openDetail(u.id); }
                            catch (e: unknown) { setActionError((e as Error).message); }
                        }}
                    />
                )}
            </div>
        </div>
    );
}, { requiredPermission: 'finance:read' });
