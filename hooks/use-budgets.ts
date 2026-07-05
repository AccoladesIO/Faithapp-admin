import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

export interface BudgetFund {
    id: string;
    name: string;
    type: "RESTRICTED" | "UNRESTRICTED";
}

export interface BudgetAccount {
    id: string;
    name: string;
    code: string;
}

export type BudgetPeriod = "MONTHLY" | "ANNUAL" | "CUSTOM";

export interface Budget {
    id: string;
    name: string;
    account: BudgetAccount;
    fund: BudgetFund;
    period: BudgetPeriod;
    amount: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
    actuals?: number;
    utilizationPct?: number;
    alert80SentAt: string | null;
    alert100SentAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateBudgetPayload {
    name: string;
    accountId: string;
    fundId: string;
    period: BudgetPeriod;
    amount: number;
    startDate: string;
    endDate: string;
}

export interface UpdateBudgetPayload {
    name?: string;
    amount?: number;
    startDate?: string;
    endDate?: string;
}

export function useBudgets() {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);

    const fetchBudgets = useCallback(async (isActive?: boolean) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (isActive !== undefined) params.set("isActive", String(isActive));
            const res = await api.get(`/admin/finance/budgets${params.size ? `?${params}` : ""}`);
            const outer = res.data?.data;
            setBudgets(Array.isArray(outer) ? outer : (outer?.data ?? []));
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || "Failed to fetch budgets.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const applyFilter = useCallback((isActive?: boolean) => {
        setActiveFilter(isActive);
        fetchBudgets(isActive);
    }, [fetchBudgets]);

    const createBudget = useCallback(
        async (payload: CreateBudgetPayload): Promise<Budget> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.post("/admin/finance/budgets", payload);
                const created: Budget = res.data?.data;
                setBudgets((prev) => [created, ...prev]);
                return created;
            } catch (err: any) {
                const message =
                    err?.response?.data?.message || err?.message || "Failed to create budget.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    const updateBudget = useCallback(
        async (id: string, payload: UpdateBudgetPayload): Promise<Budget> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.patch(`/admin/finance/budgets/${id}`, payload);
                const updated: Budget = res.data?.data;
                setBudgets((prev) => prev.map((b) => (b.id === id ? updated : b)));
                return updated;
            } catch (err: any) {
                const message =
                    err?.response?.data?.message || err?.message || "Failed to update budget.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    const deactivateBudget = useCallback(async (id: string): Promise<Budget> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/finance/budgets/${id}/deactivate`);
            const updated: Budget = res.data?.data;
            setBudgets((prev) => prev.map((b) => (b.id === id ? updated : b)));
            return updated;
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || "Failed to deactivate budget.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const reactivateBudget = useCallback(async (id: string): Promise<Budget> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/finance/budgets/${id}/reactivate`);
            const updated: Budget = res.data?.data;
            setBudgets((prev) => prev.map((b) => (b.id === id ? updated : b)));
            return updated;
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || "Failed to reactivate budget.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    useEffect(() => {
        fetchBudgets();
    }, [fetchBudgets]);

    return {
        budgets, isLoading, isSubmitting, error,
        activeFilter,
        applyFilter,
        createBudget, updateBudget, deactivateBudget, reactivateBudget,
        refetch: () => fetchBudgets(activeFilter),
    };
}
