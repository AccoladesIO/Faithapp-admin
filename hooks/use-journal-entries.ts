import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

export type JournalEntryStatus = "PENDING_APPROVAL" | "POSTED" | "VOIDED";
export type JournalEntryType = "STANDARD" | "REVERSAL" | "RECURRING";
export type LineType = "DEBIT" | "CREDIT";

export interface JournalAccount {
    id: string;
    name: string;
    code: string;
}

export interface JournalEntryLine {
    id: string;
    account: JournalAccount;
    type: LineType;
    amount: number;
    description: string | null;
}

export interface JournalEntry {
    id: string;
    reference: string | null;
    description: string;
    entryType: JournalEntryType;
    status: JournalEntryStatus;
    entryDate: string;
    idempotencyKey: string | null;
    lines: JournalEntryLine[];
    createdBy: { id: string; name: string; email: string } | null;
    approvedBy: { id: string; name: string; email: string } | null;
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
    type: LineType;
    amount: number;
    description?: string;
}

export interface CreateJournalEntryPayload {
    description: string;
    entryDate: string;
    reference?: string;
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
            } catch (err: any) {
                setError(
                    err?.response?.data?.message || err?.message || "Failed to fetch journal entries."
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
            } catch (err: any) {
                const message =
                    err?.response?.data?.message || err?.message || "Failed to create journal entry.";
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
            } catch (err: any) {
                const message =
                    err?.response?.data?.message || err?.message || "Failed to fetch journal entry.";
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
            } catch (err: any) {
                const message =
                    err?.response?.data?.message || err?.message || "Failed to approve entry.";
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
            } catch (err: any) {
                const message =
                    err?.response?.data?.message || err?.message || "Failed to void entry.";
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
        voidEntry,
        refetch: () => fetchEntries(page, filters),
    };
}
