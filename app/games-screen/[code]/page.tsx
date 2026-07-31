"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Radio } from "lucide-react";
import { useGamePresentationState, GameSessionStatePayload } from "@/hooks/use-games";
import { useGameSessionSocket } from "@/hooks/use-game-session-socket";
import { GameScreenDisplay } from "@/components/games/game-screen-display";

// Live updates arrive via socket; this is only a safety net in case a
// broadcast is missed during a disconnect/reconnect or a backend restart.
const SAFETY_POLL_MS = 30_000;

export default function GameScreenPage() {
    const params = useParams<{ code: string }>();
    const sessionCode = params.code;
    const { fetchState } = useGamePresentationState(sessionCode);
    const [state, setState] = useState<GameSessionStatePayload | null>(null);
    const [nowMs, setNowMs] = useState(() => Date.now());
    const [loaded, setLoaded] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const poll = useCallback(async () => {
        const result = await fetchState();
        // A failed poll (rate limit, transient network blip) must never be
        // treated as "the session ended" — keep the last known-good payload
        // and let the next poll recover.
        if (result) setState(result);
        setLoaded(true);
    }, [fetchState]);

    const { connected } = useGameSessionSocket(sessionCode, (result) => {
        setState(result);
        setLoaded(true);
    });

    useEffect(() => {
        poll();
        const id = setInterval(poll, SAFETY_POLL_MS);
        return () => clearInterval(id);
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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== "f") return;
            e.preventDefault();
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                document.documentElement.requestFullscreen();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <div className="h-screen overflow-hidden bg-[#121212] text-white flex flex-col px-[3vw] py-[4vh]">
            {state && (
                <div className="relative z-10 shrink-0 flex items-center gap-3 mb-[1vh] text-white/40">
                    {state.status === "LIVE" && (
                        <span className="flex items-center gap-2 text-[clamp(0.8rem,1.3vw,1.15rem)] font-bold uppercase tracking-widest text-red-400">
                            <Radio className="w-[1em] h-[1em] animate-pulse" /> Live
                        </span>
                    )}
                    <span className="text-[clamp(0.8rem,1.3vw,1.15rem)] uppercase tracking-widest">
                        {connected ? "" : "Reconnecting… "}{state.gameTitle} · {sessionCode}
                    </span>
                </div>
            )}

            <div className="flex-1 min-h-0 w-full flex overflow-hidden">
                {state ? (
                    <GameScreenDisplay state={state} nowMs={nowMs} />
                ) : loaded ? (
                    <p className="m-auto text-white/50 text-lg">Session not found or has ended.</p>
                ) : (
                    <p className="m-auto text-white/40 text-sm uppercase tracking-widest">Loading…</p>
                )}
            </div>

            {!isFullscreen && (
                <span className="fixed bottom-4 right-4 z-10 text-[10px] text-white/30 uppercase tracking-widest">
                    Press F for fullscreen
                </span>
            )}
        </div>
    );
}
