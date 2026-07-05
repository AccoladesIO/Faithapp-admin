"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Plus, Trash2, ChevronLeft, ChevronRight,
    ArrowUp, ArrowDown, Pencil, Check, X, FileText,
    Layers, CheckSquare, Square, RefreshCw, UserCircle,
    Download, Mic, Music, HandHeart, DollarSign,
    Megaphone, Star, HelpCircle, Coffee,
    Play, Pause, StepForward, StepBack, Square as SquareIcon, Radio,
} from "lucide-react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    useServiceProgramme,
    ServiceProgramme,
    ServiceProgrammeSlot,
    ServiceProgrammeTemplate,
    ServiceSlotOption,
    ServiceSlotType,
} from "@/hooks/use-service-programme";
import { api } from "@/utils/auth/axios-client";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { DismissibleError } from "@/components/ui/dismissible-error";
import {
    useServiceSession,
    SessionAnchor,
    PauseReason,
    PAUSE_REASON_LABELS,
    calcElapsedSeconds,
    formatMMSS,
} from "@/hooks/use-service-session";

// ─── Slot type config ─────────────────────────────────────────────────────────

const SLOT_TYPES: ServiceSlotType[] = [
    "SPEAKER", "WORSHIP", "PRAYER", "OFFERING",
    "ANNOUNCEMENT", "DEDICATION", "OTHER", "BREAK",
];

interface SlotTypeConfig {
    label: string;
    icon: React.ReactNode;
    border: string;
    bg: string;
    text: string;
    badge: string;
}

const SLOT_TYPE_CONFIG: Record<ServiceSlotType, SlotTypeConfig> = {
    SPEAKER:      { label: "Speaker",      icon: <Mic className="w-3.5 h-3.5" />,       border: "border-l-amber-500",  bg: "bg-amber-50/60",   text: "text-amber-800",  badge: "bg-amber-100 text-amber-800 border-amber-200" },
    WORSHIP:      { label: "Worship",      icon: <Music className="w-3.5 h-3.5" />,      border: "border-l-blue-500",   bg: "bg-blue-50/60",    text: "text-blue-800",   badge: "bg-blue-100 text-blue-800 border-blue-200" },
    PRAYER:       { label: "Prayer",       icon: <HandHeart className="w-3.5 h-3.5" />,  border: "border-l-purple-500", bg: "bg-purple-50/60",  text: "text-purple-800", badge: "bg-purple-100 text-purple-800 border-purple-200" },
    OFFERING:     { label: "Offering",     icon: <DollarSign className="w-3.5 h-3.5" />, border: "border-l-green-500",  bg: "bg-green-50/60",   text: "text-green-800",  badge: "bg-green-100 text-green-800 border-green-200" },
    ANNOUNCEMENT: { label: "Announcement", icon: <Megaphone className="w-3.5 h-3.5" />,  border: "border-l-gray-400",   bg: "bg-gray-50/60",    text: "text-gray-700",   badge: "bg-gray-100 text-gray-700 border-gray-200" },
    DEDICATION:   { label: "Dedication",   icon: <Star className="w-3.5 h-3.5" />,       border: "border-l-teal-500",   bg: "bg-teal-50/60",    text: "text-teal-800",   badge: "bg-teal-100 text-teal-800 border-teal-200" },
    OTHER:        { label: "Other",        icon: <HelpCircle className="w-3.5 h-3.5" />, border: "border-l-zinc-400",   bg: "bg-zinc-50/60",    text: "text-zinc-700",   badge: "bg-zinc-100 text-zinc-700 border-zinc-200" },
    BREAK:        { label: "Break",        icon: <Coffee className="w-3.5 h-3.5" />,     border: "border-l-slate-300",  bg: "bg-slate-50/40",   text: "text-slate-600",  badge: "bg-slate-100 text-slate-600 border-slate-200" },
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    DRAFT:     { label: "Draft",     cls: "bg-[#F4F1EA] text-[#8A817C] border-[#121212]/10" },
    LIVE:      { label: "Live",      cls: "bg-green-50 text-green-700 border-green-200" },
    COMPLETED: { label: "Completed", cls: "bg-blue-50 text-blue-700 border-blue-200" },
};

const STATUS_ORDER = ["DRAFT", "LIVE", "COMPLETED"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.DRAFT;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${cfg.cls}`}>
            {cfg.label}
        </span>
    );
}

function StatusFlow({ status }: { status: string }) {
    const idx = STATUS_ORDER.indexOf(status as typeof STATUS_ORDER[number]);
    return (
        <div className="flex items-center gap-1">
            {STATUS_ORDER.map((s, i) => {
                const done = i <= idx;
                const cfg = STATUS_CONFIG[s];
                return (
                    <React.Fragment key={s}>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${done ? cfg.cls : "bg-white text-[#8A817C]/40 border-[#121212]/5"}`}>
                            {cfg.label}
                        </span>
                        {i < STATUS_ORDER.length - 1 && (
                            <ChevronRight className={`w-3 h-3 ${done && i < idx ? "text-[#121212]/40" : "text-[#121212]/15"}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

function SlotTypeBadge({ type }: { type: ServiceSlotType }) {
    const cfg = SLOT_TYPE_CONFIG[type];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${cfg.badge}`}>
            {cfg.icon}
            {cfg.label}
        </span>
    );
}

function SkeletonRow({ cols }: { cols: number }) {
    return (
        <tr className="border-b border-[#121212]/5 animate-pulse">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="p-4"><div className="h-3 bg-[#F4F1EA] rounded w-3/4" /></td>
            ))}
        </tr>
    );
}

// ─── Member search combobox ───────────────────────────────────────────────────

interface MemberResult { id: string; firstname: string; lastname: string; email: string; }

function MemberSearchCombobox({ value, displayName, onChange }: {
    value: string; displayName: string;
    onChange: (id: string, name: string) => void;
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<MemberResult[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            const res = await api.get(`/members?page=1&limit=8&search=${encodeURIComponent(q)}`);
            const list: MemberResult[] = res.data?.data?.data ?? [];
            setResults(list);
            setOpen(list.length > 0);
        } catch { setResults([]); } finally { setLoading(false); }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setQuery(q);
        if (!q) onChange("", "");
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(q), 300);
    };

    const handleSelect = (m: MemberResult) => {
        onChange(m.id, `${m.firstname} ${m.lastname}`);
        setQuery(""); setResults([]); setOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            {displayName ? (
                <div className="flex items-center gap-2 h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 rounded-lg">
                    <UserCircle className="w-3.5 h-3.5 text-[#8A817C] shrink-0" />
                    <span className="text-xs text-[#121212] font-light flex-1 truncate">{displayName}</span>
                    <button type="button" onClick={() => onChange("", "")} className="text-[#8A817C] hover:text-[#121212]"><X className="w-3 h-3" /></button>
                </div>
            ) : (
                <div className="relative">
                    <input
                        type="text" value={query} onChange={handleInput}
                        onFocus={() => results.length > 0 && setOpen(true)}
                        placeholder="Search member…"
                        className="w-full h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light rounded-lg focus:outline-none focus:border-[#121212]"
                    />
                    {loading && <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#8A817C] animate-spin pointer-events-none" />}
                </div>
            )}
            {open && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#121212]/10 rounded-xl shadow-lg z-20 overflow-hidden max-h-48 overflow-y-auto">
                    {results.map((m) => (
                        <button key={m.id} type="button" onMouseDown={(e) => { e.preventDefault(); handleSelect(m); }}
                            className="w-full text-left px-3 py-2 hover:bg-[#F4F1EA]/60 transition-colors border-b border-[#121212]/5 last:border-0">
                            <div className="text-xs text-[#121212] font-light">{m.firstname} {m.lastname}</div>
                            <div className="text-[10px] text-[#8A817C]">{m.email}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Slot draft ───────────────────────────────────────────────────────────────

interface SlotDraft {
    type: ServiceSlotType;
    topic: string;
    personType: "member" | "guest";
    memberId: string;
    memberName: string;
    guestName: string;
    allocatedMinutes: number;
}

const DEFAULT_SLOT_DRAFT: SlotDraft = {
    type: "SPEAKER", topic: "", personType: "member",
    memberId: "", memberName: "", guestName: "", allocatedMinutes: 10,
};

// ─── Edit Slot Modal ──────────────────────────────────────────────────────────

function EditSlotModal({
    slot,
    onSave,
    onClose,
    isSubmitting,
}: {
    slot: ServiceProgrammeSlot;
    onSave: (dto: { type: ServiceSlotType; topic: string; allocatedMinutes: number; memberId: string | null; guestName: string | null }) => void;
    onClose: () => void;
    isSubmitting: boolean;
}) {
    const [type, setType] = useState<ServiceSlotType>(slot.type);
    const [topic, setTopic] = useState(slot.topic ?? "");
    const [allocatedMinutes, setAllocatedMinutes] = useState(slot.allocatedMinutes);
    const [personType, setPersonType] = useState<"member" | "guest">(slot.memberId ? "member" : "guest");
    const [memberId, setMemberId] = useState(slot.memberId ?? "");
    const [memberName, setMemberName] = useState(slot.memberName ?? "");
    const [guestName, setGuestName] = useState(slot.guestName ?? "");

    const handleSave = () => {
        onSave({
            type, topic, allocatedMinutes,
            memberId: personType === "member" ? memberId || null : null,
            guestName: personType === "guest" ? guestName || null : null,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/40 backdrop-blur-sm">
            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl w-full max-w-md flex flex-col shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-[#121212]/5">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">Edit Slot</p>
                        <h2 className="text-base font-light tracking-tight text-[#121212]">Position {slot.position + 1}</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 rounded-md transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Type</label>
                            <select value={type} onChange={(e) => setType(e.target.value as ServiceSlotType)}
                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light rounded-lg focus:outline-none focus:border-[#121212] appearance-none">
                                {SLOT_TYPES.map((t) => <option key={t} value={t}>{SLOT_TYPE_CONFIG[t].label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Duration (min)</label>
                            <input type="number" min={1} value={allocatedMinutes}
                                onChange={(e) => setAllocatedMinutes(Number(e.target.value))}
                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light rounded-lg focus:outline-none focus:border-[#121212]" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Topic / Title</label>
                        <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., Opening Worship"
                            className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light rounded-lg focus:outline-none focus:border-[#121212]" />
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Handled by</label>
                        <div className="flex gap-1 mb-2">
                            {(["member", "guest"] as const).map((pt) => (
                                <button key={pt} type="button" onClick={() => setPersonType(pt)}
                                    className={`h-7 px-3 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${personType === pt ? "bg-[#121212] text-white" : "border border-[#121212]/10 text-[#8A817C] hover:text-[#121212]"}`}>
                                    {pt === "member" ? "Church Member" : "Guest"}
                                </button>
                            ))}
                        </div>
                        {personType === "member" ? (
                            <MemberSearchCombobox value={memberId} displayName={memberName}
                                onChange={(id, name) => { setMemberId(id); setMemberName(name); }} />
                        ) : (
                            <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)}
                                placeholder="Guest name"
                                className="w-full h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light rounded-lg focus:outline-none focus:border-[#121212]" />
                        )}
                    </div>
                </div>

                <div className="px-5 py-4 border-t border-[#121212]/5 flex justify-end gap-3">
                    <button onClick={onClose}
                        className="h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={isSubmitting}
                        className="flex items-center gap-2 h-9 px-5 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-50 transition-colors">
                        {isSubmitting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Apply template modal ─────────────────────────────────────────────────────

function ApplyTemplateModal({
    templates, onClose, onApply, isSubmitting,
}: {
    templates: ServiceProgrammeTemplate[]; onClose: () => void;
    onApply: (id: string) => void; isSubmitting: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/40 backdrop-blur-sm">
            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl w-full max-w-sm flex flex-col shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-[#121212]/5">
                    <h2 className="text-base font-light tracking-tight text-[#121212]">Apply Template</h2>
                    <button onClick={onClose} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 rounded-md"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 max-h-80">
                    {templates.length === 0 ? (
                        <p className="text-xs text-[#8A817C] font-light text-center py-6">No templates saved yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {templates.map((t) => (
                                <button key={t.id} onClick={() => onApply(t.id)} disabled={isSubmitting}
                                    className="w-full text-left px-4 py-3 rounded-xl border border-[#121212]/10 hover:bg-[#F4F1EA]/40 transition-colors disabled:opacity-50">
                                    <div className="text-xs font-light text-[#121212]">{t.serviceSlotName ?? "Unnamed slot"}</div>
                                    <div className="text-[10px] text-[#8A817C] mt-0.5">{t.slots?.length ?? 0} slot{t.slots?.length !== 1 ? "s" : ""}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Slot card ────────────────────────────────────────────────────────────────

function SlotCard({
    slot, isFirst, isLast, onMoveUp, onMoveDown, onEdit, onDelete, isSubmitting, isDraft,
}: {
    slot: ServiceProgrammeSlot; isFirst: boolean; isLast: boolean;
    onMoveUp: () => void; onMoveDown: () => void; onEdit: () => void;
    onDelete: () => void; isSubmitting: boolean; isDraft: boolean;
}) {
    const cfg = SLOT_TYPE_CONFIG[slot.type];
    const speaker = slot.memberName ?? slot.guestName;

    return (
        <div className={`flex items-start gap-3 p-3 rounded-xl border-l-4 border border-[#121212]/5 ${cfg.border} ${cfg.bg} transition-colors group`}>
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white border border-[#121212]/10 text-[10px] font-bold text-[#121212] shrink-0 mt-0.5">
                {slot.position + 1}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <SlotTypeBadge type={slot.type} />
                    {slot.topic && <span className="text-xs font-light text-[#121212] truncate">{slot.topic}</span>}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-[#8A817C] font-light">
                    {speaker && (
                        <span className="flex items-center gap-1">
                            <UserCircle className="w-3 h-3" />{speaker}
                        </span>
                    )}
                    <span className="text-[#121212]/30">·</span>
                    <span>{slot.allocatedMinutes} min</span>
                </div>
            </div>
            {isDraft && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={onMoveUp} disabled={isFirst || isSubmitting} title="Move up"
                        className="p-1.5 text-[#8A817C] hover:text-[#121212] disabled:opacity-20 transition-colors">
                        <ArrowUp className="w-3 h-3" />
                    </button>
                    <button onClick={onMoveDown} disabled={isLast || isSubmitting} title="Move down"
                        className="p-1.5 text-[#8A817C] hover:text-[#121212] disabled:opacity-20 transition-colors">
                        <ArrowDown className="w-3 h-3" />
                    </button>
                    <button onClick={onEdit} title="Edit"
                        className="p-1.5 text-[#8A817C] hover:text-[#121212] transition-colors">
                        <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={onDelete} disabled={isSubmitting} title="Delete"
                        className="p-1.5 text-[#8A817C] hover:text-red-500 disabled:opacity-20 transition-colors">
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Live session controls ────────────────────────────────────────────────────

interface LiveSessionSectionProps {
    anchor: SessionAnchor;
    sessionCode: string;
    startedAt: string;
    slots: ServiceProgrammeSlot[];
    isSubmitting: boolean;
    error: string | null;
    onAdvance: () => void;
    onRewind: () => void;
    onPause: (reason: PauseReason) => void;
    onResume: () => void;
    onEnd: () => void;
}

function LiveSessionSection({
    anchor, sessionCode, startedAt, slots, isSubmitting, error,
    onAdvance, onRewind, onPause, onResume, onEnd,
}: LiveSessionSectionProps) {
    const [nowMs, setNowMs] = useState(() => Date.now());
    const [showPause, setShowPause] = useState(false);
    const [pauseReason, setPauseReason] = useState<PauseReason>("TECHNICAL_ISSUE");
    const [showEndConfirm, setShowEndConfirm] = useState(false);

    useEffect(() => {
        if (anchor.isPaused) return;
        const id = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(id);
    }, [anchor.isPaused]);

    const currentSlot = slots.find((s) => s.position === anchor.currentSlotPosition);
    const elapsed = calcElapsedSeconds(anchor, nowMs);
    const allocated = (currentSlot?.allocatedMinutes ?? 0) * 60;
    const isOverrun = elapsed > allocated && allocated > 0;
    const isLastSlot = anchor.currentSlotPosition >= slots.length - 1;
    const cfg = currentSlot ? SLOT_TYPE_CONFIG[currentSlot.type] : null;

    const handlePauseConfirm = () => {
        onPause(pauseReason);
        setShowPause(false);
    };

    return (
        <div className="border-b border-[#121212]/5">
            {/* Session header */}
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 animate-pulse">
                        <Radio className="w-2.5 h-2.5" /> Live
                    </span>
                    <span className="text-[10px] font-mono text-[#8A817C]">{sessionCode}</span>
                </div>
                <span className="text-[10px] text-[#8A817C] font-light">
                    Started {new Date(startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
            </div>

            <DismissibleError message={error} />

            {/* Current slot card */}
            {currentSlot && (
                <div className={`mx-5 mb-3 p-3 rounded-xl border-l-4 ${cfg?.border ?? ""} ${cfg?.bg ?? "bg-[#F4F1EA]/40"} border border-[#121212]/5`}>
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                            {cfg && <SlotTypeBadge type={currentSlot.type} />}
                            <span className="text-[10px] font-mono text-[#8A817C]">
                                {anchor.currentSlotPosition + 1} / {slots.length}
                            </span>
                        </div>
                        <div className={`text-base font-mono font-semibold tabular-nums ${isOverrun ? "text-red-600" : anchor.isPaused ? "text-amber-600" : "text-[#121212]"}`}>
                            {formatMMSS(elapsed)}
                            <span className="text-[10px] font-sans font-light text-[#8A817C] ml-1">/ {currentSlot.allocatedMinutes}m</span>
                        </div>
                    </div>
                    <p className="text-xs text-[#121212] font-light truncate">
                        {currentSlot.topic ?? <span className="text-[#8A817C] italic">No topic</span>}
                    </p>
                    {(currentSlot.memberName || currentSlot.guestName) && (
                        <p className="text-[11px] text-[#8A817C] mt-0.5 truncate">
                            {currentSlot.memberName ?? currentSlot.guestName}
                        </p>
                    )}
                    {anchor.isPaused && (
                        <p className="text-[10px] text-amber-600 font-semibold mt-1 uppercase tracking-widest">⏸ Paused</p>
                    )}
                </div>
            )}

            {/* Pause reason picker */}
            {showPause && (
                <div className="mx-5 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-800">Pause reason</p>
                    <select
                        value={pauseReason}
                        onChange={(e) => setPauseReason(e.target.value as PauseReason)}
                        className="w-full h-9 px-3 bg-white border border-amber-200 text-xs text-[#121212] rounded-lg focus:outline-none appearance-none"
                    >
                        {(Object.keys(PAUSE_REASON_LABELS) as PauseReason[]).map((r) => (
                            <option key={r} value={r}>{PAUSE_REASON_LABELS[r]}</option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                        <button onClick={() => setShowPause(false)}
                            className="flex-1 h-8 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] transition-colors">
                            Cancel
                        </button>
                        <button onClick={handlePauseConfirm} disabled={isSubmitting}
                            className="flex-1 h-8 bg-amber-500 text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors">
                            Confirm Pause
                        </button>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="px-5 pb-4 flex items-center gap-2">
                <button onClick={onRewind} disabled={isSubmitting || anchor.currentSlotPosition === 0}
                    title="Previous slot"
                    className="flex items-center gap-1 h-9 px-3 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] disabled:opacity-30 transition-colors">
                    <StepBack className="w-3.5 h-3.5" />
                </button>

                {anchor.isPaused ? (
                    <button onClick={onResume} disabled={isSubmitting}
                        className="flex items-center gap-1.5 h-9 px-3 bg-green-600 text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                        <Play className="w-3.5 h-3.5" /> Resume
                    </button>
                ) : (
                    <button onClick={() => setShowPause(true)} disabled={isSubmitting || showPause}
                        className="flex items-center gap-1.5 h-9 px-3 border border-amber-200 text-amber-700 text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:bg-amber-50 disabled:opacity-30 transition-colors">
                        <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                )}

                <button onClick={onAdvance} disabled={isSubmitting || isLastSlot}
                    title="Next slot"
                    className="flex items-center gap-1 h-9 px-3 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] disabled:opacity-30 transition-colors">
                    <StepForward className="w-3.5 h-3.5" />
                </button>

                <div className="flex-1" />

                {showEndConfirm ? (
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-red-600 font-semibold">End session?</span>
                        <button onClick={onEnd} disabled={isSubmitting}
                            className="h-8 px-2 text-[10px] font-bold uppercase text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50">Yes</button>
                        <button onClick={() => setShowEndConfirm(false)} className="h-8 px-2 text-[10px] text-[#8A817C] border border-[#121212]/10 rounded hover:bg-[#F4F1EA]">No</button>
                    </div>
                ) : (
                    <button onClick={() => setShowEndConfirm(true)} disabled={isSubmitting}
                        className="flex items-center gap-1.5 h-9 px-3 border border-red-200 text-red-600 text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:bg-red-50 disabled:opacity-30 transition-colors">
                        <SquareIcon className="w-3 h-3 fill-red-500 text-red-500" /> End
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Programme detail panel ───────────────────────────────────────────────────

function ProgrammeDetailPanel({
    programmeId,
    onClose,
    hook,
}: {
    programmeId: string;
    onClose: () => void;
    hook: ReturnType<typeof useServiceProgramme>;
}) {
    const {
        fetchProgramme, addSlot, updateSlot, deleteSlot, reorderSlots,
        fetchTemplates, applyTemplate, deleteProgramme, templates, isSubmitting,
    } = hook;

    const [programme, setProgramme] = useState<ServiceProgramme | null>(null);
    const [loading, setLoading] = useState(true);
    const [panelError, setPanelError] = useState<string | null>(null);
    const [editingSlot, setEditingSlot] = useState<ServiceProgrammeSlot | null>(null);
    const [showAddSlot, setShowAddSlot] = useState(false);
    const [newSlot, setNewSlot] = useState<SlotDraft>(DEFAULT_SLOT_DRAFT);
    const [showApplyTemplate, setShowApplyTemplate] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pendingDeleteSlotId, setPendingDeleteSlotId] = useState<string | null>(null);

    const {
        anchor, session: liveSession, isSubmitting: sessionSubmitting, error: sessionError,
        startSession, fetchLatestSession, fetchState, advance, rewind, pauseSession, resumeSession, endSession,
    } = useServiceSession();

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const p = await fetchProgramme(programmeId);
            setProgramme(p);
        } catch {
            setPanelError("Failed to load programme.");
        } finally {
            setLoading(false);
        }
    }, [fetchProgramme, programmeId]);

    useEffect(() => { reload(); }, [reload]);

    useEffect(() => {
        if (programme?.status === "LIVE") {
            fetchLatestSession(programmeId).then((s) => {
                if (s?.sessionCode) fetchState(s.sessionCode);
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [programme?.status]);

    const isDraft = programme?.status === "DRAFT";
    const isLive = programme?.status === "LIVE";

    const handleStartSession = async () => {
        setPanelError(null);
        try {
            await startSession(programmeId);
            await reload();
        } catch (err: any) { setPanelError(err?.message ?? "Failed to start session."); }
    };

    const handleAdvance = async () => {
        if (!liveSession?.sessionCode) return;
        await advance(liveSession.sessionCode);
    };

    const handleRewind = async () => {
        if (!liveSession?.sessionCode) return;
        await rewind(liveSession.sessionCode);
    };

    const handlePause = async (reason: PauseReason) => {
        if (!liveSession?.sessionCode) return;
        await pauseSession(liveSession.sessionCode, reason);
    };

    const handleResume = async () => {
        if (!liveSession?.sessionCode) return;
        await resumeSession(liveSession.sessionCode);
    };

    const handleEnd = async () => {
        if (!liveSession?.sessionCode) return;
        await endSession(liveSession.sessionCode);
        await reload();
    };

    const downloadPdf = async () => {
        try {
            const res = await api.get(`/service-programme/${programmeId}/pdf`, { responseType: "blob" });
            const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
            const a = document.createElement("a");
            a.href = url; a.download = `programme-${programmeId}.pdf`; a.click();
            URL.revokeObjectURL(url);
        } catch {
            setPanelError("Failed to download PDF.");
        }
    };

    const handleMoveUp = async (index: number) => {
        if (!programme || index === 0) return;
        const reordered = [...programme.slots];
        [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
        setProgramme((p) => p ? { ...p, slots: reordered } : p);
        try { await reorderSlots(programmeId, reordered.map((s) => s.id)); } catch { reload(); }
    };

    const handleMoveDown = async (index: number) => {
        if (!programme) return;
        const reordered = [...programme.slots];
        if (index === reordered.length - 1) return;
        [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
        setProgramme((p) => p ? { ...p, slots: reordered } : p);
        try { await reorderSlots(programmeId, reordered.map((s) => s.id)); } catch { reload(); }
    };

    const handleSaveSlot = async (dto: Parameters<typeof updateSlot>[2]) => {
        if (!editingSlot) return;
        setPanelError(null);
        try {
            await updateSlot(programmeId, editingSlot.id, dto);
            setEditingSlot(null);
            await reload();
        } catch (err: any) { setPanelError(err?.message ?? "Failed to update slot."); }
    };

    const handleDeleteSlot = async (slotId: string) => {
        setPanelError(null);
        try { await deleteSlot(programmeId, slotId); await reload(); }
        catch (err: any) { setPanelError(err?.message ?? "Failed to delete slot."); }
    };

    const handleAddSlot = async () => {
        setPanelError(null);
        try {
            await addSlot(programmeId, {
                type: newSlot.type,
                topic: newSlot.topic || undefined,
                memberId: newSlot.personType === "member" ? newSlot.memberId || undefined : undefined,
                guestName: newSlot.personType === "guest" ? newSlot.guestName || undefined : undefined,
                allocatedMinutes: newSlot.allocatedMinutes,
            });
            setShowAddSlot(false);
            setNewSlot(DEFAULT_SLOT_DRAFT);
            await reload();
        } catch (err: any) { setPanelError(err?.message ?? "Failed to add slot."); }
    };

    const handleApplyTemplate = async (templateId: string) => {
        setPanelError(null);
        try {
            const updated = await applyTemplate(programmeId, templateId);
            setProgramme(updated);
            setShowApplyTemplate(false);
        } catch (err: any) { setPanelError(err?.message ?? "Failed to apply template."); }
    };

    const handleOpenApplyTemplate = async () => { await fetchTemplates(); setShowApplyTemplate(true); };

    const handleDeleteProgramme = async () => {
        setPanelError(null);
        try { await deleteProgramme(programmeId); onClose(); }
        catch (err: any) { setPanelError(err?.message ?? "Failed to delete."); }
    };

    if (loading) {
        return (
            <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 space-y-3 animate-pulse">
                {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-[#F4F1EA] rounded-xl" />)}
            </div>
        );
    }

    if (!programme) {
        return (
            <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5">
                <p className="text-xs text-red-500">{panelError ?? "Not found."}</p>
            </div>
        );
    }

    const slots = programme.slots ?? [];
    const totalMinutes = slots.reduce((s, sl) => s + sl.allocatedMinutes, 0);

    return (
        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
            {/* Panel header */}
            <div className="px-5 py-4 border-b border-[#121212]/5">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-0.5">Programme</p>
                        <h2 className="text-sm font-light text-[#121212] truncate">
                            {programme.serviceSlotName ?? programme.serviceSlotId}
                        </h2>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button onClick={downloadPdf} title="Download PDF"
                            className="p-2 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 hover:border-[#121212]/20 rounded-lg transition-colors">
                            <Download className="w-3.5 h-3.5" />
                        </button>
                        {isDraft && (
                            <button onClick={() => setShowDeleteConfirm(true)} title="Delete"
                                className="p-2 text-[#8A817C] hover:text-red-500 border border-[#121212]/10 hover:border-red-200 rounded-lg transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button onClick={onClose}
                            className="p-2 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 rounded-lg transition-colors">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
                <StatusFlow status={programme.status} />
            </div>

            <DismissibleError message={panelError} />

            {/* Live session controls */}
            {isLive && anchor && liveSession && (
                <LiveSessionSection
                    anchor={anchor}
                    sessionCode={liveSession.sessionCode}
                    startedAt={liveSession.startedAt}
                    slots={slots}
                    isSubmitting={sessionSubmitting}
                    error={sessionError}
                    onAdvance={handleAdvance}
                    onRewind={handleRewind}
                    onPause={handlePause}
                    onResume={handleResume}
                    onEnd={handleEnd}
                />
            )}

            {/* Slots */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {slots.length === 0 ? (
                    <div className="py-10 text-center text-xs text-[#8A817C] font-light">
                        No slots yet.{isDraft ? " Add the first slot below." : ""}
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">
                                Order of Service · {slots.length} slot{slots.length !== 1 ? "s" : ""} · {totalMinutes} min total
                            </span>
                            {isDraft && (
                                <button onClick={handleOpenApplyTemplate}
                                    className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#8A817C] hover:text-[#121212] transition-colors">
                                    <Layers className="w-3 h-3" /> Template
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {slots.map((slot, i) => (
                                <div key={slot.id} className={isLive && anchor && slot.position === anchor.currentSlotPosition ? "ring-2 ring-red-400 ring-offset-1 rounded-xl" : ""}>
                                    <SlotCard
                                        slot={slot}
                                        isFirst={i === 0}
                                        isLast={i === slots.length - 1}
                                        onMoveUp={() => handleMoveUp(i)}
                                        onMoveDown={() => handleMoveDown(i)}
                                        onEdit={() => setEditingSlot(slot)}
                                        onDelete={() => setPendingDeleteSlotId(slot.id)}
                                        isSubmitting={isSubmitting}
                                        isDraft={isDraft}
                                    />
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Add slot form (DRAFT only) */}
            {isDraft && (
                <div className="border-t border-[#121212]/5 px-5 py-4">
                    {showAddSlot ? (
                        <div className="space-y-3 bg-[#F4F1EA]/30 border border-[#121212]/5 rounded-xl p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">Add Slot</p>
                            <div className="grid grid-cols-2 gap-2">
                                <select value={newSlot.type} onChange={(e) => setNewSlot((s) => ({ ...s, type: e.target.value as ServiceSlotType }))}
                                    className="h-9 px-2 bg-white border border-[#121212]/10 text-xs text-[#121212] font-light rounded-lg focus:outline-none focus:border-[#121212] appearance-none">
                                    {SLOT_TYPES.map((t) => <option key={t} value={t}>{SLOT_TYPE_CONFIG[t].label}</option>)}
                                </select>
                                <input type="number" min={1} value={newSlot.allocatedMinutes}
                                    onChange={(e) => setNewSlot((s) => ({ ...s, allocatedMinutes: Number(e.target.value) }))}
                                    className="h-9 px-2 bg-white border border-[#121212]/10 text-xs text-[#121212] font-light rounded-lg focus:outline-none focus:border-[#121212]"
                                    placeholder="Minutes" />
                            </div>
                            <input type="text" placeholder="Topic / title" value={newSlot.topic}
                                onChange={(e) => setNewSlot((s) => ({ ...s, topic: e.target.value }))}
                                className="w-full h-9 px-3 bg-white border border-[#121212]/10 text-xs text-[#121212] font-light rounded-lg focus:outline-none focus:border-[#121212]" />
                            <div>
                                <div className="flex gap-1 mb-2">
                                    {(["member", "guest"] as const).map((pt) => (
                                        <button key={pt} type="button" onClick={() => setNewSlot((s) => ({ ...s, personType: pt, memberId: "", memberName: "", guestName: "" }))}
                                            className={`h-6 px-2 text-[10px] font-semibold uppercase tracking-wider rounded transition-colors ${newSlot.personType === pt ? "bg-[#121212] text-white" : "border border-[#121212]/10 text-[#8A817C] hover:text-[#121212]"}`}>
                                            {pt === "member" ? "Member" : "Guest"}
                                        </button>
                                    ))}
                                </div>
                                {newSlot.personType === "member" ? (
                                    <MemberSearchCombobox value={newSlot.memberId} displayName={newSlot.memberName}
                                        onChange={(id, name) => setNewSlot((s) => ({ ...s, memberId: id, memberName: name }))} />
                                ) : (
                                    <input type="text" placeholder="Guest name" value={newSlot.guestName}
                                        onChange={(e) => setNewSlot((s) => ({ ...s, guestName: e.target.value }))}
                                        className="w-full h-9 px-3 bg-white border border-[#121212]/10 text-xs text-[#121212] font-light rounded-lg focus:outline-none focus:border-[#121212]" />
                                )}
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => { setShowAddSlot(false); setNewSlot(DEFAULT_SLOT_DRAFT); }}
                                    className="h-8 px-3 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleAddSlot} disabled={isSubmitting}
                                    className="flex items-center gap-1.5 h-8 px-3 bg-[#121212] text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-50 transition-colors">
                                    {isSubmitting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                    Add
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <button onClick={() => setShowAddSlot(true)}
                                className="w-full flex items-center justify-center gap-2 h-9 border border-dashed border-[#121212]/20 text-[#8A817C] text-[11px] font-semibold uppercase tracking-wider rounded-xl hover:text-[#121212] hover:border-[#121212]/40 transition-colors">
                                <Plus className="w-3.5 h-3.5" /> Add Slot
                            </button>
                            {slots.length > 0 && (
                                <button onClick={handleStartSession} disabled={isSubmitting || sessionSubmitting}
                                    className="w-full flex items-center justify-center gap-2 h-9 bg-red-600 text-white text-[11px] font-semibold uppercase tracking-wider rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
                                    {sessionSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                    Start Session
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            {editingSlot && (
                <EditSlotModal slot={editingSlot} isSubmitting={isSubmitting}
                    onSave={handleSaveSlot} onClose={() => setEditingSlot(null)} />
            )}
            {showApplyTemplate && (
                <ApplyTemplateModal templates={templates} isSubmitting={isSubmitting}
                    onApply={handleApplyTemplate} onClose={() => setShowApplyTemplate(false)} />
            )}
            {showDeleteConfirm && (
                <ConfirmModal
                    title="Delete programme?"
                    message="All slots will be permanently deleted. This cannot be undone."
                    confirmLabel="Delete programme"
                    onConfirm={handleDeleteProgramme}
                    onCancel={() => setShowDeleteConfirm(false)}
                    isSubmitting={isSubmitting}
                />
            )}
            {pendingDeleteSlotId && (
                <ConfirmModal
                    title="Delete slot?"
                    message="This slot will be permanently removed from the programme."
                    confirmLabel="Delete slot"
                    onConfirm={() => handleDeleteSlot(pendingDeleteSlotId)}
                    onCancel={() => setPendingDeleteSlotId(null)}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    );
}

// ─── Create programme panel ───────────────────────────────────────────────────

function CreateProgrammePanel({
    serviceSlots, onClose, onSubmit, isSubmitting,
}: {
    serviceSlots: ServiceSlotOption[]; onClose: () => void;
    onSubmit: (serviceSlotId: string, saveAsTemplate: boolean) => void; isSubmitting: boolean;
}) {
    const [serviceSlotId, setServiceSlotId] = useState("");
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!serviceSlotId) { setLocalError("Please select a service slot."); return; }
        setLocalError(null);
        onSubmit(serviceSlotId, saveAsTemplate);
    };

    return (
        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#121212]/5">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">New</p>
                    <h2 className="text-sm font-light text-[#121212]">Create Programme</h2>
                </div>
                <button onClick={onClose} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 rounded-md transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 p-5 space-y-4">
                <DismissibleError message={localError} />
                <div>
                    <label htmlFor="create-slot" className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                        Service Slot
                    </label>
                    <select id="create-slot" value={serviceSlotId} onChange={(e) => setServiceSlotId(e.target.value)}
                        className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light rounded-lg focus:outline-none focus:border-[#121212] appearance-none">
                        <option value="">Select a slot…</option>
                        {serviceSlots.map((s) => (
                            <option key={s.id} value={s.id}>{s.eventName} — {s.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setSaveAsTemplate((v) => !v)}>
                    {saveAsTemplate ? <CheckSquare className="w-4 h-4 text-[#121212]" /> : <Square className="w-4 h-4 text-[#8A817C]" />}
                    <span className="text-xs font-light text-[#121212]">Save as template when session completes</span>
                </div>
                <p className="text-[11px] text-[#8A817C] font-light leading-relaxed">
                    After creating, add programme items (worship, prayer, preaching…) from the detail panel.
                </p>
            </form>
            <div className="px-5 py-4 border-t border-[#121212]/5 flex justify-end gap-3">
                <button type="button" onClick={onClose}
                    className="h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors">
                    Cancel
                </button>
                <button onClick={handleSubmit} disabled={isSubmitting}
                    className="flex items-center gap-2 h-9 px-5 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-50 transition-colors">
                    {isSubmitting ? "Creating…" : "Create"}
                </button>
            </div>
        </div>
    );
}

// ─── Programmes tab ───────────────────────────────────────────────────────────

function ProgrammesTab({ hook }: { hook: ReturnType<typeof useServiceProgramme> }) {
    const {
        programmes, pagination, isLoading, isSubmitting, error,
        clearError,
        fetchProgrammes, createProgramme, goToPage, fetchServiceSlots,
    } = hook;

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [serviceSlots, setServiceSlots] = useState<ServiceSlotOption[]>([]);

    const panelOpen = selectedId !== null || showCreate;

    useEffect(() => { fetchProgrammes(1); }, [fetchProgrammes]);

    const handleOpenCreate = async () => {
        const slots = await fetchServiceSlots();
        setServiceSlots(slots);
        setSelectedId(null);
        setShowCreate(true);
    };

    const handleCreate = async (serviceSlotId: string, saveAsTemplate: boolean) => {
        try {
            const created = await createProgramme({ serviceSlotId, saveAsTemplate });
            setShowCreate(false);
            setSelectedId(created.id);
        } catch { /* surfaced via hook.error */ }
    };

    const handleSelectRow = (id: string) => {
        if (selectedId === id) {
            setSelectedId(null);
        } else {
            setShowCreate(false);
            setSelectedId(id);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">
                    {programmes.length} programme{programmes.length !== 1 ? "s" : ""}
                </span>
                <button onClick={handleOpenCreate}
                    className="flex items-center gap-2 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> New Programme
                </button>
            </div>

            <DismissibleError message={error} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* List */}
                <div className={`${panelOpen ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Service Slot</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Status</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] text-center hidden sm:table-cell">Slots</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] hidden md:table-cell">Created</th>
                                    <th className="p-4 w-10" />
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading
                                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                                    : programmes.length === 0
                                    ? (
                                        <tr>
                                            <td colSpan={5} className="p-14 text-center text-xs text-[#8A817C] font-light">
                                                No programmes yet. Create the first one to get started.
                                            </td>
                                        </tr>
                                    )
                                    : programmes.map((p) => (
                                        <tr key={p.id}
                                            onClick={() => handleSelectRow(p.id)}
                                            className={`border-b border-[#121212]/5 cursor-pointer transition-colors ${selectedId === p.id ? "bg-[#F4F1EA]/60" : "hover:bg-[#F4F1EA]/20"}`}>
                                            <td className="p-4">
                                                <div className="text-sm text-[#121212] font-light truncate max-w-[200px]">
                                                    {p.serviceSlotName ?? p.serviceSlotId}
                                                </div>
                                                {p.saveAsTemplate && (
                                                    <span className="inline-flex items-center gap-1 mt-0.5 text-[9px] text-[#8A817C] font-light">
                                                        <Check className="w-2.5 h-2.5 text-green-600" /> Template
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4"><StatusBadge status={p.status} /></td>
                                            <td className="p-4 text-center text-xs text-[#8A817C] font-light hidden sm:table-cell">
                                                {(p as any).slotCount ?? "—"}
                                            </td>
                                            <td className="p-4 text-xs text-[#8A817C] font-light hidden md:table-cell">
                                                {formatDate(p.createdAt)}
                                            </td>
                                            <td className="p-4">
                                                <FileText className={`w-3.5 h-3.5 ${selectedId === p.id ? "text-[#121212]" : "text-[#8A817C]/40"}`} />
                                            </td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                    {pagination && pagination.totalPages > 1 && (
                        <div className="p-4 border-t border-[#121212]/10 bg-[#F4F1EA]/10 flex items-center justify-between">
                            <span className="text-xs font-mono text-[#8A817C]">Page {pagination.page} of {pagination.totalPages}</span>
                            <div className="flex space-x-1">
                                <button onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page <= 1 || isLoading}
                                    className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212] hover:bg-[#F4F1EA]">
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages || isLoading}
                                    className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212] hover:bg-[#F4F1EA]">
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right panel */}
                {selectedId && (
                    <ProgrammeDetailPanel
                        key={selectedId}
                        programmeId={selectedId}
                        onClose={() => { setSelectedId(null); fetchProgrammes(pagination?.page ?? 1); }}
                        hook={hook}
                    />
                )}
                {showCreate && (
                    <CreateProgrammePanel
                        serviceSlots={serviceSlots}
                        onClose={() => setShowCreate(false)}
                        onSubmit={handleCreate}
                        isSubmitting={isSubmitting}
                    />
                )}
            </div>
        </div>
    );
}

// ─── Templates tab ────────────────────────────────────────────────────────────

function TemplatesTab({ hook }: { hook: ReturnType<typeof useServiceProgramme> }) {
    const { templates, isLoading, isSubmitting, error, clearError, fetchTemplates, deleteTemplate } = hook;
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    const handleDelete = async (id: string) => {
        try { await deleteTemplate(id); setDeletingId(null); } catch { /* surfaced via hook */ }
    };

    return (
        <div className="space-y-5">
            <p className="text-xs text-[#8A817C] font-light">
                Templates are auto-saved when a programme with "Save as Template" enabled completes its session.
            </p>
            <DismissibleError message={error} />
            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Service Slot</th>
                                <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] text-center">Slots</th>
                                <th className="p-4 w-16" />
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading
                                ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={3} />)
                                : templates.length === 0
                                ? <tr><td colSpan={3} className="p-12 text-center text-xs text-[#8A817C] font-light">No templates yet.</td></tr>
                                : templates.map((t) => (
                                    <tr key={t.id} className="border-b border-[#121212]/5 hover:bg-[#F4F1EA]/20 transition-colors">
                                        <td className="p-4 text-sm text-[#121212] font-light">{t.serviceSlotName ?? t.serviceSlotId}</td>
                                        <td className="p-4 text-xs text-[#8A817C] font-light text-center">{t.slots?.length ?? 0}</td>
                                        <td className="p-4 flex justify-end">
                                            {deletingId === t.id ? (
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => handleDelete(t.id)} disabled={isSubmitting}
                                                        className="px-2 py-1 text-[9px] font-bold uppercase text-white bg-red-500 hover:bg-red-600 rounded disabled:opacity-50">
                                                        Confirm
                                                    </button>
                                                    <button onClick={() => setDeletingId(null)} className="p-1.5 text-[#8A817C] hover:bg-[#F4F1EA] rounded-lg">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setDeletingId(t.id)}
                                                    className="p-2 text-[#8A817C] hover:text-red-500 border border-transparent hover:border-red-100 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = "programmes" | "templates";

function ServiceProgrammePage() {
    const hook = useServiceProgramme();
    const [activeTab, setActiveTab] = useState<Tab>("programmes");

    const tabCls = (t: Tab) =>
        `px-4 py-2 text-[11px] font-semibold uppercase tracking-widest transition-colors rounded-lg ${activeTab === t ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`;

    return (
        <div className="space-y-8 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Service Programme</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Build and manage the order of service for each service slot
                    </p>
                </div>
            </div>

            <div className="flex gap-1">
                <button className={tabCls("programmes")} onClick={() => setActiveTab("programmes")}>Programmes</button>
                <button className={tabCls("templates")} onClick={() => setActiveTab("templates")}>Templates</button>
            </div>

            {activeTab === "programmes" ? <ProgrammesTab hook={hook} /> : <TemplatesTab hook={hook} />}
        </div>
    );
}

export default withAuth(ServiceProgrammePage, { requiredPermission: 'service_programme:read' });
