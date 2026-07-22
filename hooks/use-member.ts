import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export interface WorkerProfile {
    id: string;
    department?: { id: string; name: string; key?: string } | null;
    secondaryDepartment?: { id: string; name: string; key?: string } | null;
    role?: string;
    status?: string;
    profession?: string | null;
    yearJoinedWorkforce?: string | null;
    completedSOD?: boolean;
    completedBibleCollege?: boolean;
    [key: string]: unknown;
}

export interface Member {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber: string | null;
    changedPassword: boolean;
    photoUrl: string | null;
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
    pastorType: PastorType | null;
    createdAt: string;
    updatedAt: string;
}

export type PastorType = "LEAD" | "PARISH" | "ASSOCIATE";

export const PASTOR_TYPE_LABELS: Record<PastorType, string> = {
    LEAD: "Lead Pastor",
    PARISH: "Parish Pastor",
    ASSOCIATE: "Associate Pastor",
};

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

export interface CreateMemberPayload {
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber?: string;
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
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(
                e?.response?.data?.message ||
                e?.message ||
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
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
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
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
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
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to bulk promote members.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const assignPastor = useCallback(async (
        memberId: string,
        type: PastorType
    ): Promise<Member> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/members/${memberId}/pastor`, { type });
            const updated: Member = res.data?.data;
            setMembers((prev) =>
                prev.map((m) => (m.id === memberId ? { ...m, ...updated } : m))
            );
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to assign pastor designation.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updatePastorType = useCallback(async (
        memberId: string,
        type: PastorType
    ): Promise<Member> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/members/${memberId}/pastor`, { type });
            const updated: Member = res.data?.data;
            setMembers((prev) =>
                prev.map((m) => (m.id === memberId ? { ...m, ...updated } : m))
            );
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to update pastor type.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const removePastor = useCallback(async (memberId: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/members/${memberId}/pastor`);
            setMembers((prev) =>
                prev.map((m) => (m.id === memberId ? { ...m, pastorType: null } : m))
            );
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to remove pastor designation.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const removePhoto = useCallback(async (memberId: string): Promise<Member> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.delete(`/members/${memberId}/photo`);
            const updated: Member = res.data?.data;
            setMembers((prev) =>
                prev.map((m) => (m.id === memberId ? { ...m, ...updated } : m))
            );
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to remove member photo.";
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
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
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
        assignPastor,
        updatePastorType,
        removePastor,
        removePhoto,
    };
}

export function useCreateMember() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createMember = useCallback(async (
        payload: CreateMemberPayload
    ): Promise<Member> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/members", payload);
            return res.data?.data as Member;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to create member.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    return { createMember, isSubmitting, error };
}