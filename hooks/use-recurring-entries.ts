import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type RecurringFrequency = "WEEKLY" | "MONTHLY" | "QUARTERLY";

export interface RecurringEntryAccount {
    id: string;
    name: string;
    code: string;
}

export interface RecurringEntry {
    id: string;
    description: string;
    debitAccount: RecurringEntryAccount;
    creditAccount: RecurringEntryAccount;
    amount: number;
    frequency: RecurringFrequency;
    fund: { id: string; name: string };
    nextDueAt: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateRecurringEntryPayload {
    description: string;
    debitAccountId: string;
    creditAccountId: string;
    amount: number;
    frequency: RecurringFrequency;
    fundId: string;
    nextDueAt: string;
}

export interface UpdateRecurringEntryPayload {
    description?: string;
    amount?: number;
    nextDueAt?: string;
    isActive?: boolean;
}

export function useRecurringEntries() {
    const [entries, setEntries] = useState<RecurringEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEntries = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/admin/finance/recurring-entries");
            setEntries(res.data?.data ?? []);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch recurring entries.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createEntry = useCallback(async (payload: CreateRecurringEntryPayload): Promise<RecurringEntry> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/admin/finance/recurring-entries", payload);
            const created: RecurringEntry = res.data?.data;
            setEntries((prev) => [created, ...prev]);
            return created;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to create recurring entry.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateEntry = useCallback(async (id: string, payload: UpdateRecurringEntryPayload): Promise<RecurringEntry> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/finance/recurring-entries/${id}`, payload);
            const updated: RecurringEntry = res.data?.data;
            setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to update recurring entry.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    return { entries, isLoading, isSubmitting, error, createEntry, updateEntry, refetch: fetchEntries };
}
