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

const contribution = {
    id: "pc1", amount: 5000, paymentDate: "2026-07-01", reference: "TXN1",
    status: "PENDING" as const, reviewedBy: null, reviewedAt: null, financeNote: null,
    submittedBy: { id: "m1", firstname: "John", lastname: "Doe" },
    pledge: {
        id: "pl1", totalAmount: 20000,
        member: { id: "m1", firstname: "John", lastname: "Doe" },
        campaign: { id: "c1", name: "Building Fund Campaign" },
    },
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
            await result.current.createCampaign({ name: "Missions Campaign", fundId: "f1", targetAmount: 100000, startDate: "2026-06-01", endDate: "2026-12-31" });
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

    it("fetches pending pledge contributions", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [campaign] } });
        mockGet.mockResolvedValueOnce({
            data: { data: { data: [contribution], page: 1, limit: 20, totalCount: 1, totalPages: 1 } },
        });

        const { result } = renderHook(() => usePledges());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.fetchContributions({ status: "PENDING" }); });

        expect(mockGet).toHaveBeenCalledWith(
            expect.stringContaining("/admin/finance/pledges/contributions?")
        );
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("status=PENDING"));
        expect(result.current.contributions).toEqual([contribution]);
        expect(result.current.contributionsPagination?.totalCount).toBe(1);
    });

    it("confirms a contribution and refetches the queue", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [campaign] } });
        mockGet.mockResolvedValueOnce({
            data: { data: { data: [contribution], page: 1, limit: 20, totalCount: 1, totalPages: 1 } },
        });
        const confirmed = { ...contribution, status: "CONFIRMED" as const };
        mockPost.mockResolvedValueOnce({ data: { data: confirmed } });
        mockGet.mockResolvedValueOnce({
            data: { data: { data: [confirmed], page: 1, limit: 20, totalCount: 1, totalPages: 1 } },
        });

        const { result } = renderHook(() => usePledges());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        await act(async () => { await result.current.fetchContributions({ status: "PENDING" }); });

        await act(async () => { await result.current.confirmContribution("pc1"); });

        expect(mockPost).toHaveBeenCalledWith("/admin/finance/pledges/contributions/pc1/confirm");
        await waitFor(() => expect(result.current.contributions[0]?.status).toBe("CONFIRMED"));
    });

    it("declines a contribution with a finance note", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [campaign] } });
        mockGet.mockResolvedValueOnce({
            data: { data: { data: [contribution], page: 1, limit: 20, totalCount: 1, totalPages: 1 } },
        });
        const declined = { ...contribution, status: "DECLINED" as const, financeNote: "No match" };
        mockPost.mockResolvedValueOnce({ data: { data: declined } });
        mockGet.mockResolvedValueOnce({
            data: { data: { data: [declined], page: 1, limit: 20, totalCount: 1, totalPages: 1 } },
        });

        const { result } = renderHook(() => usePledges());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        await act(async () => { await result.current.fetchContributions({ status: "PENDING" }); });

        await act(async () => { await result.current.declineContribution("pc1", "No match"); });

        expect(mockPost).toHaveBeenCalledWith(
            "/admin/finance/pledges/contributions/pc1/decline",
            { financeNote: "No match" }
        );
        await waitFor(() => expect(result.current.contributions[0]?.status).toBe("DECLINED"));
    });

    it("toggles a campaign's active state in-place", async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [campaign] } });
        const deactivated = { ...campaign, isActive: false };
        mockPatch.mockResolvedValueOnce({ data: { data: deactivated } });

        const { result } = renderHook(() => usePledges());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => { await result.current.updateCampaignActive("c1", false); });

        expect(mockPatch).toHaveBeenCalledWith("/admin/finance/pledges/campaigns/c1/active", { isActive: false });
        expect(result.current.campaigns[0].isActive).toBe(false);
    });
});
