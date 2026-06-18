"use client";

import React, { useState } from "react";
import {
  Users, Shield, UserCheck, Percent, Calendar,
  UserMinus, AlertCircle, TrendingUp, MapPin,
  Wifi, Clock, RefreshCw,
} from "lucide-react";
import { withAuth } from "@/utils/auth/with-auth";
import { useDashboard } from "@/hooks/use-dashboard";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatSlotTime = (isoString: string) =>
  new Date(isoString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl animate-pulse">
      <div className="h-3 w-24 bg-[#F4F1EA] rounded mb-4" />
      <div className="h-8 w-16 bg-[#F4F1EA] rounded" />
    </div>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl flex items-center justify-between">
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">
          {title}
        </span>
        <div className="text-3xl font-light font-mono text-[#121212] mt-2">
          {value}
        </div>
      </div>
      <div className="p-3 bg-[#F4F1EA] rounded-xl text-[#8A817C]">
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

function SecondaryMetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-[#FFFFFF] border border-[#121212]/10 p-5 rounded-xl flex items-center space-x-4">
      <div className="p-2.5 bg-[#F4F1EA]/60 text-[#8A817C] rounded-lg shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A817C] block">
          {title}
        </span>
        <span className="text-lg font-mono font-medium text-[#121212] mt-0.5 block">
          {value}
        </span>
      </div>
    </div>
  );
}

// ─── Days filter ──────────────────────────────────────────────────────────────

const DAY_OPTIONS = [7, 14, 30, 60, 90] as const;

// ─── Main page ────────────────────────────────────────────────────────────────

export default withAuth(function DashboardPage() {
  const [daysAgo, setDaysAgo] = useState(30);
  const { data, isLoading, error, refetch } = useDashboard(daysAgo);

  const coreMetrics = data
    ? [
      { title: "Total Members", value: data.totalMembers, icon: Users },
      { title: "Total Workers", value: data.totalWorkers, icon: UserCheck },
      { title: "Total Admins", value: data.totalAdmins, icon: Shield },
      { title: "Today Check-Ins", value: data.totalCheckInsToday, icon: UserCheck },
    ]
    : [];

  const secondaryMetrics = data
    ? [
      { title: "Worker Attendance", value: `${data.workerAttendancePercentage}%`, icon: Percent },
      { title: "Member Attendance", value: `${data.congregationAttendancePercentage}%`, icon: Percent },
      { title: "Active Enrollments", value: data.totalActiveEnrollments, icon: TrendingUp },
      { title: "Pending Leave", value: data.totalPendingLeaveRequests, icon: UserMinus },
    ]
    : [];

  return (
    <div className="space-y-10 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#121212]">
            Overview Dashboard
          </h1>
          <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
            Real-time updates and account summaries
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Days filter */}
          <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDaysAgo(d)}
                className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${daysAgo === d
                  ? "bg-[#121212] text-[#FFFFFF]"
                  : "text-[#8A817C] hover:text-[#121212]"
                  }`}
              >
                {d}d
              </button>
            ))}
          </div>

          {/* Refresh */}
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

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-xs text-red-700">
          <strong className="block font-semibold uppercase tracking-wider text-[11px] mb-1">
            Error
          </strong>
          {error}
        </div>
      )}

      {/* Core metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : coreMetrics.map((m, i) => (
            <MetricCard key={i} title={m.title} value={m.value} icon={m.icon} />
          ))}
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : secondaryMetrics.map((m, i) => (
            <SecondaryMetricCard key={i} title={m.title} value={m.value} icon={m.icon} />
          ))}
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Upcoming events */}
        <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#121212]/10 p-8 rounded-xl space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] flex items-center space-x-2 border-b border-[#121212]/5 pb-4">
            <Calendar className="w-4 h-4 text-[#8A817C]" />
            <span>
              Upcoming Events
              {data ? ` (${data.upcomingEvents.length})` : ""}
            </span>
          </h2>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-28 bg-[#F4F1EA] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !data || data.upcomingEvents.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#8A817C] font-light italic">
              No upcoming events found.
            </div>
          ) : (
            <div className="space-y-6">
              {data.upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-5 border border-[#121212]/10 rounded-xl bg-[#F4F1EA]/10 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <h3 className="text-base font-medium text-[#121212]">
                        {event.name}
                      </h3>
                      <p className="text-xs text-[#8A817C] font-light mt-0.5">
                        {event.description}
                      </p>
                    </div>
                    <div className="font-mono text-xs text-[#121212] bg-[#FFFFFF] px-3 py-1.5 border border-[#121212]/10 rounded-lg self-start shrink-0">
                      <span className="text-[#8A817C] font-sans font-bold uppercase text-[9px] block tracking-wide">
                        Date
                      </span>
                      {event.eventDate}
                    </div>
                  </div>

                  {event.serviceSlots?.map((slot) => {
                    const activeVenue =
                      slot.venueOverride || slot.config?.defaultVenue;
                    return (
                      <div
                        key={slot.id}
                        className="border-t border-[#121212]/5 pt-4 grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs"
                      >
                        <div className="sm:col-span-4 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A817C] block">
                            Time Slot
                          </span>
                          <div className="flex items-center text-[#121212] font-mono">
                            <Clock className="w-3.5 h-3.5 text-[#8A817C] mr-1.5 shrink-0" />
                            <span>
                              {formatSlotTime(slot.startTime)} &mdash;{" "}
                              {formatSlotTime(slot.endTime)}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-[#8A817C]/80 block">
                            {slot.name}
                          </span>
                        </div>

                        {activeVenue && (
                          <div className="sm:col-span-8 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A817C] block">
                              Location
                            </span>
                            <div className="flex items-start text-[#121212] font-light">
                              <MapPin className="w-3.5 h-3.5 text-[#8A817C] mr-1.5 shrink-0 mt-0.5" />
                              <div className="leading-tight">
                                <strong className="font-medium text-[#121212]">
                                  {activeVenue.name}
                                </strong>
                                <span
                                  className="text-[#8A817C] block text-[11px] mt-0.5 font-mono truncate max-w-[300px]"
                                  title={activeVenue.address}
                                >
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
                        <Wifi className="w-2.5 h-2.5" />
                        <span>Online Available</span>
                      </span>
                    )}
                    {event.attendanceMarked && (
                      <span className="px-2 py-0.5 bg-green-50 border border-green-100 text-green-700 text-[9px] font-bold uppercase tracking-wider rounded">
                        Attendance Marked
                      </span>
                    )}
                    {event.recurringEventId && (
                      <span className="px-2 py-0.5 bg-[#EADCC9] text-[#121212] text-[9px] font-bold uppercase tracking-wider rounded inline-flex items-center gap-1">
                        <RefreshCw size={10}/> Recurring
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-5 space-y-6">

          {/* Absent members */}
          <div className="bg-[#FFFFFF] border border-[#121212]/10 p-8 rounded-xl space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] flex items-center space-x-2 border-b border-[#121212]/5 pb-4">
              <AlertCircle className="w-4 h-4 text-[#8A817C]" />
              <span>Members Not Seen Recently</span>
            </h2>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-[#F4F1EA] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !data || data.membersNotSeenRecently.length === 0 ? (
              <div className="text-center py-4 text-xs text-[#8A817C] font-light italic">
                No absent members found.
              </div>
            ) : (
              <div className="divide-y divide-[#121212]/5 max-h-[320px] overflow-y-auto pr-1">
                {data.membersNotSeenRecently.map((member) => (
                  <div
                    key={member.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[#121212] truncate">
                        {member.name}
                      </div>
                      <div className="text-[11px] font-mono text-[#8A817C] truncate mt-0.5">
                        {member.email}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono uppercase font-semibold text-amber-800 bg-amber-50 px-2 py-1 rounded shrink-0 border border-amber-100">
                      {member.lastSeen
                        ? `Seen: ${member.lastSeen}`
                        : "No Record"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly registrations */}
          <div className="bg-[#FFFFFF] border border-[#121212]/10 p-8 rounded-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212]">
              Weekly Registrations
            </h3>

            {isLoading ? (
              <div className="h-20 bg-[#F4F1EA] rounded-xl animate-pulse" />
            ) : !data || data.newMemberRegistrationsTrend.length === 0 ? (
              <div className="text-center py-4 text-xs text-[#8A817C] font-light italic">
                No registration data available.
              </div>
            ) : (
              <div className="space-y-3 font-mono text-xs max-h-[280px] overflow-y-auto pr-1">
                {data.newMemberRegistrationsTrend.map((trend, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-[#121212]/5 bg-[#F4F1EA]/20 rounded-xl space-y-2"
                  >
                    <div className="flex justify-between items-center text-[#8A817C] text-[10px] font-sans font-bold uppercase tracking-wider">
                      <span>Timeline</span>
                      <span>Week: {trend.week}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[#121212] pt-1">
                      <div>
                        <span className="text-[#8A817C] font-sans text-[10px] uppercase block">
                          New Members
                        </span>
                        <strong className="text-base font-semibold">
                          {trend.newMembers}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#8A817C] font-sans text-[10px] uppercase block">
                          New Workers
                        </span>
                        <strong className="text-base font-semibold">
                          {trend.newWorkers}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});