import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type JournalEntryStatus = "DRAFT" | "PENDING_APPROVAL" | "POSTED" | "VOIDED";
export type JournalEntryType = "STANDARD" | "OPENING_BALANCE" | "REVERSAL" | "RECURRING";
export type JournalEntrySource = "MANUAL" | "CSV_IMPORT" | "VIRTUAL_ACCOUNT" | "PAYMENT_GATEWAY";
export type LineType = "DEBIT" | "CREDIT";

export interface JournalAccount {
    id: string;
    name: string;
    code: string;
}

export interface JournalEntryLine {
    id: string;
    account: JournalAccount;
    entryType: LineType;
    amount: number;
}

export interface JournalAdminRef {
    id: string;
    member: { firstname: string; lastname: string; email: string };
}

export interface JournalEntry {
    id: string;
    reference: string | null;
    description: string;
    entryType: JournalEntryType;
    status: JournalEntryStatus;
    date: string;
    idempotencyKey: string | null;
    lines: JournalEntryLine[];
    createdBy: JournalAdminRef | null;
    approvedBy: JournalAdminRef | null;
    approvedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface JournalEntryPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface CreateJournalLinePayload {
    accountId: string;
    entryType: LineType;
    amount: number;
}

export interface CreateJournalEntryPayload {
    date: string;
    description: string;
    reference?: string;
    source: JournalEntrySource;
    entryType: JournalEntryType;
    accountingPeriodId: string;
    idempotencyKey: string;
    lines: CreateJournalLinePayload[];
}

export interface JournalEntryFilters {
    status?: JournalEntryStatus | "";
    fromDate?: string;
    toDate?: string;
    fundId?: string;
}

export function useJournalEntries(defaultLimit = 20) {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [pagination, setPagination] = useState<JournalEntryPagination | null>(null);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<JournalEntryFilters>({});

    const fetchEntries = useCallback(
        async (targetPage = 1, activeFilters: JournalEntryFilters = {}) => {
            setIsLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams({
                    page: String(targetPage),
                    limit: String(defaultLimit),
                });
                if (activeFilters.status) params.set("status", activeFilters.status);
                if (activeFilters.fromDate) params.set("fromDate", activeFilters.fromDate);
                if (activeFilters.toDate) params.set("toDate", activeFilters.toDate);
                if (activeFilters.fundId) params.set("fundId", activeFilters.fundId);

                const res = await api.get(`/admin/finance/journal-entries?${params}`);
                const outer = res.data?.data;
                const list: JournalEntry[] = Array.isArray(outer?.data) ? outer.data : [];
                setEntries(list);
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
                    e?.response?.data?.message || e?.message || "Failed to fetch journal entries."
                );
            } finally {
                setIsLoading(false);
            }
        },
        [defaultLimit]
    );

    const applyFilters = useCallback(
        (newFilters: JournalEntryFilters) => {
            setFilters(newFilters);
            fetchEntries(1, newFilters);
        },
        [fetchEntries]
    );

    const goToPage = useCallback(
        (targetPage: number) => fetchEntries(targetPage, filters),
        [fetchEntries, filters]
    );

    const createEntry = useCallback(
        async (payload: CreateJournalEntryPayload): Promise<JournalEntry> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.post("/admin/finance/journal-entries", payload);
                fetchEntries(1, filters);
                return res.data?.data;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to create journal entry.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchEntries, filters]
    );

    const fetchEntryById = useCallback(
        async (id: string): Promise<JournalEntry> => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await api.get(`/admin/finance/journal-entries/${id}`);
                return res.data?.data as JournalEntry;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to fetch journal entry.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const approveEntry = useCallback(
        async (id: string): Promise<JournalEntry> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.patch(`/admin/finance/journal-entries/${id}/approve`);
                const updated: JournalEntry = res.data?.data;
                setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
                return updated;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to approve entry.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    const rejectEntry = useCallback(
        async (id: string): Promise<JournalEntry> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.patch(`/admin/finance/journal-entries/${id}/reject`);
                const updated: JournalEntry = res.data?.data;
                setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
                return updated;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to decline entry.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    const resubmitEntry = useCallback(
        async (id: string): Promise<JournalEntry> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.patch(`/admin/finance/journal-entries/${id}/resubmit`);
                const updated: JournalEntry = res.data?.data;
                setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
                return updated;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to resubmit entry.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    const deleteEntry = useCallback(
        async (id: string): Promise<void> => {
            setIsSubmitting(true);
            setError(null);
            try {
                await api.delete(`/admin/finance/journal-entries/${id}`);
                setEntries((prev) => prev.filter((e) => e.id !== id));
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to delete entry.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    const voidEntry = useCallback(
        async (id: string): Promise<JournalEntry> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.patch(`/admin/finance/journal-entries/${id}/void`);
                const updated: JournalEntry = res.data?.data;
                setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
                return updated;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to void entry.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    useEffect(() => {
        fetchEntries(1, {});
    }, [fetchEntries]);

    return {
        entries,
        pagination,
        page,
        isLoading,
        isSubmitting,
        error,
        filters,
        goToPage,
        applyFilters,
        createEntry,
        fetchEntryById,
        approveEntry,
        rejectEntry,
        resubmitEntry,
        deleteEntry,
        voidEntry,
        refetch: () => fetchEntries(page, filters),
    };
}
