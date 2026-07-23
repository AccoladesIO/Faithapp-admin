import { useState, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export interface ServiceHeadcount {
    id: string;
    serviceSlotId: string;
    serviceSlot?: {
        id: string;
        name: string;
        event?: { id: string; name: string; eventDate: string };
    };
    maleAdults: number;
    femaleAdults: number;
    teenagers: number;
    children: number;
    mobileChurch: number;
    customGroups?: Record<string, number>;
    notes?: string;
    recordedBy?: { member?: { firstname: string; lastname: string } } | null;
    createdAt: string;
    updatedAt: string;
}

export interface HeadcountPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface HeadcountTrends {
    period: string;
    from?: string;
    to?: string;
    data: Record<string, unknown>[];
}

export interface CreateHeadcountDto {
    serviceSlotId: string;
    maleAdults: number;
    femaleAdults: number;
    teenagers: number;
    children: number;
    mobileChurch: number;
    customGroups?: Record<string, number>;
    notes?: string;
}

export interface ServiceSlotOption {
    id: string;
    name: string;
    eventName: string;
    eventDate: string;
}

export interface FetchRecordsParams {
    page?: number;
    limit?: number;
    serviceSlotId?: string;
    from?: string;
    to?: string;
}

export interface HeadcountTotal {
    maleAdults: number;
    femaleAdults: number;
    teenagers: number;
    children: number;
    mobileChurch: number;
    customGroups: Record<string, number>;
    total: number;
}

export interface ServiceSlotHeadcountSummary {
    serviceSlotId: string;
    serviceSlotName: string;
    startTime: string;
    headcount: (HeadcountTotal & { id: string; notes: string | null }) | null;
}

export interface EventHeadcountSummary {
    eventId: string;
    eventName: string;
    slotCount: number;
    recordedCount: number;
    serviceSlots: ServiceSlotHeadcountSummary[];
    total: HeadcountTotal;
}

export function useServiceHeadcount(defaultLimit = 10) {
    const [records, setRecords] = useState<ServiceHeadcount[]>([]);
    const [pagination, setPagination] = useState<HeadcountPagination | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentParams, setCurrentParams] = useState<FetchRecordsParams>({});

    const fetchRecords = useCallback(async (params: FetchRecordsParams = {}) => {
        setIsLoading(true);
        setRecords([]);
        setError(null);
        const { page = 1, limit = defaultLimit, serviceSlotId, from, to } = params;
        try {
            const query = new URLSearchParams({ page: String(page), limit: String(limit) });
            if (serviceSlotId) query.set("serviceSlotId", serviceSlotId);
            if (from) query.set("from", from);
            if (to) query.set("to", to);
            const res = await api.get(`/service-headcount?${query.toString()}`);
            const outer = res.data?.data;
            const list: ServiceHeadcount[] = Array.isArray(outer?.data) ? outer.data : [];
            setRecords(list);
            setCurrentParams(params);
            setPagination({
                page: outer?.page ?? page,
                limit: outer?.limit ?? limit,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to fetch headcount records."
            );
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const goToPage = useCallback((page: number) => {
        fetchRecords({ ...currentParams, page });
    }, [fetchRecords, currentParams]);

    const fetchRecordDetail = useCallback(async (id: string): Promise<ServiceHeadcount> => {
        const res = await api.get(`/service-headcount/${id}`);
        return res.data?.data;
    }, []);

    const createRecord = useCallback(async (dto: CreateHeadcountDto): Promise<ServiceHeadcount> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/service-headcount", dto);
            const created: ServiceHeadcount = res.data?.data;
            setRecords((prev) => [created, ...prev]);
            return created;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to create headcount record.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchTrends = useCallback(async (
        period: "weekly" | "monthly" | "quarterly",
        from?: string,
        to?: string
    ): Promise<HeadcountTrends> => {
        const query = new URLSearchParams({ period });
        if (from) query.set("from", from);
        if (to) query.set("to", to);
        const res = await api.get(`/service-headcount/trends?${query.toString()}`);
        return res.data?.data;
    }, []);

    const fetchEventSummary = useCallback(async (eventId: string): Promise<EventHeadcountSummary> => {
        const res = await api.get(`/service-headcount/event/${eventId}/summary`);
        return res.data?.data;
    }, []);

    const fetchSlots = useCallback(async (): Promise<ServiceSlotOption[]> => {
        try {
            const res = await api.get("/events?page=1&limit=100");
            const events: { name?: string; eventDate?: string; serviceSlots?: { id: string; name: string }[] }[] = res.data?.data?.data ?? [];
            const slots: ServiceSlotOption[] = [];
            for (const event of events) {
                const slotList = Array.isArray(event.serviceSlots) ? event.serviceSlots : [];
                for (const slot of slotList) {
                    slots.push({
                        id: slot.id,
                        name: slot.name,
                        eventName: event.name ?? "",
                        eventDate: event.eventDate ?? "",
                    });
                }
            }
            return slots;
        } catch {
            return [];
        }
    }, []);

    return {
        records,
        pagination,
        isLoading,
        isSubmitting,
        error,
        fetchRecords,
        createRecord,
        fetchRecordDetail,
        fetchTrends,
        fetchSlots,
        fetchEventSummary,
        goToPage,
    };
}
