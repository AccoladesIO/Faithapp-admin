"use client";

import { useState, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

interface AdminRole {
    id: string;
    name: string;
    description: string | null;
    permissions: string[];
}

interface AdminMember {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber: string | null;
    role: string;
    status: string;
    gender: string | null;
    birthDay: number | null;
    birthMonth: number | null;
    birthYear: number | null;
    maritalStatus: string | null;
    yearBornAgain: string | null;
    yearBaptized: string | null;
    baptizedWithHolyGhost: boolean;
    dateJoinedChurch: string | null;
    changedPassword: boolean;
}

export interface AdminProfileFull {
    id: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    member: AdminMember;
    adminRole: AdminRole;
}

export function useAdminProfile() {
    const [profile, setProfile] = useState<AdminProfileFull | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const msg = (e: unknown, fallback: string) => {
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        return err?.response?.data?.message ?? err?.message ?? fallback;
    };

    const fetchProfile = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/admin/users/me");
            setProfile(res.data?.data ?? res.data);
        } catch (e) {
            setError(msg(e, "Failed to load profile."));
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { profile, isLoading, error, fetchProfile };
}
