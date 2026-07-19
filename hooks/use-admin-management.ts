import { useState, useCallback, useEffect } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type AdminPermission =
    | "members:read" | "members:write"
    | "events:read" | "events:write"
    | "venues:read" | "venues:write"
    | "departments:read" | "departments:write"
    | "attendance:read" | "attendance:write"
    | "leave:read" | "leave:write"
    | "classes:read" | "classes:write"
    | "announcements:read" | "announcements:write"
    | "groups:read" | "groups:write"
    | "sms:read" | "sms:send"
    | "notes:read" | "notes:write"
    | "dashboard:read"
    | "sunday_school:read" | "sunday_school:write"
    | "children_church:read" | "children_church:write"
    | "admin:read" | "admin:write"
    | "audit:read" | "email_logs:read"
    | "finance:read" | "finance:write" | "finance:approve" | "finance:reconcile" | "finance:report"
    | "tithe:read" | "tithe:write"
    | "follow_up:read" | "follow_up:write"
    | "service_programme:read" | "service_programme:write"
    | "headcount:read" | "headcount:write"
    | "incident_report:read" | "incident_report:write"
    | "asset_management:read" | "asset_management:write" | "asset_management:alert"
    | "prayer:read" | "prayer:write"
    | "facility_rental:read" | "facility_rental:write";

export interface PermissionGroupItem {
    value: AdminPermission;
    label: string;
}

export interface PermissionGroup {
    group: string;
    permissions: PermissionGroupItem[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
    { group: "Members", permissions: [
        { value: "members:read", label: "View Members" },
        { value: "members:write", label: "Manage Members" },
    ]},
    { group: "Events & Venues", permissions: [
        { value: "events:read", label: "View Events" },
        { value: "events:write", label: "Manage Events" },
        { value: "venues:read", label: "View Venues" },
        { value: "venues:write", label: "Manage Venues" },
    ]},
    { group: "Departments", permissions: [
        { value: "departments:read", label: "View Departments" },
        { value: "departments:write", label: "Manage Departments" },
    ]},
    { group: "Attendance", permissions: [
        { value: "attendance:read", label: "View Attendance" },
        { value: "attendance:write", label: "Manage Attendance" },
    ]},
    { group: "Service Programme", permissions: [
        { value: "service_programme:read", label: "View Service Programme" },
        { value: "service_programme:write", label: "Manage Service Programme" },
    ]},
    { group: "Service Headcount", permissions: [
        { value: "headcount:read", label: "View Headcount" },
        { value: "headcount:write", label: "Record Headcount" },
    ]},
    { group: "Sunday School", permissions: [
        { value: "sunday_school:read", label: "View Sunday School" },
        { value: "sunday_school:write", label: "Manage Sunday School" },
    ]},
    { group: "Children's Church", permissions: [
        { value: "children_church:read", label: "View Children's Church" },
        { value: "children_church:write", label: "Manage Children's Church" },
    ]},
    { group: "Church Classes", permissions: [
        { value: "classes:read", label: "View Classes" },
        { value: "classes:write", label: "Manage Classes" },
    ]},
    { group: "Leave Requests", permissions: [
        { value: "leave:read", label: "View Leave Requests" },
        { value: "leave:write", label: "Manage Leave Requests" },
    ]},
    { group: "Finance", permissions: [
        { value: "finance:read", label: "View Finance Records" },
        { value: "finance:write", label: "Manage Finance Records" },
        { value: "finance:approve", label: "Approve Transactions" },
        { value: "finance:reconcile", label: "Reconcile Bank Statements" },
        { value: "finance:report", label: "View Finance Reports" },
    ]},
    { group: "Tithe & Giving", permissions: [
        { value: "tithe:read", label: "View Tithe Records" },
        { value: "tithe:write", label: "Manage Tithe Records" },
    ]},
    { group: "Announcements", permissions: [
        { value: "announcements:read", label: "View Announcements" },
        { value: "announcements:write", label: "Manage Announcements" },
        { value: "groups:read", label: "View Groups" },
        { value: "groups:write", label: "Manage Groups" },
    ]},
    { group: "Notes & Follow-Up", permissions: [
        { value: "notes:read", label: "View Notes" },
        { value: "notes:write", label: "Manage Notes" },
        { value: "follow_up:read", label: "View Follow-Up" },
        { value: "follow_up:write", label: "Manage Follow-Up" },
    ]},
    { group: "Incident Reports", permissions: [
        { value: "incident_report:read", label: "View Incident Reports" },
        { value: "incident_report:write", label: "Manage Incident Reports" },
    ]},
    { group: "Asset Management", permissions: [
        { value: "asset_management:read", label: "View Assets" },
        { value: "asset_management:write", label: "Manage Assets" },
        { value: "asset_management:alert", label: "Receive Maintenance Reminders" },
    ]},
    { group: "Prayer Roster", permissions: [
        { value: "prayer:read", label: "View Prayer Roster" },
        { value: "prayer:write", label: "Manage Prayer Roster" },
    ]},
    { group: "Facility Rental", permissions: [
        { value: "facility_rental:read", label: "View Facility Bookings" },
        { value: "facility_rental:write", label: "Manage Facility Rentals" },
    ]},
    { group: "SMS Messaging", permissions: [
        { value: "sms:read", label: "View SMS Logs" },
        { value: "sms:send", label: "Send SMS Broadcasts" },
    ]},
    { group: "Administration", permissions: [
        { value: "dashboard:read", label: "View Dashboard" },
        { value: "admin:read", label: "View Admin Users & Roles" },
        { value: "admin:write", label: "Manage Admin Users & Roles" },
        { value: "audit:read", label: "View Audit Logs" },
        { value: "email_logs:read", label: "View Email Logs" },
    ]},
];

export interface AdminRole {
    id: string;
    name: string;
    description: string | null;
    permissions: AdminPermission[];
    createdAt: string;
    updatedAt: string;
}

export interface AdminMember {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
}

export interface AdminUser {
    id: string;
    isActive: boolean;
    member: AdminMember;
    adminRole: AdminRole;
    createdAt: string;
    updatedAt: string;
}

export interface CreateRolePayload {
    name: string;
    description?: string;
    permissions: AdminPermission[];
}

export interface UpdateRolePayload {
    name?: string;
    description?: string;
    permissions?: AdminPermission[];
}

export interface GrantAdminPayload {
    memberId: string;
    adminRoleId: string;
}

export interface UpdateAdminPayload {
    adminRoleId?: string;
    isActive?: boolean;
}

export function useAdminRoles() {
    const [roles, setRoles] = useState<AdminRole[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRoles = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/admin/roles");
            setRoles(res.data?.data ?? []);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to load roles.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createRole = useCallback(async (payload: CreateRolePayload): Promise<AdminRole> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/admin/roles", payload);
            const created: AdminRole = res.data?.data;
            setRoles((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            return created;
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to create role.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateRole = useCallback(async (id: string, payload: UpdateRolePayload): Promise<AdminRole> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/roles/${id}`, payload);
            const updated: AdminRole = res.data?.data;
            setRoles((prev) => prev.map((r) => (r.id === id ? updated : r)));
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to update role.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteRole = useCallback(async (id: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/admin/roles/${id}`);
            setRoles((prev) => prev.filter((r) => r.id !== id));
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to delete role.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    useEffect(() => { fetchRoles(); }, [fetchRoles]);

    const clearError = useCallback(() => setError(null), []);
    return { roles, isLoading, isSubmitting, error, clearError, fetchRoles, createRole, updateRole, deleteRole };
}

export function useAdminUsers() {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAdmins = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/admin/users");
            setAdmins(res.data?.data ?? []);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to load admins.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const grantAdmin = useCallback(async (payload: GrantAdminPayload): Promise<AdminUser> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/admin/users", payload);
            const created: AdminUser = res.data?.data;
            fetchAdmins();
            return created;
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to grant admin access.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, [fetchAdmins]);

    const updateAdmin = useCallback(async (id: string, payload: UpdateAdminPayload): Promise<AdminUser> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/users/${id}`, payload);
            const updated: AdminUser = res.data?.data;
            fetchAdmins();
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to update admin.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, [fetchAdmins]);

    const revokeAdmin = useCallback(async (id: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.post(`/admin/users/${id}/revoke`);
            fetchAdmins();
        } catch (err: unknown) {
            const e = err as ApiError;
            const msg = e?.response?.data?.message || e?.message || "Failed to revoke admin access.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, [fetchAdmins]);

    useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

    const clearError = useCallback(() => setError(null), []);
    return { admins, isLoading, isSubmitting, error, clearError, fetchAdmins, grantAdmin, updateAdmin, revokeAdmin };
}
