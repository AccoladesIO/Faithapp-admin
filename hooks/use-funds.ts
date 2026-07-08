import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type FundType = "RESTRICTED" | "UNRESTRICTED";

export interface Fund {
    id: string;
    name: string;
    type: FundType;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateFundPayload {
    name: string;
    type: FundType;
    description?: string;
}

export interface UpdateFundPayload {
    name?: string;
    description?: string;
    isActive?: boolean;
}

export function useFunds() {
    const [funds, setFunds] = useState<Fund[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchFunds = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/admin/finance/funds");
            setFunds(res.data?.data ?? []);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch funds.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createFund = useCallback(
        async (payload: CreateFundPayload): Promise<Fund> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.post("/admin/finance/funds", payload);
                const created: Fund = res.data?.data;
                setFunds((prev) => [created, ...prev]);
                return created;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to create fund.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    const updateFund = useCallback(
        async (id: string, payload: UpdateFundPayload): Promise<Fund> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.patch(`/admin/finance/funds/${id}`, payload);
                const updated: Fund = res.data?.data;
                setFunds((prev) => prev.map((f) => (f.id === id ? updated : f)));
                return updated;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to update fund.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    useEffect(() => {
        fetchFunds();
    }, [fetchFunds]);

    return { funds, isLoading, isSubmitting, error, createFund, updateFund, refetch: fetchFunds };
}
