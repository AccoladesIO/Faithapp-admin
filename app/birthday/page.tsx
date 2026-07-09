"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { withAuth } from "@/utils/auth/with-auth";
import { Mail, Phone, RefreshCw, CheckCircle2, Calendar } from "lucide-react";
import { useBirthday, BirthdayMember } from "@/hooks/use-birthday";

const AVATAR_COLORS = [
    "bg-amber-200 text-amber-900",
    "bg-rose-200 text-rose-900",
    "bg-sky-200 text-sky-900",
    "bg-emerald-200 text-emerald-900",
    "bg-violet-200 text-violet-900",
    "bg-orange-200 text-orange-900",
];

const WINDOW_OPTIONS = [
    { label: "7 days",   days: 7 },
    { label: "30 days",  days: 30 },
    { label: "3 months", days: 90 },
    { label: "6 months", days: 180 },
    { label: "1 year",   days: 365 },
];

function avatarColor(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (id.codePointAt(i) ?? 0) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(m: BirthdayMember): string {
    return [m.firstname?.[0], m.lastname?.[0]].filter(Boolean).join("").toUpperCase() || "?";
}

function defaultMessage(firstname: string): string {
    return `Happy Birthday ${firstname}! 🎉 Wishing you a day filled with joy, love, and blessings from your congregation.`;
}

function SkeletonCard() {
    return (
        <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-6 space-y-4 animate-pulse">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#F4F1EA]" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[#F4F1EA] rounded w-36" />
                    <div className="h-3 bg-[#F4F1EA] rounded w-24" />
                </div>
            </div>
            <div className="h-3 bg-[#F4F1EA] rounded w-full" />
            <div className="h-3 bg-[#F4F1EA] rounded w-3/4" />
            <div className="h-10 bg-[#F4F1EA] rounded-lg w-full" />
            <div className="h-9 bg-[#F4F1EA] rounded-lg w-full" />
        </div>
    );
}

interface BirthdayCardProps {
    readonly member: BirthdayMember;
    readonly onSend: (recipientId: string, message: string) => Promise<unknown>;
    readonly isSubmitting: boolean;
}

function BirthdayCard({ member, onSend, isSubmitting }: BirthdayCardProps) {
    const [message, setMessage] = useState(defaultMessage(member.firstname));
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!message.trim() || sent || sending) return;
        setSending(true);
        try {
            await onSend(member.id, message.trim());
            setSent(true);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-6 space-y-5 flex flex-col">
            <div className="flex items-center gap-4">
                {member.profilePhoto ? (
                    <Image
                        src={member.profilePhoto}
                        alt={`${member.firstname} ${member.lastname}`}
                        className="w-14 h-14 rounded-full object-cover shrink-0"
                        width={56}
                        height={56}
                    />
                ) : (
                    <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold shrink-0 ${avatarColor(member.id)}`}
                    >
                        {initials(member)}
                    </div>
                )}
                <div className="min-w-0">
                    <h3 className="text-sm font-light text-[#121212] truncate">
                        {member.firstname} {member.lastname}
                    </h3>
                    <p className="text-[11px] font-semibold text-amber-600 mt-0.5">
                        🎂 Today is their birthday!
                    </p>
                </div>
            </div>

            <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-[#8A817C]">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono truncate">{member.email}</span>
                </div>
                {member.phoneNumber && (
                    <div className="flex items-center gap-2 text-xs text-[#8A817C]">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-mono">{member.phoneNumber}</span>
                    </div>
                )}
            </div>

            <div className="flex-1 space-y-3">
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    disabled={sent}
                    className="w-full px-3 py-2 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none disabled:opacity-60"
                />

                {sent ? (
                    <div className="flex items-center gap-2 h-10 px-4 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700 font-semibold">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        Wishes sent!
                    </div>
                ) : (
                    <button
                        onClick={handleSend}
                        disabled={sending || isSubmitting || !message.trim()}
                        className="flex items-center gap-2 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors disabled:opacity-50 w-full justify-center"
                    >
                        {sending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        Send Wishes
                    </button>
                )}
            </div>
        </div>
    );
}

function formatDayLabel(member: BirthdayMember): string {
    if (!member.dateOfBirth && (!member.birthMonth || !member.birthDay)) return "";
    const dob = member.dateOfBirth
        ? new Date(member.dateOfBirth)
        : new Date(new Date().getFullYear(), (member.birthMonth ?? 1) - 1, member.birthDay ?? 1);
    return dob.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

function UpcomingRow({ member }: { readonly member: BirthdayMember }) {
    return (
        <div className="flex items-center gap-4 p-4 border-b border-[#121212]/5 last:border-0">
            {member.profilePhoto ? (
                <Image
                    src={member.profilePhoto}
                    alt={`${member.firstname} ${member.lastname}`}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                    width={40}
                    height={40}
                />
            ) : (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${avatarColor(member.id)}`}>
                    {initials(member)}
                </div>
            )}
            <div className="min-w-0 flex-1">
                <p className="text-sm font-light text-[#121212] truncate">
                    {member.firstname} {member.lastname}
                </p>
                {member.email && (
                    <p className="text-[11px] font-mono text-[#8A817C] truncate">{member.email}</p>
                )}
            </div>
            <span className="text-[11px] font-semibold text-amber-600 shrink-0">
                {formatDayLabel(member)}
            </span>
        </div>
    );
}

function BirthdayPage() {
    const {
        todayBirthdays, upcomingBirthdays,
        isLoading, isLoadingUpcoming, isSubmitting,
        fetchTodayBirthdays, fetchUpcomingBirthdays, sendWish,
    } = useBirthday();

    const [daysWindow, setDaysWindow] = useState(7);

    useEffect(() => {
        fetchTodayBirthdays();
    }, [fetchTodayBirthdays]);

    useEffect(() => {
        fetchUpcomingBirthdays(daysWindow);
    }, [fetchUpcomingBirthdays, daysWindow]);

    const activeWindowLabel = WINDOW_OPTIONS.find(o => o.days === daysWindow)?.label ?? "upcoming";

    return (
        <div className="space-y-10 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                        Birthdays
                    </h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Celebrate with your congregation
                    </p>
                </div>

                {!isLoading && todayBirthdays.length > 0 && (
                    <span className="self-start sm:self-auto text-[10px] font-mono text-[#8A817C] border border-[#121212]/10 px-3 py-1.5 rounded-lg">
                        {todayBirthdays.length}{" "}
                        {todayBirthdays.length === 1 ? "birthday" : "birthdays"} today
                    </span>
                )}
            </div>

            {/* ── Today ─────────────────────────────────────────────────────────── */}
            <div className="space-y-4">
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">
                    Today
                </h2>

                {isLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                )}

                {!isLoading && todayBirthdays.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl">
                        <span className="text-4xl">🎂</span>
                        <p className="text-sm font-light text-[#8A817C]">No birthdays today</p>
                    </div>
                )}

                {!isLoading && todayBirthdays.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {todayBirthdays.map((member) => (
                            <BirthdayCard
                                key={member.id}
                                member={member}
                                onSend={sendWish}
                                isSubmitting={isSubmitting}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Upcoming ──────────────────────────────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#8A817C]" />
                        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">
                            Upcoming — {activeWindowLabel}
                        </h2>
                        {!isLoadingUpcoming && (
                            <span className="text-[10px] font-mono text-[#8A817C] border border-[#121212]/10 px-2 py-0.5 rounded">
                                {upcomingBirthdays.length}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                        {WINDOW_OPTIONS.map((opt) => (
                            <button
                                key={opt.days}
                                type="button"
                                onClick={() => setDaysWindow(opt.days)}
                                className={`h-7 px-3 text-[11px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${
                                    daysWindow === opt.days
                                        ? "bg-[#121212] text-white"
                                        : "border border-[#121212]/10 text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA]"
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
                    {isLoadingUpcoming && (
                        <div className="p-8 space-y-3 animate-pulse">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[#F4F1EA] shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 bg-[#F4F1EA] rounded w-32" />
                                        <div className="h-2.5 bg-[#F4F1EA] rounded w-48" />
                                    </div>
                                    <div className="h-3 bg-[#F4F1EA] rounded w-20 shrink-0" />
                                </div>
                            ))}
                        </div>
                    )}

                    {!isLoadingUpcoming && upcomingBirthdays.length === 0 && (
                        <div className="py-12 text-center">
                            <p className="text-sm font-light text-[#8A817C]">
                                No birthdays in the next {activeWindowLabel}
                            </p>
                        </div>
                    )}

                    {!isLoadingUpcoming && upcomingBirthdays.length > 0 && (
                        <div>
                            {upcomingBirthdays.map((member) => (
                                <UpcomingRow key={member.id} member={member} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default withAuth(BirthdayPage, { requiredPermission: 'members:read' });
