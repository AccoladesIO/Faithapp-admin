"use client";

import React, { useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    Search, SlidersHorizontal,
    RefreshCw, MapPin, Clock, X, Trophy, History,
} from "lucide-react";
import {
    useAttendanceHistory,
    useAttendanceLeaderboard,
    AttendanceRecord,
    AttendanceHistoryFilters,
} from "@/hooks/use-attendance";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { DismissibleError } from "@/components/ui/dismissible-error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fullName = (m: { firstname: string; lastname: string }) =>
    [m.firstname, m.lastname].filter(Boolean).join(" ");

const formatDateTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};

const DAYS_AGO_OPTIONS = [7, 14, 30, 60, 90] as const;
const STATUS_OPTIONS = ["", "PRESENT", "ABSENT", "LATE", "ONLINE"] as const;

// ─── Status badge ─────────────────────────────────────────────────────────────

function AttendanceStatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        PRESENT: "bg-green-50 border-green-100 text-green-700",
        ABSENT: "bg-red-50 border-red-100 text-red-600",
        LATE: "bg-orange-50 border-orange-100 text-orange-700",
        ONLINE: "bg-blue-50 border-blue-100 text-blue-700",
    };
    return (
        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${map[status] ?? "bg-[#F4F1EA] border-[#121212]/5 text-[#8A817C]"}`}>
            {status}
        </span>
    );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function SkeletonRow() {
    return (
        <tr className="border-b border-[#121212]/5 animate-pulse">
            <td className="p-4"><div className="h-3.5 bg-[#F4F1EA] rounded w-32 mb-2" /><div className="h-2.5 bg-[#F4F1EA] rounded w-44" /></td>
            <td className="p-4"><div className="h-3 bg-[#F4F1EA] rounded w-28" /></td>
            <td className="p-4"><div className="h-5 bg-[#F4F1EA] rounded w-16" /></td>
            <td className="p-4"><div className="h-3 bg-[#F4F1EA] rounded w-24" /></td>
        </tr>
    );
}

function SkeletonLeaderCard() {
    return (
        <div className="bg-[#FFFFFF] border-t-4 border-[#121212]/10 p-6 rounded-b-xl animate-pulse space-y-4">
            <div className="h-3 w-16 bg-[#F4F1EA] rounded" />
            <div className="h-5 w-32 bg-[#F4F1EA] rounded" />
            <div className="h-3 w-24 bg-[#F4F1EA] rounded" />
            <div className="grid grid-cols-2 gap-2 pt-4 border-t border-[#121212]/5">
                <div className="h-8 bg-[#F4F1EA] rounded" />
                <div className="h-8 bg-[#F4F1EA] rounded" />
            </div>
        </div>
    );
}

// ─── Detail drawer ──────────────────────────────────────────────────────────────

function RecordDetail({
    record,
    onClose,
}: {
    record: AttendanceRecord;
    onClose: () => void;
}) {
    return (
        <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl space-y-6 relative">
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md"
            >
                <X className="w-4 h-4" />
            </button>

            <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">
                    Attendance Record
                </div>
                <h2 className="text-xl font-light tracking-tight text-[#121212] pr-8">
                    {fullName(record.member)}
                </h2>
                <div className="flex flex-wrap gap-2 mt-2">
                    <AttendanceStatusBadge status={record.status} />
                    <span className="inline-block px-2 py-0.5 bg-[#F4F1EA] border border-[#121212]/5 text-[#8A817C] text-[9px] font-bold uppercase tracking-wider rounded">
                        {record.roleAtCheckin}
                    </span>
                </div>
            </div>

            <div className="space-y-2 border-y border-[#121212]/5 py-4 text-xs font-mono">
                <div className="flex justify-between">
                    <span className="text-[#8A817C]">Email</span>
                    <span className="text-[#121212]">{record.member.email}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[#8A817C]">Check-in Time</span>
                    <span className="text-[#121212]">{formatDateTime(record.checkinTime)}</span>
                </div>
                {record.member.workerProfile?.department && (
                    <div className="flex justify-between">
                        <span className="text-[#8A817C]">Department</span>
                        <span className="text-[#121212]">{record.member.workerProfile.department.name}</span>
                    </div>
                )}
            </div>

            {record.serviceSlot && (
                <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212] flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#8A817C]" />
                        Service Slot
                    </h3>
                    <div className="p-4 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-lg text-xs space-y-1">
                        <div className="font-medium text-[#121212]">{record.serviceSlot.event.name}</div>
                        <div className="text-[#8A817C] font-mono">{record.serviceSlot.name}</div>
                        <div className="text-[#8A817C] font-mono">
                            {formatDateTime(record.serviceSlot.startTime)} — {formatDateTime(record.serviceSlot.endTime)}
                        </div>
                    </div>
                </div>
            )}

            {record.location && (
                <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212] flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#8A817C]" />
                        Location
                    </h3>
                    <div className="p-4 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-lg text-xs font-mono text-[#121212]">
                        {record.location.latitude}°, {record.location.longitude}°
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ActiveTab = "history" | "leaderboard";

export default withAuth(function AttendancePage() {
    const [activeTab, setActiveTab] = useState<ActiveTab>("history");

    const {
        records,
        pagination,
        isLoading,
        error,
        goToPage,
        applyFilters,
        refetch,
    } = useAttendanceHistory(10);

    const {
        leaderboard,
        daysAgo,
        isLoading: leaderboardLoading,
        error: leaderboardError,
        changeDaysAgo,
    } = useAttendanceLeaderboard(30, 10);

    const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

    // Local form state for history filters
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const handleApplyFilters = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({
            status: statusFilter as AttendanceHistoryFilters["status"],
            dateFrom,
            dateTo,
            search: searchQuery.trim() || undefined,
        });
    };

    const handleResetFilters = () => {
        setSearchQuery("");
        setStatusFilter("");
        setDateFrom("");
        setDateTo("");
        applyFilters({ status: "", dateFrom: "", dateTo: "", search: undefined });
    };

    const medals = ["🥇", "🥈", "🥉"];
    const borders = ["border-yellow-500", "border-slate-400", "border-amber-700"];

    return (
        <div className="space-y-10 font-sans">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                        Attendance & Check-ins
                    </h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Track service attendance and view engagement across your team
                    </p>
                </div>

            </div>

            {/* Tabs */}
            <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl w-fit">
                {(["history", "leaderboard"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${activeTab === tab
                                ? "bg-[#121212] text-[#FFFFFF]"
                                : "text-[#8A817C] hover:text-[#121212]"
                            }`}
                    >
                        {tab === "history"
                            ? <History className="w-3.5 h-3.5" />
                            : <Trophy className="w-3.5 h-3.5" />}
                        <span>{tab === "history" ? "Attendance History" : "Leaderboard"}</span>
                    </button>
                ))}
            </div>

            {/* ── LEADERBOARD TAB ───────────────────────────────────────────────── */}
            {activeTab === "leaderboard" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212]">
                            Top Performers
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A817C]">
                                Period:
                            </span>
                            <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl">
                                {DAYS_AGO_OPTIONS.map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => changeDaysAgo(d)}
                                        disabled={leaderboardLoading}
                                        className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-40 ${daysAgo === d
                                                ? "bg-[#121212] text-white"
                                                : "text-[#8A817C] hover:text-[#121212]"
                                            }`}
                                    >
                                        {d}d
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {leaderboardError && (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-xs text-red-700">
                            {leaderboardError}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {leaderboardLoading ? (
                            Array.from({ length: 3 }).map((_, i) => <SkeletonLeaderCard key={i} />)
                        ) : leaderboard.length === 0 ? (
                            <div className="lg:col-span-3 text-center py-8 text-xs text-[#8A817C] font-light italic bg-[#FFFFFF] border border-[#121212]/10 rounded-xl">
                                No leaderboard data for this period.
                            </div>
                        ) : (
                            leaderboard.slice(0, 3).map((item, idx) => {
                                const total = item.presentCount + item.absentCount;
                                const rate = total > 0 ? (item.presentCount / total) * 100 : 0;
                                return (
                                    <div
                                        key={`${item.rank}-${item.name}`}
                                        className={`bg-[#FFFFFF] border-t-4 ${borders[idx] || "border-[#121212]/10"} p-6 rounded-b-xl relative overflow-hidden flex flex-col justify-between`}
                                    >
                                        <div className="absolute right-4 top-4 text-2xl select-none">{medals[idx]}</div>
                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">
                                                Rank 0{item.rank}
                                            </div>
                                            <div className="text-lg font-medium text-[#121212] mt-1 truncate max-w-[85%]">
                                                {item.name}
                                            </div>
                                            <div className="text-xs text-[#8A817C] font-mono mt-0.5">{item.department}</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 border-t border-[#121212]/5 pt-4 mt-4 font-mono text-xs">
                                            <div>
                                                <span className="text-[#8A817C] block text-[9px] font-semibold uppercase tracking-widest">Present</span>
                                                <span className="text-[#121212] font-semibold">{item.presentCount}</span>
                                            </div>
                                            <div>
                                                <span className="text-[#8A817C] block text-[9px] font-semibold uppercase tracking-widest">Absent</span>
                                                <span className="text-[#121212] font-semibold">{item.absentCount}</span>
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-mono text-[#8A817C] mt-2">
                                            {rate.toFixed(0)}% attendance rate
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {!leaderboardLoading && leaderboard.length > 3 && (
                        <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <tbody className="divide-y divide-[#121212]/5 text-xs">
                                    {leaderboard.slice(3).map((item) => (
                                        <tr key={`${item.rank}-${item.name}`} className="hover:bg-[#F4F1EA]/10 transition-colors">
                                            <td className="p-3 font-mono font-semibold text-[#121212] w-16">
                                                #{item.rank.toString().padStart(2, "0")}
                                            </td>
                                            <td className="p-3">
                                                <div className="font-medium text-[#121212]">{item.name}</div>
                                                <div className="text-[#8A817C] font-mono text-[10px]">{item.department}</div>
                                            </td>
                                            <td className="p-3 font-mono text-[#121212] text-right">
                                                {item.presentCount} present / {item.absentCount} absent
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── HISTORY TAB ────────────────────────────────────────────────────── */}
            {activeTab === "history" && (
                <div className="space-y-6">
                    <DismissibleError message={error} />

                    {/* Filters */}
                    <form
                        onSubmit={handleApplyFilters}
                        className="flex flex-col xl:flex-row gap-6 items-center justify-between bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl"
                    >
                        <div className="w-full xl:max-w-md relative">
                            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8A817C]" />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 pl-11 pr-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>

                        <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-4 items-center">
                            <div className="flex items-center space-x-2 w-full sm:w-auto">
                                <SlidersHorizontal className="w-3.5 h-3.5 text-[#8A817C] shrink-0" />
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] shrink-0">Status:</span>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none min-w-[130px]"
                                >
                                    {STATUS_OPTIONS.map((s) => (
                                        <option key={s} value={s}>{s || "All Statuses"}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center space-x-2 w-full sm:w-auto">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] shrink-0">From:</span>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                />
                            </div>

                            <div className="flex items-center space-x-2 w-full sm:w-auto">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] shrink-0">To:</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="h-10 px-4 bg-[#121212] text-white text-[11px] font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors disabled:opacity-50"
                            >
                                Apply
                            </button>
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                disabled={isLoading}
                                className="h-10 px-3 border border-[#121212]/10 text-[#8A817C] text-[11px] font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-50"
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                onClick={refetch}
                                disabled={isLoading}
                                className="p-2.5 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-40"
                                title="Refresh"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                            </button>
                        </div>
                    </form>

                    {/* Table + detail */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className={selectedRecord ? "lg:col-span-7" : "lg:col-span-12"}>
                            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">
                                                    Personnel
                                                </th>
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">
                                                    Event / Slot
                                                </th>
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">
                                                    Status
                                                </th>
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">
                                                    Check-in Time
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                            {isLoading ? (
                                                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                                            ) : records.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                                        No matching attendance records found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                records.map((record) => (
                                                    <tr
                                                        key={record.id}
                                                        onClick={() => setSelectedRecord(record)}
                                                        className={`transition-colors cursor-pointer ${selectedRecord?.id === record.id
                                                                ? "bg-[#F4F1EA]/50"
                                                                : "hover:bg-[#F4F1EA]/10"
                                                            }`}
                                                    >
                                                        <td className="p-4">
                                                            <div className="text-sm font-medium text-[#121212]">
                                                                {fullName(record.member)}
                                                            </div>
                                                            <div className="text-xs text-[#8A817C] font-mono mt-0.5 truncate max-w-[200px]">
                                                                {record.member.email}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-xs font-mono text-[#121212]">
                                                            {record.serviceSlot ? (
                                                                <>
                                                                    <div>{record.serviceSlot.event.name}</div>
                                                                    <div className="text-[#8A817C] text-[10px] mt-0.5">
                                                                        {record.serviceSlot.name}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <span className="text-[#8A817C]/50 italic">No slot</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            <AttendanceStatusBadge status={record.status} />
                                                        </td>
                                                        <td className="p-4 text-xs font-mono text-[#121212]">
                                                            {formatDateTime(record.checkinTime)}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <PaginationBar
                                    pagination={pagination}
                                    onPage={goToPage}
                                    isLoading={isLoading}
                                    label="records"
                                />
                            </div>
                        </div>

                        {selectedRecord && (
                            <div className="lg:col-span-5">
                                <RecordDetail
                                    record={selectedRecord}
                                    onClose={() => setSelectedRecord(null)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}, { requiredPermission: 'attendance:read' });