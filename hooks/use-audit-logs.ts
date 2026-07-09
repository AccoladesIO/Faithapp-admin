import { useState, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type AuditAction =
    | "ADMIN_CREATED" | "MEMBER_SIGNED_UP" | "MEMBER_LOGIN" | "MEMBER_LOGOUT" | "ADMIN_LOGIN"
    | "PASSWORD_CHANGED" | "PASSWORD_RESET_REQUESTED" | "PASSWORD_RESET_COMPLETED" | "ADMIN_PASSWORD_RESET"
    | "WORKER_PROMOTED" | "WORKER_REVOKED" | "MEMBER_ACTIVATED" | "MEMBER_DEACTIVATED" | "MEMBER_UPDATED"
    | "DEVICE_PURGED" | "DEVICE_RESET_REQUESTED" | "DEVICE_RESET_COMPLETED"
    | "ANNOUNCEMENT_CREATED" | "ANNOUNCEMENT_UPDATED" | "ANNOUNCEMENT_DELETED"
    | "EVENT_CREATED" | "EVENT_UPDATED" | "EVENT_DELETED"
    | "NOTE_CREATED" | "NOTE_UPDATED" | "NOTE_DELETED"
    | "LEAVE_APPROVED" | "LEAVE_REJECTED"
    | "DEPARTMENT_CREATED" | "DEPARTMENT_UPDATED" | "DEPARTMENT_DELETED"
    | "DEPARTMENT_LEAD_ASSIGNED" | "DEPARTMENT_LEAD_REMOVED" | "BULK_DEPARTMENT_ASSIGNED"
    | "WORKER_PROFILE_UPDATED" | "BULK_WORKER_PROMOTED"
    | "ADMIN_ROLE_CREATED" | "ADMIN_ROLE_UPDATED" | "ADMIN_ROLE_DELETED"
    | "ADMIN_USER_CREATED" | "ADMIN_USER_UPDATED" | "ADMIN_USER_DEACTIVATED"
    | "TITHE_ACCOUNT_CREATED" | "TITHE_ACCOUNT_UPDATED"
    | "TITHE_BATCH_QUEUED" | "TITHE_UNMATCHED_RESOLVED";

export interface AuditActor {
    id: string;
    firstname: string;
    lastname: string;
}

export interface AuditLog {
    id: string;
    action: AuditAction;
    actor: AuditActor | null;
    targetId: string | null;
    targetEmail: string | null;
    targetName: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

export interface AuditLogPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface AuditLogFilters {
    action?: AuditAction | "";
    actorId?: string;
    targetEmail?: string;
    dateFrom?: string;
    dateTo?: string;
}

export function useAuditLogs(defaultLimit = 20) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [pagination, setPagination] = useState<AuditLogPagination | null>(null);
    const [filters, setFilters] = useState<AuditLogFilters>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = useCallback(async (page = 1, activeFilters: AuditLogFilters = {}) => {
        setIsLoading(true);
        setError(null);
        try {
            const qs = new URLSearchParams({ page: String(page), limit: String(defaultLimit) });
            if (activeFilters.action) qs.set("action", activeFilters.action);
            if (activeFilters.actorId) qs.set("actorId", activeFilters.actorId);
            if (activeFilters.targetEmail) qs.set("targetEmail", activeFilters.targetEmail);
            if (activeFilters.dateFrom) qs.set("dateFrom", activeFilters.dateFrom);
            if (activeFilters.dateTo) qs.set("dateTo", activeFilters.dateTo);

            const res = await api.get(`/admin/audit-logs?${qs.toString()}`);
            const outer = res.data?.data;
            const list: AuditLog[] = Array.isArray(outer?.data) ? outer.data : [];
            setLogs(list);
            setPagination({
                page: outer?.page ?? page,
                limit: outer?.limit ?? defaultLimit,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch audit logs.");
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const applyFilters = useCallback((newFilters: AuditLogFilters) => {
        setFilters(newFilters);
        fetchLogs(1, newFilters);
    }, [fetchLogs]);

    const goToPage = useCallback((page: number) => {
        fetchLogs(page, filters);
    }, [fetchLogs, filters]);

    return {
        logs,
        pagination,
        filters,
        isLoading,
        error,
        fetchLogs,
        applyFilters,
        goToPage,
    };
}
