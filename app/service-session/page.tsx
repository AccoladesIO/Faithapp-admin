"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Play, Pause, StepForward, StepBack,
    Square as SquareIcon, Radio, RefreshCw, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { withAuth } from "@/utils/auth/with-auth";
import { useServiceProgramme, ServiceProgramme, ServiceProgrammeSlot } from "@/hooks/use-service-programme";
import { DismissibleError } from "@/components/ui/dismissible-error";
import {
    useServiceSession, SessionAnchor, PauseReason,
    PAUSE_REASON_LABELS, calcElapsedSeconds, formatMMSS,
} from "@/hooks/use-service-session";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SlotTypeBadge({ type }: { type: string }) {
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#F4F1EA] text-[#8A817C] border border-[#121212]/10">
            {type}
        </span>
    );
}

// ─── Session runner card ──────────────────────────────────────────────────────

interface SessionRunnerProps {
    programme: ServiceProgramme;
    onEnded: () => void;
}

function SessionRunner({ programme, onEnded }: SessionRunnerProps) {
    const {
        anchor, session, isSubmitting, error, clearError,
        fetchLatestSession, fetchState, advance, rewind,
        pauseSession, resumeSession, endSession,
    } = useServiceSession();

    const [nowMs, setNowMs] = useState(() => Date.now());
    const [showPause, setShowPause] = useState(false);
    const [pauseReason, setPauseReason] = useState<PauseReason>("TECHNICAL_ISSUE");
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const s = await fetchLatestSession(programme.id);
        if (s?.sessionCode) await fetchState(s.sessionCode);
        setLoading(false);
    }, [fetchLatestSession, fetchState, programme.id]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!anchor || anchor.isPaused) return;
        const id = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(id);
    }, [anchor?.isPaused]);

    const slots: ServiceProgrammeSlot[] = programme.slots ?? [];
    const currentSlot = anchor ? slots.find((s) => s.position === anchor.currentSlotPosition) : null;
    const elapsed = anchor ? calcElapsedSeconds(anchor, nowMs) : 0;
    const allocated = (currentSlot?.allocatedMinutes ?? 0) * 60;
    const isOverrun = elapsed > allocated && allocated > 0;
    const isLastSlot = anchor ? anchor.currentSlotPosition >= slots.length - 1 : false;

    const handleAdvance = async () => {
        if (!session?.sessionCode) return;
        await advance(session.sessionCode);
    };

    const handleRewind = async () => {
        if (!session?.sessionCode) return;
        await rewind(session.sessionCode);
    };

    const handlePause = async () => {
        if (!session?.sessionCode) return;
        await pauseSession(session.sessionCode, pauseReason);
        setShowPause(false);
    };

    const handleResume = async () => {
        if (!session?.sessionCode) return;
        await resumeSession(session.sessionCode);
    };

    const handleEnd = async () => {
        if (!session?.sessionCode) return;
        await endSession(session.sessionCode);
        setShowEndConfirm(false);
        onEnded();
    };

    if (loading) {
        return (
            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-[#F4F1EA] rounded w-1/3 mb-3" />
                <div className="h-20 bg-[#F4F1EA] rounded" />
            </div>
        );
    }

    if (!session || !anchor) {
        return (
            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5">
                <p className="text-xs text-[#8A817C]">Session state unavailable. Try refreshing.</p>
            </div>
        );
    }

    return (
        <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
            {/* Card header */}
            <div className="px-5 py-4 border-b border-[#121212]/5 flex items-center justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 animate-pulse">
                            <Radio className="w-2.5 h-2.5" /> Live
                        </span>
                        <span className="text-[10px] font-mono text-[#8A817C]">{session.sessionCode}</span>
                    </div>
                    <h2 className="text-sm font-light text-[#121212] truncate">
                        {programme.serviceSlotName ?? programme.serviceSlotId}
                    </h2>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-[#8A817C] font-light">
                        Started {new Date(session.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <Link href="/service-programme" title="Open in Programme view"
                        className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 rounded-lg transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>

            <DismissibleError message={error} />

            {/* Current slot */}
            <div className="px-5 py-4 border-b border-[#121212]/5">
                {currentSlot ? (
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <SlotTypeBadge type={currentSlot.type} />
                                <span className="text-[10px] font-mono text-[#8A817C]">
                                    Slot {anchor.currentSlotPosition + 1} / {slots.length}
                                </span>
                                {anchor.isPaused && (
                                    <span className="text-[9px] font-bold uppercase text-amber-600 tracking-widest">⏸ Paused</span>
                                )}
                            </div>
                            <p className="text-sm font-light text-[#121212] truncate">
                                {currentSlot.topic ?? <span className="text-[#8A817C] italic text-xs">No topic</span>}
                            </p>
                            {(currentSlot.memberName || currentSlot.guestName) && (
                                <p className="text-xs text-[#8A817C] font-light mt-0.5 truncate">
                                    {currentSlot.memberName ?? currentSlot.guestName}
                                </p>
                            )}
                        </div>
                        <div className="text-right shrink-0">
                            <div className={`text-2xl font-mono font-semibold tabular-nums ${isOverrun ? "text-red-600" : anchor.isPaused ? "text-amber-500" : "text-[#121212]"}`}>
                                {formatMMSS(elapsed)}
                            </div>
                            <div className="text-[10px] text-[#8A817C] font-light">
                                of {currentSlot.allocatedMinutes}m
                            </div>
                            {isOverrun && (
                                <div className="text-[10px] text-red-500 font-semibold">+{formatMMSS(elapsed - allocated)} over</div>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-[#8A817C]">No current slot data.</p>
                )}
            </div>

            {/* Pause reason picker */}
            {showPause && (
                <div className="px-5 py-3 border-b border-[#121212]/5 bg-amber-50/60 space-y-2">
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
                        <button onClick={handlePause} disabled={isSubmitting}
                            className="flex-1 h-8 bg-amber-500 text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors">
                            Confirm Pause
                        </button>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="px-5 py-4 flex items-center gap-2">
                <button onClick={handleRewind} disabled={isSubmitting || !anchor || anchor.currentSlotPosition === 0}
                    title="Previous slot"
                    className="flex items-center gap-1 h-9 px-3 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] disabled:opacity-30 transition-colors">
                    <StepBack className="w-3.5 h-3.5" />
                </button>

                {anchor?.isPaused ? (
                    <button onClick={handleResume} disabled={isSubmitting}
                        className="flex items-center gap-1.5 h-9 px-3 bg-green-600 text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                        <Play className="w-3.5 h-3.5" /> Resume
                    </button>
                ) : (
                    <button onClick={() => setShowPause(true)} disabled={isSubmitting || showPause}
                        className="flex items-center gap-1.5 h-9 px-3 border border-amber-200 text-amber-700 text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:bg-amber-50 disabled:opacity-30 transition-colors">
                        <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                )}

                <button onClick={handleAdvance} disabled={isSubmitting || isLastSlot}
                    title="Next slot"
                    className="flex items-center gap-1 h-9 px-3 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] disabled:opacity-30 transition-colors">
                    <StepForward className="w-3.5 h-3.5" />
                </button>

                <div className="flex-1" />

                {showEndConfirm ? (
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-red-600 font-semibold">End session?</span>
                        <button onClick={handleEnd} disabled={isSubmitting}
                            className="h-8 px-2 text-[10px] font-bold uppercase text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50">
                            Yes
                        </button>
                        <button onClick={() => setShowEndConfirm(false)}
                            className="h-8 px-2 text-[10px] text-[#8A817C] border border-[#121212]/10 rounded hover:bg-[#F4F1EA]">
                            No
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setShowEndConfirm(true)} disabled={isSubmitting}
                        className="flex items-center gap-1.5 h-9 px-3 border border-red-200 text-red-600 text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:bg-red-50 disabled:opacity-30 transition-colors">
                        <SquareIcon className="w-3 h-3 fill-red-500 text-red-500" /> End Session
                    </button>
                )}
            </div>

            {/* Slot progress */}
            <div className="px-5 pb-4">
                <div className="flex gap-1">
                    {slots.map((s) => {
                        const isCurrent = anchor && s.position === anchor.currentSlotPosition;
                        const isPast = anchor && s.position < anchor.currentSlotPosition;
                        return (
                            <div key={s.id} title={s.topic ?? s.type}
                                className={`flex-1 h-1.5 rounded-full transition-colors ${isCurrent ? "bg-red-500" : isPast ? "bg-[#121212]/30" : "bg-[#F4F1EA]"}`}
                            />
                        );
                    })}
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-[#8A817C] font-mono">
                        {anchor ? anchor.currentSlotPosition + 1 : "—"} / {slots.length} slots
                    </span>
                    <span className="text-[9px] text-[#8A817C] font-mono">
                        {slots.reduce((acc, s) => acc + s.allocatedMinutes, 0)}m total
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const LiveSessionPage = () => {
    const { programmes, isLoading, error, clearError, fetchProgrammes } = useServiceProgramme();
    const [tick, setTick] = useState(0);

    useEffect(() => { fetchProgrammes(1); }, [fetchProgrammes]);

    const liveProgrammes = programmes.filter((p) => p.status === "LIVE");

    const handleRefresh = () => {
        fetchProgrammes(1);
        setTick((t) => t + 1);
    };

    return (
        <div className="space-y-8 font-sans">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Live Session</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Control active service sessions in real time
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleRefresh} disabled={isLoading}
                        className="flex items-center gap-2 h-9 px-4 border border-[#121212]/10 text-xs font-semibold uppercase tracking-widest text-[#121212] hover:bg-[#F4F1EA]/40 disabled:opacity-40 transition-colors rounded-xl">
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                    <Link href="/service-programme"
                        className="flex items-center gap-2 h-9 px-4 border border-[#121212]/10 text-xs font-semibold uppercase tracking-widest text-[#121212] hover:bg-[#F4F1EA]/40 transition-colors rounded-xl">
                        <ExternalLink className="w-3.5 h-3.5" />
                        Manage Programmes
                    </Link>
                </div>
            </div>

            <DismissibleError message={error} />

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 animate-pulse space-y-3">
                            <div className="h-4 bg-[#F4F1EA] rounded w-1/4" />
                            <div className="h-16 bg-[#F4F1EA] rounded" />
                        </div>
                    ))}
                </div>
            ) : liveProgrammes.length === 0 ? (
                <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-14 text-center">
                    <Radio className="w-8 h-8 text-[#8A817C]/30 mx-auto mb-3" />
                    <p className="text-sm font-light text-[#121212]">No active sessions</p>
                    <p className="text-xs text-[#8A817C] mt-1">
                        Start a session from the{" "}
                        <Link href="/service-programme" className="underline hover:text-[#121212]">
                            Programme
                        </Link>{" "}
                        page.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {liveProgrammes.map((p) => (
                        <SessionRunner key={`${p.id}-${tick}`} programme={p} onEnded={handleRefresh} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default withAuth(LiveSessionPage, { requiredPermission: "service_programme:read" });
