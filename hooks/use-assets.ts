import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

export type AssetStatus = "ACTIVE" | "INACTIVE" | "UNDER_MAINTENANCE" | "DECOMMISSIONED";
export type AssetCondition = "GOOD" | "FAIR" | "POOR";
export type MaintenanceFrequencyUnit = "DAYS" | "WEEKS" | "MONTHS";
export type MaintenanceRecordType = "SCHEDULED" | "UNPLANNED";
export type MaintenanceCompletionStatus = "IN_PROGRESS" | "COMPLETED";

export interface Asset {
    id: string;
    tagNumber: string;
    name: string;
    description?: string;
    category: string;
    location?: string;
    status: AssetStatus;
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    purchaseDate?: string;
    purchaseValue?: number;
    warrantyExpiry?: string;
    vendorName?: string;
    vendorContact?: string;
    department?: { id: string; name: string } | null;
    maintenanceEnabled: boolean;
    inventoryEnabled: boolean;
    inStorage?: number;
    inUse?: number;
    underRepair?: number;
    writtenOff?: number;
    createdAt: string;
    updatedAt: string;
}

export interface AssetCheckout {
    id: string;
    asset: { id: string; name: string; tagNumber: string };
    checkedOutToMember?: { id: string; firstname: string; lastname: string } | null;
    checkedOutToDepartment?: { id: string; name: string } | null;
    checkedOutAt: string;
    expectedReturnAt?: string;
    returnedAt?: string;
    purpose?: string;
    notes?: string;
}

export interface MaintenanceRecord {
    id: string;
    type: MaintenanceRecordType;
    performedAt: string;
    performedBy: string;
    cost?: number;
    notes: string;
    conditionAfter: AssetCondition;
    completionStatus: MaintenanceCompletionStatus;
}

export interface AssetPagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface CreateAssetDto {
    tagNumber: string;
    name: string;
    description?: string;
    category: string;
    location?: string;
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    purchaseDate?: string;
    purchaseValue?: number;
    warrantyExpiry?: string;
    vendorName?: string;
    vendorContact?: string;
    departmentId?: string;
    maintenanceEnabled?: boolean;
    inventoryEnabled?: boolean;
}

export interface UpdateInventoryDto {
    inStorage?: number;
    inUse?: number;
    underRepair?: number;
    writtenOff?: number;
}

export interface CreateCheckoutDto {
    checkedOutToMemberId?: string;
    checkedOutToDepartmentId?: string;
    expectedReturnAt?: string;
    purpose?: string;
    notes?: string;
}

export function useAssets(defaultLimit = 20) {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [pagination, setPagination] = useState<AssetPagination | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentParams, setCurrentParams] = useState<{
        page: number; category?: string; status?: AssetStatus | ""; search?: string;
    }>({ page: 1 });

    const fetchAssets = useCallback(async (params?: {
        page?: number; category?: string; status?: AssetStatus | ""; search?: string;
    }) => {
        const merged = { ...currentParams, ...params };
        setCurrentParams(merged);
        setIsLoading(true);
        setError(null);
        try {
            const q = new URLSearchParams();
            q.set("page", String(merged.page ?? 1));
            q.set("limit", String(defaultLimit));
            if (merged.category) q.set("category", merged.category);
            if (merged.status) q.set("status", merged.status);
            if (merged.search) q.set("search", merged.search);

            const res = await api.get(`/admin/assets?${q}`);
            const outer = res.data?.data;
            const list: Asset[] = Array.isArray(outer?.data) ? outer.data : [];
            setAssets(list);
            setPagination({
                page: outer?.page ?? merged.page ?? 1,
                limit: outer?.limit ?? defaultLimit,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || "Failed to fetch assets.");
        } finally {
            setIsLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultLimit]);

    const createAsset = useCallback(async (dto: CreateAssetDto): Promise<Asset> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post("/admin/assets", dto);
            const created: Asset = res.data?.data;
            setAssets((prev) => [created, ...prev]);
            return created;
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || "Failed to create asset.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateAsset = useCallback(async (id: string, dto: Partial<CreateAssetDto>): Promise<Asset> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/assets/${id}`, dto);
            const updated: Asset = res.data?.data;
            setAssets((prev) => prev.map((a) => (a.id === id ? updated : a)));
            return updated;
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || "Failed to update asset.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const updateInventory = useCallback(async (id: string, dto: UpdateInventoryDto): Promise<Asset> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/assets/${id}/inventory`, dto);
            const updated: Asset = res.data?.data;
            setAssets((prev) => prev.map((a) => (a.id === id ? updated : a)));
            return updated;
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || "Failed to update inventory.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const checkoutAsset = useCallback(async (id: string, dto: CreateCheckoutDto): Promise<AssetCheckout> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/admin/assets/${id}/checkouts`, dto);
            return res.data?.data;
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || "Failed to checkout asset.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const returnAsset = useCallback(async (assetId: string, checkoutId: string, notes?: string): Promise<AssetCheckout> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/assets/${assetId}/checkouts/${checkoutId}/return`, { notes });
            return res.data?.data;
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || "Failed to return asset.";
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const fetchAssetCheckouts = useCallback(async (assetId: string, page = 1): Promise<{ checkouts: AssetCheckout[]; pagination: AssetPagination | null }> => {
        try {
            const res = await api.get(`/admin/assets/${assetId}/checkouts?page=${page}&limit=10`);
            const outer = res.data?.data;
            const list: AssetCheckout[] = Array.isArray(outer?.data) ? outer.data : [];
            return {
                checkouts: list,
                pagination: outer?.totalPages !== undefined ? {
                    page: outer.page, limit: outer.limit,
                    totalCount: outer.totalCount, totalPages: outer.totalPages,
                } : null,
            };
        } catch {
            return { checkouts: [], pagination: null };
        }
    }, []);

    const goToPage = useCallback((page: number) => {
        fetchAssets({ ...currentParams, page });
    }, [fetchAssets, currentParams]);

    useEffect(() => {
        fetchAssets({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const clearError = useCallback(() => setError(null), []);
    return {
        assets,
        pagination,
        isLoading,
        isSubmitting,
        error,

        clearError,
        fetchAssets,
        createAsset,
        updateAsset,
        updateInventory,
        checkoutAsset,
        returnAsset,
        fetchAssetCheckouts,
        goToPage,
        refetch: () => fetchAssets(currentParams),
    };
}
