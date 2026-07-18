"use client";

import { SessionAnchor, EffectiveSessionSlot, calcElapsedSeconds, formatMMSS } from "@/hooks/use-service-session";

interface SlotTimerDisplayProps {
    anchor: SessionAnchor;
    slots: EffectiveSessionSlot[];
    nowMs: number;
    cautionThresholdRatio: number;
}

export function SlotTimerDisplay({ anchor, slots, nowMs, cautionThresholdRatio }: SlotTimerDisplayProps) {
    const currentSlot = slots.find((s) => s.position === anchor.currentSlotPosition);
    const elapsed = calcElapsedSeconds(anchor, nowMs);
    const allocated = (currentSlot?.allocatedMinutes ?? 0) * 60;
    const isOverrun = elapsed > allocated && allocated > 0;
    const remaining = isOverrun ? elapsed - allocated : Math.max(0, allocated - elapsed);
    const isCaution = !anchor.isPaused && !isOverrun && allocated > 0 && remaining <= allocated * cautionThresholdRatio;

    if (!currentSlot) {
        return <p className="text-white/50 text-lg">No active slot.</p>;
    }

    let state: "overtime" | "caution" | "paused" | "normal" = "normal";
    if (isOverrun) state = "overtime";
    else if (isCaution) state = "caution";
    else if (anchor.isPaused) state = "paused";
    const timerColorClass = {
        overtime: "text-red-400",
        caution: "text-amber-400",
        paused: "text-amber-400",
        normal: "text-white",
    }[state];
    const stateLabel = {
        overtime: "",
        caution: "Wrapping Up",
        paused: "Paused",
        normal: "Remaining",
    }[state];

    const stateLabelColorClass = {
        overtime: "text-red-400",
        caution: "text-amber-400",
        paused: "text-amber-400",
        normal: "text-white/50",
    }[state];

    return (
        <>
            {isOverrun && <div className="fixed inset-0 z-0 bg-red-900" />}
            <div className="relative z-10 w-full h-full flex flex-col items-center px-[3vw]">
                {/* Context band — fixed share of the screen; never grows with state, so it can never be squeezed out by the hero content below */}
                <div className="shrink-0 w-full h-[20vh] flex flex-col items-center justify-center text-center overflow-hidden">
                    <div className="text-[clamp(1.8rem,min(5.5vw,6vh),6.5rem)] font-light mb-2 px-4 leading-tight [text-wrap:balance]">{currentSlot.topic ?? "—"}</div>
                    {(currentSlot.memberName || currentSlot.guestName) && (
                        <div className="text-[clamp(1.1rem,min(2.2vw,3vh),2.5rem)] text-white/60">{currentSlot.memberName ?? currentSlot.guestName}</div>
                    )}
                </div>

                {/* Hero zone — the one thing meant to be read from across the room; state only changes its color/content, never its footprint */}
                <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center overflow-hidden text-center">
                    {isOverrun ? (
                        <>
                            <div className="text-[clamp(4rem,min(16vw,26vh),22rem)] font-black uppercase tracking-tight leading-none text-white animate-pulse">
                                Time&apos;s Up
                            </div>
                            <div className="text-[clamp(2.5rem,min(8vw,10vh),9rem)] font-mono font-bold tabular-nums mt-6 text-white/90">
                                +{formatMMSS(remaining)}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={`text-[clamp(5rem,min(26vw,34vh),30rem)] font-mono font-black tabular-nums leading-none ${timerColorClass}`}>
                                {formatMMSS(remaining)}
                            </div>
                            {stateLabel && (
                                <div className={`text-[clamp(1.4rem,min(3.2vw,3.5vh),4.5rem)] font-bold mt-6 uppercase tracking-widest ${stateLabelColorClass}`}>
                                    {stateLabel}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

export function getNextSlot(anchor: SessionAnchor, slots: EffectiveSessionSlot[]): EffectiveSessionSlot | undefined {
    return slots.find((s) => s.position === anchor.currentSlotPosition + 1);
}

interface UpNextBannerProps {
    anchor: SessionAnchor;
    slots: EffectiveSessionSlot[];
}

export function UpNextBanner({ anchor, slots }: UpNextBannerProps) {
    const nextSlot = getNextSlot(anchor, slots);
    if (!nextSlot) return null;

    return (
        <div className="text-center px-[4vw] pt-4 border-t border-white/10 max-w-[90vw] mx-auto">
            <div className="text-[clamp(0.85rem,min(1.6vw,2vh),1.6rem)] uppercase tracking-[0.3em] text-white/40 mb-2">Up Next</div>
            <div className="text-[clamp(1.2rem,min(3.2vw,3.5vh),4rem)] font-light text-white/90 leading-tight break-words [text-wrap:balance]">
                {nextSlot.topic ?? nextSlot.type}
            </div>
        </div>
    );
}
