"use client";

import { useCallback, useState } from "react";
import { api } from "@/utils/auth/axios-client";

export type VolunteerOpportunityStatus = "OPEN" | "CLOSED" | "CANCELLED";

export interface VolunteerOpportunity {
    id: string;
    title: string;
    description: string | null;
    department: { id: string; name: string } | null;
    date: string;
    capacity: number | null;
    confirmedCount: number;
    status: VolunteerOpportunityStatus;
    createdBy?: { member?: { firstname: string; lastname: string } } | null;
    createdAt: string;
}

export interface VolunteerSignupRow {
    id: string;
    status: "CONFIRMED" | "CANCELLED";
    createdAt: string;
    member: { id: string; firstname: string; lastname: string };
}

export interface VolunteerOpportunityPayload {
    title: string;
    description?: string;
    departmentId?: string;
    date: string;
    capacity?: number;
}

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export function useVolunteerAdmin() {
    const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([]);
    const [pagination, setPagination] = useState<{ page: number; limit: number; totalPages: number; totalCount: number } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchOpportunities = useCallback(async (page = 1, limit = 20) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/admin/volunteer-opportunities?page=${page}&limit=${limit}`);
            const outer = res.data.data;
            setOpportunities(outer.data ?? []);
            setPagination({
                page: outer.page,
                limit: outer.limit,
                totalPages: outer.totalPages,
                totalCount: outer.totalCount,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to load volunteer opportunities.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createOpportunity = useCallback(async (payload: VolunteerOpportunityPayload) => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/admin/volunteer-opportunities", payload);
            const created: VolunteerOpportunity = res.data.data;
            setOpportunities((prev) => [created, ...prev]);
            return created;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to create opportunity.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateOpportunity = useCallback(async (id: string, payload: Partial<VolunteerOpportunityPayload>) => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/volunteer-opportunities/${id}`, payload);
            const updated: VolunteerOpportunity = res.data.data;
            setOpportunities((prev) => prev.map((o) => (o.id === id ? updated : o)));
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to update opportunity.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const cancelOpportunity = useCallback(async (id: string) => {
        setError(null);
        try {
            const res = await api.patch(`/admin/volunteer-opportunities/${id}/cancel`);
            const updated: VolunteerOpportunity = res.data.data;
            setOpportunities((prev) => prev.map((o) => (o.id === id ? updated : o)));
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to cancel opportunity.");
        }
    }, []);

    const fetchRoster = useCallback(async (id: string): Promise<VolunteerSignupRow[]> => {
        const res = await api.get(`/admin/volunteer-opportunities/${id}/signups`);
        return res.data.data ?? [];
    }, []);

    return {
        opportunities,
        pagination,
        isLoading,
        isSubmitting,
        error,
        fetchOpportunities,
        createOpportunity,
        updateOpportunity,
        cancelOpportunity,
        fetchRoster,
    };
}
