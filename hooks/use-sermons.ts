import { useState, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export interface Sermon {
    id: string;
    title: string;
    speakerName: string;
    date: string;
    description: string | null;
    youtubeUrl: string | null;
    mixlrUrl: string | null;
    series: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SermonPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface SermonPayload {
    title: string;
    speakerName: string;
    date: string;
    description?: string;
    youtubeUrl?: string;
    mixlrUrl?: string;
    series?: string;
}

export type LivePlatform = "YOUTUBE" | "MIXLR";

export function useSermons(defaultLimit = 20) {
    const [sermons, setSermons] = useState<Sermon[]>([]);
    const [pagination, setPagination] = useState<SermonPagination | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSermons = useCallback(async (page = 1, series?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const qs = new URLSearchParams({ page: String(page), limit: String(defaultLimit) });
            if (series) qs.set("series", series);
            const res = await api.get(`/admin/sermons?${qs.toString()}`);
            const outer = res.data?.data;
            const list: Sermon[] = Array.isArray(outer?.data) ? outer.data : [];
            setSermons(list);
            setPagination({
                page: outer?.page ?? page,
                limit: outer?.limit ?? defaultLimit,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch sermons.");
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const createSermon = useCallback(async (payload: SermonPayload): Promise<boolean> => {
        setIsSaving(true);
        setError(null);
        try {
            const res = await api.post("/admin/sermons", payload);
            const created: Sermon = res.data?.data ?? res.data;
            setSermons((prev) => [created, ...prev]);
            return true;
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to create sermon.");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, []);

    const updateSermon = useCallback(async (id: string, payload: Partial<SermonPayload>): Promise<boolean> => {
        setIsSaving(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/sermons/${id}`, payload);
            const updated: Sermon = res.data?.data ?? res.data;
            setSermons((prev) => prev.map((s) => (s.id === id ? updated : s)));
            return true;
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to update sermon.");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, []);

    const deleteSermon = useCallback(async (id: string): Promise<boolean> => {
        setIsSaving(true);
        setError(null);
        try {
            await api.delete(`/admin/sermons/${id}`);
            setSermons((prev) => prev.filter((s) => s.id !== id));
            return true;
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to delete sermon.");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, []);

    const announceLive = useCallback(async (platform: LivePlatform, url: string, title?: string): Promise<boolean> => {
        setIsSaving(true);
        setError(null);
        try {
            await api.post("/admin/sermons/announce-live", { platform, url, title });
            return true;
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to send live announcement.");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, []);

    return {
        sermons, pagination, isLoading, isSaving, error,
        fetchSermons, createSermon, updateSermon, deleteSermon, announceLive,
    };
}
