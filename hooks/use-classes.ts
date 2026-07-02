import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

export type ClassType = "BELIEVERS" | "BAPTISMAL" | "WORKERS_IN_TRAINING" | "BIBLE_COLLEGE" | "SCHOOL_OF_DISCIPLESHIP";
export type ClassStatus = "ACTIVE" | "CLOSED";
export type EnrollmentStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface ClassFacilitator {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber: string | null;
}

export interface ChurchClass {
    id: string;
    name: string;
    type: ClassType;
    status: ClassStatus;
    description: string;
    startDate: string;
    endDate: string;
    facilitator: ClassFacilitator | null;
    createdAt: string;
    updatedAt: string;
}

export interface ClassPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface CreateClassPayload {
    name: string;
    type: ClassType;
    description: string;
    facilitatorId: string;
    startDate: string;
    endDate: string;
}

export type UpdateClassPayload = Partial<Omit<CreateClassPayload, "type">>;

export interface Enrollment {
    id: string;
    status: EnrollmentStatus;
    enrolledAt: string;
    completedAt: string | null;
    cancelledAt: string | null;
    member: ClassFacilitator;
}

export interface EnrollPayload {
    memberId: string;
    classId: string;
}

export function useClasses(initialType: ClassType | "" = "", defaultLimit = 10) {
    const [classes, setClasses] = useState<ChurchClass[]>([]);
    const [pagination, setPagination] = useState<ClassPagination | null>(null);
    const [page, setPage] = useState(1);
    const [typeFilter, setTypeFilter] = useState<ClassType | "">(initialType);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchClasses = useCallback(async (
        targetPage = 1,
        type: ClassType | "" = typeFilter
    ) => {
        setIsLoading(true);
        setClasses([]);
        setError(null);
        try {
            const typeParam = type ? `&type=${type}` : "";
            const res = await api.get(
                `/classes?page=${targetPage}&limit=${defaultLimit}${typeParam}`
            );
            const outer = res.data?.data;
            const list: ChurchClass[] = Array.isArray(outer?.data) ? outer.data : [];
            setClasses(list);
            setPage(targetPage);
            setTypeFilter(type);
            setPagination({
                page: outer?.page ?? targetPage,
                limit: outer?.limit ?? defaultLimit,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                err?.message ||
                "Failed to fetch classes."
            );
        } finally {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultLimit]);

    const goToPage = useCallback((targetPage: number) => {
        fetchClasses(targetPage, typeFilter);
    }, [fetchClasses, typeFilter]);

    const applyTypeFilter = useCallback((type: ClassType | "") => {
        fetchClasses(1, type);
    }, [fetchClasses]);

    const createClass = useCallback(async (
        payload: CreateClassPayload
    ): Promise<ChurchClass> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/classes", payload);
            const created: ChurchClass = res.data?.data;
            setClasses((prev) => [created, ...prev]);
            return created;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to create class.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateClass = useCallback(async (
        classId: string,
        payload: UpdateClassPayload
    ): Promise<ChurchClass> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/classes/${classId}`, payload);
            const updated: ChurchClass = res.data?.data;
            setClasses((prev) =>
                prev.map((c) => (c.id === classId ? updated : c))
            );
            return updated;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to update class.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteClass = useCallback(async (classId: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/classes/${classId}`);
            setClasses((prev) => prev.filter((c) => c.id !== classId));
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to delete class.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const enrollMember = useCallback(async (
        payload: EnrollPayload
    ): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.post("/classes/enroll", payload);
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to enroll member.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchEnrollments = useCallback(async (
        classId: string,
        enrollPage = 1,
        limit = 10
    ): Promise<{ enrollments: Enrollment[]; pagination: ClassPagination | null }> => {
        try {
            const res = await api.get(
                `/classes/${classId}/enrollments?page=${enrollPage}&limit=${limit}`
            );
            const outer = res.data?.data;
            const list: Enrollment[] = Array.isArray(outer?.data) ? outer.data : [];
            const p = outer?.page === undefined
                ? null
                : {
                    page: outer.page,
                    limit: outer.limit,
                    totalCount: outer.totalCount,
                    totalPages: outer.totalPages,
                };
            return { enrollments: list, pagination: p };
        } catch {
            return { enrollments: [], pagination: null };
        }
    }, []);

    const updateEnrollmentStatus = useCallback(async (
        enrollmentId: string,
        status: EnrollmentStatus
    ): Promise<Enrollment> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(
                `/classes/enrollments/${enrollmentId}/status`,
                { status }
            );
            return res.data?.data;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to update enrollment status.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const bulkEnroll = useCallback(async (
        classId: string,
        memberIds: string[]
    ): Promise<{ enrolled: number; skipped: number }> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post('/classes/bulk-enroll', { classId, memberIds });
            return res.data?.data;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                'Failed to bulk enrol members.';
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const closeClass = useCallback(async (
        classId: string
    ): Promise<{ closedEnrollments: number }> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/classes/${classId}/close`);
            setClasses((prev) =>
                prev.map((c) => c.id === classId ? { ...c, status: "CLOSED" as const } : c)
            );
            return res.data?.data;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to close class.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    useEffect(() => {
        fetchClasses(1, initialType);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        classes,
        pagination,
        page,
        typeFilter,
        isLoading,
        isSubmitting,
        error,
        goToPage,
        applyTypeFilter,
        refetch: () => fetchClasses(page, typeFilter),
        createClass,
        updateClass,
        deleteClass,
        enrollMember,
        bulkEnroll,
        fetchEnrollments,
        updateEnrollmentStatus,
        closeClass,
    };
}