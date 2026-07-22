import { renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { usePrayerRequestsAdmin } from "../use-prayer-requests";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), patch: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;

const request = {
    id: "pr-1",
    submittedByName: "Ada Lovelace",
    content: "Please pray for my family",
    status: "OPEN" as const,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
};

const testimony = {
    id: "test-1",
    submittedByName: "Ada Lovelace",
    content: "God is faithful",
    isPublic: true,
    prayerRequest: null,
    createdAt: "2026-07-01T00:00:00.000Z",
};

beforeEach(() => jest.clearAllMocks());

describe("usePrayerRequestsAdmin", () => {
    it("fetches prayer requests with pagination", async () => {
        mockGet.mockResolvedValueOnce({
            data: { data: { data: [request], page: 1, limit: 10, totalCount: 1, totalPages: 1 } },
        });
        const { result } = renderHook(() => usePrayerRequestsAdmin());

        await act(async () => { await result.current.fetchRequests(1); });

        expect(mockGet).toHaveBeenCalledWith("/prayer-requests/admin?page=1&limit=10");
        expect(result.current.requests).toEqual([request]);
        expect(result.current.requestsPagination).toEqual({ page: 1, limit: 10, totalCount: 1, totalPages: 1 });
    });

    it("includes status in the query when filtering", async () => {
        mockGet.mockResolvedValueOnce({
            data: { data: { data: [], page: 1, limit: 10, totalCount: 0, totalPages: 0 } },
        });
        const { result } = renderHook(() => usePrayerRequestsAdmin());

        await act(async () => { await result.current.fetchRequests(1, "ANSWERED"); });

        expect(mockGet).toHaveBeenCalledWith("/prayer-requests/admin?page=1&limit=10&status=ANSWERED");
    });

    it("sets error on fetch failure", async () => {
        mockGet.mockRejectedValueOnce({ message: "Network error" });
        const { result } = renderHook(() => usePrayerRequestsAdmin());

        await act(async () => { await result.current.fetchRequests(1); });

        expect(result.current.error).toBe("Network error");
    });

    it("fetches testimonies with pagination", async () => {
        mockGet.mockResolvedValueOnce({
            data: { data: { data: [testimony], page: 1, limit: 10, totalCount: 1, totalPages: 1 } },
        });
        const { result } = renderHook(() => usePrayerRequestsAdmin());

        await act(async () => { await result.current.fetchTestimonies(1); });

        expect(mockGet).toHaveBeenCalledWith("/testimonies/admin?page=1&limit=10");
        expect(result.current.testimonies).toEqual([testimony]);
    });

    it("updateStatus patches and merges the updated request into the list", async () => {
        mockGet.mockResolvedValueOnce({
            data: { data: { data: [request], page: 1, limit: 10, totalCount: 1, totalPages: 1 } },
        });
        const { result } = renderHook(() => usePrayerRequestsAdmin());
        await act(async () => { await result.current.fetchRequests(1); });

        const updated = { ...request, status: "ANSWERED" as const };
        mockPatch.mockResolvedValueOnce({ data: { data: updated } });

        await act(async () => { await result.current.updateStatus("pr-1", "ANSWERED"); });

        expect(mockPatch).toHaveBeenCalledWith("/prayer-requests/admin/pr-1/status", { status: "ANSWERED" });
        expect(result.current.requests[0].status).toBe("ANSWERED");
    });

    it("updateStatus sets error and throws on failure", async () => {
        const { result } = renderHook(() => usePrayerRequestsAdmin());
        mockPatch.mockRejectedValueOnce({ response: { data: { message: "Not found" } } });

        let caught: Error | undefined;
        await act(async () => {
            try { await result.current.updateStatus("pr-1", "ANSWERED"); } catch (e: unknown) { caught = e as Error; }
        });

        expect(caught?.message).toBe("Not found");
        expect(result.current.error).toBe("Not found");
    });
});
