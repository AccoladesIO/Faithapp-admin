"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import NextLink from "next/link";
import {
    Plus, Trash2, ChevronLeft, ChevronRight,
    ArrowUp, ArrowDown, Pencil, Check, X, FileText,
    Layers, CheckSquare, Square, RefreshCw, UserCircle,
    Download, Calendar, Maximize2, BarChart2, List,
    Play, Radio, GripVertical, Search,
} from "lucide-react";
import { withAuth } from "@/utils/auth/with-auth";
import { formatLocalSlotTime } from "@/utils/parse-local-time";
import { SLOT_TYPE_CONFIG, SlotTypeBadge } from "@/components/service-programme/slot-type-config";
import { AnalyticsResult } from "@/hooks/use-service-session";
import {
    useServiceProgramme,
    ServiceProgramme,
    ServiceProgrammeSlot,
    ServiceProgrammeTemplate,
    ServiceSlotOption,
    ServiceSlotType,
    ProgrammeSessionSummary,
} from "@/hooks/use-service-programme";
import { api } from "@/utils/auth/axios-client";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { DismissibleError } from "@/components/ui/dismissible-error";
import { SearchableSelect, SearchableOption } from "@/components/ui/searchable-select";
import { useToast } from "@/context/toast-context";
import { useServiceSession } from "@/hooks/use-service-session";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

// ─── Slot type config ─────────────────────────────────────────────────────────

const SLOT_TYPES: ServiceSlotType[] = [
    "SPEAKER", "WORSHIP", "PRAYER", "OFFERING",
    "ANNOUNCEMENT", "DEDICATION", "OTHER", "BREAK",
];

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    DRAFT:     { label: "Draft",     cls: "bg-[#F4F1EA] text-[#8A817C] border-[#121212]/10" },
    LIVE:      { label: "Live",      cls: "bg-green-50 text-green-700 border-green-200" },
    COMPLETED: { label: "Completed", cls: "bg-blue-50 text-blue-700 border-blue-200" },
};

const STATUS_ORDER = ["DRAFT", "LIVE", "COMPLETED"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.DRAFT;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${cfg.cls}${status === "LIVE" ? " animate-pulse" : ""}`}>
            {status === "LIVE" && <Radio className="w-2.5 h-2.5" />}
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

// ─── Slot draft ───────────────────────────────────────────────────────────────

// ─── Add Slot Modal ───────────────────────────────────────────────────────────

type AddSlotDto = {
    type: ServiceSlotType; topic: string; allocatedMinutes: number;
    memberId: string | null; guestName: string | null;
    backupMemberId: string | null; backupGuestName: string | null;
    // Display-only — ignored by the live add-to-programme call, used by the
    // create-flow's local item list so it can render a name without a
    // round-trip to the backend.
    memberName?: string; backupMemberName?: string;
};

// ─── Apply template modal ─────────────────────────────────────────────────────

function ApplyTemplateModal({
    templates, onClose, onApply, isSubmitting,
}: {
    templates: ServiceProgrammeTemplate[]; onClose: () => void;
    onApply: (id: string) => void; isSubmitting: boolean;
}) {
    return (
        <div className="absolute inset-0 z-10 bg-[#FFFFFF] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[#121212]/5">
                <h2 className="text-base font-light tracking-tight text-[#121212]">Apply Template</h2>
                <button onClick={onClose} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 rounded-md"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
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
    );
}

// ─── Slot card ────────────────────────────────────────────────────────────────

function SlotCard({
    slot, isFirst, isLast, onMoveUp, onMoveDown, onEdit, onDelete, isSubmitting, isDraft, isDragOver, showDragHandle,
}: {
    slot: ServiceProgrammeSlot; isFirst: boolean; isLast: boolean;
    onMoveUp: () => void; onMoveDown: () => void; onEdit: () => void;
    onDelete: () => void; isSubmitting: boolean; isDraft: boolean; isDragOver?: boolean; showDragHandle?: boolean;
}) {
    const cfg = SLOT_TYPE_CONFIG[slot.type];
    const speaker = slot.memberName ?? slot.guestName;

    return (
        <div className={`flex items-start gap-2 p-3 rounded-xl border-l-4 border transition-colors group ${cfg.border} ${cfg.bg} ${isDragOver ? "border-[#121212]/30 ring-2 ring-[#121212]/10 ring-offset-1" : "border-[#121212]/5"}`}>
            {(showDragHandle ?? isDraft) && (
                <div className="flex items-center self-stretch cursor-grab active:cursor-grabbing text-[#121212]/20 hover:text-[#121212]/40 transition-colors shrink-0 pt-0.5">
                    <GripVertical className="w-3.5 h-3.5" />
                </div>
            )}
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
        fetchTemplates, applyTemplate, deleteProgramme, updateProgramme, fetchProgrammeSessions, templates, isSubmitting,
    } = hook;

    const [programme, setProgramme] = useState<ServiceProgramme | null>(null);
    const [loading, setLoading] = useState(true);
    const [panelError, setPanelError] = useState<string | null>(null);
    const [conflictWarning, setConflictWarning] = useState<string | null>(null);
    const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState<ItemEditorValue>(EMPTY_ITEM_EDITOR_VALUE);
    const [addValue, setAddValue] = useState<ItemEditorValue>(EMPTY_ITEM_EDITOR_VALUE);
    const [showApplyTemplate, setShowApplyTemplate] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pendingDeleteSlotId, setPendingDeleteSlotId] = useState<string | null>(null);
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [dropIdx, setDropIdx] = useState<number | null>(null);
    const [showSessionHistory, setShowSessionHistory] = useState(false);
    const [sessionHistory, setSessionHistory] = useState<ProgrammeSessionSummary[] | null>(null);
    const [sessionHistoryLoading, setSessionHistoryLoading] = useState(false);

    const {
        anchor, session: liveSession, isSubmitting: sessionSubmitting,
        startSession, fetchLatestSession, fetchState,
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
        } catch (err: unknown) {
            const e = err as ApiError;
            setPanelError(e?.message ?? "Failed to start session.");
        }
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

    const handleToggleSaveAsTemplate = async () => {
        if (!programme) return;
        setPanelError(null);
        try {
            const updated = await updateProgramme(programmeId, { saveAsTemplate: !programme.saveAsTemplate });
            setProgramme((p) => p ? { ...p, saveAsTemplate: updated.saveAsTemplate } : p);
        } catch (err: unknown) {
            const e = err as ApiError;
            setPanelError(e?.message ?? "Failed to update programme.");
        }
    };

    const handleToggleSessionHistory = async () => {
        const next = !showSessionHistory;
        setShowSessionHistory(next);
        if (next && sessionHistory === null) {
            setSessionHistoryLoading(true);
            try {
                const { sessions } = await fetchProgrammeSessions(programmeId);
                setSessionHistory(sessions);
            } catch {
                setSessionHistory([]);
            } finally {
                setSessionHistoryLoading(false);
            }
        }
    };

    const handleDrop = async (targetIdx: number) => {
        if (dragIdx === null || dragIdx === targetIdx || !programme) return;
        const reordered = [...programme.slots];
        const [moved] = reordered.splice(dragIdx, 1);
        reordered.splice(targetIdx, 0, moved);
        setProgramme((p) => p ? { ...p, slots: reordered } : p);
        setDragIdx(null);
        setDropIdx(null);
        try { await reorderSlots(programmeId, reordered.map((s) => s.id)); } catch { reload(); }
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

    const startEditSlot = (slot: ServiceProgrammeSlot) => {
        setEditingSlotId(slot.id);
        setEditingValue(slotToEditorValue(slot));
    };

    const cancelEditSlot = () => setEditingSlotId(null);

    const commitEditSlot = async () => {
        if (!editingSlotId) return;
        setPanelError(null);
        setConflictWarning(null);
        try {
            const saved = await updateSlot(programmeId, editingSlotId, editorValueToDto(editingValue));
            setConflictWarning(saved.conflictWarning ?? null);
            setEditingSlotId(null);
            await reload();
        } catch (err: unknown) {
            const e = err as ApiError;
            setPanelError(e?.message ?? "Failed to update slot.");
        }
    };

    const handleDeleteSlot = async (slotId: string) => {
        setPanelError(null);
        try { await deleteSlot(programmeId, slotId); await reload(); }
        catch (err: unknown) { setPanelError((err as Error).message ?? "Failed to delete slot."); }
    };

    const commitAddSlot = async () => {
        setPanelError(null);
        setConflictWarning(null);
        const dto = editorValueToDto(addValue);
        try {
            const saved = await addSlot(programmeId, {
                type: dto.type,
                topic: dto.topic || undefined,
                memberId: dto.memberId || undefined,
                guestName: dto.guestName || undefined,
                backupMemberId: dto.backupMemberId || undefined,
                backupGuestName: dto.backupGuestName || undefined,
                allocatedMinutes: dto.allocatedMinutes,
            });
            setConflictWarning(saved.conflictWarning ?? null);
            setAddValue(EMPTY_ITEM_EDITOR_VALUE);
            await reload();
        } catch (err: unknown) {
            const e = err as ApiError;
            setPanelError(e?.message ?? "Failed to add slot.");
        }
    };

    const handleApplyTemplate = async (templateId: string) => {
        setPanelError(null);
        try {
            const updated = await applyTemplate(programmeId, templateId);
            setProgramme(updated);
            setShowApplyTemplate(false);
        } catch (err: unknown) {
            const e = err as ApiError;
            setPanelError(e?.message ?? "Failed to apply template.");
        }
    };

    const handleOpenApplyTemplate = async () => { await fetchTemplates(); setShowApplyTemplate(true); };

    const handleDeleteProgramme = async () => {
        setPanelError(null);
        try { await deleteProgramme(programmeId); onClose(); }
        catch (err: unknown) { setPanelError((err as Error).message ?? "Failed to delete."); }
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
    const topicListId = `programme-${programmeId}-topics`;
    const topicSuggestions = Array.from(new Set(slots.map((s) => s.topic).filter((t): t is string => !!t?.trim())));
    const memberSuggestions = Array.from(
        new Map(
            slots
                .filter((s) => s.member)
                .map((s) => [s.member!.id, { id: s.member!.id, name: `${s.member!.firstname} ${s.member!.lastname}` }]),
        ).values(),
    );

    return (
        <div className="lg:col-span-5 relative bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col h-[450px]">
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
                <div className="flex items-center justify-between mt-3">
                    <button onClick={handleToggleSaveAsTemplate} disabled={isSubmitting}
                        className="flex items-center gap-1.5 text-[11px] text-[#8A817C] hover:text-[#121212] transition-colors disabled:opacity-50">
                        {programme.saveAsTemplate ? <CheckSquare className="w-3.5 h-3.5 text-[#121212]" /> : <Square className="w-3.5 h-3.5" />}
                        Save as template when completed
                    </button>
                    <button onClick={handleToggleSessionHistory}
                        className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hover:text-[#121212] transition-colors">
                        <List className="w-3 h-3" /> Session History
                    </button>
                </div>
                {showSessionHistory && (
                    <div className="mt-2 border border-[#121212]/10 rounded-lg overflow-hidden">
                        {sessionHistoryLoading ? (
                            <div className="p-3 text-[11px] text-[#8A817C] font-light">Loading…</div>
                        ) : !sessionHistory || sessionHistory.length === 0 ? (
                            <div className="p-3 text-[11px] text-[#8A817C] font-light">No sessions have run for this programme yet.</div>
                        ) : (
                            <div className="divide-y divide-[#121212]/5">
                                {sessionHistory.map((s) => (
                                    <div key={s.id} className="flex items-center justify-between px-3 py-2 text-[11px]">
                                        <span className="font-mono text-[#121212]">{s.sessionCode}</span>
                                        <StatusBadge status={s.status} />
                                        <span className="text-[#8A817C] font-light">
                                            {new Date(s.startedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <DismissibleError message={panelError} />
            <DismissibleError message={conflictWarning} variant="warning" autoDismissMs={7000} />

            {/* Live session summary — full control lives on the dedicated dashboard */}
            {isLive && anchor && liveSession && (
                <div className="mx-5 mt-4 mb-1 p-4 rounded-xl bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 animate-pulse">
                            <Radio className="w-2.5 h-2.5" /> Live
                        </span>
                        <span className="text-[10px] font-mono text-red-500/70">{liveSession.sessionCode}</span>
                    </div>
                    <p className="text-xs text-[#121212] font-light mb-3">
                        {slots.find((s) => s.position === anchor.currentSlotPosition)?.topic
                            ?? slots.find((s) => s.position === anchor.currentSlotPosition)?.type
                            ?? "Session in progress"}
                        {anchor.isPaused && <span className="text-amber-700 font-semibold"> · Paused</span>}
                    </p>
                    <NextLink
                        href={`/service-programme/live/${liveSession.sessionCode}`}
                        className="flex items-center justify-center gap-2 h-9 w-full bg-red-600 text-white text-[11px] font-semibold uppercase tracking-wider rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <Maximize2 className="w-3.5 h-3.5" /> Open Live Dashboard
                    </NextLink>
                </div>
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
                            {slots.map((slot, i) => {
                                const canDrag = isDraft && editingSlotId === null;
                                return (
                                <div
                                    key={slot.id}
                                    draggable={canDrag}
                                    onDragStart={() => canDrag && setDragIdx(i)}
                                    onDragOver={(e) => { if (canDrag) { e.preventDefault(); setDropIdx(i); } }}
                                    onDrop={() => canDrag && handleDrop(i)}
                                    onDragEnd={() => { setDragIdx(null); setDropIdx(null); }}
                                    className={`${isLive && anchor && slot.position === anchor.currentSlotPosition ? "ring-2 ring-red-400 ring-offset-1 rounded-xl" : ""} ${dragIdx === i ? "opacity-40" : ""}`}
                                >
                                    {slot.id === editingSlotId ? (
                                        <ItemEditorRow
                                            value={editingValue}
                                            onChange={setEditingValue}
                                            onCommit={commitEditSlot}
                                            onCancel={cancelEditSlot}
                                            topicListId={topicListId}
                                            memberSuggestions={memberSuggestions}
                                        />
                                    ) : (
                                        <SlotCard
                                            slot={slot}
                                            isFirst={i === 0}
                                            isLast={i === slots.length - 1}
                                            onMoveUp={() => handleMoveUp(i)}
                                            onMoveDown={() => handleMoveDown(i)}
                                            onEdit={() => startEditSlot(slot)}
                                            onDelete={() => setPendingDeleteSlotId(slot.id)}
                                            isSubmitting={isSubmitting}
                                            isDraft={isDraft}
                                            showDragHandle={canDrag}
                                            isDragOver={dropIdx === i && dragIdx !== null && dragIdx !== i}
                                        />
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    </>
                )}
                {isDraft && (
                    <ItemEditorRow
                        value={addValue}
                        onChange={setAddValue}
                        onCommit={commitAddSlot}
                        topicListId={topicListId}
                        memberSuggestions={memberSuggestions}
                    />
                )}
                {topicSuggestions.length > 0 && (
                    <datalist id={topicListId}>
                        {topicSuggestions.map((t) => <option key={t} value={t} />)}
                    </datalist>
                )}
            </div>

            {/* Start session (DRAFT only) */}
            {isDraft && slots.length > 0 && (
                <div className="border-t border-[#121212]/5 px-5 py-4">
                    <button onClick={handleStartSession} disabled={isSubmitting || sessionSubmitting}
                        className="w-full flex items-center justify-center gap-2 h-9 bg-red-600 text-white text-[11px] font-semibold uppercase tracking-wider rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
                        {sessionSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        Start Session
                    </button>
                </div>
            )}

            {/* Modals */}
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

type DraftItem = AddSlotDto & { key: string };

function DraftItemRow({
    item, index, isFirst, isLast, onMoveUp, onMoveDown, onEdit, onDelete, isDragOver,
}: {
    item: DraftItem; index: number; isFirst: boolean; isLast: boolean;
    onMoveUp: () => void; onMoveDown: () => void; onEdit: () => void; onDelete: () => void;
    isDragOver?: boolean;
}) {
    const cfg = SLOT_TYPE_CONFIG[item.type];
    const speaker = item.memberName || item.guestName;

    return (
        <div className={`flex items-start gap-2 p-3 rounded-xl border-l-4 border ${cfg.border} ${cfg.bg} ${isDragOver ? "border-[#121212]/30 ring-2 ring-[#121212]/10 ring-offset-1" : "border-[#121212]/5"}`}>
            <div className="flex items-center self-stretch cursor-grab active:cursor-grabbing text-[#121212]/20 hover:text-[#121212]/40 transition-colors shrink-0 pt-0.5">
                <GripVertical className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white border border-[#121212]/10 text-[10px] font-bold text-[#121212] shrink-0 mt-0.5">
                {index + 1}
            </div>
            <button type="button" onClick={onEdit} className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                    <SlotTypeBadge type={item.type} />
                    {item.topic && <span className="text-xs font-semibold text-[#121212] truncate">{item.topic}</span>}
                </div>
                <div className={`flex items-center gap-2 mt-1 text-[11px] font-medium ${cfg.text}`}>
                    {speaker && (
                        <span className="flex items-center gap-1">
                            <UserCircle className="w-3 h-3" />{speaker}
                        </span>
                    )}
                    <span className="opacity-40">·</span>
                    <span>{item.allocatedMinutes} min</span>
                    {(item.backupMemberName || item.backupGuestName) && (
                        <>
                            <span className="opacity-40">·</span>
                            <span className="opacity-80">Backup: {item.backupMemberName || item.backupGuestName}</span>
                        </>
                    )}
                </div>
            </button>
            {/* Always visible (not hover-only) so this works on touch/tablet, not just mouse. */}
            <div className="flex items-center gap-0.5 shrink-0">
                <button type="button" onClick={onMoveUp} disabled={isFirst} title="Move up"
                    className="p-1.5 text-[#8A817C] hover:text-[#121212] disabled:opacity-20 transition-colors">
                    <ArrowUp className="w-3 h-3" />
                </button>
                <button type="button" onClick={onMoveDown} disabled={isLast} title="Move down"
                    className="p-1.5 text-[#8A817C] hover:text-[#121212] disabled:opacity-20 transition-colors">
                    <ArrowDown className="w-3 h-3" />
                </button>
                <button type="button" onClick={onEdit} title="Edit"
                    className="p-1.5 text-[#8A817C] hover:text-[#121212] transition-colors">
                    <Pencil className="w-3 h-3" />
                </button>
                <button type="button" onClick={onDelete} title="Remove"
                    className="p-1.5 text-[#8A817C] hover:text-red-500 transition-colors">
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}

// ─── Speaker input — one field, no member/guest toggle ───────────────────────
// Typing is treated as a guest name by default; picking a live-search match
// upgrades it to a member. Removes the extra "which kind of person" click the
// old modal required before you could even start typing a name.

interface SpeakerValue {
    memberId: string;
    memberName: string;
    guestName: string;
}

function SpeakerInput({
    value, onChange, placeholder,
}: {
    value: SpeakerValue;
    onChange: (v: SpeakerValue) => void;
    placeholder?: string;
}) {
    const [results, setResults] = useState<MemberResult[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const displayText = value.memberName || value.guestName;

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
            const res = await api.get(`/members?page=1&limit=6&search=${encodeURIComponent(q)}`);
            const list: MemberResult[] = res.data?.data?.data ?? [];
            setResults(list);
            setOpen(list.length > 0);
        } catch { setResults([]); } finally { setLoading(false); }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        onChange({ memberId: "", memberName: "", guestName: q });
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(q), 250);
    };

    const handleSelect = (m: MemberResult) => {
        onChange({ memberId: m.id, memberName: `${m.firstname} ${m.lastname}`, guestName: "" });
        setResults([]); setOpen(false);
    };

    const handleClear = () => {
        onChange({ memberId: "", memberName: "", guestName: "" });
        setResults([]); setOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div className="relative">
                <UserCircle className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${value.memberId ? "text-[#121212]" : "text-[#8A817C]/50"}`} />
                <input type="text" value={displayText} onChange={handleInput}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    placeholder={placeholder ?? "Speaker — search or type a name"}
                    className="w-full h-9 pl-8 pr-7 bg-[#F4F1EA]/60 border border-[#121212]/10 text-xs text-[#121212] font-light rounded-lg focus:outline-none focus:border-[#121212]" />
                {loading && <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#8A817C] animate-spin pointer-events-none" />}
                {!loading && displayText && (
                    <button type="button" onClick={handleClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8A817C] hover:text-[#121212]">
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>
            {open && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#121212]/10 rounded-xl shadow-lg z-30 overflow-hidden max-h-48 overflow-y-auto">
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

// ─── Inline item editor row ───────────────────────────────────────────────────
// Replaces the old full-screen "Add Programme Item" modal. Used both as the
// always-visible quick-add row at the end of the list (mode="add", Enter or
// the check button appends and resets it for the next item — no repeated
// "open modal → fill → close modal" cycle) and, in place, to edit an existing
// item (mode="edit", pre-filled, Save/Cancel replace the row's own controls).

interface ItemEditorValue {
    type: ServiceSlotType;
    topic: string;
    allocatedMinutes: number;
    memberId: string;
    memberName: string;
    guestName: string;
    hasBackup: boolean;
    backupMemberId: string;
    backupMemberName: string;
    backupGuestName: string;
}

const EMPTY_ITEM_EDITOR_VALUE: ItemEditorValue = {
    type: "SPEAKER", topic: "", allocatedMinutes: 10,
    memberId: "", memberName: "", guestName: "",
    hasBackup: false, backupMemberId: "", backupMemberName: "", backupGuestName: "",
};

function itemToEditorValue(item: DraftItem): ItemEditorValue {
    return {
        type: item.type,
        topic: item.topic,
        allocatedMinutes: item.allocatedMinutes,
        memberId: item.memberId ?? "",
        memberName: item.memberName ?? "",
        guestName: item.guestName ?? "",
        hasBackup: !!(item.backupMemberId || item.backupGuestName),
        backupMemberId: item.backupMemberId ?? "",
        backupMemberName: item.backupMemberName ?? "",
        backupGuestName: item.backupGuestName ?? "",
    };
}

function slotToEditorValue(slot: ServiceProgrammeSlot): ItemEditorValue {
    return {
        type: slot.type,
        topic: slot.topic ?? "",
        allocatedMinutes: slot.allocatedMinutes,
        memberId: slot.member?.id ?? "",
        memberName: slot.member ? `${slot.member.firstname} ${slot.member.lastname}` : (slot.memberName ?? ""),
        guestName: slot.guestName ?? "",
        hasBackup: !!(slot.backupMember || slot.backupGuestName),
        backupMemberId: slot.backupMember?.id ?? "",
        backupMemberName: slot.backupMember ? `${slot.backupMember.firstname} ${slot.backupMember.lastname}` : (slot.backupMemberName ?? ""),
        backupGuestName: slot.backupGuestName ?? "",
    };
}

function editorValueToDto(v: ItemEditorValue): AddSlotDto {
    return {
        type: v.type,
        topic: v.topic,
        allocatedMinutes: v.allocatedMinutes,
        memberId: v.memberId || null,
        memberName: v.memberId ? v.memberName : undefined,
        guestName: v.memberId ? null : v.guestName || null,
        backupMemberId: v.hasBackup ? v.backupMemberId || null : null,
        backupMemberName: v.hasBackup && v.backupMemberId ? v.backupMemberName : undefined,
        backupGuestName: v.hasBackup && !v.backupMemberId ? v.backupGuestName || null : null,
    };
}

function ItemEditorRow({
    value, onChange, onCommit, onCancel, topicListId, memberSuggestions,
}: {
    value: ItemEditorValue;
    onChange: (v: ItemEditorValue) => void;
    onCommit: () => void;
    onCancel?: () => void;
    topicListId: string;
    memberSuggestions: { id: string; name: string }[];
}) {
    const [error, setError] = useState<string | null>(null);
    const isEdit = !!onCancel;

    const handleCommit = () => {
        if (!value.allocatedMinutes || value.allocatedMinutes < 1) {
            setError("Duration must be at least 1 minute.");
            return;
        }
        setError(null);
        onCommit();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") { e.preventDefault(); handleCommit(); }
        if (e.key === "Escape") onCancel?.();
    };

    return (
        <div className={`p-2.5 rounded-xl border space-y-1.5 ${isEdit ? "border-[#121212]/20 bg-white ring-2 ring-[#121212]/10" : "border-dashed border-[#121212]/20 bg-[#F4F1EA]/10"}`}>
            {error && <p className="text-[10px] text-red-600">{error}</p>}
            <div className="flex items-center gap-2">
                <select value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value as ServiceSlotType })}
                    className="h-8 pl-2 pr-1 bg-[#F4F1EA]/60 border border-[#121212]/10 text-[11px] text-[#121212] font-light rounded-lg focus:outline-none focus:border-[#121212] appearance-none shrink-0 w-[112px]">
                    {SLOT_TYPES.map((t) => <option key={t} value={t}>{SLOT_TYPE_CONFIG[t].label}</option>)}
                </select>
                <input type="text" value={value.topic} onChange={(e) => onChange({ ...value, topic: e.target.value })}
                    onKeyDown={handleKeyDown} placeholder="Topic / title" list={topicListId} autoFocus={isEdit}
                    className="flex-1 min-w-0 h-8 px-2 bg-[#F4F1EA]/60 border border-[#121212]/10 text-xs text-[#121212] font-light rounded-lg focus:outline-none focus:border-[#121212]" />
                <input type="number" min={1} value={value.allocatedMinutes}
                    onChange={(e) => onChange({ ...value, allocatedMinutes: Number(e.target.value) })}
                    onKeyDown={handleKeyDown}
                    className="w-14 h-8 px-1 bg-[#F4F1EA]/60 border border-[#121212]/10 text-xs text-[#121212] font-light rounded-lg focus:outline-none focus:border-[#121212] text-center shrink-0" />
                <span className="text-[10px] text-[#8A817C] shrink-0">min</span>
            </div>
            <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                    {!value.memberId && memberSuggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                            {memberSuggestions.slice(0, 5).map((m) => (
                                <button key={m.id} type="button"
                                    onClick={() => onChange({ ...value, memberId: m.id, memberName: m.name, guestName: "" })}
                                    className="px-1.5 py-0.5 text-[9px] font-medium text-[#8A817C] hover:text-[#121212] bg-[#F4F1EA] border border-[#121212]/10 rounded-full transition-colors">
                                    {m.name}
                                </button>
                            ))}
                        </div>
                    )}
                    <SpeakerInput
                        value={{ memberId: value.memberId, memberName: value.memberName, guestName: value.guestName }}
                        onChange={(sp) => onChange({ ...value, ...sp })}
                        placeholder="Speaker — search or type a name (optional)"
                    />
                </div>
                <button type="button" onClick={handleCommit} title={isEdit ? "Save" : "Add item"}
                    className="h-9 w-9 flex items-center justify-center bg-[#121212] text-white rounded-lg hover:bg-[#121212]/90 transition-colors shrink-0">
                    <Check className="w-3.5 h-3.5" />
                </button>
                {onCancel && (
                    <button type="button" onClick={onCancel} title="Cancel"
                        className="h-9 w-9 flex items-center justify-center border border-[#121212]/10 text-[#8A817C] hover:text-[#121212] rounded-lg transition-colors shrink-0">
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
            {value.hasBackup ? (
                <div className="flex items-start gap-2 pl-1">
                    <div className="flex-1 min-w-0">
                        <label className="block text-[9px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Backup speaker</label>
                        <SpeakerInput
                            value={{ memberId: value.backupMemberId, memberName: value.backupMemberName, guestName: value.backupGuestName }}
                            onChange={(sp) => onChange({ ...value, backupMemberId: sp.memberId, backupMemberName: sp.memberName, backupGuestName: sp.guestName })}
                            placeholder="Backup speaker — search or type a name"
                        />
                    </div>
                    <button type="button" onClick={() => onChange({ ...value, hasBackup: false, backupMemberId: "", backupMemberName: "", backupGuestName: "" })}
                        title="Remove backup" className="h-9 w-9 mt-4 flex items-center justify-center text-[#8A817C] hover:text-red-500 transition-colors shrink-0">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ) : (
                <button type="button" onClick={() => onChange({ ...value, hasBackup: true })}
                    className="flex items-center gap-1 pl-1 text-[10px] font-semibold uppercase tracking-wider text-[#8A817C] hover:text-[#121212] transition-colors">
                    <Plus className="w-3 h-3" /> Add backup speaker
                </button>
            )}
        </div>
    );
}

interface SlotDraftConfig {
    enabled: boolean;
    items: DraftItem[];
}

function templateSlotToDraftItem(slot: ServiceProgrammeSlot, index: number): DraftItem {
    return {
        type: slot.type,
        topic: slot.topic ?? "",
        allocatedMinutes: slot.allocatedMinutes,
        memberId: slot.member?.id ?? null,
        memberName: slot.member ? `${slot.member.firstname} ${slot.member.lastname}` : (slot.memberName ?? undefined),
        guestName: slot.guestName ?? null,
        backupMemberId: slot.backupMember?.id ?? null,
        backupMemberName: slot.backupMember ? `${slot.backupMember.firstname} ${slot.backupMember.lastname}` : (slot.backupMemberName ?? undefined),
        backupGuestName: slot.backupGuestName ?? null,
        key: `tpl-${index}-${Date.now()}`,
    };
}

function CreateProgrammeDashboard({
    serviceSlots, onClose, onSubmit, isSubmitting, templates, onFetchTemplates,
}: {
    serviceSlots: ServiceSlotOption[]; onClose: () => void;
    onSubmit: (programmes: { serviceSlotId: string; items: AddSlotDto[] }[], saveAsTemplate: boolean) => void;
    isSubmitting: boolean;
    templates: ServiceProgrammeTemplate[];
    onFetchTemplates: () => void;
}) {
    const [selectedEventId, setSelectedEventId] = useState("");
    const [configs, setConfigs] = useState<Record<string, SlotDraftConfig>>({});
    const [activeSlotId, setActiveSlotId] = useState("");
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState<ItemEditorValue>(EMPTY_ITEM_EDITOR_VALUE);
    const [quickAddValue, setQuickAddValue] = useState<ItemEditorValue>(EMPTY_ITEM_EDITOR_VALUE);
    const [localError, setLocalError] = useState<string | null>(null);
    const [confirmDiscard, setConfirmDiscard] = useState(false);
    const [duplicateConfirmId, setDuplicateConfirmId] = useState<string | null>(null);
    const [templateConfirmId, setTemplateConfirmId] = useState<string | null>(null);
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [dropIdx, setDropIdx] = useState<number | null>(null);

    useEffect(() => { onFetchTemplates(); }, [onFetchTemplates]);

    // Distinct events, not slots — you're programming "Sunday's service(s)",
    // not one arbitrary sub-service used just to unlock the rest. Events
    // where every slot already has a programme are excluded (nothing left
    // to create), and the remainder is sorted chronologically.
    const events = Array.from(new Map(serviceSlots.map((s) => [s.eventId, s.eventName])).entries())
        .map(([eventId, eventName]) => {
            const slots = serviceSlots.filter((s) => s.eventId === eventId);
            return {
                eventId,
                eventName,
                earliestStart: Math.min(...slots.map((s) => new Date(s.startTime).getTime())),
                allProgrammed: slots.every((s) => s.hasProgramme),
                slotCount: slots.length,
            };
        })
        .filter((e) => !e.allProgrammed)
        .sort((a, b) => a.earliestStart - b.earliestStart);
    const eventOptions: SearchableOption[] = events.map((e) => ({
        id: e.eventId,
        label: e.eventName,
        sublabel: `${new Date(e.earliestStart).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}${e.slotCount > 1 ? ` · ${e.slotCount} services` : ""}`,
    }));
    const selectedEvent = events.find((e) => e.eventId === selectedEventId);
    // Every slot under the selected event — this is the "total service" the
    // dashboard is built around (e.g. First + Second Service on the same
    // Sunday), each configured independently.
    const eventSlots = selectedEvent
        ? serviceSlots
            .filter((s) => s.eventId === selectedEvent.eventId)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        : [];
    const activeConfig = configs[activeSlotId];
    const activeSlot = eventSlots.find((s) => s.id === activeSlotId);
    const activeItems = activeConfig?.items ?? [];
    const activeTotalMinutes = activeItems.reduce((s, i) => s + i.allocatedMinutes, 0);
    const activeDurationMinutes = activeSlot
        ? Math.round((new Date(activeSlot.endTime).getTime() - new Date(activeSlot.startTime).getTime()) / 60000)
        : null;
    const activeOverBudget = activeDurationMinutes != null && activeTotalMinutes > activeDurationMinutes;
    // Other services in this event that already have items — the order is
    // usually similar across services even though the ministers differ, so
    // copying and then swapping speakers is faster than rebuilding from
    // scratch.
    const duplicateSources = eventSlots.filter((s) => s.id !== activeSlotId && (configs[s.id]?.items.length ?? 0) > 0);

    const enabledCount = Object.values(configs).filter((c) => c.enabled).length;
    const hasAnyItems = Object.values(configs).some((c) => c.items.length > 0);

    // Switching which service you're configuring shouldn't carry over
    // half-typed quick-add text or an in-progress inline edit from the
    // previous one.
    useEffect(() => {
        setEditingKey(null);
        setQuickAddValue(EMPTY_ITEM_EDITOR_VALUE);
    }, [activeSlotId]);

    // Names already used anywhere in this event, across every sub-service —
    // typing "Praise & Worship" or picking a speaker once means it can be
    // reused with a tap instead of retyped for the next service.
    const allItems = Object.values(configs).flatMap((c) => c.items);
    const topicSuggestions = Array.from(new Set(allItems.map((i) => i.topic).filter((t): t is string => !!t?.trim())));
    const memberSuggestions = Array.from(
        new Map(
            allItems.filter((i) => i.memberId && i.memberName).map((i) => [i.memberId as string, { id: i.memberId as string, name: i.memberName as string }]),
        ).values(),
    );

    const handleSelectEvent = (eventId: string) => {
        setSelectedEventId(eventId);
        const slots = serviceSlots
            .filter((s) => s.eventId === eventId)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        const nextConfigs: Record<string, SlotDraftConfig> = {};
        for (const s of slots) nextConfigs[s.id] = { enabled: !s.hasProgramme, items: [] };
        setConfigs(nextConfigs);
        setActiveSlotId(slots.find((s) => !s.hasProgramme)?.id ?? "");
    };

    const toggleSlotEnabled = (id: string) => {
        setConfigs((prev) => ({ ...prev, [id]: { ...prev[id], enabled: !prev[id]?.enabled } }));
    };

    const updateActiveItems = (updater: (items: DraftItem[]) => DraftItem[]) => {
        setConfigs((prev) => ({
            ...prev,
            [activeSlotId]: { ...prev[activeSlotId], items: updater(prev[activeSlotId]?.items ?? []) },
        }));
    };

    const duplicateFrom = (sourceId: string) => {
        const sourceItems = configs[sourceId]?.items ?? [];
        updateActiveItems(() => sourceItems.map((it, i) => ({ ...it, key: `${Date.now()}-${i}` })));
    };

    const handleDuplicateSelect = (sourceId: string) => {
        if (!sourceId) return;
        if (activeItems.length > 0) {
            setDuplicateConfirmId(sourceId);
        } else {
            duplicateFrom(sourceId);
        }
    };

    const applyTemplateToActive = (templateId: string) => {
        const template = templates.find((t) => t.id === templateId);
        if (!template) return;
        const items = [...template.slots]
            .sort((a, b) => a.position - b.position)
            .map((s, i) => templateSlotToDraftItem(s, i));
        updateActiveItems(() => items);
    };

    const handleApplyTemplateSelect = (templateId: string) => {
        if (!templateId) return;
        if (activeItems.length > 0) {
            setTemplateConfirmId(templateId);
        } else {
            applyTemplateToActive(templateId);
        }
    };

    const startEdit = (item: DraftItem) => {
        setEditingKey(item.key);
        setEditingValue(itemToEditorValue(item));
    };

    const cancelEdit = () => setEditingKey(null);

    const commitEdit = () => {
        const key = editingKey;
        updateActiveItems((items) => items.map((it) => (it.key === key ? { ...editorValueToDto(editingValue), key: it.key } : it)));
        setEditingKey(null);
    };

    const commitQuickAdd = () => {
        updateActiveItems((items) => [...items, { ...editorValueToDto(quickAddValue), key: `${Date.now()}-${items.length}` }]);
        setQuickAddValue(EMPTY_ITEM_EDITOR_VALUE);
    };

    const removeItem = (key: string) => updateActiveItems((items) => items.filter((i) => i.key !== key));

    const moveItem = (index: number, delta: number) => {
        updateActiveItems((items) => {
            const target = index + delta;
            if (target < 0 || target >= items.length) return items;
            const next = [...items];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };

    const handleDrop = (targetIdx: number) => {
        if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); setDropIdx(null); return; }
        updateActiveItems((items) => {
            const next = [...items];
            const [moved] = next.splice(dragIdx, 1);
            next.splice(targetIdx, 0, moved);
            return next;
        });
        setDragIdx(null);
        setDropIdx(null);
    };

    const handleClose = () => {
        if (hasAnyItems) { setConfirmDiscard(true); return; }
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEventId) { setLocalError("Please select an event."); return; }
        if (enabledCount === 0) { setLocalError("Select at least one service to create a programme for."); return; }
        setLocalError(null);
        const programmes = eventSlots
            .filter((s) => configs[s.id]?.enabled)
            .map((s) => ({
                serviceSlotId: s.id,
                items: (configs[s.id]?.items ?? []).map((item): AddSlotDto => ({
                    type: item.type,
                    topic: item.topic,
                    allocatedMinutes: item.allocatedMinutes,
                    memberId: item.memberId,
                    memberName: item.memberName,
                    guestName: item.guestName,
                    backupMemberId: item.backupMemberId,
                    backupMemberName: item.backupMemberName,
                    backupGuestName: item.backupGuestName,
                })),
            }));
        onSubmit(programmes, saveAsTemplate);
    };

    return (
        <div className="lg:col-span-12 relative bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col h-[640px]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#121212]/5 shrink-0">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">New</p>
                    <h2 className="text-sm font-light text-[#121212]">
                        Create Programme{selectedEvent ? ` — ${selectedEvent.eventName}` : ""}
                    </h2>
                </div>
                <button onClick={handleClose} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 rounded-md transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
                <div className="px-5 pt-4 pb-3 shrink-0 border-b border-[#121212]/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                Event
                            </label>
                            <SearchableSelect
                                options={eventOptions}
                                value={selectedEventId}
                                onChange={handleSelectEvent}
                                placeholder="Type to search events…"
                                emptyLabel="No events found."
                            />
                        </div>
                        <div className="flex items-center gap-2 cursor-pointer select-none h-10" onClick={() => setSaveAsTemplate((v) => !v)}>
                            {saveAsTemplate ? <CheckSquare className="w-4 h-4 text-[#121212] shrink-0" /> : <Square className="w-4 h-4 text-[#8A817C] shrink-0" />}
                            <span className="text-xs font-light text-[#121212]">Save each as a template when its session completes</span>
                        </div>
                    </div>
                    <DismissibleError message={localError} />
                </div>

                {eventSlots.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-10">
                        <p className="text-xs text-[#8A817C] font-light text-center max-w-sm">
                            Pick an event above — if it has more than one service, they&apos;ll all show up here so you can configure each one&apos;s order of service.
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
                        {/* Sub-service list — the "total service" overview */}
                        <div className="lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-[#121212]/5 overflow-y-auto p-3 space-y-1.5">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] px-1 mb-1">
                                {eventSlots.length} service{eventSlots.length !== 1 ? "s" : ""} in this event
                            </p>
                            {eventSlots.map((s) => {
                                const cfg = configs[s.id];
                                const mins = cfg?.items.reduce((sum, i) => sum + i.allocatedMinutes, 0) ?? 0;
                                const isActive = s.id === activeSlotId;
                                return (
                                    <div key={s.id}
                                        className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${isActive ? "bg-[#F4F1EA]/70 border-[#121212]/15" : "border-[#121212]/8 hover:bg-[#F4F1EA]/30"} ${s.hasProgramme ? "opacity-50" : ""}`}
                                        onClick={() => !s.hasProgramme && setActiveSlotId(s.id)}
                                    >
                                        <div className="flex items-start gap-2">
                                            <button type="button" disabled={s.hasProgramme}
                                                onClick={(e) => { e.stopPropagation(); toggleSlotEnabled(s.id); }}
                                                className="shrink-0 mt-0.5 disabled:opacity-40">
                                                {cfg?.enabled
                                                    ? <CheckSquare className="w-4 h-4 text-[#121212]" />
                                                    : <Square className="w-4 h-4 text-[#8A817C]" />}
                                            </button>
                                            <div className="min-w-0">
                                                <div className="text-xs font-medium text-[#121212] truncate">{s.name}</div>
                                                <div className="text-[10px] text-[#8A817C] font-mono">{formatLocalSlotTime(s.startTime, s.endTime)}</div>
                                                {s.hasProgramme ? (
                                                    <div className="text-[10px] text-[#8A817C] mt-0.5">Already has a programme</div>
                                                ) : (
                                                    <div className="text-[10px] text-[#8A817C] mt-0.5">
                                                        {cfg?.items.length ?? 0} item{(cfg?.items.length ?? 0) !== 1 ? "s" : ""} · {mins} min
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Active sub-service editor */}
                        <div className="flex-1 min-h-0 flex flex-col">
                            <div className="px-5 py-2.5 border-b border-[#121212]/5 bg-[#F4F1EA]/20 flex items-center justify-between gap-3 shrink-0">
                                <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] truncate">
                                    {activeSlot ? `${activeSlot.name} — Order of Service` : "Order of Service"}
                                    {activeItems.length > 0 && (
                                        <span className={activeOverBudget ? "text-red-600 font-bold ml-1" : "ml-1"}>
                                            · {activeTotalMinutes}{activeDurationMinutes != null ? ` / ${activeDurationMinutes}` : ""} min
                                        </span>
                                    )}
                                </div>
                                {activeSlot && activeConfig?.enabled && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {templates.length > 0 && (
                                            <select value="" onChange={(e) => handleApplyTemplateSelect(e.target.value)}
                                                title="Apply a saved template's order of service, then swap in the right ministers"
                                                className="h-7 pl-2 pr-1 bg-white border border-[#121212]/10 text-[10px] font-semibold uppercase tracking-wider text-[#121212] rounded-lg focus:outline-none focus:border-[#121212] appearance-none max-w-[160px]">
                                                <option value="">Apply template…</option>
                                                {templates.map((t) => (
                                                    <option key={t.id} value={t.id}>{t.serviceSlotName ?? "Template"} ({t.slots?.length ?? 0})</option>
                                                ))}
                                            </select>
                                        )}
                                        {duplicateSources.length > 0 && (
                                            <select value="" onChange={(e) => handleDuplicateSelect(e.target.value)}
                                                title="Copy this event's order of service from another one of its services, then swap in the right ministers"
                                                className="h-7 pl-2 pr-1 bg-white border border-[#121212]/10 text-[10px] font-semibold uppercase tracking-wider text-[#121212] rounded-lg focus:outline-none focus:border-[#121212] appearance-none max-w-[180px]">
                                                <option value="">Copy from…</option>
                                                {duplicateSources.map((s) => (
                                                    <option key={s.id} value={s.id}>{s.name} ({configs[s.id]?.items.length})</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3 space-y-1.5">
                                {activeOverBudget && (
                                    <p className="text-[11px] text-red-600 font-medium">
                                        Items total {activeTotalMinutes} min, which is more than this service&apos;s {activeDurationMinutes} min window.
                                    </p>
                                )}
                                {!activeConfig?.enabled && activeSlot && (
                                    <p className="text-[11px] text-[#8A817C] font-light italic">
                                        This service is unchecked and won&apos;t get a programme — check it in the list to configure it.
                                    </p>
                                )}
                                {activeItems.map((item, i) => (
                                    item.key === editingKey ? (
                                        <ItemEditorRow
                                            key={item.key}
                                            value={editingValue}
                                            onChange={setEditingValue}
                                            onCommit={commitEdit}
                                            onCancel={cancelEdit}
                                            topicListId="dashboard-topic-suggestions"
                                            memberSuggestions={memberSuggestions}
                                        />
                                    ) : (
                                        <div key={item.key}
                                            draggable
                                            onDragStart={() => setDragIdx(i)}
                                            onDragOver={(e) => { e.preventDefault(); setDropIdx(i); }}
                                            onDrop={() => handleDrop(i)}
                                            onDragEnd={() => { setDragIdx(null); setDropIdx(null); }}
                                            className={dragIdx === i ? "opacity-40" : ""}
                                        >
                                            <DraftItemRow
                                                item={item}
                                                index={i}
                                                isFirst={i === 0}
                                                isLast={i === activeItems.length - 1}
                                                onMoveUp={() => moveItem(i, -1)}
                                                onMoveDown={() => moveItem(i, 1)}
                                                onEdit={() => startEdit(item)}
                                                onDelete={() => removeItem(item.key)}
                                                isDragOver={dropIdx === i && dragIdx !== null && dragIdx !== i}
                                            />
                                        </div>
                                    )
                                ))}
                                {activeSlot && activeConfig?.enabled && (
                                    <ItemEditorRow
                                        value={quickAddValue}
                                        onChange={setQuickAddValue}
                                        onCommit={commitQuickAdd}
                                        topicListId="dashboard-topic-suggestions"
                                        memberSuggestions={memberSuggestions}
                                    />
                                )}
                                {activeItems.length === 0 && (!activeSlot || !activeConfig?.enabled) && (
                                    <p className="text-[11px] text-[#8A817C] font-light leading-relaxed">
                                        Pick a service on the left to build its order of service.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {topicSuggestions.length > 0 && (
                    <datalist id="dashboard-topic-suggestions">
                        {topicSuggestions.map((t) => <option key={t} value={t} />)}
                    </datalist>
                )}
            </form>

            <div className="px-5 py-4 border-t border-[#121212]/5 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={handleClose}
                    className="h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors">
                    Cancel
                </button>
                <button onClick={handleSubmit} disabled={isSubmitting}
                    className="flex items-center gap-2 h-9 px-5 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-50 transition-colors">
                    {isSubmitting ? "Creating…" : `Create ${enabledCount > 1 ? `${enabledCount} Programmes` : "Programme"}`}
                </button>
            </div>

            {confirmDiscard && (
                <ConfirmModal
                    title="Discard programme?"
                    message="You've added items to one or more services in this event. Closing now will discard them."
                    confirmLabel="Discard"
                    onConfirm={() => { setConfirmDiscard(false); onClose(); }}
                    onCancel={() => setConfirmDiscard(false)}
                    isSubmitting={false}
                />
            )}

            {duplicateConfirmId && (
                <ConfirmModal
                    title="Replace this service's items?"
                    message={`${activeSlot?.name ?? "This service"} already has ${activeItems.length} item${activeItems.length !== 1 ? "s" : ""}. Copying from ${eventSlots.find((s) => s.id === duplicateConfirmId)?.name ?? "the other service"} will replace them.`}
                    confirmLabel="Replace"
                    onConfirm={() => { duplicateFrom(duplicateConfirmId); setDuplicateConfirmId(null); }}
                    onCancel={() => setDuplicateConfirmId(null)}
                    isSubmitting={false}
                />
            )}

            {templateConfirmId && (
                <ConfirmModal
                    title="Replace this service's items?"
                    message={`${activeSlot?.name ?? "This service"} already has ${activeItems.length} item${activeItems.length !== 1 ? "s" : ""}. Applying "${templates.find((t) => t.id === templateConfirmId)?.serviceSlotName ?? "this template"}" will replace them.`}
                    confirmLabel="Replace"
                    onConfirm={() => { applyTemplateToActive(templateConfirmId); setTemplateConfirmId(null); }}
                    onCancel={() => setTemplateConfirmId(null)}
                    isSubmitting={false}
                />
            )}
        </div>
    );
}

// ─── Programmes tab ───────────────────────────────────────────────────────────

interface EventGroup {
    key: string;
    eventId: string | null;
    eventName: string;
    eventDate: string | null;
    programmes: ServiceProgramme[];
}

function groupProgrammesByEvent(programmes: ServiceProgramme[]): EventGroup[] {
    const groups = new Map<string, EventGroup>();
    for (const p of programmes) {
        const key = p.event?.id ?? `standalone-${p.id}`;
        if (!groups.has(key)) {
            groups.set(key, {
                key,
                eventId: p.event?.id ?? null,
                eventName: p.event?.name ?? p.serviceSlotName ?? "Service",
                eventDate: p.event?.eventDate ?? null,
                programmes: [],
            });
        }
        groups.get(key)!.programmes.push(p);
    }
    return Array.from(groups.values());
}

function EventCalendarChip({ eventDate }: { eventDate: string | null }) {
    if (!eventDate) {
        return (
            <div className="w-9 h-9 rounded-lg bg-[#F4F1EA] border border-[#121212]/10 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-[#8A817C]" />
            </div>
        );
    }
    const d = new Date(eventDate + "T00:00:00");
    return (
        <div className="w-9 h-9 rounded-lg bg-[#F4F1EA] border border-[#121212]/10 flex flex-col items-center justify-center shrink-0 leading-none">
            <span className="text-[8px] font-bold uppercase tracking-wider text-[#8A817C]">
                {d.toLocaleDateString("en-GB", { month: "short" })}
            </span>
            <span className="text-[13px] font-semibold text-[#121212] mt-0.5">
                {d.toLocaleDateString("en-GB", { day: "2-digit" })}
            </span>
        </div>
    );
}

function SkeletonEventGroup() {
    return (
        <div className="animate-pulse space-y-2">
            <div className="flex items-center gap-2.5 px-1">
                <div className="w-9 h-9 rounded-lg bg-[#F4F1EA]" />
                <div className="h-3 bg-[#F4F1EA] rounded w-40" />
            </div>
            <div className="ml-[18px] pl-6 space-y-2">
                <div className="h-14 bg-[#F4F1EA] rounded-lg" />
                <div className="h-14 bg-[#F4F1EA] rounded-lg" />
            </div>
        </div>
    );
}

function ProgrammesTab({ hook }: { hook: ReturnType<typeof useServiceProgramme> }) {
    const {
        programmes, pagination, isLoading, isSubmitting, error,
        fetchProgrammes, createProgramme, goToPage, fetchServiceSlots, deleteProgramme,
        templates, fetchTemplates,
    } = hook;
    const { success, error: toastError } = useToast();
    const { startEventSessions } = useServiceSession();

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [serviceSlots, setServiceSlots] = useState<ServiceSlotOption[]>([]);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
    const [startingEventId, setStartingEventId] = useState<string | null>(null);

    const panelOpen = selectedId !== null || showCreate;
    const eventGroups = groupProgrammesByEvent(programmes);

    const downloadBlob = (data: BlobPart, filename: string) => {
        const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
        const a = document.createElement("a");
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadEventPdf = async (eventId: string, eventName: string) => {
        const key = `order-${eventId}`;
        setDownloadingKey(key);
        try {
            const res = await api.get(`/service-programme/event/${eventId}/pdf`, { responseType: "blob" });
            downloadBlob(res.data, `programme-${eventName}.pdf`);
        } catch {
            toastError("Failed to download the full order-of-service PDF.");
        } finally {
            setDownloadingKey(null);
        }
    };

    const handleDownloadEventSessionReport = async (eventId: string, eventName: string) => {
        const key = `session-${eventId}`;
        setDownloadingKey(key);
        try {
            const res = await api.get(`/service-session/event/${eventId}/report/pdf`, { responseType: "blob" });
            downloadBlob(res.data, `session-report-${eventName}.pdf`);
        } catch (err: unknown) {
            const e = err as ApiError;
            toastError(e?.response?.data?.message || e?.message || "Failed to download the session report.");
        } finally {
            setDownloadingKey(null);
        }
    };

    const handleDownloadEventSummaryPdf = async (eventId: string, eventName: string) => {
        const key = `summary-${eventId}`;
        setDownloadingKey(key);
        try {
            const res = await api.get(`/service-session/event/${eventId}/report/summary-pdf`, { responseType: "blob" });
            downloadBlob(res.data, `event-summary-${eventName}.pdf`);
        } catch (err: unknown) {
            const e = err as ApiError;
            toastError(e?.response?.data?.message || e?.message || "Failed to download the summary PDF.");
        } finally {
            setDownloadingKey(null);
        }
    };

    const handleStartEvent = async (eventId: string, eventName: string) => {
        setStartingEventId(eventId);
        try {
            const sessions = await startEventSessions(eventId);
            success(`Started ${sessions.length} service${sessions.length !== 1 ? "s" : ""} for ${eventName}.`);
            fetchProgrammes(pagination?.page ?? 1);
        } catch (err: unknown) {
            const e = err as ApiError;
            toastError(e?.message ?? "Failed to start service.");
        } finally {
            setStartingEventId(null);
        }
    };

    useEffect(() => { fetchProgrammes(1); }, [fetchProgrammes]);

    const handleOpenCreate = async () => {
        const slots = await fetchServiceSlots();
        setServiceSlots(slots);
        setSelectedId(null);
        setShowCreate(true);
    };

    const handleCreate = async (
        programmes: { serviceSlotId: string; items: AddSlotDto[] }[],
        saveAsTemplate: boolean,
    ) => {
        try {
            const created = await createProgramme({
                saveAsTemplate,
                programmes: programmes.map((p) => ({
                    serviceSlotId: p.serviceSlotId,
                    slots: p.items.length > 0
                        ? p.items.map((dto) => ({
                            type: dto.type,
                            topic: dto.topic || undefined,
                            memberId: dto.memberId || undefined,
                            guestName: dto.guestName || undefined,
                            backupMemberId: dto.backupMemberId || undefined,
                            backupGuestName: dto.backupGuestName || undefined,
                            allocatedMinutes: dto.allocatedMinutes,
                        }))
                        : undefined,
                })),
            });
            setShowCreate(false);
            setSelectedId(created[0].id);
            if (created.length > 1) {
                success(`Created ${created.length} programmes for this event.`);
            }
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

    const handleQuickDelete = async () => {
        if (!deletingId) return;
        try {
            await deleteProgramme(deletingId);
            if (selectedId === deletingId) setSelectedId(null);
            setDeletingId(null);
            fetchProgrammes(pagination?.page ?? 1);
        } catch { /* surfaced via hook.error */ }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">
                    {eventGroups.length} event{eventGroups.length !== 1 ? "s" : ""} · {programmes.length} service slot{programmes.length !== 1 ? "s" : ""}
                </span>
                <button onClick={handleOpenCreate}
                    className="flex items-center gap-2 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> New Programme
                </button>
            </div>

            <DismissibleError message={error} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* List — hidden while the full-width Create dashboard is open */}
                {!showCreate && (
                <div className={`${panelOpen ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-4`}>
                    {isLoading ? (
                        <div className="space-y-5">
                            {Array.from({ length: 3 }).map((_, i) => <SkeletonEventGroup key={i} />)}
                        </div>
                    ) : eventGroups.length === 0 ? (
                        <div className="p-14 text-center text-xs text-[#8A817C] font-light">
                            No programmes yet. Create the first one to get started.
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {eventGroups.map((group) => (
                                <div key={group.key}>
                                    <div className="flex items-center gap-2.5 mb-2 px-0.5">
                                        <EventCalendarChip eventDate={group.eventDate} />
                                        <span className="text-[13px] font-semibold text-[#121212]">{group.eventName}</span>
                                        {group.eventDate && (
                                            <span className="text-[11px] text-[#8A817C]">
                                                {new Date(group.eventDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
                                            </span>
                                        )}
                                        <div className="ml-auto flex items-center gap-2">
                                            <span className="text-[10px] text-[#8A817C] border border-[#121212]/10 rounded-full px-2.5 py-0.5">
                                                {group.programmes.length} slot{group.programmes.length !== 1 ? "s" : ""}
                                            </span>
                                            {group.eventId && (
                                                <>
                                                    {group.programmes.some((p) => p.status === "DRAFT") && (
                                                        <button
                                                            onClick={() => handleStartEvent(group.eventId!, group.eventName)}
                                                            disabled={startingEventId === group.eventId}
                                                            title="Start every not-yet-started service in this event at once"
                                                            className="flex items-center gap-1 h-6 px-2 text-[10px] font-semibold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded-full transition-colors disabled:opacity-40"
                                                        >
                                                            <Play className="w-2.5 h-2.5" />
                                                            {startingEventId === group.eventId ? "Starting…" : "Start Service"}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDownloadEventPdf(group.eventId!, group.eventName)}
                                                        disabled={downloadingKey === `order-${group.eventId}`}
                                                        title="Download the full order of service (all sub-services) as one PDF"
                                                        className="flex items-center gap-1 h-6 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 hover:border-[#121212]/20 rounded-full transition-colors disabled:opacity-40"
                                                    >
                                                        <Download className="w-2.5 h-2.5" />
                                                        Full Report
                                                    </button>
                                                    {group.programmes.every((p) => p.status === "COMPLETED") && (
                                                        <button
                                                            onClick={() => handleDownloadEventSessionReport(group.eventId!, group.eventName)}
                                                            disabled={downloadingKey === `session-${group.eventId}`}
                                                            title="Download the post-service session report (timing, pauses, completion) across all sub-services"
                                                            className="flex items-center gap-1 h-6 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 hover:border-[#121212]/20 rounded-full transition-colors disabled:opacity-40"
                                                        >
                                                            <Download className="w-2.5 h-2.5" />
                                                            Session Report
                                                        </button>
                                                    )}
                                                    {group.programmes.some((p) => p.status !== "DRAFT") && (
                                                        <button
                                                            onClick={() => handleDownloadEventSummaryPdf(group.eventId!, group.eventName)}
                                                            disabled={downloadingKey === `summary-${group.eventId}`}
                                                            title="Download a one-page summary (shorter than the full session report) — available once at least one sub-service has started"
                                                            className="flex items-center gap-1 h-6 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 hover:border-[#121212]/20 rounded-full transition-colors disabled:opacity-40"
                                                        >
                                                            <Download className="w-2.5 h-2.5" />
                                                            Summary
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`flex ${group.programmes.length > 1 ? "gap-0" : ""}`}>
                                        {group.programmes.length > 1 && (
                                            <div className="w-[18px] shrink-0 relative">
                                                <div className="absolute left-1/2 top-0 bottom-[26px] w-px bg-[#121212]/10 -translate-x-1/2" />
                                            </div>
                                        )}
                                        <div className={`flex-1 space-y-1.5 ${group.programmes.length > 1 ? "" : "ml-[18px]"}`}>
                                            {group.programmes.map((p) => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => handleSelectRow(p.id)}
                                                    className={`relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                                        selectedId === p.id ? "bg-[#F4F1EA]/70 border-[#121212]/15" : "border-[#121212]/8 hover:bg-[#F4F1EA]/30"
                                                    } ${p.status === "LIVE" ? "ring-1 ring-red-200" : ""}`}
                                                >
                                                    {group.programmes.length > 1 && (
                                                        <div className="absolute -left-[18px] top-1/2 w-[18px] h-px bg-[#121212]/10" />
                                                    )}
                                                    <span className="text-[11px] font-mono text-[#8A817C] w-[132px] shrink-0 hidden sm:inline">
                                                        {p.serviceSlotDetail
                                                            ? formatLocalSlotTime(p.serviceSlotDetail.startTime, p.serviceSlotDetail.endTime)
                                                            : "—"}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm text-[#121212] font-light truncate">
                                                            {p.serviceSlotDetail?.name ?? p.serviceSlotName ?? p.serviceSlotId}
                                                        </div>
                                                        {p.saveAsTemplate && (
                                                            <span className="inline-flex items-center gap-1 mt-0.5 text-[9px] text-[#8A817C] font-light">
                                                                <Check className="w-2.5 h-2.5 text-green-600" /> Template
                                                            </span>
                                                        )}
                                                    </div>
                                                    <StatusBadge status={p.status} />
                                                    <span className="text-xs text-[#8A817C] font-light w-14 text-right hidden sm:inline">
                                                        {p.slotCount ?? "—"} pcs
                                                    </span>
                                                    {p.status === "DRAFT" && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDeletingId(p.id); }}
                                                            title="Delete this never-started programme"
                                                            className="p-1 text-[#8A817C]/40 hover:text-red-500 transition-colors shrink-0"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            setDownloadingKey(`slot-${p.id}`);
                                                            try {
                                                                const res = await api.get(`/service-programme/${p.id}/pdf`, { responseType: "blob" });
                                                                downloadBlob(res.data, `programme-${p.serviceSlotDetail?.name ?? p.id}.pdf`);
                                                            } catch {
                                                                toastError("Failed to download this service's PDF.");
                                                            } finally {
                                                                setDownloadingKey(null);
                                                            }
                                                        }}
                                                        disabled={downloadingKey === `slot-${p.id}`}
                                                        title="Download this service only"
                                                        className="p-1 text-[#8A817C]/40 hover:text-[#121212] transition-colors shrink-0 disabled:opacity-40"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                    <FileText className={`w-3.5 h-3.5 shrink-0 ${selectedId === p.id ? "text-[#121212]" : "text-[#8A817C]/40"}`} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="pt-4 mt-4 border-t border-[#121212]/10 flex items-center justify-between">
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
                )}

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
                    <CreateProgrammeDashboard
                        serviceSlots={serviceSlots}
                        onClose={() => setShowCreate(false)}
                        onSubmit={handleCreate}
                        isSubmitting={isSubmitting}
                        templates={templates}
                        onFetchTemplates={fetchTemplates}
                    />
                )}
            </div>

            {deletingId && (
                <ConfirmModal
                    title="Delete this programme?"
                    message="It was never started, so this permanently removes it and its slots. This cannot be undone."
                    confirmLabel="Delete programme"
                    onConfirm={handleQuickDelete}
                    onCancel={() => setDeletingId(null)}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    );
}

// ─── Templates tab ────────────────────────────────────────────────────────────

function TemplatesTab({ hook }: { hook: ReturnType<typeof useServiceProgramme> }) {
    const { templates, isLoading, isSubmitting, error, fetchTemplates, deleteTemplate } = hook;
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    const handleDelete = async (id: string) => {
        try { await deleteTemplate(id); setDeletingId(null); } catch { /* surfaced via hook */ }
    };

    return (
        <div className="space-y-5">
            <p className="text-xs text-[#8A817C] font-light">
                Templates are auto-saved when a programme with &quot;Save as Template&quot; enabled completes its session.
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

// ─── Analytics tab ────────────────────────────────────────────────────────────

const formatSeconds = (secs: number | null) => {
    if (secs == null) return "—";
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}m ${s}s`;
};

const formatDate = (iso: string) =>
    new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export interface NameSuggestion {
    name: string;
    date: string;
}

// Free-text filter (backend does a partial/ILIKE match, not exact-ID lookup)
// with a live dropdown of matching known service/event names, filtered
// client-side from the already-fetched `suggestions` list. Visually matches
// SearchableSelect (the same search-icon-input / chip-with-date-and-clear
// pattern used by the service-headcount page's slot pickers) — but unlike
// SearchableSelect, typing without picking a suggestion still updates the
// filter value, since the backend does a partial-name match and the field
// needs to stay usable for names/occurrences that aren't in the list.
function ServiceNameFilterInput({
    value, suggestions, onChange,
}: {
    value: string;
    suggestions: NameSuggestion[];
    onChange: (name: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const q = value.trim().toLowerCase();
    const results = (q
        ? suggestions.filter((s) => s.name.toLowerCase().includes(q))
        : suggestions
    ).slice(0, 8);

    const handleSelect = (s: NameSuggestion) => {
        onChange(s.name);
        setSelectedDate(s.date);
        setOpen(false);
    };

    const handleClear = () => {
        onChange("");
        setSelectedDate(null);
        setOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
        setSelectedDate(null);
        setOpen(true);
    };

    return (
        <div ref={wrapperRef} className="relative">
            {value && selectedDate ? (
                <div className="flex items-center gap-3 h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 rounded-lg">
                    <span className="text-xs text-[#121212] font-light flex-1 truncate">
                        {value}
                        <span className="text-[#8A817C]"> — {formatDate(selectedDate)}</span>
                    </span>
                    <button type="button" onClick={handleClear} className="p-0.5 text-[#8A817C] hover:text-[#121212] transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8A817C] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" value={value} onChange={handleInputChange}
                        onFocus={() => setOpen(true)}
                        placeholder="e.g. Sunday Service or First Service"
                        className="w-full h-10 pl-9 pr-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg" />
                </div>
            )}
            {open && !selectedDate && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#121212]/10 rounded-xl shadow-lg z-30 overflow-hidden max-h-48 overflow-y-auto">
                    {results.map((s) => (
                        <button key={`${s.name}-${s.date}`} type="button" onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                            className="w-full text-left px-4 py-2.5 text-xs text-[#121212] font-light hover:bg-[#F4F1EA]/60 transition-colors border-b border-[#121212]/5 last:border-0">
                            {s.name}
                            {s.date && <span className="text-[#8A817C]"> — {formatDate(s.date)}</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// Same live member search as SpeakerInput, but selection-only (no guest
// fallback) — this is a filter, not an assignment field.
function MemberFilterInput({
    memberId, memberName, onChange,
}: {
    memberId: string;
    memberName: string;
    onChange: (id: string, name: string) => void;
}) {
    const [results, setResults] = useState<MemberResult[]>([]);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
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
        try {
            const res = await api.get(`/members?page=1&limit=6&search=${encodeURIComponent(q)}`);
            const list: MemberResult[] = res.data?.data?.data ?? [];
            setResults(list);
            setOpen(list.length > 0);
        } catch { setResults([]); }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setQuery(q);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(q), 250);
    };

    const handleSelect = (m: MemberResult) => {
        onChange(m.id, `${m.firstname} ${m.lastname}`);
        setQuery(""); setResults([]); setOpen(false);
    };

    const handleClear = () => {
        onChange("", "");
        setQuery(""); setResults([]); setOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            {memberId ? (
                <div className="flex items-center gap-2 h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 rounded-lg">
                    <UserCircle className="w-3.5 h-3.5 text-[#8A817C] shrink-0" />
                    <span className="text-sm text-[#121212] font-light flex-1 truncate">{memberName}</span>
                    <button type="button" onClick={handleClear} className="text-[#8A817C] hover:text-[#121212]"><X className="w-3.5 h-3.5" /></button>
                </div>
            ) : (
                <input type="text" value={query} onChange={handleInput}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    placeholder="Search by minister/speaker…"
                    className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light rounded-lg focus:outline-none focus:border-[#121212]" />
            )}
            {open && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#121212]/10 rounded-xl shadow-lg z-30 overflow-hidden max-h-48 overflow-y-auto">
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

function AnalyticsTab() {
    const { fetchAnalytics } = useServiceSession();
    const [result, setResult] = useState<AnalyticsResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    // Defaults to a bounded 180-day window (matching the backend's own
    // defensive default) rather than blank/"all time" — avoids an unbounded
    // full-history scan on first load and keeps the shown range honest.
    const [from, setFrom] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 180);
        return d.toISOString().slice(0, 10);
    });
    const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
    const [serviceSlotName, setServiceSlotName] = useState("");
    const [nameSuggestions, setNameSuggestions] = useState<NameSuggestion[]>([]);
    const [memberId, setMemberId] = useState("");
    const [memberName, setMemberName] = useState("");
    const [slotType, setSlotType] = useState("");

    // Suggestions come from every event/service-slot name on record, fetched
    // directly rather than via the hook's fetchServiceSlots() — that helper
    // is scoped to the "Create Programme" picker (future events only, and it
    // excludes slots that already have a programme), which is the opposite
    // of what analytics needs: names of *past/completed* sessions.
    useEffect(() => {
        api.get("/events?page=1&limit=200").then((res) => {
            const events: { name?: string; eventDate?: string; serviceSlots?: { name?: string }[] }[] =
                res.data?.data?.data ?? res.data?.data ?? [];
            const seen = new Set<string>();
            const suggestions: NameSuggestion[] = [];
            const addSuggestion = (name: string | undefined, date: string) => {
                if (!name) return;
                const key = `${name}|${date}`;
                if (seen.has(key)) return;
                seen.add(key);
                suggestions.push({ name, date });
            };
            for (const event of events) {
                const date = event.eventDate ?? "";
                addSuggestion(event.name, date);
                for (const slot of event.serviceSlots ?? []) {
                    addSuggestion(slot.name, date);
                }
            }
            suggestions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setNameSuggestions(suggestions);
        }).catch(() => setNameSuggestions([]));
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            setResult(await fetchAnalytics(
                from || undefined, to || undefined, serviceSlotName || undefined,
                memberId || undefined, slotType || undefined,
            ));
        } catch (err: unknown) {
            const e = err as ApiError;
            setLoadError(e?.message ?? "Failed to load analytics.");
        } finally {
            setLoading(false);
        }
    }, [fetchAnalytics, from, to, serviceSlotName, memberId, slotType]);

    // Initial load only — the "Load" button (onClick={load}) re-runs it with
    // whatever filters are currently typed. Deliberately not depending on
    // `load` here: since it's rebuilt on every filter keystroke, doing so
    // would re-fetch on every keystroke instead of only on submit.
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Presets fetch immediately on click (a single deliberate action, unlike
    // typing) — computed and passed straight to fetchAnalytics rather than
    // via the memoized `load`, since setFrom/setTo don't take effect until
    // the next render and `load` would otherwise run with stale dates.
    const runWithDates = async (fromStr: string, toStr: string) => {
        setFrom(fromStr);
        setTo(toStr);
        setLoading(true);
        setLoadError(null);
        try {
            setResult(await fetchAnalytics(
                fromStr || undefined, toStr || undefined, serviceSlotName || undefined,
                memberId || undefined, slotType || undefined,
            ));
        } catch (err: unknown) {
            const e = err as ApiError;
            setLoadError(e?.message ?? "Failed to load analytics.");
        } finally {
            setLoading(false);
        }
    };

    const applyDatePreset = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        runWithDates(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
    };

    const applyQuarterPreset = () => {
        const now = new Date();
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        const start = new Date(now.getFullYear(), quarterStartMonth, 1);
        runWithDates(start.toISOString().slice(0, 10), now.toISOString().slice(0, 10));
    };

    const avgCompletionRate = result && result.sessions.length > 0
        ? Math.round(result.sessions.reduce((s, r) => s + r.completionRate, 0) / result.sessions.length)
        : 0;
    const totalPauseMinutes = result
        ? Math.round(result.sessions.reduce((s, r) => s + r.totalPauseDurationSeconds, 0) / 60)
        : 0;
    const totalOverrunSlots = result
        ? result.sessions.reduce((s, r) => s + r.overrunSlots, 0)
        : 0;

    return (
        <div className="space-y-5">
            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 space-y-3">
                <div className="flex flex-wrap gap-3 items-end">
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">From</label>
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                            className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light rounded-lg focus:outline-none focus:border-[#121212]" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">To</label>
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                            className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light rounded-lg focus:outline-none focus:border-[#121212]" />
                    </div>
                    <div className="flex items-center gap-1">
                        {[
                            { label: "7d", days: 7 },
                            { label: "30d", days: 30 },
                        ].map((p) => (
                            <button key={p.label} type="button" onClick={() => applyDatePreset(p.days)}
                                className="h-8 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 hover:border-[#121212]/20 rounded-lg transition-colors">
                                {p.label}
                            </button>
                        ))}
                        <button type="button" onClick={applyQuarterPreset}
                            className="h-8 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 hover:border-[#121212]/20 rounded-lg transition-colors">
                            This Quarter
                        </button>
                    </div>
                    <button onClick={load} disabled={loading}
                        className="h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-50 transition-colors flex items-center gap-2 ml-auto">
                        {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <BarChart2 className="w-3.5 h-3.5" />}
                        Load
                    </button>
                </div>
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[180px]">
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Service Name</label>
                        <ServiceNameFilterInput value={serviceSlotName} suggestions={nameSuggestions}
                            onChange={setServiceSlotName} />
                    </div>
                    <div className="flex-1 min-w-[180px]">
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Minister / Speaker</label>
                        <MemberFilterInput memberId={memberId} memberName={memberName}
                            onChange={(id, name) => { setMemberId(id); setMemberName(name); }} />
                    </div>
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Slot Type</label>
                        <select value={slotType} onChange={(e) => setSlotType(e.target.value)}
                            className="h-10 pl-3 pr-2 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light rounded-lg focus:outline-none focus:border-[#121212] appearance-none">
                            <option value="">All Types</option>
                            {SLOT_TYPES.map((t) => <option key={t} value={t}>{SLOT_TYPE_CONFIG[t].label}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <DismissibleError message={loadError} />

            {loading && !result ? (
                <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-8 space-y-3 animate-pulse">
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-3 bg-[#F4F1EA] rounded w-full" />)}
                </div>
            ) : result && (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: "Completed Sessions", value: result.totalSessions },
                            { label: "Avg Completion Rate", value: `${avgCompletionRate}%` },
                            { label: "Total Overrun Slots", value: totalOverrunSlots },
                            { label: "Total Pause Time", value: `${totalPauseMinutes} min` },
                        ].map((c) => (
                            <div key={c.label} className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-4">
                                <div className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">{c.label}</div>
                                <div className="text-xl font-light text-[#121212]">{c.value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-[#121212]/5 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">
                            By Slot Type
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Type</th>
                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] text-right">Slots</th>
                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] text-right">Completed</th>
                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] text-right">Avg Actual</th>
                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] text-right">Avg Allocated</th>
                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] text-right">Overruns</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.slotTypeStats.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-xs text-[#8A817C] font-light">No completed sessions in range.</td></tr>
                                    ) : result.slotTypeStats.map((s) => (
                                        <tr key={s.type} className="border-b border-[#121212]/5">
                                            <td className="p-3 text-sm text-[#121212] font-light">{SLOT_TYPE_CONFIG[s.type as ServiceSlotType]?.label ?? s.type}</td>
                                            <td className="p-3 text-xs text-[#121212] font-light text-right">{s.totalSlots}</td>
                                            <td className="p-3 text-xs text-[#121212] font-light text-right">{s.completedSlots}</td>
                                            <td className="p-3 text-xs text-[#121212] font-light text-right">{formatSeconds(s.avgActualSeconds)}</td>
                                            <td className="p-3 text-xs text-[#121212] font-light text-right">{s.avgAllocatedMinutes}m</td>
                                            <td className="p-3 text-xs text-right">
                                                {s.overrunCount > 0 ? <span className="text-red-600 font-medium">{s.overrunCount}</span> : "0"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-[#121212]/5 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">
                            Top Speakers
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Speaker</th>
                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] text-right">Slots</th>
                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] text-right">Total Time</th>
                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] text-right">Avg Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.topSpeakers.length === 0 ? (
                                        <tr><td colSpan={4} className="p-8 text-center text-xs text-[#8A817C] font-light">No speaker data in range.</td></tr>
                                    ) : result.topSpeakers.map((sp) => (
                                        <tr key={sp.memberId} className="border-b border-[#121212]/5">
                                            <td className="p-3 text-sm text-[#121212] font-light">{sp.name}</td>
                                            <td className="p-3 text-xs text-[#121212] font-light text-right">{sp.slotCount}</td>
                                            <td className="p-3 text-xs text-[#121212] font-light text-right">{formatSeconds(sp.totalActualSeconds)}</td>
                                            <td className="p-3 text-xs text-[#121212] font-light text-right">{formatSeconds(sp.avgActualSeconds)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-[#121212]/5 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">
                            Recent Sessions
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Session</th>
                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Started</th>
                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] text-right">Duration</th>
                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] text-right">Completion</th>
                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] text-right">Overruns</th>
                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] text-right">Pause Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.sessions.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-xs text-[#8A817C] font-light">No completed sessions in range.</td></tr>
                                    ) : result.sessions.map((s) => (
                                        <tr key={s.sessionCode} className="border-b border-[#121212]/5">
                                            <td className="p-3 text-xs font-mono text-[#121212]">{s.sessionCode}</td>
                                            <td className="p-3 text-xs text-[#8A817C] font-light">{formatDate(s.startedAt)}</td>
                                            <td className="p-3 text-xs text-[#121212] font-light text-right">{s.totalDurationMinutes != null ? `${s.totalDurationMinutes}m` : "—"}</td>
                                            <td className="p-3 text-xs text-right">{s.completionRate}%</td>
                                            <td className="p-3 text-xs text-right">
                                                {s.overrunSlots > 0 ? <span className="text-red-600 font-medium">{s.overrunSlots}</span> : "0"}
                                            </td>
                                            <td className="p-3 text-xs text-[#121212] font-light text-right">{formatSeconds(s.totalPauseDurationSeconds)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = "programmes" | "templates" | "analytics";

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
                <button className={tabCls("analytics")} onClick={() => setActiveTab("analytics")}>Analytics</button>
            </div>

            {activeTab === "programmes" && <ProgrammesTab hook={hook} />}
            {activeTab === "templates" && <TemplatesTab hook={hook} />}
            {activeTab === "analytics" && <AnalyticsTab />}
        </div>
    );
}

export default withAuth(ServiceProgrammePage, { requiredPermission: 'service_programme:read' });
