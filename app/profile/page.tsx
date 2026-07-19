"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Mail,
    Phone,
    Shield,
    User,
    Calendar,
    Heart,
    CheckCircle2,
    Circle,
    KeyRound,
    ChevronRight,
    ArrowLeft,
} from "lucide-react";
import { withAuth } from "@/utils/auth/with-auth";
import { useAdminProfile } from "@/hooks/use-admin-profile";
import { PERMISSION_GROUPS } from "@/hooks/use-admin-management";
import { DismissibleError } from "@/components/ui/dismissible-error";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const AVATAR_COLORS = [
    "bg-amber-200 text-amber-900",
    "bg-rose-200 text-rose-900",
    "bg-sky-200 text-sky-900",
    "bg-emerald-200 text-emerald-900",
    "bg-violet-200 text-violet-900",
    "bg-orange-200 text-orange-900",
];

function avatarColor(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (id.codePointAt(i) ?? 0) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDate(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null;
    const d = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatYear(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return String(d.getFullYear());
}

function SkeletonBlock({ className }: Readonly<{ className: string }>) {
    return <div className={`bg-[#F4F1EA] animate-pulse rounded ${className}`} />;
}

function DetailRow({ icon: Icon, label, value }: Readonly<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | null | undefined;
}>) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 p-1.5 bg-[#F4F1EA] rounded-lg">
                <Icon className="w-3.5 h-3.5 text-[#8A817C]" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">{label}</p>
                <p className="text-sm font-light text-[#121212] mt-0.5">{value}</p>
            </div>
        </div>
    );
}

function ProfilePage() {
    const router = useRouter();
    const { profile, isLoading, error, fetchProfile } = useAdminProfile();

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const member = profile?.member;
    const role = profile?.adminRole;

    const initials = member
        ? [member.firstname?.[0], member.lastname?.[0]].filter(Boolean).join("").toUpperCase()
        : "?";

    const permissionSet = new Set(role?.permissions ?? []);

    let dob: string | null = null;
    if (member?.birthDay && member?.birthMonth) {
        const monthName = MONTHS[(member.birthMonth ?? 1) - 1];
        dob = member.birthYear
            ? `${member.birthDay} ${monthName} ${member.birthYear}`
            : `${member.birthDay} ${monthName}`;
    }

    const genderLabel = member?.gender
        ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1).toLowerCase()
        : null;

    const maritalLabel = member?.maritalStatus
        ? member.maritalStatus.replaceAll("_", " ")
        : null;

    return (
        <div className="space-y-8 font-sans">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="p-2 border border-[#121212]/10 text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] rounded-lg transition-colors"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-light tracking-tight text-[#121212]">My Profile</h1>
                        <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                            Your admin account details
                        </p>
                    </div>
                </div>
                <Link
                    href="/change-password"
                    className="flex items-center gap-2 h-9 px-4 border border-[#121212]/10 text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] text-[11px] font-semibold uppercase tracking-wider rounded-lg transition-colors shrink-0"
                >
                    <KeyRound className="w-3.5 h-3.5" />
                    Change Password
                </Link>
            </div>

            <DismissibleError message={error} />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* ── Left: Personal Info ──────────────────────────────────── */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Avatar + name card */}
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-6">
                        {isLoading ? (
                            <div className="flex flex-col items-center gap-4 py-4">
                                <SkeletonBlock className="w-20 h-20 rounded-full" />
                                <SkeletonBlock className="w-40 h-4" />
                                <SkeletonBlock className="w-24 h-3" />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4 py-2">
                                <div
                                    className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold shrink-0 ${profile ? avatarColor(profile.id) : "bg-[#F4F1EA] text-[#8A817C]"}`}
                                >
                                    {initials}
                                </div>
                                <div className="text-center">
                                    <h2 className="text-lg font-light text-[#121212] tracking-tight">
                                        {member?.firstname} {member?.lastname}
                                    </h2>
                                    {role && (
                                        <span className="inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-widest bg-[#121212] text-white px-3 py-1 rounded-full">
                                            {role.name}
                                        </span>
                                    )}
                                </div>
                                {profile && (
                                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${profile.isActive ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
                                        {profile.isActive ? "Active" : "Inactive"}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Contact & personal details */}
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-6 space-y-5">
                        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">
                            Personal Details
                        </h3>
                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <SkeletonBlock className="w-8 h-8 rounded-lg shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <SkeletonBlock className="h-2.5 w-16" />
                                            <SkeletonBlock className="h-3.5 w-40" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <DetailRow icon={Mail} label="Email" value={member?.email} />
                                <DetailRow icon={Phone} label="Phone" value={member?.phoneNumber} />
                                <DetailRow icon={User} label="Gender" value={genderLabel} />
                                <DetailRow icon={Calendar} label="Date of Birth" value={dob} />
                                <DetailRow icon={Heart} label="Marital Status" value={maritalLabel} />
                                <DetailRow icon={Calendar} label="Date Joined Church" value={formatDate(member?.dateJoinedChurch)} />
                                <DetailRow icon={Calendar} label="Year Born Again" value={formatYear(member?.yearBornAgain)} />
                                <DetailRow icon={Calendar} label="Year Baptized (Water)" value={formatYear(member?.yearBaptized)} />
                                {member?.baptizedWithHolyGhost && (
                                    <DetailRow icon={CheckCircle2} label="Holy Ghost Baptism" value="Yes" />
                                )}
                                {profile?.createdAt && (
                                    <DetailRow icon={Shield} label="Admin Since" value={formatDate(profile.createdAt)} />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right: Role & Permissions ─────────────────────────────── */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Role info */}
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-6 space-y-4">
                        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">
                            Role
                        </h3>
                        {isLoading ? (
                            <div className="space-y-2">
                                <SkeletonBlock className="h-5 w-40" />
                                <SkeletonBlock className="h-3.5 w-64" />
                            </div>
                        ) : role ? (
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-[#121212] rounded-lg shrink-0">
                                    <Shield className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#121212]">{role.name}</p>
                                    {role.description && (
                                        <p className="text-xs font-light text-[#8A817C] mt-0.5 leading-relaxed">
                                            {role.description}
                                        </p>
                                    )}
                                    <p className="text-[10px] font-mono text-[#8A817C] mt-1.5 border border-[#121212]/10 inline-block px-2 py-0.5 rounded">
                                        {role.permissions.length} permission{role.permissions.length !== 1 ? "s" : ""}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-[#8A817C] font-light italic">No role assigned.</p>
                        )}
                    </div>

                    {/* Permissions by group */}
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-6 space-y-5">
                        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">
                            Permissions
                        </h3>
                        {isLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <div key={i} className="space-y-2">
                                        <SkeletonBlock className="h-3 w-28" />
                                        <SkeletonBlock className="h-3 w-36" />
                                        <SkeletonBlock className="h-3 w-32" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                                {PERMISSION_GROUPS.map((group) => {
                                    if (group.permissions.length === 0) return null;
                                    return (
                                        <div key={group.group} className="space-y-1.5">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <ChevronRight className="w-3 h-3 text-[#8A817C]/50 shrink-0" />
                                                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">
                                                    {group.group}
                                                </p>
                                            </div>
                                            {group.permissions.map((p) => {
                                                const has = permissionSet.has(p.value);
                                                return (
                                                    <div key={p.value} className="flex items-center gap-2">
                                                        {has
                                                            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                                            : <Circle className="w-3.5 h-3.5 text-[#8A817C]/30 shrink-0" />
                                                        }
                                                        <span className={`text-xs font-light ${has ? "text-[#121212]" : "text-[#8A817C]/50"}`}>
                                                            {p.label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default withAuth(ProfilePage);
