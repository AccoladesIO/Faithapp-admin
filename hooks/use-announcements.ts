import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

export type AnnouncementAudience = "ALL" | "DEPARTMENT" | "INDIVIDUAL";

export interface AnnouncementAuthor {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
}

export interface AnnouncementDepartment {
    id: string;
    name: string;
    key: string;
}

export interface AnnouncementTargetMember {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
}

export interface Announcement {
    id: string;
    title: string;
    body: string;
    audience: AnnouncementAudience;
    publishedAt: string;
    expiresAt: string | null;
    author: AnnouncementAuthor;
    department: AnnouncementDepartment | null;
    targetMember: AnnouncementTargetMember | null;
    createdAt: string;
    updatedAt: string;
}

export interface AnnouncementPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface CreateAnnouncementPayload {
    title: string;
    body: string;
    audience: AnnouncementAudience;
    publishedAt?: string;
    expiresAt?: string | null;
    departmentId?: string;
    targetMemberId?: string;
}

export type UpdateAnnouncementPayload = Partial<Omit<CreateAnnouncementPayload, "audience" | "departmentId" | "targetMemberId">>;

export function useAnnouncements(defaultLimit = 10) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [pagination, setPagination] = useState<AnnouncementPagination | null>(null);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAnnouncements = useCallback(async (targetPage = 1) => {
        setIsLoading(true);
        setAnnouncements([]);
        setError(null);
        try {
            const res = await api.get(
                `/announcements/all?page=${targetPage}&limit=${defaultLimit}`
            );
            const outer = res.data?.data;
            const list: Announcement[] = Array.isArray(outer?.data) ? outer.data : [];
            setAnnouncements(list);
            setPage(targetPage);
            setPagination({
                page: outer?.page ?? targetPage,
                limit: outer?.limit ?? defaultLimit,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                err?.message ||
                "Failed to fetch announcements."
            );
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const goToPage = useCallback((targetPage: number) => {
        fetchAnnouncements(targetPage);
    }, [fetchAnnouncements]);

    const createAnnouncement = useCallback(async (
        payload: CreateAnnouncementPayload
    ): Promise<Announcement> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/announcements", payload);
            const created: Announcement = res.data?.data;
            setAnnouncements((prev) => [created, ...prev]);
            return created;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to create announcement.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateAnnouncement = useCallback(async (
        announcementId: string,
        payload: UpdateAnnouncementPayload
    ): Promise<Announcement> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/announcements/${announcementId}`, payload);
            const updated: Announcement = res.data?.data;
            setAnnouncements((prev) =>
                prev.map((a) => (a.id === announcementId ? updated : a))
            );
            return updated;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to update announcement.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteAnnouncement = useCallback(async (
        announcementId: string
    ): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/announcements/${announcementId}`);
            setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to delete announcement.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    useEffect(() => {
        fetchAnnouncements(1);
    }, [fetchAnnouncements]);

    return {
        announcements,
        pagination,
        page,
        isLoading,
        isSubmitting,
        error,
        goToPage,
        refetch: () => fetchAnnouncements(page),
        createAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
    };
}