"use client";

import React, { useState, useCallback, useEffect } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    Users, ClipboardList, BarChart2, Plus, X,
    RefreshCw, Check, Calendar, Search, SlidersHorizontal, Mail,
    TrendingUp, UserCheck, Clock, AlertTriangle,
} from "lucide-react";
import {
    useFollowUp,
    FirstTimer,
    FollowUpTask,
    FollowUpReport,
    FollowUpReportWorker,
    FollowUpReportEvent,
    PipelineReport,
    LogVisitDto,
    FollowUpTaskStatusEnum,
    FirstTimerSourceEnum,
    CreateFirstTimerDto,
} from "@/hooks/use-follow-up";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useEvents, ChurchEvent } from "@/hooks/use-events";
import { toLocalDate } from "@/utils/parse-local-time";
import { DismissibleError } from "@/components/ui/dismissible-error";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fullName = (p: { firstname: string; lastname: string } | null | undefined) => {
    if (!p) return "—";
    return [p.firstname, p.lastname].filter(Boolean).join(" ");
};

const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
    });
};

const formatDateTime = (iso: string | null | undefined) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
};

const toIsoDate = (d: Date) => toLocalDate(d);

const todayIso = () => toIsoDate(new Date());

// ─── Badges ───────────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: FirstTimerSourceEnum }) {
    const map: Record<FirstTimerSourceEnum, string> = {
        WALK_IN: "bg-blue-50 border-blue-100 text-blue-700",
        ONLINE: "bg-purple-50 border-purple-100 text-purple-700",
        REFERRAL: "bg-green-50 border-green-100 text-green-700",
    };
    const labels: Record<FirstTimerSourceEnum, string> = {
        WALK_IN: "Walk In",
        ONLINE: "Online",
        REFERRAL: "Referral",
    };
    return (
        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${map[source]}`}>
            {labels[source]}
        </span>
    );
}

function TaskStatusBadge({ status }: { status: FollowUpTaskStatusEnum }) {
    const map: Record<FollowUpTaskStatusEnum, string> = {
        PENDING: "bg-amber-50 border-amber-100 text-amber-700",
        IN_PROGRESS: "bg-blue-50 border-blue-100 text-blue-700",
        COMPLETED: "bg-green-50 border-green-100 text-green-700",
        UNREACHABLE: "bg-gray-100 border-gray-200 text-gray-600",
    };
    const labels: Record<FollowUpTaskStatusEnum, string> = {
        PENDING: "Pending",
        IN_PROGRESS: "In Progress",
        COMPLETED: "Completed",
        UNREACHABLE: "Unreachable",
    };
    return (
        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${map[status]}`}>
            {labels[status]}
        </span>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
    return (
        <tr className="border-b border-[#121212]/5 animate-pulse">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="p-4">
                    <div className="h-3 bg-[#F4F1EA] rounded w-3/4" />
                </td>
            ))}
        </tr>
    );
}

// ─── Report Card ──────────────────────────────────────────────────────────────

function ReportCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
    return (
        <div className={`bg-[#FFFFFF] border rounded-xl p-5 ${accent ?? "border-[#121212]/10"}`}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">{label}</p>
            <p className="text-3xl font-light text-[#121212]">{value}</p>
        </div>
    );
}

// ─── Pipeline Funnel ──────────────────────────────────────────────────────────

const PIPELINE_STAGES: Array<{ key: keyof PipelineReport; label: string; bar: string; accent: string }> = [
    { key: "untouched",  label: "Untouched",  bar: "bg-gray-300",    accent: "border-gray-200" },
    { key: "contacted",  label: "Contacted",  bar: "bg-blue-300",    accent: "border-blue-100" },
    { key: "returned",   label: "Returned",   bar: "bg-purple-300",  accent: "border-purple-100" },
    { key: "invited",    label: "Invited",    bar: "bg-amber-300",   accent: "border-amber-100" },
    { key: "converted",  label: "Converted",  bar: "bg-green-400",   accent: "border-green-100" },
];

function PipelineFunnel({ pipeline }: { pipeline: PipelineReport }) {
    return (
        <div className="space-y-3">
            {PIPELINE_STAGES.map(({ key, label, bar }) => {
                const value = pipeline[key] as number;
                const pct = pipeline.total > 0 ? Math.round((value / pipeline.total) * 100) : 0;
                return (
                    <div key={key} className="flex items-center gap-4">
                        <div className="w-24 text-right text-xs text-[#8A817C] font-semibold shrink-0">{label}</div>
                        <div className="flex-1 h-7 bg-[#F4F1EA] rounded-lg overflow-hidden">
                            <div
                                className={`h-full ${bar} rounded-lg transition-all duration-700`}
                                style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                        </div>
                        <div className="w-24 text-xs text-[#121212] font-light shrink-0">
                            {value.toLocaleString()} <span className="text-[#8A817C]">({pct}%)</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Log Visit Panel ──────────────────────────────────────────────────────────

interface LogVisitPanelProps {
    firstTimer: FirstTimer;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (firstTimerId: string, dto: LogVisitDto) => Promise<unknown>;
}

function LogVisitPanel({ firstTimer, isSubmitting, onClose, onSubmit }: LogVisitPanelProps) {
    const [visitedAt, setVisitedAt] = useState(todayIso());
    const [notes, setNotes] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        try {
            await onSubmit(firstTimer.id, { visitedAt, notes: notes.trim() || undefined });
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 1500);
        } catch (err: unknown) {
            const e = err as ApiError;
            setLocalError(e?.message ?? "Failed to log visit.");
        }
    };

    return (
        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative overflow-hidden">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md z-10 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
            <div className="p-6 border-b border-[#121212]/5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Return Visit</div>
                <h2 className="text-xl font-light tracking-tight text-[#121212] pr-10">Log Visit</h2>
                <p className="text-xs text-[#8A817C] font-light mt-1">
                    {firstTimer.firstname} {firstTimer.lastname}
                </p>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
                {success && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700">
                        <Check className="w-4 h-4 shrink-0" />
                        Return visit logged successfully.
                    </div>
                )}
                {localError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                        {localError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                            Visit Date
                        </label>
                        <input
                            type="date"
                            required
                            value={visitedAt}
                            onChange={(e) => setVisitedAt(e.target.value)}
                            className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                            Notes <span className="normal-case font-light">(optional)</span>
                        </label>
                        <textarea
                            rows={4}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Observations from the visit…"
                            className="w-full px-3 py-2 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-11 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded-xl"
                    >
                        {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                        {isSubmitting ? "Logging…" : "Log Visit"}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ─── Add First Timer Panel ────────────────────────────────────────────────────

const defaultFirstTimerForm: CreateFirstTimerDto = {
    firstname: "",
    lastname: "",
    phone: "",
    email: "",
    source: "WALK_IN",
    wantsToJoinChurch: false,
    wantsToJoinWorkforce: false,
    notes: "",
    enjoyedAboutChurch: "",
    visitedEventId: "",
};

const SOURCES: FirstTimerSourceEnum[] = ["WALK_IN", "ONLINE", "REFERRAL"];
const SOURCE_LABELS: Record<FirstTimerSourceEnum, string> = {
    WALK_IN: "Walk In",
    ONLINE: "Online",
    REFERRAL: "Referral",
};

interface AddFirstTimerPanelProps {
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (dto: CreateFirstTimerDto) => Promise<FirstTimer>;
    events: ChurchEvent[];
}

function AddFirstTimerPanel({ isSubmitting, onClose, onSubmit, events }: AddFirstTimerPanelProps) {
    const [form, setForm] = useState<CreateFirstTimerDto>(defaultFirstTimerForm);
    const [localError, setLocalError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        try {
            await onSubmit(form);
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
                setForm(defaultFirstTimerForm);
            }, 1500);
        } catch (err: unknown) {
            const e = err as ApiError;
            setLocalError(e?.message ?? "Failed to add first timer.");
        }
    };

    return (
        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative overflow-hidden">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md z-10 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
            <div className="p-6 border-b border-[#121212]/5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">New First Timer</div>
                <h2 className="text-xl font-light tracking-tight text-[#121212] pr-10">Add First Timer</h2>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
                {success && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700">
                        <Check className="w-4 h-4 shrink-0" />
                        First timer added successfully.
                    </div>
                )}
                {localError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                        {localError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">First Name</label>
                            <input
                                type="text"
                                required
                                value={form.firstname}
                                onChange={(e) => setForm((p) => ({ ...p, firstname: e.target.value }))}
                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Last Name</label>
                            <input
                                type="text"
                                required
                                value={form.lastname}
                                onChange={(e) => setForm((p) => ({ ...p, lastname: e.target.value }))}
                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Phone</label>
                        <input
                            type="tel"
                            required
                            value={form.phone}
                            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                            className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                            Email <span className="normal-case font-light">(optional)</span>
                        </label>
                        <input
                            type="email"
                            value={form.email ?? ""}
                            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                            className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Source</label>
                        <select
                            value={form.source}
                            onChange={(e) => setForm((p) => ({ ...p, source: e.target.value as FirstTimerSourceEnum }))}
                            className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                        >
                            {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                        </select>
                    </div>

                    <div className="space-y-3 p-4 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-xl">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.wantsToJoinChurch}
                                onChange={(e) => setForm((p) => ({ ...p, wantsToJoinChurch: e.target.checked }))}
                                className="w-4 h-4 rounded border-[#121212]/20 accent-[#121212]"
                            />
                            <span className="text-xs font-light text-[#121212]">Wants to join the church</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.wantsToJoinWorkforce}
                                onChange={(e) => setForm((p) => ({ ...p, wantsToJoinWorkforce: e.target.checked }))}
                                className="w-4 h-4 rounded border-[#121212]/20 accent-[#121212]"
                            />
                            <span className="text-xs font-light text-[#121212]">Wants to join the workforce</span>
                        </label>
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                            What they enjoyed <span className="normal-case font-light">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={form.enjoyedAboutChurch ?? ""}
                            onChange={(e) => setForm((p) => ({ ...p, enjoyedAboutChurch: e.target.value }))}
                            placeholder="e.g. The worship, the message…"
                            className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                            Event visited <span className="normal-case font-light">(optional)</span>
                        </label>
                        <select
                            value={form.visitedEventId ?? ""}
                            onChange={(e) => setForm((p) => ({ ...p, visitedEventId: e.target.value || undefined }))}
                            className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                        >
                            <option value="">— Select event —</option>
                            {events.map((ev) => (
                                <option key={ev.id} value={ev.id}>
                                    {ev.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                            Notes <span className="normal-case font-light">(optional)</span>
                        </label>
                        <textarea
                            rows={3}
                            value={form.notes ?? ""}
                            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                            placeholder="Any additional notes..."
                            className="w-full px-3 py-2 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-11 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded-xl"
                    >
                        {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        {isSubmitting ? "Adding..." : "Add First Timer"}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ─── Filter types ─────────────────────────────────────────────────────────────

interface FtFilters {
    source: FirstTimerSourceEnum | "";
    wantsToJoinChurch: "true" | "false" | "";
    wantsToJoinWorkforce: "true" | "false" | "";
    search: string;
    dateFrom: string;
    dateTo: string;
}

type DatePreset = "all" | "7d" | "30d" | "month" | "custom";

function presetRange(preset: DatePreset): { dateFrom: string; dateTo: string } {
    const today = new Date();
    if (preset === "7d") {
        const from = new Date(today); from.setDate(from.getDate() - 7);
        return { dateFrom: toIsoDate(from), dateTo: toIsoDate(today) };
    }
    if (preset === "30d") {
        const from = new Date(today); from.setDate(from.getDate() - 30);
        return { dateFrom: toIsoDate(from), dateTo: toIsoDate(today) };
    }
    if (preset === "month") {
        return {
            dateFrom: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
            dateTo: toIsoDate(today),
        };
    }
    return { dateFrom: "", dateTo: "" };
}

type Tab = "first-timers" | "tasks" | "pipeline" | "report";
type ActivePanel = null | "add" | "visit";
type TaskViewMode = FollowUpTaskStatusEnum | "" | "STALE";

const TASK_STATUSES: Array<FollowUpTaskStatusEnum | ""> = ["", "PENDING", "IN_PROGRESS", "COMPLETED", "UNREACHABLE"];
const TASK_STATUS_LABELS: Record<FollowUpTaskStatusEnum | "", string> = {
    "": "All",
    PENDING: "Pending",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    UNREACHABLE: "Unreachable",
};

// ─── Main page ────────────────────────────────────────────────────────────────

const FollowUpPage = () => {
    const {
        firstTimers,
        firstTimerPagination,
        tasks,
        taskPagination,
        staleTasks,
        staleTaskPagination,
        isLoading,
        isSubmitting,
        error,
        fetchFirstTimers,
        createFirstTimer,
        inviteToMembership,
        markConverted,
        logReturnVisit,
        fetchTasks,
        fetchStaleTasks,
        bulkUpdateTasks,
        fetchReport,
        getFirstTimerPipeline,
        goToTaskPage,
    } = useFollowUp(10);

    const { events } = useEvents(50);

    const [activeTab, setActiveTab] = useState<Tab>("first-timers");
    const [hasLoadedTasks, setHasLoadedTasks] = useState(false);

    // First-timer panel
    const [activePanel, setActivePanel] = useState<ActivePanel>(null);
    const [visitTarget, setVisitTarget] = useState<FirstTimer | null>(null);

    // Status messages
    const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
    const [statusMsg, setStatusMsg] = useState<string | null>(null);
    const [visitSuccessIds, setVisitSuccessIds] = useState<Set<string>>(new Set());

    // First-timer filters
    const [ftFilters, setFtFilters] = useState<FtFilters>({
        source: "", wantsToJoinChurch: "", wantsToJoinWorkforce: "",
        search: "", dateFrom: "", dateTo: "",
    });
    const [datePreset, setDatePreset] = useState<DatePreset>("all");

    // Tasks
    const [taskViewMode, setTaskViewMode] = useState<TaskViewMode>("");
    const [taskSearch, setTaskSearch] = useState("");
    const [staleDays, setStaleDays] = useState(7);
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [bulkTargetStatus, setBulkTargetStatus] = useState<FollowUpTaskStatusEnum>("COMPLETED");
    const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);

    // Report
    const [reportFrom, setReportFrom] = useState("");
    const [reportTo, setReportTo] = useState("");
    const [report, setReport] = useState<FollowUpReport | null>(null);
    const [reportError, setReportError] = useState<string | null>(null);

    // Pipeline
    const [pipelineFrom, setPipelineFrom] = useState("");
    const [pipelineTo, setPipelineTo] = useState("");
    const [pipeline, setPipeline] = useState<PipelineReport | null>(null);
    const [pipelineError, setPipelineError] = useState<string | null>(null);

    useEffect(() => {
        fetchFirstTimers({ page: 1 });
    }, [fetchFirstTimers]);

    const showStatusMsg = (msg: string) => {
        setStatusMsg(msg);
        setTimeout(() => setStatusMsg(null), 4000);
    };

    const applyFtFilters = useCallback((updates: Partial<FtFilters>, page = 1) => {
        const next = { ...ftFilters, ...updates };
        setFtFilters(next);

        let joinChurch: boolean | undefined;
        if (next.wantsToJoinChurch === "true") joinChurch = true;
        else if (next.wantsToJoinChurch === "false") joinChurch = false;

        let joinWorkforce: boolean | undefined;
        if (next.wantsToJoinWorkforce === "true") joinWorkforce = true;
        else if (next.wantsToJoinWorkforce === "false") joinWorkforce = false;

        fetchFirstTimers({
            page,
            source: next.source || undefined,
            wantsToJoinChurch: joinChurch,
            wantsToJoinWorkforce: joinWorkforce,
            search: next.search || undefined,
            dateFrom: next.dateFrom || undefined,
            dateTo: next.dateTo || undefined,
        });
    }, [ftFilters, fetchFirstTimers]);

    const applyDatePreset = useCallback((preset: DatePreset) => {
        setDatePreset(preset);
        if (preset === "custom") return;
        const range = presetRange(preset);
        applyFtFilters({ dateFrom: range.dateFrom, dateTo: range.dateTo });
    }, [applyFtFilters]);

    const handleTabClick = (tab: Tab) => {
        setActiveTab(tab);
        if (tab === "tasks" && !hasLoadedTasks) {
            fetchTasks({ page: 1 });
            setHasLoadedTasks(true);
        }
    };

    const switchTaskView = (mode: TaskViewMode) => {
        setTaskViewMode(mode);
        setSelectedTaskIds(new Set());
        setHasLoadedTasks(true);
        if (mode === "STALE") {
            fetchStaleTasks({ daysInactive: staleDays, page: 1 });
        } else {
            fetchTasks({ page: 1, status: mode || undefined });
        }
    };

    const toggleTaskSelection = (id: string) => {
        setSelectedTaskIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedTaskIds.size === tasks.length) setSelectedTaskIds(new Set());
        else setSelectedTaskIds(new Set(tasks.map((t) => t.id)));
    };

    const handleBulkUpdate = async () => {
        if (selectedTaskIds.size === 0) return;
        setBulkSuccess(null);
        try {
            const updates = Array.from(selectedTaskIds).map((id) => ({ id, status: bulkTargetStatus }));
            const result = await bulkUpdateTasks(updates);
            setSelectedTaskIds(new Set());
            setBulkSuccess(`${result.updated} task(s) updated.`);
            setTimeout(() => setBulkSuccess(null), 3000);
        } catch { /* surfaced via hook error */ }
    };

    const handleGenerateReport = async () => {
        setReportError(null);
        setReport(null);
        if (!reportFrom || !reportTo) { setReportError("Please select both a start and end date."); return; }
        try { setReport(await fetchReport(reportFrom, reportTo)); }
        catch (err: unknown) { setReportError((err as Error).message ?? "Failed to generate report."); }
    };

    const handleLoadPipeline = async () => {
        setPipelineError(null);
        setPipeline(null);
        try { setPipeline(await getFirstTimerPipeline(pipelineFrom || undefined, pipelineTo || undefined)); }
        catch (err: unknown) { setPipelineError((err as Error).message ?? "Failed to load pipeline."); }
    };

    const handleInvite = async (ft: FirstTimer) => {
        if (invitedIds.has(ft.id) || ft.inviteSentAt) return;
        try {
            await inviteToMembership(ft.id);
            setInvitedIds((prev) => new Set(prev).add(ft.id));
            showStatusMsg("Membership invitation sent.");
        } catch { /* surfaced via hook error */ }
    };

    const handleMarkConverted = async (ft: FirstTimer) => {
        if (ft.convertedAt) return;
        try {
            await markConverted(ft.id);
            showStatusMsg(`${ft.firstname} ${ft.lastname} marked as converted.`);
        } catch { /* surfaced via hook error */ }
    };

    const handleLogVisit = async (firstTimerId: string, dto: LogVisitDto) => {
        const result = await logReturnVisit(firstTimerId, dto);
        setVisitSuccessIds((prev) => new Set(prev).add(firstTimerId));
        setTimeout(() => setVisitSuccessIds((prev) => { const n = new Set(prev); n.delete(firstTimerId); return n; }), 4000);
        return result;
    };

    const openAddPanel = () => { setActivePanel("add"); setVisitTarget(null); };
    const openVisitPanel = (ft: FirstTimer) => { setVisitTarget(ft); setActivePanel("visit"); };
    const closePanel = () => { setActivePanel(null); setVisitTarget(null); };

    const panelOpen = activePanel !== null;

    const tabCls = (t: Tab) =>
        `flex items-center gap-1.5 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest transition-colors rounded-lg ${
            activeTab === t ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"
        }`;

    const getWorkerName = (task: FollowUpTask) => {
        if (task.assignedTo?.member) return fullName(task.assignedTo.member);
        if (task.workerProfile) return fullName(task.workerProfile);
        return "—";
    };

    return (
        <div className="space-y-10 font-sans">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Follow-Up</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Manage first timers, follow-up tasks, and outreach reports
                    </p>
                </div>
            </div>

            <DismissibleError message={error} />

            {/* Tabs */}
            <div className="flex flex-wrap gap-1">
                {(["first-timers", "tasks", "pipeline", "report"] as Tab[]).map((tab) => {
                    const icons: Record<Tab, React.ReactNode> = {
                        "first-timers": <Users className="w-3 h-3" />,
                        tasks: <ClipboardList className="w-3 h-3" />,
                        pipeline: <TrendingUp className="w-3 h-3" />,
                        report: <BarChart2 className="w-3 h-3" />,
                    };
                    const labels: Record<Tab, string> = {
                        "first-timers": "First Timers",
                        tasks: "Tasks",
                        pipeline: "Pipeline",
                        report: "Report",
                    };
                    return (
                        <button key={tab} onClick={() => handleTabClick(tab)} className={tabCls(tab)}>
                            {icons[tab]}{labels[tab]}
                        </button>
                    );
                })}
            </div>

            {/* ── First Timers Tab ─────────────────────────────────────────────────── */}

            {activeTab === "first-timers" && (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-3 justify-between">
                        <div className="relative flex-1 min-w-[200px] max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A817C]" />
                            <input
                                type="text"
                                value={ftFilters.search}
                                onChange={(e) => applyFtFilters({ search: e.target.value })}
                                placeholder="Search name, phone, email…"
                                className="w-full h-9 pl-9 pr-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <SlidersHorizontal className="w-3 h-3 text-[#8A817C]" />
                            <select
                                value={ftFilters.source}
                                onChange={(e) => applyFtFilters({ source: e.target.value as FirstTimerSourceEnum | "" })}
                                className="h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                            >
                                <option value="">All Sources</option>
                                {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                            </select>
                            <select
                                value={ftFilters.wantsToJoinChurch}
                                onChange={(e) => applyFtFilters({ wantsToJoinChurch: e.target.value as "true" | "false" | "" })}
                                className="h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                            >
                                <option value="">Joining Church: All</option>
                                <option value="true">Wants to Join</option>
                                <option value="false">Not Interested</option>
                            </select>
                            <select
                                value={ftFilters.wantsToJoinWorkforce}
                                onChange={(e) => applyFtFilters({ wantsToJoinWorkforce: e.target.value as "true" | "false" | "" })}
                                className="h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                            >
                                <option value="">Workforce: All</option>
                                <option value="true">Wants to Join</option>
                                <option value="false">Not Interested</option>
                            </select>
                        </div>
                        <button
                            onClick={openAddPanel}
                            className="flex items-center gap-2 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors shrink-0"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add First Timer
                        </button>
                    </div>

                    {/* Date filter */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#8A817C] shrink-0" />
                        {(["all", "7d", "30d", "month", "custom"] as DatePreset[]).map((p) => {
                            const labels: Record<DatePreset, string> = {
                                all: "All time", "7d": "Last 7 days", "30d": "Last 30 days",
                                month: "This month", custom: "Custom",
                            };
                            return (
                                <button
                                    key={p}
                                    onClick={() => applyDatePreset(p)}
                                    className={`h-7 px-3 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${
                                        datePreset === p
                                            ? "bg-[#121212] text-white"
                                            : "border border-[#121212]/10 text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA]"
                                    }`}
                                >
                                    {labels[p]}
                                </button>
                            );
                        })}
                        {datePreset === "custom" && (
                            <div className="flex items-center gap-2 ml-1">
                                <input
                                    type="date"
                                    value={ftFilters.dateFrom}
                                    onChange={(e) => applyFtFilters({ dateFrom: e.target.value })}
                                    className="h-7 px-2 bg-[#F4F1EA]/40 border border-[#121212]/10 text-[11px] text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                />
                                <span className="text-[10px] text-[#8A817C]">to</span>
                                <input
                                    type="date"
                                    value={ftFilters.dateTo}
                                    onChange={(e) => applyFtFilters({ dateTo: e.target.value })}
                                    className="h-7 px-2 bg-[#F4F1EA]/40 border border-[#121212]/10 text-[11px] text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                />
                            </div>
                        )}
                    </div>

                    {firstTimerPagination && (
                        <p className="text-xs text-[#8A817C] font-light">
                            {firstTimerPagination.totalCount} first timer(s) recorded
                        </p>
                    )}

                    {statusMsg && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700">
                            <Check className="w-4 h-4 shrink-0" />{statusMsg}
                        </div>
                    )}

                    {/* Table + optional right panel */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        <div className={`${panelOpen ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden`}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Name</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] hidden sm:table-cell">Phone</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Source</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] hidden md:table-cell">Wants to Join</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] hidden lg:table-cell">Date</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading ? (
                                            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                                        ) : firstTimers.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                                    No first timers found.
                                                </td>
                                            </tr>
                                        ) : (
                                            firstTimers.map((ft) => {
                                                const isConverted = !!ft.convertedAt;
                                                const isInvited = !!ft.inviteSentAt || invitedIds.has(ft.id);
                                                const visitLogged = visitSuccessIds.has(ft.id);
                                                return (
                                                    <tr key={ft.id} className="border-b border-[#121212]/5 hover:bg-[#F4F1EA]/30 transition-colors">
                                                        <td className="p-4">
                                                            <div className="text-sm text-[#121212] font-light">{fullName(ft)}</div>
                                                            {ft.email && (
                                                                <div className="text-[11px] font-mono text-[#8A817C] mt-0.5 truncate max-w-[160px]">{ft.email}</div>
                                                            )}
                                                            {isConverted && (
                                                                <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-green-50 border border-green-100 text-green-700">
                                                                    Converted
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-sm text-[#121212] font-light hidden sm:table-cell">{ft.phone}</td>
                                                        <td className="p-4"><SourceBadge source={ft.source} /></td>
                                                        <td className="p-4 hidden md:table-cell">
                                                            <div className="flex items-center gap-3 text-xs font-light">
                                                                <span className={ft.wantsToJoinChurch ? "text-green-700" : "text-[#8A817C]"}>
                                                                    {ft.wantsToJoinChurch ? "✓" : "✗"} Church
                                                                </span>
                                                                <span className={ft.wantsToJoinWorkforce ? "text-green-700" : "text-[#8A817C]"}>
                                                                    {ft.wantsToJoinWorkforce ? "✓" : "✗"} Workforce
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-sm text-[#8A817C] font-light hidden lg:table-cell">
                                                            {formatDate(ft.createdAt)}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-1">
                                                                {/* Log Return Visit */}
                                                                <button
                                                                    onClick={() => openVisitPanel(ft)}
                                                                    title="Log return visit"
                                                                    className={`p-2 border rounded-lg transition-colors ${
                                                                        visitLogged
                                                                            ? "text-purple-600 border-purple-200 bg-purple-50"
                                                                            : "text-[#8A817C] hover:text-[#121212] border-[#121212]/10 hover:border-[#121212]"
                                                                    }`}
                                                                >
                                                                    <Calendar className="w-3.5 h-3.5" />
                                                                </button>

                                                                {/* Mark Converted */}
                                                                {!isConverted && (
                                                                    <button
                                                                        onClick={() => handleMarkConverted(ft)}
                                                                        disabled={isSubmitting}
                                                                        title="Mark as converted"
                                                                        className="p-2 text-[#8A817C] hover:text-green-700 border border-[#121212]/10 hover:border-green-300 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-40"
                                                                    >
                                                                        <UserCheck className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}

                                                                {/* Invite to membership */}
                                                                {ft.email && (
                                                                    isInvited ? (
                                                                        <span
                                                                            title="Invitation sent"
                                                                            className="inline-flex p-2 text-green-600 border border-green-200 bg-green-50 rounded-lg"
                                                                        >
                                                                            <Mail className="w-3.5 h-3.5" />
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleInvite(ft)}
                                                                            disabled={isSubmitting}
                                                                            title="Invite to membership"
                                                                            className="p-2 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 hover:border-[#121212] rounded-lg transition-colors disabled:opacity-40"
                                                                        >
                                                                            <Mail className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationBar
                                pagination={firstTimerPagination}
                                onPage={(p) => applyFtFilters({}, p)}
                                isLoading={isLoading}
                                label="first-timers"
                            />
                        </div>

                        {activePanel === "add" && (
                            <AddFirstTimerPanel
                                isSubmitting={isSubmitting}
                                onClose={closePanel}
                                onSubmit={createFirstTimer}
                                events={events}
                            />
                        )}
                        {activePanel === "visit" && visitTarget && (
                            <LogVisitPanel
                                firstTimer={visitTarget}
                                isSubmitting={isSubmitting}
                                onClose={closePanel}
                                onSubmit={handleLogVisit}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* ── Tasks Tab ────────────────────────────────────────────────────────── */}

            {activeTab === "tasks" && (
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-3 items-center justify-between">
                        {taskViewMode !== "STALE" && (
                            <div className="relative min-w-[200px] max-w-xs flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A817C]" />
                                <input
                                    type="text"
                                    value={taskSearch}
                                    onChange={(e) => {
                                        setTaskSearch(e.target.value);
                                        fetchTasks({ page: 1, status: (taskViewMode as FollowUpTaskStatusEnum) || undefined, search: e.target.value || undefined });
                                    }}
                                    placeholder="Search first timer name…"
                                    className="w-full h-9 pl-9 pr-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                />
                            </div>
                        )}

                        {taskViewMode === "STALE" && (
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span className="text-xs text-[#8A817C] font-light">Inactive for more than</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={staleDays}
                                    onChange={(e) => setStaleDays(Number(e.target.value))}
                                    className="w-16 h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg text-center"
                                />
                                <span className="text-xs text-[#8A817C] font-light">days</span>
                                <button
                                    onClick={() => fetchStaleTasks({ daysInactive: staleDays, page: 1 })}
                                    disabled={isLoading}
                                    className="h-9 px-3 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                                >
                                    {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                    Refresh
                                </button>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-1">
                            {TASK_STATUSES.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => switchTaskView(s)}
                                    disabled={isLoading}
                                    className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-widest rounded-lg transition-colors disabled:opacity-40 ${taskViewMode === s ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                                >
                                    {TASK_STATUS_LABELS[s]}
                                </button>
                            ))}
                            <button
                                onClick={() => switchTaskView("STALE")}
                                disabled={isLoading}
                                className={`flex items-center gap-1 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest rounded-lg transition-colors disabled:opacity-40 ${taskViewMode === "STALE" ? "bg-amber-500 text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                            >
                                <Clock className="w-3 h-3" />
                                Stale
                            </button>
                        </div>
                    </div>

                    {/* Bulk action bar (normal view only) */}
                    {selectedTaskIds.size > 0 && taskViewMode !== "STALE" && (
                        <div className="flex items-center gap-3 p-3 bg-[#F4F1EA]/50 border border-[#121212]/10 rounded-xl flex-wrap">
                            <span className="text-xs font-semibold text-[#121212]">{selectedTaskIds.size} selected</span>
                            <select
                                value={bulkTargetStatus}
                                onChange={(e) => setBulkTargetStatus(e.target.value as FollowUpTaskStatusEnum)}
                                className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                            >
                                <option value="PENDING">Mark Pending</option>
                                <option value="IN_PROGRESS">Mark In Progress</option>
                                <option value="COMPLETED">Mark Completed</option>
                                <option value="UNREACHABLE">Mark Unreachable</option>
                            </select>
                            <button
                                onClick={handleBulkUpdate}
                                disabled={isSubmitting}
                                className="h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#121212]/90 disabled:opacity-50 transition-colors rounded-lg flex items-center gap-1.5"
                            >
                                {isSubmitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                                Apply
                            </button>
                            <button
                                onClick={() => setSelectedTaskIds(new Set())}
                                className="h-9 px-3 border border-[#121212]/10 text-xs text-[#8A817C] hover:text-[#121212] rounded-lg transition-colors"
                            >
                                Clear
                            </button>
                            {bulkSuccess && (
                                <span className="text-xs text-green-700 font-light flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5" />{bulkSuccess}
                                </span>
                            )}
                        </div>
                    )}

                    {taskViewMode === "STALE" && staleTaskPagination && (
                        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            {staleTaskPagination.totalCount} open task(s) with no activity in {staleDays}+ day(s)
                        </div>
                    )}

                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                        {taskViewMode !== "STALE" && (
                                            <th className="p-4 w-8">
                                                <input
                                                    type="checkbox"
                                                    checked={tasks.length > 0 && selectedTaskIds.size === tasks.length}
                                                    onChange={toggleSelectAll}
                                                    className="w-4 h-4 rounded border-[#121212]/20 accent-[#121212]"
                                                />
                                            </th>
                                        )}
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Type</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] hidden sm:table-cell">First Timer</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] hidden md:table-cell">Assigned To</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Status</th>
                                        {taskViewMode === "STALE" ? (
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] hidden lg:table-cell">
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Last Activity</span>
                                            </th>
                                        ) : (
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] hidden lg:table-cell">Due Date</th>
                                        )}
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] hidden lg:table-cell">Outcome</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={taskViewMode === "STALE" ? 6 : 7} />)
                                    ) : !hasLoadedTasks ? (
                                        <tr>
                                            <td colSpan={7} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                                Select this tab to load tasks.
                                            </td>
                                        </tr>
                                    ) : (taskViewMode === "STALE" ? staleTasks : tasks).length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                                {taskViewMode === "STALE" ? "No stale tasks found." : "No tasks found."}
                                            </td>
                                        </tr>
                                    ) : (
                                        (taskViewMode === "STALE" ? staleTasks : tasks).map((task) => (
                                            <tr
                                                key={task.id}
                                                className={`border-b border-[#121212]/5 transition-colors hover:bg-[#F4F1EA]/30 ${selectedTaskIds.has(task.id) ? "bg-[#F4F1EA]/30" : ""}`}
                                            >
                                                {taskViewMode !== "STALE" && (
                                                    <td className="p-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedTaskIds.has(task.id)}
                                                            onChange={() => toggleTaskSelection(task.id)}
                                                            className="w-4 h-4 rounded border-[#121212]/20 accent-[#121212]"
                                                        />
                                                    </td>
                                                )}
                                                <td className="p-4">
                                                    <span className="text-sm text-[#121212] font-light">{task.type.replace(/_/g, " ")}</span>
                                                </td>
                                                <td className="p-4 text-sm text-[#121212] font-light hidden sm:table-cell">
                                                    {fullName(task.firstTimer)}
                                                </td>
                                                <td className="p-4 text-sm text-[#121212] font-light hidden md:table-cell">
                                                    {getWorkerName(task)}
                                                </td>
                                                <td className="p-4">
                                                    <TaskStatusBadge status={task.status} />
                                                </td>
                                                {taskViewMode === "STALE" ? (
                                                    <td className="p-4 hidden lg:table-cell">
                                                        <span className="text-xs text-amber-700 font-light">
                                                            {formatDateTime(task.lastActivityAt)}
                                                        </span>
                                                    </td>
                                                ) : (
                                                    <td className="p-4 text-sm text-[#8A817C] font-light hidden lg:table-cell">
                                                        {formatDate(task.dueDate)}
                                                    </td>
                                                )}
                                                <td className="p-4 text-sm text-[#8A817C] font-light hidden lg:table-cell">
                                                    {task.outcome ? task.outcome.replace(/_/g, " ") : "—"}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <PaginationBar
                            pagination={taskViewMode === "STALE" ? staleTaskPagination : taskPagination}
                            onPage={taskViewMode === "STALE"
                                ? (p) => fetchStaleTasks({ daysInactive: staleDays, page: p })
                                : goToTaskPage}
                            isLoading={isLoading}
                            label="tasks"
                        />
                    </div>
                </div>
            )}

            {/* ── Pipeline Tab ─────────────────────────────────────────────────────── */}

            {activeTab === "pipeline" && (
                <div className="space-y-6">
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-6 space-y-4">
                        <h2 className="text-base font-light tracking-tight text-[#121212] flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-[#8A817C]" />
                            Filter by Date Recorded
                            <span className="text-xs font-light text-[#8A817C]">(optional)</span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">From</label>
                                <input
                                    type="date"
                                    value={pipelineFrom}
                                    onChange={(e) => setPipelineFrom(e.target.value)}
                                    className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">To</label>
                                <input
                                    type="date"
                                    value={pipelineTo}
                                    onChange={(e) => setPipelineTo(e.target.value)}
                                    className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                />
                            </div>
                        </div>
                        {pipelineError && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">{pipelineError}</div>
                        )}
                        <button
                            onClick={handleLoadPipeline}
                            disabled={isLoading}
                            className="flex items-center gap-2 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                            {isLoading ? "Loading…" : "Load Pipeline"}
                        </button>
                    </div>

                    {!pipeline && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <TrendingUp className="w-10 h-10 text-[#8A817C]/30 mb-4" />
                            <p className="text-sm font-light text-[#8A817C]">Click &quot;Load Pipeline&quot; to see the first-timer funnel.</p>
                        </div>
                    )}

                    {isLoading && (
                        <div className="space-y-4 animate-pulse">
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5">
                                        <div className="h-2 bg-[#F4F1EA] rounded w-2/3 mb-3" />
                                        <div className="h-8 bg-[#F4F1EA] rounded w-1/2" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {pipeline && !isLoading && (
                        <div className="space-y-6">
                            {/* Summary cards */}
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                                <ReportCard label="Total" value={pipeline.total} />
                                {PIPELINE_STAGES.map(({ key, label, accent }) => (
                                    <ReportCard key={key} label={label} value={pipeline[key] as number} accent={accent} />
                                ))}
                            </div>

                            {/* Funnel bars */}
                            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-6 space-y-4">
                                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">
                                    Funnel Breakdown <span className="font-light normal-case">— % of total first timers at each stage</span>
                                </h3>
                                {pipeline.total === 0 ? (
                                    <p className="text-xs text-[#8A817C] font-light py-4 text-center">No first timers in the selected range.</p>
                                ) : (
                                    <PipelineFunnel pipeline={pipeline} />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Report Tab ───────────────────────────────────────────────────────── */}

            {activeTab === "report" && (
                <div className="space-y-6">
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-6 space-y-4">
                        <h2 className="text-base font-light tracking-tight text-[#121212] flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#8A817C]" />
                            Date Range
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">From</label>
                                <input
                                    type="date"
                                    value={reportFrom}
                                    onChange={(e) => setReportFrom(e.target.value)}
                                    className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">To</label>
                                <input
                                    type="date"
                                    value={reportTo}
                                    onChange={(e) => setReportTo(e.target.value)}
                                    className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                />
                            </div>
                        </div>
                        {reportError && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">{reportError}</div>
                        )}
                        <button
                            onClick={handleGenerateReport}
                            disabled={isLoading}
                            className="flex items-center gap-2 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <BarChart2 className="w-3.5 h-3.5" />}
                            {isLoading ? "Generating..." : "Generate Report"}
                        </button>
                    </div>

                    {!report && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <BarChart2 className="w-10 h-10 text-[#8A817C]/30 mb-4" />
                            <p className="text-sm font-light text-[#8A817C]">Select a date range and generate a report to see results.</p>
                        </div>
                    )}

                    {isLoading && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Array.from({ length: 9 }).map((_, i) => (
                                <div key={i} className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 animate-pulse">
                                    <div className="h-2 bg-[#F4F1EA] rounded w-2/3 mb-3" />
                                    <div className="h-8 bg-[#F4F1EA] rounded w-1/2" />
                                </div>
                            ))}
                        </div>
                    )}

                    {report && !isLoading && (
                        <div className="space-y-6">

                            {/* First Timers */}
                            <div>
                                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-3">First Timers</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <ReportCard label="Total" value={report.firstTimers.total} />
                                    <ReportCard label="Wants to Join Church" value={report.firstTimers.wantsToJoinChurch} accent="border-green-100" />
                                    <ReportCard label="Wants to Join Workforce" value={report.firstTimers.wantsToJoinWorkforce} accent="border-blue-100" />
                                </div>
                            </div>

                            {/* By Source */}
                            {Object.keys(report.firstTimers.bySource).length > 0 && (
                                <div>
                                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-3">First Timers by Source</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {Object.entries(report.firstTimers.bySource).map(([source, count]) => (
                                            <ReportCard key={source} label={source.replace(/_/g, " ")} value={count} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Task Outcomes */}
                            <div>
                                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-3">Task Outcomes</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <ReportCard label="Joined" value={report.tasks.byOutcome["JOINED"] ?? 0} accent="border-green-100" />
                                    <ReportCard label="Declined" value={report.tasks.byOutcome["DECLINED"] ?? 0} accent="border-red-100" />
                                    <ReportCard label="No Answer" value={report.tasks.byOutcome["NO_ANSWER"] ?? 0} accent="border-amber-100" />
                                    <ReportCard label="Prayed With" value={report.tasks.byOutcome["PRAYED_WITH"] ?? 0} accent="border-purple-100" />
                                </div>
                            </div>

                            {/* Task Status + KPIs */}
                            <div>
                                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-3">Task Status &amp; KPIs</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                                    <ReportCard label="Total Tasks" value={report.tasks.total} />
                                    <ReportCard label="Pending" value={report.tasks.byStatus["PENDING"] ?? 0} accent="border-amber-100" />
                                    <ReportCard label="In Progress" value={report.tasks.byStatus["IN_PROGRESS"] ?? 0} accent="border-blue-100" />
                                    <ReportCard label="Completed" value={report.tasks.byStatus["COMPLETED"] ?? 0} accent="border-green-100" />
                                    <ReportCard label="Unreachable" value={report.tasks.byStatus["UNREACHABLE"] ?? 0} accent="border-gray-200" />
                                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A817C] mb-1">Conversion Rate</p>
                                        <p className="text-2xl font-light text-[#121212]">{report.tasks.conversionRate}</p>
                                    </div>
                                </div>
                                {report.tasks.overdue > 0 && (
                                    <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        <span><span className="font-semibold">{report.tasks.overdue}</span> overdue task{report.tasks.overdue !== 1 ? "s" : ""} currently open past their due date.</span>
                                    </div>
                                )}
                            </div>

                            {/* By Worker */}
                            {report.byWorker.length > 0 && (
                                <div>
                                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-3">Worker Performance</h3>
                                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-[#121212]/5">
                                                    <th className="text-left px-4 py-3 text-[#8A817C] font-semibold uppercase tracking-wider">Worker</th>
                                                    <th className="text-right px-4 py-3 text-[#8A817C] font-semibold uppercase tracking-wider">Assigned</th>
                                                    <th className="text-right px-4 py-3 text-[#8A817C] font-semibold uppercase tracking-wider">Completed</th>
                                                    <th className="text-right px-4 py-3 text-[#8A817C] font-semibold uppercase tracking-wider">Joined</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {report.byWorker.map((w: FollowUpReportWorker) => (
                                                    <tr key={w.workerName} className="border-b border-[#121212]/5 last:border-0 hover:bg-[#F4F1EA]/30">
                                                        <td className="px-4 py-3 font-light text-[#121212]">{w.workerName}</td>
                                                        <td className="px-4 py-3 text-right text-[#121212]">{w.assigned}</td>
                                                        <td className="px-4 py-3 text-right text-green-700">{w.completed}</td>
                                                        <td className="px-4 py-3 text-right text-blue-700">{w.joined}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* By Event */}
                            {report.byEvent.length > 0 && (
                                <div>
                                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-3">First Timers by Service</h3>
                                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-[#121212]/5">
                                                    <th className="text-left px-4 py-3 text-[#8A817C] font-semibold uppercase tracking-wider">Service</th>
                                                    <th className="text-right px-4 py-3 text-[#8A817C] font-semibold uppercase tracking-wider">First Timers</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {report.byEvent.map((e: FollowUpReportEvent) => (
                                                    <tr key={e.eventName} className="border-b border-[#121212]/5 last:border-0 hover:bg-[#F4F1EA]/30">
                                                        <td className="px-4 py-3 font-light text-[#121212]">{e.eventName}</td>
                                                        <td className="px-4 py-3 text-right text-[#121212]">{e.firstTimers}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default withAuth(FollowUpPage, { requiredPermission: 'follow_up:read' });
