import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

export interface WorkerProfile {
    id: string;
    department?: string;
    role?: string;
    [key: string]: any;
}

export interface Member {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber: string | null;
    changedPassword: boolean;
    role: "MEMBER" | "WORKER" | "ADMIN";
    status: "ACTIVE" | "INACTIVE";
    gender: string | null;
    birthDay: number | null;
    birthMonth: number | null;
    birthYear: number | null;
    maritalStatus: string | null;
    yearBornAgain: number | null;
    yearBaptized: number | null;
    baptizedWithHolyGhost: boolean;
    dateJoinedChurch: string | null;
    workerProfile: WorkerProfile | null;
    createdAt: string;
    updatedAt: string;
}

export interface MemberPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface PromoteToWorkerPayload {
    departmentId: string;
    profession: string;
    yearJoinedWorkforce: string;
}
export function useMembers(defaultLimit = 10) {
    const [members, setMembers] = useState<Member[]>([]);
    const [pagination, setPagination] = useState<MemberPagination | null>(null);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchMembers = useCallback(async (targetPage = 1) => {
        setIsLoading(true);
        setMembers([]); // clear so skeleton shows
        setError(null);
        try {
            const res = await api.get(
                `/members?page=${targetPage}&limit=${defaultLimit}`
            );
            const outer = res.data?.data;
            const list: Member[] = Array.isArray(outer?.data) ? outer.data : [];
            setMembers(list);
            setPage(targetPage);
            setPagination({
                page: outer?.page ?? targetPage,
                limit: outer?.limit ?? defaultLimit,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                err?.message ||
                "Failed to fetch members."
            );
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const goToPage = useCallback((targetPage: number) => {
        fetchMembers(targetPage);
    }, [fetchMembers]);

    const promoteToWorker = useCallback(async (
        memberId: string,
        payload: PromoteToWorkerPayload
    ): Promise<Member> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/members/${memberId}/promote`, payload);
            const updated: Member = res.data?.data;
            setMembers((prev) =>
                prev.map((m) => (m.id === memberId ? { ...m, ...updated } : m))
            );
            return updated;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to promote member.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const changeStatus = useCallback(async (
        memberId: string,
        status: "ACTIVE" | "INACTIVE"
    ): Promise<Member> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/members/${memberId}/status`, { status });
            const updated: Member = res.data?.data;
            setMembers((prev) =>
                prev.map((m) => (m.id === memberId ? { ...m, ...updated } : m))
            );
            return updated;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to update member status.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const resetPassword = useCallback(async (memberId: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.post(`/members/${memberId}/reset-password`);
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to reset member password.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    useEffect(() => {
        fetchMembers(1);
    }, [fetchMembers]);

    return {
        members,
        pagination,
        page,
        isLoading,
        isSubmitting,
        error,
        goToPage,
        refetch: () => fetchMembers(page),
        promoteToWorker,
        changeStatus,
        resetPassword,
    };
}