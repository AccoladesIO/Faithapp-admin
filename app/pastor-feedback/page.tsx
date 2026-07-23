"use client";

import React, { useState, useEffect } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    MessageSquareText, RefreshCw, X, Trash2, CheckCircle2,
    ShieldAlert, MousePointerClick, Send, SlidersHorizontal,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
    usePastorFeedbackAdmin,
    PastorFeedbackRecord,
} from "@/hooks/use-pastor-feedback";
import { useDepartments } from "@/hooks/use-departments";
import { DismissibleError } from "@/components/ui/dismissible-error";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
    });
};

// weekOf is stored as the Monday of the week and matched exactly on the backend —
// snap any picked date to that week's Monday so the filter never silently returns nothing.
const mondayOf = (dateStr: string): string => {
    const d = new Date(`${dateStr}T00:00:00`);
    const diff = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - diff);
    return d.toISOString().slice(0, 10);
};

const PastorFeedbackAdminPage = () => {
    const {
        records, pagination, isLoading, isSubmitting, error,
        fetchFeedback, updateFeedback, deleteFeedback, respondToFeedback,
    } = usePastorFeedbackAdmin();
    const { departments } = useDepartments();

    const [departmentFilter, setDepartmentFilter] = useState("");
    const [weekOfFilter, setWeekOfFilter] = useState("");
    const [selected, setSelected] = useState<PastorFeedbackRecord | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [respondDraft, setRespondDraft] = useState("");
    const [respondError, setRespondError] = useState<string | null>(null);
    const [respondSuccess, setRespondSuccess] = useState(false);

    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        attendanceNotes: "", highlights: "", challenges: "", prayerRequests: "", additionalNotes: "",
    });

    useEffect(() => {
        fetchFeedback(1, departmentFilter || undefined, weekOfFilter || undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [departmentFilter, weekOfFilter]);

    const selectRecord = (r: PastorFeedbackRecord) => {
        setSelected(r);
        setEditing(false);
        setRespondDraft("");
        setRespondError(null);
        setRespondSuccess(false);
    };

    const closePanel = () => setSelected(null);

    const startEdit = () => {
        if (!selected) return;
        setEditForm({
            attendanceNotes: selected.attendanceNotes,
            highlights: selected.highlights,
            challenges: selected.challenges,
            prayerRequests: selected.prayerRequests ?? "",
            additionalNotes: selected.additionalNotes ?? "",
        });
        setEditing(true);
    };

    const handleSaveEdit = async () => {
        if (!selected) return;
        try {
            const updated = await updateFeedback(selected.id, editForm);
            setSelected(updated);
            setEditing(false);
        } catch { /* surfaced via hook */ }
    };

    const handleRespond = async () => {
        if (!selected || !respondDraft.trim()) return;
        setRespondError(null);
        try {
            const updated = await respondToFeedback(selected.id, respondDraft);
            setSelected(updated);
            setRespondDraft("");
            setRespondSuccess(true);
            setTimeout(() => setRespondSuccess(false), 3000);
        } catch (err: unknown) {
            const e = err as ApiError;
            setRespondError(e?.message ?? "Failed to send response.");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteFeedback(id);
            if (selected?.id === id) setSelected(null);
            setDeletingId(null);
        } catch { /* surfaced via hook */ }
    };

    const panelOpen = selected !== null;

    return (
        <div className="space-y-8 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                        Pastor Feedback
                    </h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Weekly submissions from department HODs, with pastor responses
                    </p>
                </div>
                <button
                    onClick={() => fetchFeedback(pagination?.page ?? 1, departmentFilter || undefined, weekOfFilter || undefined)}
                    disabled={isLoading}
                    className="p-2 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-40"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                </button>
            </div>

            <DismissibleError message={error} />

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-[#FFFFFF] border border-[#121212]/10 p-4 rounded-xl">
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#8A817C] shrink-0" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] shrink-0">
                        Department:
                    </span>
                    <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none min-w-[160px]"
                    >
                        <option value="">All Departments</option>
                        {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] shrink-0">
                        Week Of:
                    </span>
                    <input
                        type="date"
                        value={weekOfFilter}
                        onChange={(e) => setWeekOfFilter(e.target.value ? mondayOf(e.target.value) : "")}
                        title="Snaps to the Monday of the selected week"
                        className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                    {weekOfFilter && (
                        <button
                            onClick={() => setWeekOfFilter("")}
                            className="text-[10px] font-semibold uppercase tracking-wider text-[#8A817C] hover:text-[#121212]"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            <div className={`grid grid-cols-1 gap-6 ${panelOpen ? "lg:grid-cols-12" : ""}`}>
                <div className={`${panelOpen ? "lg:col-span-7" : ""} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Department</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Week Of</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden sm:table-cell">Submitted By</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={4} className="p-4"><div className="h-3 bg-[#F4F1EA] rounded w-3/4" /></td>
                                        </tr>
                                    ))
                                ) : records.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                            No feedback submissions found.
                                        </td>
                                    </tr>
                                ) : (
                                    records.map((r) => (
                                        <tr
                                            key={r.id}
                                            onClick={() => selectRecord(r)}
                                            className={`cursor-pointer transition-colors ${selected?.id === r.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
                                        >
                                            <td className="p-4 text-sm font-medium text-[#121212]">{r.department.name}</td>
                                            <td className="p-4 text-xs font-mono text-[#121212]">{formatDate(r.weekOf)}</td>
                                            <td className="p-4 text-xs text-[#8A817C] hidden sm:table-cell">{r.submittedByName}</td>
                                            <td className="p-4">
                                                {r.pastorResponse ? (
                                                    <span className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border bg-green-50 border-green-100 text-green-700">
                                                        Responded
                                                    </span>
                                                ) : (
                                                    <span className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border bg-amber-50 border-amber-100 text-amber-700">
                                                        Awaiting Response
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <PaginationBar
                        pagination={pagination}
                        onPage={(p) => fetchFeedback(p, departmentFilter || undefined, weekOfFilter || undefined)}
                        isLoading={isLoading}
                        label="submissions"
                    />

                    {!panelOpen && (
                        <div className="p-4 border-t border-[#121212]/5 text-center text-[11px] text-[#8A817C] font-light flex items-center justify-center gap-2">
                            <MousePointerClick className="w-3.5 h-3.5" />
                            Click any row to view details and respond
                        </div>
                    )}
                </div>

                {panelOpen && selected && (
                    <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative flex flex-col">
                        <div className="p-5 border-b border-[#121212]/5 flex items-start justify-between gap-4">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Feedback Detail</div>
                                <h2 className="text-lg font-light tracking-tight text-[#121212]">{selected.department.name}</h2>
                                <span className="text-[11px] font-mono text-[#8A817C]">Week of {formatDate(selected.weekOf)} · by {selected.submittedByName}</span>
                            </div>
                            <button
                                onClick={closePanel}
                                className="shrink-0 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                            {editing ? (
                                <div className="space-y-3">
                                    {([
                                        ["attendanceNotes", "Attendance / Turnout"],
                                        ["highlights", "Highlights"],
                                        ["challenges", "Challenges"],
                                        ["prayerRequests", "Prayer Requests"],
                                        ["additionalNotes", "Additional Notes"],
                                    ] as const).map(([key, label]) => (
                                        <div key={key}>
                                            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">{label}</label>
                                            <textarea
                                                rows={2}
                                                value={editForm[key]}
                                                onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                                                className="w-full p-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                                            />
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleSaveEdit}
                                            disabled={isSubmitting}
                                            className="flex-1 h-9 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-lg disabled:opacity-50"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setEditing(false)}
                                            className="h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-widest rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3 text-xs">
                                        <div className="p-3 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-lg">
                                            <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Attendance / Turnout</span>
                                            <p className="text-[#121212] font-light">{selected.attendanceNotes}</p>
                                        </div>
                                        <div className="p-3 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-lg">
                                            <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Highlights</span>
                                            <p className="text-[#121212] font-light">{selected.highlights}</p>
                                        </div>
                                        <div className="p-3 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-lg">
                                            <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Challenges</span>
                                            <p className="text-[#121212] font-light">{selected.challenges}</p>
                                        </div>
                                        {selected.prayerRequests && (
                                            <div className="p-3 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-lg">
                                                <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Prayer Requests</span>
                                                <p className="text-[#121212] font-light">{selected.prayerRequests}</p>
                                            </div>
                                        )}
                                        {selected.additionalNotes && (
                                            <div className="p-3 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-lg">
                                                <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Additional Notes</span>
                                                <p className="text-[#121212] font-light">{selected.additionalNotes}</p>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={startEdit}
                                        className="w-full h-9 border border-[#121212]/20 text-[#121212] text-xs font-semibold uppercase tracking-widest hover:bg-[#F4F1EA] transition-colors rounded-lg"
                                    >
                                        Edit Submission
                                    </button>
                                </>
                            )}

                            <div className="border-t border-[#121212]/5 pt-4 space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212] flex items-center gap-2">
                                    <MessageSquareText className="w-3.5 h-3.5 text-[#8A817C]" /> Pastor Response
                                </h3>
                                {selected.pastorResponse ? (
                                    <div className="bg-[#F4F1EA]/30 border-l-2 border-[#121212] p-3 rounded-r-lg">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A817C] mb-1">
                                            {selected.respondedByPastorName} · {formatDate(selected.pastorRespondedAt)}
                                        </p>
                                        <p className="text-xs text-[#121212] font-light italic">{selected.pastorResponse}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {respondSuccess && (
                                            <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700">
                                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Response sent.
                                            </div>
                                        )}
                                        {respondError && (
                                            <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                                                <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> {respondError}
                                            </div>
                                        )}
                                        <textarea
                                            rows={3}
                                            value={respondDraft}
                                            onChange={(e) => setRespondDraft(e.target.value)}
                                            placeholder="Write a response as pastor…"
                                            className="w-full p-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                                        />
                                        <p className="text-[10px] text-[#8A817C]">
                                            Only works if your admin account is linked to a member with a Pastor record.
                                        </p>
                                        <button
                                            onClick={handleRespond}
                                            disabled={isSubmitting || !respondDraft.trim()}
                                            className="w-full h-9 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-40 rounded-lg flex items-center justify-center gap-1.5"
                                        >
                                            <Send className="w-3.5 h-3.5" /> Send Response
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-[#121212]/5 pt-4">
                                {deletingId === selected.id ? (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleDelete(selected.id)}
                                            disabled={isSubmitting}
                                            className="flex-1 h-9 bg-red-600 text-white text-xs font-semibold uppercase tracking-widest rounded-lg disabled:opacity-50"
                                        >
                                            Confirm Delete
                                        </button>
                                        <button
                                            onClick={() => setDeletingId(null)}
                                            className="h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-widest rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setDeletingId(selected.id)}
                                        className="w-full h-9 border border-red-200 text-red-600 text-xs font-semibold uppercase tracking-widest hover:bg-red-50 transition-colors rounded-lg flex items-center justify-center gap-1.5"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete Submission
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default withAuth(PastorFeedbackAdminPage, { requiredPermission: 'pastor_feedback:read' });
