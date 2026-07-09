"use client";

import { DismissibleError } from "@/components/ui/dismissible-error";

import React, { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { withAuth } from "@/utils/auth/with-auth";
import {
    X,
    AlertCircle,
    Download,
    Upload,
    RefreshCw,
    CheckCircle2,
    XCircle,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { api } from "@/utils/auth/axios-client";
import {
    useTitheAccounts,
    useTitheBatches,
    useTitheUnmatched,
    useTitheDisputes,
    useTitheProofs,
    useTitheRecords,
    downloadTitheTemplate,
    downloadTitheRecords,
    TitheAccount,
    TitheUploadBatch,
    TitheUnmatchedRecord,
    TitheDisputeRecord,
    TithePaymentProof,
    TitheRecord,
    CurrencyCode,
    TitheBatchStatus,
    TitheUnmatchedStatus,
    TitheDisputeStatus,
    TitheProofStatus,
    TitheSource,
    CreateTitheAccountPayload,
    UpdateTitheAccountPayload,
    TitheRecordFilters,
    TitheMemberRef,
} from "@/hooks/use-tithes";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

type Tab = "accounts" | "records" | "upload" | "unmatched" | "disputes" | "proofs";

const TABS: { key: Tab; label: string }[] = [
    { key: "accounts", label: "Accounts" },
    { key: "records", label: "Records" },
    { key: "upload", label: "Upload" },
    { key: "unmatched", label: "Unmatched" },
    { key: "disputes", label: "Disputes" },
    { key: "proofs", label: "Proofs" },
];

const CURRENCIES: CurrencyCode[] = ["NGN", "USD", "GBP", "EUR"];

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const fmtMoney = (amount: number | string, currency = "NGN") => {
    const n = Number(amount);
    const symbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : "₦";
    return `${symbol}${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const memberName = (m: TitheMemberRef | null | undefined) =>
    m ? `${m.firstname} ${m.lastname}` : "—";

function SkeletonRow({ cols }: { cols: number }) {
    return (
        <tr className="border-b border-[#121212]/5">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="p-4">
                    <div className="h-3 bg-[#F4F1EA] rounded animate-pulse" style={{ width: `${60 + (i % 3) * 30}px` }} />
                </td>
            ))}
        </tr>
    );
}


function BatchStatusBadge({ status }: { status: TitheBatchStatus }) {
    const map: Record<TitheBatchStatus, string> = {
        PENDING: "bg-[#F4F1EA] text-[#8A817C]",
        PROCESSING: "bg-yellow-50 text-yellow-700",
        COMPLETED: "bg-green-50 text-green-700",
        FAILED: "bg-red-50 text-red-600",
    };
    return (
        <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${map[status]}`}>
            {status}
        </span>
    );
}

function UnmatchedStatusBadge({ status }: { status: TitheUnmatchedStatus }) {
    const map: Record<TitheUnmatchedStatus, string> = {
        PENDING: "bg-yellow-50 text-yellow-700",
        MATCHED: "bg-green-50 text-green-700",
        DISMISSED: "bg-[#F4F1EA] text-[#8A817C]",
    };
    return (
        <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${map[status]}`}>
            {status}
        </span>
    );
}

function DisputeStatusBadge({ status }: { status: TitheDisputeStatus }) {
    const map: Record<TitheDisputeStatus, string> = {
        PENDING: "bg-yellow-50 text-yellow-700",
        CONFIRMED_VALID: "bg-green-50 text-green-700",
        REJECTED: "bg-red-50 text-red-600",
    };
    const labels: Record<TitheDisputeStatus, string> = {
        PENDING: "Pending",
        CONFIRMED_VALID: "Confirmed",
        REJECTED: "Rejected",
    };
    return (
        <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${map[status]}`}>
            {labels[status]}
        </span>
    );
}

function ProofStatusBadge({ status }: { status: TitheProofStatus }) {
    const map: Record<TitheProofStatus, string> = {
        PENDING: "bg-yellow-50 text-yellow-700",
        CONFIRMED: "bg-green-50 text-green-700",
        DECLINED: "bg-red-50 text-red-600",
    };
    return (
        <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${map[status]}`}>
            {status}
        </span>
    );
}

function SourceBadge({ source }: { source: TitheSource }) {
    const labels: Record<TitheSource, string> = {
        MANUAL_PROOF: "Proof",
        VIRTUAL_ACCOUNT: "Virtual",
        PAYMENT_GATEWAY: "Gateway",
    };
    return (
        <span className="inline-flex px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-[#EADCC9] text-[#121212]">
            {labels[source]}
        </span>
    );
}

function MemberSearchInput({
    onSelect,
}: {
    onSelect: (member: TitheMemberRef) => void;
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<TitheMemberRef[]>([]);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<TitheMemberRef | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const search = useCallback(async (q: string) => {
        if (q.length < 2) { setResults([]); setOpen(false); return; }
        try {
            const res = await api.get(`/members?search=${encodeURIComponent(q)}&limit=10`);
            const outer = res.data?.data;
            const list = Array.isArray(outer?.data) ? outer.data : [];
            setResults(list as TitheMemberRef[]);
            setOpen(true);
        } catch {
            setResults([]);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        setSelected(null);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(val), 300);
    };

    const pick = (m: TitheMemberRef) => {
        setSelected(m);
        setQuery(`${m.firstname} ${m.lastname}`);
        setOpen(false);
        onSelect(m);
    };

    return (
        <div className="relative">
            <input
                type="text"
                value={query}
                onChange={handleChange}
                placeholder="Search member by name or email…"
                className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm font-light focus:outline-none focus:border-[#121212] rounded-lg"
            />
            {open && results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-[#121212]/10 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {results.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => pick(m)}
                            className="w-full text-left px-4 py-2.5 hover:bg-[#F4F1EA]/50 transition-colors"
                        >
                            <div className="text-xs font-medium text-[#121212]">{m.firstname} {m.lastname}</div>
                            <div className="text-[10px] text-[#8A817C]">{m.email}</div>
                        </button>
                    ))}
                </div>
            )}
            {selected && (
                <div className="mt-1 text-[10px] text-green-700 font-semibold">
                    Selected: {selected.firstname} {selected.lastname}
                </div>
            )}
        </div>
    );
}

function AccountsTab() {
    const { accounts, isLoading, isSubmitting, error, createAccount, updateAccount } = useTitheAccounts();
    const [editing, setEditing] = useState<TitheAccount | null>(null);
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountName, setAccountName] = useState("");
    const [currency, setCurrency] = useState<CurrencyCode>("NGN");
    const [description, setDescription] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [formError, setFormError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const resetForm = () => {
        setBankName(""); setAccountNumber(""); setAccountName("");
        setCurrency("NGN"); setDescription(""); setIsActive(true);
        setEditing(null); setFormError(null); setSuccess(null);
    };

    const loadForEdit = (acc: TitheAccount) => {
        setEditing(acc);
        setBankName(acc.bankName);
        setAccountNumber(acc.accountNumber);
        setAccountName(acc.accountName);
        setCurrency(acc.currency);
        setDescription(acc.description ?? "");
        setIsActive(acc.isActive);
        setFormError(null);
        setSuccess(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setSuccess(null);
        try {
            if (editing) {
                const payload: UpdateTitheAccountPayload = { bankName, accountNumber, accountName, currency, isActive };
                if (description) payload.description = description;
                await updateAccount(editing.id, payload);
                setSuccess("Account updated.");
            } else {
                const payload: CreateTitheAccountPayload = { bankName, accountNumber, accountName, currency };
                if (description) payload.description = description;
                await createAccount(payload);
                setSuccess("Account created.");
                resetForm();
            }
        } catch (err: unknown) {
            const e = err as ApiError;
            setFormError(e?.message ?? "Failed.");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4">
                <div className="bg-white border border-[#121212]/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-5">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">
                            {editing ? "Edit Account" : "New Account"}
                        </p>
                        {editing && (
                            <button type="button" onClick={resetForm} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 rounded-md">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Bank Name *</label>
                            <input
                                required
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                placeholder="e.g. Access Bank"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Account Number *</label>
                            <input
                                required
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                placeholder="0123456789"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Account Name *</label>
                            <input
                                required
                                value={accountName}
                                onChange={(e) => setAccountName(e.target.value)}
                                className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                placeholder="Church account name"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Currency *</label>
                            <select
                                required
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                                className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                            >
                                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Description</label>
                            <textarea
                                rows={2}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full p-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                                placeholder="Optional description…"
                            />
                        </div>
                        {editing && (
                            <div className="flex items-center space-x-3">
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={isActive}
                                    onClick={() => setIsActive((v) => !v)}
                                    className={`w-10 h-5 rounded-full transition-colors ${isActive ? "bg-[#121212]" : "bg-[#8A817C]/40"} relative`}
                                >
                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                                </button>
                                <span className="text-xs text-[#121212]">{isActive ? "Active" : "Inactive"}</span>
                            </div>
                        )}
                        {formError && (
                            <div className="flex items-center space-x-2 text-red-600 text-xs">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" /><span>{formError}</span>
                            </div>
                        )}
                        {success && (
                            <div className="flex items-center space-x-2 text-green-700 text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /><span>{success}</span>
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 disabled:opacity-40 transition-colors rounded-xl"
                        >
                            {isSubmitting ? "Saving…" : editing ? "Update Account" : "Create Account"}
                        </button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-8">
                                    <DismissibleError message={error} />
                {isLoading ? (
                    <div className="grid gap-4">
                        {[1, 2, 3].map((k) => (
                            <div key={k} className="bg-white border border-[#121212]/10 rounded-xl p-5 animate-pulse">
                                <div className="h-4 bg-[#F4F1EA] rounded w-48 mb-3" />
                                <div className="h-3 bg-[#F4F1EA] rounded w-32" />
                            </div>
                        ))}
                    </div>
                ) : accounts.length === 0 ? (
                    <div className="bg-white border border-[#121212]/10 rounded-xl p-12 text-center text-xs text-[#8A817C] font-light">
                        No tithe accounts yet. Create one to get started.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {accounts.map((acc) => (
                            <button
                                key={acc.id}
                                type="button"
                                onClick={() => loadForEdit(acc)}
                                className={`w-full text-left bg-white border rounded-xl p-5 transition-colors hover:border-[#121212]/20 ${editing?.id === acc.id ? "border-[#121212]/30 bg-[#F4F1EA]/30" : "border-[#121212]/10"}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="text-sm font-medium text-[#121212]">{acc.accountName}</div>
                                        <div className="text-xs text-[#8A817C] mt-0.5">{acc.bankName} &bull; {acc.accountNumber}</div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-[#EADCC9] text-[#121212]">{acc.currency}</span>
                                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${acc.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                                            {acc.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                </div>
                                {acc.description && (
                                    <p className="mt-2 text-[10px] text-[#8A817C] font-light">{acc.description}</p>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function RecordsTab() {
    const { records, pagination, isLoading, error, filters, applyFilters, goToPage } = useTitheRecords();
    const { accounts } = useTitheAccounts();
    const [selected, setSelected] = useState<TitheRecord | null>(null);
    const [search, setSearch] = useState("");
    const [accountId, setAccountId] = useState("");
    const [fromMonth, setFromMonth] = useState("");
    const [toMonth, setToMonth] = useState("");
    const [downloading, setDownloading] = useState(false);

    const handleApply = () => {
        const f: TitheRecordFilters = {};
        if (search) f.search = search;
        if (accountId) f.accountId = accountId;
        if (fromMonth) f.fromMonth = fromMonth;
        if (toMonth) f.toMonth = toMonth;
        applyFilters(f);
    };

    const handleReset = () => {
        setSearch(""); setAccountId(""); setFromMonth(""); setToMonth("");
        applyFilters({});
    };

    const handleDownload = async () => {
        setDownloading(true);
        try { await downloadTitheRecords(filters); } catch { /* silent */ } finally { setDownloading(false); }
    };

    const tableColSpan = selected ? "lg:col-span-7" : "lg:col-span-12";

    return (
        <div className="space-y-4">
            <div className="bg-white border border-[#121212]/10 rounded-xl p-4">
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">Search</label>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Name, email, reference…"
                            className="h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-lg min-w-[180px]"
                        />
                    </div>
                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">Account</label>
                        <select
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            className="h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-lg appearance-none min-w-[160px]"
                        >
                            <option value="">All Accounts</option>
                            {accounts.map((a) => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">From Month</label>
                        <input
                            type="month"
                            value={fromMonth}
                            onChange={(e) => setFromMonth(e.target.value)}
                            className="h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-lg"
                        />
                    </div>
                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">To Month</label>
                        <input
                            type="month"
                            value={toMonth}
                            onChange={(e) => setToMonth(e.target.value)}
                            className="h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-lg"
                        />
                    </div>
                    <button type="button" onClick={handleApply} className="h-9 px-4 bg-[#121212] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors rounded-lg">Apply</button>
                    <button type="button" onClick={handleReset} className="h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-widest hover:text-[#121212] transition-colors rounded-lg">Reset</button>
                    <button type="button" onClick={handleDownload} disabled={downloading} className="h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-widest hover:text-[#121212] transition-colors rounded-lg flex items-center space-x-1.5 disabled:opacity-40">
                        <Download className="w-3 h-3" /><span>{downloading ? "Exporting…" : "Export"}</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className={`${tableColSpan} bg-white border border-[#121212]/10 rounded-xl overflow-hidden`}>
                                            <DismissibleError message={error} />
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["Date", "Member", "Amount", "Bank", "Source"].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                {isLoading
                                    ? [0, 1, 2, 3, 4, 5].map((k) => <SkeletonRow key={k} cols={5} />)
                                    : records.length === 0
                                    ? (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                                No tithe records found.
                                            </td>
                                        </tr>
                                    )
                                    : records.map((r) => (
                                        <tr
                                            key={r.id}
                                            onClick={() => setSelected(selected?.id === r.id ? null : r)}
                                            className={`cursor-pointer transition-colors ${selected?.id === r.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
                                        >
                                            <td className="p-4 font-mono text-xs">{fmtDate(r.paymentDate)}</td>
                                            <td className="p-4 text-xs font-medium">{memberName(r.member)}</td>
                                            <td className="p-4 font-mono text-xs">{fmtMoney(r.amount)}</td>
                                            <td className="p-4 text-xs text-[#8A817C]">{r.bankName ?? "—"}</td>
                                            <td className="p-4"><SourceBadge source={r.source} /></td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                    <PaginationBar pagination={pagination} onPage={goToPage} />
                </div>

                {selected && (
                    <div className="lg:col-span-5 bg-white border border-[#121212]/10 rounded-xl p-6 relative space-y-5">
                        <button type="button" onClick={() => setSelected(null)} className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 rounded-md">
                            <X className="w-4 h-4" />
                        </button>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">Record Detail</p>
                        <div className="space-y-3 text-xs">
                            <div>
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Member</span>
                                <span className="text-[#121212] font-medium">{memberName(selected.member)}</span>
                                <div className="text-[10px] text-[#8A817C]">{selected.member?.email}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Amount</span>
                                    <span className="font-mono text-[#121212]">{fmtMoney(selected.amount)}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Date</span>
                                    <span className="font-mono text-[#121212]">{fmtDate(selected.paymentDate)}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Bank</span>
                                    <span className="text-[#121212]">{selected.bankName ?? "—"}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Source</span>
                                    <SourceBadge source={selected.source} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Reference</span>
                                    <span className="font-mono text-[#121212] break-all">{selected.reference ?? "—"}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Batch</span>
                                    <span className="font-mono text-[10px] text-[#8A817C]">{selected.batch?.id ? selected.batch.id.slice(0, 8) : "—"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function UploadTab() {
    const { batches, pagination, isLoading, isSubmitting, error, statusFilter, applyStatusFilter, goToPage, uploadBatch, requeueBatch } = useTitheBatches();
    const { accounts } = useTitheAccounts();
    const [titheAccountId, setTitheAccountId] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [uploadResult, setUploadResult] = useState<{ batchId: string; totalRows: number; message: string } | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [selectedBatch, setSelectedBatch] = useState<TitheUploadBatch | null>(null);
    const [templateLoading, setTemplateLoading] = useState(false);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setUploadResult(null);
        if (!file || !titheAccountId) { setFormError("Select an account and a file."); return; }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("titheAccountId", titheAccountId);
        try {
            const result = await uploadBatch(fd);
            setUploadResult(result);
            setFile(null);
        } catch (err: unknown) {
            const e = err as ApiError;
            setFormError(e?.message ?? "Upload failed.");
        }
    };

    const handleTemplate = async () => {
        setTemplateLoading(true);
        try { await downloadTitheTemplate(); } catch { /* silent */ } finally { setTemplateLoading(false); }
    };

    const handleRequeue = async (id: string) => {
        try { await requeueBatch(id); } catch { /* silent */ }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 space-y-4">
                <div className="bg-white border border-[#121212]/10 rounded-xl p-6 space-y-4">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Template</p>
                    <p className="text-xs text-[#121212] font-light">Download the xlsx template, fill in member data, then upload below.</p>
                    <button
                        type="button"
                        onClick={handleTemplate}
                        disabled={templateLoading}
                        className="w-full h-12 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 disabled:opacity-40 transition-colors rounded-xl flex items-center justify-center space-x-2"
                    >
                        <Download className="w-4 h-4" />
                        <span>{templateLoading ? "Downloading…" : "Download Template"}</span>
                    </button>
                </div>

                <div className="bg-white border border-[#121212]/10 rounded-xl p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-4">Upload Batch</p>
                    <form onSubmit={handleUpload} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Tithe Account *</label>
                            <select
                                required
                                value={titheAccountId}
                                onChange={(e) => setTitheAccountId(e.target.value)}
                                className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                            >
                                <option value="">Select account…</option>
                                {accounts.filter((a) => a.isActive).map((a) => (
                                    <option key={a.id} value={a.id}>{a.accountName} ({a.currency})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">File (.xlsx) *</label>
                            <input
                                type="file"
                                accept=".xlsx"
                                required
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                className="w-full text-xs text-[#121212] file:mr-3 file:py-1.5 file:px-3 file:border file:border-[#121212]/10 file:rounded-lg file:text-[10px] file:font-semibold file:uppercase file:tracking-wider file:bg-[#F4F1EA]/40 file:text-[#8A817C] hover:file:bg-[#F4F1EA]"
                            />
                        </div>
                        {formError && (
                            <div className="flex items-center space-x-2 text-red-600 text-xs">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" /><span>{formError}</span>
                            </div>
                        )}
                                                    <DismissibleError message={error} />
                        {uploadResult && (
                            <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-xs text-green-700 space-y-1">
                                <div className="flex items-center space-x-2 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /><span>Upload queued</span></div>
                                <div>Batch ID: <span className="font-mono">{uploadResult.batchId.slice(0, 8)}</span></div>
                                <div>Rows: {uploadResult.totalRows}</div>
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 disabled:opacity-40 transition-colors rounded-xl flex items-center justify-center space-x-2"
                        >
                            <Upload className="w-4 h-4" />
                            <span>{isSubmitting ? "Uploading…" : "Upload Batch"}</span>
                        </button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-8 space-y-4">
                <div className="bg-white border border-[#121212]/10 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-[#121212]/5 flex flex-wrap items-center gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] shrink-0">Upload Batches</p>
                        <div className="flex flex-wrap gap-1.5">
                            {(["", "PENDING", "PROCESSING", "COMPLETED", "FAILED"] as const).map((s) => (
                                <button key={s} type="button" onClick={() => { applyStatusFilter(s); setSelectedBatch(null); }}
                                    className={`h-7 px-3 text-[9px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${statusFilter === s ? "bg-[#121212] text-white" : "bg-[#F4F1EA] text-[#8A817C] hover:text-[#121212]"}`}>
                                    {s === "" ? "All" : s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["File", "Account", "Status", "Rows", "Matched", "Unmatched", "Disputed"].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                {isLoading
                                    ? [0, 1, 2, 3].map((k) => <SkeletonRow key={k} cols={7} />)
                                    : batches.length === 0
                                    ? (
                                        <tr>
                                            <td colSpan={7} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                                {statusFilter ? "No batches match the selected filter." : "No batches yet."}
                                            </td>
                                        </tr>
                                    )
                                    : batches.map((b) => (
                                        <tr
                                            key={b.id}
                                            onClick={() => setSelectedBatch(selectedBatch?.id === b.id ? null : b)}
                                            className={`cursor-pointer transition-colors ${selectedBatch?.id === b.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
                                        >
                                            <td className="p-4 text-xs font-medium max-w-[140px] truncate">{b.fileName}</td>
                                            <td className="p-4 text-xs text-[#8A817C]">{b.titheAccount?.accountName ?? "—"}</td>
                                            <td className="p-4"><BatchStatusBadge status={b.status} /></td>
                                            <td className="p-4 font-mono text-xs text-center">{b.totalRows}</td>
                                            <td className="p-4 font-mono text-xs text-center text-green-700">{b.matchedRows}</td>
                                            <td className="p-4 font-mono text-xs text-center text-yellow-700">{b.unmatchedRows}</td>
                                            <td className="p-4 font-mono text-xs text-center text-red-600">{b.disputedRows}</td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                    <PaginationBar pagination={pagination} onPage={goToPage} />
                </div>

                {selectedBatch && (
                    <div className="bg-white border border-[#121212]/10 rounded-xl p-6 relative space-y-5">
                        <button type="button" onClick={() => setSelectedBatch(null)} className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 rounded-md">
                            <X className="w-4 h-4" />
                        </button>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">Batch Detail</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">File</span>
                                <span className="text-[#121212] break-all">{selectedBatch.fileName}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Status</span>
                                <BatchStatusBadge status={selectedBatch.status} />
                            </div>
                            <div>
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Uploaded</span>
                                <span className="font-mono text-[#121212]">{fmtDate(selectedBatch.createdAt)}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Processed</span>
                                <span className="font-mono text-[#121212]">{selectedBatch.processedAt ? fmtDate(selectedBatch.processedAt) : "—"}</span>
                            </div>
                        </div>
                        {selectedBatch.errorMessage && (
                            <div className="flex items-start space-x-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-xl p-3">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span>{selectedBatch.errorMessage}</span>
                            </div>
                        )}
                        {selectedBatch.status === "FAILED" && (
                            <button
                                type="button"
                                onClick={() => handleRequeue(selectedBatch.id)}
                                disabled={isSubmitting}
                                className="flex items-center space-x-2 h-10 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 disabled:opacity-40 transition-colors rounded-xl"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>{isSubmitting ? "Requeueing…" : "Requeue Batch"}</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function UnmatchedTab() {
    const { records, pagination, statusFilter, search, isLoading, isSubmitting, error, applyStatusFilter, applySearch, goToPage, matchUnmatched, dismissUnmatched } = useTitheUnmatched();
    const [selected, setSelected] = useState<TitheUnmatchedRecord | null>(null);
    const [selectedMemberId, setSelectedMemberId] = useState("");
    const [actionError, setActionError] = useState<string | null>(null);
    const [confirmDismiss, setConfirmDismiss] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const STATUS_PILLS: { label: string; value: TitheUnmatchedStatus | "" }[] = [
        { label: "All", value: "" },
        { label: "Pending", value: "PENDING" },
        { label: "Matched", value: "MATCHED" },
        { label: "Dismissed", value: "DISMISSED" },
    ];

    const handleMatch = async () => {
        if (!selected || !selectedMemberId) return;
        setActionError(null);
        try {
            await matchUnmatched(selected.id, selectedMemberId);
            setSelected(null);
        } catch (err: unknown) { const e = err as ApiError;
 setActionError(e?.message ?? "Match failed."); }
    };

    const handleDismiss = async () => {
        if (!selected) return;
        setActionError(null);
        try {
            await dismissUnmatched(selected.id);
            setSelected(null);
            setConfirmDismiss(false);
        } catch (err: unknown) { const e = err as ApiError;
 setActionError(e?.message ?? "Dismiss failed."); }
    };

    const tableColSpan = selected ? "lg:col-span-7" : "lg:col-span-12";

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => {
                        const val = e.target.value;
                        setSearchInput(val);
                        setSelected(null);
                        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                        searchDebounceRef.current = setTimeout(() => applySearch(val), 400);
                    }}
                    placeholder="Search email or reference…"
                    className="h-8 px-3 bg-white border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-lg min-w-[200px]"
                />
                <div className="flex items-center gap-1.5">
                    {STATUS_PILLS.map((p) => (
                        <button
                            key={p.value}
                            type="button"
                            onClick={() => { applyStatusFilter(p.value); setSelected(null); }}
                            className={`h-8 px-4 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${statusFilter === p.value ? "bg-[#121212] text-white" : "bg-[#F4F1EA] text-[#8A817C] hover:text-[#121212]"}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className={`${tableColSpan} bg-white border border-[#121212]/10 rounded-xl overflow-hidden`}>
                                            <DismissibleError message={error} />
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["Email", "Amount", "Date", "Bank", "Status"].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                {isLoading
                                    ? [0, 1, 2, 3, 4].map((k) => <SkeletonRow key={k} cols={5} />)
                                    : records.length === 0
                                    ? (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                                {search ? "No records match your search." : "No unmatched records found."}
                                            </td>
                                        </tr>
                                    )
                                    : records.map((r) => (
                                        <tr
                                            key={r.id}
                                            onClick={() => { setSelected(selected?.id === r.id ? null : r); setActionError(null); setConfirmDismiss(false); }}
                                            className={`cursor-pointer transition-colors ${selected?.id === r.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
                                        >
                                            <td className="p-4 text-xs">{r.rawEmail}</td>
                                            <td className="p-4 font-mono text-xs">{fmtMoney(r.amount)}</td>
                                            <td className="p-4 font-mono text-xs">{fmtDate(r.paymentDate)}</td>
                                            <td className="p-4 text-xs text-[#8A817C]">{r.bankName ?? "—"}</td>
                                            <td className="p-4"><UnmatchedStatusBadge status={r.status} /></td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                    <PaginationBar pagination={pagination} onPage={goToPage} />
                </div>

                {selected && (
                    <div className="lg:col-span-5 bg-white border border-[#121212]/10 rounded-xl p-6 relative space-y-5">
                        <button type="button" onClick={() => setSelected(null)} className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 rounded-md">
                            <X className="w-4 h-4" />
                        </button>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">Unmatched Detail</p>
                        <div className="space-y-2 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Raw Email</span>
                                    <span className="text-[#121212] break-all">{selected.rawEmail}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Amount</span>
                                    <span className="font-mono text-[#121212]">{fmtMoney(selected.amount)}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Date</span>
                                    <span className="font-mono text-[#121212]">{fmtDate(selected.paymentDate)}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Bank</span>
                                    <span className="text-[#121212]">{selected.bankName ?? "—"}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Reference</span>
                                    <span className="font-mono text-[10px] text-[#8A817C] break-all">{selected.reference ?? "—"}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Status</span>
                                    <UnmatchedStatusBadge status={selected.status} />
                                </div>
                            </div>
                        </div>

                        {selected.status === "PENDING" && (
                            <div className="space-y-3 pt-3 border-t border-[#121212]/5">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">Match to Member</p>
                                <MemberSearchInput onSelect={(m) => setSelectedMemberId(m.id)} />
                                                                    <DismissibleError message={actionError} />
                                <div className="flex space-x-2">
                                    <button
                                        type="button"
                                        onClick={handleMatch}
                                        disabled={isSubmitting || !selectedMemberId}
                                        className="flex-1 h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 disabled:opacity-40 transition-colors rounded-xl"
                                    >
                                        {isSubmitting ? "Matching…" : "Match"}
                                    </button>
                                    {!confirmDismiss ? (
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDismiss(true)}
                                            className="flex-1 h-10 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-widest hover:text-red-600 hover:border-red-200 transition-colors rounded-xl"
                                        >
                                            Dismiss
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleDismiss}
                                            disabled={isSubmitting}
                                            className="flex-1 h-10 bg-red-600 text-white text-xs font-semibold uppercase tracking-widest hover:bg-red-700 disabled:opacity-40 transition-colors rounded-xl"
                                        >
                                            {isSubmitting ? "Dismissing…" : "Confirm Dismiss"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {selected.status === "MATCHED" && selected.matchedMember && (
                            <div className="pt-3 border-t border-[#121212]/5 space-y-1">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">Matched To</p>
                                <p className="text-xs font-medium text-[#121212]">{memberName(selected.matchedMember)}</p>
                                <p className="text-[10px] text-[#8A817C]">{selected.matchedMember.email}</p>
                                {selected.resolvedAt && (
                                    <p className="text-[10px] text-[#8A817C]">Resolved: {fmtDate(selected.resolvedAt)}</p>
                                )}
                            </div>
                        )}

                        {selected.status === "DISMISSED" && (
                            <div className="pt-3 border-t border-[#121212]/5 space-y-1">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">Dismissed</p>
                                {selected.resolvedAt && (
                                    <p className="text-[10px] text-[#8A817C]">{fmtDate(selected.resolvedAt)}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function DisputesTab() {
    const { disputes, pagination, statusFilter, search, isLoading, isSubmitting, error, applyStatusFilter, applySearch, goToPage, approveDispute, rejectDispute } = useTitheDisputes();
    const [selected, setSelected] = useState<TitheDisputeRecord | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const STATUS_PILLS: { label: string; value: TitheDisputeStatus | "" }[] = [
        { label: "All", value: "" },
        { label: "Pending", value: "PENDING" },
        { label: "Confirmed", value: "CONFIRMED_VALID" },
        { label: "Rejected", value: "REJECTED" },
    ];

    const handleApprove = async () => {
        if (!selected) return;
        setActionError(null);
        try {
            await approveDispute(selected.id);
            setSelected(null);
        } catch (err: unknown) { const e = err as ApiError;
 setActionError(e?.message ?? "Approve failed."); }
    };

    const handleReject = async () => {
        if (!selected) return;
        setActionError(null);
        try {
            await rejectDispute(selected.id);
            setSelected(null);
        } catch (err: unknown) { const e = err as ApiError;
 setActionError(e?.message ?? "Reject failed."); }
    };

    const tableColSpan = selected ? "lg:col-span-7" : "lg:col-span-12";

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => {
                        const val = e.target.value;
                        setSearchInput(val);
                        setSelected(null);
                        setActionError(null);
                        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                        searchDebounceRef.current = setTimeout(() => applySearch(val), 400);
                    }}
                    placeholder="Search member or reference…"
                    className="h-8 px-3 bg-white border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-lg min-w-[200px]"
                />
                <div className="flex items-center gap-1.5">
                    {STATUS_PILLS.map((p) => (
                        <button
                            key={p.value}
                            type="button"
                            onClick={() => { applyStatusFilter(p.value); setSelected(null); setActionError(null); }}
                            className={`h-8 px-4 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${statusFilter === p.value ? "bg-[#121212] text-white" : "bg-[#F4F1EA] text-[#8A817C] hover:text-[#121212]"}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className={`${tableColSpan} bg-white border border-[#121212]/10 rounded-xl overflow-hidden`}>
                                            <DismissibleError message={error} />
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["Member", "Amount", "Date", "Bank", "Status"].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                {isLoading
                                    ? [0, 1, 2, 3, 4].map((k) => <SkeletonRow key={k} cols={5} />)
                                    : disputes.length === 0
                                    ? (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                                {search ? "No disputes match your search." : "No disputes found."}
                                            </td>
                                        </tr>
                                    )
                                    : disputes.map((d) => (
                                        <tr
                                            key={d.id}
                                            onClick={() => { setSelected(selected?.id === d.id ? null : d); setActionError(null); }}
                                            className={`cursor-pointer transition-colors ${selected?.id === d.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
                                        >
                                            <td className="p-4 text-xs font-medium">{memberName(d.member)}</td>
                                            <td className="p-4 font-mono text-xs">{fmtMoney(d.amount)}</td>
                                            <td className="p-4 font-mono text-xs">{fmtDate(d.paymentDate)}</td>
                                            <td className="p-4 text-xs text-[#8A817C]">{d.bankName ?? "—"}</td>
                                            <td className="p-4"><DisputeStatusBadge status={d.status} /></td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                    <PaginationBar pagination={pagination} onPage={goToPage} />
                </div>

                {selected && (
                    <div className="lg:col-span-5 bg-white border border-[#121212]/10 rounded-xl p-6 relative space-y-5">
                        <button type="button" onClick={() => setSelected(null)} className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 rounded-md">
                            <X className="w-4 h-4" />
                        </button>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">Dispute Detail</p>
                        <div className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Member</span>
                                    <span className="text-[#121212] font-medium">{memberName(selected.member)}</span>
                                    <div className="text-[10px] text-[#8A817C]">{selected.member?.email}</div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Status</span>
                                    <DisputeStatusBadge status={selected.status} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Amount</span>
                                    <span className="font-mono text-[#121212]">{fmtMoney(selected.amount)}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Payment Date</span>
                                    <span className="font-mono text-[#121212]">{fmtDate(selected.paymentDate)}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Bank</span>
                                    <span className="text-[#121212]">{selected.bankName ?? "—"}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Reference</span>
                                    <span className="font-mono text-[10px] text-[#8A817C] break-all">{selected.reference ?? "—"}</span>
                                </div>
                                {selected.reviewedAt && (
                                    <div>
                                        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Reviewed</span>
                                        <span className="font-mono text-[#121212]">{fmtDate(selected.reviewedAt)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selected.status === "PENDING" && (
                            <div className="pt-3 border-t border-[#121212]/5 space-y-3">
                                                                    <DismissibleError message={actionError} />
                                <div className="flex space-x-2">
                                    <button
                                        type="button"
                                        onClick={handleApprove}
                                        disabled={isSubmitting}
                                        className="flex-1 h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 disabled:opacity-40 transition-colors rounded-xl flex items-center justify-center space-x-1.5"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>{isSubmitting ? "…" : "Approve"}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleReject}
                                        disabled={isSubmitting}
                                        className="flex-1 h-10 border border-red-200 text-red-600 text-xs font-semibold uppercase tracking-widest hover:bg-red-50 disabled:opacity-40 transition-colors rounded-xl flex items-center justify-center space-x-1.5"
                                    >
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span>{isSubmitting ? "…" : "Reject"}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function ProofsTab() {
    const { proofs, pagination, statusFilter, search, isLoading, isSubmitting, error, applyStatusFilter, applySearch, goToPage, confirmProof, declineProof } = useTitheProofs();
    const [selected, setSelected] = useState<TithePaymentProof | null>(null);
    const [financeNote, setFinanceNote] = useState("");
    const [actionError, setActionError] = useState<string | null>(null);
    const [showDeclineForm, setShowDeclineForm] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const STATUS_PILLS: { label: string; value: TitheProofStatus | "" }[] = [
        { label: "All", value: "" },
        { label: "Pending", value: "PENDING" },
        { label: "Confirmed", value: "CONFIRMED" },
        { label: "Declined", value: "DECLINED" },
    ];

    const handleConfirm = async () => {
        if (!selected) return;
        setActionError(null);
        try {
            await confirmProof(selected.id);
            setSelected(null);
        } catch (err: unknown) { const e = err as ApiError;
 setActionError(e?.message ?? "Confirm failed."); }
    };

    const handleDecline = async () => {
        if (!selected || !financeNote.trim()) return;
        setActionError(null);
        try {
            await declineProof(selected.id, financeNote);
            setSelected(null);
            setFinanceNote("");
            setShowDeclineForm(false);
        } catch (err: unknown) { const e = err as ApiError;
 setActionError(e?.message ?? "Decline failed."); }
    };

    const tableColSpan = selected ? "lg:col-span-7" : "lg:col-span-12";

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => {
                        const val = e.target.value;
                        setSearchInput(val);
                        setSelected(null);
                        setActionError(null);
                        setShowDeclineForm(false);
                        setFinanceNote("");
                        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                        searchDebounceRef.current = setTimeout(() => applySearch(val), 400);
                    }}
                    placeholder="Search member or account…"
                    className="h-8 px-3 bg-white border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-lg min-w-[200px]"
                />
                <div className="flex items-center gap-1.5">
                    {STATUS_PILLS.map((p) => (
                        <button
                            key={p.value}
                            type="button"
                            onClick={() => { applyStatusFilter(p.value); setSelected(null); setActionError(null); }}
                            className={`h-8 px-4 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${statusFilter === p.value ? "bg-[#121212] text-white" : "bg-[#F4F1EA] text-[#8A817C] hover:text-[#121212]"}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className={`${tableColSpan} bg-white border border-[#121212]/10 rounded-xl overflow-hidden`}>
                                            <DismissibleError message={error} />
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["Member", "Amount", "Date", "Account", "Status"].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                {isLoading
                                    ? [0, 1, 2, 3, 4].map((k) => <SkeletonRow key={k} cols={5} />)
                                    : proofs.length === 0
                                    ? (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                                {search ? "No proofs match your search." : "No payment proofs found."}
                                            </td>
                                        </tr>
                                    )
                                    : proofs.map((p) => (
                                        <tr
                                            key={p.id}
                                            onClick={() => { setSelected(selected?.id === p.id ? null : p); setActionError(null); setShowDeclineForm(false); setFinanceNote(""); }}
                                            className={`cursor-pointer transition-colors ${selected?.id === p.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
                                        >
                                            <td className="p-4 text-xs font-medium">{memberName(p.member)}</td>
                                            <td className="p-4 font-mono text-xs">{fmtMoney(p.amount, p.titheAccount?.currency)}</td>
                                            <td className="p-4 font-mono text-xs">{fmtDate(p.paymentDate)}</td>
                                            <td className="p-4 text-xs text-[#8A817C]">{p.titheAccount?.accountName ?? "—"}</td>
                                            <td className="p-4"><ProofStatusBadge status={p.status} /></td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                    <PaginationBar pagination={pagination} onPage={goToPage} />
                </div>

                {selected && (
                    <div className="lg:col-span-5 bg-white border border-[#121212]/10 rounded-xl p-6 relative space-y-5">
                        <button type="button" onClick={() => setSelected(null)} className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 rounded-md">
                            <X className="w-4 h-4" />
                        </button>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">Payment Proof</p>

                        {selected.proofUrl && (
                            <div className="rounded-xl overflow-hidden border border-[#121212]/10">
                                <Image
                                    src={selected.proofUrl}
                                    alt="Payment proof"
                                    className="w-full object-contain max-h-56"
                                    width={400}
                                    height={224}
                                />
                            </div>
                        )}

                        <div className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Member</span>
                                    <span className="text-[#121212] font-medium">{memberName(selected.member)}</span>
                                    <div className="text-[10px] text-[#8A817C]">{selected.member?.email}</div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Status</span>
                                    <ProofStatusBadge status={selected.status} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Amount</span>
                                    <span className="font-mono text-[#121212]">{fmtMoney(selected.amount, selected.titheAccount?.currency)}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Date</span>
                                    <span className="font-mono text-[#121212]">{fmtDate(selected.paymentDate)}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Account</span>
                                    <span className="text-[#121212]">{selected.titheAccount?.accountName ?? "—"}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Expires</span>
                                    <span className="font-mono text-[#121212]">{fmtDate(selected.expiresAt)}</span>
                                </div>
                                {selected.reference && (
                                    <div className="col-span-2">
                                        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Reference</span>
                                        <span className="font-mono text-[10px] text-[#8A817C] break-all">{selected.reference}</span>
                                    </div>
                                )}
                                {selected.financeNote && (
                                    <div className="col-span-2">
                                        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] block mb-0.5">Finance Note</span>
                                        <p className="text-[#121212] font-light leading-relaxed bg-[#F4F1EA]/30 p-3 rounded-lg border border-[#121212]/5">{selected.financeNote}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selected.status === "PENDING" && (
                            <div className="pt-3 border-t border-[#121212]/5 space-y-3">
                                                                    <DismissibleError message={actionError} />
                                {!showDeclineForm ? (
                                    <div className="flex space-x-2">
                                        <button
                                            type="button"
                                            onClick={handleConfirm}
                                            disabled={isSubmitting}
                                            className="flex-1 h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 disabled:opacity-40 transition-colors rounded-xl flex items-center justify-center space-x-1.5"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>{isSubmitting ? "…" : "Confirm"}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowDeclineForm(true)}
                                            className="flex-1 h-10 border border-red-200 text-red-600 text-xs font-semibold uppercase tracking-widest hover:bg-red-50 transition-colors rounded-xl flex items-center justify-center space-x-1.5"
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                            <span>Decline</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">Finance Note *</label>
                                        <textarea
                                            rows={3}
                                            value={financeNote}
                                            onChange={(e) => setFinanceNote(e.target.value)}
                                            placeholder="Reason for declining this proof…"
                                            className="w-full p-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                                        />
                                        <div className="flex space-x-2">
                                            <button
                                                type="button"
                                                onClick={handleDecline}
                                                disabled={isSubmitting || !financeNote.trim()}
                                                className="flex-1 h-10 bg-red-600 text-white text-xs font-semibold uppercase tracking-widest hover:bg-red-700 disabled:opacity-40 transition-colors rounded-xl"
                                            >
                                                {isSubmitting ? "Declining…" : "Submit Decline"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setShowDeclineForm(false); setFinanceNote(""); }}
                                                className="h-10 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-widest hover:text-[#121212] transition-colors rounded-xl"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default withAuth(function TithesPage() {
    const [activeTab, setActiveTab] = useState<Tab>("accounts");

    return (
        <div className="space-y-6 font-sans">
            <div>
                <h1 className="text-2xl font-light tracking-tight text-[#121212]">Tithe &amp; Giving</h1>
                <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                    Manage tithe accounts, bulk uploads, records, and payment proofs
                </p>
            </div>

            <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl w-fit">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`h-8 px-4 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${activeTab === tab.key ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "accounts" && <AccountsTab />}
            {activeTab === "records" && <RecordsTab />}
            {activeTab === "upload" && <UploadTab />}
            {activeTab === "unmatched" && <UnmatchedTab />}
            {activeTab === "disputes" && <DisputesTab />}
            {activeTab === "proofs" && <ProofsTab />}
        </div>
    );
}, { requiredPermission: 'tithe:read' });
