"use client";

import React, { useState, useEffect } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    RefreshCw, X, MousePointerClick, HeartHandshake, Megaphone, Lock, Baby,
    History, ChevronDown, ChevronUp,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
    usePrayerRequestsAdmin,
    PrayerRequestRecord,
    PrayerRequestStatus,
    PregnancyCaseStatus,
    PregnancyCaseRecord,
    PregnancyVisitRecord,
} from "@/hooks/use-prayer-requests";
import { DismissibleError } from "@/components/ui/dismissible-error";

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const STATUS_STYLES: Record<PrayerRequestStatus, string> = {
    OPEN: "bg-amber-50 border-amber-100 text-amber-700",
    PRAYED_FOR: "bg-blue-50 border-blue-100 text-blue-700",
    ANSWERED: "bg-green-50 border-green-100 text-green-700",
};

const STATUS_LABELS: Record<PrayerRequestStatus, string> = {
    OPEN: "Open",
    PRAYED_FOR: "Prayed For",
    ANSWERED: "Answered",
};

const PREGNANCY_STATUS_LABELS: Record<PregnancyCaseStatus, string> = {
    ACTIVE: "Active",
    DELIVERED: "Delivered",
    DISCONTINUED: "Discontinued",
};

const PREGNANCY_STATUS_STYLES: Record<PregnancyCaseStatus, string> = {
    ACTIVE: "bg-amber-50 border-amber-100 text-amber-700",
    DELIVERED: "bg-green-50 border-green-100 text-green-700",
    DISCONTINUED: "bg-[#F4F1EA] border-[#121212]/5 text-[#8A817C]",
};

const formatDateOnly = (iso: string) =>
    new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function StatusBadge({ status }: { status: PrayerRequestStatus }) {
    return (
        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${STATUS_STYLES[status]}`}>
            {STATUS_LABELS[status]}
        </span>
    );
}

function PregnancyCaseRow({
    pregnancyCase: c,
    isSubmitting,
    onStatusChange,
    fetchVisitHistory,
}: Readonly<{
    pregnancyCase: PregnancyCaseRecord;
    isSubmitting: boolean;
    onStatusChange: (id: string, status: PregnancyCaseStatus) => void;
    fetchVisitHistory: (id: string, page?: number) => Promise<{ visits: PregnancyVisitRecord[]; pagination: unknown }>;
}>) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [visits, setVisits] = useState<PregnancyVisitRecord[] | null>(null);

    const toggle = async () => {
        if (open) { setOpen(false); return; }
        setOpen(true);
        if (visits === null) {
            setLoading(true);
            const { visits: fetched } = await fetchVisitHistory(c.id, 1);
            setVisits(fetched);
            setLoading(false);
        }
    };

    return (
        <>
            <tr>
                <td className="p-4 text-sm font-medium text-[#121212]">
                    {c.name}
                    <div className="text-[10px] font-mono text-[#8A817C] mt-0.5">Added by {c.createdByName}</div>
                </td>
                <td className="p-4 text-xs font-mono text-[#8A817C] hidden sm:table-cell">{formatDateOnly(c.edd)}</td>
                <td className="p-4 text-xs font-mono text-[#8A817C] hidden sm:table-cell">{c.lastPrayedAt ? formatDate(c.lastPrayedAt) : "Never"}</td>
                <td className="p-4">
                    <select
                        value={c.status}
                        onChange={(e) => onStatusChange(c.id, e.target.value as PregnancyCaseStatus)}
                        disabled={isSubmitting}
                        className={`h-7 px-2 border text-[10px] font-bold uppercase tracking-wider rounded-md appearance-none disabled:opacity-50 ${PREGNANCY_STATUS_STYLES[c.status]}`}
                    >
                        {(["ACTIVE", "DELIVERED", "DISCONTINUED"] as const).map((s) => (
                            <option key={s} value={s}>{PREGNANCY_STATUS_LABELS[s]}</option>
                        ))}
                    </select>
                </td>
                <td className="p-4">
                    <button
                        type="button"
                        onClick={toggle}
                        className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#8A817C] hover:text-[#121212]"
                    >
                        <History className="w-3 h-3" />
                        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                </td>
            </tr>
            {open && (
                <tr>
                    <td colSpan={5} className="p-4 bg-[#F4F1EA]/20">
                        {loading ? (
                            <p className="text-[11px] text-[#8A817C]">Loading…</p>
                        ) : visits && visits.length === 0 ? (
                            <p className="text-[11px] text-[#8A817C]">No visits logged yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {visits?.map((v) => (
                                    <div key={v.id} className="text-[11px]">
                                        <span className="text-[#8A817C] font-mono">{formatDate(v.visitedAt)} · {v.loggedByName}</span>
                                        {v.note && <p className="text-[#121212] font-light">{v.note}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </td>
                </tr>
            )}
        </>
    );
}

type Tab = "requests" | "testimonies" | "pregnancy";

const PrayerRequestsAdminPage = () => {
    const {
        requests, requestsPagination, testimonies, testimoniesPagination,
        pregnancyCases, pregnancyCasesPagination,
        isLoading, isSubmitting, error, fetchRequests, fetchTestimonies,
        fetchPregnancyCases, updateStatus, updatePregnancyCaseStatus,
        fetchPregnancyVisitHistory,
    } = usePrayerRequestsAdmin();

    const [tab, setTab] = useState<Tab>("requests");
    const [statusFilter, setStatusFilter] = useState<PrayerRequestStatus | "">("");
    const [selected, setSelected] = useState<PrayerRequestRecord | null>(null);

    useEffect(() => {
        fetchRequests(1, statusFilter || undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    useEffect(() => {
        if (tab === "testimonies") fetchTestimonies(1);
        if (tab === "pregnancy") fetchPregnancyCases(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    const handlePregnancyStatusChange = async (id: string, status: PregnancyCaseStatus) => {
        try {
            await updatePregnancyCaseStatus(id, status);
        } catch { /* surfaced via hook */ }
    };

    const panelOpen = selected !== null;

    const handleStatusChange = async (status: PrayerRequestStatus) => {
        if (!selected) return;
        try {
            const updated = await updateStatus(selected.id, status);
            setSelected(updated);
        } catch { /* surfaced via hook */ }
    };

    return (
        <div className="space-y-8 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                        Prayer Requests
                    </h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1 flex items-center gap-1.5">
                        <Lock className="w-3 h-3" />
                        Private — visible only to the Prayer team and pastors
                    </p>
                </div>
                <button
                    onClick={() => {
                        if (tab === "requests") fetchRequests(requestsPagination?.page ?? 1, statusFilter || undefined);
                        else if (tab === "testimonies") fetchTestimonies(testimoniesPagination?.page ?? 1);
                        else fetchPregnancyCases(pregnancyCasesPagination?.page ?? 1);
                    }}
                    disabled={isLoading}
                    className="p-2 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-40"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                </button>
            </div>

            <DismissibleError message={error} />

            <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl w-fit gap-0.5">
                <button
                    onClick={() => { setTab("requests"); setSelected(null); }}
                    className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${tab === "requests" ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                >
                    <HeartHandshake className="w-3.5 h-3.5" />
                    Requests
                </button>
                <button
                    onClick={() => { setTab("testimonies"); setSelected(null); }}
                    className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${tab === "testimonies" ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                >
                    <Megaphone className="w-3.5 h-3.5" />
                    Testimonies
                </button>
                <button
                    onClick={() => { setTab("pregnancy"); setSelected(null); }}
                    className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${tab === "pregnancy" ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                >
                    <Baby className="w-3.5 h-3.5" />
                    Pregnancy
                </button>
            </div>

            {tab === "requests" && (
                <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl w-fit gap-0.5">
                    {(["", "OPEN", "PRAYED_FOR", "ANSWERED"] as const).map((s) => (
                        <button
                            key={s || "ALL"}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${statusFilter === s ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                        >
                            {s ? STATUS_LABELS[s] : "All"}
                        </button>
                    ))}
                </div>
            )}

            {tab === "requests" ? (
                <div className={`grid grid-cols-1 gap-6 ${panelOpen ? "lg:grid-cols-12" : ""}`}>
                    <div className={`${panelOpen ? "lg:col-span-7" : ""} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Submitted By</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden sm:table-cell">Date</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                    {isLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={3} className="p-4"><div className="h-3 bg-[#F4F1EA] rounded w-3/4" /></td>
                                            </tr>
                                        ))
                                    ) : requests.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                                No prayer requests found.
                                            </td>
                                        </tr>
                                    ) : (
                                        requests.map((r) => (
                                            <tr
                                                key={r.id}
                                                onClick={() => setSelected(r)}
                                                className={`cursor-pointer transition-colors ${selected?.id === r.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
                                            >
                                                <td className="p-4 text-sm font-medium text-[#121212]">{r.submittedByName}</td>
                                                <td className="p-4 text-xs font-mono text-[#8A817C] hidden sm:table-cell">{formatDate(r.createdAt)}</td>
                                                <td className="p-4"><StatusBadge status={r.status} /></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <PaginationBar
                            pagination={requestsPagination}
                            onPage={(p) => fetchRequests(p, statusFilter || undefined)}
                            isLoading={isLoading}
                            label="requests"
                        />

                        {!panelOpen && (
                            <div className="p-4 border-t border-[#121212]/5 text-center text-[11px] text-[#8A817C] font-light flex items-center justify-center gap-2">
                                <MousePointerClick className="w-3.5 h-3.5" />
                                Click any row to view details and update status
                            </div>
                        )}
                    </div>

                    {panelOpen && selected && (
                        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative flex flex-col">
                            <div className="p-5 border-b border-[#121212]/5 flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Request Detail</div>
                                    <h2 className="text-lg font-light tracking-tight text-[#121212]">{selected.submittedByName}</h2>
                                    <span className="text-[11px] font-mono text-[#8A817C]">{formatDate(selected.createdAt)}</span>
                                </div>
                                <button
                                    onClick={() => setSelected(null)}
                                    className="shrink-0 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                                <div className="p-3 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-lg">
                                    <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Request</span>
                                    <p className="text-[#121212] font-light text-xs whitespace-pre-wrap">{selected.content}</p>
                                </div>

                                <div className="border-t border-[#121212]/5 pt-4 space-y-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212]">Status</h3>
                                    <div className="flex gap-2">
                                        {(["OPEN", "PRAYED_FOR", "ANSWERED"] as const).map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => handleStatusChange(s)}
                                                disabled={isSubmitting || selected.status === s}
                                                className={`flex-1 h-9 text-[10px] font-semibold uppercase tracking-widest rounded-lg border transition-colors disabled:opacity-50 ${
                                                    selected.status === s
                                                        ? "bg-[#121212] text-white border-[#121212]"
                                                        : "border-[#121212]/10 text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA]"
                                                }`}
                                            >
                                                {STATUS_LABELS[s]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : tab === "testimonies" ? (
                <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Submitted By</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Testimony</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden sm:table-cell">Date</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Visibility</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={4} className="p-4"><div className="h-3 bg-[#F4F1EA] rounded w-3/4" /></td>
                                        </tr>
                                    ))
                                ) : testimonies.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                            No testimonies found.
                                        </td>
                                    </tr>
                                ) : (
                                    testimonies.map((t) => (
                                        <tr key={t.id}>
                                            <td className="p-4 text-sm font-medium text-[#121212]">{t.submittedByName}</td>
                                            <td className="p-4 text-xs text-[#121212] font-light max-w-md truncate">{t.content}</td>
                                            <td className="p-4 text-xs font-mono text-[#8A817C] hidden sm:table-cell">{formatDate(t.createdAt)}</td>
                                            <td className="p-4">
                                                <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${t.isPublic ? "bg-green-50 border-green-100 text-green-700" : "bg-[#F4F1EA] border-[#121212]/5 text-[#8A817C]"}`}>
                                                    {t.isPublic ? "Public" : "Private"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <PaginationBar
                        pagination={testimoniesPagination}
                        onPage={(p) => fetchTestimonies(p)}
                        isLoading={isLoading}
                        label="testimonies"
                    />
                </div>
            ) : (
                <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Name</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden sm:table-cell">EDD</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden sm:table-cell">Last Prayed</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Status</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="p-4"><div className="h-3 bg-[#F4F1EA] rounded w-3/4" /></td>
                                        </tr>
                                    ))
                                ) : pregnancyCases.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                            No pregnancy prayer cases found.
                                        </td>
                                    </tr>
                                ) : (
                                    pregnancyCases.map((c) => (
                                        <PregnancyCaseRow
                                            key={c.id}
                                            pregnancyCase={c}
                                            isSubmitting={isSubmitting}
                                            onStatusChange={handlePregnancyStatusChange}
                                            fetchVisitHistory={fetchPregnancyVisitHistory}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <PaginationBar
                        pagination={pregnancyCasesPagination}
                        onPage={(p) => fetchPregnancyCases(p)}
                        isLoading={isLoading}
                        label="pregnancy cases"
                    />
                </div>
            )}
        </div>
    );
};

export default withAuth(PrayerRequestsAdminPage, { requiredPermission: 'prayer:read' });
