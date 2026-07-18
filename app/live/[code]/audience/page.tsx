"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Radio, CheckCircle2, Circle } from "lucide-react";
import {
    useServiceSession, SessionStatePayload,
    calcElapsedSeconds, formatMMSS,
} from "@/hooks/use-service-session";
import { useLiveSessionSocket } from "@/hooks/use-live-session-socket";

// Live updates arrive via socket; this is only a safety net in case a
// broadcast is missed during a disconnect/reconnect or a backend restart.
// This view has no cap on concurrent viewers (any number of congregants can
// open it), so keeping this interval slow matters more here than anywhere else.
const SAFETY_POLL_MS = 30_000;

export default function AudiencePage() {
    const params = useParams<{ code: string }>();
    const sessionCode = params.code;
    const { fetchState } = useServiceSession();
    const [payload, setPayload] = useState<SessionStatePayload | null>(null);
    const [nowMs, setNowMs] = useState(() => Date.now());
    const [loaded, setLoaded] = useState(false);

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
        if (payload?.anchor?.isPaused) return;
        const id = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(id);
    }, [payload?.anchor?.isPaused]);

    if (!loaded) {
        return (
            <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center px-6">
                <p className="text-xs text-[#8A817C] uppercase tracking-widest">Loading…</p>
            </div>
        );
    }

    if (!payload?.anchor || !payload?.session) {
        return (
            <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center px-6 text-center">
                <p className="text-sm text-[#8A817C]">This service isn&apos;t live right now.</p>
            </div>
        );
    }

    if (payload.anchor.status === "COMPLETED") {
        return (
            <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center px-6 text-center">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Session Ended</p>
                    <p className="text-sm text-[#121212]">
                        {payload.session.programme?.serviceSlotName ?? "This service"} has ended. Thank you for joining!
                    </p>
                </div>
            </div>
        );
    }

    const { anchor, session } = payload;
    const slots = payload.effectiveSlots ?? [];
    const currentSlot = slots.find((s) => s.position === anchor.currentSlotPosition);
    const nextSlot = slots.find((s) => s.position === anchor.currentSlotPosition + 1);
    const elapsed = calcElapsedSeconds(anchor, nowMs);
    const allocated = (currentSlot?.allocatedMinutes ?? 0) * 60;
    const isOverrun = elapsed > allocated && allocated > 0;
    const remaining = isOverrun ? elapsed - allocated : Math.max(0, allocated - elapsed);
    const cautionRatio = payload.cautionThresholdRatio ?? 0.25;
    const isCaution = !anchor.isPaused && !isOverrun && allocated > 0 && remaining <= allocated * cautionRatio;
    const progressPct = allocated > 0 ? Math.min(100, (elapsed / allocated) * 100) : 0;

    const timerColor = isOverrun
        ? "text-red-600"
        : anchor.isPaused
        ? "text-amber-600"
        : isCaution
        ? "text-amber-600"
        : "text-[#121212]";
    const barColor = isOverrun ? "bg-red-500" : isCaution ? "bg-amber-500" : "bg-[#121212]";

    return (
        <div className="min-h-screen bg-[#F4F1EA] font-sans px-4 py-6 sm:px-6">
            <div className="max-w-md mx-auto space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 animate-pulse">
                            <Radio className="w-2.5 h-2.5" /> Live
                        </span>
                    </div>
                    <span className="text-xs text-[#121212] font-light text-right truncate max-w-[60%]">
                        {session.programme?.serviceSlotName ?? "Service"}
                    </span>
                </div>

                {/* Current slot */}
                <div className="bg-white border border-[#121212]/10 rounded-2xl p-6 text-center">
                    {currentSlot ? (
                        <>
                            <div className="text-[10px] uppercase tracking-widest text-[#8A817C] mb-1">{currentSlot.type}</div>
                            <div className="text-lg font-light text-[#121212] mb-1">{currentSlot.topic ?? "—"}</div>
                            {(currentSlot.memberName || currentSlot.guestName) && (
                                <div className="text-xs text-[#8A817C] mb-4">{currentSlot.memberName ?? currentSlot.guestName}</div>
                            )}
                            <div className={`text-6xl font-mono font-bold tabular-nums ${timerColor}`}>
                                {formatMMSS(isOverrun ? elapsed - allocated : anchor.isPaused ? elapsed : remaining)}
                            </div>
                            <div className="text-[10px] text-[#8A817C] mt-1 uppercase tracking-widest">
                                {anchor.isPaused ? "Paused" : isOverrun ? "Over time" : "Remaining"} · {currentSlot.allocatedMinutes} min allotted
                            </div>
                            <div className="h-1.5 bg-[#F4F1EA] rounded-full overflow-hidden mt-4">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-[#8A817C]">No active slot.</p>
                    )}
                </div>

                {/* Up next */}
                {nextSlot && (
                    <div className="bg-white border border-[#121212]/10 rounded-2xl p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Up Next</p>
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm text-[#121212] font-light truncate">{nextSlot.topic ?? nextSlot.type}</p>
                                {(nextSlot.memberName || nextSlot.guestName) && (
                                    <p className="text-xs text-[#8A817C] truncate">{nextSlot.memberName ?? nextSlot.guestName}</p>
                                )}
                            </div>
                            <span className="shrink-0 text-[10px] text-[#8A817C] font-mono">{nextSlot.allocatedMinutes}m</span>
                        </div>
                    </div>
                )}

                {/* Running order */}
                {slots.length > 0 && (
                    <div className="bg-white border border-[#121212]/10 rounded-2xl p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Running Order</p>
                        <div className="space-y-1">
                            {slots.map((slot) => {
                                const isDone = slot.position < anchor.currentSlotPosition;
                                const isCurrent = slot.position === anchor.currentSlotPosition;
                                return (
                                    <div
                                        key={slot.id}
                                        className={`flex items-center gap-2.5 px-2 py-2 rounded-lg ${isCurrent ? "bg-[#F4F1EA]" : ""}`}
                                    >
                                        {isDone ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                        ) : (
                                            <Circle className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? "text-[#121212]" : "text-[#8A817C]/30"}`} />
                                        )}
                                        <span className={`text-xs truncate flex-1 ${isDone ? "text-[#8A817C] line-through" : isCurrent ? "text-[#121212] font-medium" : "text-[#121212] font-light"}`}>
                                            {slot.topic ?? slot.type}
                                        </span>
                                        <span className="text-[10px] text-[#8A817C] font-mono shrink-0">{slot.allocatedMinutes}m</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
