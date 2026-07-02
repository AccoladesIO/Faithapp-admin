import { renderHook, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { usePledges } from "../use-pledges";
import { api } from "@/utils/auth/axios-client";

jest.mock("@/utils/auth/axios-client", () => ({
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;

const campaign = {
    id: "c1", name: "Building Fund Campaign", description: null,
    targetAmount: 500000, startDate: "2026-01-01", endDate: null,
    isActive: true, totalPledged: 200000, totalPaid: 50000, pledgeCount: 10,
    createdAt: "", updatedAt: "",
};
const pledge = {
    id: "pl1", campaign: { id: "c1", name: "Building Fund Campaign" },
    member: { id: "m1", name: "John", email: "j@j.com" },
    totalAmount: 20000, amountPaid: 5000, frequency: "MONTHLY" as const,
    startDate: "2026-01-01", status: "ACTIVE" as const, notes: null,
    createdAt: "", updatedAt: "",
};

beforeEach(() => jest.clearAllMocks());

describe("usePledges", () => {
    it("fetches campaigns on mount", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [campaign] } });
        const { result } = renderHook(() => usePledges());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockGet).toHaveBeenCalledWith("/admin/finance/pledges/campaigns");
        expect(result.current.campaigns).toEqual([campaign]);
    });

    it("fetches pledges when a campaign is selected", async () => {
        mockGet
            .mockResolvedValueOnce({ data: { data: [campaign] } })
            .mockResolvedValueOnce({ data: { data: { data: [pledge], page: 1, limit: 20, totalCount: 1, totalPages: 1 } } });

        const { result } = renderHook(() => usePledges());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { result.current.selectCampaign("c1"); });

        await waitFor(() => expect(result.current.isPledgesLoading).toBe(false));
        expect(result.current.pledges).toHaveLength(1);
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/admin/finance/pledges?campaignId=c1"));
    });

    it("creates a campaign and prepends to list", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [campaign] } });
        const created = { ...campaign, id: "c2", name: "Missions Campaign" };
        mockPost.mockResolvedValueOnce({ data: { data: created } });

        const { result } = renderHook(() => usePledges());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.createCampaign({ name: "Missions Campaign", targetAmount: 100000, startDate: "2026-06-01" });
        });

        expect(result.current.campaigns[0].id).toBe("c2");
    });

    it("updates pledge status in-place", async () => {
        mockGet
            .mockResolvedValueOnce({ data: { data: [campaign] } })
            .mockResolvedValueOnce({ data: { data: { data: [pledge], page: 1, limit: 20, totalCount: 1, totalPages: 1 } } });

        const completed = { ...pledge, status: "COMPLETED" as const };
        mockPatch.mockResolvedValueOnce({ data: { data: completed } });

        const { result } = renderHook(() => usePledges());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        await act(async () => { result.current.selectCampaign("c1"); });
        await waitFor(() => expect(result.current.isPledgesLoading).toBe(false));

        await act(async () => { await result.current.updatePledgeStatus("pl1", "COMPLETED"); });

        expect(mockPatch).toHaveBeenCalledWith("/admin/finance/pledges/pl1/status", { status: "COMPLETED" });
        expect(result.current.pledges[0].status).toBe("COMPLETED");
    });
});
