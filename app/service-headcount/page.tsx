"use client";

import React, { useState, useEffect, useMemo } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    Plus, Pencil, X,
    BarChart2, List, RefreshCw, TrendingUp, Trash2,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { DismissibleError } from "@/components/ui/dismissible-error";
import {
    useServiceHeadcount,
    ServiceHeadcount,
    CreateHeadcountDto,
    ServiceSlotOption,
    HeadcountTrends,
} from "@/hooks/use-service-headcount";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
    });
};

const total = (r: Pick<ServiceHeadcount, "maleAdults" | "femaleAdults" | "teenagers" | "children" | "mobileChurch" | "customGroups">) => {
    const base = r.maleAdults + r.femaleAdults + r.teenagers + r.children + r.mobileChurch;
    const extras = r.customGroups ? Object.values(r.customGroups).reduce((a, b) => a + b, 0) : 0;
    return base + extras;
};

// ─── Skeletons ────────────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
    return (
        <tr className="border-b border-[#121212]/5 animate-pulse">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="p-4">
                    <div className="h-3 bg-[#F4F1EA] rounded w-3/4" />
                </td>
            ))}
        </tr>
    );
}

// ─── Number Input ─────────────────────────────────────────────────────────────

function NumberInput({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
}) {
    return (
        <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                {label}
            </label>
            <input
                type="number"
                min={0}
                value={value}
                onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
            />
        </div>
    );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
    slots: ServiceSlotOption[];
    initial?: ServiceHeadcount | null;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (dto: CreateHeadcountDto) => Promise<void>;
}

function HeadcountPanel({ slots, initial, isSubmitting, onClose, onSubmit }: ModalProps) {
    const [serviceSlotId, setServiceSlotId] = useState(initial?.serviceSlotId ?? "");
    const [maleAdults, setMaleAdults] = useState(initial?.maleAdults ?? 0);
    const [femaleAdults, setFemaleAdults] = useState(initial?.femaleAdults ?? 0);
    const [teenagers, setTeenagers] = useState(initial?.teenagers ?? 0);
    const [children, setChildren] = useState(initial?.children ?? 0);
    const [mobileChurch, setMobileChurch] = useState(initial?.mobileChurch ?? 0);
    const [notes, setNotes] = useState(initial?.notes ?? "");
    const [formError, setFormError] = useState<string | null>(null);

    const initExtra = (): Array<{ label: string; count: number }> => {
        if (!initial?.customGroups) return [];
        return Object.entries(initial.customGroups).map(([label, count]) => ({ label, count }));
    };
    const [extraGroups, setExtraGroups] = useState<Array<{ label: string; count: number }>>(initExtra);

    const extraTotal = extraGroups.reduce((sum, g) => sum + (g.count || 0), 0);
    const computedTotal = maleAdults + femaleAdults + teenagers + children + mobileChurch + extraTotal;

    const addGroup = () => setExtraGroups((prev) => [...prev, { label: "", count: 0 }]);
    const removeGroup = (i: number) => setExtraGroups((prev) => prev.filter((_, idx) => idx !== i));
    const updateGroupLabel = (i: number, label: string) =>
        setExtraGroups((prev) => prev.map((g, idx) => (idx === i ? { ...g, label } : g)));
    const updateGroupCount = (i: number, count: number) =>
        setExtraGroups((prev) => prev.map((g, idx) => (idx === i ? { ...g, count } : g)));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!serviceSlotId) { setFormError("Please select a service slot."); return; }
        const dupLabel = extraGroups.find((g, i) => g.label.trim() && extraGroups.findIndex((x, j) => j !== i && x.label.trim().toLowerCase() === g.label.trim().toLowerCase()) !== -1);
        if (dupLabel) { setFormError(`Duplicate group label: "${dupLabel.label}"`); return; }
        setFormError(null);
        const customGroups = extraGroups.length > 0
            ? Object.fromEntries(extraGroups.filter((g) => g.label.trim()).map((g) => [g.label.trim(), g.count]))
            : undefined;
        await onSubmit({ serviceSlotId, maleAdults, femaleAdults, teenagers, children, mobileChurch, customGroups, notes: notes || undefined });
    };

    return (
        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#121212]/5">
                <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-0.5">Headcount</div>
                    <h2 className="text-base font-light tracking-tight text-[#121212]">
                        {initial ? "Edit Record" : "Record Headcount"}
                    </h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                {formError && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        {formError}
                    </div>
                )}

                <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                        Service Slot <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={serviceSlotId}
                        onChange={(e) => setServiceSlotId(e.target.value)}
                        className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                    >
                        <option value="">— Select service slot —</option>
                        {slots.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.eventName} — {s.name} ({formatDate(s.eventDate)})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Standard groups */}
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-3">Standard Groups</div>
                    <div className="grid grid-cols-2 gap-3">
                        <NumberInput label="Male Adults" value={maleAdults} onChange={setMaleAdults} />
                        <NumberInput label="Female Adults" value={femaleAdults} onChange={setFemaleAdults} />
                        <NumberInput label="Teenagers" value={teenagers} onChange={setTeenagers} />
                        <NumberInput label="Children" value={children} onChange={setChildren} />
                        <NumberInput label="Mobile Church" value={mobileChurch} onChange={setMobileChurch} />
                    </div>
                </div>

                {/* Additional groups */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Additional Groups</div>
                        <button
                            type="button"
                            onClick={addGroup}
                            className="flex items-center gap-1 text-[11px] font-semibold text-[#8A817C] hover:text-[#121212] transition-colors"
                        >
                            <Plus className="w-3 h-3" /> Add Group
                        </button>
                    </div>
                    {extraGroups.length === 0 ? (
                        <p className="text-[11px] text-[#8A817C]/60 font-light italic">No additional groups. Click "Add Group" to include more counts.</p>
                    ) : (
                        <div className="space-y-2">
                            {extraGroups.map((g, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        placeholder="Group label"
                                        value={g.label}
                                        onChange={(e) => updateGroupLabel(i, e.target.value)}
                                        className="flex-1 h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        value={g.count}
                                        onChange={(e) => updateGroupCount(i, Math.max(0, Number(e.target.value)))}
                                        className="w-20 h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeGroup(i)}
                                        className="p-2 text-[#8A817C] hover:text-red-600 border border-[#121212]/5 hover:border-red-200 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#121212]/5 rounded-xl">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Total Attendance</span>
                    <span className="text-xl font-light text-[#121212]">{computedTotal}</span>
                </div>

                <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                        Notes <span className="normal-case font-light">(optional)</span>
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                    />
                </div>

                <div className="flex gap-3 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 h-10 rounded-lg border border-[#121212]/10 text-xs font-semibold text-[#8A817C] hover:text-[#121212] hover:border-[#121212]/20 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 h-10 rounded-lg bg-[#121212] text-xs font-semibold text-[#FFFFFF] hover:bg-[#121212]/90 disabled:opacity-50 transition-colors"
                    >
                        {isSubmitting ? "Saving…" : initial ? "Save Changes" : "Record"}
                    </button>
                </div>
            </form>
        </div>
    );
}

// ─── Trends display ───────────────────────────────────────────────────────────

function TrendsDisplay({ trends }: { trends: HeadcountTrends | null }) {
    if (!trends) return null;

    const rows = Array.isArray(trends.data) ? trends.data : [];

    if (rows.length === 0) {
        return (
            <div className="text-center py-16 text-[#8A817C] text-xs font-light">
                No trend data available for the selected period.
            </div>
        );
    }

    const customGroupKeys = Array.from(new Set(
        rows.flatMap((r) => Object.keys((r.customGroups as Record<string, number>) ?? {}))
    ));

    const baseKeys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))))
        .filter((k) => k !== "customGroups");

    const totalIdx = baseKeys.indexOf("total");
    const keys = totalIdx >= 0
        ? [...baseKeys.slice(0, totalIdx), ...customGroupKeys, ...baseKeys.slice(totalIdx)]
        : [...baseKeys, ...customGroupKeys];

    const cellValue = (row: Record<string, unknown>, key: string): string => {
        if (customGroupKeys.includes(key)) {
            const cg = row.customGroups as Record<string, number> | undefined;
            return String(cg?.[key] ?? 0);
        }
        return String(row[key] ?? "—");
    };

    return (
        <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                            {keys.map((k) => (
                                <th key={k} className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">
                                    {k}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i} className="border-b border-[#121212]/5 hover:bg-[#F4F1EA]/30 transition-colors">
                                {keys.map((k) => (
                                    <td key={k} className="p-4 text-sm text-[#121212] font-light">
                                        {cellValue(row, k)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "records" | "trends";
type Period = "weekly" | "monthly" | "yearly";

function ServiceHeadcountPage() {
    const {
        records, pagination, isLoading, isSubmitting, error,
        fetchRecords, createRecord, updateRecord, fetchTrends, fetchSlots, goToPage,
    } = useServiceHeadcount();

    const [activeTab, setActiveTab] = useState<Tab>("records");

    const [slots, setSlots] = useState<ServiceSlotOption[]>([]);
    const [slotsLoaded, setSlotsLoaded] = useState(false);

    const [filterSlotId, setFilterSlotId] = useState("");
    const [filterFrom, setFilterFrom] = useState("");
    const [filterTo, setFilterTo] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<ServiceHeadcount | null>(null);

    const [trends, setTrends] = useState<HeadcountTrends | null>(null);
    const [trendsLoading, setTrendsLoading] = useState(false);
    const [trendsError, setTrendsError] = useState<string | null>(null);
    const [period, setPeriod] = useState<Period>("weekly");
    const [trendsFrom, setTrendsFrom] = useState("");
    const [trendsTo, setTrendsTo] = useState("");

    useEffect(() => {
        fetchRecords({ page: 1, limit: 10 });
    }, []);

    const loadSlots = async () => {
        if (slotsLoaded) return;
        const s = await fetchSlots();
        setSlots(s);
        setSlotsLoaded(true);
    };

    const openCreate = async () => {
        await loadSlots();
        setEditTarget(null);
        setShowModal(true);
    };

    const openEdit = async (record: ServiceHeadcount) => {
        await loadSlots();
        setEditTarget(record);
        setShowModal(true);
    };

    const handleModalSubmit = async (dto: CreateHeadcountDto) => {
        if (editTarget) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { serviceSlotId: _sid, ...updateDto } = dto;
            await updateRecord(editTarget.id, updateDto);
        } else {
            await createRecord(dto);
        }
        setShowModal(false);
        setEditTarget(null);
    };

    const applyFilters = () => {
        fetchRecords({ page: 1, limit: 10, serviceSlotId: filterSlotId || undefined, from: filterFrom || undefined, to: filterTo || undefined });
    };

    const loadTrends = async () => {
        setTrendsLoading(true);
        setTrendsError(null);
        try {
            const data = await fetchTrends(period, trendsFrom || undefined, trendsTo || undefined);
            setTrends(data);
        } catch (err: any) {
            setTrendsError(err?.message ?? "Failed to load trends.");
        } finally {
            setTrendsLoading(false);
        }
    };

    const slotLabel = useMemo(() => {
        const map: Record<string, string> = {};
        for (const s of slots) {
            map[s.id] = `${s.eventName} — ${s.name}`;
        }
        return map;
    }, [slots]);

    const getSlotLabel = (record: ServiceHeadcount) => {
        if (record.serviceSlot) {
            return record.serviceSlot.name;
        }
        return slotLabel[record.serviceSlotId] ?? record.serviceSlotId.slice(0, 8) + "…";
    };

    const getEventDate = (record: ServiceHeadcount) => {
        return record.serviceSlot?.event?.eventDate ?? null;
    };

    const tabCls = (t: Tab) =>
        `flex items-center gap-1.5 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest transition-colors rounded-lg ${
            activeTab === t ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"
        }`;

    return (
        <div className="space-y-10 font-sans">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Service Headcount</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Track and analyse attendance across services
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {activeTab === "records" && (
                        <button
                            onClick={openCreate}
                            className="flex items-center gap-2 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Record Headcount
                        </button>
                    )}
                </div>
            </div>

            <DismissibleError message={error} />

            {/* Tabs */}
            <div className="flex gap-1">
                <button onClick={() => setActiveTab("records")} className={tabCls("records")}>
                    <List className="w-3.5 h-3.5" />
                    Records
                </button>
                <button onClick={() => setActiveTab("trends")} className={tabCls("trends")}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    Trends
                </button>
            </div>

            {/* ── Records Tab ──────────────────────────────────────────────────────── */}

            {activeTab === "records" && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[180px]">
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                Service Slot
                            </label>
                            <select
                                value={filterSlotId}
                                onChange={(e) => setFilterSlotId(e.target.value)}
                                onFocus={loadSlots}
                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                            >
                                <option value="">All Slots</option>
                                {slots.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.eventName} — {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                From
                            </label>
                            <input
                                type="date"
                                value={filterFrom}
                                onChange={(e) => setFilterFrom(e.target.value)}
                                className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                To
                            </label>
                            <input
                                type="date"
                                value={filterTo}
                                onChange={(e) => setFilterTo(e.target.value)}
                                className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>
                        <button
                            onClick={applyFilters}
                            className="h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors"
                        >
                            Apply
                        </button>
                        <button
                            onClick={() => {
                                setFilterSlotId("");
                                setFilterFrom("");
                                setFilterTo("");
                                fetchRecords({ page: 1, limit: 10 });
                            }}
                            className="h-9 px-4 border border-[#121212]/10 text-[#8A817C] hover:text-[#121212] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Reset
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    <div className={`${showModal ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Date</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Service Slot</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Male</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Female</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Teens</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Children</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Mobile</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Total</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <SkeletonRow key={i} cols={9} />
                                        ))
                                    ) : records.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="p-12 text-center">
                                                <BarChart2 className="w-8 h-8 mx-auto mb-3 text-[#8A817C]/30" />
                                                <div className="text-xs text-[#8A817C] font-light">No headcount records found.</div>
                                            </td>
                                        </tr>
                                    ) : (
                                        records.map((record) => (
                                            <tr
                                                key={record.id}
                                                className="border-b border-[#121212]/5 hover:bg-[#F4F1EA]/30 transition-colors"
                                            >
                                                <td className="p-4 text-sm text-[#121212] font-light">
                                                    {formatDate(getEventDate(record) ?? record.createdAt)}
                                                </td>
                                                <td className="p-4 text-sm text-[#121212] font-light">
                                                    {getSlotLabel(record)}
                                                </td>
                                                <td className="p-4 text-sm text-[#121212] font-light">{record.maleAdults}</td>
                                                <td className="p-4 text-sm text-[#121212] font-light">{record.femaleAdults}</td>
                                                <td className="p-4 text-sm text-[#121212] font-light">{record.teenagers}</td>
                                                <td className="p-4 text-sm text-[#121212] font-light">{record.children}</td>
                                                <td className="p-4 text-sm text-[#121212] font-light">{record.mobileChurch}</td>
                                                <td className="p-4 text-sm text-[#121212] font-light">{total(record)}</td>
                                                <td className="p-4">
                                                    <button
                                                        onClick={() => openEdit(record)}
                                                        className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <PaginationBar
                            pagination={pagination}
                            onPage={goToPage}
                            label="records"
                        />
                    </div>

                        {showModal && (
                            <HeadcountPanel
                                slots={slots}
                                initial={editTarget}
                                isSubmitting={isSubmitting}
                                onClose={() => { setShowModal(false); setEditTarget(null); }}
                                onSubmit={handleModalSubmit}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* ── Trends Tab ───────────────────────────────────────────────────────── */}

            {activeTab === "trends" && (
                <div className="space-y-4">
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-6 flex flex-wrap gap-3 items-end">
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                Period
                            </label>
                            <div className="flex gap-1">
                                {(["weekly", "monthly", "yearly"] as Period[]).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPeriod(p)}
                                        className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-widest rounded-lg transition-colors ${
                                            period === p
                                                ? "bg-[#121212] text-white"
                                                : "text-[#8A817C] hover:text-[#121212]"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                From
                            </label>
                            <input
                                type="date"
                                value={trendsFrom}
                                onChange={(e) => setTrendsFrom(e.target.value)}
                                className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                To
                            </label>
                            <input
                                type="date"
                                value={trendsTo}
                                onChange={(e) => setTrendsTo(e.target.value)}
                                className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>
                        <button
                            onClick={loadTrends}
                            disabled={trendsLoading}
                            className="flex items-center gap-2 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors disabled:opacity-50"
                        >
                            {trendsLoading ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <BarChart2 className="w-3.5 h-3.5" />
                            )}
                            Load Trends
                        </button>
                    </div>

                    {trendsError && (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-xs text-red-700">
                            <strong className="block font-semibold uppercase tracking-wider text-[11px] mb-1">Error</strong>
                            {trendsError}
                        </div>
                    )}

                    {trendsLoading && (
                        <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-8 space-y-3 animate-pulse">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-3 bg-[#F4F1EA] rounded w-full" />
                            ))}
                        </div>
                    )}

                    {!trendsLoading && trends && <TrendsDisplay trends={trends} />}

                    {!trendsLoading && !trends && !trendsError && (
                        <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl flex flex-col items-center justify-center py-20 text-center">
                            <TrendingUp className="w-8 h-8 text-[#8A817C]/30 mb-3" />
                            <div className="text-sm font-light text-[#121212]">No Data Loaded</div>
                            <p className="text-xs text-[#8A817C] font-light mt-1">
                                Select a period and click Load Trends.
                            </p>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}

export default withAuth(ServiceHeadcountPage, { requiredPermission: 'headcount:read' });
