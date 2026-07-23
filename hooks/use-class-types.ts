import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export interface ClassType {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    nextClassType: { id: string; name: string } | null;
    createdAt: string;
}

export interface CreateClassTypePayload {
    name: string;
    description?: string;
    nextClassTypeId?: string;
}

export interface UpdateClassTypePayload {
    name?: string;
    description?: string;
    nextClassTypeId?: string | null;
    isActive?: boolean;
}

export function useClassTypes() {
    const [classTypes, setClassTypes] = useState<ClassType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchClassTypes = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/classes/types");
            setClassTypes(res.data?.data ?? []);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to fetch class types."
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createClassType = useCallback(async (payload: CreateClassTypePayload): Promise<ClassType> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/classes/types", payload);
            const created: ClassType = res.data?.data;
            setClassTypes((prev) => [...prev, created]);
            return created;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to create class type.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateClassType = useCallback(async (id: string, payload: UpdateClassTypePayload): Promise<ClassType> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/classes/types/${id}`, payload);
            const updated: ClassType = res.data?.data;
            setClassTypes((prev) => prev.map((t) => (t.id === id ? updated : t)));
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to update class type.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteClassType = useCallback(async (id: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/classes/types/${id}`);
            setClassTypes((prev) => prev.filter((t) => t.id !== id));
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to delete class type.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    useEffect(() => {
        fetchClassTypes();
    }, [fetchClassTypes]);

    const clearError = useCallback(() => setError(null), []);
    return {
        classTypes,
        isLoading,
        isSubmitting,
        error,

        clearError,
        fetchClassTypes,
        createClassType,
        updateClassType,
        deleteClassType,
    };
}
