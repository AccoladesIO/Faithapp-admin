import { useState, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

export interface BirthdayMember {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber: string | null;
    dateOfBirth: string;
    birthMonth?: number | null;
    birthDay?: number | null;
    profilePhoto?: string | null;
}

export interface BirthdayWish {
    id: string;
    message: string;
    sender: {
        firstname: string;
        lastname: string;
    };
    year: number;
}

export function useBirthday() {
    const [todayBirthdays, setTodayBirthdays] = useState<BirthdayMember[]>([]);
    const [upcomingBirthdays, setUpcomingBirthdays] = useState<BirthdayMember[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchTodayBirthdays = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get("/birthday/today");
            const list: BirthdayMember[] = Array.isArray(res.data?.data)
                ? res.data.data
                : [];
            setTodayBirthdays(list);
        } catch {
            setTodayBirthdays([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const sendWish = useCallback(async (
        recipientId: string,
        message: string
    ): Promise<BirthdayWish> => {
        setIsSubmitting(true);
        try {
            const res = await api.post(`/birthday/wishes/${recipientId}`, { message });
            return res.data?.data as BirthdayWish;
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchUpcomingBirthdays = useCallback(async (days?: number) => {
        setIsLoadingUpcoming(true);
        try {
            const query = days && days !== 7 ? `?days=${days}` : "";
            const res = await api.get(`/birthday/upcoming${query}`);
            const list: BirthdayMember[] = Array.isArray(res.data?.data)
                ? res.data.data
                : [];
            setUpcomingBirthdays(list);
        } catch {
            setUpcomingBirthdays([]);
        } finally {
            setIsLoadingUpcoming(false);
        }
    }, []);

    const fetchWishes = useCallback(async (
        memberId: string,
        year?: number
    ): Promise<BirthdayWish[]> => {
        try {
            const query = year ? `?year=${year}` : "";
            const res = await api.get(`/birthday/wishes/${memberId}${query}`);
            return Array.isArray(res.data?.data) ? res.data.data : [];
        } catch {
            return [];
        }
    }, []);

    return {
        todayBirthdays,
        upcomingBirthdays,
        isLoading,
        isLoadingUpcoming,
        isSubmitting,
        fetchTodayBirthdays,
        fetchUpcomingBirthdays,
        sendWish,
        fetchWishes,
    };
}
