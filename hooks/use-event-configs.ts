import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

export interface EventConfig {
    id: string;
    name: string;
    description: string;
    defaultVenueId: string;
    workerCheckinStartOffsetSeconds: number;
    workerLateOffsetSeconds: number;
    memberCheckinStartOffsetSeconds: number;
    checkinStopOffsetSeconds: number;
    allowedDistanceInMeters: number;
    createdAt?: string;
}

export interface CreateEventConfigPayload {
    name: string;
    description: string;
    defaultVenueId: string;
    workerCheckinStartOffsetSeconds: number;
    workerLateOffsetSeconds: number;
    memberCheckinStartOffsetSeconds: number;
    checkinStopOffsetSeconds: number;
    allowedDistanceInMeters: number;
}

export type UpdateEventConfigPayload = Partial<CreateEventConfigPayload>;

export function useEventConfigs() {
    const [eventConfigs, setEventConfigs] = useState<EventConfig[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEventConfigs = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/event-config");
            setEventConfigs(res.data?.data.data ?? []);
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                err?.message ||
                "Failed to fetch event configs."
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createEventConfig = useCallback(async (payload: CreateEventConfigPayload): Promise<EventConfig> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/event-config", payload);
            const created: EventConfig = res.data?.data.data;
            setEventConfigs((prev) => [created, ...prev]);
            return created;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to create event config.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateEventConfig = useCallback(async (configId: string, payload: UpdateEventConfigPayload): Promise<EventConfig> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/event-config/${configId}`, payload);
            const updated: EventConfig = res.data?.data.data;
            setEventConfigs((prev) =>
                prev.map((c) => (c.id === configId ? updated : c))
            );
            return updated;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to update event config.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteEventConfig = useCallback(async (configId: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/event-config/${configId}`);
            setEventConfigs((prev) => prev.filter((c) => c.id !== configId));
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to delete event config.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    useEffect(() => {
        fetchEventConfigs();
    }, [fetchEventConfigs]);

    return {
        eventConfigs,
        isLoading,
        isSubmitting,
        error,
        fetchEventConfigs,
        createEventConfig,
        updateEventConfig,
        deleteEventConfig,
    };
}