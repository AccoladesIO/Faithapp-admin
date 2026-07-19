import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type PledgeFrequency = "ONE_OFF" | "MONTHLY" | "QUARTERLY";
export type PledgeStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface PledgeCampaign {
    id: string;
    name: string;
    description: string | null;
    targetAmount: number;
    startDate: string;
    endDate: string | null;
    isActive: boolean;
    totalPledged: number | null;
    totalPaid: number | null;
    pledgeCount: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface Pledge {
    id: string;
    campaign: { id: string; name: string };
    member: { id: string; firstname: string; lastname: string; email: string } | null;
    guestName: string | null;
    totalAmount: number;
    amountPaid: number | null;
    frequency: PledgeFrequency;
    startDate: string;
    status: PledgeStatus;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export type PledgeContributionStatus = "PENDING" | "CONFIRMED" | "DECLINED";

export interface PledgeContribution {
    id: string;
    amount: number;
    paymentDate: string;
    reference: string | null;
    status: PledgeContributionStatus;
    reviewedBy: { id: string; email: string } | null;
    reviewedAt: string | null;
    financeNote: string | null;
    submittedBy: { id: string; firstname: string; lastname: string };
    pledge: {
        id: string;
        totalAmount: number;
        member: { id: string; firstname: string; lastname: string } | null;
        campaign: { id: string; name: string };
    };
    createdAt: string;
    updatedAt: string;
}

export interface PledgePagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface ContributionQuery {
    page?: number;
    status?: PledgeContributionStatus;
    pledgeId?: string;
    campaignId?: string;
}

export interface CreateCampaignPayload {
    name: string;
    fundId: string;
    description?: string;
    targetAmount: number;
    startDate: string;
    endDate: string;
}

export interface CreatePledgePayload {
    memberId?: string;
    guestName?: string;
    totalAmount: number;
    frequency: PledgeFrequency;
    startDate: string;
    notes?: string;
}

export function usePledges() {
    const [campaigns, setCampaigns] = useState<PledgeCampaign[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
    const [pledges, setPledges] = useState<Pledge[]>([]);
    const [pledgePagination, setPledgePagination] = useState<PledgePagination | null>(null);
    const [pledgePage, setPledgePage] = useState(1);
    const [isPledgesLoading, setIsPledgesLoading] = useState(false);

    const fetchCampaigns = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/admin/finance/pledges/campaigns");
            setCampaigns(res.data?.data ?? []);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch campaigns.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchPledges = useCallback(
        async (campaignId: string, targetPage = 1) => {
            setIsPledgesLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams({ campaignId, page: String(targetPage), limit: "20" });
                const res = await api.get(
                    `/admin/finance/pledges?${params}`
                );
                const outer = res.data?.data;
                const list: Pledge[] = Array.isArray(outer?.data) ? outer.data : [];
                setPledges(list);
                setPledgePage(targetPage);
                setPledgePagination({
                    page: outer?.page ?? targetPage,
                    limit: outer?.limit ?? 20,
                    totalCount: outer?.totalCount ?? list.length,
                    totalPages: outer?.totalPages ?? 1,
                });
            } catch (err: unknown) {
                const e = err as ApiError;
                setError(e?.response?.data?.message || e?.message || "Failed to fetch pledges.");
            } finally {
                setIsPledgesLoading(false);
            }
        },
        []
    );

    const selectCampaign = useCallback(
        (campaignId: string | null) => {
            setSelectedCampaignId(campaignId);
            if (campaignId) fetchPledges(campaignId, 1);
            else setPledges([]);
        },
        [fetchPledges]
    );

    const goToPledgePage = useCallback(
        (targetPage: number) => {
            if (selectedCampaignId) fetchPledges(selectedCampaignId, targetPage);
        },
        [fetchPledges, selectedCampaignId]
    );

    const createCampaign = useCallback(
        async (payload: CreateCampaignPayload): Promise<PledgeCampaign> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.post("/admin/finance/pledges/campaigns", payload);
                const created: PledgeCampaign = res.data?.data;
                setCampaigns((prev) => [created, ...prev]);
                return created;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to create campaign.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    const createPledge = useCallback(
        async (campaignId: string, payload: CreatePledgePayload): Promise<Pledge> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.post(
                    "/admin/finance/pledges",
                    { ...payload, campaignId }
                );
                if (selectedCampaignId === campaignId) {
                    fetchPledges(campaignId, pledgePage);
                }
                return res.data?.data;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to create pledge.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchPledges, selectedCampaignId, pledgePage]
    );

    const updatePledgeStatus = useCallback(
        async (pledgeId: string, status: PledgeStatus): Promise<Pledge> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.patch(`/admin/finance/pledges/${pledgeId}/status`, {
                    status,
                });
                const updated: Pledge = res.data?.data;
                setPledges((prev) => prev.map((p) => (p.id === pledgeId ? updated : p)));
                return updated;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to update pledge status.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    const updateCampaignActive = useCallback(
        async (campaignId: string, isActive: boolean): Promise<PledgeCampaign> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.patch(`/admin/finance/pledges/campaigns/${campaignId}/active`, {
                    isActive,
                });
                const updated: PledgeCampaign = res.data?.data;
                setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? updated : c)));
                return updated;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to update campaign.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    const [contributions, setContributions] = useState<PledgeContribution[]>([]);
    const [contributionsPagination, setContributionsPagination] = useState<PledgePagination | null>(null);
    const [isContributionsLoading, setIsContributionsLoading] = useState(false);
    const [lastContributionQuery, setLastContributionQuery] = useState<ContributionQuery>({});

    const fetchContributions = useCallback(async (query: ContributionQuery = {}) => {
        setIsContributionsLoading(true);
        setError(null);
        setLastContributionQuery(query);
        try {
            const params = new URLSearchParams({ page: String(query.page ?? 1), limit: "20" });
            if (query.status) params.set("status", query.status);
            if (query.pledgeId) params.set("pledgeId", query.pledgeId);
            if (query.campaignId) params.set("campaignId", query.campaignId);
            const res = await api.get(`/admin/finance/pledges/contributions?${params}`);
            const outer = res.data?.data;
            const list: PledgeContribution[] = Array.isArray(outer?.data) ? outer.data : [];
            setContributions(list);
            setContributionsPagination({
                page: outer?.page ?? query.page ?? 1,
                limit: outer?.limit ?? 20,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch pledge contributions.");
        } finally {
            setIsContributionsLoading(false);
        }
    }, []);

    const confirmContribution = useCallback(
        async (contributionId: string): Promise<PledgeContribution> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.post(`/admin/finance/pledges/contributions/${contributionId}/confirm`);
                const updated: PledgeContribution = res.data?.data;
                fetchContributions(lastContributionQuery);
                // Confirming changes amountPaid/totalPaid — refresh the campaigns list and,
                // if a campaign is open, its pledges too, so those views don't go stale.
                fetchCampaigns();
                if (selectedCampaignId) fetchPledges(selectedCampaignId, pledgePage);
                return updated;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to confirm contribution.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchContributions, lastContributionQuery, fetchCampaigns, fetchPledges, selectedCampaignId, pledgePage]
    );

    const declineContribution = useCallback(
        async (contributionId: string, financeNote: string): Promise<PledgeContribution> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.post(
                    `/admin/finance/pledges/contributions/${contributionId}/decline`,
                    { financeNote }
                );
                const updated: PledgeContribution = res.data?.data;
                fetchContributions(lastContributionQuery);
                return updated;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to decline contribution.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchContributions, lastContributionQuery]
    );

    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    return {
        campaigns,
        isLoading,
        isSubmitting,
        error,
        selectedCampaignId,
        pledges,
        pledgePagination,
        pledgePage,
        isPledgesLoading,
        selectCampaign,
        goToPledgePage,
        createCampaign,
        createPledge,
        updatePledgeStatus,
        updateCampaignActive,
        refetchCampaigns: fetchCampaigns,
        contributions,
        contributionsPagination,
        isContributionsLoading,
        fetchContributions,
        confirmContribution,
        declineContribution,
    };
}
