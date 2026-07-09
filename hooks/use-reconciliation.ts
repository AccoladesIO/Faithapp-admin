import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type ReconciliationJobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type RowStatus = "PENDING" | "CONFIRMED" | "SKIPPED" | "POSTED";

export interface ReconciliationJob {
    id: string;
    filename: string;
    status: ReconciliationJobStatus;
    totalRows: number;
    confirmedRows: number;
    skippedRows: number;
    postedRows: number;
    profile: { id: string; name: string } | null;
    uploadedBy: { id: string; name: string; email: string } | null;
    createdAt: string;
    updatedAt: string;
}

export interface ReconciliationRow {
    id: string;
    rowIndex: number;
    date: string;
    narration: string;
    amount: number;
    creditDebit: "CREDIT" | "DEBIT";
    status: RowStatus;
    confirmedAccount: { id: string; name: string; code: string } | null;
    fingerprint: string;
    createdAt: string;
}

export interface PostConfirmedPayload {
    bankAccountId: string;
    accountingPeriodId: string;
}

export function useReconciliation() {
    const [jobs, setJobs] = useState<ReconciliationJob[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [rows, setRows] = useState<ReconciliationRow[]>([]);
    const [isRowsLoading, setIsRowsLoading] = useState(false);

    const fetchJobs = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/admin/finance/reconciliation/jobs");
            const outer = res.data?.data;
            setJobs(Array.isArray(outer) ? outer : (outer?.data ?? []));
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch reconciliation jobs.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchRows = useCallback(async (jobId: string) => {
        setIsRowsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/admin/finance/reconciliation/jobs/${jobId}/rows`);
            setRows(res.data?.data ?? []);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch rows.");
        } finally {
            setIsRowsLoading(false);
        }
    }, []);

    const selectJob = useCallback(
        (jobId: string | null) => {
            setSelectedJobId(jobId);
            if (jobId) fetchRows(jobId);
            else setRows([]);
        },
        [fetchRows]
    );

    const uploadStatement = useCallback(
        async (file: File, profileId?: string): Promise<ReconciliationJob> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const form = new FormData();
                form.append("file", file);
                const url = profileId
                    ? `/admin/finance/reconciliation/upload?profileId=${profileId}`
                    : "/admin/finance/reconciliation/upload";
                const res = await api.post(url, form, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                const created: ReconciliationJob = res.data?.data;
                setJobs((prev) => [created, ...prev]);
                return created;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to upload bank statement.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    const confirmRow = useCallback(
        async (jobId: string, rowId: string, accountId: string): Promise<ReconciliationRow> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.patch(
                    `/admin/finance/reconciliation/jobs/${jobId}/rows/${rowId}/confirm`,
                    { accountId }
                );
                const updated: ReconciliationRow = res.data?.data;
                setRows((prev) => prev.map((r) => (r.id === rowId ? updated : r)));
                return updated;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to confirm row.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    const skipRow = useCallback(
        async (jobId: string, rowId: string): Promise<ReconciliationRow> => {
            setIsSubmitting(true);
            setError(null);
            try {
                const res = await api.patch(
                    `/admin/finance/reconciliation/jobs/${jobId}/rows/${rowId}/skip`
                );
                const updated: ReconciliationRow = res.data?.data;
                setRows((prev) => prev.map((r) => (r.id === rowId ? updated : r)));
                return updated;
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to skip row.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        []
    );

    const bulkConfirm = useCallback(
        async (jobId: string, rowIds: string[], accountId: string): Promise<void> => {
            setIsSubmitting(true);
            setError(null);
            try {
                await api.post(`/admin/finance/reconciliation/jobs/${jobId}/bulk-confirm`, { rowIds, accountId });
                if (selectedJobId === jobId) fetchRows(jobId);
            } catch (err: unknown) {
                const e = err as ApiError;
                const message = e?.response?.data?.message || e?.message || "Failed to bulk confirm rows.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchRows, selectedJobId]
    );

    const postConfirmed = useCallback(
        async (jobId: string, payload: PostConfirmedPayload): Promise<void> => {
            setIsSubmitting(true);
            setError(null);
            try {
                await api.post(
                    `/admin/finance/reconciliation/jobs/${jobId}/post-confirmed`,
                    payload
                );
                fetchJobs();
                if (selectedJobId === jobId) fetchRows(jobId);
            } catch (err: unknown) {
                const e = err as ApiError;
                const message =
                    e?.response?.data?.message || e?.message || "Failed to post confirmed rows.";
                setError(message);
                throw new Error(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        [fetchJobs, fetchRows, selectedJobId]
    );

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    return {
        jobs,
        isLoading,
        isSubmitting,
        error,
        selectedJobId,
        rows,
        isRowsLoading,
        selectJob,
        uploadStatement,
        confirmRow,
        bulkConfirm,
        skipRow,
        postConfirmed,
        refetch: fetchJobs,
    };
}
