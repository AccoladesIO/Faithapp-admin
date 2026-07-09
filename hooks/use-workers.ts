import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export interface WorkerDepartment {
    id: string;
    name: string;
    key: string;
}

export interface WorkerProfile {
    id: string;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "ON_LEAVE";
    profession: string | null;
    yearJoinedWorkforce: string | null;
    completedSOD: boolean;
    completedBibleCollege: boolean;
    department: WorkerDepartment | Record<string, never>;
    secondaryDepartment?: WorkerDepartment | null;
    createdAt: string;
    updatedAt: string;
}

export interface Worker {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber: string | null;
    changedPassword: boolean;
    role: "WORKER";
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

export interface WorkerPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface UpdateWorkerProfilePayload {
    departmentId?: string;
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "ON_LEAVE";
    profession?: string;
    yearJoinedWorkforce?: string;
    completedSOD?: boolean;
    completedBibleCollege?: boolean;
    secondaryDepartmentId?: string | null;
}

export function useWorkers(defaultLimit = 10) {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [pagination, setPagination] = useState<WorkerPagination | null>(null);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchWorkers = useCallback(async (
        targetPage = 1,
        status = "ALL"
    ) => {
        setIsLoading(true);
        setWorkers([]);
        setError(null);
        try {
            const statusParam = status !== "ALL" ? `&status=${status}` : "";
            const res = await api.get(
                `/members/workers?page=${targetPage}&limit=${defaultLimit}${statusParam}`
            );
            const outer = res.data?.data;
            const list: Worker[] = Array.isArray(outer?.data) ? outer.data : [];
            setWorkers(list);
            setPage(targetPage);
            setStatusFilter(status);
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
                "Failed to fetch workers."
            );
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const goToPage = useCallback((targetPage: number) => {
        fetchWorkers(targetPage, statusFilter);
    }, [fetchWorkers, statusFilter]);

    const applyStatusFilter = useCallback((status: string) => {
        fetchWorkers(1, status);
    }, [fetchWorkers]);

    const updateWorkerProfile = useCallback(async (
        memberId: string,
        payload: UpdateWorkerProfilePayload
    ): Promise<Worker> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(
                `/members/${memberId}/worker-profile`,
                payload
            );
            const updated: Worker = res.data?.data;
            setWorkers((prev) =>
                prev.map((w) => (w.id === memberId ? { ...w, ...updated } : w))
            );
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to update worker profile.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const revokeWorker = useCallback(async (memberId: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.post(`/members/${memberId}/revoke-worker`);
            setWorkers((prev) => prev.filter((w) => w.id !== memberId));
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to revoke worker role.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const purgeDevice = useCallback(async (memberId: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/members/${memberId}/device`);
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to purge device token.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    useEffect(() => {
        fetchWorkers(1, "ALL");
    }, [fetchWorkers]);

    return {
        workers,
        pagination,
        page,
        statusFilter,
        isLoading,
        isSubmitting,
        error,
        goToPage,
        applyStatusFilter,
        refetch: () => fetchWorkers(page, statusFilter),
        updateWorkerProfile,
        revokeWorker,
        purgeDevice,
    };
}