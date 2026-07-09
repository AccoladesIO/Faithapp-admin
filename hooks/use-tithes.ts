import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type CurrencyCode = "NGN" | "USD" | "GBP" | "EUR";
export type TitheBatchStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type TitheUnmatchedStatus = "PENDING" | "MATCHED" | "DISMISSED";
export type TitheDisputeStatus = "PENDING" | "CONFIRMED_VALID" | "REJECTED";
export type TitheProofStatus = "PENDING" | "CONFIRMED" | "DECLINED";
export type TitheSource = "MANUAL_PROOF" | "VIRTUAL_ACCOUNT" | "PAYMENT_GATEWAY";

export interface TitheMemberRef {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
}

export interface TitheAccount {
    id: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    currency: CurrencyCode;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface TitheAccountSummary {
    account: TitheAccount;
    fromMonth: string | null;
    toMonth: string | null;
    bulkTotal: number;
    bulkCount: number;
    proofTotal: number;
    proofCount: number;
}

export interface TitheUploadBatch {
    id: string;
    uploadedBy: { id: string; member: TitheMemberRef };
    titheAccount: TitheAccount;
    fileName: string;
    status: TitheBatchStatus;
    totalRows: number;
    matchedRows: number;
    unmatchedRows: number;
    disputedRows: number;
    errorMessage: string | null;
    processedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface TitheRecord {
    id: string;
    member: TitheMemberRef;
    batch: { id: string } | null;
    amount: number;
    paymentDate: string;
    reference: string | null;
    bankName: string | null;
    source: TitheSource;
    createdAt: string;
    updatedAt: string;
}

export interface TitheUnmatchedRecord {
    id: string;
    batch: { id: string };
    rawEmail: string;
    amount: number;
    paymentDate: string;
    reference: string | null;
    bankName: string | null;
    status: TitheUnmatchedStatus;
    matchedMember: TitheMemberRef | null;
    resolvedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface TitheDisputeRecord {
    id: string;
    batch: { id: string };
    member: TitheMemberRef;
    amount: number;
    paymentDate: string;
    reference: string | null;
    bankName: string | null;
    status: TitheDisputeStatus;
    reviewedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface TithePaymentProof {
    id: string;
    member: TitheMemberRef;
    titheAccount: TitheAccount;
    amount: number;
    paymentDate: string;
    reference: string | null;
    proofUrl: string;
    status: TitheProofStatus;
    financeNote: string | null;
    reviewedAt: string | null;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface TithePagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface CreateTitheAccountPayload {
    bankName: string;
    accountNumber: string;
    accountName: string;
    currency: CurrencyCode;
    description?: string;
}

export interface UpdateTitheAccountPayload {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    currency?: CurrencyCode;
    description?: string;
    isActive?: boolean;
}

export interface TitheRecordFilters {
    memberId?: string;
    departmentId?: string;
    fromMonth?: string;
    toMonth?: string;
    search?: string;
    accountId?: string;
}

export function useTitheAccounts() {
    const [accounts, setAccounts] = useState<TitheAccount[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAccounts = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/admin/tithes/accounts");
            const list: TitheAccount[] = Array.isArray(res.data?.data) ? res.data.data : [];
            setAccounts(list);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch tithe accounts.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createAccount = useCallback(
        async (payload: CreateTitheAccountPayload): Promise<TitheAccount> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.post("/admin/tithes/accounts", payload);
                const created: TitheAccount = res.data?.data;
                fetchAccounts();
                return created;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message = e?.response?.data?.message || e?.message || "Failed to create tithe account.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchAccounts]
    );

    const updateAccount = useCallback(
        async (id: string, payload: UpdateTitheAccountPayload): Promise<TitheAccount> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.patch(`/admin/tithes/accounts/${id}`, payload);
                const updated: TitheAccount = res.data?.data;
                setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
                return updated;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message = e?.response?.data?.message || e?.message || "Failed to update tithe account.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    const fetchSummary = useCallback(
        async (id: string, fromMonth?: string, toMonth?: string): Promise<TitheAccountSummary> => {
            const params = new URLSearchParams();
            if (fromMonth) params.set("fromMonth", fromMonth);
            if (toMonth) params.set("toMonth", toMonth);
            const res = await api.get(`/admin/tithes/accounts/${id}/summary?${params}`);
            return res.data?.data as TitheAccountSummary;
        },
        []
    );

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    return {
        accounts,
        isLoading,
        isSubmitting,
        error,
        createAccount,
        updateAccount,
        fetchSummary,
        refetch: fetchAccounts,
    };
}

export async function downloadTitheTemplate(): Promise<void> {
    const res = await api.get("/admin/tithes/template", { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tithe-upload-template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
}

export function useTitheBatches(defaultLimit = 20) {
    const [batches, setBatches] = useState<TitheUploadBatch[]>([]);
    const [pagination, setPagination] = useState<TithePagination | null>(null);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<TitheBatchStatus | "">("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBatches = useCallback(
        async (targetPage = 1, status: TitheBatchStatus | "" = "") => {
            setIsLoading(true);
            setBatches([]);
            setError(null);
            try {
                const params = new URLSearchParams({ page: String(targetPage), limit: String(defaultLimit) });
                if (status) params.set("status", status);
                const res = await api.get(`/admin/tithes/batches?${params}`);
                const outer = res.data?.data;
                const list: TitheUploadBatch[] = Array.isArray(outer?.data) ? outer.data : [];
                setBatches(list);
                setPage(targetPage);
                setPagination({
                    page: outer?.page ?? targetPage,
                    limit: outer?.limit ?? defaultLimit,
                    totalCount: outer?.totalCount ?? list.length,
                    totalPages: outer?.totalPages ?? 1,
                });
            } catch (err: unknown) {
                const e = err as ApiError;
                setError(e?.response?.data?.message || e?.message || "Failed to fetch batches.");
            } finally {
                setIsLoading(false);
            }
        },
        [defaultLimit]
    );

    const applyStatusFilter = useCallback(
        (status: TitheBatchStatus | "") => {
            setStatusFilter(status);
            fetchBatches(1, status);
        },
        [fetchBatches]
    );

    const goToPage = useCallback(
        (targetPage: number) => {
            fetchBatches(targetPage, statusFilter);
        },
        [fetchBatches, statusFilter]
    );

    const fetchBatch = useCallback(async (id: string): Promise<TitheUploadBatch> => {
        const res = await api.get(`/admin/tithes/batches/${id}`);
        return res.data?.data as TitheUploadBatch;
    }, []);

    const uploadBatch = useCallback(
        async (formData: FormData): Promise<{ batchId: string; totalRows: number; message: string }> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.post("/admin/tithes/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                fetchBatches(1, statusFilter);
                return res.data?.data;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message = e?.response?.data?.message || e?.message || "Failed to upload batch.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchBatches, statusFilter]
    );

    const requeueBatch = useCallback(
        async (id: string): Promise<void> => {
            setIsSubmitting(true);
            setError(null);
            try {
                await api.post(`/admin/tithes/batches/${id}/requeue`);
                fetchBatches(page, statusFilter);
            } catch (err: unknown) {
                const e = err as ApiError;
                const message = e?.response?.data?.message || e?.message || "Failed to requeue batch.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchBatches, page, statusFilter]
    );

    useEffect(() => {
        fetchBatches(1);
    }, [fetchBatches]);

    return {
        batches,
        pagination,
        page,
        statusFilter,
        isLoading,
        isSubmitting,
        error,
        applyStatusFilter,
        goToPage,
        fetchBatch,
        uploadBatch,
        requeueBatch,
        refetch: () => fetchBatches(page, statusFilter),
    };
}

export function useTitheUnmatched(defaultLimit = 20) {
    const [records, setRecords] = useState<TitheUnmatchedRecord[]>([]);
    const [pagination, setPagination] = useState<TithePagination | null>(null);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<TitheUnmatchedStatus | "">("");
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchUnmatched = useCallback(
        async (targetPage = 1, status: TitheUnmatchedStatus | "" = "", q = "") => {
            setIsLoading(true);
            setRecords([]);
            setError(null);
            try {
                const params = new URLSearchParams({ page: String(targetPage), limit: String(defaultLimit) });
                if (status) params.set("status", status);
                if (q.trim()) params.set("search", q.trim());
                const res = await api.get(`/admin/tithes/unmatched?${params}`);
                const outer = res.data?.data;
                const list: TitheUnmatchedRecord[] = Array.isArray(outer?.data) ? outer.data : [];
                setRecords(list);
                setPage(targetPage);
                setPagination({
                    page: outer?.page ?? targetPage,
                    limit: outer?.limit ?? defaultLimit,
                    totalCount: outer?.totalCount ?? list.length,
                    totalPages: outer?.totalPages ?? 1,
                });
            } catch (err: unknown) {
                const e = err as ApiError;
                setError(e?.response?.data?.message || e?.message || "Failed to fetch unmatched records.");
            } finally {
                setIsLoading(false);
            }
        },
        [defaultLimit]
    );

    const applyStatusFilter = useCallback(
        (status: TitheUnmatchedStatus | "") => {
            setStatusFilter(status);
            fetchUnmatched(1, status, search);
        },
        [fetchUnmatched, search]
    );

    const applySearch = useCallback(
        (q: string) => {
            setSearch(q);
            fetchUnmatched(1, statusFilter, q);
        },
        [fetchUnmatched, statusFilter]
    );

    const goToPage = useCallback(
        (targetPage: number) => {
            fetchUnmatched(targetPage, statusFilter, search);
        },
        [fetchUnmatched, statusFilter, search]
    );

    const matchUnmatched = useCallback(
        async (id: string, memberId: string): Promise<void> => {
            setIsSubmitting(true);
            setError(null);
            try {
                await api.post(`/admin/tithes/unmatched/${id}/match`, { memberId });
                fetchUnmatched(page, statusFilter, search);
            } catch (err: unknown) {
                const e = err as ApiError;
                const message = e?.response?.data?.message || e?.message || "Failed to match record.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchUnmatched, page, statusFilter, search]
    );

    const dismissUnmatched = useCallback(
        async (id: string): Promise<void> => {
            setIsSubmitting(true);
            setError(null);
            try {
                await api.post(`/admin/tithes/unmatched/${id}/dismiss`);
                fetchUnmatched(page, statusFilter, search);
            } catch (err: unknown) {
                const e = err as ApiError;
                const message = e?.response?.data?.message || e?.message || "Failed to dismiss record.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchUnmatched, page, statusFilter, search]
    );

    useEffect(() => {
        fetchUnmatched(1, "");
    }, [fetchUnmatched]);

    return {
        records,
        pagination,
        page,
        statusFilter,
        search,
        isLoading,
        isSubmitting,
        error,
        applyStatusFilter,
        applySearch,
        goToPage,
        matchUnmatched,
        dismissUnmatched,
        refetch: () => fetchUnmatched(page, statusFilter, search),
    };
}

export function useTitheDisputes(defaultLimit = 20) {
    const [disputes, setDisputes] = useState<TitheDisputeRecord[]>([]);
    const [pagination, setPagination] = useState<TithePagination | null>(null);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<TitheDisputeStatus | "">("");
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDisputes = useCallback(
        async (targetPage = 1, status: TitheDisputeStatus | "" = "", q = "") => {
            setIsLoading(true);
            setDisputes([]);
            setError(null);
            try {
                const params = new URLSearchParams({ page: String(targetPage), limit: String(defaultLimit) });
                if (status) params.set("status", status);
                if (q.trim()) params.set("search", q.trim());
                const res = await api.get(`/admin/tithes/disputes?${params}`);
                const outer = res.data?.data;
                const list: TitheDisputeRecord[] = Array.isArray(outer?.data) ? outer.data : [];
                setDisputes(list);
                setPage(targetPage);
                setPagination({
                    page: outer?.page ?? targetPage,
                    limit: outer?.limit ?? defaultLimit,
                    totalCount: outer?.totalCount ?? list.length,
                    totalPages: outer?.totalPages ?? 1,
                });
            } catch (err: unknown) {
                const e = err as ApiError;
                setError(e?.response?.data?.message || e?.message || "Failed to fetch disputes.");
            } finally {
                setIsLoading(false);
            }
        },
        [defaultLimit]
    );

    const applyStatusFilter = useCallback(
        (status: TitheDisputeStatus | "") => {
            setStatusFilter(status);
            fetchDisputes(1, status, search);
        },
        [fetchDisputes, search]
    );

    const applySearch = useCallback(
        (q: string) => {
            setSearch(q);
            fetchDisputes(1, statusFilter, q);
        },
        [fetchDisputes, statusFilter]
    );

    const goToPage = useCallback(
        (targetPage: number) => {
            fetchDisputes(targetPage, statusFilter, search);
        },
        [fetchDisputes, statusFilter, search]
    );

    const approveDispute = useCallback(
        async (id: string): Promise<void> => {
            setIsSubmitting(true);
            setError(null);
            try {
                await api.post(`/admin/tithes/disputes/${id}/approve`);
                fetchDisputes(page, statusFilter, search);
            } catch (err: unknown) {
                const e = err as ApiError;
                const message = e?.response?.data?.message || e?.message || "Failed to approve dispute.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchDisputes, page, statusFilter, search]
    );

    const rejectDispute = useCallback(
        async (id: string): Promise<void> => {
            setIsSubmitting(true);
            setError(null);
            try {
                await api.post(`/admin/tithes/disputes/${id}/reject`);
                fetchDisputes(page, statusFilter, search);
            } catch (err: unknown) {
                const e = err as ApiError;
                const message = e?.response?.data?.message || e?.message || "Failed to reject dispute.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchDisputes, page, statusFilter, search]
    );

    useEffect(() => {
        fetchDisputes(1, "");
    }, [fetchDisputes]);

    return {
        disputes,
        pagination,
        page,
        statusFilter,
        search,
        isLoading,
        isSubmitting,
        error,
        applyStatusFilter,
        applySearch,
        goToPage,
        approveDispute,
        rejectDispute,
        refetch: () => fetchDisputes(page, statusFilter, search),
    };
}

export function useTitheProofs(defaultLimit = 20) {
    const [proofs, setProofs] = useState<TithePaymentProof[]>([]);
    const [pagination, setPagination] = useState<TithePagination | null>(null);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<TitheProofStatus | "">("");
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProofs = useCallback(
        async (targetPage = 1, status: TitheProofStatus | "" = "", q = "") => {
            setIsLoading(true);
            setProofs([]);
            setError(null);
            try {
                const params = new URLSearchParams({ page: String(targetPage), limit: String(defaultLimit) });
                if (status) params.set("status", status);
                if (q.trim()) params.set("search", q.trim());
                const res = await api.get(`/admin/tithes/proofs?${params}`);
                const outer = res.data?.data;
                const list: TithePaymentProof[] = Array.isArray(outer?.data) ? outer.data : [];
                setProofs(list);
                setPage(targetPage);
                setPagination({
                    page: outer?.page ?? targetPage,
                    limit: outer?.limit ?? defaultLimit,
                    totalCount: outer?.totalCount ?? list.length,
                    totalPages: outer?.totalPages ?? 1,
                });
            } catch (err: unknown) {
                const e = err as ApiError;
                setError(e?.response?.data?.message || e?.message || "Failed to fetch proofs.");
            } finally {
                setIsLoading(false);
            }
        },
        [defaultLimit]
    );

    const applyStatusFilter = useCallback(
        (status: TitheProofStatus | "") => {
            setStatusFilter(status);
            fetchProofs(1, status, search);
        },
        [fetchProofs, search]
    );

    const applySearch = useCallback(
        (q: string) => {
            setSearch(q);
            fetchProofs(1, statusFilter, q);
        },
        [fetchProofs, statusFilter]
    );

    const goToPage = useCallback(
        (targetPage: number) => {
            fetchProofs(targetPage, statusFilter, search);
        },
        [fetchProofs, statusFilter, search]
    );

    const confirmProof = useCallback(
        async (id: string): Promise<void> => {
            setIsSubmitting(true);
            setError(null);
            try {
                await api.post(`/admin/tithes/proofs/${id}/confirm`);
                fetchProofs(page, statusFilter, search);
            } catch (err: unknown) {
                const e = err as ApiError;
                const message = e?.response?.data?.message || e?.message || "Failed to confirm proof.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchProofs, page, statusFilter, search]
    );

    const declineProof = useCallback(
        async (id: string, financeNote: string): Promise<void> => {
            setIsSubmitting(true);
            setError(null);
            try {
                await api.post(`/admin/tithes/proofs/${id}/decline`, { financeNote });
                fetchProofs(page, statusFilter, search);
            } catch (err: unknown) {
                const e = err as ApiError;
                const message = e?.response?.data?.message || e?.message || "Failed to decline proof.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchProofs, page, statusFilter, search]
    );

    useEffect(() => {
        fetchProofs(1, "");
    }, [fetchProofs]);

    return {
        proofs,
        pagination,
        page,
        statusFilter,
        search,
        isLoading,
        isSubmitting,
        error,
        applyStatusFilter,
        applySearch,
        goToPage,
        confirmProof,
        declineProof,
        refetch: () => fetchProofs(page, statusFilter, search),
    };
}

export function useTitheRecords(defaultLimit = 20) {
    const [records, setRecords] = useState<TitheRecord[]>([]);
    const [pagination, setPagination] = useState<TithePagination | null>(null);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<TitheRecordFilters>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRecords = useCallback(
        async (targetPage = 1, activeFilters: TitheRecordFilters = {}) => {
            setIsLoading(true);
            setRecords([]);
            setError(null);
            try {
                const params = new URLSearchParams({ page: String(targetPage), limit: String(defaultLimit) });
                if (activeFilters.memberId) params.set("memberId", activeFilters.memberId);
                if (activeFilters.departmentId) params.set("departmentId", activeFilters.departmentId);
                if (activeFilters.fromMonth) params.set("fromMonth", activeFilters.fromMonth);
                if (activeFilters.toMonth) params.set("toMonth", activeFilters.toMonth);
                if (activeFilters.search) params.set("search", activeFilters.search);
                if (activeFilters.accountId) params.set("accountId", activeFilters.accountId);
                const res = await api.get(`/admin/tithes/records?${params}`);
                const outer = res.data?.data;
                const list: TitheRecord[] = Array.isArray(outer?.data) ? outer.data : [];
                setRecords(list);
                setPage(targetPage);
                setPagination({
                    page: outer?.page ?? targetPage,
                    limit: outer?.limit ?? defaultLimit,
                    totalCount: outer?.totalCount ?? list.length,
                    totalPages: outer?.totalPages ?? 1,
                });
            } catch (err: unknown) {
                const e = err as ApiError;
                setError(e?.response?.data?.message || e?.message || "Failed to fetch tithe records.");
            } finally {
                setIsLoading(false);
            }
        },
        [defaultLimit]
    );

    const applyFilters = useCallback(
        (newFilters: TitheRecordFilters) => {
            setFilters(newFilters);
            fetchRecords(1, newFilters);
        },
        [fetchRecords]
    );

    const goToPage = useCallback(
        (targetPage: number) => {
            fetchRecords(targetPage, filters);
        },
        [fetchRecords, filters]
    );

    useEffect(() => {
        fetchRecords(1, {});
    }, [fetchRecords]);

    return {
        records,
        pagination,
        page,
        filters,
        isLoading,
        error,
        applyFilters,
        goToPage,
        refetch: () => fetchRecords(page, filters),
    };
}

export async function downloadTitheRecords(filters: TitheRecordFilters = {}): Promise<void> {
    const params = new URLSearchParams();
    if (filters.memberId) params.set("memberId", filters.memberId);
    if (filters.departmentId) params.set("departmentId", filters.departmentId);
    if (filters.fromMonth) params.set("fromMonth", filters.fromMonth);
    if (filters.toMonth) params.set("toMonth", filters.toMonth);
    if (filters.search) params.set("search", filters.search);
    if (filters.accountId) params.set("accountId", filters.accountId);
    const res = await api.get(`/admin/tithes/records/download?${params}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tithe-records.xlsx";
    a.click();
    URL.revokeObjectURL(url);
}
