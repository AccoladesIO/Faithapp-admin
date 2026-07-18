import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

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
    onlineAttendanceEnabled: boolean;
    isRecurring: boolean;
    recurrence?: Recurrence;
    serviceSlots: ServiceSlot[];
}

export type UpdateEventPayload = Partial<CreateEventPayload>;

export type ReminderIntervalPreset = "15m" | "30m" | "1h" | "3h" | "24h" | "48h";
export type ReminderAudience = "WORKERS" | "MEMBERS" | "ALL";

export interface EventReminder {
    id: string;
    intervalPreset: ReminderIntervalPreset;
    audience: ReminderAudience | null;
    departmentId: string | null;
    enabled: boolean;
    createdAt: string;
}

export interface CreateReminderPayload {
    intervalPreset: ReminderIntervalPreset;
    audience?: ReminderAudience;
    departmentId?: string;
}

export interface UpdateReminderPayload {
    intervalPreset?: ReminderIntervalPreset;
    audience?: ReminderAudience;
    departmentId?: string;
    enabled?: boolean;
}

export interface EventFilters {
    page?: number;
    limit?: number;
    upcoming?: boolean;
    from?: string;
    to?: string;
}

export interface EventPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export function useEvents(defaultLimit = 20) {
    const [events, setEvents] = useState<ChurchEvent[]>([]);
    const [pagination, setPagination] = useState<EventPagination | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = useCallback(async (filters: EventFilters = {}) => {
        setIsLoading(true);
        setError(null);
        try {
            const qs = new URLSearchParams({
                page: String(filters.page ?? 1),
                limit: String(filters.limit ?? defaultLimit),
            });
            if (filters.upcoming !== undefined) qs.set("upcoming", String(filters.upcoming));
            if (filters.from) qs.set("from", filters.from);
            if (filters.to) qs.set("to", filters.to);
            const res = await api.get(`/events?${qs.toString()}`);
            const outer = res.data?.data;
            setEvents(Array.isArray(outer?.data) ? outer.data : []);
            setPagination({
                page: outer?.page ?? (filters.page ?? 1),
                limit: outer?.limit ?? defaultLimit,
                totalCount: outer?.totalCount ?? 0,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to fetch events."
            );
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const createEvent = useCallback(async (payload: CreateEventPayload): Promise<ChurchEvent> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/events", payload);
            const created: ChurchEvent | ChurchEvent[] = res.data?.data;
            const createdList = Array.isArray(created) ? created : [created];
            setEvents((prev) => [...createdList, ...prev]);
            return createdList[0];
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
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
            const updated: ChurchEvent = res.data?.data;
            setEvents((prev) =>
                prev.map((e) => (e.id === eventId ? updated : e))
            );
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
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
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to delete event.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteRecurringSeries = useCallback(async (recurringEventId: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/events/recurring/${recurringEventId}`);
            setEvents((prev) => prev.filter((e) => e.recurrence == null || e.id !== recurringEventId));
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to delete recurring series.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchReminders = useCallback(async (slotId: string): Promise<EventReminder[]> => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/events/slots/${slotId}/reminders`);
            return res.data?.data as EventReminder[];
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to fetch reminders.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createReminder = useCallback(async (slotId: string, payload: CreateReminderPayload): Promise<EventReminder> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/events/slots/${slotId}/reminders`, payload);
            return res.data?.data as EventReminder;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to create reminder.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateReminder = useCallback(async (slotId: string, reminderId: string, payload: UpdateReminderPayload): Promise<EventReminder> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/events/slots/${slotId}/reminders/${reminderId}`, payload);
            return res.data?.data as EventReminder;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to update reminder.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteReminder = useCallback(async (slotId: string, reminderId: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/events/slots/${slotId}/reminders/${reminderId}`);
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to delete reminder.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const clearError = useCallback(() => setError(null), []);
    return {
        events,
        pagination,
        isLoading,
        isSubmitting,
        error,

        clearError,
        fetchEvents,
        createEvent,
        updateEvent,
        deleteEvent,
        deleteRecurringSeries,
        fetchReminders,
        createReminder,
        updateReminder,
        deleteReminder,
    };
}