import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export interface ChurchSetting {
    key: string;
    moduleName: string;
    enabled: boolean;
    required: boolean;
    displayName?: string;
}

export function useChurchSettings() {
    const [settings, setSettings] = useState<ChurchSetting[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/admin/settings");
            const data: ChurchSetting[] = res.data?.data ?? res.data ?? [];
            setSettings(Array.isArray(data) ? data : []);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to load module settings."
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateSetting = useCallback(async (key: string, enabled: boolean, displayName?: string): Promise<ChurchSetting> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/settings/${key}`, { enabled, displayName });
            const updated: ChurchSetting = res.data?.data ?? res.data;
            setSettings((prev) =>
                prev.map((s) => (s.key === key ? { ...s, ...updated } : s))
            );
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message =
                e?.response?.data?.message ||
                e?.message ||
                "Failed to update module setting.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return {
        settings,
        isLoading,
        isSubmitting,
        error,
        updateSetting,
        refetch: fetchSettings,
    };
}
