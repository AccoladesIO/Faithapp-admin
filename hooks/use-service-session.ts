import { useState, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";
import { ServiceProgrammeSlot } from "./use-service-programme";

export type ServiceSessionStatus = "LIVE" | "COMPLETED";

export type PauseReason =
    | "TECHNICAL_ISSUE"
    | "ANNOUNCEMENT"
    | "BREAK_INTERVAL"
    | "UNPLANNED_DELAY"
    | "OTHER";

export const PAUSE_REASON_LABELS: Record<PauseReason, string> = {
    TECHNICAL_ISSUE: "Technical Issue",
    ANNOUNCEMENT: "Announcement",
    BREAK_INTERVAL: "Break / Interval",
    UNPLANNED_DELAY: "Unplanned Delay",
    OTHER: "Other",
};

export interface SessionAnchor {
    currentSlotPosition: number;
    slotStartedAt: number;
    slotBaseSeconds: number;
    status: ServiceSessionStatus;
    isPaused: boolean;
    pausedAt: number | null;
}

export interface LiveSession {
    id: string;
    sessionCode: string;
    status: ServiceSessionStatus;
    startedAt: string;
    endedAt: string | null;
}

export interface SessionStatePayload {
    anchor: SessionAnchor;
    session: LiveSession & {
        programme: {
            id: string;
            serviceSlotName: string | null;
            slots: ServiceProgrammeSlot[];
        };
    };
}

export function calcElapsedSeconds(anchor: SessionAnchor, nowMs: number): number {
    if (anchor.isPaused && anchor.pausedAt !== null) {
        return anchor.slotBaseSeconds + (anchor.pausedAt - anchor.slotStartedAt) / 1000;
    }
    return anchor.slotBaseSeconds + (nowMs - anchor.slotStartedAt) / 1000;
}

export function formatMMSS(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function extractError(err: any, fallback: string): string {
    return err?.response?.data?.message || err?.message || fallback;
}

export function useServiceSession() {
    const [anchor, setAnchor] = useState<SessionAnchor | null>(null);
    const [session, setSession] = useState<LiveSession | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startSession = useCallback(async (programmeId: string): Promise<LiveSession> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/service-session/programme/${programmeId}/start`);
            const liveSession: LiveSession = res.data?.data ?? res.data;
            setSession(liveSession);
            return liveSession;
        } catch (err: any) {
            const msg = extractError(err, "Failed to start session.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchLatestSession = useCallback(async (programmeId: string): Promise<LiveSession | null> => {
        try {
            const res = await api.get(`/service-programme/${programmeId}/sessions?page=1&limit=1`);
            const outer = res.data?.data;
            const list: LiveSession[] = Array.isArray(outer?.data) ? outer.data : [];
            const latest = list[0] ?? null;
            if (latest) setSession(latest);
            return latest;
        } catch {
            return null;
        }
    }, []);

    const fetchState = useCallback(async (sessionCode: string): Promise<SessionStatePayload | null> => {
        try {
            const res = await api.get(`/service-session/${sessionCode}/state`);
            const payload: SessionStatePayload = res.data?.data ?? res.data;
            if (payload?.anchor) setAnchor(payload.anchor);
            if (payload?.session) setSession(payload.session);
            return payload;
        } catch {
            return null;
        }
    }, []);

    const advance = useCallback(async (sessionCode: string): Promise<SessionAnchor> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/service-session/${sessionCode}/advance`);
            const newAnchor: SessionAnchor = res.data?.data ?? res.data;
            setAnchor(newAnchor);
            return newAnchor;
        } catch (err: any) {
            const msg = extractError(err, "Failed to advance session.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const rewind = useCallback(async (sessionCode: string): Promise<SessionAnchor> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/service-session/${sessionCode}/rewind`);
            const newAnchor: SessionAnchor = res.data?.data ?? res.data;
            setAnchor(newAnchor);
            return newAnchor;
        } catch (err: any) {
            const msg = extractError(err, "Failed to rewind session.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const pauseSession = useCallback(async (sessionCode: string, reason: PauseReason): Promise<SessionAnchor> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/service-session/${sessionCode}/pause`, { reason });
            const newAnchor: SessionAnchor = res.data?.data ?? res.data;
            setAnchor(newAnchor);
            return newAnchor;
        } catch (err: any) {
            const msg = extractError(err, "Failed to pause session.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const resumeSession = useCallback(async (sessionCode: string): Promise<SessionAnchor> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/service-session/${sessionCode}/resume`);
            const newAnchor: SessionAnchor = res.data?.data ?? res.data;
            setAnchor(newAnchor);
            return newAnchor;
        } catch (err: any) {
            const msg = extractError(err, "Failed to resume session.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const endSession = useCallback(async (sessionCode: string): Promise<LiveSession> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/service-session/${sessionCode}/end`);
            const ended: LiveSession = res.data?.data ?? res.data;
            setSession(ended);
            return ended;
        } catch (err: any) {
            const msg = extractError(err, "Failed to end session.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const clearError = useCallback(() => setError(null), []);
    return {
        anchor,
        session,
        isSubmitting,
        error,

        clearError,
        startSession,
        fetchLatestSession,
        fetchState,
        advance,
        rewind,
        pauseSession,
        resumeSession,
        endSession,
    };
}
