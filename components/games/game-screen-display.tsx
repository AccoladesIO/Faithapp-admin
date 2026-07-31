"use client";

import { Trophy, Users } from "lucide-react";
import { GameSessionStatePayload, calcGameSecondsRemaining } from "@/hooks/use-games";

interface GameScreenDisplayProps {
    state: GameSessionStatePayload;
    nowMs: number;
}

const PODIUM_STYLE = [
    "text-amber-400", // 1st
    "text-slate-300", // 2nd
    "text-orange-400", // 3rd
];

export function GameScreenDisplay({ state, nowMs }: GameScreenDisplayProps) {
    if (state.status === "ENDED") {
        return <FinalResults state={state} />;
    }
    if (state.currentQuestion) {
        return <QuestionDisplay state={state} nowMs={nowMs} />;
    }
    return (
        <div className="m-auto text-center">
            <p className="text-[clamp(1.5rem,3vw,3rem)] font-light text-white/70">Get ready…</p>
        </div>
    );
}

function QuestionDisplay({ state, nowMs }: GameScreenDisplayProps) {
    const question = state.currentQuestion!;
    const secondsRemaining = calcGameSecondsRemaining(state, nowMs);
    const timesUp = secondsRemaining === 0;
    const isUrgent = !timesUp && secondsRemaining !== null && secondsRemaining <= 5;
    const isCaution = !timesUp && !isUrgent && secondsRemaining !== null
        && secondsRemaining <= question.timeLimitSeconds * 0.25;

    let timerColorClass = "text-white";
    if (isUrgent) timerColorClass = "text-red-400";
    else if (isCaution) timerColorClass = "text-amber-400";

    return (
        <div className="relative z-10 w-full h-full flex flex-col items-center px-[3vw]">
            <div className="shrink-0 w-full h-[14vh] flex items-center justify-between text-[clamp(0.8rem,1.3vw,1.15rem)] text-white/40 uppercase tracking-widest">
                <span>Question {(state.currentQuestionIndex ?? 0) + 1} of {state.totalQuestions}</span>
                <span className="flex items-center gap-2">
                    <Users className="w-[1em] h-[1em]" />
                    {state.answeredCount}/{state.participantCount} answered
                </span>
            </div>

            <div className="shrink-0 w-full flex items-center justify-center text-center px-4 mb-[3vh]">
                <div className="text-[clamp(1.8rem,min(4.5vw,6vh),5.5rem)] font-light leading-tight [text-wrap:balance]">
                    {question.questionText}
                </div>
            </div>

            {timesUp ? (
                <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center">
                    <div className="text-[clamp(3rem,min(12vw,18vh),16rem)] font-black uppercase tracking-tight leading-none text-white animate-pulse">
                        Time&apos;s Up
                    </div>
                </div>
            ) : (
                <>
                    <div className={`shrink-0 text-[clamp(4rem,min(14vw,20vh),18rem)] font-mono font-black tabular-nums leading-none mb-[3vh] ${timerColorClass}`}>
                        {secondsRemaining}
                    </div>
                    <div className="flex-1 min-h-0 w-full grid grid-cols-1 sm:grid-cols-2 gap-[2vh] content-center max-w-[80vw] mx-auto">
                        {question.options.map((opt, i) => (
                            <div
                                key={opt + i}
                                className="bg-white/5 border border-white/10 rounded-2xl px-[2vw] py-[2vh] text-center text-[clamp(1.2rem,min(2.4vw,3vh),2.5rem)] font-light [text-wrap:balance]"
                            >
                                {opt}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function FinalResults({ state }: { state: GameSessionStatePayload }) {
    const podium = state.leaderboard.slice(0, 3);
    const rest = state.leaderboard.slice(3, 10);

    return (
        <div className="m-auto w-full max-w-[70vw] text-center">
            <Trophy className="w-[clamp(2rem,5vw,4rem)] h-[clamp(2rem,5vw,4rem)] mx-auto mb-[2vh] text-amber-400" />
            <p className="text-[clamp(0.85rem,1.4vw,1.15rem)] font-bold uppercase tracking-widest text-white/40 mb-[1vh]">
                That&apos;s a wrap
            </p>
            <h1 className="text-[clamp(1.8rem,4vw,4rem)] font-light leading-tight [text-wrap:balance] mb-[1vh]">
                {state.gameTitle}
            </h1>
            <p className="text-[clamp(0.75rem,1.2vw,1rem)] uppercase tracking-widest text-white/30 mb-[4vh]">
                Final Results
            </p>

            {podium.length === 0 ? (
                <p className="text-[clamp(1.2rem,2.4vw,2rem)] text-white/50 font-light">Great game — no one made it onto the board this time.</p>
            ) : (
                <div className="flex items-end justify-center gap-[3vw] mb-[5vh]">
                    {podium.map((entry, i) => (
                        <div key={entry.participantId} className={i === 0 ? "order-2" : i === 1 ? "order-1" : "order-3"}>
                            <div className={`text-[clamp(1.8rem,3.5vw,3.5rem)] font-black ${PODIUM_STYLE[i]}`}>#{i + 1}</div>
                            <div className="text-[clamp(1.1rem,2.2vw,2.2rem)] font-light [text-wrap:balance]">{entry.memberName}</div>
                            <div className="text-[clamp(0.9rem,1.6vw,1.5rem)] font-mono text-white/50">{entry.totalScore} pts</div>
                        </div>
                    ))}
                </div>
            )}

            {rest.length > 0 && (
                <div className="space-y-[1vh] max-w-[40vw] mx-auto">
                    {rest.map((entry, i) => (
                        <div key={entry.participantId} className="flex items-center justify-between text-[clamp(0.9rem,1.4vw,1.3rem)] text-white/60">
                            <span>{i + 4}. {entry.memberName}</span>
                            <span className="font-mono">{entry.totalScore}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
