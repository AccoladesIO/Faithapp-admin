"use client";

import { DismissibleError } from "@/components/ui/dismissible-error";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { api } from "@/utils/auth/axios-client";
import { withAuth } from "@/utils/auth/with-auth";
import {
    HandHeart,
    Plus,
    X,
    RefreshCw,
    ChevronDown,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { currencySymbol, formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/utils/currency";
import {
    usePledges,
    Pledge,
    PledgeStatus,
    PledgeFrequency,
    PledgeContribution,
    PledgeContributionStatus,
    CreateCampaignPayload,
    CreatePledgePayload,
} from "@/hooks/use-pledges";
import { useFunds } from "@/hooks/use-funds";

const STATUS_COLORS: Record<PledgeStatus, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    COMPLETED: "bg-blue-100 text-blue-800",
    CANCELLED: "bg-[#F4F1EA] text-[#8A817C]",
};

const CONTRIBUTION_STATUS_COLORS: Record<PledgeContributionStatus, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    CONFIRMED: "bg-green-100 text-green-800",
    DECLINED: "bg-red-100 text-red-800",
};

const FREQ_LABELS: Record<PledgeFrequency, string> = {
    ONE_OFF: "One-off",
    MONTHLY: "Monthly",
    QUARTERLY: "Quarterly",
};


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
    const {
        campaigns, isLoading, isSubmitting, error, selectedCampaignId, pledges, pledgePagination, isPledgesLoading,
        selectCampaign, goToPledgePage, createCampaign, createPledge, updatePledgeStatus, updateCampaignActive, refetchCampaigns,
        contributions, contributionsPagination, isContributionsLoading, fetchContributions, confirmContribution, declineContribution,
    } = usePledges();
    const { funds } = useFunds();

    const [activeView, setActiveView] = useState<"campaigns" | "contributions">("campaigns");
    const [contributionStatusFilter, setContributionStatusFilter] = useState<PledgeContributionStatus | "">("PENDING");
    const [pendingContributionAction, setPendingContributionAction] = useState<{ contribution: PledgeContribution; action: "confirm" | "decline" } | null>(null);
    const [declineNote, setDeclineNote] = useState("");
    const [contributionActionError, setContributionActionError] = useState<string | null>(null);

    useEffect(() => {
        if (activeView === "contributions") {
            fetchContributions({ status: contributionStatusFilter || undefined });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeView, contributionStatusFilter]);

    async function handleConfirmContribution(contribution: PledgeContribution) {
        setContributionActionError(null);
        try {
            await confirmContribution(contribution.id);
            setPendingContributionAction(null);
        } catch (e: unknown) { setContributionActionError((e as Error).message); }
    }

    async function handleDeclineContribution(contribution: PledgeContribution) {
        if (!declineNote.trim()) return;
        setContributionActionError(null);
        try {
            await declineContribution(contribution.id, declineNote.trim());
            setPendingContributionAction(null);
            setDeclineNote("");
        } catch (e: unknown) { setContributionActionError((e as Error).message); }
    }

    const [showCampaignForm, setShowCampaignForm] = useState(false);
    const [showPledgeForm, setShowPledgeForm] = useState(false);
    const [pledgeMode, setPledgeMode] = useState<"member" | "guest">("member");
    const [memberSearch, setMemberSearch] = useState("");
    const [showMemberDrop, setShowMemberDrop] = useState(false);
    const [selectedMember, setSelectedMember] = useState<{ id: string; name: string } | null>(null);
    const [pendingStatus, setPendingStatus] = useState<{ pledge: Pledge; status: PledgeStatus } | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [campaignSearch, setCampaignSearch] = useState("");
    const filteredCampaigns = useMemo(() => {
        if (!campaignSearch.trim()) return campaigns;
        const q = campaignSearch.toLowerCase();
        return campaigns.filter((c) => c.name.toLowerCase().includes(q));
    }, [campaigns, campaignSearch]);
    const [memberResults, setMemberResults] = useState<{ id: string; firstname: string; lastname: string }[]>([]);
    const memberSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        const q = memberSearch.trim();
        if (!q) { setMemberResults([]); return; }
        if (memberSearchDebounceRef.current) clearTimeout(memberSearchDebounceRef.current);
        memberSearchDebounceRef.current = setTimeout(async () => {
            try {
                const res = await api.get(`/members?page=1&limit=8&search=${encodeURIComponent(q)}`);
                setMemberResults(res.data?.data?.data ?? []);
            } catch {
                setMemberResults([]);
            }
        }, 300);
    }, [memberSearch]);
    const [campaignForm, setCampaignForm] = useState<CreateCampaignPayload>({ name: "", fundId: "", targetAmount: 0, startDate: "", endDate: "" });
    const [pledgeForm, setPledgeForm] = useState<CreatePledgePayload>({ totalAmount: 0, frequency: "ONE_OFF", startDate: "" });

    const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

    async function handleCreateCampaign() {
        if (!campaignForm.name || !campaignForm.fundId || !campaignForm.targetAmount || !campaignForm.startDate || !campaignForm.endDate) return;
        setActionError(null);
        try {
            await createCampaign(campaignForm);
            setShowCampaignForm(false);
            setCampaignForm({ name: "", fundId: "", targetAmount: 0, startDate: "", endDate: "" });
        } catch (e: unknown) { setActionError((e as Error).message); }
    }

    function resetPledgeForm() {
        setPledgeMode("member");
        setPledgeForm({ totalAmount: 0, frequency: "ONE_OFF", startDate: "" });
        setSelectedMember(null);
        setMemberSearch("");
        setShowMemberDrop(false);
    }

    async function handleCreatePledge() {
        const hasPledgor = pledgeMode === "member" ? !!pledgeForm.memberId : !!pledgeForm.guestName;
        if (!selectedCampaignId || !hasPledgor || !pledgeForm.totalAmount || !pledgeForm.startDate) return;
        setActionError(null);
        try {
            await createPledge(selectedCampaignId, pledgeForm);
            setShowPledgeForm(false);
            resetPledgeForm();
        } catch (e: unknown) { setActionError((e as Error).message); }
    }

    async function handleStatusChange(pledge: Pledge, status: PledgeStatus) {
        setActionError(null);
        try { await updatePledgeStatus(pledge.id, status); }
        catch (e: unknown) { setActionError((e as Error).message); }
    }

    async function handleToggleCampaignActive(campaignId: string, isActive: boolean) {
        setActionError(null);
        try { await updateCampaignActive(campaignId, isActive); }
        catch (e: unknown) { setActionError((e as Error).message); }
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

                            <DismissibleError message={error} />
                            <DismissibleError message={actionError} />
                            <DismissibleError message={contributionActionError} />

            <div className="flex bg-[#F4F1EA] p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveView("campaigns")}
                    className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${activeView === "campaigns" ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                >
                    Campaigns
                </button>
                <button
                    onClick={() => setActiveView("contributions")}
                    className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${activeView === "contributions" ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                >
                    Contributions
                </button>
            </div>

            {activeView === "campaigns" && (
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
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <p className="text-xs font-semibold text-[#121212] truncate">{c.name}</p>
                                    {!c.isActive && (
                                        <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded bg-[#F4F1EA] text-[#8A817C] shrink-0">Inactive</span>
                                    )}
                                </div>
                                <ChevronDown className={`w-3.5 h-3.5 text-[#8A817C] shrink-0 transition-transform ${selectedCampaignId === c.id ? "rotate-180" : ""}`} />
                            </div>
                            <p className="text-[10px] font-mono text-[#8A817C] mt-1">Target: {formatCurrency(c.targetAmount)}</p>
                            <div className="mt-2 h-1.5 bg-[#F4F1EA] rounded-full overflow-hidden relative">
                                <div className="h-full bg-green-200 rounded-full absolute inset-y-0 left-0" style={{ width: `${Math.min(((c.totalPledged ?? 0) / c.targetAmount) * 100, 100)}%` }} />
                                <div className="h-full bg-green-600 rounded-full absolute inset-y-0 left-0" style={{ width: `${Math.min(((c.totalPaid ?? 0) / c.targetAmount) * 100, 100)}%` }} />
                            </div>
                            <div className="flex justify-between mt-1">
                                <p className="text-[9px] text-[#8A817C] font-mono">{c.pledgeCount ?? 0} pledges</p>
                                <p className="text-[9px] font-mono text-green-700">{formatCurrency(c.totalPledged ?? 0)} pledged</p>
                            </div>
                            <div className="flex justify-between">
                                <p className="text-[9px] text-[#8A817C] font-mono">&nbsp;</p>
                                <p className="text-[9px] font-mono text-green-800 font-semibold">{formatCurrency(c.totalPaid ?? 0)} paid</p>
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
                            <div>
                                <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Name *</label>
                                <input type="text" value={campaignForm.name} onChange={(e) => setCampaignForm((f) => ({ ...f, name: e.target.value }))}
                                    className="w-full h-8 px-2 border border-[#121212]/10 text-[10px] text-[#121212] bg-[#F4F1EA]/30 rounded-lg focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Fund *</label>
                                <select value={campaignForm.fundId} onChange={(e) => setCampaignForm((f) => ({ ...f, fundId: e.target.value }))}
                                    className="w-full h-8 px-2 border border-[#121212]/10 text-[10px] text-[#121212] bg-[#F4F1EA]/30 rounded-lg focus:outline-none">
                                    <option value="">Select fund</option>
                                    {funds.filter((f) => f.isActive).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Target Amount *</label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-[#8A817C] select-none pointer-events-none">{currencySymbol}</span>
                                    <input type="text" inputMode="decimal" value={formatCurrencyInput(campaignForm.targetAmount)} placeholder="0"
                                        onChange={(e) => setCampaignForm((f) => ({ ...f, targetAmount: parseCurrencyInput(e.target.value) }))}
                                        className="w-full h-8 pl-5 pr-2 border border-[#121212]/10 text-[10px] font-mono text-[#121212] bg-[#F4F1EA]/30 rounded-lg focus:outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Start Date *</label>
                                    <input type="date" value={campaignForm.startDate} onChange={(e) => setCampaignForm((f) => ({ ...f, startDate: e.target.value }))}
                                        className="w-full h-8 px-2 border border-[#121212]/10 text-[10px] text-[#121212] bg-[#F4F1EA]/30 rounded-lg focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">End Date *</label>
                                    <input type="date" value={campaignForm.endDate} onChange={(e) => setCampaignForm((f) => ({ ...f, endDate: e.target.value }))}
                                        className="w-full h-8 px-2 border border-[#121212]/10 text-[10px] text-[#121212] bg-[#F4F1EA]/30 rounded-lg focus:outline-none" />
                                </div>
                            </div>
                            <button onClick={handleCreateCampaign} disabled={isSubmitting || !campaignForm.name || !campaignForm.fundId || !campaignForm.targetAmount || !campaignForm.startDate || !campaignForm.endDate}
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
                                    <div className="flex items-center space-x-2">
                                        <p className="text-sm font-semibold text-[#121212]">{selectedCampaign.name}</p>
                                        <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${selectedCampaign.isActive ? "bg-green-100 text-green-800" : "bg-[#F4F1EA] text-[#8A817C]"}`}>
                                            {selectedCampaign.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-[#8A817C] font-mono mt-0.5">
                                        {formatCurrency(selectedCampaign.totalPledged ?? 0)} pledged of {formatCurrency(selectedCampaign.targetAmount)} target &bull; {selectedCampaign.pledgeCount ?? 0} pledges &bull; <span className="text-green-700 font-semibold">{formatCurrency(selectedCampaign.totalPaid ?? 0)} actually paid</span>
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handleToggleCampaignActive(selectedCampaign.id, !selectedCampaign.isActive)}
                                        disabled={isSubmitting}
                                        className="h-9 px-3 border border-[#121212]/10 text-[10px] font-semibold uppercase tracking-widest text-[#121212] hover:bg-[#F4F1EA]/40 disabled:opacity-40 rounded-xl"
                                    >
                                        {selectedCampaign.isActive ? "Deactivate" : "Reactivate"}
                                    </button>
                                    <button onClick={() => setShowPledgeForm((v) => !v)} className="h-9 px-3 border border-[#121212]/10 text-[10px] font-semibold uppercase tracking-widest text-[#121212] hover:bg-[#F4F1EA]/40 rounded-xl flex items-center space-x-1">
                                        <Plus className="w-3 h-3" /><span>Add Pledge</span>
                                    </button>
                                </div>
                            </div>

                            {showPledgeForm && (
                                <div className="bg-white border border-[#121212]/10 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#121212]">Add Pledge</p>
                                        <button onClick={() => setShowPledgeForm(false)}><X className="w-3.5 h-3.5 text-[#8A817C]" /></button>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-1">
                                            {(["member", "guest"] as const).map((mode) => (
                                                <button key={mode}
                                                    onClick={() => { setPledgeMode(mode); setPledgeForm((f) => ({ ...f, memberId: undefined, guestName: undefined })); setSelectedMember(null); setMemberSearch(""); }}
                                                    className={`h-6 px-3 rounded-full text-[9px] font-semibold uppercase tracking-widest transition-colors ${pledgeMode === mode ? "bg-[#121212] text-white" : "bg-[#F4F1EA] text-[#8A817C] hover:bg-[#F4F1EA]/80"}`}>
                                                    {mode === "member" ? "Member" : "Guest"}
                                                </button>
                                            ))}
                                        </div>
                                        {pledgeMode === "member" ? (
                                            <div>
                                                <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Member *</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder="Type to search…"
                                                        value={selectedMember ? selectedMember.name : memberSearch}
                                                        onFocus={() => { if (selectedMember) { setSelectedMember(null); setPledgeForm((f) => ({ ...f, memberId: undefined })); } setShowMemberDrop(true); }}
                                                        onChange={(e) => { setMemberSearch(e.target.value); setShowMemberDrop(true); }}
                                                        onBlur={() => setTimeout(() => setShowMemberDrop(false), 150)}
                                                        className="w-full h-8 px-2 pr-6 border border-[#121212]/10 text-[10px] text-[#121212] bg-[#F4F1EA]/30 rounded-lg focus:outline-none"
                                                    />
                                                    {selectedMember && (
                                                        <button onMouseDown={() => { setSelectedMember(null); setMemberSearch(""); setPledgeForm((f) => ({ ...f, memberId: undefined })); }}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8A817C] hover:text-[#121212]">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    {showMemberDrop && memberResults.length > 0 && (
                                                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-[#121212]/10 rounded-lg shadow-md max-h-36 overflow-y-auto">
                                                            {memberResults.map((m) => (
                                                                <button key={m.id}
                                                                    onMouseDown={() => { const name = `${m.firstname} ${m.lastname}`; setSelectedMember({ id: m.id, name }); setPledgeForm((f) => ({ ...f, memberId: m.id })); setMemberSearch(""); setShowMemberDrop(false); }}
                                                                    className="w-full text-left px-3 py-2 text-[10px] text-[#121212] hover:bg-[#F4F1EA]/60">
                                                                    {m.firstname} {m.lastname}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Guest Name *</label>
                                                <input value={pledgeForm.guestName ?? ""} onChange={(e) => setPledgeForm((f) => ({ ...f, guestName: e.target.value || undefined }))}
                                                    placeholder="Full name"
                                                    className="w-full h-8 px-2 border border-[#121212]/10 text-[10px] text-[#121212] bg-[#F4F1EA]/30 rounded-lg focus:outline-none" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Amount *</label>
                                            <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-[#8A817C] select-none pointer-events-none">{currencySymbol}</span>
                                                <input type="text" inputMode="decimal" value={formatCurrencyInput(pledgeForm.totalAmount)} placeholder="0"
                                                    onChange={(e) => setPledgeForm((f) => ({ ...f, totalAmount: parseCurrencyInput(e.target.value) }))}
                                                    className="w-full h-8 pl-5 pr-2 border border-[#121212]/10 text-[10px] font-mono text-[#121212] bg-[#F4F1EA]/30 rounded-lg focus:outline-none" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">Frequency *</label>
                                            <select value={pledgeForm.frequency} onChange={(e) => setPledgeForm((f) => ({ ...f, frequency: e.target.value as PledgeFrequency }))}
                                                className="w-full h-8 px-2 border border-[#121212]/10 text-[10px] text-[#121212] bg-[#F4F1EA]/30 rounded-lg focus:outline-none">
                                                {(Object.entries(FREQ_LABELS) as [PledgeFrequency, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#8A817C] mb-0.5">{pledgeForm.frequency === "ONE_OFF" ? "Day to Redeem *" : "Start Date *"}</label>
                                            <input type="date" value={pledgeForm.startDate} onChange={(e) => setPledgeForm((f) => ({ ...f, startDate: e.target.value }))}
                                                className="w-full h-8 px-2 border border-[#121212]/10 text-[10px] text-[#121212] bg-[#F4F1EA]/30 rounded-lg focus:outline-none" />
                                        </div>
                                    </div>
                                    <button onClick={handleCreatePledge} disabled={isSubmitting || !(pledgeMode === "member" ? pledgeForm.memberId : pledgeForm.guestName) || !pledgeForm.totalAmount || !pledgeForm.startDate}
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
                                                    <td className="p-4 text-xs text-[#121212]">
                                                        {p.member ? `${p.member.firstname} ${p.member.lastname}` : (p.guestName ?? "—")}
                                                    </td>
                                                    <td className="p-4 font-mono text-xs font-medium text-[#121212]">{formatCurrency(Number(p.totalAmount))}</td>
                                                    <td className="p-4 font-mono text-xs font-medium text-green-700">{formatCurrency(p.amountPaid ?? 0)}</td>
                                                    <td className="p-4 text-xs text-[#8A817C]">{FREQ_LABELS[p.frequency]}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                                                    </td>
                                                    <td className="p-4">
                                                        {p.status === "ACTIVE" && (
                                                            pendingStatus?.pledge.id === p.id ? (
                                                                <div className="flex items-center space-x-1">
                                                                    <span className="text-[9px] text-[#8A817C]">Sure?</span>
                                                                    <button onClick={() => { handleStatusChange(pendingStatus.pledge, pendingStatus.status); setPendingStatus(null); }}
                                                                        className={`text-[9px] px-2 py-0.5 rounded border ${pendingStatus.status === "COMPLETED" ? "text-green-700 border-green-300 hover:bg-green-50" : "text-red-700 border-red-300 hover:bg-red-50"}`}>
                                                                        Yes
                                                                    </button>
                                                                    <button onClick={() => setPendingStatus(null)} className="text-[9px] text-[#8A817C] border border-[#121212]/10 px-2 py-0.5 rounded hover:bg-[#F4F1EA]/60">No</button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex space-x-1">
                                                                    <button onClick={() => setPendingStatus({ pledge: p, status: "COMPLETED" })} className="text-[9px] text-green-700 border border-green-300 px-2 py-0.5 rounded hover:bg-green-50">Complete</button>
                                                                    <button onClick={() => setPendingStatus({ pledge: p, status: "CANCELLED" })} className="text-[9px] text-red-700 border border-red-300 px-2 py-0.5 rounded hover:bg-red-50">Cancel</button>
                                                                </div>
                                                            )
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
            )}

            {activeView === "contributions" && (
                <div className="space-y-4">
                    <div className="flex items-center space-x-1">
                        {(["", "PENDING", "CONFIRMED", "DECLINED"] as const).map((s) => (
                            <button key={s || "ALL"}
                                onClick={() => setContributionStatusFilter(s)}
                                className={`h-7 px-3 rounded-full text-[10px] font-semibold uppercase tracking-widest transition-colors ${contributionStatusFilter === s ? "bg-[#121212] text-white" : "bg-[#F4F1EA] text-[#8A817C] hover:bg-[#F4F1EA]/80"}`}>
                                {s || "All"}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white border border-[#121212]/10 rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["Member", "Campaign", "Amount", "Payment Date", "Status", ""].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5">
                                {isContributionsLoading ? Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} cols={6} />) :
                                    contributions.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-xs text-[#8A817C] font-light">No pledge contributions match this filter.</td></tr>
                                    ) : contributions.map((c) => (
                                        <tr key={c.id} className="hover:bg-[#F4F1EA]/20 transition-colors">
                                            <td className="p-4 text-xs text-[#121212]">
                                                {c.pledge.member ? `${c.pledge.member.firstname} ${c.pledge.member.lastname}` : "—"}
                                            </td>
                                            <td className="p-4 text-xs text-[#8A817C]">{c.pledge.campaign.name}</td>
                                            <td className="p-4 font-mono text-xs font-medium text-[#121212]">{formatCurrency(c.amount)}</td>
                                            <td className="p-4 text-xs text-[#8A817C] font-mono">{c.paymentDate}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${CONTRIBUTION_STATUS_COLORS[c.status]}`}>{c.status}</span>
                                            </td>
                                            <td className="p-4">
                                                {c.status === "PENDING" && (
                                                    pendingContributionAction?.contribution.id === c.id ? (
                                                        pendingContributionAction.action === "confirm" ? (
                                                            <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-2 py-1.5">
                                                                <span className="text-[10px] font-semibold text-green-800">Confirm this payment?</span>
                                                                <button onClick={() => handleConfirmContribution(c)} className="text-[10px] font-bold px-2.5 py-1 rounded bg-green-600 text-white hover:bg-green-700">Yes, Confirm</button>
                                                                <button onClick={() => setPendingContributionAction(null)} className="text-[10px] text-[#8A817C] border border-[#121212]/10 px-2 py-1 rounded hover:bg-white">Cancel</button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center space-x-1">
                                                                <input
                                                                    type="text"
                                                                    autoFocus
                                                                    value={declineNote}
                                                                    onChange={(e) => setDeclineNote(e.target.value)}
                                                                    placeholder="Reason…"
                                                                    className="h-6 px-2 border border-[#121212]/10 text-[9px] text-[#121212] bg-[#F4F1EA]/30 rounded-md focus:outline-none w-32"
                                                                />
                                                                <button onClick={() => handleDeclineContribution(c)} disabled={!declineNote.trim()} className="text-[9px] px-2 py-0.5 rounded border text-red-700 border-red-300 hover:bg-red-50 disabled:opacity-40">Decline</button>
                                                                <button onClick={() => { setPendingContributionAction(null); setDeclineNote(""); }} className="text-[9px] text-[#8A817C] border border-[#121212]/10 px-2 py-0.5 rounded hover:bg-[#F4F1EA]/60">Cancel</button>
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="flex space-x-1">
                                                            <button onClick={() => setPendingContributionAction({ contribution: c, action: "confirm" })} className="text-[9px] text-green-700 border border-green-300 px-2 py-0.5 rounded hover:bg-green-50">Confirm</button>
                                                            <button onClick={() => setPendingContributionAction({ contribution: c, action: "decline" })} className="text-[9px] text-red-700 border border-red-300 px-2 py-0.5 rounded hover:bg-red-50">Decline</button>
                                                        </div>
                                                    )
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>

                    <PaginationBar
                        pagination={contributionsPagination}
                        onPage={(page) => fetchContributions({ status: contributionStatusFilter || undefined, page })}
                        isLoading={isContributionsLoading}
                        label="contributions"
                    />
                </div>
            )}
        </div>
    );
}, { requiredPermission: 'finance:read' });
