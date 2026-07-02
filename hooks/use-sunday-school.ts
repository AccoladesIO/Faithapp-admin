import { useState, useCallback, useRef } from "react";
import { api } from "@/utils/auth/axios-client";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "EXCUSED";

export interface SSPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface SSTeacher {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
}

export interface SSClass {
    id: string;
    name: string;
    description: string | null;
    teacher: SSTeacher | null;
    membersCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface SSSession {
    id: string;
    classId: string;
    sessionDate: string;
    notes: string | null;
    status: "OPEN" | "CLOSED";
    createdAt: string;
    updatedAt: string;
}

export interface SSMember {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber: string | null;
}

export interface SSAttendance {
    id: string;
    memberId: string;
    member: SSMember;
    status: AttendanceStatus;
}

function extractPagination(outer: any, targetPage: number, defaultLimit: number): SSPagination {
    return {
        page: outer?.page ?? targetPage,
        limit: outer?.limit ?? defaultLimit,
        totalCount: outer?.totalCount ?? 0,
        totalPages: outer?.totalPages ?? 1,
    };
}

function extractError(err: any, fallback: string): string {
    return err?.response?.data?.message || err?.message || fallback;
}

export function useSundaySchool(defaultLimit = 10) {
    const [classes, setClasses] = useState<SSClass[]>([]);
    const [classPagination, setClassPagination] = useState<SSPagination | null>(null);
    const [classPage, setClassPage] = useState(1);

    const [sessions, setSessions] = useState<SSSession[]>([]);
    const [sessionPagination, setSessionPagination] = useState<SSPagination | null>(null);
    const [sessionPage, setSessionPage] = useState(1);
    const activeClassIdRef = useRef<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Classes ───────────────────────────────────────────────────────────────

    const fetchClasses = useCallback(async (page = 1) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/admin/sunday-school/classes?page=${page}&limit=${defaultLimit}`);
            const outer = res.data?.data;
            const list: SSClass[] = Array.isArray(outer?.data) ? outer.data : [];
            setClasses(list);
            setClassPage(page);
            setClassPagination(extractPagination(outer, page, defaultLimit));
        } catch (err: any) {
            setError(extractError(err, "Failed to fetch classes."));
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const createClass = useCallback(async (dto: {
        name: string;
        description?: string;
        teacherId?: string;
    }): Promise<SSClass> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/admin/sunday-school/classes", dto);
            const created: SSClass = res.data?.data;
            setClasses((prev) => [created, ...prev]);
            return created;
        } catch (err: any) {
            const message = extractError(err, "Failed to create class.");
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateClass = useCallback(async (
        id: string,
        dto: Partial<{ name: string; description: string; teacherId: string }>
    ): Promise<SSClass> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/sunday-school/classes/${id}`, dto);
            const updated: SSClass = res.data?.data;
            setClasses((prev) => prev.map((c) => (c.id === id ? updated : c)));
            return updated;
        } catch (err: any) {
            const message = extractError(err, "Failed to update class.");
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteClass = useCallback(async (id: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/admin/sunday-school/classes/${id}`);
            setClasses((prev) => prev.filter((c) => c.id !== id));
        } catch (err: any) {
            const message = extractError(err, "Failed to delete class.");
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const goToClassPage = useCallback((page: number) => {
        fetchClasses(page);
    }, [fetchClasses]);

    // ── Class Members ─────────────────────────────────────────────────────────

    const fetchClassMembers = useCallback(async (
        classId: string,
        page = 1
    ): Promise<{ members: SSMember[]; pagination: SSPagination | null }> => {
        try {
            const res = await api.get(
                `/admin/sunday-school/classes/${classId}/members?page=${page}&limit=${defaultLimit}`
            );
            const outer = res.data?.data;
            const members: SSMember[] = Array.isArray(outer?.data) ? outer.data : [];
            const pagination = outer?.page !== undefined
                ? extractPagination(outer, page, defaultLimit)
                : null;
            return { members, pagination };
        } catch {
            return { members: [], pagination: null };
        }
    }, [defaultLimit]);

    const addMemberToClass = useCallback(async (
        classId: string,
        memberId: string
    ): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.post(`/admin/sunday-school/classes/${classId}/members`, { memberId });
        } catch (err: any) {
            const message = extractError(err, "Failed to add member.");
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const removeMemberFromClass = useCallback(async (
        classId: string,
        memberId: string
    ): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/admin/sunday-school/classes/${classId}/members/${memberId}`);
        } catch (err: any) {
            const message = extractError(err, "Failed to remove member.");
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    // ── Sessions ──────────────────────────────────────────────────────────────

    const fetchSessions = useCallback(async (classId: string, page = 1) => {
        activeClassIdRef.current = classId;
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(
                `/admin/sunday-school/sessions?classId=${classId}&page=${page}&limit=${defaultLimit}`
            );
            const outer = res.data?.data;
            const list: SSSession[] = Array.isArray(outer?.data) ? outer.data : [];
            setSessions(list);
            setSessionPage(page);
            setSessionPagination(extractPagination(outer, page, defaultLimit));
        } catch (err: any) {
            setError(extractError(err, "Failed to fetch sessions."));
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const createSession = useCallback(async (dto: {
        classId: string;
        sessionDate: string;
        notes?: string;
    }): Promise<SSSession> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/admin/sunday-school/sessions", dto);
            const created: SSSession = res.data?.data;
            setSessions((prev) => [created, ...prev]);
            return created;
        } catch (err: any) {
            const message = extractError(err, "Failed to create session.");
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const deleteSession = useCallback(async (id: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.delete(`/admin/sunday-school/sessions/${id}`);
            setSessions((prev) => prev.filter((s) => s.id !== id));
        } catch (err: any) {
            const message = extractError(err, "Failed to delete session.");
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const openSession = useCallback(async (
        id: string,
        closesInMinutes: number
    ): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.patch(`/admin/sunday-school/sessions/${id}/open`, { closesInMinutes });
            setSessions((prev) =>
                prev.map((s) => (s.id === id ? { ...s, status: "OPEN" as const } : s))
            );
        } catch (err: any) {
            const message = extractError(err, "Failed to open session.");
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const closeSession = useCallback(async (id: string): Promise<void> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await api.patch(`/admin/sunday-school/sessions/${id}/close`);
            setSessions((prev) =>
                prev.map((s) => (s.id === id ? { ...s, status: "CLOSED" as const } : s))
            );
        } catch (err: any) {
            const message = extractError(err, "Failed to close session.");
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchRoster = useCallback(async (sessionId: string): Promise<SSAttendance[]> => {
        try {
            const res = await api.get(`/admin/sunday-school/sessions/${sessionId}/roster`);
            const data = res.data?.data;
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }, []);

    const bulkMarkAttendance = useCallback(async (
        sessionId: string,
        attendances: { memberId: string; status: AttendanceStatus }[]
    ): Promise<{ marked: number }> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/admin/sunday-school/sessions/${sessionId}/bulk-mark`, { attendances });
            return res.data?.data ?? { marked: 0 };
        } catch (err: any) {
            const message = extractError(err, "Failed to mark attendance.");
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const goToSessionPage = useCallback((page: number) => {
        if (activeClassIdRef.current) {
            fetchSessions(activeClassIdRef.current, page);
        }
    }, [fetchSessions]);

    return {
        classes,
        classPagination,
        classPage,
        sessions,
        sessionPagination,
        sessionPage,
        isLoading,
        isSubmitting,
        error,
        fetchClasses,
        createClass,
        updateClass,
        deleteClass,
        goToClassPage,
        fetchClassMembers,
        addMemberToClass,
        removeMemberFromClass,
        fetchSessions,
        createSession,
        deleteSession,
        openSession,
        closeSession,
        fetchRoster,
        bulkMarkAttendance,
        goToSessionPage,
    };
}
