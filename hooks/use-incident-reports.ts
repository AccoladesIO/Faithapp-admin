import { useState, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type IncidentStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export interface IncidentReporter {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
}

export interface IncidentReport {
    id: string;
    title: string;
    description: string;
    images: string[] | null;
    location: string | null;
    status: IncidentStatus;
    isAnonymous: boolean;
    adminNotes: string | null;
    resolvedAt: string | null;
    reporter: IncidentReporter | null;
    createdAt: string;
    updatedAt: string;
}

export interface IncidentReportPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface IncidentReportFilters {
    status?: IncidentStatus | "";
    dateFrom?: string;
    dateTo?: string;
}

export interface UpdateStatusPayload {
    status: IncidentStatus;
    adminNotes?: string;
}

export function useIncidentReports(defaultLimit = 20) {
    const [reports, setReports] = useState<IncidentReport[]>([]);
    const [pagination, setPagination] = useState<IncidentReportPagination | null>(null);
    const [filters, setFilters] = useState<IncidentReportFilters>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReports = useCallback(async (page = 1, activeFilters: IncidentReportFilters = {}) => {
        setIsLoading(true);
        setError(null);
        try {
            const qs = new URLSearchParams({ page: String(page), limit: String(defaultLimit) });
            if (activeFilters.status) qs.set("status", activeFilters.status);
            if (activeFilters.dateFrom) qs.set("dateFrom", activeFilters.dateFrom);
            if (activeFilters.dateTo) qs.set("dateTo", activeFilters.dateTo);

            const res = await api.get(`/admin/incidents?${qs.toString()}`);
            const outer = res.data?.data;
            const list: IncidentReport[] = Array.isArray(outer?.data) ? outer.data : [];
            setReports(list);
            setPagination({
                page: outer?.page ?? page,
                limit: outer?.limit ?? defaultLimit,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch incident reports.");
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const applyFilters = useCallback((newFilters: IncidentReportFilters) => {
        setFilters(newFilters);
        fetchReports(1, newFilters);
    }, [fetchReports]);

    const goToPage = useCallback((page: number) => {
        fetchReports(page, filters);
    }, [fetchReports, filters]);

    const updateStatus = useCallback(async (id: string, payload: UpdateStatusPayload): Promise<boolean> => {
        setIsUpdating(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/incidents/${id}/status`, payload);
            const updated: IncidentReport = res.data?.data ?? res.data;
            setReports((prev) => prev.map((r) => r.id === id ? updated : r));
            return true;
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to update incident status.");
            return false;
        } finally {
            setIsUpdating(false);
        }
    }, []);

    return { reports, pagination, filters, isLoading, isUpdating, error, fetchReports, applyFilters, goToPage, updateStatus };
}
