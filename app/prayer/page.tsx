"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Plus,
    Trash2,
    Pencil,
    X,
    RefreshCw,
    ChevronDown,
    UserCircle,
    UserPlus,
    CheckCircle,
    AlertCircle,
    Users,
    Copy,
    Search,
} from "lucide-react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    usePrayer,
    PrayerAudience,
    PrayerDayConfig,
    PrayerScheduleRule,
    PrayerMeeting,
    PrayerRosterEntry,
    PrayerProgram,
    AutoAssignResult,
    ValidationReport,
} from "@/hooks/use-prayer";
import { api } from "@/utils/auth/axios-client";
import { DismissibleError } from "@/components/ui/dismissible-error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function dayName(dow: number) { return DAY_NAMES[dow] ?? String(dow); }

function Badge({ label, color }: { label: string; color: string }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${color}`}>
            {label}
        </span>
    );
}
const activeBadge = (v: boolean) => v
    ? <Badge label="Active" color="bg-green-50 text-green-700 border-green-200" />
    : <Badge label="Inactive" color="bg-[#F4F1EA] text-[#8A817C] border-[#121212]/10" />;
const modeBadge = (m: string) => m === "PHYSICAL"
    ? <Badge label="Physical" color="bg-blue-50 text-blue-700 border-blue-200" />
    : <Badge label="Virtual" color="bg-purple-50 text-purple-700 border-purple-200" />;
const meetingStatusBadge = (s: string) => {
    if (s === "SCHEDULED") return <Badge label="Scheduled" color="bg-blue-50 text-blue-700 border-blue-200" />;
    if (s === "COMPLETED") return <Badge label="Completed" color="bg-green-50 text-green-700 border-green-200" />;
    return <Badge label="Cancelled" color="bg-red-50 text-red-700 border-red-200" />;
};
const selectionStatusBadge = (s: string) => {
    if (s === "OPEN") return <Badge label="Open" color="bg-green-50 text-green-700 border-green-200" />;
    if (s === "CLOSED") return <Badge label="Closed" color="bg-[#F4F1EA] text-[#8A817C] border-[#121212]/10" />;
    return <Badge label="Pending" color="bg-amber-50 text-amber-700 border-amber-200" />;
};
const assignmentTypeBadge = (t: string) => {
    if (t === "FIXED") return <Badge label="Fixed" color="bg-purple-50 text-purple-700 border-purple-200" />;
    if (t === "SELF_SELECTED") return <Badge label="Self-selected" color="bg-blue-50 text-blue-700 border-blue-200" />;
    if (t === "AUTO_ASSIGNED") return <Badge label="Auto-assigned" color="bg-amber-50 text-amber-700 border-amber-200" />;
    if (t === "MANUAL") return <Badge label="Manual" color="bg-teal-50 text-teal-700 border-teal-200" />;
    return <Badge label="Rescheduled" color="bg-orange-50 text-orange-700 border-orange-200" />;
};
const audienceBadge = (a: PrayerAudience) => {
    if (a === "WORKERS") return <Badge label="Workers" color="bg-indigo-50 text-indigo-700 border-indigo-200" />;
    if (a === "MEMBERS") return <Badge label="Members" color="bg-pink-50 text-pink-700 border-pink-200" />;
    return <Badge label="All" color="bg-teal-50 text-teal-700 border-teal-200" />;
};

function SkeletonRow({ cols }: { cols: number }) {
    return (
        <tr className="border-b border-[#121212]/5 animate-pulse">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="p-4"><div className="h-3 bg-[#F4F1EA] rounded w-3/4" /></td>
            ))}
        </tr>
    );
}

function entryDisplayName(entry: PrayerRosterEntry): string {
    if (entry.workerProfile?.member) {
        return `${entry.workerProfile.member.firstname} ${entry.workerProfile.member.lastname}`;
    }
    if (entry.member) {
        return `${entry.member.firstname} ${entry.member.lastname}`;
    }
    return "Unknown";
}

// ─── Assignee Search Combobox ─────────────────────────────────────────────────

interface SearchResult {
    id: string;
    firstname: string;
    lastname: string;
    workerProfile: { id: string } | null;
}

function AssigneeCombobox({
    audience,
    displayName,
    onChange,
}: {
    audience: PrayerAudience;
    displayName: string;
    onChange: (payload: { workerProfileId?: string; memberId?: string }, name: string) => void;
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const doSearch = async (q: string) => {
        if (!q.trim()) { setResults([]); setOpen(false); return; }
        setLoading(true);
        try {
            // For WORKERS or ALL: search workers; for MEMBERS: search all members
            const role = audience === "MEMBERS" ? "" : "&role=WORKER";
            const res = await api.get(`/members?page=1&limit=8&search=${encodeURIComponent(q)}${role}`);
            const list: SearchResult[] = res.data?.data?.data ?? [];
            // For WORKERS only: filter to those with workerProfile
            const filtered = audience === "WORKERS" ? list.filter((m) => m.workerProfile) : list;
            setResults(filtered);
            setOpen(true);
        } catch { setResults([]); } finally { setLoading(false); }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setQuery(q);
        if (!q) onChange({}, "");
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(q), 300);
    };

    const handleSelect = (m: SearchResult) => {
        const name = `${m.firstname} ${m.lastname}`;
        if (audience === "MEMBERS") {
            onChange({ memberId: m.id }, name);
        } else if (m.workerProfile) {
            onChange({ workerProfileId: m.workerProfile.id }, name);
        } else {
            onChange({ memberId: m.id }, name);
        }
        setQuery(""); setResults([]); setOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            {displayName ? (
                <div className="flex items-center gap-2 h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 rounded-lg">
                    <UserCircle className="w-4 h-4 text-[#8A817C] shrink-0" />
                    <span className="text-sm text-[#121212] font-light flex-1 truncate">{displayName}</span>
                    <button type="button" onClick={() => onChange({}, "")} className="text-[#8A817C] hover:text-[#121212] transition-colors">
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
                        placeholder={audience === "MEMBERS" ? "Search member by name…" : "Search worker by name…"}
                        className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                    {loading && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A817C] animate-spin pointer-events-none" />}
                </div>
            )}
            {open && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#121212]/10 rounded-xl shadow-lg z-20 overflow-hidden max-h-48 overflow-y-auto">
                    {results.map((m) => (
                        <button key={m.id} type="button"
                            onMouseDown={(e) => { e.preventDefault(); handleSelect(m); }}
                            className="w-full text-left px-4 py-2 hover:bg-[#F4F1EA]/60 transition-colors border-b border-[#121212]/5 last:border-0">
                            <div className="text-xs text-[#121212] font-light">{m.firstname} {m.lastname}
                                {m.workerProfile && audience !== "MEMBERS" && (
                                    <span className="ml-2 text-[10px] text-[#8A817C]">Worker</span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Programs Tab ─────────────────────────────────────────────────────────────

function ProgramsTab({
    hook,
    selectedProgramId,
    onSelect,
}: {
    hook: ReturnType<typeof usePrayer>;
    selectedProgramId: string | null;
    onSelect: (id: string) => void;
}) {
    const { programs, isLoading, isSubmitting, error, fetchPrograms, createProgram, updateProgram, cloneProgram } = hook;

    type PanelMode = "create" | "edit" | "clone" | null;
    const [panelMode, setPanelMode] = useState<PanelMode>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [cloningId, setCloningId] = useState<string | null>(null);
    const [formName, setFormName] = useState("");
    const [formDesc, setFormDesc] = useState("");
    const [formAudience, setFormAudience] = useState<PrayerAudience>("WORKERS");
    const [formDays, setFormDays] = useState(7);
    const [formActive, setFormActive] = useState(true);
    const [formCopyFrom, setFormCopyFrom] = useState("");
    const [formIncludeFixed, setFormIncludeFixed] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

    const filtered = programs.filter((p) =>
        !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()),
    );

    const openCreate = () => {
        setEditingId(null); setCloningId(null);
        setFormName(""); setFormDesc(""); setFormAudience("WORKERS"); setFormDays(7); setFormActive(true);
        setFormCopyFrom(""); setFormIncludeFixed(false);
        setPanelMode("create");
    };

    const openEdit = (p: PrayerProgram) => {
        setEditingId(p.id); setCloningId(null);
        setFormName(p.name); setFormDesc(p.description ?? ""); setFormAudience(p.audience);
        setFormDays(p.selectionWindowDays); setFormActive(p.isActive);
        setPanelMode("edit");
    };

    const openClone = (p: PrayerProgram) => {
        setCloningId(p.id); setEditingId(null);
        setFormName(`${p.name} (Copy)`); setFormDesc(p.description ?? "");
        setFormAudience(p.audience); setFormDays(p.selectionWindowDays);
        setFormIncludeFixed(false);
        setPanelMode("clone");
    };

    const closePanel = () => { setPanelMode(null); setEditingId(null); setCloningId(null); };

    const handleSave = async () => {
        try {
            if (panelMode === "edit" && editingId) {
                await updateProgram(editingId, { name: formName, description: formDesc || undefined, audience: formAudience, selectionWindowDays: formDays, isActive: formActive });
                closePanel();
            } else if (panelMode === "clone" && cloningId) {
                const created = await cloneProgram(cloningId, {
                    name: formName, description: formDesc || undefined,
                    audience: formAudience, selectionWindowDays: formDays,
                    includeFixedAssignments: formIncludeFixed,
                });
                onSelect(created.id); closePanel();
            } else {
                const sourceId = formCopyFrom;
                let created: PrayerProgram;
                if (sourceId) {
                    created = await cloneProgram(sourceId, {
                        name: formName, description: formDesc || undefined,
                        audience: formAudience, selectionWindowDays: formDays,
                        includeFixedAssignments: formIncludeFixed,
                    });
                } else {
                    created = await createProgram({ name: formName, description: formDesc || undefined, audience: formAudience, selectionWindowDays: formDays });
                }
                onSelect(created.id); closePanel();
            }
        } catch { /* error surfaced via hook */ }
    };

    const panelOpen = panelMode !== null;
    const primaryCls = "h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors disabled:opacity-50";
    const secondaryCls = "h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] shrink-0">
                    {search.trim() ? `${filtered.length} of ${programs.length}` : programs.length} program{programs.length !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-3 flex-1 justify-end">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A817C] pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search programs…"
                            className="h-9 pl-9 pr-8 w-52 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                        />
                        {search && (
                            <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A817C] hover:text-[#121212]">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                    <button onClick={openCreate} className={`flex items-center gap-2 shrink-0 ${primaryCls}`}>
                        <Plus className="w-3.5 h-3.5" /> New Program
                    </button>
                </div>
            </div>

            <DismissibleError message={error} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className={`${panelOpen ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["Name", "Audience", "Selection Window", "Status", ""].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading
                                    ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                                    : filtered.length === 0
                                    ? <tr><td colSpan={5} className="p-12 text-center text-xs text-[#8A817C] font-light">{search.trim() ? "No programs match your search." : "No programs yet. Create one above."}</td></tr>
                                    : filtered.map((p) => (
                                        <tr key={p.id}
                                            onClick={() => onSelect(p.id)}
                                            className={`border-b border-[#121212]/5 cursor-pointer transition-colors ${selectedProgramId === p.id ? "bg-[#F4F1EA]/60" : "hover:bg-[#F4F1EA]/30"}`}>
                                            <td className="p-4 text-sm text-[#121212] font-light">{p.name}</td>
                                            <td className="p-4">{audienceBadge(p.audience)}</td>
                                            <td className="p-4 text-sm text-[#121212] font-light">{p.selectionWindowDays} days</td>
                                            <td className="p-4">{activeBadge(p.isActive)}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                                                        className="p-2 text-[#8A817C] hover:text-[#121212] border border-transparent hover:border-[#121212]/10 rounded-lg transition-colors" title="Edit">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); openClone(p); }}
                                                        className="p-2 text-[#8A817C] hover:text-[#121212] border border-transparent hover:border-[#121212]/10 rounded-lg transition-colors" title="Clone">
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {panelOpen && (
                    <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative overflow-hidden">
                        <button type="button" onClick={closePanel}
                            className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md z-10 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                        <div className="p-6 border-b border-[#121212]/5">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">
                                {panelMode === "edit" ? "Edit Program" : panelMode === "clone" ? "Clone Program" : "New Program"}
                            </div>
                            <h2 className="text-xl font-light tracking-tight text-[#121212] pr-10">
                                {panelMode === "edit" ? "Update Prayer Program" : panelMode === "clone" ? "Clone Prayer Program" : "Create Prayer Program"}
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <DismissibleError message={error} />

                            {/* Copy from — only on create */}
                            {panelMode === "create" && programs.length > 0 && (
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Copy settings from (optional)</label>
                                    <select value={formCopyFrom} onChange={(e) => {
                                        setFormCopyFrom(e.target.value);
                                        if (e.target.value) {
                                            const src = programs.find((p) => p.id === e.target.value);
                                            if (src) { setFormAudience(src.audience); setFormDays(src.selectionWindowDays); }
                                        }
                                    }} className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none">
                                        <option value="">— Start from scratch —</option>
                                        {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    {formCopyFrom && <p className="text-[10px] text-[#8A817C] mt-1">Day configs and rules will be copied. Fixed assignments are optional.</p>}
                                </div>
                            )}

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Name</label>
                                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                                    placeholder="e.g. Tuesday Morning Intercessory"
                                    className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg" />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Description (optional)</label>
                                <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                                    placeholder="Brief description…"
                                    className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg" />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Audience</label>
                                <select value={formAudience} onChange={(e) => setFormAudience(e.target.value as PrayerAudience)}
                                    className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none">
                                    <option value="WORKERS">Workers only</option>
                                    <option value="MEMBERS">Members only</option>
                                    <option value="ALL">All (workers + members)</option>
                                </select>
                                <p className="text-[10px] text-[#8A817C] mt-1">
                                    {formAudience === "WORKERS" && "Only workers will be assigned. Auto-assign is available."}
                                    {formAudience === "MEMBERS" && "Members self-select or are manually assigned. Auto-assign is not available."}
                                    {formAudience === "ALL" && "Workers are auto-assigned; members can self-select or be manually added."}
                                </p>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Self-Selection Window (days)</label>
                                <input type="number" min={1} max={30} value={formDays} onChange={(e) => setFormDays(Number(e.target.value))}
                                    className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg" />
                            </div>

                            {panelMode === "edit" && (
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Status</label>
                                    <select value={formActive ? "active" : "inactive"} onChange={(e) => setFormActive(e.target.value === "active")}
                                        className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            )}

                            {(panelMode === "clone" || (panelMode === "create" && formCopyFrom)) && (
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={formIncludeFixed} onChange={(e) => setFormIncludeFixed(e.target.checked)}
                                        className="w-4 h-4 rounded border-[#121212]/20 accent-[#121212]" />
                                    <span className="text-xs text-[#121212] font-light">Also copy fixed assignments</span>
                                </label>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={handleSave} disabled={isSubmitting || !formName.trim()}
                                    className={primaryCls}>
                                    {isSubmitting ? "Saving…" : panelMode === "edit" ? "Save Changes" : panelMode === "clone" ? "Clone" : "Create"}
                                </button>
                                <button type="button" onClick={closePanel} className={secondaryCls}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Day Configs Tab ──────────────────────────────────────────────────────────

function DayConfigsTab({ hook, programId }: { hook: ReturnType<typeof usePrayer>; programId: string }) {
    const { dayConfigs, isLoading, isSubmitting, error, fetchDayConfigs, createDayConfig, updateDayConfig } = hook;
    const [panelMode, setPanelMode] = useState<"create" | "edit" | null>(null);
    const [selected, setSelected] = useState<PrayerDayConfig | null>(null);
    const [formDow, setFormDow] = useState(0);
    const [formMode, setFormMode] = useState<"PHYSICAL" | "VIRTUAL">("PHYSICAL");
    const [formStart, setFormStart] = useState("06:00");
    const [formEnd, setFormEnd] = useState("07:00");
    const [formCapacity, setFormCapacity] = useState(20);
    const [formActive, setFormActive] = useState(true);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => { fetchDayConfigs(programId); }, [fetchDayConfigs, programId]);

    const openCreate = () => {
        setFormDow(0); setFormMode("PHYSICAL"); setFormStart("06:00"); setFormEnd("07:00");
        setFormCapacity(20); setFormActive(true); setLocalError(null); setSelected(null); setPanelMode("create");
    };
    const openEdit = (d: PrayerDayConfig) => {
        setFormDow(d.dayOfWeek); setFormMode(d.mode); setFormStart(d.startTime); setFormEnd(d.endTime);
        setFormCapacity(d.maxCapacity); setFormActive(d.isActive); setLocalError(null); setSelected(d); setPanelMode("edit");
    };
    const closePanel = () => { setPanelMode(null); setSelected(null); setLocalError(null); };

    const handleCreate = async () => {
        if (dayConfigs.some((d) => d.dayOfWeek === formDow)) { setLocalError(`A day config for ${dayName(formDow)} already exists.`); return; }
        setLocalError(null);
        try { await createDayConfig(programId, { dayOfWeek: formDow, mode: formMode, startTime: formStart, endTime: formEnd, maxCapacity: formCapacity }); closePanel(); } catch { /* surfaced */ }
    };
    const handleUpdate = async () => {
        if (!selected) return;
        try { await updateDayConfig(selected.id, { mode: formMode, startTime: formStart, endTime: formEnd, maxCapacity: formCapacity, isActive: formActive }); closePanel(); } catch { /* surfaced */ }
    };

    const panelOpen = panelMode !== null;
    const primaryCls = "h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors disabled:opacity-50";
    const secondaryCls = "h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">{dayConfigs.length} day config{dayConfigs.length !== 1 ? "s" : ""}</span>
                <button onClick={openCreate} className={`flex items-center gap-2 ${primaryCls}`}><Plus className="w-3.5 h-3.5" /> Add Day Config</button>
            </div>
            <DismissibleError message={error} />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className={`${panelOpen ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["Day", "Mode", "Time", "Capacity", "Status", ""].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                                    : dayConfigs.length === 0 ? <tr><td colSpan={6} className="p-12 text-center text-xs text-[#8A817C] font-light">No day configs yet.</td></tr>
                                    : dayConfigs.map((d) => (
                                        <tr key={d.id} className="border-b border-[#121212]/5 hover:bg-[#F4F1EA]/30 transition-colors">
                                            <td className="p-4 text-sm text-[#121212] font-light">{dayName(d.dayOfWeek)}</td>
                                            <td className="p-4">{modeBadge(d.mode)}</td>
                                            <td className="p-4 text-sm text-[#121212] font-light font-mono">{d.startTime}–{d.endTime}</td>
                                            <td className="p-4 text-sm text-[#121212] font-light">{d.maxCapacity}</td>
                                            <td className="p-4">{activeBadge(d.isActive)}</td>
                                            <td className="p-4">
                                                <button onClick={() => openEdit(d)} className="p-2 text-[#8A817C] hover:text-[#121212] border border-transparent hover:border-[#121212]/10 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                {panelOpen && (
                    <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative overflow-hidden">
                        <button type="button" onClick={closePanel} className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md z-10 transition-colors"><X className="w-4 h-4" /></button>
                        <div className="p-6 border-b border-[#121212]/5">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">{panelMode === "create" ? "New Day Config" : "Edit Day Config"}</div>
                            <h2 className="text-xl font-light tracking-tight text-[#121212] pr-10">{panelMode === "create" ? "Add Prayer Day" : `Edit ${dayName(selected?.dayOfWeek ?? 0)}`}</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {(localError || error) && <div className="text-xs font-light text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{localError ?? error}</div>}
                            {panelMode === "create" && (
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Day of Week</label>
                                    <select value={formDow} onChange={(e) => setFormDow(Number(e.target.value))} className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none">
                                        {DAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Mode</label>
                                <select value={formMode} onChange={(e) => setFormMode(e.target.value as "PHYSICAL" | "VIRTUAL")} className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none">
                                    <option value="PHYSICAL">Physical</option>
                                    <option value="VIRTUAL">Virtual</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Start Time</label>
                                    <input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">End Time</label>
                                    <input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Max Capacity</label>
                                <input type="number" min={1} value={formCapacity} onChange={(e) => setFormCapacity(Number(e.target.value))} className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg" />
                            </div>
                            {panelMode === "edit" && (
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Status</label>
                                    <select value={formActive ? "active" : "inactive"} onChange={(e) => setFormActive(e.target.value === "active")} className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={panelMode === "create" ? handleCreate : handleUpdate} disabled={isSubmitting} className={primaryCls}>
                                    {isSubmitting ? "Saving…" : panelMode === "create" ? "Create" : "Save Changes"}
                                </button>
                                <button type="button" onClick={closePanel} className={secondaryCls}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Rules Tab ────────────────────────────────────────────────────────────────

type RuleType = "ROLE_FREQUENCY" | "MIN_LEADERS_PER_MEETING" | "MAX_PER_MEETING";

function RulesTab({ hook, programId }: { hook: ReturnType<typeof usePrayer>; programId: string }) {
    const { rules, isLoading, isSubmitting, error, fetchRules, createRule, updateRule } = hook;
    const [panelMode, setPanelMode] = useState<"create" | "edit" | null>(null);
    const [selectedRule, setSelectedRule] = useState<PrayerScheduleRule | null>(null);
    const [formType, setFormType] = useState<RuleType>("MAX_PER_MEETING");
    const [formTargetLeadType, setFormTargetLeadType] = useState("");
    const [formValue, setFormValue] = useState(1);
    const [formDescription, setFormDescription] = useState("");
    const [formActive, setFormActive] = useState(true);

    useEffect(() => { fetchRules(programId); }, [fetchRules, programId]);

    const openCreate = () => { setFormType("MAX_PER_MEETING"); setFormTargetLeadType(""); setFormValue(1); setFormDescription(""); setFormActive(true); setSelectedRule(null); setPanelMode("create"); };
    const openEdit = (r: PrayerScheduleRule) => { setFormType(r.type as RuleType); setFormTargetLeadType(r.targetLeadType ?? ""); setFormValue(r.value); setFormDescription(r.description); setFormActive(r.isActive); setSelectedRule(r); setPanelMode("edit"); };
    const closePanel = () => { setPanelMode(null); setSelectedRule(null); };

    const handleCreate = async () => {
        try {
            const payload: Parameters<typeof createRule>[1] = { type: formType, value: formValue, description: formDescription };
            if (formType === "ROLE_FREQUENCY" && formTargetLeadType) payload.targetLeadType = formTargetLeadType;
            await createRule(programId, payload);
            closePanel();
        } catch { /* surfaced */ }
    };
    const handleUpdate = async () => {
        if (!selectedRule) return;
        try { await updateRule(selectedRule.id, { value: formValue, description: formDescription, isActive: formActive }); closePanel(); } catch { /* surfaced */ }
    };

    const panelOpen = panelMode !== null;
    const primaryCls = "h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors disabled:opacity-50";
    const secondaryCls = "h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">{rules.length} rule{rules.length !== 1 ? "s" : ""}</span>
                <button onClick={openCreate} className={`flex items-center gap-2 ${primaryCls}`}><Plus className="w-3.5 h-3.5" /> Add Rule</button>
            </div>
            <DismissibleError message={error} />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className={`${panelOpen ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden`}>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                {["Type", "Target", "Value", "Description", "Status", ""].map((h) => (
                                    <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                                : rules.length === 0 ? <tr><td colSpan={6} className="p-12 text-center text-xs text-[#8A817C] font-light">No rules configured yet.</td></tr>
                                : rules.map((r) => (
                                    <tr key={r.id} className="border-b border-[#121212]/5 hover:bg-[#F4F1EA]/30 transition-colors">
                                        <td className="p-4">
                                            <Badge
                                                label={r.type === "ROLE_FREQUENCY" ? "Role Frequency" : r.type === "MIN_LEADERS_PER_MEETING" ? "Min Leaders" : "Max Per Meeting"}
                                                color={r.type === "ROLE_FREQUENCY" ? "bg-blue-50 text-blue-700 border-blue-100" : r.type === "MIN_LEADERS_PER_MEETING" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-[#F4F1EA] text-[#121212] border-[#121212]/10"}
                                            />
                                            <div className="mt-1 text-[10px] text-[#8A817C] font-light leading-tight">
                                                {r.type === "ROLE_FREQUENCY" ? "How many times / month this role is assigned" : r.type === "MIN_LEADERS_PER_MEETING" ? "Minimum leaders required per meeting" : "Maximum assignees per meeting"}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm font-light">
                                            {r.type === "ROLE_FREQUENCY"
                                                ? <span className="text-[#121212]">{r.targetLeadType === "HOD" ? "Head of Dept (HOD)" : r.targetLeadType === "D_HOD" ? "Asst. Lead (D-HOD)" : r.targetLeadType ?? <span className="text-[#8A817C]">All Workers</span>}</span>
                                                : <span className="text-[#8A817C] text-xs italic">Applies to all</span>}
                                        </td>
                                        <td className="p-4">
                                            <span className="text-sm text-[#121212] font-medium">{r.value}</span>
                                            <div className="text-[10px] text-[#8A817C] font-light">{r.type === "ROLE_FREQUENCY" ? "× / month" : r.type === "MIN_LEADERS_PER_MEETING" ? "min leaders" : "max people"}</div>
                                        </td>
                                        <td className="p-4 text-sm text-[#121212] font-light max-w-[180px] truncate">{r.description}</td>
                                        <td className="p-4">{activeBadge(r.isActive)}</td>
                                        <td className="p-4"><button onClick={() => openEdit(r)} className="p-2 text-[#8A817C] hover:text-[#121212] border border-transparent hover:border-[#121212]/10 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button></td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
                {panelOpen && (
                    <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative overflow-hidden">
                        <button type="button" onClick={closePanel} className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md z-10 transition-colors"><X className="w-4 h-4" /></button>
                        <div className="p-6 border-b border-[#121212]/5">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">{panelMode === "create" ? "New Rule" : "Edit Rule"}</div>
                            <h2 className="text-xl font-light tracking-tight text-[#121212] pr-10">{panelMode === "create" ? "Add Schedule Rule" : "Update Rule"}</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <DismissibleError message={error} />
                            {panelMode === "create" && (
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Type</label>
                                    <select value={formType} onChange={(e) => setFormType(e.target.value as RuleType)} className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none">
                                        <option value="MAX_PER_MEETING">Max Per Meeting</option>
                                        <option value="MIN_LEADERS_PER_MEETING">Min Leaders Per Meeting</option>
                                        <option value="ROLE_FREQUENCY">Role Frequency</option>
                                    </select>
                                </div>
                            )}
                            {panelMode === "create" && formType === "ROLE_FREQUENCY" && (
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Target Lead Type</label>
                                    <select value={formTargetLeadType} onChange={(e) => setFormTargetLeadType(e.target.value)} className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none">
                                        <option value="">All Workers (default frequency)</option>
                                        <option value="HOD">Head of Department (HOD)</option>
                                        <option value="D_HOD">Assistant Lead (D-HOD)</option>
                                    </select>
                                    <p className="mt-1.5 text-[10px] text-[#8A817C] font-light">Leave as &quot;All Workers&quot; to set the default frequency for everyone, or pick a lead type to override it for that role.</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Value</label>
                                <input type="number" min={1} value={formValue} onChange={(e) => setFormValue(Number(e.target.value))} className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Description</label>
                                <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Describe this rule…" className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg" />
                            </div>
                            {panelMode === "edit" && (
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Status</label>
                                    <select value={formActive ? "active" : "inactive"} onChange={(e) => setFormActive(e.target.value === "active")} className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={panelMode === "create" ? handleCreate : handleUpdate} disabled={isSubmitting || !formDescription} className={primaryCls}>
                                    {isSubmitting ? "Saving…" : panelMode === "create" ? "Create" : "Save Changes"}
                                </button>
                                <button type="button" onClick={closePanel} className={secondaryCls}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Fixed Assignments Tab ────────────────────────────────────────────────────

function FixedAssignmentsTab({ hook, programId }: { hook: ReturnType<typeof usePrayer>; programId: string }) {
    const { fixedAssignments, dayConfigs, isLoading, isSubmitting, error, fetchFixedAssignments, fetchDayConfigs, createFixedAssignment, deleteFixedAssignment } = hook;
    const [showPanel, setShowPanel] = useState(false);
    const [workerProfileId, setWorkerProfileId] = useState("");
    const [workerDisplayName, setWorkerDisplayName] = useState("");
    const [dayConfigId, setDayConfigId] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => { fetchFixedAssignments(programId); fetchDayConfigs(programId); }, [fetchFixedAssignments, fetchDayConfigs, programId]);

    const filtered = fixedAssignments.filter((a) => {
        if (!search.trim()) return true;
        const name = `${a.workerProfile.member.firstname} ${a.workerProfile.member.lastname}`.toLowerCase();
        return name.includes(search.toLowerCase());
    });

    const handleCreate = async () => {
        if (!workerProfileId || !dayConfigId) return;
        try { await createFixedAssignment(programId, { workerProfileId, dayConfigId }); setShowPanel(false); } catch { /* surfaced */ }
    };
    const handleDelete = async (id: string) => {
        try { await deleteFixedAssignment(id); setDeletingId(null); } catch { /* surfaced */ }
    };

    const primaryCls = "h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors disabled:opacity-50";
    const secondaryCls = "h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">{filtered.length}{search ? ` of ${fixedAssignments.length}` : ""} fixed assignment{fixedAssignments.length !== 1 ? "s" : ""}</span>
                <button onClick={() => { setWorkerProfileId(""); setWorkerDisplayName(""); setDayConfigId(""); setShowPanel(true); }} className={`flex items-center gap-2 ${primaryCls}`}><Plus className="w-3.5 h-3.5" /> Add Assignment</button>
            </div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A817C] pointer-events-none" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by worker name…"
                    className="w-full sm:w-72 h-9 pl-9 pr-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg" />
                {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A817C] hover:text-[#121212]"><X className="w-3.5 h-3.5" /></button>}
            </div>
            <DismissibleError message={error} />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className={`${showPanel ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden`}>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                {["Worker", "Day", "Time", ""].map((h) => (
                                    <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                                : filtered.length === 0 ? <tr><td colSpan={4} className="p-12 text-center text-xs text-[#8A817C] font-light">{search ? "No assignments match your search." : "No fixed assignments yet."}</td></tr>
                                : filtered.map((a) => (
                                    <tr key={a.id} className="border-b border-[#121212]/5 hover:bg-[#F4F1EA]/30 transition-colors">
                                        <td className="p-4 text-sm text-[#121212] font-light">{a.workerProfile.member.firstname} {a.workerProfile.member.lastname}</td>
                                        <td className="p-4 text-sm text-[#121212] font-light">{dayName(a.dayConfig.dayOfWeek)}</td>
                                        <td className="p-4 text-sm text-[#121212] font-light font-mono">{a.dayConfig.startTime}</td>
                                        <td className="p-4"><button onClick={() => setDeletingId(a.id)} className="p-2 text-[#8A817C] hover:text-red-500 border border-transparent hover:border-red-100 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button></td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
                {showPanel && (
                    <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative overflow-hidden">
                        <button type="button" onClick={() => setShowPanel(false)} className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md z-10 transition-colors"><X className="w-4 h-4" /></button>
                        <div className="p-6 border-b border-[#121212]/5">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">New Assignment</div>
                            <h2 className="text-xl font-light tracking-tight text-[#121212] pr-10">Add Fixed Assignment</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <DismissibleError message={error} />
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Worker</label>
                                <AssigneeCombobox audience="WORKERS" displayName={workerDisplayName} onChange={(p, name) => { setWorkerProfileId(p.workerProfileId ?? ""); setWorkerDisplayName(name); }} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Day Config</label>
                                <select value={dayConfigId} onChange={(e) => setDayConfigId(e.target.value)} className="w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none">
                                    <option value="">Select a day config…</option>
                                    {dayConfigs.filter((d) => d.isActive).map((d) => (
                                        <option key={d.id} value={d.id}>{dayName(d.dayOfWeek)} — {d.startTime}–{d.endTime} ({d.mode})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={handleCreate} disabled={isSubmitting || !workerProfileId || !dayConfigId} className={primaryCls}>{isSubmitting ? "Saving…" : "Create"}</button>
                                <button type="button" onClick={() => setShowPanel(false)} className={secondaryCls}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {deletingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/40 backdrop-blur-sm">
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl w-full max-w-sm p-6 space-y-4">
                        <h3 className="text-base font-light tracking-tight text-[#121212]">Remove Fixed Assignment?</h3>
                        <p className="text-xs font-light text-[#8A817C]">This will permanently remove the fixed assignment.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeletingId(null)} className={secondaryCls}>Cancel</button>
                            <button onClick={() => handleDelete(deletingId)} disabled={isSubmitting} className="h-9 px-4 bg-red-500 text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">{isSubmitting ? "Removing…" : "Remove"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Roster Tab ───────────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function RosterTab({
    hook,
    programId,
    program,
}: {
    hook: ReturnType<typeof usePrayer>;
    programId: string;
    program: PrayerProgram;
}) {
    const { roster, isLoading, isSubmitting, error, fetchRoster, generateMeetings, openSelection, closeSelection, autoAssign, manualAssign, removeEntry, validateRoster, rescheduleEntry } = hook;

    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [filterSelStatus, setFilterSelStatus] = useState("ALL");
    const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
    const [autoAssignResult, setAutoAssignResult] = useState<AutoAssignResult | null>(null);
    const [selectedMeeting, setSelectedMeeting] = useState<PrayerMeeting | null>(null);
    const [reschedulingEntryId, setReschedulingEntryId] = useState<string | null>(null);
    const [rescheduleTarget, setRescheduleTarget] = useState("");
    const [showAssignPanel, setShowAssignPanel] = useState(false);
    const [assignPayload, setAssignPayload] = useState<{ workerProfileId?: string; memberId?: string }>({});
    const [assignDisplayName, setAssignDisplayName] = useState("");
    const [removingEntryId, setRemovingEntryId] = useState<string | null>(null);

    const load = useCallback(() => { fetchRoster(programId, month, year); }, [fetchRoster, programId, month, year]);
    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (selectedMeeting) {
            const updated = roster.find((m) => m.id === selectedMeeting.id);
            setSelectedMeeting(updated ?? null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roster]);

    const handleGenerate = async () => { try { await generateMeetings(programId, month, year); load(); } catch {} };
    const handleOpenSelection = async () => { try { await openSelection(programId, month, year); load(); } catch {} };
    const handleCloseSelection = async () => { try { await closeSelection(programId, month, year); load(); } catch {} };

    const handleAutoAssign = async () => {
        setAutoAssignResult(null);
        try {
            const result = await autoAssign(programId, month, year);
            setAutoAssignResult(result);
            load();
        } catch {}
    };

    const handleValidate = async () => {
        setValidationReport(null);
        try { const r = await validateRoster(programId, month, year); setValidationReport(r); } catch {}
    };

    const handleManualAssign = async () => {
        if (!selectedMeeting || (!assignPayload.workerProfileId && !assignPayload.memberId)) return;
        try {
            await manualAssign(programId, { meetingId: selectedMeeting.id, ...assignPayload });
            setShowAssignPanel(false); setAssignPayload({}); setAssignDisplayName("");
            load();
        } catch {}
    };

    const handleRemoveEntry = async (entryId: string) => {
        try { await removeEntry(entryId); setRemovingEntryId(null); load(); } catch {}
    };

    const handleReschedule = async (entryId: string, newMeetingId: string) => {
        if (!newMeetingId) return;
        try { await rescheduleEntry(entryId, newMeetingId); setReschedulingEntryId(null); setRescheduleTarget(""); load(); } catch {}
    };

    const exportCSV = () => {
        const lines = ["Meeting Date,Day,Time,Mode,Meeting Status,Selection Status,Assigned/Capacity,Assignee,Assignment Type,Entry Status"];
        for (const m of roster) {
            const date = new Date(m.date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
            const day = new Date(m.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short" });
            const time = `${m.dayConfig.startTime}-${m.dayConfig.endTime}`;
            const capacity = `${m.currentCapacity}/${m.dayConfig.maxCapacity}`;
            if (m.rosterEntries.length === 0) {
                lines.push(`"${date}",${day},${time},${m.dayConfig.mode},${m.status},${m.selectionStatus},${capacity},(no assignments),,`);
            } else {
                for (const e of m.rosterEntries) {
                    lines.push(`"${date}",${day},${time},${m.dayConfig.mode},${m.status},${m.selectionStatus},${capacity},"${entryDisplayName(e)}",${e.assignmentType},${e.status}`);
                }
            }
        }
        const blob = new Blob([lines.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `prayer-roster-${MONTHS[month - 1]}-${year}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const filteredRoster = roster.filter((m) => {
        if (filterStatus !== "ALL" && m.status !== filterStatus) return false;
        if (filterSelStatus !== "ALL" && m.selectionStatus !== filterSelStatus) return false;
        return true;
    });

    const totalSlots = roster.reduce((s, m) => s + m.dayConfig.maxCapacity, 0);
    const filledSlots = roster.reduce((s, m) => s + m.currentCapacity, 0);
    const fillRate = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;
    const panelOpen = selectedMeeting !== null;

    const jumpToMonth = (offsetMonths: number) => {
        const d = new Date(year, month - 1 + offsetMonths, 1);
        setMonth(d.getMonth() + 1);
        setYear(d.getFullYear());
    };

    const hasGenerated = roster.length > 0;
    const selectionIsOpen = roster.some((m) => m.selectionStatus === "OPEN");
    const selectionWasClosed = hasGenerated && !selectionIsOpen && roster.some((m) => m.selectionStatus === "CLOSED");
    const allPending = hasGenerated && roster.every((m) => m.selectionStatus === "PENDING");

    type RosterStep = "generate" | "open-selection" | "close-selection" | "auto-assign" | "validate";
    const activeStep: RosterStep = !hasGenerated ? "generate"
        : allPending ? "open-selection"
        : selectionIsOpen ? "close-selection"
        : selectionWasClosed ? "auto-assign"
        : "validate";

    const stepLabels: Record<RosterStep, string> = {
        generate: "Generate meetings first",
        "open-selection": "Open for self-selection",
        "close-selection": "Close self-selection window",
        "auto-assign": program.audience === "MEMBERS" ? "Use manual assignment (auto-assign not available for member programs)" : "Auto-fill remaining slots",
        validate: "Validate the roster",
    };

    const primaryCls = "h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors disabled:opacity-50";
    const secondaryCls = "h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-50";

    const removable = (e: PrayerRosterEntry) =>
        e.assignmentType !== "FIXED" && e.status === "SCHEDULED";

    return (
        <div className="space-y-5">
            {/* Controls */}
            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Month</label>
                        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none">
                            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Year</label>
                        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} min={2020} max={2099} className="w-28 h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg" />
                    </div>
                    <div className="flex gap-1">
                        <button type="button" onClick={() => jumpToMonth(-1)} title="Previous month"
                            className="h-10 px-3 text-[#8A817C] border border-[#121212]/10 rounded-lg text-xs hover:bg-[#F4F1EA] hover:text-[#121212] transition-colors">← Prev</button>
                        <button type="button" onClick={() => { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); }} title="This month"
                            className="h-10 px-3 text-[#8A817C] border border-[#121212]/10 rounded-lg text-xs hover:bg-[#F4F1EA] hover:text-[#121212] transition-colors">Today</button>
                        <button type="button" onClick={() => jumpToMonth(1)} title="Next month"
                            className="h-10 px-3 text-[#8A817C] border border-[#121212]/10 rounded-lg text-xs hover:bg-[#F4F1EA] hover:text-[#121212] transition-colors">Next →</button>
                    </div>
                    <div className="flex-1" />
                    {roster.length > 0 && <button type="button" onClick={exportCSV} className={secondaryCls}>Export CSV</button>}
                </div>

                {/* Filters */}
                {roster.length > 0 && (
                    <div className="flex flex-wrap gap-3 pt-1 border-t border-[#121212]/5">
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Meeting Status</label>
                            <div className="flex gap-1">
                                {["ALL", "SCHEDULED", "COMPLETED", "CANCELLED"].map((s) => (
                                    <button key={s} type="button" onClick={() => setFilterStatus(s)}
                                        className={`h-7 px-3 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors ${filterStatus === s ? "bg-[#121212] text-white" : "border border-[#121212]/10 text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA]"}`}>
                                        {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Selection Status</label>
                            <div className="flex gap-1">
                                {["ALL", "PENDING", "OPEN", "CLOSED"].map((s) => (
                                    <button key={s} type="button" onClick={() => setFilterSelStatus(s)}
                                        className={`h-7 px-3 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors ${filterSelStatus === s ? "bg-[#121212] text-white" : "border border-[#121212]/10 text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA]"}`}>
                                        {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {(filterStatus !== "ALL" || filterSelStatus !== "ALL") && (
                            <div className="flex items-end">
                                <button type="button" onClick={() => { setFilterStatus("ALL"); setFilterSelStatus("ALL"); }}
                                    className="h-7 px-3 text-[10px] text-[#8A817C] hover:text-red-500 transition-colors">
                                    Clear filters
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-2 text-[11px] text-[#8A817C] font-light">
                    <span className="font-semibold text-[#121212] uppercase tracking-wider">Next:</span>
                    {stepLabels[activeStep]}
                </div>

                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={handleGenerate} disabled={isSubmitting} className={activeStep === "generate" ? primaryCls : secondaryCls}>Generate</button>
                    <button type="button" onClick={handleOpenSelection} disabled={isSubmitting} className={activeStep === "open-selection" ? primaryCls : secondaryCls}>Open Selection</button>
                    <button type="button" onClick={handleCloseSelection} disabled={isSubmitting} className={activeStep === "close-selection" ? primaryCls : secondaryCls}>Close Selection</button>
                    {program.audience !== "MEMBERS" && (
                        <button type="button" onClick={handleAutoAssign} disabled={isSubmitting} className={activeStep === "auto-assign" ? primaryCls : secondaryCls}>Auto-Assign</button>
                    )}
                    <button type="button" onClick={handleValidate} disabled={isSubmitting} className={activeStep === "validate" ? primaryCls : secondaryCls}>Validate</button>
                </div>
            </div>

            {/* Auto-assign result */}
            {autoAssignResult && (
                <div className={`bg-[#FFFFFF] border rounded-xl p-4 flex items-start gap-3 ${autoAssignResult.unassignable.length === 0 ? "border-green-200" : "border-amber-200"}`}>
                    {autoAssignResult.unassignable.length === 0
                        ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        : <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    }
                    <div className="flex-1">
                        <p className="text-sm font-light text-[#121212]">
                            <span className="font-semibold">{autoAssignResult.assigned}</span> assignment{autoAssignResult.assigned !== 1 ? "s" : ""} created.
                            {autoAssignResult.unassignable.length > 0 && (
                                <span className="text-amber-700"> {autoAssignResult.unassignable.filter((u) => !u.startsWith("meeting:")).length} worker{autoAssignResult.unassignable.filter((u) => !u.startsWith("meeting:")).length !== 1 ? "s" : ""} could not be fully assigned.</span>
                            )}
                        </p>
                        {autoAssignResult.unassignable.filter((u) => !u.startsWith("meeting:")).length > 0 && (
                            <div className="mt-2">
                                <p className="text-[11px] font-semibold text-amber-700 mb-1">Unassignable workers:</p>
                                <ul className="space-y-0.5">
                                    {autoAssignResult.unassignable
                                        .filter((u) => !u.startsWith("meeting:"))
                                        .map((u, i) => (
                                            <li key={i} className="text-[11px] text-[#8A817C] font-light">· {u}</li>
                                        ))
                                    }
                                </ul>
                                <p className="text-[11px] text-[#8A817C] mt-1.5">Use manual assignment to fill remaining gaps.</p>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setAutoAssignResult(null)} className="text-[#8A817C] hover:text-[#121212]"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Validation report */}
            {validationReport && (
                <div className={`bg-[#FFFFFF] border rounded-xl p-5 relative ${validationReport.valid ? "border-green-200" : "border-amber-200"}`}>
                    <button type="button" onClick={() => setValidationReport(null)} className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md transition-colors"><X className="w-4 h-4" /></button>
                    <div className="flex items-center gap-2 mb-3">
                        {validationReport.valid
                            ? <CheckCircle className="w-5 h-5 text-green-600" />
                            : <AlertCircle className="w-5 h-5 text-amber-500" />
                        }
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">Validation Report</div>
                            <h3 className="text-sm font-light text-[#121212]">
                                {MONTHS[month - 1]} {year} — {validationReport.valid ? "Roster is valid" : `${validationReport.issues.length} issue${validationReport.issues.length !== 1 ? "s" : ""} found`}
                            </h3>
                        </div>
                    </div>
                    {validationReport.issues.length > 0 && (
                        <ul className="space-y-1.5 mt-3 pr-8">
                            {validationReport.issues.map((issue, i) => (
                                <li key={i} className="text-xs text-[#121212] font-light flex items-start gap-2">
                                    <span className="text-amber-500 shrink-0 mt-0.5">•</span>
                                    {issue}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Stats */}
            {roster.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "Meetings", value: String(roster.length) },
                        { label: "Assignments", value: `${filledSlots} / ${totalSlots}` },
                        { label: "Fill Rate", value: `${fillRate}%` },
                    ].map((s) => (
                        <div key={s.label} className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-4">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">{s.label}</div>
                            <div className="text-2xl font-light text-[#121212]">{s.value}</div>
                        </div>
                    ))}
                </div>
            )}

            <DismissibleError message={error} />

            {/* Main content */}
            {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-[#F4F1EA] rounded-xl animate-pulse" />)}</div>
            ) : roster.length === 0 ? (
                <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-12 text-center text-xs text-[#8A817C] font-light">
                    No meetings for {MONTHS[month - 1]} {year}. Click &quot;Generate&quot; to create them.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    {/* Meeting table */}
                    <div className={`${panelOpen ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                        {["Date", "Time", "Mode", "Assigned", "Meeting", "Selection", ""].map((h) => (
                                            <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRoster.length === 0 ? (
                                        <tr><td colSpan={7} className="p-10 text-center text-xs text-[#8A817C] font-light">No meetings match the current filters.</td></tr>
                                    ) : filteredRoster.map((m) => {
                                        const isSelected = selectedMeeting?.id === m.id;
                                        return (
                                            <tr key={m.id} onClick={() => { setSelectedMeeting(isSelected ? null : m); setReschedulingEntryId(null); setRescheduleTarget(""); setShowAssignPanel(false); }}
                                                className={`border-b border-[#121212]/5 cursor-pointer transition-colors ${isSelected ? "bg-[#F4F1EA]/60" : "hover:bg-[#F4F1EA]/30"}`}>
                                                <td className="p-4 text-sm text-[#121212] font-light whitespace-nowrap">{new Date(m.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}</td>
                                                <td className="p-4 text-xs text-[#8A817C] font-light font-mono whitespace-nowrap">{m.dayConfig.startTime}–{m.dayConfig.endTime}</td>
                                                <td className="p-4">{modeBadge(m.dayConfig.mode)}</td>
                                                <td className="p-4">
                                                    <span className={`text-xs font-light ${m.currentCapacity >= m.dayConfig.maxCapacity ? "text-green-600" : "text-[#121212]"}`}>
                                                        {m.currentCapacity}/{m.dayConfig.maxCapacity}
                                                    </span>
                                                </td>
                                                <td className="p-4">{meetingStatusBadge(m.status)}</td>
                                                <td className="p-4">{selectionStatusBadge(m.selectionStatus)}</td>
                                                <td className="p-4"><ChevronDown className={`w-4 h-4 text-[#8A817C] transition-transform ${isSelected ? "rotate-180" : ""}`} /></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Detail panel */}
                    {panelOpen && selectedMeeting && (
                        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-[#121212]/5 relative">
                                <button type="button" onClick={() => { setSelectedMeeting(null); setReschedulingEntryId(null); setShowAssignPanel(false); }} className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md transition-colors"><X className="w-4 h-4" /></button>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Roster Detail</div>
                                <p className="text-base font-light text-[#121212] pr-8">{new Date(selectedMeeting.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}</p>
                                <p className="text-xs text-[#8A817C] font-light mt-0.5">{selectedMeeting.dayConfig.startTime}–{selectedMeeting.dayConfig.endTime} · {selectedMeeting.currentCapacity}/{selectedMeeting.dayConfig.maxCapacity} assigned</p>
                                <div className="flex gap-2 mt-2">{modeBadge(selectedMeeting.dayConfig.mode)}{meetingStatusBadge(selectedMeeting.status)}{selectionStatusBadge(selectedMeeting.selectionStatus)}</div>

                                {/* Manual assign button */}
                                {selectedMeeting.currentCapacity < selectedMeeting.dayConfig.maxCapacity && (
                                    <button type="button" onClick={() => { setShowAssignPanel(!showAssignPanel); setAssignPayload({}); setAssignDisplayName(""); }}
                                        className="mt-3 flex items-center gap-1.5 h-8 px-3 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors">
                                        <UserPlus className="w-3.5 h-3.5" />
                                        {showAssignPanel ? "Cancel" : "Assign Manually"}
                                    </button>
                                )}

                                {/* Inline assign form */}
                                {showAssignPanel && (
                                    <div className="mt-3 space-y-3 border-t border-[#121212]/5 pt-3">
                                        <AssigneeCombobox
                                            audience={program.audience}
                                            displayName={assignDisplayName}
                                            onChange={(p, name) => { setAssignPayload(p); setAssignDisplayName(name); }}
                                        />
                                        <button type="button" onClick={handleManualAssign}
                                            disabled={isSubmitting || (!assignPayload.workerProfileId && !assignPayload.memberId)}
                                            className="w-full h-9 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors disabled:opacity-50">
                                            {isSubmitting ? "Assigning…" : "Assign"}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto divide-y divide-[#121212]/5">
                                {selectedMeeting.rosterEntries.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-[#8A817C] font-light">
                                        <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                        No assignments yet.
                                    </div>
                                ) : (
                                    selectedMeeting.rosterEntries.map((entry) => (
                                        <div key={entry.id} className="px-5 py-3 space-y-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm text-[#121212] font-light">{entryDisplayName(entry)}</p>
                                                    <div className="flex gap-1.5 mt-1">
                                                        {assignmentTypeBadge(entry.assignmentType)}
                                                        {entry.status === "RESCHEDULED" && <Badge label="Rescheduled" color="bg-orange-50 text-orange-700 border-orange-200" />}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {removable(entry) && (
                                                        <button type="button" onClick={() => setRemovingEntryId(entry.id)}
                                                            className="h-7 w-7 flex items-center justify-center text-[#8A817C] hover:text-red-500 border border-transparent hover:border-red-100 hover:bg-red-50 rounded-lg transition-colors">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {entry.status === "SCHEDULED" && (
                                                        <button type="button" onClick={() => { setReschedulingEntryId(reschedulingEntryId === entry.id ? null : entry.id); setRescheduleTarget(""); }}
                                                            className="h-7 px-3 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors">
                                                            {reschedulingEntryId === entry.id ? "Cancel" : "Move"}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {reschedulingEntryId === entry.id && (
                                                <div className="flex items-center gap-2">
                                                    <select value={rescheduleTarget} onChange={(e) => setRescheduleTarget(e.target.value)} className="flex-1 h-8 px-2 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none">
                                                        <option value="">Move to meeting…</option>
                                                        {roster.filter((m) => m.id !== selectedMeeting.id).map((m) => (
                                                            <option key={m.id} value={m.id}>{new Date(m.date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · {m.dayConfig.startTime}</option>
                                                        ))}
                                                    </select>
                                                    <button type="button" onClick={() => handleReschedule(entry.id, rescheduleTarget)} disabled={!rescheduleTarget || isSubmitting}
                                                        className="h-8 px-3 bg-[#121212] text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-50 transition-colors shrink-0">
                                                        Move
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Remove entry confirm */}
            {removingEntryId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/40 backdrop-blur-sm">
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl w-full max-w-sm p-6 space-y-4">
                        <h3 className="text-base font-light tracking-tight text-[#121212]">Remove Assignment?</h3>
                        <p className="text-xs font-light text-[#8A817C]">This will remove the assignment and free the slot for re-assignment.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setRemovingEntryId(null)} className={secondaryCls}>Cancel</button>
                            <button onClick={() => handleRemoveEntry(removingEntryId)} disabled={isSubmitting}
                                className="h-9 px-4 bg-red-500 text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">
                                {isSubmitting ? "Removing…" : "Remove"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "roster" | "fixed-assignments" | "rules" | "day-configs";

const PRAYER_TABS: { key: Tab; label: string }[] = [
    { key: "roster", label: "Roster" },
    { key: "fixed-assignments", label: "Fixed Assignments" },
    { key: "rules", label: "Rules" },
    { key: "day-configs", label: "Day Configs" },
];

function PrayerPage() {
    const hook = usePrayer();
    const { programs, isLoading, fetchPrograms } = hook;
    const [activeTab, setActiveTab] = useState<Tab>("roster");
    const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
    const [showProgramManager, setShowProgramManager] = useState(false);

    useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

    // Auto-select the first active program
    useEffect(() => {
        if (!selectedProgramId && programs.length > 0) {
            const first = programs.find((p) => p.isActive) ?? programs[0];
            setSelectedProgramId(first.id);
        }
    }, [programs, selectedProgramId]);

    const selectedProgram = programs.find((p) => p.id === selectedProgramId) ?? null;

    const tabCls = (t: Tab) =>
        `px-4 py-2 text-[11px] font-semibold uppercase tracking-widest transition-colors rounded-lg ${activeTab === t ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`;

    return (
        <div className="space-y-8 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Events</p>
                    <h1 className="text-xl font-light tracking-tight text-[#121212]">Prayer Schedule</h1>
                </div>
                <button
                    onClick={() => setShowProgramManager(!showProgramManager)}
                    className="flex items-center gap-2 h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors self-start"
                >
                    <Plus className="w-3.5 h-3.5" />
                    {showProgramManager ? "Hide Programs" : "Manage Programs"}
                </button>
            </div>

            {/* Program manager */}
            {showProgramManager && (
                <ProgramsTab hook={hook} selectedProgramId={selectedProgramId} onSelect={(id) => { setSelectedProgramId(id); setShowProgramManager(false); }} />
            )}

            {/* Program selector */}
            {!showProgramManager && (
                <div className="space-y-3">
                    {isLoading && programs.length === 0 ? (
                        <div className="flex gap-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 w-32 bg-[#F4F1EA] rounded-xl animate-pulse" />)}</div>
                    ) : programs.length === 0 ? (
                        <div className="bg-[#F4F1EA]/60 border border-[#121212]/5 rounded-xl p-6 text-center">
                            <p className="text-xs text-[#8A817C] font-light mb-3">No prayer programs yet. Create your first one to get started.</p>
                            <button onClick={() => setShowProgramManager(true)} className="h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors">
                                Create Program
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {programs.map((p) => (
                                <button key={p.id} onClick={() => setSelectedProgramId(p.id)}
                                    className={`flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-light transition-colors border ${selectedProgramId === p.id ? "bg-[#121212] text-white border-[#121212]" : "bg-white text-[#121212] border-[#121212]/10 hover:border-[#121212]/30"} ${!p.isActive ? "opacity-50" : ""}`}>
                                    {p.name}
                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${selectedProgramId === p.id ? "bg-white/20 text-white" : "bg-[#F4F1EA] text-[#8A817C]"}`}>
                                        {p.audience}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Program content */}
            {selectedProgram && !showProgramManager && (
                <>
                    <div className="flex flex-wrap gap-1">
                        {PRAYER_TABS.map((t) => (
                            <button key={t.key} className={tabCls(t.key)} onClick={() => setActiveTab(t.key)}>{t.label}</button>
                        ))}
                    </div>

                    {activeTab === "roster" && <RosterTab hook={hook} programId={selectedProgram.id} program={selectedProgram} />}
                    {activeTab === "fixed-assignments" && <FixedAssignmentsTab hook={hook} programId={selectedProgram.id} />}
                    {activeTab === "rules" && <RulesTab hook={hook} programId={selectedProgram.id} />}
                    {activeTab === "day-configs" && <DayConfigsTab hook={hook} programId={selectedProgram.id} />}
                </>
            )}
        </div>
    );
}

export default withAuth(PrayerPage, { requiredPermission: 'prayer:read' });
