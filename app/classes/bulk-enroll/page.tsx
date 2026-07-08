"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, Search, UserRoundPlus, RefreshCw, CheckCircle2,
    ShieldAlert, X, ChevronLeft, ChevronRight, Users,
} from "lucide-react";
import { useClasses, ChurchClass, ClassType } from "@/hooks/use-classes";
import { useMembers, Member } from "@/hooks/use-member";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fullName = (m: { firstname: string; lastname: string }) =>
    [m.firstname, m.lastname].filter(Boolean).join(" ");

const CLASS_TYPE_LABELS: Record<ClassType, string> = {
    BELIEVERS: "Believers",
    BAPTISMAL: "Baptismal",
    WORKERS_IN_TRAINING: "Workers in Training",
    BIBLE_COLLEGE: "Bible College",
    SCHOOL_OF_DISCIPLESHIP: "School of Discipleship",
};

// ─── Class selector combobox ──────────────────────────────────────────────────

function ClassCombobox({
    classes,
    value,
    onChange,
}: {
    classes: ChurchClass[];
    value: string;
    onChange: (id: string) => void;
}) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const selected = classes.find((c) => c.id === value);

    const filtered = useMemo(() => {
        const q = query.toLowerCase();
        return (q ? classes.filter((c) => c.name.toLowerCase().includes(q)) : classes)
            .filter((c) => c.status !== "CLOSED")
            .slice(0, 50);
    }, [query, classes]);

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    const select = (id: string) => { onChange(id); setQuery(""); setOpen(false); };
    const clear = (e: React.MouseEvent) => { e.stopPropagation(); onChange(""); setQuery(""); };

    return (
        <div ref={ref} className="relative">
            <div
                className="flex items-center w-full h-11 px-4 bg-white border border-[#121212]/10 rounded-xl focus-within:border-[#121212] transition-colors cursor-text gap-2"
                onClick={() => setOpen(true)}
            >
                {selected && !open ? (
                    <>
                        <span className="flex-1 text-sm text-[#121212] font-light truncate">{selected.name}</span>
                        <span className="text-[10px] text-[#8A817C] font-semibold uppercase tracking-wider shrink-0">
                            {CLASS_TYPE_LABELS[selected.type]}
                        </span>
                        <button type="button" onClick={clear} className="shrink-0 text-[#8A817C] hover:text-[#121212] ml-1">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </>
                ) : (
                    <input
                        autoFocus={open}
                        type="text"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                        placeholder={selected ? selected.name : "Search active classes…"}
                        className="flex-1 bg-transparent text-sm text-[#121212] font-light outline-none placeholder:text-[#8A817C]/60"
                    />
                )}
            </div>
            {open && (
                <div className="absolute z-30 top-full mt-1 w-full bg-white border border-[#121212]/10 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="p-4 text-xs text-[#8A817C] text-center">No active classes found</div>
                    ) : (
                        filtered.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => select(c.id)}
                                className={`w-full text-left px-4 py-3 hover:bg-[#F4F1EA] transition-colors flex items-center justify-between gap-4 ${c.id === value ? "bg-[#F4F1EA]/70" : ""}`}
                            >
                                <span className="text-sm text-[#121212] font-light">{c.name}</span>
                                <span className="text-[10px] text-[#8A817C] font-semibold uppercase tracking-wider shrink-0">
                                    {CLASS_TYPE_LABELS[c.type]}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({
    member,
    checked,
    alreadyEnrolled,
    onToggle,
}: {
    member: Member;
    checked: boolean;
    alreadyEnrolled: boolean;
    onToggle: () => void;
}) {
    return (
        <label
            className={`flex items-center gap-4 px-4 py-3 border-b border-[#121212]/5 last:border-0 transition-colors ${alreadyEnrolled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-[#F4F1EA]/30"}`}
        >
            <input
                type="checkbox"
                checked={checked}
                disabled={alreadyEnrolled}
                onChange={onToggle}
                className="w-4 h-4 accent-[#121212] shrink-0"
            />
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#121212] truncate">{fullName(member)}</div>
                <div className="text-[11px] font-mono text-[#8A817C] truncate">{member.email}</div>
            </div>
            {alreadyEnrolled && (
                <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-[#8A817C] bg-[#F4F1EA] border border-[#121212]/10 px-2 py-0.5 rounded">
                    Enrolled
                </span>
            )}
        </label>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const BulkEnrollPage = () => {
    const router = useRouter();
    const { classes, isLoading: classesLoading } = useClasses("", 200);
    const { members, isLoading: membersLoading } = useMembers(500);

    const [selectedClassId, setSelectedClassId] = useState("");
    const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
    const [loadingEnrolled, setLoadingEnrolled] = useState(false);

    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<{ enrolled: number; skipped: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load current enrollments when class changes
    const loadEnrolled = useCallback(async (classId: string) => {
        setLoadingEnrolled(true);
        setEnrolledIds(new Set());
        setSelected(new Set());
        try {
            // Fetch all enrollments for the class (large limit to get all)
            const res = await api.get(`/classes/${classId}/enrollments?page=1&limit=500`);
            const list = res.data?.data?.data ?? [];
            setEnrolledIds(new Set(list.map((e: { member: { id: string } }) => e.member.id)));
        } catch {
            // non-fatal — enrolled indicators won't show
        } finally {
            setLoadingEnrolled(false);
        }
    }, []);

    useEffect(() => {
        if (selectedClassId) loadEnrolled(selectedClassId);
    }, [selectedClassId, loadEnrolled]);

    // Filtered + paginated member list
    const filteredMembers = useMemo(() => {
        const q = search.toLowerCase();
        return q
            ? members.filter(
                (m) =>
                    fullName(m).toLowerCase().includes(q) ||
                    m.email.toLowerCase().includes(q)
            )
            : members;
    }, [members, search]);

    const totalPages = Math.ceil(filteredMembers.length / PAGE_SIZE);
    const pageMembers = filteredMembers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // Reset page when search changes
    useEffect(() => { setPage(1); }, [search]);

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const togglePageAll = () => {
        const eligible = pageMembers.filter((m) => !enrolledIds.has(m.id));
        const allChecked = eligible.every((m) => selected.has(m.id));
        setSelected((prev) => {
            const next = new Set(prev);
            if (allChecked) eligible.forEach((m) => next.delete(m.id));
            else eligible.forEach((m) => next.add(m.id));
            return next;
        });
    };

    const selectedList = useMemo(
        () => members.filter((m) => selected.has(m.id)),
        [members, selected]
    );

    const handleSubmit = async () => {
        if (!selectedClassId || selected.size === 0) return;
        setIsSubmitting(true);
        setError(null);
        setResult(null);
        try {
            const res = await api.post("/classes/bulk-enroll", {
                classId: selectedClassId,
                memberIds: Array.from(selected),
            });
            const data = res.data?.data;
            setResult(data);
            setSelected(new Set());
            // Refresh enrolled IDs
            loadEnrolled(selectedClassId);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to enrol members.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const eligibleOnPage = pageMembers.filter((m) => !enrolledIds.has(m.id));
    const allPageChecked = eligibleOnPage.length > 0 && eligibleOnPage.every((m) => selected.has(m.id));

    return (
        <div className="space-y-8 font-sans">

            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.push("/classes")}
                    className="p-2 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Bulk Enrol</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Select a class and choose members to enrol in one action
                    </p>
                </div>
            </div>

            {/* Class selector */}
            <div className="bg-white border border-[#121212]/10 rounded-xl p-6 space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#8A817C]">
                    Class
                </label>
                {classesLoading ? (
                    <div className="h-11 bg-[#F4F1EA] animate-pulse rounded-xl" />
                ) : (
                    <ClassCombobox
                        classes={classes}
                        value={selectedClassId}
                        onChange={setSelectedClassId}
                    />
                )}
            </div>

            {/* Member picker + summary — shown once class is selected */}
            {selectedClassId && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Member list */}
                    <div className="lg:col-span-7 bg-white border border-[#121212]/10 rounded-xl flex flex-col overflow-hidden">

                        {/* Search + select-all */}
                        <div className="p-4 border-b border-[#121212]/5 flex items-center gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A817C]" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search members by name or email…"
                                    className="w-full h-9 pl-9 pr-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg"
                                />
                            </div>
                            <label className="flex items-center gap-2 text-xs text-[#8A817C] cursor-pointer shrink-0">
                                <input
                                    type="checkbox"
                                    checked={allPageChecked}
                                    onChange={togglePageAll}
                                    disabled={eligibleOnPage.length === 0}
                                    className="w-4 h-4 accent-[#121212]"
                                />
                                This page
                            </label>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto">
                            {membersLoading || loadingEnrolled ? (
                                <div className="p-8 text-center text-xs text-[#8A817C] animate-pulse">Loading members…</div>
                            ) : pageMembers.length === 0 ? (
                                <div className="p-8 text-center text-xs text-[#8A817C]">No members found.</div>
                            ) : (
                                pageMembers.map((m) => (
                                    <MemberRow
                                        key={m.id}
                                        member={m}
                                        checked={selected.has(m.id)}
                                        alreadyEnrolled={enrolledIds.has(m.id)}
                                        onToggle={() => toggle(m.id)}
                                    />
                                ))
                            )}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="p-3 border-t border-[#121212]/5 flex items-center justify-between">
                                <span className="text-[11px] font-mono text-[#8A817C]">
                                    Page {page} of {totalPages}
                                    <span className="ml-2 text-[#121212]/30">({filteredMembers.length} members)</span>
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        disabled={page <= 1}
                                        onClick={() => setPage((p) => p - 1)}
                                        className="p-1.5 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212] hover:bg-[#F4F1EA]"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        disabled={page >= totalPages}
                                        onClick={() => setPage((p) => p + 1)}
                                        className="p-1.5 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212] hover:bg-[#F4F1EA]"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Summary panel */}
                    <div className="lg:col-span-5 flex flex-col gap-4">

                        {/* Feedback */}
                        {result && (
                            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-100 rounded-xl text-xs text-green-800">
                                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
                                <div>
                                    <p className="font-semibold">{result.enrolled} member{result.enrolled !== 1 ? "s" : ""} enrolled successfully.</p>
                                    {result.skipped > 0 && (
                                        <p className="text-green-700 mt-0.5">{result.skipped} skipped (already enrolled or completed).</p>
                                    )}
                                </div>
                            </div>
                        )}
                        {error && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">
                                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                                {error}
                            </div>
                        )}

                        {/* Selected summary card */}
                        <div className="bg-white border border-[#121212]/10 rounded-xl p-5 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-[#8A817C]" />
                                    <span className="text-sm font-semibold text-[#121212]">
                                        {selected.size} selected
                                    </span>
                                </div>
                                {selected.size > 0 && (
                                    <button
                                        onClick={() => setSelected(new Set())}
                                        className="text-[10px] font-semibold uppercase tracking-wider text-[#8A817C] hover:text-[#121212] transition-colors"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>

                            {selectedList.length === 0 ? (
                                <p className="text-xs text-[#8A817C] font-light text-center py-4">
                                    Tick members on the left to add them here.
                                </p>
                            ) : (
                                <div className="max-h-64 overflow-y-auto pr-1 space-y-1">
                                    {selectedList.map((m) => (
                                        <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-[#F4F1EA]/40 rounded-lg">
                                            <span className="text-xs text-[#121212] truncate">{fullName(m)}</span>
                                            <button
                                                onClick={() => toggle(m.id)}
                                                className="shrink-0 text-[#8A817C] hover:text-[#121212] transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || selected.size === 0}
                                className="w-full h-12 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 rounded-xl"
                            >
                                {isSubmitting
                                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enrolling…</>
                                    : <><UserRoundPlus className="w-3.5 h-3.5" /> Enrol {selected.size > 0 ? selected.size : ""} Member{selected.size !== 1 ? "s" : ""}</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default withAuth(BulkEnrollPage, { requiredPermission: 'classes:write' });
