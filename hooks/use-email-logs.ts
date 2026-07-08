import { useState, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type EmailLogStatus = "sent" | "failed";

export interface EmailLog {
    id: string;
    recipient: string;
    subject: string | null;
    status: EmailLogStatus;
    jobId: string | null;
    errorMessage: string | null;
    attemptsMade: number;
    createdAt: string;
}

export interface EmailLogPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface EmailLogFilters {
    recipient?: string;
    status?: EmailLogStatus | "";
    dateFrom?: string;
    dateTo?: string;
}

export function useEmailLogs(defaultLimit = 20) {
    const [logs, setLogs] = useState<EmailLog[]>([]);
    const [pagination, setPagination] = useState<EmailLogPagination | null>(null);
    const [filters, setFilters] = useState<EmailLogFilters>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = useCallback(async (page = 1, activeFilters: EmailLogFilters = {}) => {
        setIsLoading(true);
        setError(null);
        try {
            const qs = new URLSearchParams({ page: String(page), limit: String(defaultLimit) });
            if (activeFilters.recipient) qs.set("recipient", activeFilters.recipient);
            if (activeFilters.status) qs.set("status", activeFilters.status);
            if (activeFilters.dateFrom) qs.set("dateFrom", activeFilters.dateFrom);
            if (activeFilters.dateTo) qs.set("dateTo", activeFilters.dateTo);

            const res = await api.get(`/admin/email-logs?${qs.toString()}`);
            const outer = res.data?.data;
            const list: EmailLog[] = Array.isArray(outer?.data) ? outer.data : [];
            setLogs(list);
            setPagination({
                page: outer?.page ?? page,
                limit: outer?.limit ?? defaultLimit,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch email logs.");
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const applyFilters = useCallback((newFilters: EmailLogFilters) => {
        setFilters(newFilters);
        fetchLogs(1, newFilters);
    }, [fetchLogs]);

    const goToPage = useCallback((page: number) => {
        fetchLogs(page, filters);
    }, [fetchLogs, filters]);

    return { logs, pagination, filters, isLoading, error, fetchLogs, applyFilters, goToPage };
}
