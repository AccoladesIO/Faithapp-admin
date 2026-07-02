import { useState, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

export type PrayerAudience = "WORKERS" | "MEMBERS" | "ALL";

export interface PrayerProgram {
    id: string;
    name: string;
    description: string | null;
    audience: PrayerAudience;
    selectionWindowDays: number;
    isActive: boolean;
}

export interface PrayerDayConfig {
    id: string;
    dayOfWeek: number;
    mode: "PHYSICAL" | "VIRTUAL";
    startTime: string;
    endTime: string;
    maxCapacity: number;
    isActive: boolean;
}

export interface PrayerScheduleRule {
    id: string;
    type: "ROLE_FREQUENCY" | "MIN_LEADERS_PER_MEETING" | "MAX_PER_MEETING";
    targetLeadType: string | null;
    value: number;
    description: string;
    isActive: boolean;
}

export interface PrayerFixedAssignment {
    id: string;
    workerProfile: { id: string; member: { firstname: string; lastname: string } };
    dayConfig: { id: string; dayOfWeek: number; startTime: string };
}

export interface PrayerRosterEntry {
    id: string;
    workerProfile: { id: string; member: { firstname: string; lastname: string } } | null;
    member: { id: string; firstname: string; lastname: string } | null;
    assignmentType: "FIXED" | "SELF_SELECTED" | "AUTO_ASSIGNED" | "MANUAL";
    status: "SCHEDULED" | "RESCHEDULED";
}

export interface PrayerMeeting {
    id: string;
    date: string;
    month: number;
    year: number;
    dayConfig: PrayerDayConfig;
    status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
    selectionStatus: "PENDING" | "OPEN" | "CLOSED";
    currentCapacity: number;
    rosterEntries: PrayerRosterEntry[];
}

export interface AutoAssignResult {
    assigned: number;
    unassignable: string[];
}

export interface ValidationReport {
    valid: boolean;
    issues: string[];
}

type ErrShape = { response?: { data?: { message?: string } }; message?: string };
const msg = (e: unknown, fallback: string) => {
    const err = e as ErrShape;
    return err?.response?.data?.message || err?.message || fallback;
};

export function usePrayer() {
    const [programs, setPrograms] = useState<PrayerProgram[]>([]);
    const [dayConfigs, setDayConfigs] = useState<PrayerDayConfig[]>([]);
    const [rules, setRules] = useState<PrayerScheduleRule[]>([]);
    const [fixedAssignments, setFixedAssignments] = useState<PrayerFixedAssignment[]>([]);
    const [roster, setRoster] = useState<PrayerMeeting[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Programs ───────────────────────────────────────────────────────────────

    const fetchPrograms = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/prayer/admin/programs");
            setPrograms(res.data?.data ?? res.data ?? []);
        } catch (e) {
            setError(msg(e, "Failed to fetch programs."));
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createProgram = useCallback(async (payload: {
        name: string;
        description?: string;
        audience: PrayerAudience;
        selectionWindowDays?: number;
    }): Promise<PrayerProgram> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/prayer/admin/programs", payload);
            const created: PrayerProgram = res.data?.data ?? res.data;
            setPrograms((prev) => [...prev, created]);
            return created;
        } catch (e) {
            const m = msg(e, "Failed to create program.");
            setError(m);
            throw new Error(m);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateProgram = useCallback(async (id: string, payload: {
        name?: string;
        description?: string;
        audience?: PrayerAudience;
        selectionWindowDays?: number;
        isActive?: boolean;
    }): Promise<PrayerProgram> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/prayer/admin/programs/${id}`, payload);
            const updated: PrayerProgram = res.data?.data ?? res.data;
            setPrograms((prev) => prev.map((p) => (p.id === id ? updated : p)));
            return updated;
        } catch (e) {
            const m = msg(e, "Failed to update program.");
            setError(m);
            throw new Error(m);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const cloneProgram = useCallback(async (
        sourceId: string,
        payload: {
            name: string;
            description?: string;
            audience?: PrayerAudience;
            selectionWindowDays?: number;
            includeFixedAssignments?: boolean;
        },
    ): Promise<PrayerProgram> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/prayer/admin/programs/${sourceId}/clone`, payload);
            const created: PrayerProgram = res.data?.data ?? res.data;
            setPrograms((prev) => [...prev, created]);
            return created;
        } catch (e) {
            const m = msg(e, "Failed to clone program.");
            setError(m);
            throw new Error(m);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deactivateProgram = useCallback(async (id: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/prayer/admin/programs/${id}`);
            setPrograms((prev) => prev.map((p) => p.id === id ? { ...p, isActive: false } : p));
        } catch (e) {
            const m = msg(e, "Failed to deactivate program.");
            setError(m);
            throw new Error(m);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    // ── Day Configs ────────────────────────────────────────────────────────────

    const fetchDayConfigs = useCallback(async (programId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/prayer/admin/day-configs?programId=${programId}`);
            setDayConfigs(res.data?.data ?? res.data ?? []);
        } catch (e) {
            setError(msg(e, "Failed to fetch day configs."));
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createDayConfig = useCallback(async (programId: string, payload: {
        dayOfWeek: number;
        mode: "PHYSICAL" | "VIRTUAL";
        startTime: string;
        endTime: string;
        maxCapacity: number;
    }): Promise<PrayerDayConfig> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/prayer/admin/day-configs?programId=${programId}`, payload);
            const created: PrayerDayConfig = res.data?.data ?? res.data;
            setDayConfigs((prev) => [...prev, created]);
            return created;
        } catch (e) {
            const m = msg(e, "Failed to create day config.");
            setError(m);
            throw new Error(m);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateDayConfig = useCallback(async (id: string, payload: {
        mode?: "PHYSICAL" | "VIRTUAL";
        startTime?: string;
        endTime?: string;
        maxCapacity?: number;
        isActive?: boolean;
    }): Promise<PrayerDayConfig> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/prayer/admin/day-configs/${id}`, payload);
            const updated: PrayerDayConfig = res.data?.data ?? res.data;
            setDayConfigs((prev) => prev.map((d) => (d.id === id ? updated : d)));
            return updated;
        } catch (e) {
            const m = msg(e, "Failed to update day config.");
            setError(m);
            throw new Error(m);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    // ── Rules ──────────────────────────────────────────────────────────────────

    const fetchRules = useCallback(async (programId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/prayer/admin/rules?programId=${programId}`);
            setRules(res.data?.data ?? res.data ?? []);
        } catch (e) {
            setError(msg(e, "Failed to fetch rules."));
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createRule = useCallback(async (programId: string, payload: {
        type: "ROLE_FREQUENCY" | "MIN_LEADERS_PER_MEETING" | "MAX_PER_MEETING";
        targetLeadType?: string;
        value: number;
        description: string;
    }): Promise<PrayerScheduleRule> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/prayer/admin/rules?programId=${programId}`, payload);
            const created: PrayerScheduleRule = res.data?.data ?? res.data;
            setRules((prev) => [...prev, created]);
            return created;
        } catch (e) {
            const m = msg(e, "Failed to create rule.");
            setError(m);
            throw new Error(m);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateRule = useCallback(async (id: string, payload: {
        value?: number;
        description?: string;
        isActive?: boolean;
    }): Promise<PrayerScheduleRule> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/prayer/admin/rules/${id}`, payload);
            const updated: PrayerScheduleRule = res.data?.data ?? res.data;
            setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
            return updated;
        } catch (e) {
            const m = msg(e, "Failed to update rule.");
            setError(m);
            throw new Error(m);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    // ── Fixed Assignments ──────────────────────────────────────────────────────

    const fetchFixedAssignments = useCallback(async (programId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/prayer/admin/fixed-assignments?programId=${programId}`);
            setFixedAssignments(res.data?.data ?? res.data ?? []);
        } catch (e) {
            setError(msg(e, "Failed to fetch fixed assignments."));
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createFixedAssignment = useCallback(async (programId: string, payload: {
        workerProfileId: string;
        dayConfigId: string;
    }): Promise<PrayerFixedAssignment> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/prayer/admin/fixed-assignments?programId=${programId}`, payload);
            const created: PrayerFixedAssignment = res.data?.data ?? res.data;
            setFixedAssignments((prev) => [...prev, created]);
            return created;
        } catch (e) {
            const m = msg(e, "Failed to create fixed assignment.");
            setError(m);
            throw new Error(m);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteFixedAssignment = useCallback(async (id: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/prayer/admin/fixed-assignments/${id}`);
            setFixedAssignments((prev) => prev.filter((a) => a.id !== id));
        } catch (e) {
            const m = msg(e, "Failed to delete fixed assignment.");
            setError(m);
            throw new Error(m);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    // ── Roster ─────────────────────────────────────────────────────────────────

    const fetchRoster = useCallback(async (programId: string, month: number, year: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/prayer/admin/roster/${month}/${year}?programId=${programId}`);
            setRoster(res.data?.data ?? res.data ?? []);
        } catch (e) {
            setError(msg(e, "Failed to fetch roster."));
        } finally {
            setIsLoading(false);
        }
    }, []);

    const generateMeetings = useCallback(async (programId: string, month: number, year: number): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.post(`/prayer/admin/meetings/generate?programId=${programId}`, { month, year });
        } catch (e) {
            const m = msg(e, "Failed to generate meetings.");
            setError(m);
            throw new Error(m);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const openSelection = useCallback(async (programId: string, month: number, year: number): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.post(`/prayer/admin/meetings/open-selection?programId=${programId}`, { month, year });
        } catch (e) {
            const m = msg(e, "Failed to open selection.");
            setError(m);
            throw new Error(m);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const closeSelection = useCallback(async (programId: string, month: number, year: number): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.post(`/prayer/admin/meetings/close-selection?programId=${programId}`, { month, year });
        } catch (e) {
            const m = msg(e, "Failed to close selection.");
            setError(m);
            throw new Error(m);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const autoAssign = useCallback(async (programId: string, month: number, year: number): Promise<AutoAssignResult> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/prayer/admin/roster/auto-assign?programId=${programId}&month=${month}&year=${year}`);
            return res.data?.data ?? res.data;
        } catch (e) {
            const m = msg(e, "Failed to auto-assign.");
            setError(m);
            throw new Error(m);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const manualAssign = useCallback(async (
        programId: string,
        payload: { meetingId: string; workerProfileId?: string; memberId?: string },
    ): Promise<PrayerRosterEntry> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/prayer/admin/roster/manual-assign?programId=${programId}`, payload);
            return res.data?.data ?? res.data;
        } catch (e) {
            const m = msg(e, "Failed to assign.");
            setError(m);
            throw new Error(m);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const removeEntry = useCallback(async (entryId: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/prayer/admin/roster/entries/${entryId}`);
        } catch (e) {
            const m = msg(e, "Failed to remove assignment.");
            setError(m);
            throw new Error(m);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const validateRoster = useCallback(async (programId: string, month: number, year: number): Promise<ValidationReport> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.get(`/prayer/admin/roster/validate?programId=${programId}&month=${month}&year=${year}`);
            return res.data?.data ?? res.data;
        } catch (e) {
            const m = msg(e, "Failed to validate roster.");
            setError(m);
            throw new Error(m);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const rescheduleEntry = useCallback(async (entryId: string, newMeetingId: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.patch(`/prayer/admin/roster/entries/${entryId}/reschedule`, { newMeetingId });
        } catch (e) {
            const m = msg(e, "Failed to reschedule entry.");
            setError(m);
            throw new Error(m);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const clearError = useCallback(() => setError(null), []);
    return {
        programs,
        dayConfigs,
        rules,
        fixedAssignments,
        roster,
        isLoading,
        isSubmitting,
        error,

        clearError,
        setError,
        fetchPrograms,
        createProgram,
        updateProgram,
        cloneProgram,
        deactivateProgram,
        fetchDayConfigs,
        createDayConfig,
        updateDayConfig,
        fetchRules,
        createRule,
        updateRule,
        fetchFixedAssignments,
        createFixedAssignment,
        deleteFixedAssignment,
        fetchRoster,
        generateMeetings,
        openSelection,
        closeSelection,
        autoAssign,
        manualAssign,
        removeEntry,
        validateRoster,
        rescheduleEntry,
    };
}
