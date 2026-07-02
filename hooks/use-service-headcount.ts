import { useState, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

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
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                err?.message ||
                "Failed to fetch headcount records."
            );
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const goToPage = useCallback((page: number) => {
        fetchRecords({ ...currentParams, page });
    }, [fetchRecords, currentParams]);

    const createRecord = useCallback(async (dto: CreateHeadcountDto): Promise<ServiceHeadcount> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/service-headcount", dto);
            const created: ServiceHeadcount = res.data?.data;
            setRecords((prev) => [created, ...prev]);
            return created;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to create headcount record.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateRecord = useCallback(async (
        id: string,
        dto: Partial<CreateHeadcountDto>
    ): Promise<ServiceHeadcount> => {
        setIsSubmitting(true);
        setError(null);
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { serviceSlotId: _omit, ...patch } = dto;
            const res = await api.patch(`/service-headcount/${id}`, patch);
            const updated: ServiceHeadcount = res.data?.data;
            setRecords((prev) => prev.map((r) => (r.id === id ? updated : r)));
            return updated;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to update headcount record.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchTrends = useCallback(async (
        period: "weekly" | "monthly" | "yearly",
        from?: string,
        to?: string
    ): Promise<HeadcountTrends> => {
        const query = new URLSearchParams({ period });
        if (from) query.set("from", from);
        if (to) query.set("to", to);
        const res = await api.get(`/service-headcount/trends?${query.toString()}`);
        return res.data?.data;
    }, []);

    const fetchSlots = useCallback(async (): Promise<ServiceSlotOption[]> => {
        try {
            const res = await api.get("/events?page=1&limit=100");
            const events: any[] = res.data?.data?.data ?? [];
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
        updateRecord,
        fetchTrends,
        fetchSlots,
        goToPage,
    };
}
