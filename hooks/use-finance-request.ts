import { useState, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type FinanceRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface FinanceCategory {
    id: string;
    name: string;
    description?: string;
}

export interface FinanceRequest {
    id: string;
    requestedBy: { id: string; firstname: string; lastname: string; email: string };
    department: { id: string; name: string };
    category: FinanceCategory;
    reason: string;
    amount: number;
    recipientBankName: string;
    recipientAccountNumber: string;
    recipientAccountName: string;
    attachmentUrl?: string;
    status: FinanceRequestStatus;
    reviewedBy?: { id: string; member: { id: string; firstname: string; lastname: string } };
    reviewedAt?: string;
    rejectionReason?: string;
    createdAt: string;
}

export interface FinancePagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

interface FetchRequestsParams {
    page?: number;
    limit?: number;
    status?: FinanceRequestStatus | "";
    categoryId?: string;
    search?: string;
}

export function useFinanceRequests(defaultLimit = 10) {
    const [requests, setRequests] = useState<FinanceRequest[]>([]);
    const [pagination, setPagination] = useState<FinancePagination | null>(null);
    const [categories, setCategories] = useState<FinanceCategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [currentParams, setCurrentParams] = useState<FetchRequestsParams>({
        page: 1,
        limit: defaultLimit,
    });

    const fetchRequests = useCallback(async (params: FetchRequestsParams = {}) => {
        setIsLoading(true);
        setRequests([]);
        setError(null);
        const merged: FetchRequestsParams = { page: 1, limit: defaultLimit, ...params };
        setCurrentParams(merged);
        try {
            const query = new URLSearchParams();
            if (merged.page) query.set("page", String(merged.page));
            if (merged.limit) query.set("limit", String(merged.limit));
            if (merged.status) query.set("status", merged.status);
            if (merged.categoryId) query.set("categoryId", merged.categoryId);
            if (merged.search) query.set("search", merged.search);

            const res = await api.get(`/admin/finance/requests?${query.toString()}`);
            const outer = res.data?.data;
            const list: FinanceRequest[] = Array.isArray(outer?.data) ? outer.data : [];
            setRequests(list);
            setPagination({
                page: outer?.page ?? merged.page ?? 1,
                limit: outer?.limit ?? merged.limit ?? defaultLimit,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to fetch finance requests."
            );
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const goToPage = useCallback((page: number) => {
        fetchRequests({ ...currentParams, page });
    }, [fetchRequests, currentParams]);

    const approveRequest = useCallback(async (id: string): Promise<FinanceRequest> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/finance/requests/${id}/approve`);
            const updated: FinanceRequest = res.data?.data;
            setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to approve request.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const rejectRequest = useCallback(async (id: string, reason: string): Promise<FinanceRequest> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/finance/requests/${id}/reject`, { reason });
            const updated: FinanceRequest = res.data?.data;
            setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to reject request.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchCategories = useCallback(async () => {
        try {
            const res = await api.get("/admin/finance/categories");
            const list: FinanceCategory[] = Array.isArray(res.data?.data)
                ? res.data.data
                : [];
            setCategories(list);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to fetch categories."
            );
        }
    }, []);

    const createCategory = useCallback(async (dto: { name: string; description?: string }): Promise<FinanceCategory> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/admin/finance/categories", dto);
            const created: FinanceCategory = res.data?.data;
            setCategories((prev) => [...prev, created]);
            return created;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to create category.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const clearError = useCallback(() => setError(null), []);
    return {
        requests,
        pagination,
        categories,
        isLoading,
        isSubmitting,
        error,

        clearError,
        fetchRequests,
        approveRequest,
        rejectRequest,
        fetchCategories,
        createCategory,
        goToPage,
    };
}
