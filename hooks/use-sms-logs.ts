import { useState, useCallback, useMemo } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export interface SmsLogEntry {
    messageId: string;
    recipient: string;
    message: string;
    status: string;
    type: string;
    sentAt: string;
    sender?: string;
}

export interface SmsLogFilters {
    recipient?: string;
    status?: string;
}

export interface SmsLogPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

const PAGE_SIZE = 20;

// Termii's message-history endpoint has no pagination/date-filter params —
// it's a flat array, always fetched in full. Filtering and pagination below
// happen client-side over that in-memory list rather than round-tripping
// to the server per page/filter change.
export function useSmsLogs() {
    const [allLogs, setAllLogs] = useState<SmsLogEntry[]>([]);
    const [filters, setFilters] = useState<SmsLogFilters>({});
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/admin/sms/logs");
            const list: SmsLogEntry[] = Array.isArray(res.data?.data) ? res.data.data : [];
            setAllLogs(list);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch SMS logs.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const filteredLogs = useMemo(() => {
        return allLogs.filter((log) => {
            if (filters.recipient && !log.recipient.toLowerCase().includes(filters.recipient.toLowerCase())) {
                return false;
            }
            if (filters.status && log.status.toLowerCase() !== filters.status.toLowerCase()) {
                return false;
            }
            return true;
        });
    }, [allLogs, filters]);

    const pagination: SmsLogPagination = useMemo(() => {
        const totalCount = filteredLogs.length;
        const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
        return { page, limit: PAGE_SIZE, totalCount, totalPages };
    }, [filteredLogs.length, page]);

    const visibleLogs = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredLogs.slice(start, start + PAGE_SIZE);
    }, [filteredLogs, page]);

    const applyFilters = useCallback((newFilters: SmsLogFilters) => {
        setFilters(newFilters);
        setPage(1);
    }, []);

    const goToPage = useCallback((targetPage: number) => {
        setPage(targetPage);
    }, []);

    return {
        logs: visibleLogs,
        pagination,
        filters,
        isLoading,
        error,
        fetchLogs,
        applyFilters,
        goToPage,
    };
}
