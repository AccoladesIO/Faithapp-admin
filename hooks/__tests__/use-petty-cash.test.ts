import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { usePettyCash } from "../use-petty-cash";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;

const replenishment = {
    id: "pc1", fromAccount: { id: "a1", name: "Main", code: "1001" },
    toCashAccount: { id: "a2", name: "Petty Cash", code: "1010" },
    amount: 5000, notes: null, status: "PENDING" as const,
    requestedBy: { id: "u1", name: "Admin", email: "a@a.com" },
    approvedBy: null, approvedAt: null, journalEntry: null, createdAt: "", updatedAt: "",
};
const paged = { data: { data: { data: [replenishment], page: 1, limit: 20, totalCount: 1, totalPages: 1 } } };

beforeEach(() => jest.clearAllMocks());

describe("usePettyCash", () => {
    it("fetches replenishments on mount", async () => {
        mockGet.mockResolvedValueOnce(paged);
        const { result } = renderHook(() => usePettyCash());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/admin/finance/petty-cash"));
        expect(result.current.replenishments).toHaveLength(1);
    });

    it("sets error on failure", async () => {
        mockGet.mockRejectedValueOnce({ message: "Network error" });
        const { result } = renderHook(() => usePettyCash());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("Network error");
    });

    it("approves a replenishment and updates in-place", async () => {
        mockGet.mockResolvedValueOnce(paged);
        const approved = { ...replenishment, status: "APPROVED" as const };
        mockPatch.mockResolvedValueOnce({ data: { data: approved } });

        const { result } = renderHook(() => usePettyCash());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.approveReplenishment("pc1"); });

        expect(mockPatch).toHaveBeenCalledWith("/admin/finance/petty-cash/pc1/approve");
        expect(result.current.replenishments[0].status).toBe("APPROVED");
    });

    it("rejects a replenishment and updates in-place", async () => {
        mockGet.mockResolvedValueOnce(paged);
        const rejected = { ...replenishment, status: "REJECTED" as const };
        mockPatch.mockResolvedValueOnce({ data: { data: rejected } });

        const { result } = renderHook(() => usePettyCash());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.rejectReplenishment("pc1"); });

        expect(result.current.replenishments[0].status).toBe("REJECTED");
    });
});
