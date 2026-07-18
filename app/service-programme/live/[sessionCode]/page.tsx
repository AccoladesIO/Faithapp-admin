"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import NextLink from "next/link";
import {
    ArrowLeft, Radio, Play, Pause, StepForward, StepBack, Square as SquareIcon,
    Minus, Plus, Link2, RefreshCw, Download, Maximize2, Minimize2, GripVertical,
    AlertTriangle, Activity, ExternalLink as ExternalLinkIcon, Pencil, Repeat,
    UserPlus, Trash2, Copy, FileText,
} from "lucide-react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    useServiceSession, SessionStatePayload, PauseReason, PAUSE_REASON_LABELS,
    calcElapsedSeconds, formatMMSS, ActionLogEntry, OverrideSlotPayload,
    backupLabel, backupOverridePayload, AccessGrant,
} from "@/hooks/use-service-session";
import { useLiveSessionSocket } from "@/hooks/use-live-session-socket";
import { SlotTypeBadge } from "@/components/service-programme/slot-type-config";
import { SlotEditModal } from "@/components/live/slot-edit-modal";
import { DismissibleError } from "@/components/ui/dismissible-error";
import { useToast } from "@/context/toast-context";
import { api } from "@/utils/auth/axios-client";

// Live updates arrive via socket; this is only a safety net in case a
// broadcast is missed during a disconnect/reconnect or a backend restart.
const SAFETY_POLL_MS = 30_000;
type LiveLinkView = "presentation" | "manage" | "audience";
const LINK_COPIED_LABELS: Record<LiveLinkView, string> = {
    presentation: "Presentation link copied",
    manage: "Programme Manager link copied",
    audience: "Audience link copied",
};
const ACTION_LABELS: Record<string, string> = {
    SESSION_STARTED: "Started the session",
    ADVANCED: "Advanced to the next slot",
    REWOUND: "Went back a slot",
    PAUSED: "Paused the session",
    RESUMED: "Resumed the session",
    TIME_ADJUSTED: "Adjusted the timer",
    SLOTS_REORDERED: "Reordered upcoming slots",
    SLOT_OVERRIDDEN: "Overrode a slot",
    SESSION_ENDED: "Ended the session",
    SHARE_TOKEN_ROTATED: "Rotated the Programme Manager link",
    ACCESS_GRANT_CREATED: "Granted Programme Manager access",
    ACCESS_GRANT_REVOKED: "Revoked Programme Manager access",
    ACCESS_GRANT_REPLACED: "Replaced Programme Manager access",
};

function LiveSessionDashboardContent() {
    const params = useParams<{ sessionCode: string }>();
    const sessionCode = params.sessionCode;
    const { success: toastSuccess, error: toastError } = useToast();
    const {
        isSubmitting, error,
        fetchState, advance, rewind, pauseSession, resumeSession, adjustTime,
        reorderLiveSlots, overrideSlot, endSession, getShareLinks, rotateShareToken, fetchActionLog,
        createAccessGrant, listAccessGrants, revokeAccessGrant,
    } = useServiceSession();

    const [payload, setPayload] = useState<SessionStatePayload | null>(null);
    const [nowMs, setNowMs] = useState(() => Date.now());
    const [loaded, setLoaded] = useState(false);
    const [showPause, setShowPause] = useState(false);
    const [pauseReason, setPauseReason] = useState<PauseReason>("TECHNICAL_ISSUE");
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [showRewindConfirm, setShowRewindConfirm] = useState(false);
    const [showAdjustConfirm, setShowAdjustConfirm] = useState<number | null>(null);
    const [showRotateConfirm, setShowRotateConfirm] = useState(false);
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [dropIdx, setDropIdx] = useState<number | null>(null);
    const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [shareToken, setShareToken] = useState<string | null>(null);
    const [editingPosition, setEditingPosition] = useState<number | null>(null);
    const [accessGrants, setAccessGrants] = useState<AccessGrant[]>([]);
    const [newGrantName, setNewGrantName] = useState("");
    const [isAddingGrant, setIsAddingGrant] = useState(false);
    const [justCreatedPin, setJustCreatedPin] = useState<{ name: string; pin: string } | null>(null);
    const [pendingReplaceName, setPendingReplaceName] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const poll = useCallback(async () => {
        const result = await fetchState(sessionCode);
        // A failed poll (rate limit, transient network blip) must never be
        // treated as "the session ended" — keep the last known-good payload
        // and let the next poll recover.
        if (result) setPayload(result);
        setLoaded(true);
    }, [sessionCode, fetchState]);

    const loadActionLog = useCallback(async () => {
        try {
            setActionLog(await fetchActionLog(sessionCode));
        } catch {
            // Non-critical — the activity feed is supplementary context.
        }
    }, [sessionCode, fetchActionLog]);

    const loadShareToken = useCallback(async () => {
        try {
            const { shareToken: token } = await getShareLinks(sessionCode);
            setShareToken(token);
        } catch {
            // Non-critical — copy buttons fall back to fetching on click.
        }
    }, [sessionCode, getShareLinks]);

    const loadAccessGrants = useCallback(async () => {
        try {
            setAccessGrants(await listAccessGrants(sessionCode));
        } catch {
            // Non-critical — the panel just stays empty until the next successful load.
        }
    }, [sessionCode, listAccessGrants]);

    useLiveSessionSocket(sessionCode, (result) => {
        setPayload(result);
        setLoaded(true);
    });

    useEffect(() => {
        poll();
        loadActionLog();
        loadShareToken();
        loadAccessGrants();
        const id = setInterval(poll, SAFETY_POLL_MS);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [poll]);

    useEffect(() => {
        const id = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            containerRef.current?.requestFullscreen();
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
            if (e.key.toLowerCase() === "f") {
                e.preventDefault();
                toggleFullscreen();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleFullscreen]);

    const anchor = payload?.anchor;
    const slots = payload?.effectiveSlots ?? [];
    const currentSlot = anchor ? slots.find((s) => s.position === anchor.currentSlotPosition) : undefined;
    const pendingSlots = anchor ? slots.filter((s) => s.position > anchor.currentSlotPosition) : [];
    const elapsed = anchor ? calcElapsedSeconds(anchor, nowMs) : 0;
    const allocated = (currentSlot?.allocatedMinutes ?? 0) * 60;
    const isOverrun = elapsed > allocated && allocated > 0;
    const remaining = isOverrun ? elapsed - allocated : Math.max(0, allocated - elapsed);
    const cautionRatio = payload?.cautionThresholdRatio ?? 0.25;
    const isCaution = !!anchor && !anchor.isPaused && !isOverrun && allocated > 0 && remaining <= allocated * cautionRatio;
    const isLastSlot = anchor ? anchor.currentSlotPosition >= slots.length - 1 : false;

    const handleAdvance = async () => { await advance(sessionCode); await poll(); loadActionLog(); };
    const handleRewindConfirm = async () => { await rewind(sessionCode); setShowRewindConfirm(false); await poll(); loadActionLog(); };
    const handlePauseConfirm = async () => { await pauseSession(sessionCode, pauseReason); setShowPause(false); await poll(); loadActionLog(); };
    const handleResume = async () => { await resumeSession(sessionCode); await poll(); loadActionLog(); };
    const handleAdjustConfirm = async (deltaSeconds: number) => { await adjustTime(sessionCode, deltaSeconds); setShowAdjustConfirm(null); await poll(); };
    const handleEnd = async () => { await endSession(sessionCode); setShowEndConfirm(false); await poll(); loadActionLog(); };

    const handleSaveSlotEdit = async (dto: OverrideSlotPayload) => {
        if (editingPosition === null) return;
        try {
            await overrideSlot(sessionCode, editingPosition, dto);
            setEditingPosition(null);
            await poll();
            loadActionLog();
            toastSuccess("Slot updated.");
        } catch {
            toastError("Failed to update slot.");
        }
    };

    const handleSwapToBackup = async (slot: { position: number }) => {
        const target = slots.find((s) => s.position === slot.position);
        const dto = target && backupOverridePayload(target);
        if (!target || !dto) return;
        try {
            await overrideSlot(sessionCode, target.position, dto);
            await poll();
            loadActionLog();
            toastSuccess(`Swapped to backup: ${backupLabel(target)}`);
        } catch {
            toastError("Failed to swap to backup.");
        }
    };

    const handleDrop = async (targetIdx: number) => {
        if (dragIdx === null || dragIdx === targetIdx) return;
        const reordered = [...pendingSlots];
        const [moved] = reordered.splice(dragIdx, 1);
        reordered.splice(targetIdx, 0, moved);
        setDragIdx(null);
        setDropIdx(null);
        await reorderLiveSlots(sessionCode, reordered.map((s) => s.id));
        await poll();
        loadActionLog();
    };

    const handleCopyLink = async (view: LiveLinkView) => {
        try {
            let url: string;
            if (view === "manage") {
                // Use the pre-fetched token so the clipboard write stays inside this
                // click's user-activation window — Safari silently rejects
                // navigator.clipboard.writeText() once an awaited network call
                // (getShareLinks) has pushed it outside that window.
                const token = shareToken ?? (await getShareLinks(sessionCode)).shareToken;
                url = `${window.location.origin}/live/${sessionCode}/manage?token=${token}`;
            } else {
                url = `${window.location.origin}/live/${sessionCode}/${view}`;
            }
            await navigator.clipboard.writeText(url);
            toastSuccess(LINK_COPIED_LABELS[view]);
        } catch {
            toastError("Failed to copy link.");
        }
    };

    const handleOpenPresentationWindow = () => {
        window.open(
            `${window.location.origin}/live/${sessionCode}/presentation`,
            `presentation-${sessionCode}`,
            "noopener,noreferrer",
        );
    };

    const handleRotateLink = async () => {
        try {
            const { shareToken: token } = await rotateShareToken(sessionCode);
            setShareToken(token);
            setShowRotateConfirm(false);
            toastSuccess("Programme Manager link rotated — the old link no longer works.");
            loadActionLog();
        } catch {
            toastError("Failed to rotate link.");
        }
    };

    const handleAddGrant = async (e?: React.FormEvent, replaceExisting = false) => {
        e?.preventDefault();
        const name = newGrantName.trim();
        if (!name) return;
        setIsAddingGrant(true);
        try {
            const result = await createAccessGrant(sessionCode, name, replaceExisting);
            setJustCreatedPin({ name: result.name, pin: result.pin });
            setNewGrantName("");
            setPendingReplaceName(null);
            await loadAccessGrants();
            loadActionLog();
        } catch (err) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 409) {
                setPendingReplaceName(name);
            } else {
                toastError("Failed to add collaborator.");
            }
        } finally {
            setIsAddingGrant(false);
        }
    };

    const handleReplaceGrant = () => handleAddGrant(undefined, true);

    const handleRevokeGrant = async (grantId: string) => {
        try {
            await revokeAccessGrant(sessionCode, grantId);
            await loadAccessGrants();
            loadActionLog();
            toastSuccess("Access revoked.");
        } catch {
            toastError("Failed to revoke access.");
        }
    };

    const handleDownloadAuditLog = async () => {
        try {
            const res = await api.get(`/service-session/${sessionCode}/action-log/csv`, { responseType: "blob" });
            const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
            const a = document.createElement("a");
            a.href = url; a.download = `session-audit-log-${sessionCode}.csv`; a.click();
            URL.revokeObjectURL(url);
        } catch {
            toastError("Failed to download audit log.");
        }
    };

    const handleDownloadReportPdf = async () => {
        try {
            const res = await api.get(`/service-session/${sessionCode}/report/pdf`, { responseType: "blob" });
            const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
            const a = document.createElement("a");
            a.href = url; a.download = `session-report-${sessionCode}.pdf`; a.click();
            URL.revokeObjectURL(url);
        } catch {
            toastError("Failed to download report.");
        }
    };

    const serviceSlotName = payload?.session?.programme?.serviceSlotName ?? "Service";
    const [eventLabel, slotLabel] = serviceSlotName.includes(" — ")
        ? serviceSlotName.split(" — ")
        : [null, serviceSlotName];

    if (!loaded) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-[#F4F1EA] rounded w-64" />
                <div className="h-64 bg-[#F4F1EA] rounded-xl" />
            </div>
        );
    }

    if (!payload || !anchor) {
        return (
            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-14 text-center">
                <p className="text-sm font-light text-[#121212]">Session not found or has ended.</p>
                <NextLink href="/service-programme" className="text-xs text-[#8A817C] underline hover:text-[#121212] mt-2 inline-block">
                    Back to Programmes
                </NextLink>
            </div>
        );
    }

    if (anchor.status === "COMPLETED") {
        return (
            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-14 text-center">
                <p className="text-sm font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Session Ended</p>
                <p className="text-sm font-light text-[#121212]">{serviceSlotName}</p>
                <NextLink href="/service-programme" className="text-xs text-[#8A817C] underline hover:text-[#121212] mt-3 inline-block">
                    Back to Programmes
                </NextLink>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={isFullscreen ? "fixed inset-0 z-50 bg-[#F4F1EA] overflow-y-auto p-4 md:p-6" : ""}
        >
            {/* Breadcrumb + header */}
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                    <NextLink href="/service-programme" title="Back to Programmes"
                        className="p-2 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 rounded-lg transition-colors shrink-0">
                        <ArrowLeft className="w-4 h-4" />
                    </NextLink>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] text-[#8A817C] uppercase tracking-widest font-semibold">
                            {eventLabel && <><span>{eventLabel}</span><span className="opacity-40">/</span></>}
                            <span className="text-[#121212]">{slotLabel}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 animate-pulse">
                                <Radio className="w-2.5 h-2.5" /> Live
                            </span>
                            <span className="text-[11px] font-mono text-[#8A817C]">{sessionCode}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {isFullscreen && (
                        <button onClick={toggleFullscreen}
                            className="flex items-center gap-1.5 h-9 px-3 bg-[#121212] text-white text-[11px] font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors">
                            <Minimize2 className="w-3.5 h-3.5" /> Exit to Admin
                        </button>
                    )}
                    {!isFullscreen && (
                        <button onClick={toggleFullscreen} title="Fullscreen (F)"
                            className="flex items-center gap-1.5 h-9 px-3 border border-[#121212]/10 text-[#8A817C] text-[11px] font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] transition-colors">
                            <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
                        </button>
                    )}
                </div>
            </div>

            <DismissibleError message={error} />

            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] gap-4 items-start">
                {/* Queue */}
                <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#121212]/5 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">Order of Service</span>
                        <span className="text-[10px] text-[#8A817C]">{slots.length} slots</span>
                    </div>
                    <div className="p-2 max-h-[560px] overflow-y-auto">
                        {slots.map((slot, i) => {
                            const isPast = slot.position < anchor.currentSlotPosition;
                            const isCurrent = slot.position === anchor.currentSlotPosition;
                            const pendingIdx = pendingSlots.findIndex((s) => s.id === slot.id);
                            const canDrag = pendingIdx !== -1;
                            return (
                                <div
                                    key={slot.id}
                                    draggable={canDrag}
                                    onDragStart={() => canDrag && setDragIdx(pendingIdx)}
                                    onDragOver={(e) => { if (canDrag) { e.preventDefault(); setDropIdx(pendingIdx); } }}
                                    onDrop={() => canDrag && handleDrop(pendingIdx)}
                                    onDragEnd={() => { setDragIdx(null); setDropIdx(null); }}
                                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg mb-1 text-xs transition-colors ${
                                        isCurrent ? "bg-red-50 font-semibold text-[#121212]" :
                                        isPast ? "text-[#8A817C] line-through decoration-[#121212]/20" :
                                        "text-[#121212]"
                                    } ${dropIdx === pendingIdx && dragIdx !== null && dragIdx !== pendingIdx ? "ring-2 ring-[#121212]/10" : ""} ${dragIdx === pendingIdx ? "opacity-40" : ""}`}
                                >
                                    <span className="w-4 text-center shrink-0 text-[10px] text-[#8A817C]">
                                        {isPast ? "✓" : isCurrent ? "▶" : i + 1}
                                    </span>
                                    <span className="flex-1 min-w-0 truncate">{slot.topic ?? slot.type}</span>
                                    {!isPast && backupLabel(slot) && (
                                        <button onClick={() => handleSwapToBackup(slot)} title={`Swap to backup: ${backupLabel(slot)}`}
                                            className="shrink-0 p-0.5 text-[#8A817C]/60 hover:text-[#121212] transition-colors">
                                            <Repeat className="w-3 h-3" />
                                        </button>
                                    )}
                                    {!isPast && (
                                        <button onClick={() => setEditingPosition(slot.position)} title="Edit topic / minister"
                                            className="shrink-0 p-0.5 text-[#8A817C]/60 hover:text-[#121212] transition-colors">
                                            <Pencil className="w-3 h-3" />
                                        </button>
                                    )}
                                    {canDrag && <GripVertical className="w-3 h-3 text-[#8A817C]/40 shrink-0 cursor-grab" />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Stage */}
                <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                    <div className="text-center px-6 pt-9 pb-7">
                        {currentSlot ? (
                            <>
                                <div className="flex items-center justify-center gap-2">
                                    <SlotTypeBadge type={currentSlot.type} />
                                    <button onClick={() => setEditingPosition(currentSlot.position)} title="Edit topic / minister"
                                        className="p-1 text-[#8A817C]/60 hover:text-[#121212] transition-colors">
                                        <Pencil className="w-3 h-3" />
                                    </button>
                                </div>
                                <p className="text-xl font-light text-[#121212] mt-3 mb-1 truncate">
                                    {currentSlot.topic ?? currentSlot.type}
                                </p>
                                {(currentSlot.memberName || currentSlot.guestName) && (
                                    <p className="text-xs text-[#8A817C]">
                                        Led by {currentSlot.memberName ?? currentSlot.guestName}
                                    </p>
                                )}
                                {backupLabel(currentSlot) && (
                                    <button onClick={() => handleSwapToBackup(currentSlot)}
                                        className="inline-flex items-center gap-1.5 text-[10px] text-[#8A817C] hover:text-[#121212] mb-5 mt-1 transition-colors">
                                        <Repeat className="w-3 h-3" /> Backup: {backupLabel(currentSlot)} — tap to swap
                                    </button>
                                )}
                                {!backupLabel(currentSlot) && <div className="mb-5" />}

                                {isOverrun && (
                                    <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                                        <AlertTriangle className="w-3 h-3" /> Time&apos;s Up
                                    </div>
                                )}
                                {isCaution && (
                                    <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                                        <AlertTriangle className="w-3 h-3" /> Wrapping Up
                                    </div>
                                )}

                                <div className={`font-mono font-bold tabular-nums leading-none ${
                                    isOverrun ? "text-6xl text-red-600" :
                                    isCaution ? "text-6xl text-amber-600" :
                                    anchor.isPaused ? "text-6xl text-amber-500" :
                                    "text-6xl text-[#121212]"
                                }`}>
                                    {isOverrun ? "+" : ""}{formatMMSS(remaining)}
                                </div>
                                <div className="text-[10px] text-[#8A817C] uppercase tracking-widest mt-2">
                                    {anchor.isPaused ? "Paused" : isOverrun ? "Overtime" : isCaution ? "Wrapping Up" : `of ${currentSlot.allocatedMinutes} min`}
                                </div>

                                <div className="flex items-center justify-center gap-2 mt-5">
                                    <button onClick={() => setShowAdjustConfirm(-60)} disabled={isSubmitting}
                                        className="flex items-center justify-center w-8 h-8 border border-[#121212]/10 text-[#8A817C] rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] disabled:opacity-30 transition-colors">
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[10px] font-mono text-[#8A817C] w-14 text-center">1 min</span>
                                    <button onClick={() => setShowAdjustConfirm(60)} disabled={isSubmitting}
                                        className="flex items-center justify-center w-8 h-8 border border-[#121212]/10 text-[#8A817C] rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] disabled:opacity-30 transition-colors">
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-[#8A817C] py-10">No active slot.</p>
                        )}
                    </div>

                    {showPause && (
                        <div className="mx-6 mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
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
                                    className="flex-1 h-9 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handlePauseConfirm} disabled={isSubmitting}
                                    className="flex-1 h-9 bg-amber-500 text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors">
                                    Confirm Pause
                                </button>
                            </div>
                        </div>
                    )}

                    {showRewindConfirm && (
                        <div className="mx-6 mb-5 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <span className="text-[10px] text-amber-800 font-semibold flex-1">Go back a slot? This clears its recorded time.</span>
                            <button onClick={handleRewindConfirm} disabled={isSubmitting}
                                className="h-9 px-3 text-[10px] font-bold uppercase text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 transition-colors">
                                Yes
                            </button>
                            <button onClick={() => setShowRewindConfirm(false)}
                                className="h-9 px-3 text-[10px] text-[#8A817C] border border-[#121212]/10 rounded-lg hover:bg-[#F4F1EA] transition-colors">
                                No
                            </button>
                        </div>
                    )}

                    {showAdjustConfirm !== null && (
                        <div className="mx-6 mb-5 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <span className="text-[10px] text-amber-800 font-semibold flex-1">
                                {showAdjustConfirm > 0 ? "Add" : "Subtract"} {Math.abs(showAdjustConfirm)}s on the running timer?
                            </span>
                            <button onClick={() => handleAdjustConfirm(showAdjustConfirm)} disabled={isSubmitting}
                                className="h-9 px-3 text-[10px] font-bold uppercase text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 transition-colors">
                                Yes
                            </button>
                            <button onClick={() => setShowAdjustConfirm(null)}
                                className="h-9 px-3 text-[10px] text-[#8A817C] border border-[#121212]/10 rounded-lg hover:bg-[#F4F1EA] transition-colors">
                                No
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-2 px-6 pb-6">
                        <button onClick={() => setShowRewindConfirm(true)} disabled={isSubmitting || anchor.currentSlotPosition === 0}
                            title="Previous slot"
                            className="flex items-center justify-center w-11 h-11 border border-[#121212]/10 text-[#8A817C] rounded-xl hover:text-[#121212] hover:bg-[#F4F1EA] disabled:opacity-30 transition-colors">
                            <StepBack className="w-4 h-4" />
                        </button>

                        {anchor.isPaused ? (
                            <button onClick={handleResume} disabled={isSubmitting}
                                className="flex items-center gap-2 flex-1 h-11 justify-center bg-green-600 text-white text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
                                <Play className="w-4 h-4" /> Resume
                            </button>
                        ) : (
                            <button onClick={() => setShowPause(true)} disabled={isSubmitting || showPause}
                                className="flex items-center gap-2 flex-1 h-11 justify-center border border-amber-200 text-amber-700 text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-amber-50 disabled:opacity-30 transition-colors">
                                <Pause className="w-4 h-4" /> Pause
                            </button>
                        )}

                        <button onClick={handleAdvance} disabled={isSubmitting || isLastSlot}
                            title="Next slot"
                            className="flex items-center justify-center w-11 h-11 border border-[#121212]/10 text-[#8A817C] rounded-xl hover:text-[#121212] hover:bg-[#F4F1EA] disabled:opacity-30 transition-colors">
                            <StepForward className="w-4 h-4" />
                        </button>

                        <div className="w-px h-6 bg-[#121212]/10 mx-1" />

                        {showEndConfirm ? (
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] text-red-600 font-semibold mr-1">End?</span>
                                <button onClick={handleEnd} disabled={isSubmitting}
                                    className="h-9 px-3 text-[10px] font-bold uppercase text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 transition-colors">Yes</button>
                                <button onClick={() => setShowEndConfirm(false)}
                                    className="h-9 px-2 text-[10px] text-[#8A817C] border border-[#121212]/10 rounded-xl hover:bg-[#F4F1EA] transition-colors">No</button>
                            </div>
                        ) : (
                            <button onClick={() => setShowEndConfirm(true)} disabled={isSubmitting}
                                className="flex items-center gap-1.5 h-11 px-3 border border-red-200 text-red-600 text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-red-50 disabled:opacity-30 transition-colors">
                                <SquareIcon className="w-3.5 h-3.5 fill-red-500 text-red-500" /> End
                            </button>
                        )}
                    </div>
                </div>

                {/* Share + activity */}
                <div className="space-y-4">
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#121212]/5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">Share &amp; Access</span>
                        </div>
                        <div className="p-4 space-y-2.5">
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleCopyLink("presentation")}
                                    className="flex-1 flex items-center gap-2 text-xs text-[#121212] hover:text-[#8A817C] transition-colors">
                                    <Link2 className="w-3.5 h-3.5 shrink-0" /> Presentation Link
                                </button>
                                <button onClick={handleOpenPresentationWindow} title="Open in a new window for a projector or second screen"
                                    className="shrink-0 p-1 text-[#8A817C] hover:text-[#121212] transition-colors">
                                    <ExternalLinkIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <button onClick={() => handleCopyLink("manage")}
                                className="w-full flex items-center gap-2 text-xs text-[#121212] hover:text-[#8A817C] transition-colors">
                                <Link2 className="w-3.5 h-3.5 shrink-0" /> Programme Manager Link
                            </button>
                            <button onClick={() => handleCopyLink("audience")}
                                className="w-full flex items-center gap-2 text-xs text-[#121212] hover:text-[#8A817C] transition-colors">
                                <Link2 className="w-3.5 h-3.5 shrink-0" /> Audience Link
                            </button>
                            {showRotateConfirm ? (
                                <div className="flex items-center gap-1.5 pt-1">
                                    <span className="text-[10px] text-amber-700 font-semibold flex-1">Invalidate old link?</span>
                                    <button onClick={handleRotateLink}
                                        className="text-[10px] font-bold uppercase text-white bg-amber-600 hover:bg-amber-700 rounded px-2 py-0.5 transition-colors">Yes</button>
                                    <button onClick={() => setShowRotateConfirm(false)}
                                        className="text-[10px] text-[#8A817C] border border-[#121212]/10 rounded px-2 py-0.5 hover:bg-[#F4F1EA] transition-colors">No</button>
                                </div>
                            ) : (
                                <button onClick={() => setShowRotateConfirm(true)}
                                    className="w-full flex items-center gap-2 text-xs text-[#121212] hover:text-[#8A817C] transition-colors">
                                    <RefreshCw className="w-3.5 h-3.5 shrink-0" /> Rotate Manager Link
                                </button>
                            )}
                            <button onClick={handleDownloadAuditLog}
                                className="w-full flex items-center gap-2 text-xs text-[#121212] hover:text-[#8A817C] transition-colors">
                                <Download className="w-3.5 h-3.5 shrink-0" /> Audit Log (CSV)
                            </button>
                            <button onClick={handleDownloadReportPdf}
                                className="w-full flex items-center gap-2 text-xs text-[#121212] hover:text-[#8A817C] transition-colors">
                                <FileText className="w-3.5 h-3.5 shrink-0" /> Session Report (PDF)
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#121212]/5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">Programme Manager Access</span>
                        </div>
                        <div className="p-4 space-y-2.5">
                            {justCreatedPin && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <p className="text-[10px] text-amber-800">
                                        PIN for <span className="font-semibold">{justCreatedPin.name}</span> — share this now, it won&apos;t be shown again:
                                    </p>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-lg font-mono font-bold tracking-widest text-[#121212]">{justCreatedPin.pin}</span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(justCreatedPin.pin);
                                                toastSuccess("PIN copied");
                                            }}
                                            className="p-1 text-[#8A817C] hover:text-[#121212] transition-colors"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <button onClick={() => setJustCreatedPin(null)}
                                        className="text-[10px] text-amber-700 underline mt-1">
                                        Dismiss
                                    </button>
                                </div>
                            )}

                            {accessGrants.length === 0 ? (
                                <p className="text-xs text-[#8A817C]">No named collaborators yet.</p>
                            ) : accessGrants.map((grant) => (
                                <div key={grant.id} className="flex items-center justify-between gap-2 text-xs">
                                    <div className="min-w-0">
                                        <span className={grant.revokedAt ? "text-[#8A817C] line-through decoration-[#121212]/20" : "text-[#121212]"}>
                                            {grant.name}
                                        </span>
                                        {!grant.revokedAt && grant.lastUsedAt && (
                                            <span className="text-[10px] text-[#8A817C] ml-1.5">
                                                last active {new Date(grant.lastUsedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                                            </span>
                                        )}
                                    </div>
                                    {!grant.revokedAt && (
                                        <button onClick={() => handleRevokeGrant(grant.id)} title="Revoke access"
                                            className="shrink-0 p-1 text-[#8A817C] hover:text-red-600 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}

                            {pendingReplaceName ? (
                                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
                                    <span className="text-[10px] text-amber-800 flex-1">
                                        &quot;{pendingReplaceName}&quot; already has active access. Replace it with a new PIN?
                                    </span>
                                    <button onClick={handleReplaceGrant} disabled={isAddingGrant}
                                        className="text-[10px] font-bold uppercase text-white bg-amber-600 hover:bg-amber-700 rounded px-2 py-0.5 disabled:opacity-50 transition-colors">
                                        Replace
                                    </button>
                                    <button onClick={() => setPendingReplaceName(null)}
                                        className="text-[10px] text-[#8A817C] border border-[#121212]/10 rounded px-2 py-0.5 hover:bg-[#F4F1EA] transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleAddGrant} className="flex items-center gap-2 pt-1">
                                    <input
                                        type="text"
                                        placeholder="Collaborator's name"
                                        value={newGrantName}
                                        onChange={(e) => setNewGrantName(e.target.value)}
                                        className="flex-1 h-8 px-2 border border-[#121212]/10 rounded-lg text-xs text-[#121212] focus:outline-none focus:border-[#121212]/30"
                                    />
                                    <button type="submit" disabled={isAddingGrant || !newGrantName.trim()}
                                        className="shrink-0 flex items-center gap-1 h-8 px-2 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] disabled:opacity-30 transition-colors">
                                        <UserPlus className="w-3.5 h-3.5" /> Add
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#121212]/5 flex items-center gap-1.5">
                            <Activity className="w-3 h-3 text-[#8A817C]" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">Recent Activity</span>
                        </div>
                        <div className="p-4 space-y-2.5 max-h-[220px] overflow-y-auto">
                            {actionLog.length === 0 ? (
                                <p className="text-xs text-[#8A817C]">No activity yet.</p>
                            ) : actionLog.map((entry, i) => (
                                <div key={i} className="text-xs">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[#121212]">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                                        <span className="text-[10px] font-mono text-[#8A817C] shrink-0">
                                            {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-[#8A817C]">
                                        {entry.actorName ?? (entry.actorRole === "PUBLIC_LINK" ? "Programme Manager link" : entry.actorRole)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {editingPosition !== null && (() => {
                const editingSlot = slots.find((s) => s.position === editingPosition);
                if (!editingSlot) return null;
                return (
                    <SlotEditModal
                        topic={editingSlot.topic ?? ""}
                        speakerLabel={editingSlot.memberName ?? editingSlot.guestName ?? ""}
                        isSubmitting={isSubmitting}
                        onSave={handleSaveSlotEdit}
                        onClose={() => setEditingPosition(null)}
                    />
                );
            })()}
        </div>
    );
}

const LiveSessionDashboardPage = () => <LiveSessionDashboardContent />;

export default withAuth(LiveSessionDashboardPage, { requiredPermission: "service_programme:read" });
