"use client";

import { DismissibleError } from "@/components/ui/dismissible-error";

import React, { useState, useMemo } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    Layers,
    Plus,
    SlidersHorizontal,
    X,
    CheckCircle2,
    Clock,
    RefreshCw,
    AlertCircle,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
    useOfferings,
    Offering,
    OfferingType,
    OfferingAdmin,
    CreateOfferingPayload,
    OfferingFilters,
} from "@/hooks/use-offerings";
import { useFunds } from "@/hooks/use-funds";
import { currencySymbol, formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/utils/currency";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

const OFFERING_TYPE_LABELS: Record<OfferingType, string> = {
    GENERAL: "General",
    TITHE_SUNDAY: "Tithe",
    PLEDGE: "Pledge",
    SEED: "Seed",
};

const SKELETON_WIDTHS = ["128px", "80px", "160px", "96px", "96px", "64px"];
const SKELETON_KEYS = ["sk-date", "sk-type", "sk-fund", "sk-cash", "sk-transfer", "sk-status"];


const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const adminName = (admin: OfferingAdmin | null | undefined): string =>
    admin?.member ? `${admin.member.firstname} ${admin.member.lastname}` : "—";

function SkeletonRow() {
    return (
        <tr className="border-b border-[#121212]/5">
            {SKELETON_KEYS.map((key, i) => (
                <td key={key} className="p-4">
                    <div className="h-3 bg-[#F4F1EA] rounded animate-pulse" style={{ width: SKELETON_WIDTHS[i] }} />
                </td>
            ))}
        </tr>
    );
}

function CreateForm({
    funds,
    isSubmitting,
    onClose,
    onSubmit,
}: Readonly<{
    funds: { id: string; name: string; isActive: boolean }[];
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateOfferingPayload) => Promise<void>;
}>) {
    const [createType, setCreateType] = useState<OfferingType>("GENERAL");
    const [createFundId, setCreateFundId] = useState("");
    const [createCash, setCreateCash] = useState(0);
    const [createTransfer, setCreateTransfer] = useState(0);
    const [createNotes, setCreateNotes] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        if (!createFundId) { setError("Please select a fund."); return; }
        const payload: CreateOfferingPayload = { fundId: createFundId, type: createType };
        if (createCash) payload.cashAmount = createCash;
        if (createTransfer) payload.expectedTransferAmount = createTransfer;
        if (createNotes) payload.notes = createNotes;
        try {
            await onSubmit(payload);
            setCreateFundId(""); setCreateCash(0); setCreateTransfer(0); setCreateNotes("");
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.message ?? "Failed to record giving.");
        }
    };

    return (
        <div className="bg-white border border-[#121212]/10 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] flex items-center space-x-2">
                    <Plus className="w-4 h-4 text-[#8A817C]" />
                    <span>Record Giving</span>
                </h2>
                <button type="button" onClick={onClose} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md">
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Type</p>
                    <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(OFFERING_TYPE_LABELS) as OfferingType[]).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setCreateType(t)}
                                className={`h-8 text-[10px] font-semibold uppercase tracking-wider border rounded-md transition-colors ${createType === t ? "bg-[#121212] text-white border-[#121212]" : "bg-white text-[#8A817C] border-[#121212]/10 hover:text-[#121212]"}`}
                            >
                                {OFFERING_TYPE_LABELS[t]}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="create-fund" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">
                        Fund <span className="text-red-500">*</span>
                    </label>
                    <select
                        id="create-fund"
                        required
                        value={createFundId}
                        onChange={(e) => setCreateFundId(e.target.value)}
                        className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-lg appearance-none"
                    >
                        <option value="">Select fund…</option>
                        {funds.filter((f) => f.isActive).map((f) => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="create-cash" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Cash</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#8A817C] select-none pointer-events-none">{currencySymbol}</span>
                            <input
                                id="create-cash"
                                type="text"
                                inputMode="decimal"
                                value={formatCurrencyInput(createCash)}
                                onChange={(e) => setCreateCash(parseCurrencyInput(e.target.value))}
                                placeholder="0"
                                className="w-full h-10 pl-7 pr-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-lg font-mono"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="create-transfer" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Transfer</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#8A817C] select-none pointer-events-none">{currencySymbol}</span>
                            <input
                                id="create-transfer"
                                type="text"
                                inputMode="decimal"
                                value={formatCurrencyInput(createTransfer)}
                                onChange={(e) => setCreateTransfer(parseCurrencyInput(e.target.value))}
                                placeholder="0"
                                className="w-full h-10 pl-7 pr-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-lg font-mono"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label htmlFor="create-notes" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Notes</label>
                    <textarea
                        id="create-notes"
                        rows={2}
                        value={createNotes}
                        onChange={(e) => setCreateNotes(e.target.value)}
                        placeholder="Optional notes..."
                        className="w-full p-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-lg resize-none"
                    />
                </div>

                                    <DismissibleError message={error} />

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 disabled:opacity-40 transition-colors rounded-xl"
                >
                    {isSubmitting ? "Saving…" : "Commit Entry"}
                </button>
            </form>
        </div>
    );
}

function DetailPanel({
    offering,
    isSubmitting,
    onClose,
    onReconcile,
}: Readonly<{
    offering: Offering;
    isSubmitting: boolean;
    onClose: () => void;
    onReconcile: (notes: string) => Promise<void>;
}>) {
    const [reconcileNotes, setReconcileNotes] = useState("");
    const [reconcileError, setReconcileError] = useState<string | null>(null);

    const handleReconcile = async () => {
        if (!reconcileNotes.trim()) return;
        setReconcileError(null);
        try {
            await onReconcile(reconcileNotes);
            setReconcileNotes("");
        } catch (err: unknown) {
            const e = err as ApiError;
            setReconcileError(e?.message ?? "Reconciliation failed.");
        }
    };

    return (
        <div className="bg-white border border-[#121212]/10 p-8 rounded-xl relative space-y-6">
            <button
                type="button"
                onClick={onClose}
                className="absolute top-6 right-6 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md"
            >
                <X className="w-4 h-4" />
            </button>

            <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">
                    Giving Record — {offering.id.slice(0, 8).toUpperCase()}
                </div>
                <h2 className="text-xl font-light tracking-tight text-[#121212]">
                    {OFFERING_TYPE_LABELS[offering.type]} &mdash; {offering.fund.name}
                </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 border-y border-[#121212]/5 py-6 font-mono text-xs">
                <div>
                    <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Cash Amount</span>
                    <span className="text-[#121212] font-medium">{formatCurrency(offering.cashAmount)}</span>
                </div>
                <div>
                    <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Transfer Expected</span>
                    <span className="text-[#121212]">{formatCurrency(offering.expectedTransferAmount)}</span>
                </div>
                <div>
                    <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Recorded</span>
                    <span className="text-[#121212] font-sans">{fmtDate(offering.createdAt)}</span>
                </div>
                <div>
                    <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Recorded By</span>
                    <span className="text-[#121212] font-sans">{adminName(offering.recordedBy)}</span>
                </div>
            </div>

            {offering.notes && (
                <div className="space-y-1">
                    <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest">Notes</span>
                    <p className="text-xs text-[#121212]/90 font-light leading-relaxed bg-[#F4F1EA]/30 p-4 border border-[#121212]/5 rounded-lg max-w-3xl">
                        {offering.notes}
                    </p>
                </div>
            )}

            {offering.isReconciled ? (
                <div className="flex items-center space-x-3 text-green-700 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                        Reconciled on {offering.reconciledAt ? fmtDateTime(offering.reconciledAt) : "—"}
                        {offering.reconciledBy?.member
                            ? ` by ${offering.reconciledBy.member.firstname} ${offering.reconciledBy.member.lastname}`
                            : ""}
                    </span>
                </div>
            ) : (
                <div className="space-y-3 max-w-md">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">Reconcile This Entry</p>
                    <textarea
                        id="reconcile-notes"
                        rows={2}
                        value={reconcileNotes}
                        onChange={(e) => setReconcileNotes(e.target.value)}
                        placeholder="Reconciliation notes (required)…"
                        className="w-full p-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-lg resize-none"
                    />
                    {reconcileError && (
                        <div className="flex items-center space-x-2 text-red-600 text-xs">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{reconcileError}</span>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={handleReconcile}
                        disabled={isSubmitting || !reconcileNotes.trim()}
                        className="flex items-center space-x-2 h-10 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 disabled:opacity-40 transition-colors rounded-xl"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{isSubmitting ? "Reconciling…" : "Mark Reconciled"}</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default withAuth(function OfferingsPage() {
    const { offerings, pagination, isLoading, isSubmitting, error, goToPage, applyFilters, createOffering, reconcileOffering, refetch } = useOfferings();
    const { funds } = useFunds();

    const [selected, setSelected] = useState<Offering | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [filterType, setFilterType] = useState<OfferingType | "">("");
    const [filterFund, setFilterFund] = useState("");
    const [filterFrom, setFilterFrom] = useState("");
    const [filterTo, setFilterTo] = useState("");

    const stats = useMemo(() => {
        const totalCash = offerings.reduce((s, o) => s + Number(o.cashAmount), 0);
        const totalTransfer = offerings.reduce((s, o) => s + Number(o.expectedTransferAmount), 0);
        const unreconciled = offerings.filter((o) => !o.isReconciled).length;
        return { totalCash, totalTransfer, unreconciled, count: offerings.length };
    }, [offerings]);

    const handleFilterApply = () => {
        const f: OfferingFilters = {};
        if (filterType) f.type = filterType;
        if (filterFund) f.fundId = filterFund;
        if (filterFrom) f.fromDate = filterFrom;
        if (filterTo) f.toDate = filterTo;
        applyFilters(f);
    };

    const handleFilterReset = () => {
        setFilterType(""); setFilterFund(""); setFilterFrom(""); setFilterTo("");
        applyFilters({});
    };

    const handleCreate = async (payload: CreateOfferingPayload) => {
        await createOffering(payload);
        setShowCreate(false);
    };

    const handleReconcile = async (notes: string) => {
        if (!selected) return;
        const updated = await reconcileOffering(selected.id, { notes });
        setSelected(updated);
    };

    const openCreate = () => { setShowCreate((v) => !v); setSelected(null); };
    const openDetail = (o: Offering) => { setSelected(selected?.id === o.id ? null : o); setShowCreate(false); };

    const tableColSpan = selected
        ? "lg:col-span-7"
        : showCreate
        ? "lg:col-span-8"
        : "lg:col-span-12";

    return (
        <div className="space-y-8 font-sans">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Giving Records</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Record and reconcile all giving (tithes, offerings, pledges, seeds) by fund
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={openCreate}
                        className="flex items-center space-x-2 h-10 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors rounded-xl"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Record Giving</span>
                    </button>
                    <button
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="p-2 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-40"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-[#121212]/10 p-5 rounded-xl">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] flex items-center space-x-1.5 mb-2">
                        <Layers className="w-3.5 h-3.5" /><span>Cash Received</span>
                    </div>
                    <div className="text-xl font-light text-[#121212] font-mono">
                        {isLoading ? <div className="h-6 w-28 bg-[#F4F1EA] rounded animate-pulse" /> : formatCurrency(stats.totalCash)}
                    </div>
                </div>
                <div className="bg-white border border-[#121212]/10 p-5 rounded-xl">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Transfer Expected</div>
                    <div className="text-xl font-light text-[#121212] font-mono">
                        {isLoading ? <div className="h-6 w-28 bg-[#F4F1EA] rounded animate-pulse" /> : formatCurrency(stats.totalTransfer)}
                    </div>
                </div>
                <div className="bg-white border border-[#121212]/10 p-5 rounded-xl">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Records (Page)</div>
                    <div className="text-xl font-light text-[#121212] font-mono">
                        {isLoading ? <div className="h-6 w-10 bg-[#F4F1EA] rounded animate-pulse" /> : (pagination?.totalCount ?? stats.count)}
                    </div>
                </div>
                <div className="bg-white border border-[#121212]/10 p-5 rounded-xl">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Unreconciled</div>
                    <div className="text-xl font-light font-mono">
                        {isLoading
                            ? <div className="h-6 w-10 bg-[#F4F1EA] rounded animate-pulse" />
                            : <span className={stats.unreconciled > 0 ? "text-amber-600" : "text-[#121212]"}>{stats.unreconciled}</span>
                        }
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white border border-[#121212]/10 p-5 rounded-xl">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex items-center space-x-2">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#8A817C]" />
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Filters</span>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <label htmlFor="filter-type" className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">Type</label>
                        <select
                            id="filter-type"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as OfferingType | "")}
                            className="h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-lg appearance-none min-w-[140px]"
                        >
                            <option value="">All Types</option>
                            {(Object.keys(OFFERING_TYPE_LABELS) as OfferingType[]).map((t) => (
                                <option key={t} value={t}>{OFFERING_TYPE_LABELS[t]}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <label htmlFor="filter-fund" className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">Fund</label>
                        <select
                            id="filter-fund"
                            value={filterFund}
                            onChange={(e) => setFilterFund(e.target.value)}
                            className="h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-lg appearance-none min-w-[160px]"
                        >
                            <option value="">All Funds</option>
                            {funds.filter((f) => f.isActive).map((f) => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <label htmlFor="filter-from" className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">From</label>
                        <input
                            id="filter-from"
                            type="date"
                            value={filterFrom}
                            onChange={(e) => setFilterFrom(e.target.value)}
                            className="h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-lg"
                        />
                    </div>
                    <div className="flex flex-col space-y-1">
                        <label htmlFor="filter-to" className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">To</label>
                        <input
                            id="filter-to"
                            type="date"
                            value={filterTo}
                            onChange={(e) => setFilterTo(e.target.value)}
                            className="h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-lg"
                        />
                    </div>
                    <button type="button" onClick={handleFilterApply} className="h-9 px-4 bg-[#121212] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors rounded-lg">Apply</button>
                    <button type="button" onClick={handleFilterReset} className="h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-widest hover:text-[#121212] transition-colors rounded-lg">Reset</button>
                </div>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {showCreate && (
                    <div className="lg:col-span-4">
                        <CreateForm
                            funds={funds}
                            isSubmitting={isSubmitting}
                            onClose={() => setShowCreate(false)}
                            onSubmit={handleCreate}
                        />
                    </div>
                )}

                <div className={`${tableColSpan} bg-white border border-[#121212]/10 rounded-xl overflow-hidden`}>
                                            <DismissibleError message={error} />
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["Date", "Type", "Fund", "Cash", "Transfer", "Status"].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                {(() => {
                                    if (isLoading) return ["sk-r0", "sk-r1", "sk-r2", "sk-r3", "sk-r4", "sk-r5"].map((k) => <SkeletonRow key={k} />);
                                    if (offerings.length === 0) return (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                                No giving records found for the selected filters.
                                            </td>
                                        </tr>
                                    );
                                    return (
                                    offerings.map((o) => {
                                        const statusBadge = o.isReconciled
                                            ? <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-green-100 text-green-800"><CheckCircle2 className="w-2.5 h-2.5" /><span>Reconciled</span></span>
                                            : <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-amber-100 text-amber-800"><Clock className="w-2.5 h-2.5" /><span>Pending</span></span>;
                                        return (
                                            <tr
                                                key={o.id}
                                                onClick={() => openDetail(o)}
                                                className={`cursor-pointer transition-colors ${selected?.id === o.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/20"}`}
                                            >
                                                <td className="p-4 font-mono text-xs text-[#121212]">{fmtDate(o.createdAt)}</td>
                                                <td className="p-4 text-xs font-medium text-[#121212] whitespace-nowrap">{OFFERING_TYPE_LABELS[o.type]}</td>
                                                <td className="p-4">
                                                    <div className="text-xs font-medium text-[#121212]">{o.fund.name}</div>
                                                    <div className="text-[10px] text-[#8A817C] uppercase tracking-wider mt-0.5">{o.fund.type}</div>
                                                </td>
                                                <td className="p-4 font-mono text-xs text-[#121212]">{formatCurrency(o.cashAmount)}</td>
                                                <td className="p-4 font-mono text-xs text-[#121212]">{formatCurrency(o.expectedTransferAmount)}</td>
                                                <td className="p-4">{statusBadge}</td>
                                            </tr>
                                        );
                                    }));
                                })()}
                            </tbody>
                        </table>
                    </div>

                    <PaginationBar
                        pagination={pagination}
                        onPage={goToPage}
                        label="offerings"
                    />
                </div>

                {selected && (
                    <div className="lg:col-span-5">
                        <DetailPanel
                            offering={selected}
                            isSubmitting={isSubmitting}
                            onClose={() => setSelected(null)}
                            onReconcile={handleReconcile}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}, { requiredPermission: 'finance:read' });
