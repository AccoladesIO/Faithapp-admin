import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

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
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                err?.message ||
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
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
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
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
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
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
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
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
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
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
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
            const data = res.data?.data;
            return Array.isArray(data) ? data : [];
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
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
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
            const workers: DepartmentWorker[] = Array.isArray(outer?.data)
                ? outer.data
                : Array.isArray(outer)
                    ? outer
                    : [];
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

    return {
        departments,
        departmentKeys,
        pagination,
        isLoading,
        isSubmitting,
        error,
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