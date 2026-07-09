import { useState, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type FirstTimerSourceEnum = "WALK_IN" | "ONLINE" | "REFERRAL";
export type FollowUpTaskStatusEnum = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "UNREACHABLE";
export type FollowUpTaskTypeEnum = "FIRST_TIMER" | "ONLINE_NO_RESPONSE" | "MANUAL";
export type FollowUpOutcomeEnum = "JOINED" | "DECLINED" | "NO_ANSWER" | "PRAYED_WITH";

export interface FirstTimer {
    id: string;
    firstname: string;
    lastname: string;
    phone: string;
    email: string | null;
    source: FirstTimerSourceEnum;
    wantsToJoinChurch: boolean;
    wantsToJoinWorkforce: boolean;
    notes: string | null;
    convertedAt: string | null;
    inviteSentAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface WorkerProfile {
    id: string;
    firstname: string;
    lastname: string;
}

export interface FollowUpTask {
    id: string;
    type: FollowUpTaskTypeEnum;
    status: FollowUpTaskStatusEnum;
    outcome: FollowUpOutcomeEnum | null;
    dueDate: string | null;
    lastActivityAt: string;
    firstTimer: FirstTimer | null;
    workerProfile: WorkerProfile | null;
    assignedTo?: { id: string; member?: { firstname: string; lastname: string } } | null;
    createdAt: string;
    updatedAt: string;
}

export interface FollowUpReportWorker {
    workerName: string;
    assigned: number;
    completed: number;
    joined: number;
}

export interface FollowUpReportEvent {
    eventName: string;
    firstTimers: number;
}

export interface FollowUpReport {
    period: { from: string | null; to: string | null };
    firstTimers: {
        total: number;
        bySource: Record<string, number>;
        wantsToJoinChurch: number;
        wantsToJoinWorkforce: number;
    };
    tasks: {
        total: number;
        byStatus: Record<string, number>;
        byOutcome: Record<string, number>;
        overdue: number;
        conversionRate: string;
    };
    byWorker: FollowUpReportWorker[];
    byEvent: FollowUpReportEvent[];
}

export interface PipelineReport {
    total: number;
    untouched: number;
    contacted: number;
    returned: number;
    invited: number;
    converted: number;
}

export interface FirstTimerVisit {
    id: string;
    visitedAt: string;
    notes: string | null;
    createdAt: string;
}

export interface FollowUpPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface CreateFirstTimerDto {
    firstname: string;
    lastname: string;
    phone: string;
    email?: string;
    source: FirstTimerSourceEnum;
    wantsToJoinChurch: boolean;
    wantsToJoinWorkforce: boolean;
    notes?: string;
    enjoyedAboutChurch?: string;
    visitedEventId?: string;
}

export interface LogVisitDto {
    notes?: string;
    visitedAt?: string;
}

export interface AdminUpdateTaskDto {
    status?: FollowUpTaskStatusEnum;
    outcome?: FollowUpOutcomeEnum;
    outcomeNotes?: string;
    dueDate?: string;
    noteContent?: string;
    contactMethod?: string;
}

export function useFollowUp(defaultLimit = 10) {
    const [firstTimers, setFirstTimers] = useState<FirstTimer[]>([]);
    const [firstTimerPagination, setFirstTimerPagination] = useState<FollowUpPagination | null>(null);

    const [tasks, setTasks] = useState<FollowUpTask[]>([]);
    const [taskPagination, setTaskPagination] = useState<FollowUpPagination | null>(null);

    const [staleTasks, setStaleTasks] = useState<FollowUpTask[]>([]);
    const [staleTaskPagination, setStaleTaskPagination] = useState<FollowUpPagination | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchFirstTimers = useCallback(async (params?: {
        page?: number;
        limit?: number;
        eventId?: string;
        source?: FirstTimerSourceEnum | "";
        wantsToJoinChurch?: boolean;
        wantsToJoinWorkforce?: boolean;
        search?: string;
        dateFrom?: string;
        dateTo?: string;
    }) => {
        setIsLoading(true);
        setError(null);
        try {
            const page = params?.page ?? 1;
            const limit = params?.limit ?? defaultLimit;
            const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
            if (params?.eventId) qs.set("eventId", params.eventId);
            if (params?.source) qs.set("source", params.source);
            if (params?.wantsToJoinChurch !== undefined) qs.set("wantsToJoinChurch", String(params.wantsToJoinChurch));
            if (params?.wantsToJoinWorkforce !== undefined) qs.set("wantsToJoinWorkforce", String(params.wantsToJoinWorkforce));
            if (params?.search) qs.set("search", params.search);
            if (params?.dateFrom) qs.set("dateFrom", params.dateFrom);
            if (params?.dateTo) qs.set("dateTo", params.dateTo);
            const res = await api.get(`/admin/follow-up/first-timers?${qs.toString()}`);
            const outer = res.data?.data;
            const list: FirstTimer[] = Array.isArray(outer?.data) ? outer.data : [];
            setFirstTimers(list);
            setFirstTimerPagination({
                page: outer?.page ?? page,
                limit: outer?.limit ?? limit,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch first timers.");
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const createFirstTimer = useCallback(async (dto: CreateFirstTimerDto): Promise<FirstTimer> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/admin/follow-up/first-timers", dto);
            const created: FirstTimer = res.data?.data;
            setFirstTimers((prev) => [created, ...prev]);
            return created;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to create first timer.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchTasks = useCallback(async (params?: {
        page?: number;
        limit?: number;
        status?: FollowUpTaskStatusEnum | "";
        type?: FollowUpTaskTypeEnum | "";
        search?: string;
    }) => {
        setIsLoading(true);
        setError(null);
        try {
            const page = params?.page ?? 1;
            const limit = params?.limit ?? defaultLimit;
            const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
            if (params?.status) qs.set("status", params.status);
            if (params?.type) qs.set("type", params.type);
            if (params?.search) qs.set("search", params.search);
            const res = await api.get(`/admin/follow-up/tasks?${qs.toString()}`);
            const outer = res.data?.data;
            const list: FollowUpTask[] = Array.isArray(outer?.data) ? outer.data : [];
            setTasks(list);
            setTaskPagination({
                page: outer?.page ?? page,
                limit: outer?.limit ?? limit,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch tasks.");
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const fetchStaleTasks = useCallback(async (params?: {
        daysInactive?: number;
        page?: number;
        limit?: number;
    }) => {
        setIsLoading(true);
        setError(null);
        try {
            const page = params?.page ?? 1;
            const limit = params?.limit ?? defaultLimit;
            const daysInactive = params?.daysInactive ?? 7;
            const qs = new URLSearchParams({
                page: String(page),
                limit: String(limit),
                daysInactive: String(daysInactive),
            });
            const res = await api.get(`/admin/follow-up/tasks/stale?${qs.toString()}`);
            const outer = res.data?.data;
            const list: FollowUpTask[] = Array.isArray(outer?.data) ? outer.data : [];
            setStaleTasks(list);
            setStaleTaskPagination({
                page: outer?.page ?? page,
                limit: outer?.limit ?? limit,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch stale tasks.");
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const bulkUpdateTasks = useCallback(async (
        taskUpdates: { id: string; status: FollowUpTaskStatusEnum }[]
    ): Promise<{ updated: number }> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch("/admin/follow-up/tasks/bulk", { tasks: taskUpdates });
            const result: { updated: number } = res.data?.data;
            setTasks((prev) =>
                prev.map((t) => {
                    const update = taskUpdates.find((u) => u.id === t.id);
                    return update ? { ...t, status: update.status } : t;
                })
            );
            return result;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to bulk update tasks.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const reassignTask = useCallback(async (taskId: string, workerProfileId: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.patch(`/admin/follow-up/tasks/${taskId}/reassign`, { workerProfileId });
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to reassign task.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const adminUpdateTask = useCallback(async (taskId: string, dto: AdminUpdateTaskDto): Promise<FollowUpTask> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/follow-up/tasks/${taskId}`, dto);
            const updated: FollowUpTask = res.data?.data;
            setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, ...updated } : t));
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to update task.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchReport = useCallback(async (from: string, to: string): Promise<FollowUpReport> => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/admin/follow-up/report?from=${from}&to=${to}`);
            return res.data?.data as FollowUpReport;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to fetch report.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const getFirstTimerPipeline = useCallback(async (from?: string, to?: string): Promise<PipelineReport> => {
        setIsLoading(true);
        setError(null);
        try {
            const qs = new URLSearchParams();
            if (from) qs.set("from", from);
            if (to) qs.set("to", to);
            const query = qs.toString();
            const pipelineUrl = query ? `/admin/follow-up/first-timers/pipeline?${query}` : "/admin/follow-up/first-timers/pipeline";
            const res = await api.get(pipelineUrl);
            return res.data?.data as PipelineReport;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to fetch pipeline.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logReturnVisit = useCallback(async (firstTimerId: string, dto: LogVisitDto): Promise<FirstTimerVisit> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/admin/follow-up/first-timers/${firstTimerId}/visits`, dto);
            return res.data?.data as FirstTimerVisit;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to log return visit.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const markConverted = useCallback(async (id: string, memberId?: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.patch(`/admin/follow-up/first-timers/${id}/mark-converted`, memberId ? { memberId } : {});
            setFirstTimers((prev) =>
                prev.map((ft) => ft.id === id ? { ...ft, convertedAt: new Date().toISOString() } : ft)
            );
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to mark as converted.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const inviteToMembership = useCallback(async (id: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.post(`/admin/follow-up/first-timers/${id}/invite-to-membership`);
            setFirstTimers((prev) =>
                prev.map((ft) => ft.id === id ? { ...ft, inviteSentAt: new Date().toISOString() } : ft)
            );
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to send invitation.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const goToFirstTimerPage = useCallback((page: number) => {
        fetchFirstTimers({ page });
    }, [fetchFirstTimers]);

    const goToTaskPage = useCallback((page: number) => {
        fetchTasks({ page });
    }, [fetchTasks]);

    return {
        firstTimers,
        firstTimerPagination,
        tasks,
        taskPagination,
        staleTasks,
        staleTaskPagination,
        isLoading,
        isSubmitting,
        error,
        fetchFirstTimers,
        createFirstTimer,
        inviteToMembership,
        markConverted,
        logReturnVisit,
        fetchTasks,
        fetchStaleTasks,
        bulkUpdateTasks,
        reassignTask,
        adminUpdateTask,
        fetchReport,
        getFirstTimerPipeline,
        goToFirstTimerPage,
        goToTaskPage,
    };
}
