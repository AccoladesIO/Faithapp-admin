"use client";

import React, { useState } from "react";
import {
    Users, Shield, UserCheck, Percent, Calendar,
    UserMinus, AlertCircle, TrendingUp, MapPin,
    Wifi, Clock, RefreshCw, BookOpen, GraduationCap, Building2,
} from "lucide-react";
import { withAuth } from "@/utils/auth/with-auth";
import { DismissibleError } from "@/components/ui/dismissible-error";
import {
    useDashboard,
    WeeklyAttendanceTrend,
    DepartmentAttendanceSummary,
    TopAbsentWorker,
    ClassEnrollmentBreakdown,
    ClassCompletionsTrend,
} from "@/hooks/use-dashboard";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatSlotTime = (isoString: string) =>
    new Date(isoString).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });

const fmtWeek = (w: string) => {
    const d = new Date(w.length === 10 ? `${w}T00:00:00` : w);
    return isNaN(d.getTime()) ? w : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard({ tall = false }: { tall?: boolean }) {
    return (
        <div className={`bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl animate-pulse ${tall ? "h-48" : ""}`}>
            <div className="h-3 w-24 bg-[#F4F1EA] rounded mb-4" />
            <div className="h-8 w-16 bg-[#F4F1EA] rounded" />
        </div>
    );
}

function SkeletonPanel({ rows = 3 }: { rows?: number }) {
    return (
        <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 sm:p-8 rounded-xl space-y-4 animate-pulse">
            <div className="h-4 w-32 bg-[#F4F1EA] rounded" />
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="h-10 bg-[#F4F1EA] rounded-lg" />
            ))}
        </div>
    );
}

// ─── Metric cards ────────────────────────────────────────────────────────────

function MetricCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) {
    return (
        <div className="bg-[#FFFFFF] border border-[#121212]/10 p-5 sm:p-6 rounded-xl flex items-center justify-between">
            <div>
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">{title}</span>
                <div className="text-2xl sm:text-3xl font-light font-mono text-[#121212] mt-2">{value}</div>
            </div>
            <div className="p-3 bg-[#F4F1EA] rounded-xl text-[#8A817C] shrink-0">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
        </div>
    );
}

function SecondaryMetricCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) {
    return (
        <div className="bg-[#FFFFFF] border border-[#121212]/10 p-4 sm:p-5 rounded-xl flex items-center space-x-3 sm:space-x-4">
            <div className="p-2 sm:p-2.5 bg-[#F4F1EA]/60 text-[#8A817C] rounded-lg shrink-0">
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#8A817C] block">{title}</span>
                <span className="text-base sm:text-lg font-mono font-medium text-[#121212] mt-0.5 block">{value}</span>
            </div>
        </div>
    );
}

// ─── Panel header ────────────────────────────────────────────────────────────

function PanelHeader({ icon: Icon, label, count }: { icon: React.ElementType; label: string; count?: number }) {
    return (
        <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#121212] flex items-center space-x-2 border-b border-[#121212]/5 pb-4">
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8A817C] shrink-0" />
            <span>{label}{count !== undefined ? ` (${count})` : ""}</span>
        </h2>
    );
}

function EmptyRow({ text }: { text: string }) {
    return <div className="text-center py-6 text-xs text-[#8A817C] font-light italic">{text}</div>;
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
    const clamped = Math.min(100, Math.max(0, pct));
    return (
        <div className="w-full bg-[#F4F1EA] rounded-full h-1.5">
            <div className="bg-[#121212] h-1.5 rounded-full transition-all" style={{ width: `${clamped}%` }} />
        </div>
    );
}

// ─── Days filter ─────────────────────────────────────────────────────────────

const DAY_OPTIONS = [7, 14, 30, 60, 90] as const;

// ─── Main page ───────────────────────────────────────────────────────────────

export default withAuth(function DashboardPage() {
    const [daysAgo, setDaysAgo] = useState(30);
    const { data, isLoading, error, refetch } = useDashboard(daysAgo);

    const coreMetrics = data ? [
        { title: "Total Members", value: data.totalMembers, icon: Users },
        { title: "Total Workers", value: data.totalWorkers, icon: UserCheck },
        { title: "Total Admins", value: data.totalAdmins, icon: Shield },
        { title: "Today Check-Ins", value: data.totalCheckInsToday, icon: UserCheck },
    ] : [];

    const secondaryMetrics = data ? [
        { title: "Worker Attendance", value: `${data.workerAttendancePercentage}%`, icon: Percent },
        { title: "Member Attendance", value: `${data.congregationAttendancePercentage}%`, icon: Percent },
        { title: "Active Enrollments", value: data.totalActiveEnrollments, icon: TrendingUp },
        { title: "Pending Leave", value: data.totalPendingLeaveRequests, icon: UserMinus },
    ] : [];

    return (
        <div className="space-y-6 sm:space-y-10 font-sans">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                        Overview Dashboard
                    </h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Live overview of congregation activity, attendance, and upcoming events
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl">
                        {DAY_OPTIONS.map((d) => (
                            <button
                                key={d}
                                onClick={() => setDaysAgo(d)}
                                className={`px-2.5 sm:px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${daysAgo === d ? "bg-[#121212] text-[#FFFFFF]" : "text-[#8A817C] hover:text-[#121212]"}`}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={refetch}
                        disabled={isLoading}
                        className="p-2 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-40"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* ── Error ── */}
            <DismissibleError message={error} />

            {/* ── Core metrics ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                    : coreMetrics.map((m, i) => <MetricCard key={i} {...m} />)}
            </div>

            {/* ── Secondary metrics ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                    : secondaryMetrics.map((m, i) => <SecondaryMetricCard key={i} {...m} />)}
            </div>

            {/* ── Row: Upcoming Events | Members Not Seen + Weekly Registrations ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

                {/* Upcoming Events */}
                <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#121212]/10 p-6 sm:p-8 rounded-xl space-y-6">
                    <PanelHeader icon={Calendar} label="Upcoming Events" count={data?.upcomingEvents.length} />
                    {isLoading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-28 bg-[#F4F1EA] rounded-xl animate-pulse" />)}
                        </div>
                    ) : !data || data.upcomingEvents.length === 0 ? (
                        <EmptyRow text="No upcoming events." />
                    ) : (
                        <div className="space-y-6 max-h-[560px] overflow-y-auto pr-1">
                            {data.upcomingEvents.map((event) => (
                                <div key={event.id} className="p-4 sm:p-5 border border-[#121212]/10 rounded-xl bg-[#F4F1EA]/10 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                        <div>
                                            <h3 className="text-sm sm:text-base font-medium text-[#121212]">{event.name}</h3>
                                            <p className="text-xs text-[#8A817C] font-light mt-0.5">{event.description}</p>
                                        </div>
                                        <div className="font-mono text-xs text-[#121212] bg-[#FFFFFF] px-3 py-1.5 border border-[#121212]/10 rounded-lg self-start shrink-0">
                                            <span className="text-[#8A817C] font-sans font-bold uppercase text-[9px] block tracking-wide">Date</span>
                                            {event.eventDate}
                                        </div>
                                    </div>
                                    {event.serviceSlots?.map((slot) => {
                                        const activeVenue = slot.venueOverride || slot.config?.defaultVenue;
                                        return (
                                            <div key={slot.id} className="border-t border-[#121212]/5 pt-4 grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                                                <div className="sm:col-span-4 space-y-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A817C] block">Time Slot</span>
                                                    <div className="flex items-center text-[#121212] font-mono">
                                                        <Clock className="w-3.5 h-3.5 text-[#8A817C] mr-1.5 shrink-0" />
                                                        <span>{formatSlotTime(slot.startTime)} &mdash; {formatSlotTime(slot.endTime)}</span>
                                                    </div>
                                                    <span className="text-[9px] font-mono text-[#8A817C]/80 block">{slot.name}</span>
                                                </div>
                                                {activeVenue && (
                                                    <div className="sm:col-span-8 space-y-1">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A817C] block">Location</span>
                                                        <div className="flex items-start text-[#121212] font-light">
                                                            <MapPin className="w-3.5 h-3.5 text-[#8A817C] mr-1.5 shrink-0 mt-0.5" />
                                                            <div className="leading-tight min-w-0">
                                                                <strong className="font-medium text-[#121212]">{activeVenue.name}</strong>
                                                                <span className="text-[#8A817C] block text-[11px] mt-0.5 font-mono truncate" title={activeVenue.address}>
                                                                    {activeVenue.address}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {event.onlineAttendanceEnabled && (
                                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-[9px] font-bold uppercase tracking-wider rounded">
                                                <Wifi className="w-2.5 h-2.5" /><span>Online Available</span>
                                            </span>
                                        )}
                                        {event.attendanceMarked && (
                                            <span className="px-2 py-0.5 bg-green-50 border border-green-100 text-green-700 text-[9px] font-bold uppercase tracking-wider rounded">
                                                Attendance Marked
                                            </span>
                                        )}
                                        {event.recurringEventId && (
                                            <span className="px-2 py-0.5 bg-[#EADCC9] text-[#121212] text-[9px] font-bold uppercase tracking-wider rounded inline-flex items-center gap-1">
                                                <RefreshCw size={10} /> Recurring
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Members Not Seen + Weekly Registrations */}
                <div className="lg:col-span-5 flex flex-col gap-6">

                    {/* Members Not Seen Recently */}
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 sm:p-8 rounded-xl space-y-6">
                        <PanelHeader icon={AlertCircle} label="Members Not Seen Recently" />
                        {isLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-[#F4F1EA] rounded-lg animate-pulse" />)}
                            </div>
                        ) : !data || data.membersNotSeenRecently.length === 0 ? (
                            <EmptyRow text="No absent members found." />
                        ) : (
                            <div className="divide-y divide-[#121212]/5 max-h-72 overflow-y-auto pr-1">
                                {data.membersNotSeenRecently.map((member) => (
                                    <div key={member.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-xs font-medium text-[#121212] truncate">{member.name}</div>
                                            <div className="text-[11px] font-mono text-[#8A817C] truncate mt-0.5">{member.email}</div>
                                        </div>
                                        <span className="text-[9px] font-mono uppercase font-semibold text-amber-800 bg-amber-50 px-2 py-1 rounded shrink-0 border border-amber-100 whitespace-nowrap">
                                            {member.lastSeen ? `Seen: ${member.lastSeen}` : "No Record"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Weekly Registrations */}
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 sm:p-8 rounded-xl space-y-4 flex-1 flex flex-col">
                        <PanelHeader icon={TrendingUp} label="Weekly Registrations" />
                        {isLoading ? (
                            <div className="h-20 bg-[#F4F1EA] rounded-xl animate-pulse" />
                        ) : !data || data.newMemberRegistrationsTrend.length === 0 ? (
                            <EmptyRow text="No registration data available." />
                        ) : (
                            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                {data.newMemberRegistrationsTrend.map((trend, idx) => (
                                    <div key={idx} className="p-3 sm:p-4 border border-[#121212]/5 bg-[#F4F1EA]/20 rounded-xl">
                                        <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#8A817C] mb-2">
                                            Week of {fmtWeek(trend.week)}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 font-mono text-[#121212]">
                                            <div>
                                                <span className="text-[#8A817C] font-sans text-[10px] uppercase block">Members</span>
                                                <strong className="text-base font-semibold">{trend.newMembers}</strong>
                                            </div>
                                            <div>
                                                <span className="text-[#8A817C] font-sans text-[10px] uppercase block">Workers</span>
                                                <strong className="text-base font-semibold">{trend.newWorkers}</strong>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Row: Weekly Attendance Trend | Top Absent Workers ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

                {/* Weekly Attendance Trend */}
                <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#121212]/10 p-6 sm:p-8 rounded-xl space-y-6">
                    <PanelHeader icon={TrendingUp} label="Weekly Attendance Trend" />
                    {isLoading ? (
                        <SkeletonPanel rows={4} />
                    ) : !data || data.weeklyAttendanceTrend.length === 0 ? (
                        <EmptyRow text="No attendance trend data available." />
                    ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                            {data.weeklyAttendanceTrend.map((row: WeeklyAttendanceTrend, idx) => {
                                const total = row.present + row.absent;
                                const pct = total > 0 ? Math.round((row.present / total) * 100) : 0;
                                return (
                                    <div key={idx} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-[10px] font-mono text-[#8A817C]">
                                            <span className="font-sans font-bold uppercase tracking-wider">Week of {fmtWeek(row.week)}</span>
                                            <span className="font-semibold text-[#121212]">{pct}% present</span>
                                        </div>
                                        <ProgressBar pct={pct} />
                                        <div className="flex items-center gap-4 text-[10px] font-mono text-[#8A817C]">
                                            <span><span className="text-[#121212] font-semibold">{row.present}</span> present</span>
                                            <span><span className="text-[#121212] font-semibold">{row.absent}</span> absent</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Top Absent Workers */}
                <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 p-6 sm:p-8 rounded-xl space-y-6">
                    <PanelHeader icon={UserMinus} label="Top Absent Workers" />
                    {isLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-[#F4F1EA] rounded-lg animate-pulse" />)}
                        </div>
                    ) : !data || data.topAbsentWorkers.length === 0 ? (
                        <EmptyRow text="No absent workers in this period." />
                    ) : (
                        <div className="divide-y divide-[#121212]/5 max-h-80 overflow-y-auto pr-1">
                            {data.topAbsentWorkers.map((w: TopAbsentWorker, idx) => (
                                <div key={w.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
                                    <span className="text-[10px] font-mono font-bold text-[#8A817C] w-5 shrink-0">{idx + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-medium text-[#121212] truncate">{w.name}</div>
                                        {w.department && (
                                            <div className="text-[10px] text-[#8A817C] truncate mt-0.5">{w.department}</div>
                                        )}
                                    </div>
                                    <span className="text-[9px] font-mono font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-1 rounded shrink-0 whitespace-nowrap">
                                        {w.absentCount} absent
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Row: Department Attendance Summary (full width) ── */}
            <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 sm:p-8 rounded-xl space-y-6">
                <PanelHeader icon={Building2} label="Department Attendance Summary" />
                {isLoading ? (
                    <SkeletonPanel rows={3} />
                ) : !data || data.departmentAttendanceSummary.length === 0 ? (
                    <EmptyRow text="No department attendance data available." />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[480px] overflow-y-auto pr-1">
                        {data.departmentAttendanceSummary.map((dept: DepartmentAttendanceSummary) => (
                            <div key={dept.departmentId} className="p-4 border border-[#121212]/5 bg-[#F4F1EA]/20 rounded-xl space-y-2">
                                <div className="text-xs font-semibold text-[#121212] truncate">{dept.departmentName}</div>
                                <ProgressBar pct={dept.attendancePercentage} />
                                <div className="flex items-center justify-between text-[10px] font-mono text-[#8A817C]">
                                    <span><span className="text-[#121212] font-semibold">{dept.attendedWorkers}</span>/{dept.totalWorkers} attended</span>
                                    <span className="font-bold text-[#121212]">{dept.attendancePercentage}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Row: Class Enrollment Breakdown | Class Completions Trend ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">

                {/* Class Enrollment Breakdown */}
                <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 sm:p-8 rounded-xl space-y-6">
                    <PanelHeader icon={BookOpen} label="Class Enrollment Breakdown" />
                    {isLoading ? (
                        <SkeletonPanel rows={3} />
                    ) : !data || data.classEnrollmentBreakdown.length === 0 ? (
                        <EmptyRow text="No class enrollment data available." />
                    ) : (
                        <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                            {data.classEnrollmentBreakdown.map((cls: ClassEnrollmentBreakdown) => (
                                <div key={cls.classId} className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-medium text-[#121212] truncate">{cls.className}</span>
                                        <span className="text-[10px] font-mono font-bold text-[#121212] shrink-0">{cls.completionRate}%</span>
                                    </div>
                                    <ProgressBar pct={cls.completionRate} />
                                    <div className="flex items-center gap-3 text-[10px] font-mono text-[#8A817C]">
                                        <span><span className="text-blue-700 font-semibold">{cls.inProgress}</span> in progress</span>
                                        <span><span className="text-green-700 font-semibold">{cls.completed}</span> completed</span>
                                        <span><span className="text-[#8A817C] font-semibold">{cls.cancelled}</span> cancelled</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Class Completions Trend */}
                <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 sm:p-8 rounded-xl space-y-6">
                    <PanelHeader icon={GraduationCap} label="Class Completions Trend" />
                    {isLoading ? (
                        <SkeletonPanel rows={3} />
                    ) : !data || data.classCompletionsTrend.length === 0 ? (
                        <EmptyRow text="No completion trend data available." />
                    ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                            {data.classCompletionsTrend.map((row: ClassCompletionsTrend, idx) => {
                                const max = Math.max(...data.classCompletionsTrend.map(r => r.completions), 1);
                                const pct = Math.round((row.completions / max) * 100);
                                return (
                                    <div key={idx} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="font-sans font-bold uppercase tracking-wider text-[#8A817C]">Week of {fmtWeek(row.week)}</span>
                                            <span className="font-mono font-semibold text-[#121212]">{row.completions} completed</span>
                                        </div>
                                        <ProgressBar pct={pct} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}, { requiredPermission: 'dashboard:read' });
