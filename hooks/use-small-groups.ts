"use client";

import { useCallback, useState } from "react";
import { api } from "@/utils/auth/axios-client";

export interface SmallGroup {
    id: string;
    name: string;
    description: string | null;
    leader: { id: string; firstname: string; lastname: string } | null;
    meetingDay: string | null;
    meetingLocation: string | null;
    createdAt: string;
}

export interface SmallGroupMemberRow {
    id: string;
    createdAt: string;
    member: { id: string; firstname: string; lastname: string };
}

export interface SmallGroupAttendanceRow {
    id: string;
    meetingDate: string;
    status: "PRESENT" | "ABSENT";
    member: { id: string; firstname: string; lastname: string };
}

export interface SmallGroupPayload {
    name: string;
    description?: string;
    leaderId?: string;
    meetingDay?: string;
    meetingLocation?: string;
}

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export function useSmallGroupsAdmin() {
    const [groups, setGroups] = useState<SmallGroup[]>([]);
    const [pagination, setPagination] = useState<{ page: number; limit: number; totalPages: number; totalCount: number } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchGroups = useCallback(async (page = 1, limit = 20) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/admin/small-groups?page=${page}&limit=${limit}`);
            const outer = res.data.data;
            setGroups(outer.data ?? []);
            setPagination({
                page: outer.page,
                limit: outer.limit,
                totalPages: outer.totalPages,
                totalCount: outer.totalCount,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to load fellowships.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createGroup = useCallback(async (payload: SmallGroupPayload) => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/admin/small-groups", payload);
            const created: SmallGroup = res.data.data;
            setGroups((prev) => [created, ...prev]);
            return created;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to create fellowship.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateGroup = useCallback(async (id: string, payload: Partial<SmallGroupPayload>) => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/small-groups/${id}`, payload);
            const updated: SmallGroup = res.data.data;
            setGroups((prev) => prev.map((g) => (g.id === id ? updated : g)));
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to update fellowship.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteGroup = useCallback(async (id: string) => {
        setError(null);
        try {
            await api.delete(`/admin/small-groups/${id}`);
            setGroups((prev) => prev.filter((g) => g.id !== id));
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to delete fellowship.");
        }
    }, []);

    const fetchRoster = useCallback(async (id: string): Promise<SmallGroupMemberRow[]> => {
        const res = await api.get(`/admin/small-groups/${id}/members`);
        return res.data.data ?? [];
    }, []);

    const removeMember = useCallback(async (id: string, memberId: string) => {
        setError(null);
        try {
            await api.delete(`/admin/small-groups/${id}/members/${memberId}`);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to remove member.");
            throw err;
        }
    }, []);

    const fetchAttendanceHistory = useCallback(async (id: string): Promise<SmallGroupAttendanceRow[]> => {
        const res = await api.get(`/admin/small-groups/${id}/attendance`);
        return res.data.data ?? [];
    }, []);

    return {
        groups,
        pagination,
        isLoading,
        isSubmitting,
        error,
        fetchGroups,
        createGroup,
        updateGroup,
        deleteGroup,
        fetchRoster,
        removeMember,
        fetchAttendanceHistory,
    };
}
