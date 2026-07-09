import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useLeave } from "../use-leave";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), patch: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;

const workerMember = {
    id: "m1", firstname: "Ada", lastname: "Lovelace",
    email: "ada@church.test", phoneNumber: "+2348012345678",
};
const workerProfile = { id: "wp1", member: workerMember };

const pendingReq = {
    id: "lr1", workerProfile, dateFrom: "2026-07-01", dateTo: "2026-07-05",
    reason: "Family vacation", status: "PENDING" as const,
    actionedBy: null, createdAt: "2026-06-25T09:00:00Z", updatedAt: "2026-06-25T09:00:00Z",
};

const paged = {
    data: { data: { data: [pendingReq], page: 1, limit: 20, totalCount: 1, totalPages: 1 } },
};

beforeEach(() => jest.clearAllMocks());

describe("useLeave — initial fetch", () => {
    it("fetches leave requests on mount", async () => {
        mockGet.mockResolvedValueOnce(paged);

        const { result } = renderHook(() => useLeave());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/leave/history"));
        expect(result.current.requests).toHaveLength(1);
        expect(result.current.requests[0].id).toBe("lr1");
    });

    it("sets error on fetch failure", async () => {
        mockGet.mockRejectedValueOnce({ message: "Unauthorized" });

        const { result } = renderHook(() => useLeave());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.error).toBe("Unauthorized");
        expect(result.current.requests).toHaveLength(0);
    });

    it("populates pagination metadata", async () => {
        mockGet.mockResolvedValueOnce(paged);

        const { result } = renderHook(() => useLeave());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.pagination?.totalCount).toBe(1);
        expect(result.current.pagination?.totalPages).toBe(1);
    });
});

describe("useLeave — applyFilter", () => {
    it("sends status query param when filter is applied", async () => {
        mockGet.mockResolvedValue(paged);

        const { result } = renderHook(() => useLeave());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.applyFilter("PENDING"); });

        const url = mockGet.mock.calls[mockGet.mock.calls.length - 1][0] as string;
        expect(url).toContain("status=PENDING");
        expect(result.current.statusFilter).toBe("PENDING");
    });

    it("omits status param when filter is cleared", async () => {
        mockGet.mockResolvedValue(paged);

        const { result } = renderHook(() => useLeave());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.applyFilter(""); });

        const url = mockGet.mock.calls[mockGet.mock.calls.length - 1][0] as string;
        expect(url).not.toContain("status=");
    });
});

describe("useLeave — actionLeave", () => {
    it("PATCHes the action endpoint with APPROVED and updates the list", async () => {
        mockGet.mockResolvedValueOnce(paged);
        const approved = { ...pendingReq, status: "APPROVED" as const, actionedBy: workerMember };
        mockPatch.mockResolvedValueOnce({ data: { data: approved } });

        const { result } = renderHook(() => useLeave());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.actionLeave("lr1", "APPROVED"); });

        expect(mockPatch).toHaveBeenCalledWith("/leave/lr1/action", { status: "APPROVED" });
        expect(result.current.requests[0].status).toBe("APPROVED");
    });

    it("PATCHes the action endpoint with REJECTED and updates the list", async () => {
        mockGet.mockResolvedValueOnce(paged);
        const rejected = { ...pendingReq, status: "REJECTED" as const, actionedBy: workerMember };
        mockPatch.mockResolvedValueOnce({ data: { data: rejected } });

        const { result } = renderHook(() => useLeave());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.actionLeave("lr1", "REJECTED"); });

        expect(mockPatch).toHaveBeenCalledWith("/leave/lr1/action", { status: "REJECTED" });
        expect(result.current.requests[0].status).toBe("REJECTED");
    });

    it("sets error and throws when action fails", async () => {
        mockGet.mockResolvedValueOnce(paged);
        mockPatch.mockRejectedValueOnce({ response: { data: { message: "Only pending requests can be actioned" } } });

        const { result } = renderHook(() => useLeave());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        let caught: Error | undefined;
        await act(async () => {
            try { await result.current.actionLeave("lr1", "APPROVED"); } catch (e: unknown) { caught = e as Error; }
        });

        expect(caught?.message).toBe("Only pending requests can be actioned");
        expect(result.current.error).toBe("Only pending requests can be actioned");
    });
});

describe("useLeave — goToPage", () => {
    it("fetches the requested page with the current status filter", async () => {
        mockGet.mockResolvedValue(paged);

        const { result } = renderHook(() => useLeave());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.applyFilter("APPROVED"); });
        await act(async () => { result.current.goToPage(3); });

        const url = mockGet.mock.calls[mockGet.mock.calls.length - 1][0] as string;
        expect(url).toContain("page=3");
        expect(url).toContain("status=APPROVED");
    });
});
