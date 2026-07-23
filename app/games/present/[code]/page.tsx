"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { withAuth } from "@/utils/auth/with-auth";
import {
    ArrowLeft, Users, CheckCircle2, StepForward, Square as SquareIcon, Trophy, Copy,
} from "lucide-react";
import { useGameSessionControl, GameSessionStatePayload } from "@/hooks/use-games";
import { useGameSessionSocket } from "@/hooks/use-game-session-socket";
import { DismissibleError } from "@/components/ui/dismissible-error";

const SAFETY_POLL_MS = 30_000;

function GamePresenterContent() {
    const { code } = useParams<{ code: string }>();
    const router = useRouter();
    const { isSaving, error, nextQuestion, endSession, fetchState } = useGameSessionControl(code);

    const [state, setState] = useState<GameSessionStatePayload | null>(null);
    const [copied, setCopied] = useState(false);

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

    async function handleNext() {
        const next = await nextQuestion();
        if (next) setState(next);
    }

    async function handleEnd() {
        if (!window.confirm("End this session? Players will no longer be able to answer.")) return;
        const ended = await endSession();
        if (ended) setState(ended);
    }

    function copyCode() {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const isLastQuestion = state
        ? (state.currentQuestionIndex ?? -1) >= state.totalQuestions - 1
        : false;

    return (
        <div className="space-y-6 font-sans">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/games")} className="w-8 h-8 rounded-full bg-[#F4F1EA] flex items-center justify-center text-[#121212] hover:bg-[#EADCC9] transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-light tracking-tight text-[#121212]">Presenter View</h1>
                        <button onClick={copyCode} className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1 hover:text-[#121212]">
                            Join code: <span className="font-mono text-[#121212]">{code}</span>
                            <Copy className="w-3 h-3" />
                            {copied && <span className="text-green-600 normal-case">Copied</span>}
                        </button>
                    </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${state?.status === "LIVE" ? "bg-red-50 text-red-700" : "bg-[#F4F1EA] text-[#8A817C]"}`}>
                    {connected && state?.status === "LIVE" && <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />}
                    {state?.status ?? "Loading…"}
                </span>
            </div>

            <DismissibleError message={error} />

            {state?.status === "ENDED" ? (
                <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-8 text-center space-y-4">
                    <Trophy className="w-10 h-10 mx-auto text-amber-500" />
                    <h2 className="text-xl font-light text-[#121212]">Session Ended</h2>
                    <p className="text-xs text-[#8A817C]">Final leaderboard below.</p>
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
                            {state.secondsRemaining !== null && (
                                <p className="text-center text-3xl font-light text-[#121212] font-mono">{state.secondsRemaining}s</p>
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
                        <button
                            onClick={handleEnd}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 h-10 px-5 border border-red-200 text-red-700 text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                            <SquareIcon className="w-3.5 h-3.5" />
                            End Session
                        </button>
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

const GamePresenterPage = () => <GamePresenterContent />;

export default withAuth(GamePresenterPage, { requiredPermission: "games:write" });
