import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export interface GroupCreatedBy {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
}

export interface Group {
    id: string;
    name: string;
    description: string | null;
    memberCount: number;
    createdBy: GroupCreatedBy | null;
    createdAt: string;
    updatedAt: string;
}

export interface GroupMemberEntry {
    id: string;
    member: {
        id: string;
        firstname: string;
        lastname: string;
        email: string;
        role: string;
    } | null;
    phoneNumber: string | null;
    label: string | null;
    createdAt: string;
}

export interface GroupMembersPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface CreateGroupPayload {
    name: string;
    description?: string;
}

export type UpdateGroupPayload = Partial<CreateGroupPayload>;

export interface BulkGroupMembersResult {
    added?: number;
    removed?: number;
    skipped?: number;
}

export interface PhoneGroupEntry {
    phoneNumber: string;
    label?: string;
}

export function useGroups() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchGroups = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/groups");
            const list: Group[] = Array.isArray(res.data?.data) ? res.data.data : [];
            setGroups(list);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch groups.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createGroup = useCallback(async (payload: CreateGroupPayload): Promise<Group> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/groups", payload);
            const created: Group = { ...res.data.data, memberCount: 0 };
            setGroups((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            return created;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to create group.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateGroup = useCallback(async (groupId: string, payload: UpdateGroupPayload): Promise<Group> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/groups/${groupId}`, payload);
            const updated: Group = res.data.data;
            setGroups((prev) =>
                prev.map((g) => (g.id === groupId ? { ...g, ...updated, memberCount: g.memberCount } : g))
            );
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to update group.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteGroup = useCallback(async (groupId: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/groups/${groupId}`);
            setGroups((prev) => prev.filter((g) => g.id !== groupId));
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to delete group.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchGroupMembers = useCallback(async (
        groupId: string,
        page = 1,
        limit = 20
    ): Promise<{ members: GroupMemberEntry[]; pagination: GroupMembersPagination | null }> => {
        try {
            const res = await api.get(`/groups/${groupId}/members?page=${page}&limit=${limit}`);
            const outer = res.data?.data;
            const members: GroupMemberEntry[] = Array.isArray(outer?.data) ? outer.data : [];
            const pagination = outer?.page !== undefined
                ? { page: outer.page, limit: outer.limit, totalCount: outer.totalCount, totalPages: outer.totalPages }
                : null;
            return { members, pagination };
        } catch {
            return { members: [], pagination: null };
        }
    }, []);

    const addMember = useCallback(async (groupId: string, memberId: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.post(`/groups/${groupId}/members`, { memberId });
            setGroups((prev) =>
                prev.map((g) => (g.id === groupId ? { ...g, memberCount: g.memberCount + 1 } : g))
            );
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to add member.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const bulkAddMembers = useCallback(async (
        groupId: string,
        memberIds: string[]
    ): Promise<BulkGroupMembersResult> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/groups/${groupId}/members/bulk-add`, { memberIds });
            const result: BulkGroupMembersResult = res.data.data;
            setGroups((prev) =>
                prev.map((g) => (g.id === groupId ? { ...g, memberCount: g.memberCount + (result.added ?? 0) } : g))
            );
            return result;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to bulk add members.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const removeMember = useCallback(async (groupId: string, memberId: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/groups/${groupId}/members/${memberId}`);
            setGroups((prev) =>
                prev.map((g) => (g.id === groupId ? { ...g, memberCount: Math.max(0, g.memberCount - 1) } : g))
            );
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to remove member.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const bulkRemoveMembers = useCallback(async (
        groupId: string,
        memberIds: string[]
    ): Promise<BulkGroupMembersResult> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/groups/${groupId}/members/bulk-remove`, { memberIds });
            const result: BulkGroupMembersResult = res.data.data;
            setGroups((prev) =>
                prev.map((g) => (g.id === groupId ? { ...g, memberCount: Math.max(0, g.memberCount - (result.removed ?? 0)) } : g))
            );
            return result;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to bulk remove members.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const addPhoneEntries = useCallback(async (
        groupId: string,
        entries: PhoneGroupEntry[]
    ): Promise<BulkGroupMembersResult> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/groups/${groupId}/members/phone`, { entries });
            const result: BulkGroupMembersResult = res.data.data;
            setGroups((prev) =>
                prev.map((g) => (g.id === groupId ? { ...g, memberCount: g.memberCount + (result.added ?? 0) } : g))
            );
            return result;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to add phone numbers.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const addFirstTimersToGroup = useCallback(async (
        groupId: string,
        dateFrom: string,
        dateTo: string
    ): Promise<BulkGroupMembersResult> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/groups/${groupId}/members/first-timers`, { dateFrom, dateTo });
            const result: BulkGroupMembersResult = res.data.data;
            setGroups((prev) =>
                prev.map((g) => (g.id === groupId ? { ...g, memberCount: g.memberCount + (result.added ?? 0) } : g))
            );
            return result;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to import first-timers.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const removeEntry = useCallback(async (groupId: string, entryId: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/groups/${groupId}/entries/${entryId}`);
            setGroups((prev) =>
                prev.map((g) => (g.id === groupId ? { ...g, memberCount: Math.max(0, g.memberCount - 1) } : g))
            );
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to remove entry.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const bulkRemoveEntries = useCallback(async (
        groupId: string,
        entryIds: string[]
    ): Promise<BulkGroupMembersResult> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/groups/${groupId}/entries/bulk-remove`, { entryIds });
            const result: BulkGroupMembersResult = res.data.data;
            setGroups((prev) =>
                prev.map((g) => (g.id === groupId ? { ...g, memberCount: Math.max(0, g.memberCount - (result.removed ?? 0)) } : g))
            );
            return result;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to bulk remove entries.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    const clearError = useCallback(() => setError(null), []);

    return {
        groups,
        isLoading,
        isSubmitting,
        error,
        clearError,
        fetchGroups,
        createGroup,
        updateGroup,
        deleteGroup,
        fetchGroupMembers,
        addMember,
        bulkAddMembers,
        removeMember,
        bulkRemoveMembers,
        addPhoneEntries,
        addFirstTimersToGroup,
        removeEntry,
        bulkRemoveEntries,
    };
}

export interface GroupLookup {
    id: string;
    name: string;
}

// Minimal {id, name} list for pickers (e.g. the announcement GROUP audience
// selector). Hits /groups/lookup, gated on announcements:write rather than
// groups:read — picking a group here doesn't need group-management access.
export function useGroupLookup() {
    const [groups, setGroups] = useState<GroupLookup[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchGroups = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get("/groups/lookup");
            setGroups(Array.isArray(res.data?.data) ? res.data.data : []);
        } catch {
            setGroups([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    return { groups, isLoading };
}
