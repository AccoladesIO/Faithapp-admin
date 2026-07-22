import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "@/utils/auth/axios-client";
import { ServiceProgrammeSlot, ServiceSlotType } from "./use-service-programme";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

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

export type ServiceSessionSlotStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";

export interface EffectiveSessionSlot {
    id: string;
    position: number;
    status: ServiceSessionSlotStatus;
    type: ServiceSlotType;
    topic: string | null;
    allocatedMinutes: number;
    memberName: string | null;
    guestName: string | null;
    backupMemberId: string | null;
    backupMemberName: string | null;
    backupGuestName: string | null;
    actualSeconds: number | null;
    startedAt: string | null;
    completedAt: string | null;
}

export interface OverrideSlotPayload {
    overriddenTopic?: string;
    overriddenSpeakerName?: string;
    overriddenMemberId?: string;
    adjustedAllocatedMinutes?: number;
}

export function backupLabel(slot: EffectiveSessionSlot): string | null {
    return slot.backupMemberName ?? slot.backupGuestName ?? null;
}

export function backupOverridePayload(slot: EffectiveSessionSlot): OverrideSlotPayload | null {
    if (slot.backupMemberId) return { overriddenMemberId: slot.backupMemberId };
    if (slot.backupGuestName) return { overriddenSpeakerName: slot.backupGuestName };
    return null;
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
    effectiveSlots: EffectiveSessionSlot[];
    cautionThresholdRatio: number;
}

export interface ShareLinks {
    sessionCode: string;
    shareToken: string;
}

export interface AccessGrant {
    id: string;
    name: string;
    createdAt: string;
    revokedAt: string | null;
    lastUsedAt: string | null;
}

function actionUrl(sessionCode: string, action: string, shareToken?: string, grantToken?: string | null): string {
    if (!shareToken) return `/service-session/${sessionCode}/${action}`;
    const params = new URLSearchParams({ token: shareToken });
    if (grantToken) params.set("grantToken", grantToken);
    return `/service-session/${sessionCode}/pm/${action}?${params.toString()}`;
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

function extractError(err: unknown, fallback: string): string {
    const e = err as ApiError;
    return e?.response?.data?.message || e?.message || fallback;
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
        } catch (err: unknown) {
            const msg = extractError(err, "Failed to start session.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const startEventSessions = useCallback(async (eventId: string): Promise<LiveSession> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/service-session/event/${eventId}/start`);
            const session: LiveSession = res.data?.data ?? res.data;
            return session;
        } catch (err: unknown) {
            const msg = extractError(err, "Failed to start the next service slot.");
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

    const advance = useCallback(async (sessionCode: string, shareToken?: string, grantToken?: string | null): Promise<SessionAnchor> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(actionUrl(sessionCode, "advance", shareToken, grantToken));
            const newAnchor: SessionAnchor = res.data?.data ?? res.data;
            setAnchor(newAnchor);
            return newAnchor;
        } catch (err: unknown) {
            const msg = extractError(err, "Failed to advance session.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const rewind = useCallback(async (sessionCode: string, shareToken?: string, grantToken?: string | null): Promise<SessionAnchor> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(actionUrl(sessionCode, "rewind", shareToken, grantToken));
            const newAnchor: SessionAnchor = res.data?.data ?? res.data;
            setAnchor(newAnchor);
            return newAnchor;
        } catch (err: unknown) {
            const msg = extractError(err, "Failed to rewind session.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const reorderLiveSlots = useCallback(async (sessionCode: string, orderedIds: string[], shareToken?: string, grantToken?: string | null): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.put(actionUrl(sessionCode, "slots/reorder", shareToken, grantToken), {
                slots: orderedIds.map((id) => ({ id })),
            });
        } catch (err: unknown) {
            const msg = extractError(err, "Failed to reorder slots.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const overrideSlot = useCallback(async (sessionCode: string, position: number, dto: OverrideSlotPayload, shareToken?: string, grantToken?: string | null): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.post(actionUrl(sessionCode, `slots/${position}/override`, shareToken, grantToken), dto);
        } catch (err: unknown) {
            const msg = extractError(err, "Failed to update slot.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const pauseSession = useCallback(async (sessionCode: string, reason: PauseReason, shareToken?: string, grantToken?: string | null): Promise<SessionAnchor> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(actionUrl(sessionCode, "pause", shareToken, grantToken), { reason });
            const newAnchor: SessionAnchor = res.data?.data ?? res.data;
            setAnchor(newAnchor);
            return newAnchor;
        } catch (err: unknown) {
            const msg = extractError(err, "Failed to pause session.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const resumeSession = useCallback(async (sessionCode: string, shareToken?: string, grantToken?: string | null): Promise<SessionAnchor> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(actionUrl(sessionCode, "resume", shareToken, grantToken));
            const newAnchor: SessionAnchor = res.data?.data ?? res.data;
            setAnchor(newAnchor);
            return newAnchor;
        } catch (err: unknown) {
            const msg = extractError(err, "Failed to resume session.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const adjustTime = useCallback(async (sessionCode: string, deltaSeconds: number, shareToken?: string, grantToken?: string | null): Promise<SessionAnchor> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(actionUrl(sessionCode, "adjust-time", shareToken, grantToken), { deltaSeconds });
            const newAnchor: SessionAnchor = res.data?.data ?? res.data;
            setAnchor(newAnchor);
            return newAnchor;
        } catch (err: unknown) {
            const msg = extractError(err, "Failed to adjust time.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const endSession = useCallback(async (sessionCode: string, shareToken?: string, grantToken?: string | null): Promise<LiveSession> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(actionUrl(sessionCode, "end", shareToken, grantToken));
            const ended: LiveSession = res.data?.data ?? res.data;
            setSession(ended);
            return ended;
        } catch (err: unknown) {
            const msg = extractError(err, "Failed to end session.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const getShareLinks = useCallback(async (sessionCode: string): Promise<ShareLinks> => {
        const res = await api.get(`/service-session/${sessionCode}/share-links`);
        return res.data?.data ?? res.data;
    }, []);

    const rotateShareToken = useCallback(async (sessionCode: string): Promise<ShareLinks> => {
        const res = await api.post(`/service-session/${sessionCode}/rotate-share-token`);
        return res.data?.data ?? res.data;
    }, []);

    const fetchActionLog = useCallback(async (sessionCode: string): Promise<ActionLogEntry[]> => {
        const res = await api.get(`/service-session/${sessionCode}/action-log`);
        return res.data?.data ?? res.data ?? [];
    }, []);

    const fetchAnalytics = useCallback(async (
        from?: string, to?: string, serviceSlotName?: string, memberId?: string, slotType?: string,
    ): Promise<AnalyticsResult> => {
        const query = new URLSearchParams();
        if (from) query.set("from", from);
        if (to) query.set("to", to);
        if (serviceSlotName) query.set("serviceSlotName", serviceSlotName);
        if (memberId) query.set("memberId", memberId);
        if (slotType) query.set("slotType", slotType);
        const qs = query.toString();
        const res = await api.get(`/service-session/analytics${qs ? `?${qs}` : ""}`);
        return res.data?.data ?? res.data;
    }, []);

    const createAccessGrant = useCallback(async (sessionCode: string, name: string, replaceExisting = false): Promise<{ id: string; name: string; pin: string }> => {
        const res = await api.post(`/service-session/${sessionCode}/access-grants`, { name, replaceExisting });
        return res.data?.data ?? res.data;
    }, []);

    const listAccessGrants = useCallback(async (sessionCode: string): Promise<AccessGrant[]> => {
        const res = await api.get(`/service-session/${sessionCode}/access-grants`);
        return res.data?.data ?? res.data ?? [];
    }, []);

    const revokeAccessGrant = useCallback(async (sessionCode: string, grantId: string): Promise<void> => {
        await api.post(`/service-session/${sessionCode}/access-grants/${grantId}/revoke`);
    }, []);

    const verifyAccess = useCallback(async (sessionCode: string, name: string, pin: string, shareToken: string): Promise<{ grantToken: string; name: string }> => {
        try {
            const res = await api.post(
                `/service-session/${sessionCode}/pm/access?token=${encodeURIComponent(shareToken)}`,
                { name, pin },
            );
            return res.data?.data ?? res.data;
        } catch (err: unknown) {
            throw new Error(extractError(err, "Invalid name or PIN."));
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
        startEventSessions,
        fetchLatestSession,
        fetchState,
        advance,
        rewind,
        pauseSession,
        resumeSession,
        adjustTime,
        reorderLiveSlots,
        overrideSlot,
        endSession,
        getShareLinks,
        rotateShareToken,
        fetchActionLog,
        fetchAnalytics,
        createAccessGrant,
        listAccessGrants,
        revokeAccessGrant,
        verifyAccess,
    };
}

export interface ActiveSession {
    sessionCode: string;
    serviceSlotName: string;
    startedAt: string;
}

export interface ActionLogEntry {
    createdAt: string;
    actorRole: "ADMIN" | "WORKER" | "PUBLIC_LINK";
    actorName: string | null;
    action: string;
    detail: string | null;
}

export interface SlotTypeStats {
    type: string;
    totalSlots: number;
    completedSlots: number;
    avgActualSeconds: number | null;
    avgAllocatedMinutes: number;
    avgOverrunSeconds: number | null;
    overrunCount: number;
}

export interface TopSpeaker {
    memberId: string;
    name: string;
    slotCount: number;
    totalActualSeconds: number;
    avgActualSeconds: number;
}

export interface AnalyticsSessionSummary {
    sessionCode: string;
    startedAt: string;
    totalDurationMinutes: number | null;
    completionRate: number;
    overrunSlots: number;
    totalPauseDurationSeconds: number;
}

export interface AnalyticsResult {
    from: string | null;
    to: string | null;
    totalSessions: number;
    slotTypeStats: SlotTypeStats[];
    sessions: AnalyticsSessionSummary[];
    topSpeakers: TopSpeaker[];
}

const ACTIVE_SESSIONS_POLL_MS = 20000;
const ACTIVE_SESSIONS_IDLE_POLL_MS = 60000;

export function useActiveSessions(): ActiveSession[] {
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const sessionsRef = useRef<ActiveSession[]>([]);

    const fetchActive = useCallback(async () => {
        try {
            const res = await api.get("/service-session/active");
            const next: ActiveSession[] = res.data?.data ?? res.data ?? [];
            sessionsRef.current = next;
            setSessions(next);
        } catch {
            // Non-critical background poll — leave the previous value in place.
        }
    }, []);

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;
        let cancelled = false;

        // Back off to a slow cadence while idle (the common case — nothing
        // live most of the time) and only poll frequently while a session is
        // actually live, since that's when a change is likely.
        const tick = async () => {
            await fetchActive();
            if (cancelled) return;
            const delay = sessionsRef.current.length > 0
                ? ACTIVE_SESSIONS_POLL_MS
                : ACTIVE_SESSIONS_IDLE_POLL_MS;
            timeoutId = setTimeout(tick, delay);
        };

        tick();
        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [fetchActive]);

    return sessions;
}
