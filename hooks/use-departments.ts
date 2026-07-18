import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export interface DepartmentLead {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    type: "head" | "assistant";
}

export interface DepartmentWorker {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber: string | null;
    role: string;
}

// Raw shape of a row from GET /departments/:id/workers — a WorkerProfile
// with its member relation populated, not a flat member.
interface WorkerProfileRow {
    id: string;
    member: {
        id: string;
        firstname: string;
        lastname: string;
        email: string;
        phoneNumber: string | null;
        role: string;
    };
}

export interface Department {
    id: string;
    name: string;
    description: string | null;
    key: string;
    createdAt: string;
    updatedAt: string;
    leads?: DepartmentLead[];
    workersCount?: number;
}

export interface CreateDepartmentPayload {
    name: string;
    description: string;
    key: string;
}

export type UpdateDepartmentPayload = Partial<CreateDepartmentPayload>;

export interface AssignLeadPayload {
    departmentId: string;
    type: "head" | "assistant";
    memberId: string;
}

export interface RemoveLeadPayload {
    departmentId: string;
    type: "head" | "assistant";
}

export interface BulkAssignDepartmentPayload {
    memberIds: string[];
}

export interface BulkAssignDepartmentResult {
    updated: number;
    skipped: number;
}

export interface DepartmentPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export function useDepartments() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [departmentKeys, setDepartmentKeys] = useState<string[]>([]);
    const [pagination, setPagination] = useState<DepartmentPagination | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDepartments = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/departments");
            const outer = res.data?.data;
            const list: Department[] = Array.isArray(outer?.data)
                ? outer.data
                : Array.isArray(outer)
                    ? outer
                    : [];
            setDepartments(list);
            if (outer?.page !== undefined) {
                setPagination({
                    page: outer.page,
                    limit: outer.limit,
                    totalCount: outer.totalCount,
                    totalPages: outer.totalPages,
                });
            }
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to fetch departments."
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchDepartmentKeys = useCallback(async () => {
        try {
            const res = await api.get("/departments/keys");
            const keys = res.data?.data;
            setDepartmentKeys(Array.isArray(keys) ? keys : []);
        } catch {
            // non-fatal
        }
    }, []);

    const createDepartment = useCallback(async (
        payload: CreateDepartmentPayload
    ): Promise<Department> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/departments", payload);
            const created: Department = res.data?.data;
            setDepartments((prev) => [created, ...prev]);
            return created;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to create department.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateDepartment = useCallback(async (
        departmentId: string,
        payload: UpdateDepartmentPayload
    ): Promise<Department> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/departments/${departmentId}`, payload);
            const updated: Department = res.data?.data;
            setDepartments((prev) =>
                prev.map((d) => (d.id === departmentId ? updated : d))
            );
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to update department.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteDepartment = useCallback(async (
        departmentId: string
    ): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/departments/${departmentId}`);
            setDepartments((prev) => prev.filter((d) => d.id !== departmentId));
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to delete department.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const assignLead = useCallback(async (
        payload: AssignLeadPayload
    ): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.post("/departments/assign-lead", payload);
            await fetchDepartments();
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to assign lead.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, [fetchDepartments]);

    const removeLead = useCallback(async (
        payload: RemoveLeadPayload
    ): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.post("/departments/remove-lead", payload);
            await fetchDepartments();
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to remove lead.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, [fetchDepartments]);

    const fetchDepartmentLeads = useCallback(async (
        departmentId: string
    ): Promise<DepartmentLead[]> => {
        try {
            const res = await api.get(`/departments/leads/${departmentId}`);
            // The endpoint returns { name, head, assistant } — each a
            // WorkerProfile (member nested) or null — not an array, so the
            // previous `Array.isArray(data) ? data : []` always fell through
            // to [], making the leads panel appear empty even when a head or
            // assistant was assigned. Build the flat array the UI expects.
            const data: {
                head: WorkerProfileRow | null;
                assistant: WorkerProfileRow | null;
            } | undefined = res.data?.data;
            if (!data) return [];
            const leads: DepartmentLead[] = [];
            if (data.head) {
                leads.push({
                    id: data.head.member.id,
                    firstname: data.head.member.firstname,
                    lastname: data.head.member.lastname,
                    email: data.head.member.email,
                    type: "head",
                });
            }
            if (data.assistant) {
                leads.push({
                    id: data.assistant.member.id,
                    firstname: data.assistant.member.firstname,
                    lastname: data.assistant.member.lastname,
                    email: data.assistant.member.email,
                    type: "assistant",
                });
            }
            return leads;
        } catch {
            return [];
        }
    }, []);

    const bulkAssignDepartment = useCallback(async (
        departmentId: string,
        payload: BulkAssignDepartmentPayload
    ): Promise<BulkAssignDepartmentResult> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/departments/${departmentId}/bulk-assign`, payload);
            return res.data?.data as BulkAssignDepartmentResult;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to bulk assign department.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchDepartmentWorkers = useCallback(async (
        departmentId: string,
        page = 1,
        limit = 20
    ): Promise<{ workers: DepartmentWorker[]; pagination: DepartmentPagination | null }> => {
        try {
            const res = await api.get(
                `/departments/${departmentId}/workers?page=${page}&limit=${limit}`
            );
            const outer = res.data?.data;
            const rows: WorkerProfileRow[] = Array.isArray(outer?.data)
                ? outer.data
                : Array.isArray(outer)
                    ? outer
                    : [];
            // Each row is a WorkerProfile ({ id: <worker profile id>, member: {...},
            // status }), not a flat member — unwrap .member so the roster gets the
            // actual firstname/lastname/email, and so the id used elsewhere (e.g.
            // the "Assign Lead" picker) is the member's id, which the backend's
            // assignLead endpoint expects, not the worker profile's own id.
            const workers: DepartmentWorker[] = rows.map((r) => ({
                id: r.member.id,
                firstname: r.member.firstname,
                lastname: r.member.lastname,
                email: r.member.email,
                phoneNumber: r.member.phoneNumber,
                role: r.member.role,
            }));
            const pagination = outer?.page !== undefined
                ? {
                    page: outer.page,
                    limit: outer.limit,
                    totalCount: outer.totalCount,
                    totalPages: outer.totalPages,
                }
                : null;
            return { workers, pagination };
        } catch {
            return { workers: [], pagination: null };
        }
    }, []);

    useEffect(() => {
        fetchDepartments();
        fetchDepartmentKeys();
    }, [fetchDepartments, fetchDepartmentKeys]);

    const clearError = useCallback(() => setError(null), []);
    return {
        departments,
        departmentKeys,
        pagination,
        isLoading,
        isSubmitting,
        error,

        clearError,
        fetchDepartments,
        fetchDepartmentKeys,
        createDepartment,
        updateDepartment,
        deleteDepartment,
        assignLead,
        removeLead,
        bulkAssignDepartment,
        fetchDepartmentLeads,
        fetchDepartmentWorkers,
    };
}