import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { SessionStatePayload } from "./use-service-session";

function socketOrigin(): string | null {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return null;
    try {
        // Socket.IO attaches directly to the HTTP server, not under the
        // versioned REST prefix (e.g. NEXT_PUBLIC_API_URL=".../v1") — only
        // the origin is relevant here.
        return new URL(apiUrl).origin;
    } catch {
        return null;
    }
}

/**
 * Joins the `/service-session` namespace room for `sessionCode` and calls
 * `onState` with every live-broadcast update, replacing per-client polling
 * of GET /state. Callers should still keep a slow (e.g. 30s+) safety-net
 * poll for the rare case a broadcast is missed during a disconnect.
 */
export function useLiveSessionSocket(
    sessionCode: string,
    onState: (payload: SessionStatePayload) => void,
): { connected: boolean } {
    const [connected, setConnected] = useState(false);
    const onStateRef = useRef(onState);

    useEffect(() => {
        onStateRef.current = onState;
    }, [onState]);

    useEffect(() => {
        const origin = socketOrigin();
        if (!origin || !sessionCode) return;

        const socket: Socket = io(`${origin}/service-session`, {
            transports: ["websocket", "polling"],
        });

        socket.on("connect", () => {
            setConnected(true);
            socket.emit("joinSession", { sessionCode });
        });
        socket.on("disconnect", () => setConnected(false));
        socket.on("session:state", (payload: SessionStatePayload) => {
            onStateRef.current(payload);
        });

        return () => {
            socket.emit("leaveSession", { sessionCode });
            socket.disconnect();
        };
    }, [sessionCode]);

    return { connected };
}
