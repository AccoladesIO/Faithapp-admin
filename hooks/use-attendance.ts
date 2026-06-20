import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

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
    status: "PRESENT" | "ABSENT" | "LATE" | "ONLINE";
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
    status?: "PRESENT" | "ABSENT" | "LATE" | "ONLINE" | "";
    dateFrom?: string;
    dateTo?: string;
}

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
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                err?.message ||
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
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                err?.message ||
                "Failed to fetch leaderboard."
            );
        } finally {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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