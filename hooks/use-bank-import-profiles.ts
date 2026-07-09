import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type AmountConvention = "SIGNED" | "SEPARATE_COLUMNS" | "AMOUNT_WITH_TYPE";

export interface BankImportProfile {
    id: string;
    name: string;
    isDefault: boolean;
    delimiter: string;
    skipHeaderRows: number;
    dateColumnIndex: number;
    dateFormat: string;
    dateColumnName: string | null;
    narrationColumnIndex: number;
    narrationColumnName: string | null;
    amountConvention: AmountConvention;
    amountColumnIndex: number | null;
    amountColumnName: string | null;
    typeColumnIndex: number | null;
    typeColumnName: string | null;
    debitIndicator: string | null;
    creditIndicator: string | null;
    debitColumnIndex: number | null;
    debitColumnName: string | null;
    creditColumnIndex: number | null;
    creditColumnName: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateProfilePayload {
    name: string;
    isDefault?: boolean;
    delimiter: string;
    skipHeaderRows: number;
    dateColumnIndex: number;
    dateFormat: string;
    dateColumnName?: string;
    narrationColumnIndex: number;
    narrationColumnName?: string;
    amountConvention: AmountConvention;
    amountColumnIndex?: number;
    amountColumnName?: string;
    typeColumnIndex?: number;
    typeColumnName?: string;
    debitIndicator?: string;
    creditIndicator?: string;
    debitColumnIndex?: number;
    debitColumnName?: string;
    creditColumnIndex?: number;
    creditColumnName?: string;
}

export type UpdateProfilePayload = Partial<CreateProfilePayload>;

export function useBankImportProfiles() {
    const [profiles, setProfiles] = useState<BankImportProfile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProfiles = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/admin/finance/bank-import-profiles");
            setProfiles(res.data?.data ?? []);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch import profiles.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createProfile = useCallback(async (payload: CreateProfilePayload): Promise<BankImportProfile> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/admin/finance/bank-import-profiles", payload);
            const created: BankImportProfile = res.data?.data;
            setProfiles((prev) => [created, ...prev]);
            return created;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to create profile.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateProfile = useCallback(async (id: string, payload: UpdateProfilePayload): Promise<BankImportProfile> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/finance/bank-import-profiles/${id}`, payload);
            const updated: BankImportProfile = res.data?.data;
            setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)));
            return updated;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to update profile.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const downloadTemplate = useCallback(async (id: string, filename: string) => {
        try {
            const res = await api.get(`/admin/finance/bank-import-profiles/${id}/template`, {
                responseType: "blob",
            });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${filename.replace(/\s+/g, "-").toLowerCase()}-template.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to download template.");
        }
    }, []);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    return { profiles, isLoading, isSubmitting, error, createProfile, updateProfile, downloadTemplate, refetch: fetchProfiles };
}
