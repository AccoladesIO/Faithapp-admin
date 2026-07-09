import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type OfferingType = "GENERAL" | "TITHE_SUNDAY" | "PLEDGE" | "SEED";

export interface OfferingFund {
    id: string;
    name: string;
    type: "RESTRICTED" | "UNRESTRICTED";
}

export interface OfferingAdminMember {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
}

export interface OfferingAdmin {
    id: string;
    isActive: boolean;
    member: OfferingAdminMember;
}

export interface Offering {
    id: string;
    serviceEventId: string | null;
    fund: OfferingFund;
    type: OfferingType;
    cashAmount: number;
    expectedTransferAmount: number;
    isReconciled: boolean;
    reconciledAt: string | null;
    notes: string | null;
    recordedBy: OfferingAdmin;
    reconciledBy: OfferingAdmin | null;
    createdAt: string;
    updatedAt: string;
}

export interface OfferingPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface CreateOfferingPayload {
    fundId: string;
    type: OfferingType;
    cashAmount?: number;
    expectedTransferAmount?: number;
    serviceEventId?: string;
    notes?: string;
}

export interface ReconcileOfferingPayload {
    notes: string;
}

export interface OfferingFilters {
    fundId?: string;
    type?: OfferingType | "";
    fromDate?: string;
    toDate?: string;
}

export function useOfferings(defaultLimit = 20) {
    const [offerings, setOfferings] = useState<Offering[]>([]);
    const [pagination, setPagination] = useState<OfferingPagination | null>(null);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<OfferingFilters>({});

    const fetchOfferings = useCallback(
        async (targetPage = 1, activeFilters: OfferingFilters = {}) => {
            setIsLoading(true);
            setOfferings([]);
            setError(null);
            try {
                const params = new URLSearchParams({
                    page: String(targetPage),
                    limit: String(defaultLimit),
                });
                if (activeFilters.fundId) params.set("fundId", activeFilters.fundId);
                if (activeFilters.type) params.set("type", activeFilters.type);
                if (activeFilters.fromDate) params.set("fromDate", activeFilters.fromDate);
                if (activeFilters.toDate) params.set("toDate", activeFilters.toDate);

                const res = await api.get(`/admin/finance/offerings?${params}`);
                const outer = res.data?.data;
                const list: Offering[] = Array.isArray(outer?.data) ? outer.data : [];
                setOfferings(list);
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
                        "Failed to fetch offerings."
                );
            } finally {
                setIsLoading(false);
            }
        },
        [defaultLimit]
    );

    const applyFilters = useCallback(
        (newFilters: OfferingFilters) => {
            setFilters(newFilters);
            fetchOfferings(1, newFilters);
        },
        [fetchOfferings]
    );

    const goToPage = useCallback(
        (targetPage: number) => {
            fetchOfferings(targetPage, filters);
        },
        [fetchOfferings, filters]
    );

    const createOffering = useCallback(
        async (payload: CreateOfferingPayload): Promise<Offering> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.post("/admin/finance/offerings", payload);
                const created: Offering = res.data?.data;
                fetchOfferings(1, filters);
                return created;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message ||
                    e?.message ||
                    "Failed to create offering.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchOfferings, filters]
    );

    const reconcileOffering = useCallback(
        async (id: string, payload: ReconcileOfferingPayload): Promise<Offering> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.patch(
                    `/admin/finance/offerings/${id}/reconcile`,
                    payload
                );
                const updated: Offering = res.data?.data;
                setOfferings((prev) =>
                    prev.map((o) => (o.id === id ? { ...o, ...updated } : o))
                );
                return updated;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message ||
                    e?.message ||
                    "Failed to reconcile offering.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    useEffect(() => {
        fetchOfferings(1, {});
    }, [fetchOfferings]);

    return {
        offerings,
        pagination,
        page,
        isLoading,
        isSubmitting,
        error,
        filters,
        goToPage,
        applyFilters,
        createOffering,
        reconcileOffering,
        refetch: () => fetchOfferings(page, filters),
    };
}
