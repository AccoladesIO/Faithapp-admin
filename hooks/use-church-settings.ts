import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

export interface ChurchSetting {
    key: string;
    moduleName: string;
    enabled: boolean;
    required: boolean;
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
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                err?.message ||
                "Failed to load module settings."
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateSetting = useCallback(async (key: string, enabled: boolean): Promise<ChurchSetting> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/settings/${key}`, { enabled });
            const updated: ChurchSetting = res.data?.data ?? res.data;
            setSettings((prev) =>
                prev.map((s) => (s.key === key ? { ...s, ...updated } : s))
            );
            return updated;
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
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
