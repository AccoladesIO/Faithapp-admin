import { useState, useEffect, useCallback, useRef } from "react";
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
    role: "MEMBER" | "WORKER";
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

export interface BulkPromotePayload {
    memberIds: string[];
    departmentId: string;
    profession?: string;
    yearJoinedWorkforce?: string;
}

export interface BulkPromoteFailure {
    memberId: string;
    reason: string;
}

export interface BulkPromoteResult {
    promoted: number;
    skipped: number;
    failures: BulkPromoteFailure[];
}
export function useMembers(defaultLimit = 10, roleFilter?: "MEMBER" | "WORKER") {
    const [members, setMembers] = useState<Member[]>([]);
    const [pagination, setPagination] = useState<MemberPagination | null>(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchMembers = useCallback(async (targetPage = 1, searchTerm = "") => {
        setIsLoading(true);
        setMembers([]);
        setError(null);
        try {
            const roleParam = roleFilter ? `&role=${roleFilter}` : "";
            const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : "";
            const res = await api.get(
                `/members?page=${targetPage}&limit=${defaultLimit}${roleParam}${searchParam}`
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
    }, [defaultLimit, roleFilter]);

    const goToPage = useCallback((targetPage: number) => {
        fetchMembers(targetPage, search);
    }, [fetchMembers, search]);

    const onSearchChange = useCallback((value: string) => {
        setSearch(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchMembers(1, value);
        }, 400);
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

    const bulkPromote = useCallback(async (
        payload: BulkPromotePayload
    ): Promise<BulkPromoteResult> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/members/bulk-promote", payload);
            return res.data?.data as BulkPromoteResult;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to bulk promote members.";
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
        search,
        onSearchChange,
        isLoading,
        isSubmitting,
        error,
        goToPage,
        refetch: () => fetchMembers(page, search),
        promoteToWorker,
        bulkPromote,
        changeStatus,
        resetPassword,
    };
}