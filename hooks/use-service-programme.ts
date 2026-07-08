import { useState, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";
import { toLocalDate } from "@/utils/parse-local-time";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type ServiceSlotType =
    | "SPEAKER"
    | "WORSHIP"
    | "PRAYER"
    | "OFFERING"
    | "ANNOUNCEMENT"
    | "DEDICATION"
    | "OTHER"
    | "BREAK";

export type ServiceProgrammeStatus = "DRAFT" | "LIVE" | "COMPLETED";

export interface ServiceProgrammeSlot {
    id: string;
    position: number;
    type: ServiceSlotType;
    topic: string | null;
    allocatedMinutes: number;
    memberId: string | null;
    guestName: string | null;
    memberName?: string | null;
}

export interface ServiceProgramme {
    id: string;
    serviceSlotId: string;
    serviceSlotName?: string | null;
    status: ServiceProgrammeStatus;
    saveAsTemplate: boolean;
    slots: ServiceProgrammeSlot[];
    createdAt: string;
    updatedAt: string;
}

export interface ServiceProgrammeTemplate {
    id: string;
    serviceSlotId: string;
    serviceSlotName?: string | null;
    slots: ServiceProgrammeSlot[];
    createdAt: string;
}

export interface ServiceSlotOption {
    id: string;
    name: string;
    eventId: string;
    eventName: string;
}

export interface ProgrammePagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface CreateProgrammeDto {
    serviceSlotId: string;
    saveAsTemplate: boolean;
}

export interface AddSlotDto {
    type: ServiceSlotType;
    topic?: string;
    memberId?: string;
    guestName?: string;
    allocatedMinutes: number;
}

export interface UpdateSlotDto {
    type?: ServiceSlotType;
    topic?: string;
    memberId?: string | null;
    guestName?: string | null;
    allocatedMinutes?: number;
}

export function useServiceProgramme(defaultLimit = 10) {
    const [programmes, setProgrammes] = useState<ServiceProgramme[]>([]);
    const [pagination, setPagination] = useState<ProgrammePagination | null>(null);
    const [templates, setTemplates] = useState<ServiceProgrammeTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProgrammes = useCallback(async (page = 1) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/service-programme?page=${page}&limit=${defaultLimit}`);
            const outer = res.data?.data;
            const list: ServiceProgramme[] = Array.isArray(outer?.data) ? outer.data : [];
            setProgrammes(list);
            setPagination({
                page: outer?.page ?? page,
                limit: outer?.limit ?? defaultLimit,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to fetch programmes."
            );
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const fetchProgramme = useCallback(async (id: string): Promise<ServiceProgramme> => {
        const res = await api.get(`/service-programme/${id}`);
        return res.data?.data;
    }, []);

    const createProgramme = useCallback(async (dto: CreateProgrammeDto): Promise<ServiceProgramme> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/service-programme", dto);
            const created: ServiceProgramme = res.data?.data;
            setProgrammes((prev) => [created, ...prev]);
            return created;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to create programme.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteProgramme = useCallback(async (id: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/service-programme/${id}`);
            setProgrammes((prev) => prev.filter((p) => p.id !== id));
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to delete programme.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const addSlot = useCallback(async (
        programmeId: string,
        dto: AddSlotDto
    ): Promise<ServiceProgrammeSlot[]> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/service-programme/${programmeId}/slots`, dto);
            return res.data?.data ?? [];
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to add slot.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateSlot = useCallback(async (
        programmeId: string,
        slotId: string,
        dto: UpdateSlotDto
    ): Promise<ServiceProgrammeSlot> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/service-programme/${programmeId}/slots/${slotId}`, dto);
            return res.data?.data;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to update slot.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteSlot = useCallback(async (programmeId: string, slotId: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/service-programme/${programmeId}/slots/${slotId}`);
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to delete slot.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const reorderSlots = useCallback(async (
        programmeId: string,
        slotIds: string[]
    ): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.put(`/service-programme/${programmeId}/slots/reorder`, {
                slots: slotIds.map((id) => ({ id })),
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to reorder slots.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchTemplates = useCallback(async (): Promise<void> => {
        setError(null);
        try {
            const res = await api.get("/service-programme/templates");
            const list: ServiceProgrammeTemplate[] = Array.isArray(res.data?.data)
                ? res.data.data
                : [];
            setTemplates(list);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to fetch templates."
            );
        }
    }, []);

    const deleteTemplate = useCallback(async (templateId: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/service-programme/templates/${templateId}`);
            setTemplates((prev) => prev.filter((t) => t.id !== templateId));
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to delete template.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const applyTemplate = useCallback(async (
        programmeId: string,
        templateId: string
    ): Promise<ServiceProgramme> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(
                `/service-programme/${programmeId}/apply-template/${templateId}`
            );
            return res.data?.data;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to apply template.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchServiceSlots = useCallback(async (): Promise<ServiceSlotOption[]> => {
        try {
            const res = await api.get("/events?page=1&limit=100");
            const events: { id: string; name: string; endDate?: string; eventDate?: string; serviceSlots?: { id: string; name: string }[] }[] = res.data?.data?.data ?? res.data?.data ?? [];
            const today = toLocalDate();
            const options: ServiceSlotOption[] = [];
            for (const event of events) {
                const eventEnd: string = event.endDate ?? event.eventDate ?? "";
                if (eventEnd && eventEnd < today) continue;
                const slots: { id: string; name: string }[] = Array.isArray(event.serviceSlots) ? event.serviceSlots : [];
                for (const slot of slots) {
                    options.push({
                        id: slot.id,
                        name: slot.name,
                        eventId: event.id,
                        eventName: event.name,
                    });
                }
            }
            return options;
        } catch {
            return [];
        }
    }, []);

    const goToPage = useCallback((page: number) => {
        fetchProgrammes(page);
    }, [fetchProgrammes]);

    const clearError = useCallback(() => setError(null), []);
    return {
        programmes,
        pagination,
        templates,
        isLoading,
        isSubmitting,
        error,

        clearError,
        fetchProgrammes,
        fetchProgramme,
        createProgramme,
        deleteProgramme,
        addSlot,
        updateSlot,
        deleteSlot,
        reorderSlots,
        fetchTemplates,
        deleteTemplate,
        applyTemplate,
        fetchServiceSlots,
        goToPage,
    };
}
