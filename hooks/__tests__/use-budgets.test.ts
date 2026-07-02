import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useBudgets } from "../use-budgets";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;

const budget = {
    id: "b1", name: "Operating Budget",
    account: { id: "a1", name: "Expenses", code: "5000" },
    fund: { id: "f1", name: "General", type: "UNRESTRICTED" as const },
    totalAmount: 100000, fromDate: "2026-01-01", toDate: "2026-12-31",
    actuals: 65000, utilizationPct: 65, alert80SentAt: null, alert100SentAt: null,
    createdAt: "", updatedAt: "",
};

beforeEach(() => jest.clearAllMocks());

describe("useBudgets", () => {
    it("fetches budgets on mount", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: { data: [budget], page: 1, limit: 20, totalCount: 1, totalPages: 1 } } });
        const { result } = renderHook(() => useBudgets());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockGet).toHaveBeenCalledWith("/admin/finance/budgets");
        expect(result.current.budgets).toEqual([budget]);
    });

    it("sets error on failure", async () => {
        mockGet.mockRejectedValueOnce({ message: "Forbidden" });
        const { result } = renderHook(() => useBudgets());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("Forbidden");
    });

    it("creates a budget and prepends to list", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: { data: [budget], page: 1, limit: 20, totalCount: 1, totalPages: 1 } } });
        const created = { ...budget, id: "b2", name: "New Budget" };
        mockPost.mockResolvedValueOnce({ data: { data: created } });

        const { result } = renderHook(() => useBudgets());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.createBudget({ name: "New Budget", accountId: "a1", fundId: "f1", totalAmount: 50000, fromDate: "2026-01-01", toDate: "2026-12-31" });
        });

        expect(mockPost).toHaveBeenCalledWith("/admin/finance/budgets", expect.objectContaining({ name: "New Budget" }));
        expect(result.current.budgets[0].id).toBe("b2");
    });

    it("updates a budget in-place", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: { data: [budget], page: 1, limit: 20, totalCount: 1, totalPages: 1 } } });
        const updated = { ...budget, name: "Updated Budget" };
        mockPatch.mockResolvedValueOnce({ data: { data: updated } });

        const { result } = renderHook(() => useBudgets());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.updateBudget("b1", { name: "Updated Budget" }); });

        expect(result.current.budgets[0].name).toBe("Updated Budget");
    });

    it("deactivates a budget in-place", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: { data: [budget], page: 1, limit: 20, totalCount: 1, totalPages: 1 } } });
        const deactivated = { ...budget, isActive: false };
        mockPatch.mockResolvedValueOnce({ data: { data: deactivated } });

        const { result } = renderHook(() => useBudgets());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.deactivateBudget("b1"); });

        expect(mockPatch).toHaveBeenCalledWith("/admin/finance/budgets/b1/deactivate");
        expect(result.current.budgets[0]).toMatchObject({ id: "b1", isActive: false });
    });
});
