"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { api } from "@/utils/auth/axios-client";
import {
    Plus, Pencil, X, Eye,
    BarChart2, List, RefreshCw, TrendingUp, Trash2, CalendarDays,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { DismissibleError } from "@/components/ui/dismissible-error";
import { EventSearchInput } from "@/components/ui/event-search-input";
import {
    useServiceHeadcount,
    ServiceHeadcount,
    CreateHeadcountDto,
    ServiceSlotOption,
    HeadcountTrends,
    EventHeadcountSummary,
    ServiceSlotHeadcountSummary,
} from "@/hooks/use-service-headcount";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "—";
    return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-GB", {
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

// ─── Detail view (read-only) ───────────────────────────────────────────────────

function HeadcountDetailModal({ record, onClose }: { record: ServiceHeadcount; onClose: () => void }) {
    const customGroups = Object.entries(record.customGroups ?? {});
    const recordedByName = record.recordedBy?.member
        ? `${record.recordedBy.member.firstname} ${record.recordedBy.member.lastname}`
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl border border-[#121212]/10 w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-0.5">Headcount Detail</div>
                        <h3 className="text-sm font-semibold text-[#121212]">
                            {record.serviceSlot ? `${record.serviceSlot.event?.name ?? ""} — ${record.serviceSlot.name}` : record.serviceSlotId}
                        </h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-[#8A817C]">Male Adults</span><div className="text-[#121212] font-light">{record.maleAdults}</div></div>
                    <div><span className="text-[#8A817C]">Female Adults</span><div className="text-[#121212] font-light">{record.femaleAdults}</div></div>
                    <div><span className="text-[#8A817C]">Teenagers</span><div className="text-[#121212] font-light">{record.teenagers}</div></div>
                    <div><span className="text-[#8A817C]">Children</span><div className="text-[#121212] font-light">{record.children}</div></div>
                    <div><span className="text-[#8A817C]">Mobile Church</span><div className="text-[#121212] font-light">{record.mobileChurch}</div></div>
                    <div><span className="text-[#8A817C]">Total</span><div className="text-[#121212] font-semibold">{total(record)}</div></div>
                </div>

                {customGroups.length > 0 && (
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Additional Groups</div>
                        <div className="space-y-1">
                            {customGroups.map(([label, count]) => (
                                <div key={label} className="flex items-center justify-between text-xs">
                                    <span className="text-[#121212] font-light">{label}</span>
                                    <span className="text-[#121212] font-semibold">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {record.notes && (
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Notes</div>
                        <p className="text-xs text-[#121212] font-light whitespace-pre-wrap">{record.notes}</p>
                    </div>
                )}

                <div className="pt-2 border-t border-[#121212]/5 text-[10px] text-[#8A817C] font-light">
                    {recordedByName && <>Recorded by {recordedByName} · </>}
                    {formatDate(record.createdAt)}
                </div>
            </div>
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

// ─── Event-scoped headcount ────────────────────────────────────────────────────

const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

interface SubServiceFormProps {
    slot: ServiceSlotHeadcountSummary;
    isSubmitting: boolean;
    onSave: (dto: Omit<CreateHeadcountDto, "serviceSlotId">) => Promise<void>;
    onCancel: () => void;
}

function SubServiceHeadcountForm({ slot, isSubmitting, onSave, onCancel }: SubServiceFormProps) {
    const hc = slot.headcount;
    const [maleAdults, setMaleAdults] = useState(hc?.maleAdults ?? 0);
    const [femaleAdults, setFemaleAdults] = useState(hc?.femaleAdults ?? 0);
    const [teenagers, setTeenagers] = useState(hc?.teenagers ?? 0);
    const [children, setChildren] = useState(hc?.children ?? 0);
    const [mobileChurch, setMobileChurch] = useState(hc?.mobileChurch ?? 0);
    const [notes, setNotes] = useState(hc?.notes ?? "");
    const [extraGroups, setExtraGroups] = useState<Array<{ label: string; count: number }>>(
        () => Object.entries(hc?.customGroups ?? {}).map(([label, count]) => ({ label, count })),
    );
    const [formError, setFormError] = useState<string | null>(null);

    const extraTotal = extraGroups.reduce((sum, g) => sum + (g.count || 0), 0);
    const computedTotal = maleAdults + femaleAdults + teenagers + children + mobileChurch + extraTotal;

    const addGroup = () => setExtraGroups((prev) => [...prev, { label: "", count: 0 }]);
    const removeGroup = (i: number) => setExtraGroups((prev) => prev.filter((_, idx) => idx !== i));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const dupLabel = extraGroups.find((g, i) => g.label.trim() && extraGroups.findIndex((x, j) => j !== i && x.label.trim().toLowerCase() === g.label.trim().toLowerCase()) !== -1);
        if (dupLabel) { setFormError(`Duplicate group label: "${dupLabel.label}"`); return; }
        setFormError(null);
        const customGroups = extraGroups.length > 0
            ? Object.fromEntries(extraGroups.filter((g) => g.label.trim()).map((g) => [g.label.trim(), g.count]))
            : undefined;
        await onSave({ maleAdults, femaleAdults, teenagers, children, mobileChurch, customGroups, notes: notes || undefined });
    };

    return (
        <form onSubmit={handleSubmit} className="mt-3 p-4 bg-[#F4F1EA]/40 border border-[#121212]/10 rounded-lg space-y-4">
            {formError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {formError}
                </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <NumberInput label="Male Adults" value={maleAdults} onChange={setMaleAdults} />
                <NumberInput label="Female Adults" value={femaleAdults} onChange={setFemaleAdults} />
                <NumberInput label="Teenagers" value={teenagers} onChange={setTeenagers} />
                <NumberInput label="Children" value={children} onChange={setChildren} />
                <NumberInput label="Mobile Church" value={mobileChurch} onChange={setMobileChurch} />
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Additional Groups</div>
                    <button type="button" onClick={addGroup} className="flex items-center gap-1 text-[11px] font-semibold text-[#8A817C] hover:text-[#121212] transition-colors">
                        <Plus className="w-3 h-3" /> Add Group
                    </button>
                </div>
                {extraGroups.length > 0 && (
                    <div className="space-y-2">
                        {extraGroups.map((g, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input type="text" placeholder="Group label" value={g.label}
                                    onChange={(e) => setExtraGroups((prev) => prev.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))}
                                    className="flex-1 h-9 px-3 bg-white border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg" />
                                <input type="number" min={0} value={g.count}
                                    onChange={(e) => setExtraGroups((prev) => prev.map((x, idx) => idx === i ? { ...x, count: Math.max(0, Number(e.target.value)) } : x))}
                                    className="w-20 h-9 px-3 bg-white border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg" />
                                <button type="button" onClick={() => removeGroup(i)} className="p-2 text-[#8A817C] hover:text-red-600 border border-[#121212]/5 hover:border-red-200 rounded-lg transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                    Notes <span className="normal-case font-light">(optional)</span>
                </label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                    className="w-full px-3 py-2 bg-white border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none" />
            </div>

            <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[#8A817C] font-light">
                    Total for this service: <span className="text-[#121212] font-semibold">{computedTotal}</span>
                </span>
                <div className="flex gap-2">
                    <button type="button" onClick={onCancel}
                        className="h-9 px-4 rounded-lg border border-[#121212]/10 text-xs font-semibold text-[#8A817C] hover:text-[#121212] hover:border-[#121212]/20 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting}
                        className="h-9 px-4 rounded-lg bg-[#121212] text-xs font-semibold text-white hover:bg-[#121212]/90 disabled:opacity-50 transition-colors">
                        {isSubmitting ? "Saving…" : "Save"}
                    </button>
                </div>
            </div>
        </form>
    );
}

// ── Searchable service-slot picker (records filter) ─────────────────────────────
// Searches events by name server-side and flattens matched events' slots,
// rather than filtering a client-side list capped at the first 100 events.

interface SlotSearchResult {
    id: string;
    eventName: string;
    slotName: string;
    eventDate: string;
}

function ServiceSlotSearchInput({
    value,
    onChange,
}: Readonly<{ value: string; onChange: (id: string) => void }>) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SlotSearchResult[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!value) setSelectedLabel("");
    }, [value]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const doSearch = async (q: string) => {
        if (!q.trim()) { setResults([]); setOpen(false); return; }
        setLoading(true);
        try {
            const res = await api.get(`/events?page=1&limit=8&search=${encodeURIComponent(q)}`);
            const events: { name: string; eventDate: string; serviceSlots?: { id: string; name: string }[] }[] =
                res.data?.data?.data ?? [];
            const flattened: SlotSearchResult[] = [];
            for (const ev of events) {
                for (const slot of ev.serviceSlots ?? []) {
                    flattened.push({ id: slot.id, eventName: ev.name, slotName: slot.name, eventDate: ev.eventDate });
                }
            }
            setResults(flattened.slice(0, 8));
            setOpen(flattened.length > 0);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setQuery(q);
        if (!q) { onChange(""); setSelectedLabel(""); }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(q), 300);
    };

    const handleSelect = (r: SlotSearchResult) => {
        onChange(r.id);
        setSelectedLabel(`${r.eventName} — ${r.slotName}`);
        setQuery("");
        setResults([]);
        setOpen(false);
    };

    const handleClear = () => {
        onChange("");
        setSelectedLabel("");
        setQuery("");
        setResults([]);
        setOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            {selectedLabel ? (
                <div className="flex items-center gap-2 h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 rounded-lg">
                    <span className="text-xs text-[#121212] font-light flex-1 truncate">{selectedLabel}</span>
                    <button type="button" onClick={handleClear} className="p-0.5 text-[#8A817C] hover:text-[#121212] transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={handleInput}
                        onFocus={() => results.length > 0 && setOpen(true)}
                        placeholder="All slots — type to search…"
                        className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                    {loading && (
                        <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A817C] animate-spin pointer-events-none" />
                    )}
                </div>
            )}
            {open && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#121212]/10 rounded-lg shadow-lg z-20 overflow-hidden max-h-52 overflow-y-auto">
                    {results.map((r) => (
                        <button
                            key={r.id}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); handleSelect(r); }}
                            className="w-full text-left px-3 py-2 hover:bg-[#F4F1EA]/60 transition-colors border-b border-[#121212]/5 last:border-0"
                        >
                            <div className="text-xs text-[#121212] font-light">{r.eventName} — {r.slotName}</div>
                            <div className="text-[10px] text-[#8A817C] font-mono">{formatDate(r.eventDate)}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function EventHeadcountSection({
    isSubmitting, onRecord, onLoadSummary,
}: {
    isSubmitting: boolean;
    onRecord: (serviceSlotId: string, dto: Omit<CreateHeadcountDto, "serviceSlotId">) => Promise<void>;
    onLoadSummary: (eventId: string) => Promise<EventHeadcountSummary>;
}) {
    const [selectedEventId, setSelectedEventId] = useState("");
    const [summary, setSummary] = useState<EventHeadcountSummary | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

    const loadSummary = async (eventId: string) => {
        setSummary(null);
        setSummaryError(null);
        if (!eventId) return;
        setSummaryLoading(true);
        try {
            setSummary(await onLoadSummary(eventId));
        } catch (err: unknown) {
            const e = err as ApiError;
            setSummaryError(e?.response?.data?.message || e?.message || "Failed to load headcount summary.");
        } finally {
            setSummaryLoading(false);
        }
    };

    const handleSelectEvent = (eventId: string) => {
        setSelectedEventId(eventId);
        setEditingSlotId(null);
        loadSummary(eventId);
    };

    const handleSave = async (serviceSlotId: string, dto: Omit<CreateHeadcountDto, "serviceSlotId">) => {
        await onRecord(serviceSlotId, dto);
        setEditingSlotId(null);
        await loadSummary(selectedEventId);
    };

    return (
        <div className="space-y-4">
            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5">
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                    Event
                </label>
                <div className="w-full sm:w-96">
                    <EventSearchInput
                        value={selectedEventId}
                        onChange={handleSelectEvent}
                        placeholder="Type to search events…"
                    />
                </div>
            </div>

            {summaryError && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-xs text-red-700">
                    {summaryError}
                </div>
            )}

            {summaryLoading && (
                <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-8 space-y-3 animate-pulse">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-3 bg-[#F4F1EA] rounded w-full" />
                    ))}
                </div>
            )}

            {!summaryLoading && !summary && !summaryError && (
                <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl flex flex-col items-center justify-center py-20 text-center">
                    <CalendarDays className="w-8 h-8 text-[#8A817C]/30 mb-3" />
                    <div className="text-sm font-light text-[#121212]">Pick an event</div>
                    <p className="text-xs text-[#8A817C] font-light mt-1">
                        If it has more than one service, they&apos;ll all show up here so you can record each one&apos;s headcount.
                    </p>
                </div>
            )}

            {!summaryLoading && summary && (
                <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[#121212]/5 bg-[#121212]/5">
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-0.5">
                                {summary.eventName} — Total Attendance
                            </div>
                            <div className="text-2xl font-light text-[#121212]">{summary.total.total}</div>
                        </div>
                        <div className="text-xs text-[#8A817C] font-light text-right">
                            {summary.recordedCount} of {summary.slotCount} service{summary.slotCount !== 1 ? "s" : ""} recorded
                        </div>
                    </div>

                    <div className="divide-y divide-[#121212]/5">
                        {summary.serviceSlots.map((s) => (
                            <div key={s.serviceSlotId} className="px-5 py-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm text-[#121212] font-light">{s.serviceSlotName}</div>
                                        <div className="text-[11px] text-[#8A817C] font-light">{formatTime(s.startTime)}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {s.headcount ? (
                                            <span className="text-sm text-[#121212] font-semibold">{s.headcount.total}</span>
                                        ) : (
                                            <span className="text-[11px] text-[#8A817C]/70 font-light italic">Not recorded</span>
                                        )}
                                        <button
                                            onClick={() => setEditingSlotId(editingSlotId === s.serviceSlotId ? null : s.serviceSlotId)}
                                            className="flex items-center gap-1.5 h-8 px-3 border border-[#121212]/10 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hover:text-[#121212] hover:border-[#121212]/20 rounded-lg transition-colors"
                                        >
                                            <Pencil className="w-3 h-3" />
                                            {s.headcount ? "Edit" : "Record"}
                                        </button>
                                    </div>
                                </div>
                                {editingSlotId === s.serviceSlotId && (
                                    <SubServiceHeadcountForm
                                        slot={s}
                                        isSubmitting={isSubmitting}
                                        onSave={(dto) => handleSave(s.serviceSlotId, dto)}
                                        onCancel={() => setEditingSlotId(null)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "byEvent" | "records" | "trends";
type Period = "weekly" | "monthly" | "yearly";

function ServiceHeadcountPage() {
    const {
        records, pagination, isLoading, isSubmitting, error,
        fetchRecords, createRecord, fetchRecordDetail, fetchTrends, fetchSlots, fetchEventSummary, goToPage,
    } = useServiceHeadcount();

    const [activeTab, setActiveTab] = useState<Tab>("byEvent");

    const [slots, setSlots] = useState<ServiceSlotOption[]>([]);
    const [slotsLoaded, setSlotsLoaded] = useState(false);

    const [filterSlotId, setFilterSlotId] = useState("");
    const [filterFrom, setFilterFrom] = useState("");
    const [filterTo, setFilterTo] = useState("");

    const [viewingRecord, setViewingRecord] = useState<ServiceHeadcount | null>(null);
    const [viewError, setViewError] = useState<string | null>(null);

    const [trends, setTrends] = useState<HeadcountTrends | null>(null);
    const [trendsLoading, setTrendsLoading] = useState(false);
    const [trendsError, setTrendsError] = useState<string | null>(null);
    const [period, setPeriod] = useState<Period>("weekly");
    const [trendsFrom, setTrendsFrom] = useState("");
    const [trendsTo, setTrendsTo] = useState("");

    useEffect(() => {
        fetchRecords({ page: 1, limit: 10 });
    }, [fetchRecords]);

    const loadSlots = async () => {
        if (slotsLoaded) return;
        const s = await fetchSlots();
        setSlots(s);
        setSlotsLoaded(true);
    };

    useEffect(() => {
        if (activeTab === "records") loadSlots();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const openView = async (id: string) => {
        setViewError(null);
        try {
            setViewingRecord(await fetchRecordDetail(id));
        } catch {
            setViewError("Failed to load headcount detail.");
        }
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
        } catch (err: unknown) {
            const e = err as ApiError;
            setTrendsError(e?.message ?? "Failed to load trends.");
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
            </div>

            <DismissibleError message={error} />

            {/* Tabs */}
            <div className="flex gap-1">
                <button onClick={() => setActiveTab("byEvent")} className={tabCls("byEvent")}>
                    <CalendarDays className="w-3.5 h-3.5" />
                    By Event
                </button>
                <button onClick={() => setActiveTab("records")} className={tabCls("records")}>
                    <List className="w-3.5 h-3.5" />
                    Records
                </button>
                <button onClick={() => setActiveTab("trends")} className={tabCls("trends")}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    Trends
                </button>
            </div>

            {/* ── By Event Tab ─────────────────────────────────────────────────────── */}

            {activeTab === "byEvent" && (
                <EventHeadcountSection
                    isSubmitting={isSubmitting}
                    onRecord={async (serviceSlotId, dto) => { await createRecord({ serviceSlotId, ...dto }); }}
                    onLoadSummary={fetchEventSummary}
                />
            )}

            {/* ── Records Tab ──────────────────────────────────────────────────────── */}

            {activeTab === "records" && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[180px]">
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                Service Slot
                            </label>
                            <ServiceSlotSearchInput
                                value={filterSlotId}
                                onChange={setFilterSlotId}
                            />
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

                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
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
                                        <th className="p-4 w-12" />
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
                                                        onClick={() => openView(record.id)}
                                                        title="View details"
                                                        className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md transition-colors"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
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
                    <DismissibleError message={viewError} />
                    {viewingRecord && (
                        <HeadcountDetailModal record={viewingRecord} onClose={() => setViewingRecord(null)} />
                    )}
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
