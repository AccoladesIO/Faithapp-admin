"use client";

import React, { useEffect, useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { Plus, X, Users, Ban, RefreshCw } from "lucide-react";
import {
    useVolunteerAdmin,
    VolunteerOpportunity,
    VolunteerOpportunityPayload,
    VolunteerSignupRow,
} from "@/hooks/use-volunteer";
import { useDepartments } from "@/hooks/use-departments";
import { DismissibleError } from "@/components/ui/dismissible-error";
import { PaginationBar } from "@/components/ui/pagination-bar";

function fmtDateTime(iso: string): string {
    return new Date(iso).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
}

function StatusBadge({ status }: Readonly<{ status: VolunteerOpportunity["status"] }>) {
    const map: Record<VolunteerOpportunity["status"], string> = {
        OPEN: "bg-green-50 text-green-700 border-green-200",
        CLOSED: "bg-[#F4F1EA] text-[#8A817C] border-[#121212]/10",
        CANCELLED: "bg-red-50 text-red-700 border-red-200",
    };
    return (
        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${map[status]}`}>
            {status}
        </span>
    );
}

const EMPTY_DRAFT: VolunteerOpportunityPayload = { title: "", description: "", departmentId: "", date: "", capacity: undefined };

function OpportunityFormPanel({ onClose, onSave, isSubmitting }: Readonly<{
    onClose: () => void;
    onSave: (payload: VolunteerOpportunityPayload) => Promise<VolunteerOpportunity>;
    isSubmitting: boolean;
}>) {
    const { departments, fetchDepartments } = useDepartments();
    const [draft, setDraft] = useState<VolunteerOpportunityPayload>(EMPTY_DRAFT);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

    const handleSubmit = async () => {
        setFormError(null);
        if (!draft.title.trim() || !draft.date) {
            setFormError("Title and date are required.");
            return;
        }
        try {
            await onSave({
                title: draft.title.trim(),
                description: draft.description?.trim() || undefined,
                departmentId: draft.departmentId || undefined,
                date: new Date(draft.date).toISOString(),
                capacity: draft.capacity || undefined,
            });
            onClose();
        } catch {
            // error surfaced via the hook's own error state
        }
    };

    return (
        <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl space-y-4 relative">
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="pr-8">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Volunteering</div>
                <h2 className="text-xl font-light tracking-tight text-[#121212]">New Opportunity</h2>
            </div>

            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Title</label>
                <input
                    type="text"
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    placeholder="e.g. Ushering Team — Sunday Service"
                />
            </div>

            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Description (optional)</label>
                <textarea
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                    rows={3}
                    className="w-full p-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Date &amp; Time</label>
                    <input
                        type="datetime-local"
                        value={draft.date}
                        onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                        className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Capacity (optional)</label>
                    <input
                        type="number"
                        min={1}
                        value={draft.capacity ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, capacity: e.target.value ? Number(e.target.value) : undefined }))}
                        className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                        placeholder="Unlimited"
                    />
                </div>
            </div>

            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Department (optional, for your own reporting)</label>
                <select
                    value={draft.departmentId}
                    onChange={(e) => setDraft((d) => ({ ...d, departmentId: e.target.value }))}
                    className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                >
                    <option value="">No department</option>
                    {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
            </div>

            {formError && (
                <div className="p-2.5 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs">{formError}</div>
            )}

            <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors disabled:opacity-50"
            >
                {isSubmitting ? "Creating…" : "Create Opportunity"}
            </button>
        </div>
    );
}

function RosterPanel({ opportunity, roster, isLoading, error, onClose }: Readonly<{
    opportunity: VolunteerOpportunity;
    roster: VolunteerSignupRow[];
    isLoading: boolean;
    error: string | null;
    onClose: () => void;
}>) {
    return (
        <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl space-y-4 relative">
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="pr-8">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Roster</div>
                <h2 className="text-xl font-light tracking-tight text-[#121212]">{opportunity.title}</h2>
            </div>

            {isLoading ? (
                <div className="space-y-2 animate-pulse">
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-[#F4F1EA] rounded-lg" />)}
                </div>
            ) : error ? (
                <p className="text-xs text-red-600 text-center py-6">{error}</p>
            ) : roster.length === 0 ? (
                <p className="text-xs text-[#8A817C] text-center py-6">No sign-ups yet.</p>
            ) : (
                <div className="space-y-1.5">
                    {roster.map((r) => (
                        <div key={r.id} className="flex items-center justify-between bg-[#F4F1EA]/50 rounded-lg px-3 py-2 text-xs">
                            <span className="text-[#121212] font-medium">{r.member.firstname} {r.member.lastname}</span>
                            <span className="text-[#8A817C] font-mono">{fmtDateTime(r.createdAt)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

type PanelMode = "create" | "roster" | null;

const VolunteeringPage = withAuth(function VolunteeringPage() {
    const {
        opportunities, pagination, isLoading, isSubmitting, error,
        fetchOpportunities, createOpportunity, cancelOpportunity, fetchRoster,
    } = useVolunteerAdmin();

    const [panelMode, setPanelMode] = useState<PanelMode>(null);
    const [rosterFor, setRosterFor] = useState<VolunteerOpportunity | null>(null);
    const [roster, setRoster] = useState<VolunteerSignupRow[]>([]);
    const [rosterLoading, setRosterLoading] = useState(false);
    const [rosterError, setRosterError] = useState<string | null>(null);

    useEffect(() => { fetchOpportunities(1); }, [fetchOpportunities]);

    const closePanel = () => {
        setPanelMode(null);
        setRosterFor(null);
    };

    const openRoster = async (o: VolunteerOpportunity) => {
        setPanelMode("roster");
        setRosterFor(o);
        setRosterLoading(true);
        setRosterError(null);
        try {
            setRoster(await fetchRoster(o.id));
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            setRosterError(e?.response?.data?.message || e?.message || "Failed to load roster.");
        } finally {
            setRosterLoading(false);
        }
    };

    const panelOpen = panelMode !== null;

    return (
        <div className="space-y-10 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Volunteering</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Open serving opportunities members can sign up for
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setPanelMode("create")}
                        className="flex items-center gap-2 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors w-fit"
                    >
                        <Plus className="w-3.5 h-3.5" /> New Opportunity
                    </button>
                    <button
                        onClick={() => fetchOpportunities(1)}
                        disabled={isLoading}
                        className="p-2 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-40"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            <DismissibleError message={error} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className={panelOpen ? "lg:col-span-7" : "lg:col-span-12"}>
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Title</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Department</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Date</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Signed Up</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Status</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        Array.from({ length: 4 }).map((_, i) => (
                                            <tr key={i} className="border-b border-[#121212]/5 animate-pulse">
                                                {Array.from({ length: 6 }).map((__, j) => (
                                                    <td key={j} className="p-4"><div className="h-3 bg-[#F4F1EA] rounded w-3/4" /></td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : opportunities.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-xs text-[#8A817C]">No volunteer opportunities yet.</td></tr>
                                    ) : (
                                        opportunities.map((o) => (
                                            <tr
                                                key={o.id}
                                                onClick={() => openRoster(o)}
                                                className={`transition-colors cursor-pointer ${rosterFor?.id === o.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
                                            >
                                                <td className="p-4 text-sm text-[#121212] font-medium">{o.title}</td>
                                                <td className="p-4 text-xs text-[#8A817C]">{o.department?.name ?? "—"}</td>
                                                <td className="p-4 text-xs text-[#8A817C]">{fmtDateTime(o.date)}</td>
                                                <td className="p-4 text-xs text-[#121212] font-mono">
                                                    {o.confirmedCount}{o.capacity ? ` / ${o.capacity}` : ""}
                                                </td>
                                                <td className="p-4"><StatusBadge status={o.status} /></td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openRoster(o); }}
                                                            className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md transition-colors"
                                                            title="View roster"
                                                        >
                                                            <Users className="w-3.5 h-3.5" />
                                                        </button>
                                                        {o.status === "OPEN" && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); cancelOpportunity(o.id); }}
                                                                className="p-1.5 text-[#8A817C] hover:text-red-600 border border-[#121212]/5 hover:border-red-200 rounded-md transition-colors"
                                                                title="Cancel opportunity"
                                                            >
                                                                <Ban className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {pagination && (
                            <PaginationBar
                                pagination={pagination}
                                onPage={(p) => fetchOpportunities(p)}
                                isLoading={isLoading}
                                label="opportunities"
                            />
                        )}
                    </div>
                </div>

                {panelMode === "create" && (
                    <div className="lg:col-span-5">
                        <OpportunityFormPanel onClose={closePanel} onSave={createOpportunity} isSubmitting={isSubmitting} />
                    </div>
                )}
                {panelMode === "roster" && rosterFor && (
                    <div className="lg:col-span-5">
                        <RosterPanel
                            opportunity={rosterFor}
                            roster={roster}
                            isLoading={rosterLoading}
                            error={rosterError}
                            onClose={closePanel}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}, { requiredPermission: "volunteer:read" });

export default VolunteeringPage;
