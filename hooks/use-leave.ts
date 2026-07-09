import { useState, useCallback, useEffect } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface LeaveWorkerMember {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber: string | null;
}

export interface LeaveWorkerProfile {
    id: string;
    member: LeaveWorkerMember;
}

export interface LeaveRequest {
    id: string;
    workerProfile: LeaveWorkerProfile;
    dateFrom: string;
    dateTo: string;
    reason: string;
    status: LeaveStatus;
    actionedBy: LeaveWorkerMember | null;
    createdAt: string;
    updatedAt: string;
}

export interface LeavePagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export function useLeave(defaultLimit = 20) {
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [pagination, setPagination] = useState<LeavePagination | null>(null);
    const [statusFilter, setStatusFilter] = useState<LeaveStatus | "">("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLeaveRequests = useCallback(async (page = 1, status: LeaveStatus | "" = "") => {
        setIsLoading(true);
        setError(null);
        try {
            const qs = new URLSearchParams({ page: String(page), limit: String(defaultLimit) });
            if (status) qs.set("status", status);
            const res = await api.get(`/leave/history?${qs.toString()}`);
            const outer = res.data?.data;
            const list: LeaveRequest[] = Array.isArray(outer?.data) ? outer.data : [];
            setRequests(list);
            setPagination({
                page: outer?.page ?? page,
                limit: outer?.limit ?? defaultLimit,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch leave requests.");
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const applyFilter = useCallback((status: LeaveStatus | "") => {
        setStatusFilter(status);
        fetchLeaveRequests(1, status);
    }, [fetchLeaveRequests]);

    const goToPage = useCallback((page: number) => {
        fetchLeaveRequests(page, statusFilter);
    }, [fetchLeaveRequests, statusFilter]);

    const actionLeave = useCallback(async (id: string, status: "APPROVED" | "REJECTED"): Promise<LeaveRequest> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/leave/${id}/action`, { status });
            const updated = res.data?.data as LeaveRequest;
            setRequests(prev => prev.map(r => r.id === id ? updated : r));
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to action leave request.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    useEffect(() => {
        fetchLeaveRequests();
    }, [fetchLeaveRequests]);

    return {
        requests,
        pagination,
        statusFilter,
        isLoading,
        isSubmitting,
        error,
        fetchLeaveRequests,
        applyFilter,
        goToPage,
        actionLeave,
    };
}
