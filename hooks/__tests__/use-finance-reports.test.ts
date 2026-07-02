import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useFinanceReports } from "../use-finance-reports";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;

const dashboard = {
    mtdIncome: 100000, mtdExpenses: 40000, mtdNet: 60000,
    pendingJournalEntries: 3, pendingPettyCash: 1,
    budgetsNearLimit: [], totalOutstandingPledges: 25000, activePledgeCount: 5,
    generatedAt: "2026-06-25T00:00:00Z",
};

const fundBalance = { funds: [{ fund: { id: "f1", name: "General", type: "UNRESTRICTED" }, accountCount: 2, totalBalance: 60000 }] };

beforeEach(() => jest.clearAllMocks());

describe("useFinanceReports", () => {
    it("fetches dashboard and fund balance in parallel on mount", async () => {
        mockGet
            .mockResolvedValueOnce({ data: { data: dashboard } })
            .mockResolvedValueOnce({ data: { data: fundBalance } });

        const { result } = renderHook(() => useFinanceReports());

        expect(result.current.isLoading).toBe(true);
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(mockGet).toHaveBeenCalledTimes(2);
        expect(result.current.dashboard?.mtdIncome).toBe(100000);
        expect(result.current.fundBalance?.funds).toHaveLength(1);
    });

    it("sets error when dashboard fetch fails", async () => {
        mockGet
            .mockRejectedValueOnce({ message: "Server error" })
            .mockResolvedValueOnce({ data: { data: fundBalance } });

        const { result } = renderHook(() => useFinanceReports());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.error).toBe("Server error");
    });

    it("runs an income-expense report with params", async () => {
        mockGet
            .mockResolvedValueOnce({ data: { data: dashboard } })
            .mockResolvedValueOnce({ data: { data: fundBalance } })
            .mockResolvedValueOnce({ data: { data: { income: 50000, expenses: 20000 } } });

        const { result } = renderHook(() => useFinanceReports());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.runReport("income-expense", { periodId: "per1" });
        });

        expect(mockGet).toHaveBeenCalledWith("/admin/finance/reports/income-expense?periodId=per1");
        expect(result.current.activeReport).toBe("income-expense");
        expect(result.current.reportResult).toEqual({ income: 50000, expenses: 20000 });
    });

    it("runs a trial-balance report with no params", async () => {
        mockGet
            .mockResolvedValueOnce({ data: { data: dashboard } })
            .mockResolvedValueOnce({ data: { data: fundBalance } })
            .mockResolvedValueOnce({ data: { data: [] } });

        const { result } = renderHook(() => useFinanceReports());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.runReport("trial-balance", {});
        });

        expect(mockGet).toHaveBeenCalledWith("/admin/finance/reports/trial-balance");
        expect(result.current.activeReport).toBe("trial-balance");
    });

    it("sets reportError on report fetch failure", async () => {
        mockGet
            .mockResolvedValueOnce({ data: { data: dashboard } })
            .mockResolvedValueOnce({ data: { data: fundBalance } })
            .mockRejectedValueOnce({ message: "Not found" });

        const { result } = renderHook(() => useFinanceReports());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.runReport("budget-actuals", { budgetId: "b1" });
        });

        expect(result.current.reportError).toBe("Not found");
        expect(result.current.reportResult).toBeNull();
    });

    it("clearReport resets active report state", async () => {
        mockGet
            .mockResolvedValueOnce({ data: { data: dashboard } })
            .mockResolvedValueOnce({ data: { data: fundBalance } })
            .mockResolvedValueOnce({ data: { data: { total: 999 } } });

        const { result } = renderHook(() => useFinanceReports());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.runReport("pledge-summary", { campaignId: "c1" }); });
        expect(result.current.activeReport).toBe("pledge-summary");

        act(() => { result.current.clearReport(); });
        expect(result.current.activeReport).toBeNull();
        expect(result.current.reportResult).toBeNull();
    });
});
