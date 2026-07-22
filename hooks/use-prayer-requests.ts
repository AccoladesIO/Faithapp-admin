import { useState, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type PrayerRequestStatus = "OPEN" | "PRAYED_FOR" | "ANSWERED";

export interface PrayerRequestRecord {
    id: string;
    submittedByName: string;
    content: string;
    status: PrayerRequestStatus;
    createdAt: string;
    updatedAt: string;
}

export interface TestimonyRecord {
    id: string;
    submittedByName: string;
    content: string;
    isPublic: boolean;
    prayerRequest: { id: string; content: string } | null;
    createdAt: string;
}

export interface PrayerPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export type PregnancyCaseStatus = "ACTIVE" | "DELIVERED" | "DISCONTINUED";

export interface PregnancyCaseRecord {
    id: string;
    name: string;
    edd: string;
    details: string | null;
    status: PregnancyCaseStatus;
    lastPrayedAt: string | null;
    createdByName: string;
    createdAt: string;
}

export interface PregnancyVisitRecord {
    id: string;
    loggedByName: string;
    note: string | null;
    visitedAt: string;
}

export function usePrayerRequestsAdmin() {
    const [requests, setRequests] = useState<PrayerRequestRecord[]>([]);
    const [requestsPagination, setRequestsPagination] = useState<PrayerPagination | null>(null);
    const [testimonies, setTestimonies] = useState<TestimonyRecord[]>([]);
    const [testimoniesPagination, setTestimoniesPagination] = useState<PrayerPagination | null>(null);
    const [pregnancyCases, setPregnancyCases] = useState<PregnancyCaseRecord[]>([]);
    const [pregnancyCasesPagination, setPregnancyCasesPagination] = useState<PrayerPagination | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRequests = useCallback(async (page = 1, status?: PrayerRequestStatus) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: String(page), limit: "10" });
            if (status) params.set("status", status);
            const res = await api.get(`/prayer-requests/admin?${params.toString()}`);
            const outer = res.data?.data;
            const list: PrayerRequestRecord[] = Array.isArray(outer?.data) ? outer.data : [];
            setRequests(list);
            setRequestsPagination({
                page: outer?.page ?? page,
                limit: outer?.limit ?? 10,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch prayer requests.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchTestimonies = useCallback(async (page = 1) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: String(page), limit: "10" });
            const res = await api.get(`/testimonies/admin?${params.toString()}`);
            const outer = res.data?.data;
            const list: TestimonyRecord[] = Array.isArray(outer?.data) ? outer.data : [];
            setTestimonies(list);
            setTestimoniesPagination({
                page: outer?.page ?? page,
                limit: outer?.limit ?? 10,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch testimonies.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateStatus = useCallback(async (
        id: string,
        status: PrayerRequestStatus,
    ): Promise<PrayerRequestRecord> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/prayer-requests/admin/${id}/status`, { status });
            const updated: PrayerRequestRecord = res.data?.data;
            setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to update status.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchPregnancyCases = useCallback(async (page = 1, status?: PregnancyCaseStatus) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: String(page), limit: "10" });
            if (status) params.set("status", status);
            const res = await api.get(`/prayer-requests/admin/pregnancy-cases?${params.toString()}`);
            const outer = res.data?.data;
            const list: PregnancyCaseRecord[] = Array.isArray(outer?.data) ? outer.data : [];
            setPregnancyCases(list);
            setPregnancyCasesPagination({
                page: outer?.page ?? page,
                limit: outer?.limit ?? 10,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch pregnancy prayer cases.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updatePregnancyCaseStatus = useCallback(async (
        id: string,
        status: PregnancyCaseStatus,
    ): Promise<PregnancyCaseRecord> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/prayer-requests/admin/pregnancy-cases/${id}/status`, { status });
            const updated: PregnancyCaseRecord = res.data?.data;
            setPregnancyCases((prev) => prev.map((c) => (c.id === id ? updated : c)));
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to update status.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchPregnancyVisitHistory = useCallback(async (
        id: string,
        page = 1
    ): Promise<{ visits: PregnancyVisitRecord[]; pagination: PrayerPagination | null }> => {
        try {
            const res = await api.get(`/prayer-requests/admin/pregnancy-cases/${id}/visits?page=${page}&limit=10`);
            const outer = res.data?.data;
            const visits: PregnancyVisitRecord[] = Array.isArray(outer?.data) ? outer.data : [];
            return {
                visits,
                pagination: outer ? { page: outer.page, limit: outer.limit, totalCount: outer.totalCount, totalPages: outer.totalPages } : null,
            };
        } catch {
            return { visits: [], pagination: null };
        }
    }, []);

    return {
        requests,
        requestsPagination,
        testimonies,
        testimoniesPagination,
        pregnancyCases,
        pregnancyCasesPagination,
        isLoading,
        isSubmitting,
        error,
        fetchRequests,
        fetchTestimonies,
        fetchPregnancyCases,
        updateStatus,
        updatePregnancyCaseStatus,
        fetchPregnancyVisitHistory,
    };
}
