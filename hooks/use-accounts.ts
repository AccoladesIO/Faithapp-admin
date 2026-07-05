import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

export type AccountType = "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE";
export type NormalBalance = "DEBIT" | "CREDIT";
export type AccountSubtype =
    | "BANK" | "CASH" | "PETTY_CASH" | "OFFERING" | "TITHE"
    | "SALARY" | "UTILITIES" | "REMITTANCE" | "EQUIPMENT" | "OTHER";

export interface FinanceAccount {
    id: string;
    name: string;
    code: string;
    type: AccountType;
    subtype: string | null;
    normalBalance: NormalBalance;
    currentBalance: number;
    fund: { id: string; name: string; type: string } | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAccountPayload {
    name: string;
    code: string;
    type: AccountType;
    subtype: AccountSubtype;
    normalBalance: NormalBalance;
    fundId?: string;
}

export interface UpdateAccountPayload {
    name?: string;
    code?: string;
    subtype?: AccountSubtype;
    isActive?: boolean;
}

export function useAccounts() {
    const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAccounts = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/admin/finance/accounts");
            setAccounts(res.data?.data ?? []);
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || "Failed to fetch accounts.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createAccount = useCallback(
        async (payload: CreateAccountPayload): Promise<FinanceAccount> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.post("/admin/finance/accounts", payload);
                const created: FinanceAccount = res.data?.data;
                setAccounts((prev) => [created, ...prev]);
                return created;
            } catch (err: any) {
                const message =
                    err?.response?.data?.message || err?.message || "Failed to create account.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    const updateAccount = useCallback(
        async (id: string, payload: UpdateAccountPayload): Promise<FinanceAccount> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.patch(`/admin/finance/accounts/${id}`, payload);
                const updated: FinanceAccount = res.data?.data;
                setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
                return updated;
            } catch (err: any) {
                const message =
                    err?.response?.data?.message || err?.message || "Failed to update account.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    return { accounts, isLoading, isSubmitting, error, createAccount, updateAccount, refetch: fetchAccounts };
}
