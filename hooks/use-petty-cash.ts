import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type PettyCashStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface PettyCashAccount {
    id: string;
    name: string;
    code: string;
}

export interface PettyCashReplenishment {
    id: string;
    fromAccount: PettyCashAccount;
    toCashAccount: PettyCashAccount;
    amount: number;
    notes: string | null;
    status: PettyCashStatus;
    requestedBy: { id: string; member: { firstname: string; lastname: string } | null } | null;
    approvedBy: { id: string; member: { firstname: string; lastname: string } | null } | null;
    approvedAt: string | null;
    journalEntry: { id: string } | null;
    createdAt: string;
    updatedAt: string;
}

export interface PettyCashPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface CreatePettyCashPayload {
    fromAccountId: string;
    toCashAccountId: string;
    amount: number;
    notes?: string;
}

export function usePettyCash(defaultLimit = 20) {
    const [replenishments, setReplenishments] = useState<PettyCashReplenishment[]>([]);
    const [pagination, setPagination] = useState<PettyCashPagination | null>(null);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<PettyCashStatus | "">("");

    const fetchReplenishments = useCallback(
        async (targetPage = 1, status: PettyCashStatus | "" = "") => {
            setIsLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams({
                    page: String(targetPage),
                    limit: String(defaultLimit),
                });
                if (status) params.set("status", status);

                const res = await api.get(`/admin/finance/petty-cash?${params}`);
                const outer = res.data?.data;
                const list: PettyCashReplenishment[] = Array.isArray(outer?.data) ? outer.data : [];
                setReplenishments(list);
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
                    e?.response?.data?.message || e?.message || "Failed to fetch petty cash replenishments."
                );
            } finally {
                setIsLoading(false);
            }
        },
        [defaultLimit]
    );

    const goToPage = useCallback(
        (targetPage: number) => fetchReplenishments(targetPage, statusFilter),
        [fetchReplenishments, statusFilter]
    );

    const applyStatusFilter = useCallback(
        (status: PettyCashStatus | "") => {
            setStatusFilter(status);
            fetchReplenishments(1, status);
        },
        [fetchReplenishments]
    );

    const createReplenishment = useCallback(
        async (payload: CreatePettyCashPayload): Promise<PettyCashReplenishment> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.post("/admin/finance/petty-cash", payload);
                fetchReplenishments(1, statusFilter);
                return res.data?.data;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to create replenishment.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchReplenishments, statusFilter]
    );

    const approveReplenishment = useCallback(
        async (id: string): Promise<PettyCashReplenishment> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.patch(`/admin/finance/petty-cash/${id}/approve`);
                const updated: PettyCashReplenishment = res.data?.data;
                setReplenishments((prev) => prev.map((r) => (r.id === id ? updated : r)));
                return updated;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to approve replenishment.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    const rejectReplenishment = useCallback(
        async (id: string): Promise<PettyCashReplenishment> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.patch(`/admin/finance/petty-cash/${id}/reject`);
                const updated: PettyCashReplenishment = res.data?.data;
                setReplenishments((prev) => prev.map((r) => (r.id === id ? updated : r)));
                return updated;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to reject replenishment.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    useEffect(() => {
        fetchReplenishments(1, "");
    }, [fetchReplenishments]);

    return {
        replenishments,
        pagination,
        page,
        isLoading,
        isSubmitting,
        error,
        statusFilter,
        goToPage,
        applyStatusFilter,
        createReplenishment,
        approveReplenishment,
        rejectReplenishment,
        refetch: () => fetchReplenishments(page, statusFilter),
    };
}
