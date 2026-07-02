"use client";

import React, { useState, useMemo } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    HandHeart,
    Plus,
    AlertCircle,
    X,
    RefreshCw,
    ChevronDown,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
    usePledges,
    PledgeCampaign,
    Pledge,
    PledgeStatus,
    PledgeFrequency,
    CreateCampaignPayload,
    CreatePledgePayload,
} from "@/hooks/use-pledges";

const STATUS_COLORS: Record<PledgeStatus, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    COMPLETED: "bg-blue-100 text-blue-800",
    CANCELLED: "bg-[#F4F1EA] text-[#8A817C]",
};

const FREQ_LABELS: Record<PledgeFrequency, string> = {
    ONE_OFF: "One-off",
    MONTHLY: "Monthly",
    QUARTERLY: "Quarterly",
};

const fmt = (n: number | string) =>
    `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function RowSkeleton({ cols }: { cols: number }) {
    return (
        <tr className="border-b border-[#121212]/5">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="p-4">
                    <div className="h-3 bg-[#F4F1EA] rounded animate-pulse" style={{ width: `${60 + i * 20}px` }} />
                </td>
            ))}
        </tr>
    );
}

export default withAuth(function PledgesPage() {
    const { campaigns, isLoading, isSubmitting, error, selectedCampaignId, pledges, pledgePagination, isPledgesLoading, selectCampaign, goToPledgePage, createCampaign, createPledge, updatePledgeStatus, refetchCampaigns } =
        usePledges();

    const [showCampaignForm, setShowCampaignForm] = useState(false);
    const [showPledgeForm, setShowPledgeForm] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [campaignSearch, setCampaignSearch] = useState("");
    const filteredCampaigns = useMemo(() => {
        if (!campaignSearch.trim()) return campaigns;
        const q = campaignSearch.toLowerCase();
        return campaigns.filter((c) => c.name.toLowerCase().includes(q));
    }, [campaigns, campaignSearch]);
    const [campaignForm, setCampaignForm] = useState<CreateCampaignPayload>({ name: "", targetAmount: 0, startDate: "" });
    const [pledgeForm, setPledgeForm] = useState<CreatePledgePayload>({ memberId: "", totalAmount: 0, frequency: "ONE_OFF", startDate: "" });

    const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

    async function handleCreateCampaign() {
        if (!campaignForm.name || !campaignForm.targetAmount || !campaignForm.startDate) return;
        setActionError(null);
        try {
            await createCampaign(campaignForm);
            setShowCampaignForm(false);
            setCampaignForm({ name: "", targetAmount: 0, startDate: "" });
        } catch (e: any) { setActionError(e.message); }
    }

    async function handleCreatePledge() {
        if (!selectedCampaignId || !pledgeForm.memberId || !pledgeForm.totalAmount || !pledgeForm.startDate) return;
        setActionError(null);
        try {
            await createPledge(selectedCampaignId, pledgeForm);
            setShowPledgeForm(false);
            setPledgeForm({ memberId: "", totalAmount: 0, frequency: "ONE_OFF", startDate: "" });
        } catch (e: any) { setActionError(e.message); }
    }

    async function handleStatusChange(pledge: Pledge, status: PledgeStatus) {
        setActionError(null);
        try { await updatePledgeStatus(pledge.id, status); }
        catch (e: any) { setActionError(e.message); }
    }

    return (
        <div className="space-y-8 font-sans">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Pledges</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Campaigns &amp; per-member pledge commitments
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={refetchCampaigns} disabled={isLoading} className="h-10 px-4 border border-[#121212]/10 text-xs font-semibold uppercase tracking-widest text-[#121212] hover:bg-[#F4F1EA]/40 disabled:opacity-40 transition-colors rounded-xl flex items-center space-x-2">
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /><span>Refresh</span>
                    </button>
                    <button onClick={() => { setShowCampaignForm((v) => !v); setActionError(null); }} className="h-10 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/80 rounded-xl flex items-center space-x-2">
                        <Plus className="w-3.5 h-3.5" /><span>New Campaign</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center space-x-2 text-red-600 text-xs bg-red-50 border border-red-200 p-4 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
                </div>
            )}
            {actionError && (
                <div className="flex items-center space-x-2 text-red-600 text-xs bg-red-50 border border-red-200 p-4 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" /><span>{actionError}</span>
                </div>
            )}

            <div className="flex gap-6 items-start">
                {/* Campaigns list */}
                <div className="w-72 shrink-0 space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Campaigns</p>
                    <input
                        type="text"
                        value={campaignSearch}
                        onChange={(e) => setCampaignSearch(e.target.value)}
                        placeholder="Search campaigns…"
                        className="w-full h-8 px-3 bg-white border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-lg"
                    />
                    {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white border border-[#121212]/10 rounded-xl p-4 space-y-2 animate-pulse">
                            <div className="h-3 w-32 bg-[#F4F1EA] rounded" />
                            <div className="h-2 w-20 bg-[#F4F1EA] rounded" />
                        </div>
                    )) : filteredCampaigns.length === 0 ? (
                        <div className="bg-white border border-[#121212]/10 rounded-xl p-6 text-center text-xs text-[#8A817C] font-light">
                            {campaigns.length === 0 ? "No campaigns yet." : "No campaigns match your search."}
                        </div>
                    ) : filteredCampaigns.map((c) => (
                        <button key={c.id} onClick={() => selectCampaign(selectedCampaignId === c.id ? null : c.id)}
                            className={`w-full text-left bg-white border rounded-xl p-4 transition-colors ${selectedCampaignId === c.id ? "border-[#121212] bg-[#F4F1EA]/20" : "border-[#121212]/10 hover:border-[#121212]/30"}`}>
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-[#121212] truncate">{c.name}</p>
                                <ChevronDown className={`w-3.5 h-3.5 text-[#8A817C] shrink-0 transition-transform ${selectedCampaignId === c.id ? "rotate-180" : ""}`} />
                            </div>
                            <p className="text-[10px] font-mono text-[#8A817C] mt-1">Target: {fmt(c.targetAmount)}</p>
                            <div className="mt-2 h-1.5 bg-[#F4F1EA] rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min((c.totalPledged / c.targetAmount) * 100, 100)}%` }} />
                            </div>
                            <div className="flex justify-between mt-1">
                                <p className="text-[9px] text-[#8A817C] font-mono">{c.pledgeCount} pledges</p>
                                <p className="text-[9px] font-mono text-green-700">{fmt(c.totalPledged)}</p>
                            </div>
                        </button>
                    ))}

                    {/* Campaign create form */}
                    {showCampaignForm && (
                        <div className="bg-white border border-[#121212]/10 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#121212] flex items-center space-x-1"><HandHeart className="w-3 h-3" /><span>New Campaign</span></p>
                                <button onClick={() => setShowCampaignForm(false)}><X className="w-3.5 h-3.5 text-[#8A817C]" /></button>
                            </div>
                            {[
                                { label: "Name *", key: "name", type: "text" },
                                { label: "Target *", key: "targetAmount", type: "number" },
                                { label: "Start Date *", key: "startDate", type: "date" },
                                { label: "End Date", key: "endDate", type: "date" },
                            ].map(({ label, key, type }) => (
                                <div key={key}>
                                    <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">{label}</label>
                                    <input type={type} value={(campaignForm as any)[key] ?? ""} onChange={(e) => setCampaignForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                                        className="w-full h-8 px-2 border border-[#121212]/10 text-[10px] text-[#121212] bg-[#F4F1EA]/30 rounded-lg focus:outline-none" />
                                </div>
                            ))}
                            <button onClick={handleCreateCampaign} disabled={isSubmitting || !campaignForm.name || !campaignForm.targetAmount || !campaignForm.startDate}
                                className="w-full h-8 bg-[#121212] text-white text-[10px] font-semibold uppercase tracking-widest rounded-lg disabled:opacity-40">
                                {isSubmitting ? "…" : "Create"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Pledges for selected campaign */}
                <div className="flex-1 min-w-0 space-y-4">
                    {selectedCampaign ? (
                        <>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-[#121212]">{selectedCampaign.name}</p>
                                    <p className="text-[10px] text-[#8A817C] font-mono mt-0.5">
                                        {fmt(selectedCampaign.totalPledged)} pledged of {fmt(selectedCampaign.targetAmount)} target &bull; {selectedCampaign.pledgeCount} pledges
                                    </p>
                                </div>
                                <button onClick={() => setShowPledgeForm((v) => !v)} className="h-9 px-3 border border-[#121212]/10 text-[10px] font-semibold uppercase tracking-widest text-[#121212] hover:bg-[#F4F1EA]/40 rounded-xl flex items-center space-x-1">
                                    <Plus className="w-3 h-3" /><span>Add Pledge</span>
                                </button>
                            </div>

                            {showPledgeForm && (
                                <div className="bg-white border border-[#121212]/10 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#121212]">Add Pledge</p>
                                        <button onClick={() => setShowPledgeForm(false)}><X className="w-3.5 h-3.5 text-[#8A817C]" /></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Member ID *</label>
                                            <input value={pledgeForm.memberId} onChange={(e) => setPledgeForm((f) => ({ ...f, memberId: e.target.value }))} placeholder="Member UUID"
                                                className="w-full h-8 px-2 border border-[#121212]/10 text-[10px] text-[#121212] bg-[#F4F1EA]/30 rounded-lg focus:outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Amount *</label>
                                            <input type="number" value={pledgeForm.totalAmount || ""} onChange={(e) => setPledgeForm((f) => ({ ...f, totalAmount: Number(e.target.value) }))}
                                                className="w-full h-8 px-2 border border-[#121212]/10 text-[10px] font-mono text-[#121212] bg-[#F4F1EA]/30 rounded-lg focus:outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Frequency *</label>
                                            <select value={pledgeForm.frequency} onChange={(e) => setPledgeForm((f) => ({ ...f, frequency: e.target.value as PledgeFrequency }))}
                                                className="w-full h-8 px-2 border border-[#121212]/10 text-[10px] text-[#121212] bg-[#F4F1EA]/30 rounded-lg focus:outline-none">
                                                {(Object.entries(FREQ_LABELS) as [PledgeFrequency, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Start Date *</label>
                                            <input type="date" value={pledgeForm.startDate} onChange={(e) => setPledgeForm((f) => ({ ...f, startDate: e.target.value }))}
                                                className="w-full h-8 px-2 border border-[#121212]/10 text-[10px] text-[#121212] bg-[#F4F1EA]/30 rounded-lg focus:outline-none" />
                                        </div>
                                    </div>
                                    <button onClick={handleCreatePledge} disabled={isSubmitting || !pledgeForm.memberId || !pledgeForm.totalAmount || !pledgeForm.startDate}
                                        className="h-8 px-4 bg-[#121212] text-white text-[10px] font-semibold uppercase tracking-widest rounded-lg disabled:opacity-40">
                                        {isSubmitting ? "…" : "Add Pledge"}
                                    </button>
                                </div>
                            )}

                            <div className="bg-white border border-[#121212]/10 rounded-xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                            {["Member", "Amount", "Paid", "Frequency", "Status", ""].map((h) => (
                                                <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#121212]/5">
                                        {isPledgesLoading ? Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} cols={6} />) :
                                            pledges.length === 0 ? (
                                                <tr><td colSpan={6} className="p-8 text-center text-xs text-[#8A817C] font-light">No pledges for this campaign yet.</td></tr>
                                            ) : pledges.map((p) => (
                                                <tr key={p.id} className="hover:bg-[#F4F1EA]/20 transition-colors">
                                                    <td className="p-4 text-xs text-[#121212]">{p.member?.name ?? p.member?.email ?? "—"}</td>
                                                    <td className="p-4 font-mono text-xs font-medium text-[#121212]">{fmt(p.totalAmount)}</td>
                                                    <td className="p-4 font-mono text-xs text-[#8A817C]">{fmt(p.amountPaid)}</td>
                                                    <td className="p-4 text-xs text-[#8A817C]">{FREQ_LABELS[p.frequency]}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                                                    </td>
                                                    <td className="p-4">
                                                        {p.status === "ACTIVE" && (
                                                            <div className="flex space-x-1">
                                                                <button onClick={() => handleStatusChange(p, "COMPLETED")} className="text-[9px] text-green-700 border border-green-300 px-2 py-0.5 rounded hover:bg-green-50">Complete</button>
                                                                <button onClick={() => handleStatusChange(p, "CANCELLED")} className="text-[9px] text-red-700 border border-red-300 px-2 py-0.5 rounded hover:bg-red-50">Cancel</button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>

                            <PaginationBar
                                pagination={pledgePagination}
                                onPage={goToPledgePage}
                                isLoading={isPledgesLoading}
                                label="pledges"
                            />
                        </>
                    ) : (
                        <div className="bg-white border border-[#121212]/10 rounded-xl p-12 text-center">
                            <HandHeart className="w-8 h-8 text-[#8A817C]/40 mx-auto mb-3" />
                            <p className="text-xs text-[#8A817C] font-light">Select a campaign to view its pledges.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}, { requiredPermission: 'finance:read' });
