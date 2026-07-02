"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    TrendingUp,
    TrendingDown,
    Activity,
    AlertCircle,
    Clock,
    RefreshCw,
    Landmark,
    PieChart,
    BarChart2,
    X,
    ChevronDown,
    Search,
} from "lucide-react";
import { useFinanceReports, ReportType } from "@/hooks/use-finance-reports";
import { useAccounts } from "@/hooks/use-accounts";
import { useAccountingPeriods } from "@/hooks/use-accounting-periods";
import { usePledges } from "@/hooks/use-pledges";
import { useBudgets } from "@/hooks/use-budgets";
import { api } from "@/utils/auth/axios-client";
import type { Member } from "@/hooks/use-member";

const fmt = (n: number | string) =>
    `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const REPORT_OPTIONS: { value: ReportType; label: string; hint: string }[] = [
    { value: "income-expense", label: "Income & Expense", hint: "Period P&L by account" },
    { value: "cash-flow", label: "Cash Flow", hint: "Movements for a specific account" },
    { value: "trial-balance", label: "Trial Balance", hint: "All account balances at a point in time" },
    { value: "account-ledger", label: "Account Ledger", hint: "Full transaction history for an account" },
    { value: "budget-actuals", label: "Budget vs Actuals", hint: "Actuals against a specific budget" },
    { value: "pledge-summary", label: "Pledge Summary", hint: "Paid / outstanding for a campaign" },
    { value: "member-giving", label: "Member Giving", hint: "Giving history for a member" },
];

const GIVING_SUBTYPES = [
    { value: "TITHE", label: "Tithe" },
    { value: "OFFERING", label: "Offering" },
    { value: "PETTY_CASH", label: "Petty Cash" },
    { value: "OTHER", label: "Other" },
] as const;

const TAB_CLASSES = {
    active: "border-b-2 border-[#121212] text-[#121212] font-semibold",
    inactive: "border-b-2 border-transparent text-[#8A817C] hover:text-[#121212] transition-colors",
};

function StatSkeleton() {
    return (
        <div className="bg-white border border-[#121212]/10 p-6 rounded-xl space-y-3">
            <div className="h-3 w-24 bg-[#F4F1EA] rounded animate-pulse" />
            <div className="h-7 w-32 bg-[#F4F1EA] rounded animate-pulse" />
        </div>
    );
}

function MemberSearchInput({
    value,
    onChange,
}: Readonly<{ value: string; onChange: (id: string, name: string) => void }>) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Member[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedName, setSelectedName] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const search = useCallback(async (term: string) => {
        if (term.trim().length < 2) { setResults([]); setIsOpen(false); return; }
        try {
            const res = await api.get(`/members?search=${encodeURIComponent(term)}&limit=10`);
            const outer = res.data?.data;
            const list: Member[] = Array.isArray(outer?.data) ? outer.data : [];
            setResults(list);
            setIsOpen(list.length > 0);
        } catch {
            setResults([]); setIsOpen(false);
        }
    }, []);

    useEffect(() => {
        if (!value) { setSelectedName(null); setQuery(""); }
    }, [value]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setSelectedName(null);
        onChange("", "");
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(e.target.value), 300);
    };

    const select = (m: Member) => {
        setSelectedName(`${m.firstname} ${m.lastname}`);
        setQuery(`${m.firstname} ${m.lastname}`);
        setIsOpen(false);
        onChange(m.id, `${m.firstname} ${m.lastname}`);
    };

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={containerRef} className="relative">
            <label htmlFor="member-search" className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                Member <span className="text-red-400">*</span>
            </label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A817C]" />
                <input
                    id="member-search"
                    type="text"
                    autoComplete="off"
                    className={`w-full pl-9 pr-4 border rounded-xl py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#121212]/20 ${selectedName ? "border-[#121212]/30 text-[#121212]" : "border-[#121212]/10 text-[#121212]"}`}
                    placeholder="Search by name…"
                    value={query}
                    onChange={handleInput}
                />
                {selectedName && (
                    <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A817C] hover:text-[#121212]"
                        onClick={() => { setQuery(""); setSelectedName(null); onChange("", ""); setResults([]); setIsOpen(false); }}
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>
            {isOpen && (
                <ul className="absolute z-20 mt-1 w-full bg-white border border-[#121212]/10 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {results.map((m) => (
                        <li key={m.id}>
                            <button
                                type="button"
                                className="w-full text-left px-4 py-2.5 text-xs hover:bg-[#F4F1EA]/60 transition-colors"
                                onClick={() => select(m)}
                            >
                                <span className="font-medium text-[#121212]">{m.firstname} {m.lastname}</span>
                                <span className="ml-2 text-[#8A817C]">{m.email}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function ReportParamForm({
    type,
    accounts,
    periods,
    campaigns,
    budgets,
    onRun,
    isLoading,
}: Readonly<{
    type: ReportType;
    accounts: { id: string; name: string; code: string }[];
    periods: { id: string; year: number; month: number }[];
    campaigns: { id: string; name: string }[];
    budgets: { id: string; name: string }[];
    onRun: (params: Record<string, string>) => void;
    isLoading: boolean;
}>) {
    const [params, setParams] = useState<Record<string, string>>({});
    const set = (k: string, v: string) => setParams((p) => ({ ...p, [k]: v }));

    const accountSelect = (key: string, label: string, required?: boolean) => (
        <div>
            <label htmlFor={`param-${key}`} className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                {label}{!required && " (optional)"}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <select
                id={`param-${key}`}
                className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] bg-white focus:outline-none focus:ring-1 focus:ring-[#121212]/20"
                value={params[key] ?? ""}
                onChange={(e) => set(key, e.target.value)}
            >
                <option value="">Select account…</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
            </select>
        </div>
    );

    const periodSelect = (key: string, label: string, required?: boolean) => (
        <div>
            <label htmlFor={`param-${key}`} className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                {label}{!required && " (optional)"}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <select
                id={`param-${key}`}
                className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] bg-white focus:outline-none focus:ring-1 focus:ring-[#121212]/20"
                value={params[key] ?? ""}
                onChange={(e) => set(key, e.target.value)}
            >
                <option value="">All periods</option>
                {periods.map((p) => <option key={p.id} value={p.id}>{p.year} – {String(p.month).padStart(2, "0")}</option>)}
            </select>
        </div>
    );

    const dateInput = (key: string, label: string) => (
        <div>
            <label htmlFor={`param-${key}`} className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">{label} (optional)</label>
            <input
                id={`param-${key}`}
                type="date"
                className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20"
                value={params[key] ?? ""}
                onChange={(e) => set(key, e.target.value)}
            />
        </div>
    );

    const memberGivingFields = (
        <div className="space-y-4">
            <MemberSearchInput
                value={params.memberId ?? ""}
                onChange={(id) => set("memberId", id)}
            />
            <div className="grid grid-cols-2 gap-3">
                {dateInput("fromDate", "From Date")}
                {dateInput("toDate", "To Date")}
            </div>
            <div>
                <label htmlFor="param-accountSubtype" className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                    Giving Category (optional)
                </label>
                <div className="relative">
                    <select
                        id="param-accountSubtype"
                        className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] bg-white appearance-none focus:outline-none focus:ring-1 focus:ring-[#121212]/20"
                        value={params.accountSubtype ?? ""}
                        onChange={(e) => set("accountSubtype", e.target.value)}
                    >
                        <option value="">All categories</option>
                        {GIVING_SUBTYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A817C] pointer-events-none" />
                </div>
            </div>
            {periodSelect("periodId", "Accounting Period")}
        </div>
    );

    const fields: Record<ReportType, React.ReactNode> = {
        "income-expense": <div className="space-y-4">{periodSelect("periodId", "Accounting Period")}{accountSelect("fundId", "Fund")}</div>,
        "cash-flow": <div className="space-y-4">{accountSelect("accountId", "Account", true)}{dateInput("fromDate", "From")}{dateInput("toDate", "To")}</div>,
        "trial-balance": <div className="space-y-4">{periodSelect("periodId", "Accounting Period")}</div>,
        "account-ledger": <div className="space-y-4">{accountSelect("accountId", "Account", true)}{dateInput("fromDate", "From")}{dateInput("toDate", "To")}</div>,
        "budget-actuals": (
            <div>
                <label htmlFor="budget-select" className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Budget <span className="text-red-400">*</span></label>
                <select id="budget-select" className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] bg-white focus:outline-none focus:ring-1 focus:ring-[#121212]/20" value={params.budgetId ?? ""} onChange={(e) => set("budgetId", e.target.value)}>
                    <option value="">Select budget…</option>
                    {budgets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
            </div>
        ),
        "pledge-summary": (
            <div>
                <label htmlFor="campaign-select" className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Campaign <span className="text-red-400">*</span></label>
                <select id="campaign-select" className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] bg-white focus:outline-none focus:ring-1 focus:ring-[#121212]/20" value={params.campaignId ?? ""} onChange={(e) => set("campaignId", e.target.value)}>
                    <option value="">Select campaign…</option>
                    {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
        ),
        "member-giving": memberGivingFields,
    };

    return (
        <div className="space-y-4">
            {fields[type]}
            <button
                type="button"
                onClick={() => {
                    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ""));
                    onRun(clean);
                }}
                disabled={isLoading}
                className="h-9 px-5 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-xl hover:bg-[#121212]/80 disabled:opacity-40 transition-colors"
            >
                {isLoading ? "Running…" : "Run Report"}
            </button>
        </div>
    );
}

function ReportResultTable({ data }: Readonly<{ data: unknown }>) {
    if (!data || typeof data !== "object") return null;

    if (Array.isArray(data)) {
        if (data.length === 0) return <p className="text-xs text-[#8A817C] py-4">No data for the selected parameters.</p>;
        const keys = Object.keys(data[0] as object);
        return (
            <div className="overflow-x-auto mt-4">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                            {keys.map((k) => <th key={k} className="p-3 font-semibold uppercase tracking-wider text-[11px] text-[#8A817C]">{k.replace(/([A-Z])/g, " $1").trim()}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#121212]/5">
                        {(data as Record<string, unknown>[]).map((row, i) => (
                            <tr key={(row.id as string) ?? (row.key as string) ?? i} className="hover:bg-[#F4F1EA]/20">
                                {keys.map((k) => {
                                    const val = row[k];
                                    let display: string;
                                    if (typeof val === "number") display = fmt(val);
                                    else if (val == null) display = "—";
                                    else display = String(val);
                                    return <td key={k} className="p-3 text-[#121212] font-mono">{display}</td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    const obj = data as Record<string, unknown>;
    const entries = Object.entries(obj).filter(([, v]) => typeof v !== "object" || v === null);
    const nested = Object.entries(obj).filter(([, v]) => typeof v === "object" && v !== null && !Array.isArray(v));
    const arrays = Object.entries(obj).filter(([, v]) => Array.isArray(v));

    return (
        <div className="mt-4 space-y-4">
            {entries.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {entries.map(([k, v]) => (
                        <div key={k} className="bg-[#F4F1EA]/40 rounded-xl p-4">
                            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">{k.replace(/([A-Z])/g, " $1").trim()}</div>
                            <div className="font-mono text-sm text-[#121212]">{typeof v === "number" ? fmt(v) : String(v ?? "—")}</div>
                        </div>
                    ))}
                </div>
            )}
            {nested.map(([k, v]) => (
                <div key={k}>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">{k.replace(/([A-Z])/g, " $1").trim()}</p>
                    <ReportResultTable data={v} />
                </div>
            ))}
            {arrays.map(([k, v]) => (
                <div key={k}>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">{k.replace(/([A-Z])/g, " $1").trim()}</p>
                    <ReportResultTable data={v} />
                </div>
            ))}
        </div>
    );
}

export default withAuth(function ReportsPage() {
    const { dashboard, fundBalance, isLoading, error, refetch, activeReport, reportResult, isReportLoading, reportError, runReport, clearReport } =
        useFinanceReports();
    const { accounts } = useAccounts();
    const { periods } = useAccountingPeriods();
    const { campaigns } = usePledges();
    const { budgets } = useBudgets();

    const [tab, setTab] = useState<"overview" | "reports">("overview");
    const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);

    const now = new Date();
    const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Financial Reports</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Month-to-date overview &bull; {monthLabel}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={refetch}
                    disabled={isLoading}
                    className="flex items-center space-x-2 h-10 px-4 border border-[#121212]/10 text-[#121212] text-xs font-semibold uppercase tracking-widest hover:bg-[#F4F1EA]/40 disabled:opacity-40 transition-colors rounded-xl"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                </button>
            </div>

            {error && (
                <div className="flex items-center space-x-2 text-red-600 text-xs bg-red-50 border border-red-200 p-4 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-[#121212]/10">
                <nav className="flex space-x-8 -mb-px">
                    <button
                        type="button"
                        onClick={() => setTab("overview")}
                        className={`pb-3 text-xs uppercase tracking-widest ${tab === "overview" ? TAB_CLASSES.active : TAB_CLASSES.inactive}`}
                    >
                        Overview
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("reports")}
                        className={`pb-3 text-xs uppercase tracking-widest ${tab === "reports" ? TAB_CLASSES.active : TAB_CLASSES.inactive}`}
                    >
                        Drill-Down Reports
                    </button>
                </nav>
            </div>

            {/* Overview tab */}
            {tab === "overview" && (
                <div className="space-y-10">
                    {/* MTD stat cards */}
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-4">Month-to-Date Summary</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {isLoading ? (
                                <><StatSkeleton /><StatSkeleton /><StatSkeleton /></>
                            ) : (
                                <>
                                    <div className="bg-white border border-[#121212]/10 p-6 rounded-xl">
                                        <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] flex items-center space-x-1.5 mb-3"><TrendingUp className="w-3.5 h-3.5" /><span>MTD Income</span></div>
                                        <div className="text-2xl font-light text-[#121212] font-mono">{fmt(dashboard?.mtdIncome ?? 0)}</div>
                                    </div>
                                    <div className="bg-white border border-[#121212]/10 p-6 rounded-xl">
                                        <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] flex items-center space-x-1.5 mb-3"><TrendingDown className="w-3.5 h-3.5" /><span>MTD Expenses</span></div>
                                        <div className="text-2xl font-light text-[#121212] font-mono">{fmt(dashboard?.mtdExpenses ?? 0)}</div>
                                    </div>
                                    <div className={`border p-6 rounded-xl ${(dashboard?.mtdNet ?? 0) >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                                        <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] flex items-center space-x-1.5 mb-3"><Activity className="w-3.5 h-3.5" /><span>MTD Net</span></div>
                                        <div className={`text-2xl font-light font-mono ${(dashboard?.mtdNet ?? 0) >= 0 ? "text-green-800" : "text-red-800"}`}>{fmt(dashboard?.mtdNet ?? 0)}</div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Pending actions */}
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-4">Pending Actions</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {isLoading ? (
                                <><StatSkeleton /><StatSkeleton /><StatSkeleton /></>
                            ) : (
                                <>
                                    <div className="bg-white border border-[#121212]/10 p-6 rounded-xl">
                                        <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] flex items-center space-x-1.5 mb-3"><Clock className="w-3.5 h-3.5" /><span>Journal Entries</span></div>
                                        <div className={`text-2xl font-light font-mono ${(dashboard?.pendingJournalEntries ?? 0) > 0 ? "text-amber-600" : "text-[#121212]"}`}>{dashboard?.pendingJournalEntries ?? 0}</div>
                                        <p className="text-[10px] text-[#8A817C] mt-1">Awaiting approval</p>
                                    </div>
                                    <div className="bg-white border border-[#121212]/10 p-6 rounded-xl">
                                        <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] flex items-center space-x-1.5 mb-3"><Clock className="w-3.5 h-3.5" /><span>Petty Cash</span></div>
                                        <div className={`text-2xl font-light font-mono ${(dashboard?.pendingPettyCash ?? 0) > 0 ? "text-amber-600" : "text-[#121212]"}`}>{dashboard?.pendingPettyCash ?? 0}</div>
                                        <p className="text-[10px] text-[#8A817C] mt-1">Pending replenishments</p>
                                    </div>
                                    <div className="bg-white border border-[#121212]/10 p-6 rounded-xl">
                                        <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] flex items-center space-x-1.5 mb-3"><PieChart className="w-3.5 h-3.5" /><span>Active Pledges</span></div>
                                        <div className="text-2xl font-light text-[#121212] font-mono">{dashboard?.activePledgeCount ?? 0}</div>
                                        <p className="text-[10px] text-[#8A817C] mt-1">Outstanding: {fmt(dashboard?.totalOutstandingPledges ?? 0)}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Fund balances */}
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-4 flex items-center space-x-2"><Landmark className="w-3.5 h-3.5" /><span>Fund Balances</span></p>
                        <div className="bg-white border border-[#121212]/10 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                            {["Fund", "Type", "Accounts", "Total Balance"].map((h) => (
                                                <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                        {isLoading ? (
                                            ["sk-0", "sk-1", "sk-2", "sk-3"].map((sk) => (
                                                <tr key={sk} className="border-b border-[#121212]/5">
                                                    {(["40px", "80px", "48px", "112px"] as const).map((w) => (
                                                        <td key={w} className="p-4"><div className="h-3 bg-[#F4F1EA] rounded animate-pulse" style={{ width: w }} /></td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : !fundBalance || fundBalance.funds.length === 0 ? (
                                            <tr><td colSpan={4} className="p-10 text-center text-xs text-[#8A817C] font-light">No funds with account balances found.</td></tr>
                                        ) : (
                                            fundBalance.funds.map((fb) => {
                                                const typeCls = fb.fund.type === "RESTRICTED" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800";
                                                return (
                                                    <tr key={fb.fund.id} className="hover:bg-[#F4F1EA]/20 transition-colors">
                                                        <td className="p-4 text-xs font-medium text-[#121212]">{fb.fund.name}</td>
                                                        <td className="p-4"><span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${typeCls}`}>{fb.fund.type}</span></td>
                                                        <td className="p-4 font-mono text-xs text-[#8A817C]">{fb.accountCount}</td>
                                                        <td className="p-4 font-mono text-xs font-medium text-[#121212]">{fmt(fb.totalBalance)}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Budgets near limit */}
                    {!isLoading && dashboard?.budgetsNearLimit && dashboard.budgetsNearLimit.length > 0 && (
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-4 flex items-center space-x-2"><AlertCircle className="w-3.5 h-3.5 text-amber-500" /><span>Budgets Near Limit (&ge;80%)</span></p>
                            <div className="bg-white border border-[#121212]/10 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                                {["Budget", "Allocated", "Spent", "Utilisation"].map((h) => <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#121212]/5">
                                            {dashboard.budgetsNearLimit.map((b) => (
                                                <tr key={b.budgetId} className="hover:bg-[#F4F1EA]/20 transition-colors">
                                                    <td className="p-4 text-xs font-medium text-[#121212]">{b.name}</td>
                                                    <td className="p-4 font-mono text-xs text-[#121212]">{fmt(b.amount)}</td>
                                                    <td className="p-4 font-mono text-xs text-[#121212]">{fmt(b.actuals)}</td>
                                                    <td className="p-4">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="flex-1 max-w-[120px] h-2 bg-[#F4F1EA] rounded-full overflow-hidden">
                                                                <div className={`h-full rounded-full ${b.utilizationPct >= 100 ? "bg-red-500" : "bg-amber-500"}`} style={{ width: `${Math.min(b.utilizationPct, 100)}%` }} />
                                                            </div>
                                                            <span className={`font-mono text-xs font-semibold ${b.utilizationPct >= 100 ? "text-red-600" : "text-amber-600"}`}>{b.utilizationPct.toFixed(1)}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {dashboard?.generatedAt && (
                        <p className="text-[10px] text-[#8A817C]/60 font-mono text-right">Generated {fmtDate(dashboard.generatedAt)}</p>
                    )}
                </div>
            )}

            {/* Reports tab */}
            {tab === "reports" && (
                <div className="space-y-6">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] flex items-center space-x-2">
                        <BarChart2 className="w-3.5 h-3.5" /><span>Select a report type</span>
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {REPORT_OPTIONS.map((r) => (
                            <button
                                key={r.value}
                                type="button"
                                onClick={() => { setSelectedReportType(r.value); clearReport(); }}
                                className={`text-left p-4 border rounded-xl transition-colors ${
                                    selectedReportType === r.value
                                        ? "border-[#121212] bg-[#121212] text-white"
                                        : "border-[#121212]/10 bg-white hover:bg-[#F4F1EA]/40 text-[#121212]"
                                }`}
                            >
                                <div className="text-xs font-semibold">{r.label}</div>
                                <div className={`text-[10px] mt-0.5 ${selectedReportType === r.value ? "text-white/60" : "text-[#8A817C]"}`}>{r.hint}</div>
                            </button>
                        ))}
                    </div>
                    {selectedReportType && (
                        <div className="bg-white border border-[#121212]/10 rounded-xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-[#121212]">
                                    {REPORT_OPTIONS.find((r) => r.value === selectedReportType)?.label}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => { setSelectedReportType(null); clearReport(); }}
                                    className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <ReportParamForm
                                type={selectedReportType}
                                accounts={accounts}
                                periods={periods}
                                campaigns={campaigns}
                                budgets={budgets}
                                onRun={(params) => runReport(selectedReportType, params)}
                                isLoading={isReportLoading}
                            />
                            {reportError && (
                                <div className="flex items-center space-x-2 text-red-600 text-xs bg-red-50 border border-red-200 p-3 rounded-lg">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{reportError}</span>
                                </div>
                            )}
                            {activeReport === selectedReportType && reportResult && (
                                <ReportResultTable data={reportResult} />
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}, { requiredPermission: 'finance:report' });
