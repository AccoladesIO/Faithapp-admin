import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useOfferings } from "../use-offerings";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;

const offering = {
    id: "o1", serviceEventId: null, fund: { id: "f1", name: "General", type: "UNRESTRICTED" as const },
    type: "GENERAL" as const, cashAmount: 5000, expectedTransferAmount: 2000,
    isReconciled: false, reconciledAt: null, notes: null,
    recordedBy: { id: "a1", name: "Admin", email: "a@a.com" },
    reconciledBy: null, createdAt: "", updatedAt: "",
};

const paginatedResponse = { data: { data: { data: [offering], page: 1, limit: 20, totalCount: 1, totalPages: 1 } } };

beforeEach(() => jest.clearAllMocks());

describe("useOfferings", () => {
    it("fetches offerings on mount", async () => {
        mockGet.mockResolvedValueOnce(paginatedResponse);
        const { result } = renderHook(() => useOfferings());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/admin/finance/offerings"));
        expect(result.current.offerings).toEqual([offering]);
        expect(result.current.pagination?.totalCount).toBe(1);
    });

    it("sets error state on fetch failure", async () => {
        mockGet.mockRejectedValueOnce({ response: { data: { message: "Unauthorized" } } });
        const { result } = renderHook(() => useOfferings());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("Unauthorized");
    });

    it("creates an offering and refetches list", async () => {
        mockGet.mockResolvedValue(paginatedResponse);
        const created = { ...offering, id: "o2" };
        mockPost.mockResolvedValueOnce({ data: { data: created } });

        const { result } = renderHook(() => useOfferings());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.createOffering({ fundId: "f1", type: "GENERAL", cashAmount: 1000 });
        });

        expect(mockPost).toHaveBeenCalledWith("/admin/finance/offerings", expect.objectContaining({ fundId: "f1" }));
    });

    it("reconciles an offering and updates list in-place", async () => {
        mockGet.mockResolvedValueOnce(paginatedResponse);
        const reconciled = { ...offering, isReconciled: true, reconciledAt: "2026-01-01T00:00:00Z" };
        mockPatch.mockResolvedValueOnce({ data: { data: reconciled } });

        const { result } = renderHook(() => useOfferings());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.reconcileOffering("o1", { notes: "Done" });
        });

        expect(mockPatch).toHaveBeenCalledWith("/admin/finance/offerings/o1/reconcile", { notes: "Done" });
    });
});
