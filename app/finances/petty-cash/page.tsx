"use client";

import React, { useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    Coins,
    Plus,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    X,
    RefreshCw,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
    usePettyCash,
    PettyCashReplenishment,
    PettyCashStatus,
    CreatePettyCashPayload,
} from "@/hooks/use-petty-cash";
import { useAccounts } from "@/hooks/use-accounts";

const STATUS_CONFIG: Record<PettyCashStatus, { label: string; cls: string; Icon: React.FC<{ className?: string }> }> = {
    PENDING: { label: "Pending", cls: "bg-amber-100 text-amber-800", Icon: Clock },
    APPROVED: { label: "Approved", cls: "bg-green-100 text-green-800", Icon: CheckCircle2 },
    REJECTED: { label: "Rejected", cls: "bg-red-100 text-red-800", Icon: XCircle },
};

const fmt = (n: number | string) =>
    `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function RowSkeleton() {
    return (
        <tr className="border-b border-[#121212]/5">
            {[30, 30, 20, 20].map((w, i) => (
                <td key={i} className="p-4">
                    <div className="h-3 bg-[#F4F1EA] rounded animate-pulse" style={{ width: `${w * 4}px` }} />
                </td>
            ))}
        </tr>
    );
}

export default withAuth(function PettyCashPage() {
    const { replenishments, pagination, isLoading, isSubmitting, error, statusFilter, goToPage, applyStatusFilter, createReplenishment, approveReplenishment, rejectReplenishment, refetch } =
        usePettyCash();
    const { accounts } = useAccounts();

    const [selected, setSelected] = useState<PettyCashReplenishment | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState<CreatePettyCashPayload>({ fromAccountId: "", toCashAccountId: "", amount: 0, notes: "" });
    const [actionError, setActionError] = useState<string | null>(null);

    async function handleCreate() {
        if (!form.fromAccountId || !form.toCashAccountId || !form.amount) return;
        setActionError(null);
        try {
            await createReplenishment({ ...form, notes: form.notes || undefined });
            setShowCreate(false);
            setForm({ fromAccountId: "", toCashAccountId: "", amount: 0, notes: "" });
        } catch (e: any) { setActionError(e.message); }
    }

    async function handleApprove(id: string) {
        setActionError(null);
        try { const u = await approveReplenishment(id); setSelected(u); }
        catch (e: any) { setActionError(e.message); }
    }

    async function handleReject(id: string) {
        setActionError(null);
        try { const u = await rejectReplenishment(id); setSelected(u); }
        catch (e: any) { setActionError(e.message); }
    }

    const pendingCount = replenishments.filter((r) => r.status === "PENDING").length;

    return (
        <div className="space-y-8 font-sans">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Petty Cash</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Replenishment requests &bull; Self-approve blocked
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={refetch} disabled={isLoading} className="h-10 px-4 border border-[#121212]/10 text-xs font-semibold uppercase tracking-widest text-[#121212] hover:bg-[#F4F1EA]/40 disabled:opacity-40 transition-colors rounded-xl flex items-center space-x-2">
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                    </button>
                    <button onClick={() => { setShowCreate((v) => !v); setSelected(null); }} className="h-10 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/80 transition-colors rounded-xl flex items-center space-x-2">
                        <Plus className="w-3.5 h-3.5" /><span>Request</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: "Total Requests", value: pagination?.totalCount ?? 0 },
                    { label: "Pending Approval", value: pendingCount, warn: pendingCount > 0 },
                    { label: "Approved", value: replenishments.filter((r) => r.status === "APPROVED").length },
                ].map(({ label, value, warn }) => (
                    <div key={label} className="bg-white border border-[#121212]/10 p-6 rounded-xl">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">{label}</p>
                        <p className={`text-2xl font-light font-mono ${warn ? "text-amber-600" : "text-[#121212]"}`}>{value}</p>
                    </div>
                ))}
            </div>

            {error && (
                <div className="flex items-center space-x-2 text-red-600 text-xs bg-red-50 border border-red-200 p-4 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
                </div>
            )}

            {/* Filter */}
            <div className="flex items-center space-x-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">Filter:</p>
                {(["", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
                    <button key={s} onClick={() => applyStatusFilter(s as PettyCashStatus | "")}
                        className={`h-8 px-3 text-[10px] font-semibold uppercase tracking-widest rounded-lg transition-colors ${statusFilter === s ? "bg-[#121212] text-white" : "border border-[#121212]/10 text-[#8A817C] hover:text-[#121212]"}`}>
                        {s === "" ? "All" : STATUS_CONFIG[s as PettyCashStatus].label}
                    </button>
                ))}
            </div>

            <div className="flex gap-6 items-start">
                {/* Table */}
                <div className="flex-1 min-w-0">
                    <div className="bg-white border border-[#121212]/10 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                        {["From Account", "To Account", "Amount", "Status"].map((h) => (
                                            <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#121212]/5">
                                    {isLoading ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />) :
                                        replenishments.length === 0 ? (
                                            <tr><td colSpan={4} className="p-10 text-center text-xs text-[#8A817C] font-light">No replenishments found.</td></tr>
                                        ) : replenishments.map((r) => {
                                            const cfg = STATUS_CONFIG[r.status];
                                            return (
                                                <tr key={r.id} onClick={() => { setSelected(r); setShowCreate(false); setActionError(null); }}
                                                    className={`cursor-pointer hover:bg-[#F4F1EA]/20 transition-colors ${selected?.id === r.id ? "bg-[#F4F1EA]/30" : ""}`}>
                                                    <td className="p-4 text-xs text-[#121212]">{r.fromAccount?.name ?? "—"}</td>
                                                    <td className="p-4 text-xs text-[#121212]">{r.toCashAccount?.name ?? "—"}</td>
                                                    <td className="p-4 font-mono text-xs font-medium text-[#121212]">{fmt(r.amount)}</td>
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

                    <PaginationBar
                        pagination={pagination}
                        onPage={goToPage}
                        isLoading={isLoading}
                        label="requests"
                    />
                </div>

                {/* Create panel */}
                {showCreate && (
                    <div className="w-[360px] shrink-0 bg-white border border-[#121212]/10 rounded-xl p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-widest text-[#121212] flex items-center space-x-2"><Coins className="w-3.5 h-3.5" /><span>Request Replenishment</span></p>
                            <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-[#8A817C]" /></button>
                        </div>
                        {actionError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{actionError}</p>}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">From Account *</label>
                                <select value={form.fromAccountId} onChange={(e) => setForm((f) => ({ ...f, fromAccountId: e.target.value }))}
                                    className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none">
                                    <option value="">Select account</option>
                                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">To Cash Account *</label>
                                <select value={form.toCashAccountId} onChange={(e) => setForm((f) => ({ ...f, toCashAccountId: e.target.value }))}
                                    className="w-full h-10 px-3 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none">
                                    <option value="">Select account</option>
                                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Amount *</label>
                                <input type="number" min={0} value={form.amount || ""} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                                    placeholder="0.00"
                                    className="w-full h-10 px-3 border border-[#121212]/10 text-xs font-mono text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Notes</label>
                                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
                                    className="w-full px-3 py-2 border border-[#121212]/10 text-xs text-[#121212] bg-[#F4F1EA]/30 rounded-xl focus:outline-none resize-none" />
                            </div>
                        </div>
                        <button onClick={handleCreate} disabled={isSubmitting || !form.fromAccountId || !form.toCashAccountId || !form.amount}
                            className="w-full h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-xl disabled:opacity-40">
                            {isSubmitting ? "Requesting…" : "Submit Request"}
                        </button>
                    </div>
                )}

                {/* Detail panel */}
                {selected && !showCreate && (
                    <div className="w-[340px] shrink-0 bg-white border border-[#121212]/10 rounded-xl p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-widest text-[#121212]">Replenishment</p>
                            <button onClick={() => setSelected(null)}><X className="w-4 h-4 text-[#8A817C]" /></button>
                        </div>
                        {actionError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{actionError}</p>}
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-[#8A817C]">Amount</span><span className="font-mono font-semibold text-[#121212]">{fmt(selected.amount)}</span></div>
                            <div className="flex justify-between"><span className="text-[#8A817C]">From</span><span>{selected.fromAccount?.name}</span></div>
                            <div className="flex justify-between"><span className="text-[#8A817C]">To</span><span>{selected.toCashAccount?.name}</span></div>
                            <div className="flex justify-between"><span className="text-[#8A817C]">Requested by</span><span>{selected.requestedBy?.name ?? "—"}</span></div>
                            <div className="flex justify-between items-center"><span className="text-[#8A817C]">Status</span>
                                <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${STATUS_CONFIG[selected.status].cls}`}>{STATUS_CONFIG[selected.status].label}</span>
                            </div>
                            {selected.notes && <div><p className="text-[#8A817C] mb-1">Notes</p><p>{selected.notes}</p></div>}
                            {selected.approvedBy && <div className="flex justify-between"><span className="text-[#8A817C]">Approved by</span><span>{selected.approvedBy.name}</span></div>}
                            {selected.approvedAt && <div className="flex justify-between"><span className="text-[#8A817C]">Approved at</span><span className="font-mono">{fmtDate(selected.approvedAt)}</span></div>}
                        </div>
                        {selected.status === "PENDING" && (
                            <div className="flex space-x-2 pt-2 border-t border-[#121212]/10">
                                <button onClick={() => handleApprove(selected.id)} disabled={isSubmitting}
                                    className="flex-1 h-9 bg-green-700 text-white text-xs font-semibold uppercase tracking-widest rounded-xl disabled:opacity-40">
                                    {isSubmitting ? "…" : "Approve"}
                                </button>
                                <button onClick={() => handleReject(selected.id)} disabled={isSubmitting}
                                    className="flex-1 h-9 border border-red-300 text-red-700 text-xs font-semibold uppercase tracking-widest rounded-xl disabled:opacity-40">
                                    {isSubmitting ? "…" : "Reject"}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}, { requiredPermission: 'finance:read' });
