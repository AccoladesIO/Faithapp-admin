import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { GameSessionStatePayload } from "./use-games";

function socketOrigin(): string | null {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return null;
    try {
        return new URL(apiUrl).origin;
    } catch {
        return null;
    }
}

/**
 * Joins the `/game-session` namespace room for `sessionCode` and calls
 * `onState` with every live-broadcast update — mirrors useLiveSessionSocket.
 * Callers should still keep a slow safety-net poll for the rare case a
 * broadcast is missed during a disconnect.
 */
export function useGameSessionSocket(
    sessionCode: string,
    onState: (payload: GameSessionStatePayload) => void,
): { connected: boolean } {
    const [connected, setConnected] = useState(false);
    const onStateRef = useRef(onState);

    useEffect(() => {
        onStateRef.current = onState;
    }, [onState]);

    useEffect(() => {
        const origin = socketOrigin();
        if (!origin || !sessionCode) return;

        const socket: Socket = io(`${origin}/game-session`, {
            transports: ["websocket", "polling"],
        });

        socket.on("connect", () => {
            setConnected(true);
            socket.emit("joinSession", { sessionCode });
        });
        socket.on("disconnect", () => setConnected(false));
        socket.on("session:state", (payload: GameSessionStatePayload) => {
            onStateRef.current(payload);
        });

        return () => {
            socket.emit("leaveSession", { sessionCode });
            socket.disconnect();
        };
    }, [sessionCode]);

    return { connected };
}
