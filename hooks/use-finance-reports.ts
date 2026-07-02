import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

export interface BudgetUtilization {
    budgetId: string;
    name: string;
    amount: number;
    actuals: number;
    utilizationPct: number;
}

export interface FinanceDashboard {
    mtdIncome: number;
    mtdExpenses: number;
    mtdNet: number;
    pendingJournalEntries: number;
    pendingPettyCash: number;
    budgetsNearLimit: BudgetUtilization[];
    totalOutstandingPledges: number;
    activePledgeCount: number;
    generatedAt: string;
}

export interface FundBalance {
    fund: { id: string; name: string; type: string };
    totalBalance: number;
    accountCount: number;
}

export interface FundBalanceReport {
    funds: FundBalance[];
    generatedAt: string;
}

export type ReportType =
    | "income-expense"
    | "cash-flow"
    | "trial-balance"
    | "account-ledger"
    | "budget-actuals"
    | "pledge-summary"
    | "member-giving";

export function useFinanceReports() {
    const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null);
    const [fundBalance, setFundBalance] = useState<FundBalanceReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [activeReport, setActiveReport] = useState<ReportType | null>(null);
    const [reportResult, setReportResult] = useState<any>(null);
    const [isReportLoading, setIsReportLoading] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [dashRes, fundRes] = await Promise.all([
                api.get("/admin/finance/reports/dashboard"),
                api.get("/admin/finance/reports/fund-balance"),
            ]);
            setDashboard(dashRes.data?.data ?? null);
            setFundBalance(fundRes.data?.data ?? null);
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                    err?.message ||
                    "Failed to fetch finance reports."
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    const runReport = useCallback(async (type: ReportType, params: Record<string, string>) => {
        setActiveReport(type);
        setReportResult(null);
        setIsReportLoading(true);
        setReportError(null);
        try {
            const qs = new URLSearchParams(params).toString();
            const url = qs ? `/admin/finance/reports/${type}?${qs}` : `/admin/finance/reports/${type}`;
            const res = await api.get(url);
            setReportResult(res.data?.data ?? null);
        } catch (err: any) {
            setReportError(err?.response?.data?.message || err?.message || "Failed to run report.");
        } finally {
            setIsReportLoading(false);
        }
    }, []);

    const clearReport = useCallback(() => {
        setActiveReport(null);
        setReportResult(null);
        setReportError(null);
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    return {
        dashboard,
        fundBalance,
        isLoading,
        error,
        refetch: fetchAll,
        activeReport,
        reportResult,
        isReportLoading,
        reportError,
        runReport,
        clearReport,
    };
}
