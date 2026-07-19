"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
    Play, Pause, StepForward, StepBack, Square as SquareIcon,
    Radio, Plus, Minus, GripVertical, ExternalLink, Pencil, Repeat,
} from "lucide-react";
import {
    useServiceSession, SessionStatePayload, PauseReason, PAUSE_REASON_LABELS,
    calcElapsedSeconds, formatMMSS, OverrideSlotPayload,
    backupLabel, backupOverridePayload,
} from "@/hooks/use-service-session";
import { useLiveSessionSocket } from "@/hooks/use-live-session-socket";
import { SlotEditModal } from "@/components/live/slot-edit-modal";
import { DismissibleError } from "@/components/ui/dismissible-error";
import { api } from "@/utils/auth/axios-client";

// Live updates arrive via socket; this is only a safety net in case a
// broadcast is missed during a disconnect/reconnect or a backend restart.
const SAFETY_POLL_MS = 30_000;

function getTimeStateLabel(isPaused: boolean, isOverrun: boolean): string {
    if (isPaused) return "Paused";
    if (isOverrun) return "Overtime";
    return "Remaining";
}

function getTimerColorClass(isPaused: boolean, isOverrun: boolean): string {
    if (isOverrun) return "text-red-600";
    if (isPaused) return "text-amber-600";
    return "text-[#121212]";
}

const GRANT_ERROR_MESSAGES = [
    "Missing Programme Manager access credentials",
    "Access expired or not recognized",
    "Access has been revoked",
];

function isGrantError(message: string | null): boolean {
    return !!message && GRANT_ERROR_MESSAGES.some((m) => message.includes(m));
}

function grantStorageKey(sessionCode: string): string {
    return `pm-grant-${sessionCode}`;
}

function ManageContent() {
    const params = useParams<{ code: string }>();
    const sessionCode = params.code;
    const searchParams = useSearchParams();
    const shareToken = searchParams.get("token") ?? "";

    const {
        isSubmitting, error,
        fetchState, advance, rewind, pauseSession, resumeSession, adjustTime,
        reorderLiveSlots, overrideSlot, endSession, verifyAccess,
    } = useServiceSession();

    const [payload, setPayload] = useState<SessionStatePayload | null>(null);
    const [nowMs, setNowMs] = useState(() => Date.now());
    const [loaded, setLoaded] = useState(false);
    const [showPause, setShowPause] = useState(false);
    const [pauseReason, setPauseReason] = useState<PauseReason>("TECHNICAL_ISSUE");
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [showRewindConfirm, setShowRewindConfirm] = useState(false);
    const [showAdjustConfirm, setShowAdjustConfirm] = useState<number | null>(null);
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [dropIdx, setDropIdx] = useState<number | null>(null);
    const [editingPosition, setEditingPosition] = useState<number | null>(null);

    const [grantToken, setGrantToken] = useState<string | null>(null);
    const [grantName, setGrantName] = useState<string | null>(null);
    const [grantChecked, setGrantChecked] = useState(false);
    const [accessName, setAccessName] = useState("");
    const [accessPin, setAccessPin] = useState("");
    const [accessError, setAccessError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [isDownloadingReport, setIsDownloadingReport] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(grantStorageKey(sessionCode));
            if (raw) {
                const parsed = JSON.parse(raw);
                setGrantToken(parsed.grantToken ?? null);
                setGrantName(parsed.name ?? null);
            }
        } catch {
            // Malformed/absent cache — fall through to the sign-in gate.
        }
        setGrantChecked(true);
    }, [sessionCode]);

    useEffect(() => {
        if (!isGrantError(error)) return;
        setGrantToken(null);
        setGrantName(null);
        localStorage.removeItem(grantStorageKey(sessionCode));
    }, [error, sessionCode]);

    const poll = useCallback(async () => {
        const result = await fetchState(sessionCode);
        // A failed poll (rate limit, transient network blip) must never be
        // treated as "the session ended" — keep the last known-good payload
        // and let the next poll recover.
        if (result) setPayload(result);
        setLoaded(true);
    }, [sessionCode, fetchState]);

    useLiveSessionSocket(sessionCode, (result) => {
        setPayload(result);
        setLoaded(true);
    });

    useEffect(() => {
        poll();
        const id = setInterval(poll, SAFETY_POLL_MS);
        return () => clearInterval(id);
    }, [poll]);

    useEffect(() => {
        if (payload?.anchor.isPaused) return;
        const id = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(id);
    }, [payload?.anchor.isPaused]);

    if (!shareToken) {
        return (
            <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center px-6">
                <p className="text-sm text-[#8A817C]">This link is missing its access token.</p>
            </div>
        );
    }

    if (!payload) {
        return (
            <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center px-6">
                <p className="text-sm text-[#8A817C]">{loaded ? "Session not found or has ended." : "Loading…"}</p>
            </div>
        );
    }

    const handleVerifyAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        setAccessError(null);
        setIsVerifying(true);
        try {
            const result = await verifyAccess(sessionCode, accessName, accessPin, shareToken);
            setGrantToken(result.grantToken);
            setGrantName(result.name);
            localStorage.setItem(grantStorageKey(sessionCode), JSON.stringify(result));
        } catch (err) {
            setAccessError(err instanceof Error ? err.message : "Invalid name or PIN.");
        } finally {
            setIsVerifying(false);
        }
    };

    if (grantChecked && !grantToken) {
        return (
            <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center px-6">
                <form onSubmit={handleVerifyAccess} className="w-full max-w-xs bg-white border border-[#121212]/10 rounded-xl p-6 space-y-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Programme Manager</p>
                        <p className="text-sm text-[#121212]">Sign in with the name and PIN you were given.</p>
                    </div>
                    <input
                        type="text"
                        placeholder="Your name"
                        value={accessName}
                        onChange={(e) => setAccessName(e.target.value)}
                        autoFocus
                        required
                        className="w-full h-10 px-3 border border-[#121212]/10 rounded-lg text-sm text-[#121212] focus:outline-none focus:border-[#121212]/30"
                    />
                    <input
                        type="text"
                        inputMode="numeric"
                        placeholder="6-digit PIN"
                        value={accessPin}
                        onChange={(e) => setAccessPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        required
                        className="w-full h-10 px-3 border border-[#121212]/10 rounded-lg text-sm text-[#121212] tracking-widest focus:outline-none focus:border-[#121212]/30"
                    />
                    {accessError && <p className="text-xs text-red-600">{accessError}</p>}
                    <button type="submit" disabled={isVerifying}
                        className="w-full h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-50 transition-colors">
                        {isVerifying ? "Signing in…" : "Continue"}
                    </button>
                </form>
            </div>
        );
    }

    const handleDownloadReportPdf = async () => {
        setReportError(null);
        setIsDownloadingReport(true);
        try {
            const res = await api.get(
                `/service-session/${sessionCode}/pm/report/pdf?token=${encodeURIComponent(shareToken)}&grantToken=${encodeURIComponent(grantToken ?? "")}`,
                { responseType: "blob" },
            );
            const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
            const a = document.createElement("a");
            a.href = url; a.download = `session-report-${sessionCode}.pdf`; a.click();
            URL.revokeObjectURL(url);
        } catch {
            setReportError("Failed to download report.");
        } finally {
            setIsDownloadingReport(false);
        }
    };

    if (payload.anchor.status === "COMPLETED") {
        return (
            <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center px-6 text-center">
                <div className="space-y-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Session Ended</p>
                        <p className="text-sm text-[#121212]">{payload.session.programme?.serviceSlotName ?? "This service"} has ended.</p>
                    </div>
                    <button onClick={handleDownloadReportPdf} disabled={isDownloadingReport}
                        className="inline-flex items-center gap-1.5 h-10 px-4 bg-white border border-[#121212]/10 text-[#121212] text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#F4F1EA] disabled:opacity-50 transition-colors">
                        {isDownloadingReport ? "Downloading…" : "Download Report (PDF)"}
                    </button>
                    {reportError && <p className="text-xs text-red-600">{reportError}</p>}
                </div>
            </div>
        );
    }

    const { anchor, session } = payload;
    const slots = payload.effectiveSlots ?? [];
    const currentSlot = slots.find((s) => s.position === anchor.currentSlotPosition);
    const pendingSlots = slots.filter((s) => s.position > anchor.currentSlotPosition);
    const elapsed = calcElapsedSeconds(anchor, nowMs);
    const allocated = (currentSlot?.allocatedMinutes ?? 0) * 60;
    const isOverrun = elapsed > allocated && allocated > 0;
    const remaining = isOverrun ? elapsed - allocated : Math.max(0, allocated - elapsed);
    const isLastSlot = anchor.currentSlotPosition >= slots.length - 1;
    const timeStateLabel = getTimeStateLabel(anchor.isPaused, isOverrun);

    const handlePauseConfirm = async () => {
        await pauseSession(sessionCode, pauseReason, shareToken, grantToken);
        setShowPause(false);
    };

    const handleAdjustConfirm = async (deltaSeconds: number) => {
        await adjustTime(sessionCode, deltaSeconds, shareToken, grantToken);
        setShowAdjustConfirm(null);
        await poll();
    };

    const handleRewindConfirm = async () => {
        await rewind(sessionCode, shareToken, grantToken);
        setShowRewindConfirm(false);
        await poll();
    };

    const handleDrop = async (targetIdx: number) => {
        if (dragIdx === null || dragIdx === targetIdx) return;
        const reordered = [...pendingSlots];
        const [moved] = reordered.splice(dragIdx, 1);
        reordered.splice(targetIdx, 0, moved);
        setDragIdx(null);
        setDropIdx(null);
        await reorderLiveSlots(sessionCode, reordered.map((s) => s.id), shareToken, grantToken);
        await poll();
    };

    const handleSaveSlotEdit = async (dto: OverrideSlotPayload) => {
        if (editingPosition === null) return;
        await overrideSlot(sessionCode, editingPosition, dto, shareToken, grantToken);
        setEditingPosition(null);
        await poll();
    };

    const handleSwapToBackup = async (slot: { position: number }) => {
        const target = slots.find((s) => s.position === slot.position);
        const dto = target && backupOverridePayload(target);
        if (!target || !dto) return;
        await overrideSlot(sessionCode, target.position, dto, shareToken, grantToken);
        await poll();
    };

    return (
        <div className="min-h-screen bg-[#F4F1EA] font-sans px-4 py-6 sm:px-6">
            <div className="max-w-lg mx-auto space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 animate-pulse">
                            <Radio className="w-2.5 h-2.5" /> Live
                        </span>
                        <span className="text-[10px] font-mono text-[#8A817C]">{sessionCode}</span>
                    </div>
                    <span className="text-xs text-[#121212] font-light">
                        {session.programme?.serviceSlotName ?? "Service"}
                    </span>
                </div>

                {grantName && (
                    <div className="flex items-center justify-between text-[10px] text-[#8A817C]">
                        <span>Signed in as <span className="font-semibold text-[#121212]">{grantName}</span></span>
                        <button
                            onClick={() => {
                                localStorage.removeItem(grantStorageKey(sessionCode));
                                setGrantToken(null);
                                setGrantName(null);
                            }}
                            className="underline hover:text-[#121212] transition-colors"
                        >
                            Sign out
                        </button>
                    </div>
                )}

                <button
                    onClick={() => window.open(
                        `${window.location.origin}/live/${sessionCode}/presentation`,
                        `presentation-${sessionCode}`,
                        "noopener,noreferrer",
                    )}
                    className="w-full flex items-center justify-center gap-1.5 h-9 border border-[#121212]/10 bg-white text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] transition-colors"
                >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Presentation Window
                </button>

                <DismissibleError message={error} />

                <div className="bg-white border border-[#121212]/10 rounded-xl p-5 text-center">
                    {currentSlot ? (
                        <>
                            <div className="flex items-center justify-center gap-2">
                                <div className="text-[10px] uppercase tracking-widest text-[#8A817C] mb-1">{currentSlot.type}</div>
                                <button onClick={() => setEditingPosition(currentSlot.position)} title="Edit topic / minister"
                                    className="mb-1 p-0.5 text-[#8A817C]/60 hover:text-[#121212] transition-colors">
                                    <Pencil className="w-3 h-3" />
                                </button>
                            </div>
                            <div className="text-base font-light text-[#121212] mb-1">{currentSlot.topic ?? "—"}</div>
                            {(currentSlot.memberName || currentSlot.guestName) && (
                                <div className="text-xs text-[#8A817C]">{currentSlot.memberName ?? currentSlot.guestName}</div>
                            )}
                            {backupLabel(currentSlot) && (
                                <button onClick={() => handleSwapToBackup(currentSlot)}
                                    className="inline-flex items-center gap-1.5 text-[10px] text-[#8A817C] hover:text-[#121212] mb-3 mt-0.5 transition-colors">
                                    <Repeat className="w-3 h-3" /> Backup: {backupLabel(currentSlot)} — tap to swap
                                </button>
                            )}
                            {!backupLabel(currentSlot) && <div className="mb-3" />}
                            <div className={`text-5xl font-mono font-bold tabular-nums ${getTimerColorClass(anchor.isPaused, isOverrun)}`}>
                                {isOverrun ? "+" : ""}{formatMMSS(remaining)}
                            </div>
                            <div className="text-[10px] text-[#8A817C] mt-1 uppercase tracking-widest">
                                {timeStateLabel} · of {currentSlot.allocatedMinutes} min
                            </div>
                            <div className="flex items-center gap-1 mt-3 justify-center">
                                <button onClick={() => setShowAdjustConfirm(-60)} disabled={isSubmitting}
                                    className="flex items-center justify-center w-7 h-7 border border-[#121212]/10 text-[#8A817C] rounded-md hover:text-[#121212] hover:bg-[#F4F1EA] disabled:opacity-30 transition-colors">
                                    <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[10px] font-mono text-[#8A817C] w-10 text-center">1 min</span>
                                <button onClick={() => setShowAdjustConfirm(60)} disabled={isSubmitting}
                                    className="flex items-center justify-center w-7 h-7 border border-[#121212]/10 text-[#8A817C] rounded-md hover:text-[#121212] hover:bg-[#F4F1EA] disabled:opacity-30 transition-colors">
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-[#8A817C]">No active slot.</p>
                    )}
                </div>

                {showPause && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
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
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
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
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
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

                <div className="flex items-center gap-2">
                    <button onClick={() => setShowRewindConfirm(true)} disabled={isSubmitting || anchor.currentSlotPosition === 0}
                        title="Previous slot"
                        className="flex items-center justify-center w-11 h-11 bg-white border border-[#121212]/10 text-[#8A817C] rounded-xl hover:text-[#121212] disabled:opacity-30 transition-colors">
                        <StepBack className="w-4 h-4" />
                    </button>

                    {anchor.isPaused ? (
                        <button onClick={() => resumeSession(sessionCode, shareToken, grantToken)} disabled={isSubmitting}
                            className="flex items-center gap-2 flex-1 h-11 justify-center bg-green-600 text-white text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
                            <Play className="w-4 h-4" /> Resume
                        </button>
                    ) : (
                        <button onClick={() => setShowPause(true)} disabled={isSubmitting || showPause}
                            className="flex items-center gap-2 flex-1 h-11 justify-center bg-white border border-amber-200 text-amber-700 text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-amber-50 disabled:opacity-30 transition-colors">
                            <Pause className="w-4 h-4" /> Pause
                        </button>
                    )}

                    <button onClick={() => advance(sessionCode, shareToken, grantToken)} disabled={isSubmitting || isLastSlot}
                        title="Next slot"
                        className="flex items-center justify-center w-11 h-11 bg-white border border-[#121212]/10 text-[#8A817C] rounded-xl hover:text-[#121212] disabled:opacity-30 transition-colors">
                        <StepForward className="w-4 h-4" />
                    </button>
                </div>

                {showEndConfirm ? (
                    <div className="flex items-center gap-2 bg-white border border-red-200 rounded-xl p-3">
                        <span className="text-xs text-red-600 font-semibold flex-1">End the session?</span>
                        <button onClick={() => endSession(sessionCode, shareToken, grantToken)} disabled={isSubmitting}
                            className="h-9 px-3 text-[10px] font-bold uppercase text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors">Yes</button>
                        <button onClick={() => setShowEndConfirm(false)}
                            className="h-9 px-3 text-[10px] text-[#8A817C] border border-[#121212]/10 rounded-lg hover:bg-[#F4F1EA] transition-colors">No</button>
                    </div>
                ) : (
                    <button onClick={() => setShowEndConfirm(true)} disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-1.5 h-10 bg-white border border-red-200 text-red-600 text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-red-50 disabled:opacity-30 transition-colors">
                        <SquareIcon className="w-3.5 h-3.5 fill-red-500 text-red-500" /> End Session
                    </button>
                )}

                {pendingSlots.length > 0 && (
                    <div className="bg-white border border-[#121212]/10 rounded-xl p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                            Up Next · Drag to reorder
                        </p>
                        <div className="space-y-1.5">
                            {pendingSlots.map((slot, i) => (
                                <div
                                    key={slot.id}
                                    draggable
                                    onDragStart={() => setDragIdx(i)}
                                    onDragOver={(e) => { e.preventDefault(); setDropIdx(i); }}
                                    onDrop={() => handleDrop(i)}
                                    onDragEnd={() => { setDragIdx(null); setDropIdx(null); }}
                                    className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                                        dropIdx === i && dragIdx !== null && dragIdx !== i ? "border-[#121212]/30 ring-2 ring-[#121212]/10" : "border-[#121212]/5"
                                    } ${dragIdx === i ? "opacity-40" : ""} bg-[#F4F1EA]/40`}
                                >
                                    <GripVertical className="w-3.5 h-3.5 text-[#121212]/20 cursor-grab shrink-0" />
                                    <span className="text-xs text-[#121212] font-light truncate flex-1">
                                        {slot.topic ?? slot.type}
                                    </span>
                                    <span className="text-[10px] text-[#8A817C] shrink-0">{slot.allocatedMinutes}m</span>
                                    {backupLabel(slot) && (
                                        <button onClick={() => handleSwapToBackup(slot)} title={`Swap to backup: ${backupLabel(slot)}`}
                                            className="shrink-0 p-0.5 text-[#8A817C]/60 hover:text-[#121212] transition-colors">
                                            <Repeat className="w-3 h-3" />
                                        </button>
                                    )}
                                    <button onClick={() => setEditingPosition(slot.position)} title="Edit topic / minister"
                                        className="shrink-0 p-0.5 text-[#8A817C]/60 hover:text-[#121212] transition-colors">
                                        <Pencil className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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

export default function ManagePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#F4F1EA]" />}>
            <ManageContent />
        </Suspense>
    );
}
