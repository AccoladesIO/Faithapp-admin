import { useState, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type ConvertStatus = "UNSAVED" | "SAVED" | "UNDERGOING_DISCIPLESHIP";

export interface ConvertRecord {
    id: string;
    name: string;
    phone: string | null;
    notes: string | null;
    status: ConvertStatus;
    onboardedByName: string;
    onboardedBy: { id: string; firstname: string; lastname: string } | null;
    assignedTo: { id: string; member: { firstname: string; lastname: string } } | null;
    member: { id: string; firstname: string; lastname: string } | null;
    linkedAt: string | null;
    lastContactedAt: string | null;
    createdAt: string;
}

export interface ConvertPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface FollowUpLogRecord {
    id: string;
    loggedByName: string;
    note: string | null;
    contactedAt: string;
}

export interface EvangelismWorkerOption {
    workerProfileId: string;
    firstname: string;
    lastname: string;
}

// Raw shape of a row from GET /departments/:id/workers — a WorkerProfile
// with its member relation populated. Kept separate from use-departments.ts's
// fetchDepartmentWorkers(), which unwraps to the member's id (right for a
// lead-assignment picker, wrong here — reassignConvert needs the
// WorkerProfile's own id).
interface WorkerProfileRow {
    id: string;
    member: { firstname: string; lastname: string };
}

// Scoped to whichever department(s) hold the MANAGE_EVANGELISM_CONVERTS
// capability — more than one department can hold it, so this merges workers
// across all of them (deduped by worker profile id) rather than assuming a
// single "the Evangelism department" like the old key-based lookup did.
export async function fetchEvangelismWorkerOptions(): Promise<EvangelismWorkerOption[]> {
    const deptRes = await api.get("/departments");
    const departments: Array<{ id: string; capabilities: string[] }> = deptRes.data?.data ?? [];
    const evangelismDepts = departments.filter((d) =>
        d.capabilities?.includes("MANAGE_EVANGELISM_CONVERTS")
    );
    if (evangelismDepts.length === 0) return [];

    const results = await Promise.all(
        evangelismDepts.map((d) => api.get(`/departments/${d.id}/workers?limit=100`))
    );
    const byId = new Map<string, EvangelismWorkerOption>();
    for (const res of results) {
        const outer = res.data?.data;
        const rows: WorkerProfileRow[] = Array.isArray(outer?.data) ? outer.data : [];
        for (const r of rows) {
            byId.set(r.id, {
                workerProfileId: r.id,
                firstname: r.member.firstname,
                lastname: r.member.lastname,
            });
        }
    }
    return Array.from(byId.values());
}

export function useEvangelismAdmin() {
    const [converts, setConverts] = useState<ConvertRecord[]>([]);
    const [pagination, setPagination] = useState<ConvertPagination | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchConverts = useCallback(async (page = 1, status?: ConvertStatus) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: String(page), limit: "10" });
            if (status) params.set("status", status);
            const res = await api.get(`/evangelism/converts/admin?${params.toString()}`);
            const outer = res.data?.data;
            const list: ConvertRecord[] = Array.isArray(outer?.data) ? outer.data : [];
            setConverts(list);
            setPagination({
                page: outer?.page ?? page,
                limit: outer?.limit ?? 10,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch converts.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const reassignConvert = useCallback(async (
        id: string,
        workerProfileId: string,
    ): Promise<ConvertRecord> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/evangelism/converts/admin/${id}/reassign`, { workerProfileId });
            const updated: ConvertRecord = res.data?.data;
            setConverts((prev) => prev.map((c) => (c.id === id ? updated : c)));
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to reassign convert.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const linkToMember = useCallback(async (
        id: string,
        memberId: string,
    ): Promise<ConvertRecord> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/evangelism/converts/admin/${id}/link-member`, { memberId });
            const updated: ConvertRecord = res.data?.data;
            setConverts((prev) => prev.map((c) => (c.id === id ? updated : c)));
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to link convert to member.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchFollowUpHistory = useCallback(async (
        id: string,
        page = 1
    ): Promise<{ logs: FollowUpLogRecord[]; pagination: ConvertPagination | null }> => {
        try {
            const res = await api.get(`/evangelism/converts/admin/${id}/follow-up-history?page=${page}&limit=10`);
            const outer = res.data?.data;
            const logs: FollowUpLogRecord[] = Array.isArray(outer?.data) ? outer.data : [];
            return {
                logs,
                pagination: outer ? { page: outer.page, limit: outer.limit, totalCount: outer.totalCount, totalPages: outer.totalPages } : null,
            };
        } catch {
            return { logs: [], pagination: null };
        }
    }, []);

    return {
        converts,
        pagination,
        isLoading,
        isSubmitting,
        error,
        fetchConverts,
        reassignConvert,
        linkToMember,
        fetchFollowUpHistory,
    };
}
