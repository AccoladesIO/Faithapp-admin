import { useState, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

export type GuardianRelationshipEnum =
    | "FATHER"
    | "MOTHER"
    | "GRANDPARENT"
    | "SIBLING"
    | "UNCLE"
    | "AUNT"
    | "FAMILY_FRIEND"
    | "OTHER";

export type ChildCheckInStatusEnum = "CHECKED_IN" | "CHECKED_OUT" | "FLAGGED";

export interface ChildAgeGroup {
    id: string;
    name: string;
    minAgeMonths: number;
    maxAgeMonths: number;
    displayOrder: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface ChildClassGroup {
    id: string;
    name: string;
    capacity: number | null;
    teacherNote: string | null;
    ageGroup: ChildAgeGroup | null;
    createdAt: string;
    updatedAt: string;
}

export interface ChildProfile {
    id: string;
    firstname: string;
    lastname: string;
    dateOfBirth: string;
    specialNotes: string | null;
    classGroup: ChildClassGroup | null;
    createdAt: string;
    updatedAt: string;
}

export interface ChildGuardian {
    id: string;
    fullName: string;
    phoneNumber: string | null;
    relationship: GuardianRelationshipEnum;
    isAuthorizedPickup: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ChildCheckIn {
    id: string;
    pickupCode: string;
    status: ChildCheckInStatusEnum;
    flagReason: string | null;
    droppedOffByName: string | null;
    pickedUpByName: string | null;
    checkinTime: string;
    checkoutTime: string | null;
    child: ChildProfile;
    serviceSlot: { id: string; name: string } | null;
    createdAt: string;
    updatedAt: string;
}

export interface CheckInHistoryPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface ChildPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface CreateAgeGroupDto {
    name: string;
    minAgeMonths: number;
    maxAgeMonths: number;
    displayOrder?: number;
}

export interface UpdateAgeGroupDto extends Partial<CreateAgeGroupDto> {}

export interface CreateClassGroupDto {
    ageGroupId: string;
    name: string;
    capacity?: number;
    teacherNote?: string;
}

export interface UpdateClassGroupDto extends Partial<CreateClassGroupDto> {}

export interface CreateChildDto {
    firstname: string;
    lastname: string;
    dateOfBirth: string;
    specialNotes?: string;
    registeredByMemberId?: string;
}

export interface UpdateChildDto extends Partial<CreateChildDto> {}

export interface CreateGuardianDto {
    fullName: string;
    phoneNumber?: string;
    relationship: GuardianRelationshipEnum;
    isAuthorizedPickup?: boolean;
}

export interface CheckInDto {
    childId: string;
    droppedOffByName?: string;
}

export interface CheckOutDto {
    pickupCode: string;
    pickedUpByName?: string;
}

export function useChildrenChurch(defaultLimit = 10) {
    const [ageGroups, setAgeGroups] = useState<ChildAgeGroup[]>([]);
    const [classGroups, setClassGroups] = useState<ChildClassGroup[]>([]);
    const [children, setChildren] = useState<ChildProfile[]>([]);
    const [childPagination, setChildPagination] = useState<ChildPagination | null>(null);
    const [childPage, setChildPage] = useState(1);
    const [activeCheckIns, setActiveCheckIns] = useState<ChildCheckIn[]>([]);
    const [checkInHistory, setCheckInHistory] = useState<ChildCheckIn[]>([]);
    const [checkInHistoryPagination, setCheckInHistoryPagination] = useState<CheckInHistoryPagination | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const extractError = (err: any, fallback: string): string =>
        err?.response?.data?.message || err?.message || fallback;

    const recomputeAgeGroups = useCallback(async (): Promise<{ updated: number }> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/children-church/age-groups/recompute");
            return res.data?.data as { updated: number };
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || "Failed to recompute age groups.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchAgeGroups = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/children-church/age-groups");
            setAgeGroups(Array.isArray(res.data?.data) ? res.data.data : []);
        } catch (err: any) {
            setError(extractError(err, "Failed to fetch age groups."));
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createAgeGroup = useCallback(async (dto: CreateAgeGroupDto): Promise<ChildAgeGroup> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/children-church/age-groups", dto);
            const created: ChildAgeGroup = res.data?.data;
            setAgeGroups((prev) => [...prev, created]);
            return created;
        } catch (err: any) {
            const msg = extractError(err, "Failed to create age group.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateAgeGroup = useCallback(async (id: string, dto: UpdateAgeGroupDto): Promise<ChildAgeGroup> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/children-church/age-groups/${id}`, dto);
            const updated: ChildAgeGroup = res.data?.data;
            setAgeGroups((prev) => prev.map((a) => (a.id === id ? updated : a)));
            return updated;
        } catch (err: any) {
            const msg = extractError(err, "Failed to update age group.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteAgeGroup = useCallback(async (id: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/children-church/age-groups/${id}`);
            setAgeGroups((prev) => prev.filter((a) => a.id !== id));
        } catch (err: any) {
            const msg = extractError(err, "Failed to delete age group.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchClassGroups = useCallback(async (ageGroupId?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const qs = ageGroupId ? `?ageGroupId=${ageGroupId}` : "";
            const res = await api.get(`/children-church/class-groups${qs}`);
            setClassGroups(Array.isArray(res.data?.data) ? res.data.data : []);
        } catch (err: any) {
            setError(extractError(err, "Failed to fetch class groups."));
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createClassGroup = useCallback(async (dto: CreateClassGroupDto): Promise<ChildClassGroup> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/children-church/class-groups", dto);
            const created: ChildClassGroup = res.data?.data;
            setClassGroups((prev) => [...prev, created]);
            return created;
        } catch (err: any) {
            const msg = extractError(err, "Failed to create class group.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateClassGroup = useCallback(async (id: string, dto: UpdateClassGroupDto): Promise<ChildClassGroup> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/children-church/class-groups/${id}`, dto);
            const updated: ChildClassGroup = res.data?.data;
            setClassGroups((prev) => prev.map((g) => (g.id === id ? updated : g)));
            return updated;
        } catch (err: any) {
            const msg = extractError(err, "Failed to update class group.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteClassGroup = useCallback(async (id: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/children-church/class-groups/${id}`);
            setClassGroups((prev) => prev.filter((g) => g.id !== id));
        } catch (err: any) {
            const msg = extractError(err, "Failed to delete class group.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchChildren = useCallback(async (params?: {
        name?: string;
        classGroupId?: string;
        page?: number;
        limit?: number;
    }) => {
        setIsLoading(true);
        setError(null);
        try {
            const p = params?.page ?? 1;
            const l = params?.limit ?? defaultLimit;
            const qs = new URLSearchParams({ page: String(p), limit: String(l) });
            if (params?.name) qs.set("name", params.name);
            if (params?.classGroupId) qs.set("classGroupId", params.classGroupId);
            const res = await api.get(`/children-church/children?${qs.toString()}`);
            const outer = res.data?.data;
            const list: ChildProfile[] = Array.isArray(outer?.data) ? outer.data : [];
            setChildren(list);
            setChildPage(p);
            setChildPagination({
                page: outer?.page ?? p,
                limit: outer?.limit ?? l,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: any) {
            setError(extractError(err, "Failed to fetch children."));
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const createChild = useCallback(async (dto: CreateChildDto): Promise<ChildProfile> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/children-church/children", dto);
            const created: ChildProfile = res.data?.data;
            setChildren((prev) => [created, ...prev]);
            return created;
        } catch (err: any) {
            const msg = extractError(err, "Failed to create child profile.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateChild = useCallback(async (id: string, dto: UpdateChildDto): Promise<ChildProfile> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/children-church/children/${id}`, dto);
            const updated: ChildProfile = res.data?.data;
            setChildren((prev) => prev.map((c) => (c.id === id ? updated : c)));
            return updated;
        } catch (err: any) {
            const msg = extractError(err, "Failed to update child profile.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchGuardians = useCallback(async (childId: string): Promise<ChildGuardian[]> => {
        try {
            const res = await api.get(`/children-church/children/${childId}/guardians`);
            return Array.isArray(res.data?.data) ? res.data.data : [];
        } catch {
            return [];
        }
    }, []);

    const createGuardian = useCallback(async (childId: string, dto: CreateGuardianDto): Promise<ChildGuardian> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/children-church/children/${childId}/guardians`, dto);
            return res.data?.data;
        } catch (err: any) {
            const msg = extractError(err, "Failed to add guardian.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteGuardian = useCallback(async (id: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/children-church/guardians/${id}`);
        } catch (err: any) {
            const msg = extractError(err, "Failed to delete guardian.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchActiveCheckIns = useCallback(async (classGroupId?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const qs = classGroupId ? `?classGroupId=${classGroupId}` : "";
            const res = await api.get(`/children-church/checkin/active${qs}`);
            setActiveCheckIns(Array.isArray(res.data?.data) ? res.data.data : []);
        } catch (err: any) {
            setError(extractError(err, "Failed to fetch active check-ins."));
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchActiveCheckInsAdmin = useCallback(async (classGroupId?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const qs = classGroupId ? `?classGroupId=${classGroupId}` : "";
            const res = await api.get(`/children-church/admin/checkin/active${qs}`);
            setActiveCheckIns(Array.isArray(res.data?.data) ? res.data.data : []);
        } catch (err: any) {
            setError(extractError(err, "Failed to fetch active check-ins."));
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchCheckInHistory = useCallback(async (params?: {
        page?: number;
        limit?: number;
        classGroupId?: string;
        status?: ChildCheckInStatusEnum;
        slotId?: string;
    }) => {
        setIsLoading(true);
        setError(null);
        try {
            const p = params?.page ?? 1;
            const l = params?.limit ?? defaultLimit;
            const qs = new URLSearchParams({ page: String(p), limit: String(l) });
            if (params?.classGroupId) qs.set("classGroupId", params.classGroupId);
            if (params?.status) qs.set("status", params.status);
            if (params?.slotId) qs.set("slotId", params.slotId);
            const res = await api.get(`/children-church/admin/checkin/history?${qs.toString()}`);
            const outer = res.data?.data;
            const list: ChildCheckIn[] = Array.isArray(outer?.data) ? outer.data : [];
            setCheckInHistory(list);
            setCheckInHistoryPagination({
                page: outer?.page ?? p,
                limit: outer?.limit ?? l,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: any) {
            setError(extractError(err, "Failed to fetch check-in history."));
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const checkIn = useCallback(async (dto: CheckInDto): Promise<ChildCheckIn> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/children-church/checkin", dto);
            const created: ChildCheckIn = res.data?.data;
            setActiveCheckIns((prev) => [created, ...prev]);
            return created;
        } catch (err: any) {
            const msg = extractError(err, "Failed to check in child.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const checkOut = useCallback(async (dto: CheckOutDto): Promise<ChildCheckIn> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/children-church/checkout", dto);
            const updated: ChildCheckIn = res.data?.data;
            setActiveCheckIns((prev) => prev.filter((c) => c.pickupCode !== dto.pickupCode));
            return updated;
        } catch (err: any) {
            const msg = extractError(err, "Failed to check out child.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const verifyCode = useCallback(async (code: string): Promise<ChildCheckIn> => {
        const res = await api.get(`/children-church/checkin/verify/${code}`);
        return res.data?.data;
    }, []);

    const flagCheckIn = useCallback(async (id: string, reason: string): Promise<ChildCheckIn> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/children-church/checkin/${id}/flag`, { reason });
            const updated: ChildCheckIn = res.data?.data;
            setActiveCheckIns((prev) => prev.map((c) => (c.id === id ? updated : c)));
            return updated;
        } catch (err: any) {
            const msg = extractError(err, "Failed to flag check-in.");
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const goToChildPage = useCallback((page: number) => {
        fetchChildren({ page });
    }, [fetchChildren]);

    const refetch = useCallback(() => {
        fetchChildren({ page: childPage });
    }, [fetchChildren, childPage]);

    return {
        ageGroups,
        classGroups,
        children,
        childPagination,
        childPage,
        activeCheckIns,
        checkInHistory,
        checkInHistoryPagination,
        isLoading,
        isSubmitting,
        error,
        recomputeAgeGroups,
        fetchAgeGroups,
        createAgeGroup,
        updateAgeGroup,
        deleteAgeGroup,
        fetchClassGroups,
        createClassGroup,
        updateClassGroup,
        deleteClassGroup,
        fetchChildren,
        createChild,
        updateChild,
        fetchGuardians,
        createGuardian,
        deleteGuardian,
        fetchActiveCheckIns,
        fetchActiveCheckInsAdmin,
        fetchCheckInHistory,
        checkIn,
        checkOut,
        verifyCode,
        flagCheckIn,
        goToChildPage,
        refetch,
    };
}
