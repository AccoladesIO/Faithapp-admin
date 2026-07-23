import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

// ─── History types ────────────────────────────────────────────────────────────

export interface AttendanceLocation {
    latitude: number;
    longitude: number;
}

export interface AttendanceDepartment {
    id: string;
    name: string;
    key: string;
}

export interface AttendanceWorkerProfile {
    id: string;
    status: string;
    profession: string | null;
    yearJoinedWorkforce: string | null;
    completedSOD: boolean;
    completedBibleCollege: boolean;
    department: AttendanceDepartment | null;
}

export interface AttendanceMember {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber: string | null;
    role: "MEMBER" | "WORKER" | "ADMIN";
    status: string;
    workerProfile: AttendanceWorkerProfile | null;
}

export interface AttendanceEvent {
    id: string;
    name: string;
    description: string;
    eventDate: string;
    endDate: string;
    attendanceMarked: boolean;
    onlineAttendanceEnabled: boolean;
    recurringEventId: string | null;
}

export interface AttendanceServiceSlot {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    event: AttendanceEvent;
}

export interface AttendanceRecord {
    id: string;
    checkinTime: string | null;
    status: "PRESENT" | "ABSENT" | "LATE" | "ATTENDED_ONLINE";
    roleAtCheckin: "MEMBER" | "WORKER" | "ADMIN";
    location: AttendanceLocation | null;
    member: AttendanceMember;
    serviceSlot: AttendanceServiceSlot | null;
    createdAt: string;
    updatedAt: string;
}

export interface AttendancePagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface AttendanceHistoryFilters {
    page?: number;
    limit?: number;
    memberId?: string;
    slotId?: string;
    status?: "PRESENT" | "ABSENT" | "LATE" | "ATTENDED_ONLINE" | "";
    dateFrom?: string;
    dateTo?: string;
    search?: string;
}

// ─── At-Risk / Admin types ─────────────────────────────────────────────────────

export type AttendanceStatusEnum = "PRESENT" | "ABSENT" | "LATE" | "ON_LEAVE" | "ATTENDED_ONLINE";

export interface AtRiskMember {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber: string | null;
    absenceCount: number;
    lastSeenAt: string | null;
    hasOpenFollowUpTask: boolean;
}

export interface AtRiskMemberPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export type SlotSummary = Record<AttendanceStatusEnum, number>;

// ─── Leaderboard types ─────────────────────────────────────────────────────────

export interface LeaderboardEntry {
    rank: number;
    name: string;
    department: string;
    presentCount: number;
    absentCount: number;
}

// ─── History hook ──────────────────────────────────────────────────────────────

export function useAttendanceHistory(initialLimit = 10) {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [pagination, setPagination] = useState<AttendancePagination | null>(null);
    const [filters, setFilters] = useState<AttendanceHistoryFilters>({
        page: 1,
        limit: initialLimit,
        memberId: "",
        slotId: "",
        status: "",
        dateFrom: "",
        dateTo: "",
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = useCallback(async (override: Partial<AttendanceHistoryFilters> = {}) => {
        setIsLoading(true);
        setRecords([]);
        setError(null);

        const merged = { ...filters, ...override };
        setFilters(merged);

        try {
            const params = new URLSearchParams();
            params.set("page", String(merged.page ?? 1));
            params.set("limit", String(merged.limit ?? initialLimit));
            if (merged.memberId) params.set("memberId", merged.memberId);
            if (merged.slotId) params.set("slotId", merged.slotId);
            if (merged.status) params.set("status", merged.status);
            if (merged.dateFrom) params.set("dateFrom", merged.dateFrom);
            if (merged.dateTo) params.set("dateTo", merged.dateTo);
            if (merged.search) params.set("search", merged.search);

            const res = await api.get(`/attendances/history?${params.toString()}`);
            const outer = res.data?.data;
            const list: AttendanceRecord[] = Array.isArray(outer?.data) ? outer.data : [];
            setRecords(list);
            setPagination({
                page: outer?.page ?? 1,
                limit: outer?.limit ?? initialLimit,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to fetch attendance history."
            );
        } finally {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialLimit]);

    const goToPage = useCallback((page: number) => {
        fetchHistory({ page });
    }, [fetchHistory]);

    const applyFilters = useCallback((newFilters: Partial<AttendanceHistoryFilters>) => {
        fetchHistory({ ...newFilters, page: 1 });
    }, [fetchHistory]);

    useEffect(() => {
        fetchHistory({ page: 1 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        records,
        pagination,
        filters,
        isLoading,
        error,
        goToPage,
        applyFilters,
        refetch: () => fetchHistory(filters),
    };
}

// ─── Leaderboard hook ───────────────────────────────────────────────────────────

export function useAttendanceLeaderboard(initialDaysAgo = 30, initialLimit = 10) {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [daysAgo, setDaysAgo] = useState(initialDaysAgo);
    const [limit, setLimit] = useState(initialLimit);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLeaderboard = useCallback(async (
        targetDaysAgo = daysAgo,
        targetLimit = limit
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(
                `/attendances/leaderboard?daysAgo=${targetDaysAgo}&limit=${targetLimit}`
            );
            const list: LeaderboardEntry[] = Array.isArray(res.data?.data)
                ? res.data.data
                : [];
            setLeaderboard(list);
            setDaysAgo(targetDaysAgo);
            setLimit(targetLimit);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to fetch leaderboard."
            );
        } finally {
            setIsLoading(false);
        }
    }, [daysAgo, limit]);

    const changeDaysAgo = useCallback((value: number) => {
        fetchLeaderboard(value, limit);
    }, [fetchLeaderboard, limit]);

    useEffect(() => {
        fetchLeaderboard(initialDaysAgo, initialLimit);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        leaderboard,
        daysAgo,
        limit,
        isLoading,
        error,
        changeDaysAgo,
        refetch: () => fetchLeaderboard(daysAgo, limit),
    };
}

// ─── Admin hook ────────────────────────────────────────────────────────────────

export function useAttendanceAdmin() {
    const [atRiskMembers, setAtRiskMembers] = useState<AtRiskMember[]>([]);
    const [atRiskPagination, setAtRiskPagination] = useState<AtRiskMemberPagination | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getAtRiskMembers = useCallback(async (params?: {
        minAbsences?: number;
        from?: string;
        to?: string;
        page?: number;
        limit?: number;
    }) => {
        setIsLoading(true);
        setError(null);
        try {
            const qs = new URLSearchParams();
            if (params?.minAbsences !== undefined) qs.set("minAbsences", String(params.minAbsences));
            if (params?.from) qs.set("from", params.from);
            if (params?.to) qs.set("to", params.to);
            qs.set("page", String(params?.page ?? 1));
            qs.set("limit", String(params?.limit ?? 20));
            const res = await api.get(`/attendances/at-risk?${qs.toString()}`);
            const outer = res.data?.data;
            const list: AtRiskMember[] = Array.isArray(outer?.data) ? outer.data : [];
            setAtRiskMembers(list);
            setAtRiskPagination({
                page: outer?.page ?? 1,
                limit: outer?.limit ?? 20,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch at-risk members.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const getSlotSummary = useCallback(async (slotId: string): Promise<SlotSummary> => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/attendances/summary/slot/${slotId}`);
            return res.data?.data as SlotSummary;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to fetch slot summary.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const correctAttendance = useCallback(async (id: string, status: AttendanceStatusEnum): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.patch(`/attendances/${id}/correct`, { status });
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to correct attendance.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    // Covers both "no phone, check them in live" and "restore their streak"
    // (fixing a previously auto-marked ABSENT row) — same backend action
    // either way, since the streak is computed live from these records.
    const adminMarkAttendance = useCallback(async (
        memberId: string,
        serviceSlotId: string,
        status: AttendanceStatusEnum,
    ): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.post("/attendances/admin/mark", { memberId, serviceSlotId, status });
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to mark attendance.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    return {
        atRiskMembers,
        atRiskPagination,
        isLoading,
        isSubmitting,
        error,
        getAtRiskMembers,
        getSlotSummary,
        correctAttendance,
        adminMarkAttendance,
    };
}