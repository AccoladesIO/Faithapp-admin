import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export interface Venue {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface SlotConfig {
    id: string;
    name: string;
    description: string | null;
    workerCheckinStartOffsetSeconds: number;
    workerLateOffsetSeconds: number;
    memberCheckinStartOffsetSeconds: number;
    checkinStopOffsetSeconds: number;
    allowedDistanceInMeters: number;
    defaultVenue: Venue;
}

export interface ServiceSlotSummary {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    config: SlotConfig;
    venueOverride: Venue | null;
    workerCheckinStartOverride: number | null;
    workerLateOverride: number | null;
    memberCheckinStartOverride: number | null;
    checkinStopOverride: number | null;
    allowedDistanceOverride: number | null;
}

export interface UpcomingEvent {
    id: string;
    name: string;
    description: string;
    eventDate: string;
    endDate: string;
    attendanceMarked: boolean;
    onlineAttendanceEnabled: boolean;
    onlineNotificationSentAt: string | null;
    recurringEventId: string | null;
    serviceSlots: ServiceSlotSummary[];
}

export interface MemberNotSeen {
    id: string;
    name: string;
    email: string;
    lastSeen: string | null;
}

export interface WeeklyRegistrationTrend {
    week: string;
    newMembers: number;
    newWorkers: number;
}

export interface WeeklyAttendanceTrend {
    week: string;
    present: number;
    absent: number;
}

export interface DepartmentAttendanceSummary {
    departmentId: string;
    departmentName: string;
    totalWorkers: number;
    attendedWorkers: number;
    attendancePercentage: number;
}

export interface TopAbsentWorker {
    id: string;
    name: string;
    department: string | null;
    absentCount: number;
}

export interface ClassEnrollmentBreakdown {
    classId: string;
    className: string;
    inProgress: number;
    completed: number;
    cancelled: number;
    completionRate: number;
}

export interface ClassCompletionsTrend {
    week: string;
    completions: number;
}

export interface DashboardData {
    totalMembers: number;
    totalWorkers: number;
    totalAdmins: number;
    totalCheckInsToday: number;
    workerAttendancePercentage: number;
    congregationAttendancePercentage: number;
    weeklyAttendanceTrend: WeeklyAttendanceTrend[];
    newMemberRegistrationsTrend: WeeklyRegistrationTrend[];
    departmentAttendanceSummary: DepartmentAttendanceSummary[];
    topAbsentWorkers: TopAbsentWorker[];
    membersNotSeenRecently: MemberNotSeen[];
    upcomingEvents: UpcomingEvent[];
    totalPendingLeaveRequests: number;
    totalActiveEnrollments: number;
    classEnrollmentBreakdown: ClassEnrollmentBreakdown[];
    classCompletionsTrend: ClassCompletionsTrend[];
}

export function useDashboard(daysAgo: number = 30) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboard = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/dashboard/admin?daysAgo=${daysAgo}`);
            setData(res.data?.data ?? null);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to fetch dashboard data."
            );
        } finally {
            setIsLoading(false);
        }
    }, [daysAgo]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    return { data, isLoading, error, refetch: fetchDashboard };
}