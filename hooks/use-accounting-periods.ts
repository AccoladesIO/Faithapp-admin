import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

export type PeriodStatus = "OPEN" | "CLOSED";

export interface AccountingPeriod {
    id: string;
    year: number;
    month: number;
    status: PeriodStatus;
    closedAt: string | null;
    closedBy: { id: string; name: string; email: string } | null;
    createdAt: string;
    updatedAt: string;
}

export function useAccountingPeriods() {
    const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPeriods = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/admin/finance/accounting-periods");
            setPeriods(res.data?.data ?? []);
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || "Failed to fetch accounting periods.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createPeriod = useCallback(
        async (year: number, month: number): Promise<AccountingPeriod> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.post("/admin/finance/accounting-periods", { year, month });
                const created: AccountingPeriod = res.data?.data;
                setPeriods((prev) => [created, ...prev]);
                return created;
            } catch (err: any) {
                const message =
                    err?.response?.data?.message || err?.message || "Failed to create period.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    const closePeriod = useCallback(
        async (id: string): Promise<AccountingPeriod> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.patch(`/admin/finance/accounting-periods/${id}/close`);
                const updated: AccountingPeriod = res.data?.data;
                setPeriods((prev) => prev.map((p) => (p.id === id ? updated : p)));
                return updated;
            } catch (err: any) {
                const message =
                    err?.response?.data?.message || err?.message || "Failed to close period.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    const reopenPeriod = useCallback(
        async (id: string): Promise<AccountingPeriod> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.patch(`/admin/finance/accounting-periods/${id}/reopen`);
                const updated: AccountingPeriod = res.data?.data;
                setPeriods((prev) => prev.map((p) => (p.id === id ? updated : p)));
                return updated;
            } catch (err: any) {
                const message =
                    err?.response?.data?.message || err?.message || "Failed to reopen period.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    useEffect(() => {
        fetchPeriods();
    }, [fetchPeriods]);

    return {
        periods,
        isLoading,
        isSubmitting,
        error,
        createPeriod,
        closePeriod,
        reopenPeriod,
        refetch: fetchPeriods,
    };
}
