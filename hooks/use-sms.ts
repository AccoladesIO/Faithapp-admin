import { useCallback, useState } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export interface SmsBalance {
    balance: number;
    currency: string;
}

export interface SegmentCount {
    segments: number;
    encoding: "plain" | "unicode";
    characterCount: number;
}

export function useSmsBalance() {
    const [balance, setBalance] = useState<SmsBalance | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBalance = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/admin/sms/balance");
            setBalance(res.data?.data ?? null);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to load SMS balance.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { balance, isLoading, error, fetchBalance };
}

let segmentCountDebounce: ReturnType<typeof setTimeout> | null = null;

export function getSegmentCount(message: string): Promise<SegmentCount> {
    return new Promise((resolve, reject) => {
        if (segmentCountDebounce) clearTimeout(segmentCountDebounce);
        segmentCountDebounce = setTimeout(async () => {
            try {
                const res = await api.post("/admin/sms/segment-count", { message });
                resolve(res.data?.data as SegmentCount);
            } catch (err) {
                reject(err);
            }
        }, 300);
    });
}
