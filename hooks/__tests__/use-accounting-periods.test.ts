import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useAccountingPeriods } from "../use-accounting-periods";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;

const period = { id: "p1", year: 2026, month: 6, status: "OPEN" as const, closedAt: null, closedBy: null, createdAt: "", updatedAt: "" };

beforeEach(() => jest.clearAllMocks());

describe("useAccountingPeriods", () => {
    it("fetches periods on mount", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [period] } });
        const { result } = renderHook(() => useAccountingPeriods());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockGet).toHaveBeenCalledWith("/admin/finance/accounting-periods");
        expect(result.current.periods).toEqual([period]);
    });

    it("sets error on failure", async () => {
        mockGet.mockRejectedValueOnce({ message: "Auth error" });
        const { result } = renderHook(() => useAccountingPeriods());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("Auth error");
    });

    it("creates a period and prepends to list", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [period] } });
        const created = { ...period, id: "p2", month: 7 };
        mockPost.mockResolvedValueOnce({ data: { data: created } });

        const { result } = renderHook(() => useAccountingPeriods());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.createPeriod(2026, 7); });

        expect(mockPost).toHaveBeenCalledWith("/admin/finance/accounting-periods", { year: 2026, month: 7 });
        expect(result.current.periods[0].id).toBe("p2");
    });

    it("closes a period and updates in-place", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [period] } });
        const closed = { ...period, status: "CLOSED" as const, closedAt: "2026-07-01T00:00:00Z" };
        mockPatch.mockResolvedValueOnce({ data: { data: closed } });

        const { result } = renderHook(() => useAccountingPeriods());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.closePeriod("p1"); });

        expect(mockPatch).toHaveBeenCalledWith("/admin/finance/accounting-periods/p1/close");
        expect(result.current.periods[0].status).toBe("CLOSED");
    });

    it("reopens a period and updates in-place", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [{ ...period, status: "CLOSED" as const }] } });
        mockPatch.mockResolvedValueOnce({ data: { data: period } });

        const { result } = renderHook(() => useAccountingPeriods());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.reopenPeriod("p1"); });

        expect(mockPatch).toHaveBeenCalledWith("/admin/finance/accounting-periods/p1/reopen");
        expect(result.current.periods[0].status).toBe("OPEN");
    });
});
