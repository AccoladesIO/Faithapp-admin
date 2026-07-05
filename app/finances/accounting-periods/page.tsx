"use client";

import { DismissibleError } from "@/components/ui/dismissible-error";

import React, { useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { CalendarDays, Plus, Lock, Unlock, X, RefreshCw } from "lucide-react";
import { useAccountingPeriods, AccountingPeriod, PeriodStatus } from "@/hooks/use-accounting-periods";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_CONFIG: Record<PeriodStatus, { label: string; cls: string; Icon: React.FC<{ className?: string }> }> = {
    OPEN: { label: "Open", cls: "bg-green-100 text-green-800", Icon: Unlock },
    CLOSED: { label: "Closed", cls: "bg-[#F4F1EA] text-[#8A817C]", Icon: Lock },
};

function RowSkeleton() {
    return (
        <tr className="border-b border-[#121212]/5">
            {[20, 20, 20, 20].map((w, i) => (
                <td key={i} className="p-4">
                    <div className="h-3 bg-[#F4F1EA] rounded animate-pulse" style={{ width: `${w * 5}px` }} />
                </td>
            ))}
        </tr>
    );
}

export default withAuth(function AccountingPeriodsPage() {
    const { periods, isLoading, isSubmitting, error, createPeriod, closePeriod, reopenPeriod, refetch } = useAccountingPeriods();

    const [showCreate, setShowCreate] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [selected, setSelected] = useState<AccountingPeriod | null>(null);
    const [form, setForm] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });

    async function handleCreate() {
        setActionError(null);
        try {
            await createPeriod(form.year, form.month);
            setShowCreate(false);
        } catch (e: any) { setActionError(e.message); }
    }

    async function handleClose(id: string) {
        setActionError(null);
        try { const u = await closePeriod(id); setSelected(u); }
        catch (e: any) { setActionError(e.message); }
    }

    async function handleReopen(id: string) {
        setActionError(null);
        try { const u = await reopenPeriod(id); setSelected(u); }
        catch (e: any) { setActionError(e.message); }
    }

    const openCount = periods.filter((p) => p.status === "OPEN").length;

    return (
        <div className="space-y-8 font-sans">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Accounting Periods</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Entries can only be posted to open periods &bull; Closing is irreversible without FINANCE_RECONCILE
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={refetch} disabled={isLoading} className="h-10 px-4 border border-[#121212]/10 text-xs font-semibold uppercase tracking-widest text-[#121212] hover:bg-[#F4F1EA]/40 disabled:opacity-40 transition-colors rounded-xl flex items-center space-x-2">
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /><span>Refresh</span>
                    </button>
                    <button onClick={() => { setShowCreate((v) => !v); setSelected(null); setActionError(null); }} className="h-10 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/80 rounded-xl flex items-center space-x-2">
                        <Plus className="w-3.5 h-3.5" /><span>New Period</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-[#121212]/10 p-6 rounded-xl">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Total Periods</p>
                    <p className="text-2xl font-light font-mono text-[#121212]">{periods.length}</p>
                </div>
                <div className="bg-white border border-[#121212]/10 p-6 rounded-xl">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Open Periods</p>
                    <p className={`text-2xl font-light font-mono ${openCount > 0 ? "text-green-700" : "text-[#8A817C]"}`}>{openCount}</p>
                </div>
            </div>

                            <DismissibleError message={error} />

            <div className="flex gap-6 items-start">
                <div className="flex-1 min-w-0 bg-white border border-[#121212]/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["Period", "Year", "Month", "Status"].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5">
                                {isLoading ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />) :
                                    periods.length === 0 ? (
                                        <tr><td colSpan={4} className="p-10 text-center text-xs text-[#8A817C] font-light">No accounting periods found.</td></tr>
                                    ) : periods.map((p) => {
                                        const cfg = STATUS_CONFIG[p.status];
                                        return (
                                            <tr key={p.id} onClick={() => { setSelected(p); setShowCreate(false); setActionError(null); }}
                                                className={`cursor-pointer hover:bg-[#F4F1EA]/20 transition-colors ${selected?.id === p.id ? "bg-[#F4F1EA]/30" : ""}`}>
                                                <td className="p-4 font-mono text-xs font-medium text-[#121212]">{p.year}-{String(p.month).padStart(2, "0")}</td>
                                                <td className="p-4 font-mono text-xs text-[#8A817C]">{p.year}</td>
                                                <td className="p-4 text-xs text-[#8A817C]">{MONTHS[p.month - 1]}</td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center space-x-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${cfg.cls}`}>
                                                        <cfg.Icon className="w-3 h-3" /><span>{cfg.label}</span>
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Create panel */}
                {showCreate && (
                    <div className="w-[320px] shrink-0 bg-white border border-[#121212]/10 rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-widest text-[#121212] flex items-center space-x-2"><CalendarDays className="w-3.5 h-3.5" /><span>New Period</span></p>
                            <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-[#8A817C]" /></button>
                        </div>
                        <DismissibleError message={actionError} />
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Year *</label>
                            <input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))} min={2000} max={2099}
                                className="w-full h-10 px-3 border border-[#121212]/10 text-xs font-mono text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Month *</label>
                            <select value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: Number(e.target.value) }))}
                                className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none">
                                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                        <button onClick={handleCreate} disabled={isSubmitting}
                            className="w-full h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-xl disabled:opacity-40">
                            {isSubmitting ? "Creating…" : "Create Period"}
                        </button>
                    </div>
                )}

                {/* Detail panel */}
                {selected && !showCreate && (
                    <div className="w-[320px] shrink-0 bg-white border border-[#121212]/10 rounded-xl p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-widest text-[#121212]">
                                {selected.year}-{String(selected.month).padStart(2, "0")}
                            </p>
                            <button onClick={() => setSelected(null)}><X className="w-4 h-4 text-[#8A817C]" /></button>
                        </div>
                        <DismissibleError message={actionError} />
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                                <span className="text-[#8A817C]">Status</span>
                                <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${STATUS_CONFIG[selected.status].cls}`}>{selected.status}</span>
                            </div>
                            {selected.closedBy && <div className="flex justify-between"><span className="text-[#8A817C]">Closed by</span><span>{selected.closedBy.name}</span></div>}
                            {selected.closedAt && <div className="flex justify-between"><span className="text-[#8A817C]">Closed at</span><span className="font-mono">{new Date(selected.closedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span></div>}
                        </div>
                        <div className="pt-2 border-t border-[#121212]/10 space-y-2">
                            {selected.status === "OPEN" ? (
                                <button onClick={() => handleClose(selected.id)} disabled={isSubmitting}
                                    className="w-full h-9 border border-amber-300 text-amber-700 text-xs font-semibold uppercase tracking-widest rounded-xl disabled:opacity-40 flex items-center justify-center space-x-2">
                                    <Lock className="w-3.5 h-3.5" /><span>{isSubmitting ? "Closing…" : "Close Period"}</span>
                                </button>
                            ) : (
                                <button onClick={() => handleReopen(selected.id)} disabled={isSubmitting}
                                    className="w-full h-9 border border-green-300 text-green-700 text-xs font-semibold uppercase tracking-widest rounded-xl disabled:opacity-40 flex items-center justify-center space-x-2">
                                    <Unlock className="w-3.5 h-3.5" /><span>{isSubmitting ? "Reopening…" : "Reopen Period"}</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}, { requiredPermission: 'finance:read' });
