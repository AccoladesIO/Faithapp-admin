import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

export interface ExternalPayee {
    id: string;
    name: string;
    category: string | null;
    accountNumber: string | null;
    bankName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePayeePayload {
    name: string;
    category?: string;
    accountNumber?: string;
    bankName?: string;
    contactEmail?: string;
    contactPhone?: string;
    notes?: string;
}

export interface UpdatePayeePayload {
    name?: string;
    category?: string;
    accountNumber?: string;
    bankName?: string;
    contactEmail?: string;
    contactPhone?: string;
    notes?: string;
}

export function useExternalPayees() {
    const [payees, setPayees] = useState<ExternalPayee[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPayees = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/admin/finance/external-payees");
            setPayees(res.data?.data ?? []);
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || "Failed to fetch payees.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createPayee = useCallback(
        async (payload: CreatePayeePayload): Promise<ExternalPayee> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.post("/admin/finance/external-payees", payload);
                const created: ExternalPayee = res.data?.data;
                setPayees((prev) => [created, ...prev]);
                return created;
            } catch (err: any) {
                const message =
                    err?.response?.data?.message || err?.message || "Failed to create payee.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    const updatePayee = useCallback(
        async (id: string, payload: UpdatePayeePayload): Promise<ExternalPayee> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.patch(`/admin/finance/external-payees/${id}`, payload);
                const updated: ExternalPayee = res.data?.data;
                setPayees((prev) => prev.map((p) => (p.id === id ? updated : p)));
                return updated;
            } catch (err: any) {
                const message =
                    err?.response?.data?.message || err?.message || "Failed to update payee.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    useEffect(() => {
        fetchPayees();
    }, [fetchPayees]);

    return { payees, isLoading, isSubmitting, error, createPayee, updatePayee, refetch: fetchPayees };
}
