"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { withAuth } from "@/utils/auth/with-auth";
import {
    ArrowLeft, Users, CheckCircle2, StepForward, Square as SquareIcon, Trophy,
    ExternalLink as ExternalLinkIcon, Link2,
} from "lucide-react";
import { useGameSessionControl, GameSessionStatePayload, calcGameSecondsRemaining } from "@/hooks/use-games";
import { useGameSessionSocket } from "@/hooks/use-game-session-socket";
import { DismissibleError } from "@/components/ui/dismissible-error";
import { useToast } from "@/context/toast-context";

// Live updates arrive via socket; this is only a safety net in case a
// broadcast is missed during a disconnect/reconnect or a backend restart.
const SAFETY_POLL_MS = 30_000;

function GameControlContent() {
    const { code } = useParams<{ code: string }>();
    const router = useRouter();
    const { success: toastSuccess, error: toastError } = useToast();
    const { isSaving, error, nextQuestion, endSession, fetchState } = useGameSessionControl(code);

    const [state, setState] = useState<GameSessionStatePayload | null>(null);
    const [nowMs, setNowMs] = useState(() => Date.now());
    const [showEndConfirm, setShowEndConfirm] = useState(false);

    const applyState = useCallback((payload: GameSessionStatePayload) => {
        setState(payload);
    }, []);

    const { connected } = useGameSessionSocket(code, applyState);

    useEffect(() => {
        fetchState().then((s) => { if (s) setState(s); });
    }, [fetchState]);

    useEffect(() => {
        if (connected) return;
        const id = setInterval(() => {
            fetchState().then((s) => { if (s) setState(s); });
        }, SAFETY_POLL_MS);
        return () => clearInterval(id);
    }, [connected, fetchState]);

    useEffect(() => {
        const id = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    async function handleNext() {
        const next = await nextQuestion();
        if (next) setState(next);
    }

    async function handleEndConfirm() {
        const ended = await endSession();
        if (ended) {
            setState(ended);
            // Ending a session reverts the game to DRAFT server-side — bust
            // the router cache so the games list/detail reflect that on the
            // next visit instead of still showing "Live".
            router.refresh();
        }
        setShowEndConfirm(false);
    }

    function screenUrl(): string {
        return `${window.location.origin}/games-screen/${code}`;
    }

    async function copyScreenLink() {
        try {
            await navigator.clipboard.writeText(screenUrl());
            toastSuccess("Presentation link copied");
        } catch {
            toastError("Failed to copy link.");
        }
    }

    function openScreen() {
        window.open(screenUrl(), `game-screen-${code}`, "noopener,noreferrer");
    }

    const winner = state?.leaderboard?.[0] ?? null;
    const secondsRemaining = calcGameSecondsRemaining(state, nowMs);
    const isUrgent = secondsRemaining !== null && secondsRemaining <= 5;
    const isCaution = !isUrgent && secondsRemaining !== null && state?.currentQuestion
        && secondsRemaining <= state.currentQuestion.timeLimitSeconds * 0.25;
    let countdownColorClass = "text-[#121212]";
    if (isUrgent) countdownColorClass = "text-red-600";
    else if (isCaution) countdownColorClass = "text-amber-600";
    const isLastQuestion = state
        ? (state.currentQuestionIndex ?? -1) >= state.totalQuestions - 1
        : false;

    return (
        <div className="space-y-6 font-sans">
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/games")} className="w-8 h-8 rounded-full bg-[#F4F1EA] flex items-center justify-center text-[#121212] hover:bg-[#EADCC9] transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">Game Control</p>
                        <h1 className="text-2xl font-light tracking-tight text-[#121212]">{state?.gameTitle ?? "Loading…"}</h1>
                        <p className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                            Join code: <span className="font-mono text-[#121212]">{code}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${state?.status === "LIVE" ? "bg-red-50 text-red-700" : "bg-[#F4F1EA] text-[#8A817C]"}`}>
                        {connected && state?.status === "LIVE" && <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />}
                        {state?.status ?? "Loading…"}
                    </span>
                </div>
            </div>

            <DismissibleError message={error} />

            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#121212]/5 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">Show this on a screen</span>
                    <div className="flex items-center gap-2">
                        <button onClick={copyScreenLink} className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#121212] hover:text-[#8A817C] transition-colors">
                            <Link2 className="w-3.5 h-3.5" /> Copy Link
                        </button>
                        <button onClick={openScreen} className="flex items-center gap-1.5 h-8 px-3 bg-[#121212] text-white text-[11px] font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors">
                            <ExternalLinkIcon className="w-3.5 h-3.5" /> Open Screen
                        </button>
                    </div>
                </div>
                <p className="px-4 py-2.5 text-[11px] text-[#8A817C]">
                    Open the presentation screen on a projector or a second laptop — it needs no login, just this link.
                </p>
            </div>

            {state?.status === "ENDED" ? (
                <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-8 text-center space-y-4">
                    <Trophy className="w-10 h-10 mx-auto text-amber-500" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">That&apos;s a wrap</p>
                    <h2 className="text-2xl font-light tracking-tight text-[#121212]">{state.gameTitle}</h2>
                    {winner ? (
                        <p className="text-sm text-[#121212]">
                            <span className="font-semibold">{winner.memberName}</span> takes the win with {winner.totalScore} pts!
                        </p>
                    ) : (
                        <p className="text-xs text-[#8A817C]">No one played this time.</p>
                    )}
                </div>
            ) : (
                <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-6 space-y-5">
                    <div className="flex items-center justify-between text-xs text-[#8A817C] font-semibold uppercase tracking-wider">
                        <span>Question {(state?.currentQuestionIndex ?? 0) + 1} of {state?.totalQuestions ?? "—"}</span>
                        <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            {state?.answeredCount ?? 0}/{state?.participantCount ?? 0} answered
                        </span>
                    </div>

                    {state?.currentQuestion ? (
                        <div className="space-y-4">
                            <h2 className="text-2xl font-light tracking-tight text-[#121212] text-center">{state.currentQuestion.questionText}</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {state.currentQuestion.options.map((opt, i) => (
                                    <div key={opt + i} className="bg-[#F4F1EA]/50 border border-[#121212]/5 rounded-lg px-4 py-3 text-sm text-[#121212] text-center">
                                        {opt}
                                    </div>
                                ))}
                            </div>
                            {secondsRemaining !== null && (
                                <p className={`text-center text-4xl font-mono font-bold tabular-nums ${countdownColorClass}`}>
                                    {secondsRemaining}s
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-center text-[#8A817C] font-light py-8">Waiting to start the first question…</p>
                    )}

                    <div className="flex items-center justify-center gap-2 pt-2 border-t border-[#121212]/5">
                        <button
                            onClick={handleNext}
                            disabled={isSaving || isLastQuestion}
                            className="flex items-center gap-1.5 h-10 px-5 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors disabled:opacity-40"
                        >
                            <StepForward className="w-3.5 h-3.5" />
                            Next Question
                        </button>
                        {showEndConfirm ? (
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-red-600 font-semibold">End session?</span>
                                <button onClick={handleEndConfirm} disabled={isSaving}
                                    className="h-10 px-3 text-[10px] font-bold uppercase text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors">
                                    Yes, End
                                </button>
                                <button onClick={() => setShowEndConfirm(false)}
                                    className="h-10 px-3 text-[10px] text-[#8A817C] border border-[#121212]/10 rounded-lg hover:bg-[#F4F1EA] transition-colors">
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowEndConfirm(true)}
                                disabled={isSaving}
                                className="flex items-center gap-1.5 h-10 px-5 border border-red-200 text-red-700 text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                            >
                                <SquareIcon className="w-3.5 h-3.5" />
                                End Session
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#121212]/5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8A817C]">Leaderboard</h3>
                </div>
                <table className="w-full text-xs">
                    <tbody>
                        {(state?.leaderboard ?? []).length === 0 && (
                            <tr>
                                <td className="px-4 py-8 text-center text-[#8A817C] font-light">No participants yet.</td>
                            </tr>
                        )}
                        {(state?.leaderboard ?? []).map((entry, i) => (
                            <tr key={entry.participantId} className="border-b border-[#121212]/5 last:border-0">
                                <td className="px-4 py-2.5 w-8 text-[#8A817C] font-mono">{i + 1}</td>
                                <td className="px-4 py-2.5 text-[#121212] font-medium flex items-center gap-1.5">
                                    {i === 0 && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
                                    {entry.memberName}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono text-[#121212]">{entry.totalScore}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const GameControlPage = () => <GameControlContent />;

export default withAuth(GameControlPage, { requiredPermission: "games:write" });
