"use client";

import React, { useRef, useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    GitMerge,
    Upload,
    X,
    RefreshCw,
    ChevronDown,
    CheckCircle2,
    SkipForward,
    Send,
} from "lucide-react";
import { DismissibleError } from "@/components/ui/dismissible-error";
import { useReconciliation, ReconciliationJob, ReconciliationJobStatus } from "@/hooks/use-reconciliation";
import { useAccounts } from "@/hooks/use-accounts";
import { useAccountingPeriods } from "@/hooks/use-accounting-periods";
import { formatCurrency } from "@/utils/currency";

const JOB_STATUS_COLORS: Record<ReconciliationJobStatus, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
};

function JobSkeleton() {
    return (
        <div className="bg-white border border-[#121212]/10 rounded-xl p-4 space-y-2 animate-pulse">
            <div className="h-3 w-40 bg-[#F4F1EA] rounded" />
            <div className="h-2 w-24 bg-[#F4F1EA] rounded" />
        </div>
    );
}

export default withAuth(function ReconciliationPage() {
    const { jobs, isLoading, isSubmitting, error, selectedJobId, rows, isRowsLoading, selectJob, uploadStatement, confirmRow, skipRow, postConfirmed, refetch } =
        useReconciliation();
    const { accounts } = useAccounts();
    const { periods } = useAccountingPeriods();

    const fileRef = useRef<HTMLInputElement>(null);
    const [showUpload, setShowUpload] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [confirmingRowId, setConfirmingRowId] = useState<string | null>(null);
    const [rowAccountId, setRowAccountId] = useState<string>("");
    const [postForm, setPostForm] = useState({ bankAccountId: "", accountingPeriodId: "" });

    const selectedJob = jobs.find((j) => j.id === selectedJobId);

    async function handleUpload() {
        if (!selectedFile) return;
        setActionError(null);
        try {
            await uploadStatement(selectedFile);
            setShowUpload(false);
            setSelectedFile(null);
        } catch (e: any) { setActionError(e.message); }
    }

    async function handleConfirmRow(jobId: string, rowId: string) {
        if (!rowAccountId) return;
        setActionError(null);
        try {
            await confirmRow(jobId, rowId, rowAccountId);
            setConfirmingRowId(null);
            setRowAccountId("");
        } catch (e: any) { setActionError(e.message); }
    }

    async function handleSkipRow(jobId: string, rowId: string) {
        setActionError(null);
        try { await skipRow(jobId, rowId); }
        catch (e: any) { setActionError(e.message); }
    }

    async function handlePostConfirmed(jobId: string) {
        if (!postForm.bankAccountId || !postForm.accountingPeriodId) return;
        setActionError(null);
        try {
            await postConfirmed(jobId, postForm);
            setPostForm({ bankAccountId: "", accountingPeriodId: "" });
        } catch (e: any) { setActionError(e.message); }
    }

    const openPeriods = periods.filter((p) => p.status === "OPEN");

    return (
        <div className="space-y-8 font-sans">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Bank Reconciliation</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        CSV bank statement import &bull; Confirm rows &bull; Post as journal entries
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={refetch} disabled={isLoading} className="h-10 px-4 border border-[#121212]/10 text-xs font-semibold uppercase tracking-widest text-[#121212] hover:bg-[#F4F1EA]/40 disabled:opacity-40 transition-colors rounded-xl flex items-center space-x-2">
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /><span>Refresh</span>
                    </button>
                    <button onClick={() => setShowUpload((v) => !v)} className="h-10 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/80 rounded-xl flex items-center space-x-2">
                        <Upload className="w-3.5 h-3.5" /><span>Upload Statement</span>
                    </button>
                </div>
            </div>

            <DismissibleError message={error} />
            <DismissibleError message={actionError} />

            {/* Upload panel */}
            {showUpload && (
                <div className="bg-white border border-[#121212]/10 rounded-xl p-6 max-w-md space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-widest text-[#121212] flex items-center space-x-2"><Upload className="w-3.5 h-3.5" /><span>Upload Bank Statement</span></p>
                        <button onClick={() => setShowUpload(false)}><X className="w-4 h-4 text-[#8A817C]" /></button>
                    </div>
                    <div
                        onClick={() => fileRef.current?.click()}
                        className="border-2 border-dashed border-[#121212]/20 rounded-xl p-8 text-center cursor-pointer hover:border-[#121212]/40 transition-colors">
                        <Upload className="w-6 h-6 text-[#8A817C] mx-auto mb-2" />
                        <p className="text-xs text-[#8A817C]">{selectedFile ? selectedFile.name : "Click to select a CSV file"}</p>
                        <p className="text-[10px] text-[#8A817C]/60 mt-1">The default import profile will be used unless you specify one.</p>
                        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
                    </div>
                    <button onClick={handleUpload} disabled={isSubmitting || !selectedFile}
                        className="w-full h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-xl disabled:opacity-40">
                        {isSubmitting ? "Uploading…" : "Upload & Parse"}
                    </button>
                </div>
            )}

            <div className="flex gap-6 items-start">
                {/* Jobs list */}
                <div className="w-72 shrink-0 space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Import Jobs</p>
                    {isLoading ? Array.from({ length: 3 }).map((_, i) => <JobSkeleton key={i} />) :
                        jobs.length === 0 ? (
                            <div className="bg-white border border-[#121212]/10 rounded-xl p-6 text-center text-xs text-[#8A817C] font-light">No import jobs yet.</div>
                        ) : jobs.map((j) => (
                            <button key={j.id} onClick={() => selectJob(selectedJobId === j.id ? null : j.id)}
                                className={`w-full text-left bg-white border rounded-xl p-4 transition-colors ${selectedJobId === j.id ? "border-[#121212]" : "border-[#121212]/10 hover:border-[#121212]/30"}`}>
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-medium text-[#121212] truncate">{j.filename}</p>
                                    <ChevronDown className={`w-3 h-3 text-[#8A817C] shrink-0 transition-transform ${selectedJobId === j.id ? "rotate-180" : ""}`} />
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded ${JOB_STATUS_COLORS[j.status]}`}>{j.status}</span>
                                    <span className="text-[9px] font-mono text-[#8A817C]">{j.totalRows} rows</span>
                                </div>
                                <div className="flex justify-between mt-1 text-[9px] font-mono text-[#8A817C]">
                                    <span>✓ {j.confirmedRows} confirmed</span>
                                    <span>— {j.skippedRows} skipped</span>
                                </div>
                            </button>
                        ))}
                </div>

                {/* Row review */}
                <div className="flex-1 min-w-0 space-y-4">
                    {selectedJob ? (
                        <>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-[#121212]">{selectedJob.filename}</p>
                                    <p className="text-[10px] text-[#8A817C] font-mono mt-0.5">
                                        {selectedJob.confirmedRows} confirmed · {selectedJob.skippedRows} skipped · {selectedJob.totalRows} total
                                    </p>
                                </div>
                                {selectedJob.confirmedRows > 0 && (
                                    <div className="flex items-center space-x-2">
                                        <select value={postForm.bankAccountId} onChange={(e) => setPostForm((f) => ({ ...f, bankAccountId: e.target.value }))}
                                            className="h-8 px-2 border border-[#121212]/10 text-[10px] text-[#121212] bg-white rounded-lg focus:outline-none">
                                            <option value="">Bank account</option>
                                            {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                                        </select>
                                        <select value={postForm.accountingPeriodId} onChange={(e) => setPostForm((f) => ({ ...f, accountingPeriodId: e.target.value }))}
                                            className="h-8 px-2 border border-[#121212]/10 text-[10px] text-[#121212] bg-white rounded-lg focus:outline-none">
                                            <option value="">Period</option>
                                            {openPeriods.map((p) => <option key={p.id} value={p.id}>{p.year}-{String(p.month).padStart(2, "0")}</option>)}
                                        </select>
                                        <button onClick={() => handlePostConfirmed(selectedJob.id)} disabled={isSubmitting || !postForm.bankAccountId || !postForm.accountingPeriodId}
                                            className="h-8 px-3 bg-[#121212] text-white text-[10px] font-semibold uppercase tracking-widest rounded-lg disabled:opacity-40 flex items-center space-x-1">
                                            <Send className="w-3 h-3" /><span>{isSubmitting ? "Posting…" : "Post Confirmed"}</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white border border-[#121212]/10 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                                {["#", "Date", "Narration", "Amount", "DR/CR", "Account", "Status", ""].map((h) => (
                                                    <th key={h} className="p-3 text-[10px] font-semibold uppercase tracking-wider text-[#8A817C]">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#121212]/5">
                                            {isRowsLoading ? Array.from({ length: 5 }).map((_, i) => (
                                                <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j} className="p-3"><div className="h-3 bg-[#F4F1EA] rounded animate-pulse w-16" /></td>)}</tr>
                                            )) : rows.length === 0 ? (
                                                <tr><td colSpan={8} className="p-8 text-center text-xs text-[#8A817C]">No rows.</td></tr>
                                            ) : rows.map((row) => (
                                                <tr key={row.id} className="hover:bg-[#F4F1EA]/10">
                                                    <td className="p-3 font-mono text-[10px] text-[#8A817C]">{row.rowIndex}</td>
                                                    <td className="p-3 font-mono text-[10px] text-[#8A817C]">{row.date}</td>
                                                    <td className="p-3 text-[10px] text-[#121212] max-w-[140px] truncate">{row.narration}</td>
                                                    <td className="p-3 font-mono text-[10px] font-medium text-[#121212]">
                                                        {formatCurrency(row.amount)}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={`text-[9px] font-bold uppercase tracking-wider ${row.creditDebit === "CREDIT" ? "text-green-700" : "text-red-700"}`}>{row.creditDebit}</span>
                                                    </td>
                                                    <td className="p-3 text-[10px] text-[#8A817C]">{row.confirmedAccount?.name ?? "—"}</td>
                                                    <td className="p-3">
                                                        <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                                            row.status === "CONFIRMED" ? "bg-green-100 text-green-800" :
                                                            row.status === "SKIPPED" ? "bg-[#F4F1EA] text-[#8A817C]" :
                                                            row.status === "POSTED" ? "bg-blue-100 text-blue-800" :
                                                            "bg-amber-100 text-amber-800"
                                                        }`}>{row.status}</span>
                                                    </td>
                                                    <td className="p-3">
                                                        {row.status === "PENDING" && (
                                                            <div className="flex items-center space-x-1">
                                                                {confirmingRowId === row.id ? (
                                                                    <>
                                                                        <select value={rowAccountId} onChange={(e) => setRowAccountId(e.target.value)}
                                                                            className="h-7 px-1 border border-[#121212]/10 text-[9px] text-[#121212] bg-white rounded focus:outline-none">
                                                                            <option value="">Account</option>
                                                                            {accounts.map((a) => <option key={a.id} value={a.id}>{a.code}</option>)}
                                                                        </select>
                                                                        <button onClick={() => handleConfirmRow(selectedJob.id, row.id)} disabled={!rowAccountId || isSubmitting}
                                                                            className="h-7 px-2 bg-green-700 text-white text-[8px] font-bold rounded disabled:opacity-40">✓</button>
                                                                        <button onClick={() => setConfirmingRowId(null)} className="h-7 px-1 text-[#8A817C]"><X className="w-3 h-3" /></button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <button onClick={() => { setConfirmingRowId(row.id); setRowAccountId(""); }}
                                                                            className="h-6 px-2 border border-green-300 text-green-700 text-[8px] font-bold rounded flex items-center space-x-0.5">
                                                                            <CheckCircle2 className="w-2.5 h-2.5" /><span>Confirm</span>
                                                                        </button>
                                                                        <button onClick={() => handleSkipRow(selectedJob.id, row.id)} disabled={isSubmitting}
                                                                            className="h-6 px-1 border border-[#121212]/10 text-[#8A817C] text-[8px] rounded">
                                                                            <SkipForward className="w-2.5 h-2.5" />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white border border-[#121212]/10 rounded-xl p-12 text-center">
                            <GitMerge className="w-8 h-8 text-[#8A817C]/40 mx-auto mb-3" />
                            <p className="text-xs text-[#8A817C] font-light">Select an import job to review its rows.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}, { requiredPermission: 'finance:reconcile' });
