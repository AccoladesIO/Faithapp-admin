"use client";

import { useCallback, useState } from "react";
import { api } from "@/utils/auth/axios-client";

export interface ServiceRatingSummary {
    averageRating: number;
    totalRatings: number;
    distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export interface ServiceRatingComment {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    serviceSlotName: string;
    eventName: string;
    member: { id: string; firstname: string; lastname: string } | null;
}

export interface ServiceRatingCommentsPage {
    data: ServiceRatingComment[];
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export function useServiceRatings() {
    const [summary, setSummary] = useState<ServiceRatingSummary | null>(null);
    const [comments, setComments] = useState<ServiceRatingComment[]>([]);
    const [pagination, setPagination] = useState<{ page: number; limit: number; totalPages: number; totalCount: number } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = useCallback(async (eventId?: string, from?: string, to?: string) => {
        setError(null);
        try {
            const query = new URLSearchParams();
            if (eventId) query.set("eventId", eventId);
            if (from) query.set("from", from);
            if (to) query.set("to", to);
            const res = await api.get(`/admin/service-ratings/summary?${query.toString()}`);
            setSummary(res.data.data);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            setError(e?.response?.data?.message || e?.message || "Failed to load rating summary.");
        }
    }, []);

    const fetchComments = useCallback(async (page = 1, limit = 20) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/admin/service-ratings/comments?page=${page}&limit=${limit}`);
            const outer = res.data.data;
            setComments(outer.data ?? []);
            setPagination({
                page: outer.page,
                limit: outer.limit,
                totalPages: outer.totalPages,
                totalCount: outer.totalCount,
            });
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            setError(e?.response?.data?.message || e?.message || "Failed to load comments.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const moderateDelete = useCallback(async (id: string) => {
        setError(null);
        try {
            await api.delete(`/admin/service-ratings/${id}`);
            setComments((prev) => prev.filter((c) => c.id !== id));
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            setError(e?.response?.data?.message || e?.message || "Failed to remove comment.");
        }
    }, []);

    return { summary, comments, pagination, isLoading, error, fetchSummary, fetchComments, moderateDelete };
}
