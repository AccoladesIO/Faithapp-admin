import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

export interface ServiceSlot {
    name: string;
    startTime: string; // ISO string
    endTime: string;   // ISO string
    configId: string;
    venueOverrideId?: string;
}

export interface Recurrence {
    recurrencePattern: "daily" | "weekly" | "monthly";
    recurrenceInterval: number;
    recurrenceEndDate: string;
}

export interface ChurchEvent {
    id: string;
    name: string;
    description: string;
    eventDate: string;
    onlineAttendanceEnabled: boolean;
    isRecurring: boolean;
    recurrence?: Recurrence;
    serviceSlots: ServiceSlot[];
    endDate: string;
    createdAt?: string;
}

export interface CreateEventPayload {
    name: string;
    description: string;
    eventDate: string;
    onlineAttendanceEnabled: boolean;
    isRecurring: boolean;
    recurrence?: Recurrence;
    serviceSlots: ServiceSlot[];
    endDate: string;
}

export type UpdateEventPayload = Partial<CreateEventPayload>;

export function useEvents() {
    const [events, setEvents] = useState<ChurchEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/events");
            setEvents(res.data?.data.data ?? []);
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                err?.message ||
                "Failed to fetch events."
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createEvent = useCallback(async (payload: CreateEventPayload): Promise<ChurchEvent> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/events", payload);
            const created: ChurchEvent = res.data?.data.data;
            setEvents((prev) => [created, ...prev]);
            return created;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to create event.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateEvent = useCallback(async (eventId: string, payload: UpdateEventPayload): Promise<ChurchEvent> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/events/${eventId}`, payload);
            const updated: ChurchEvent = res.data?.data.data;
            setEvents((prev) =>
                prev.map((e) => (e.id === eventId ? updated : e))
            );
            return updated;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to update event.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteEvent = useCallback(async (eventId: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/events/${eventId}`);
            setEvents((prev) => prev.filter((e) => e.id !== eventId));
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to delete event.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    return {
        events,
        isLoading,
        isSubmitting,
        error,
        fetchEvents,
        createEvent,
        updateEvent,
        deleteEvent,
    };
}