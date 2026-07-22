import { useState, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export interface PastorFeedbackRecord {
    id: string;
    department: { id: string; name: string };
    weekOf: string;
    attendanceNotes: string;
    highlights: string;
    challenges: string;
    prayerRequests: string | null;
    additionalNotes: string | null;
    submittedByName: string;
    submittedAt: string;
    respondedByPastorName: string | null;
    pastorResponse: string | null;
    pastorRespondedAt: string | null;
}

export interface FeedbackPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface UpdateFeedbackPayload {
    attendanceNotes?: string;
    highlights?: string;
    challenges?: string;
    prayerRequests?: string;
    additionalNotes?: string;
}

export function usePastorFeedbackAdmin() {
    const [records, setRecords] = useState<PastorFeedbackRecord[]>([]);
    const [pagination, setPagination] = useState<FeedbackPagination | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchFeedback = useCallback(async (
        page = 1,
        departmentId?: string,
        weekOf?: string,
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: String(page), limit: "10" });
            if (departmentId) params.set("departmentId", departmentId);
            if (weekOf) params.set("weekOf", weekOf);
            const res = await api.get(`/pastor-feedback/admin?${params.toString()}`);
            const outer = res.data?.data;
            const list: PastorFeedbackRecord[] = Array.isArray(outer?.data) ? outer.data : [];
            setRecords(list);
            setPagination({
                page: outer?.page ?? page,
                limit: outer?.limit ?? 10,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch feedback.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateFeedback = useCallback(async (
        id: string,
        payload: UpdateFeedbackPayload,
    ): Promise<PastorFeedbackRecord> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/pastor-feedback/admin/${id}`, payload);
            const updated: PastorFeedbackRecord = res.data?.data;
            setRecords((prev) => prev.map((r) => (r.id === id ? updated : r)));
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to update feedback.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteFeedback = useCallback(async (id: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/pastor-feedback/admin/${id}`);
            setRecords((prev) => prev.filter((r) => r.id !== id));
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to delete feedback.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const respondToFeedback = useCallback(async (
        id: string,
        response: string,
    ): Promise<PastorFeedbackRecord> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/pastor-feedback/admin/${id}/respond`, { response });
            const updated: PastorFeedbackRecord = res.data?.data;
            setRecords((prev) => prev.map((r) => (r.id === id ? updated : r)));
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to send response.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    return {
        records,
        pagination,
        isLoading,
        isSubmitting,
        error,
        fetchFeedback,
        updateFeedback,
        deleteFeedback,
        respondToFeedback,
    };
}
