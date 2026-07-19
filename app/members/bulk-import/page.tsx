"use client";

import React, { useRef, useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, Download, Upload, CheckCircle2, AlertTriangle, RefreshCw, FileSpreadsheet,
} from "lucide-react";
import {
    useMemberImport, downloadMemberImportTemplate, MemberImportJob, MemberImportCommitResult,
} from "@/hooks/use-member-import";
import { DismissibleError } from "@/components/ui/dismissible-error";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

function BulkImportPage() {
    const router = useRouter();
    const { isSubmitting, previewImport, commitImport } = useMemberImport();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [job, setJob] = useState<MemberImportJob | null>(null);
    const [result, setResult] = useState<MemberImportCommitResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(null);
        setResult(null);
        try {
            const previewed = await previewImport(file);
            setJob(previewed);
        } catch (err: unknown) {
            const apiErr = err as ApiError;
            setError(apiErr?.message || "Failed to preview import file.");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleCommit = async () => {
        if (!job) return;
        setError(null);
        try {
            const res = await commitImport(job.id);
            setResult(res);
        } catch (err: unknown) {
            const apiErr = err as ApiError;
            setError(apiErr?.message || "Failed to commit import.");
        }
    };

    const invalidRowCount = job ? job.totalRows - job.validRows : 0;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-lg border border-[#121212]/10 hover:bg-[#F4F1EA] transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 text-[#8A817C]" />
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-[#121212]">Bulk Import Members</h1>
                    <p className="text-xs text-[#8A817C]">
                        Download the template, fill in member details, then upload it here
                    </p>
                </div>
            </div>

            <DismissibleError message={error} />

            {/* Result banner */}
            {result && (
                <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-green-800 text-sm space-y-2">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                            {result.createdCount} member{result.createdCount !== 1 ? "s" : ""} created
                            {result.failedRows.length > 0 ? `, ${result.failedRows.length} failed` : ""}.
                            Each new member has been emailed a temporary password.
                        </span>
                    </div>
                    {result.failedRows.length > 0 && (
                        <ul className="pl-6 space-y-0.5 text-xs text-green-700 list-disc">
                            {result.failedRows.map((f) => (
                                <li key={f.rowNumber}>Row {f.rowNumber} — {f.reason}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {!result && (
                <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-6 space-y-5">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-[#8A817C]" />
                        <h2 className="text-sm font-semibold text-[#121212]">1. Get the Template</h2>
                    </div>
                    <p className="text-xs text-[#8A817C]">
                        Required columns are marked with *. Fill in a Department name only for rows
                        that should also be created as workers.
                    </p>
                    <button
                        onClick={() => downloadMemberImportTemplate()}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#121212]/10 text-sm font-medium text-[#121212] hover:bg-[#F4F1EA] transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Download Template
                    </button>

                    <div className="border-t border-[#121212]/5 pt-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4 text-[#8A817C]" />
                            <h2 className="text-sm font-semibold text-[#121212]">2. Upload the Filled Template</h2>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx"
                            onChange={handleFileChange}
                            disabled={isSubmitting}
                            className="block w-full text-sm text-[#121212] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:uppercase file:tracking-wider file:bg-[#121212] file:text-white hover:file:bg-[#121212]/90 disabled:opacity-50"
                        />
                        {isSubmitting && !job && (
                            <p className="flex items-center gap-1.5 text-xs text-[#8A817C]">
                                <RefreshCw className="w-3 h-3 animate-spin" /> Validating rows…
                            </p>
                        )}
                    </div>
                </div>
            )}

            {job && !result && (
                <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-[#121212]/5 flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-[#121212]">Review — {job.originalFilename}</h2>
                            <p className="text-xs text-[#8A817C] mt-1">
                                {job.validRows} of {job.totalRows} rows are ready to import
                                {invalidRowCount > 0 ? `, ${invalidRowCount} have errors and will be skipped` : ""}.
                            </p>
                        </div>
                        <button
                            onClick={handleCommit}
                            disabled={isSubmitting || job.validRows === 0}
                            className="px-4 py-2 rounded-lg bg-[#121212] text-white text-sm font-medium hover:bg-[#121212]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting
                                ? "Importing…"
                                : `Confirm Import (${job.validRows})`}
                        </button>
                    </div>

                    <div className="overflow-x-auto max-h-[480px]">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-[#F4F1EA]">
                                <tr className="border-b border-[#121212]/5">
                                    <th className="p-3 text-left text-xs font-semibold text-[#8A817C] uppercase tracking-wider w-16">Row</th>
                                    <th className="p-3 text-left text-xs font-semibold text-[#8A817C] uppercase tracking-wider">Name</th>
                                    <th className="p-3 text-left text-xs font-semibold text-[#8A817C] uppercase tracking-wider">Email</th>
                                    <th className="p-3 text-left text-xs font-semibold text-[#8A817C] uppercase tracking-wider">Department</th>
                                    <th className="p-3 text-left text-xs font-semibold text-[#8A817C] uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {job.rows.map((row) => {
                                    const hasErrors = row.errors.length > 0;
                                    return (
                                        <tr
                                            key={row.id}
                                            className={`border-b border-[#121212]/5 ${hasErrors ? "bg-red-50/60" : ""}`}
                                        >
                                            <td className="p-3 text-[#8A817C] font-mono text-xs">{row.rowNumber}</td>
                                            <td className="p-3 text-[#121212]">
                                                {String(row.data.firstname ?? "")} {String(row.data.lastname ?? "")}
                                            </td>
                                            <td className="p-3 text-[#8A817C]">{String(row.data.email ?? "—")}</td>
                                            <td className="p-3 text-[#8A817C]">{String(row.data.department ?? "—")}</td>
                                            <td className="p-3">
                                                {hasErrors ? (
                                                    <div className="flex items-start gap-1.5 text-xs text-red-700">
                                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                                        <span>{row.errors.join("; ")}</span>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs text-green-700">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default withAuth(BulkImportPage, { requiredPermission: 'members:write' });
