import { useCallback, useState } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export interface MemberImportRow {
    id: string;
    rowNumber: number;
    data: Record<string, unknown>;
    errors: string[];
    status: "PENDING" | "CREATED" | "FAILED";
    createdMemberId: string | null;
    commitError: string | null;
}

export interface MemberImportJob {
    id: string;
    originalFilename: string;
    status: "READY_FOR_REVIEW" | "COMMITTED";
    totalRows: number;
    validRows: number;
    createdCount: number;
    failedCommitCount: number;
    rows: MemberImportRow[];
}

export interface MemberImportCommitResult {
    createdCount: number;
    failedRows: { rowNumber: number; reason: string }[];
}

export async function downloadMemberImportTemplate(): Promise<void> {
    const res = await api.get("/members/bulk-import/template", { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "member-import-template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
}

export function useMemberImport() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const previewImport = useCallback(async (file: File): Promise<MemberImportJob> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await api.post("/members/bulk-import/preview", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return res.data?.data as MemberImportJob;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to preview import file.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const commitImport = useCallback(async (jobId: string): Promise<MemberImportCommitResult> => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await api.post(`/members/bulk-import/${jobId}/commit`);
            return res.data?.data as MemberImportCommitResult;
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || "Failed to commit import.";
            setError(message);
            throw new Error(message);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    return { isSubmitting, error, previewImport, commitImport };
}
