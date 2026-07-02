"use client";

import React, { useState, useEffect, useCallback } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    BookOpen, Plus, X,
    Trash2, Pencil, Eye, RefreshCw, Users, Calendar,
    CheckCircle2, ShieldAlert, Check, ClipboardList,
    LockKeyhole, UnlockKeyhole,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
    useSundaySchool,
    SSClass,
    SSSession,
    SSAttendance,
    SSMember,
    AttendanceStatus,
} from "@/hooks/use-sunday-school";
import Error from "@/components/layout/error";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fullName = (o: { firstname: string; lastname: string }) =>
    [o.firstname, o.lastname].filter(Boolean).join(" ");

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

// ── Skeleton ──────────────────────────────────────────────────────────────────

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

// ── Status badge ──────────────────────────────────────────────────────────────

function AttendanceBadge({ status }: { status: AttendanceStatus }) {
    const map: Record<AttendanceStatus, string> = {
        PRESENT: "bg-green-100 border-green-200 text-green-700",
        ABSENT: "bg-red-100 border-red-200 text-red-700",
        EXCUSED: "bg-amber-100 border-amber-200 text-amber-700",
    };
    return (
        <span className={`inline-block px-2 py-0.5 border text-[9px] font-bold uppercase tracking-wider rounded ${map[status]}`}>
            {status}
        </span>
    );
}

function SessionStatusBadge({ status }: { status: "OPEN" | "CLOSED" }) {
    return status === "OPEN" ? (
        <span className="inline-block px-2 py-0.5 bg-green-100 border border-green-200 text-green-700 text-[9px] font-bold uppercase tracking-wider rounded">
            Open
        </span>
    ) : (
        <span className="inline-block px-2 py-0.5 bg-[#F4F1EA] border border-[#121212]/10 text-[#8A817C] text-[9px] font-bold uppercase tracking-wider rounded">
            Closed
        </span>
    );
}


// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                {label}
            </label>
            {children}
        </div>
    );
}

const inputCls = "w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg";
const submitCls = "w-full h-12 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 rounded-xl";

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "classes" | "sessions";

function SundaySchoolPage() {
    const ss = useSundaySchool();
    const [activeTab, setActiveTab] = useState<Tab>("classes");

    // ── Class panel ───────────────────────────────────────────────────────────
    const [selectedClass, setSelectedClass] = useState<SSClass | null>(null);
    const [classPanel, setClassPanel] = useState<"members" | null>(null);
    const [classMembers, setClassMembers] = useState<SSMember[]>([]);
    const [membersPagination, setMembersPagination] = useState<any>(null);
    const [membersPage, setMembersPage] = useState(1);
    const [membersLoading, setMembersLoading] = useState(false);
    const [addMemberId, setAddMemberId] = useState("");
    const [memberActionMsg, setMemberActionMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

    // ── Create class modal ────────────────────────────────────────────────────
    const [showCreateClass, setShowCreateClass] = useState(false);
    const [classForm, setClassForm] = useState({ name: "", description: "", teacherId: "" });
    const [classFormMsg, setClassFormMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

    // ── Edit class ────────────────────────────────────────────────────────────
    const [editingClassId, setEditingClassId] = useState<string | null>(null);
    const [editClassForm, setEditClassForm] = useState({ name: "", description: "", teacherId: "" });

    // ── Delete class confirm ──────────────────────────────────────────────────
    const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

    // ── Sessions state ────────────────────────────────────────────────────────
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [showCreateSession, setShowCreateSession] = useState(false);
    const [sessionForm, setSessionForm] = useState({ classId: "", sessionDate: "", notes: "" });
    const [sessionFormMsg, setSessionFormMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
    const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

    // ── Open session modal ────────────────────────────────────────────────────
    const [openSessionId, setOpenSessionId] = useState<string | null>(null);
    const [closesInMinutes, setClosesInMinutes] = useState("60");

    // ── Roster modal ──────────────────────────────────────────────────────────
    const [rosterSessionId, setRosterSessionId] = useState<string | null>(null);
    const [roster, setRoster] = useState<SSAttendance[]>([]);
    const [rosterLoading, setRosterLoading] = useState(false);

    // ── Mark attendance modal ─────────────────────────────────────────────────
    const [markSessionId, setMarkSessionId] = useState<string | null>(null);
    const [markMembers, setMarkMembers] = useState<SSMember[]>([]);
    const [markStatuses, setMarkStatuses] = useState<Record<string, AttendanceStatus>>({});
    const [markLoading, setMarkLoading] = useState(false);
    const [markMsg, setMarkMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

    // ── Initial load ──────────────────────────────────────────────────────────
    useEffect(() => {
        ss.fetchClasses(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Load sessions when class selected ────────────────────────────────────
    useEffect(() => {
        if (selectedClassId) ss.fetchSessions(selectedClassId, 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedClassId]);

    // ── Class member helpers ──────────────────────────────────────────────────
    const loadClassMembers = useCallback(async (classId: string, page = 1) => {
        setMembersLoading(true);
        const { members, pagination } = await ss.fetchClassMembers(classId, page);
        setClassMembers(members);
        setMembersPagination(pagination);
        setMembersPage(page);
        setMembersLoading(false);
    }, [ss]);

    const openClassPanel = useCallback((cls: SSClass) => {
        setSelectedClass(cls);
        setClassPanel("members");
        setMemberActionMsg(null);
        setAddMemberId("");
        loadClassMembers(cls.id, 1);
    }, [loadClassMembers]);

    const closeClassPanel = () => {
        setSelectedClass(null);
        setClassPanel(null);
    };

    // ── Create class ──────────────────────────────────────────────────────────
    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        setClassFormMsg(null);
        try {
            await ss.createClass({
                name: classForm.name,
                ...(classForm.description ? { description: classForm.description } : {}),
                ...(classForm.teacherId ? { teacherId: classForm.teacherId } : {}),
            });
            setClassForm({ name: "", description: "", teacherId: "" });
            setShowCreateClass(false);
            setClassFormMsg({ type: "ok", text: "Class created." });
            setTimeout(() => setClassFormMsg(null), 3000);
        } catch (err: any) {
            setClassFormMsg({ type: "err", text: err?.message ?? "Failed to create class." });
        }
    };

    // ── Update class ──────────────────────────────────────────────────────────
    const handleUpdateClass = async (id: string) => {
        try {
            await ss.updateClass(id, {
                name: editClassForm.name,
                ...(editClassForm.description ? { description: editClassForm.description } : {}),
                ...(editClassForm.teacherId ? { teacherId: editClassForm.teacherId } : {}),
            });
            setEditingClassId(null);
        } catch {
            // surfaced via hook error
        }
    };

    // ── Delete class ──────────────────────────────────────────────────────────
    const handleDeleteClass = async (id: string) => {
        try {
            await ss.deleteClass(id);
            if (selectedClass?.id === id) closeClassPanel();
            setDeletingClassId(null);
        } catch {
            // surfaced via hook error
        }
    };

    // ── Add/remove member ─────────────────────────────────────────────────────
    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClass || !addMemberId.trim()) return;
        setMemberActionMsg(null);
        try {
            await ss.addMemberToClass(selectedClass.id, addMemberId.trim());
            setAddMemberId("");
            setMemberActionMsg({ type: "ok", text: "Member added." });
            loadClassMembers(selectedClass.id, membersPage);
            setTimeout(() => setMemberActionMsg(null), 3000);
        } catch (err: any) {
            setMemberActionMsg({ type: "err", text: err?.message ?? "Failed to add member." });
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!selectedClass) return;
        setMemberActionMsg(null);
        try {
            await ss.removeMemberFromClass(selectedClass.id, memberId);
            setMemberActionMsg({ type: "ok", text: "Member removed." });
            loadClassMembers(selectedClass.id, membersPage);
            setTimeout(() => setMemberActionMsg(null), 3000);
        } catch (err: any) {
            setMemberActionMsg({ type: "err", text: err?.message ?? "Failed to remove member." });
        }
    };

    // ── Create session ────────────────────────────────────────────────────────
    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        setSessionFormMsg(null);
        try {
            await ss.createSession({
                classId: sessionForm.classId,
                sessionDate: sessionForm.sessionDate,
                ...(sessionForm.notes ? { notes: sessionForm.notes } : {}),
            });
            setSessionForm({ classId: selectedClassId, sessionDate: "", notes: "" });
            setShowCreateSession(false);
            setSessionFormMsg({ type: "ok", text: "Session created." });
            setTimeout(() => setSessionFormMsg(null), 3000);
        } catch (err: any) {
            setSessionFormMsg({ type: "err", text: err?.message ?? "Failed to create session." });
        }
    };

    // ── Delete session ────────────────────────────────────────────────────────
    const handleDeleteSession = async (id: string) => {
        try {
            await ss.deleteSession(id);
            setDeletingSessionId(null);
        } catch {
            // surfaced via hook error
        }
    };

    // ── Open session ──────────────────────────────────────────────────────────
    const handleOpenSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!openSessionId) return;
        try {
            await ss.openSession(openSessionId, Number(closesInMinutes));
            setOpenSessionId(null);
        } catch {
            // surfaced via hook error
        }
    };

    // ── Close session ─────────────────────────────────────────────────────────
    const handleCloseSession = async (id: string) => {
        try {
            await ss.closeSession(id);
        } catch {
            // surfaced via hook error
        }
    };

    // ── Load roster ───────────────────────────────────────────────────────────
    const openRoster = useCallback(async (sessionId: string) => {
        setRosterSessionId(sessionId);
        setRosterLoading(true);
        const data = await ss.fetchRoster(sessionId);
        setRoster(data);
        setRosterLoading(false);
    }, [ss]);

    // ── Mark attendance ───────────────────────────────────────────────────────
    const openMarkAttendance = useCallback(async (session: SSSession) => {
        setMarkSessionId(session.id);
        setMarkMsg(null);
        setMarkLoading(true);
        const { members } = await ss.fetchClassMembers(session.classId, 1);
        const initial: Record<string, AttendanceStatus> = {};
        members.forEach((m) => { initial[m.id] = "PRESENT"; });
        setMarkMembers(members);
        setMarkStatuses(initial);
        setMarkLoading(false);
    }, [ss]);

    const handleBulkMark = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!markSessionId) return;
        setMarkMsg(null);
        try {
            const attendances = Object.entries(markStatuses).map(([memberId, status]) => ({
                memberId,
                status,
            }));
            const result = await ss.bulkMarkAttendance(markSessionId, attendances);
            setMarkMsg({ type: "ok", text: `Marked ${result.marked} attendance record(s).` });
            setTimeout(() => { setMarkSessionId(null); setMarkMsg(null); }, 2000);
        } catch (err: any) {
            setMarkMsg({ type: "err", text: err?.message ?? "Failed to mark attendance." });
        }
    };

    const switchToSessionsForClass = (cls: SSClass) => {
        setSelectedClassId(cls.id);
        closeClassPanel();
        setActiveTab("sessions");
    };

    const classPanelOpen = selectedClass !== null;
    const sessionPanelOpen = showCreateSession || !!openSessionId || !!rosterSessionId || !!markSessionId;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-10 font-sans">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Sunday School</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Manage classes, sessions, and attendance records
                    </p>
                </div>
                <button
                    onClick={() => ss.fetchClasses(ss.classPage)}
                    disabled={ss.isLoading}
                    className="p-2 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-40"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${ss.isLoading ? "animate-spin" : ""}`} />
                </button>
            </div>

            {/* Global error */}
            {ss.error && <Error error={ss.error} />}

            {/* Tabs */}
            <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl w-fit">
                {(["classes", "sessions"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex items-center space-x-1.5 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${
                            activeTab === tab
                                ? "bg-[#121212] text-[#FFFFFF]"
                                : "text-[#8A817C] hover:text-[#121212]"
                        }`}
                    >
                        {tab === "classes" ? <BookOpen className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                        <span>{tab}</span>
                    </button>
                ))}
            </div>

            {/* ── Classes tab ── */}
            {activeTab === "classes" && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-mono text-[#8A817C]">
                            {ss.classPagination?.totalCount ?? ss.classes.length} class{(ss.classPagination?.totalCount ?? ss.classes.length) !== 1 ? "es" : ""}
                        </span>
                        <button
                            onClick={() => {
                                closeClassPanel();
                                setShowCreateClass(true);
                                setClassForm({ name: "", description: "", teacherId: "" });
                                setClassFormMsg(null);
                            }}
                            className="flex items-center gap-1.5 h-9 px-4 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            New Class
                        </button>
                    </div>

                    {classFormMsg?.type === "ok" && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700 mb-4">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            {classFormMsg.text}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Table */}
                        <div className={`${(classPanelOpen || showCreateClass) ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden transition-all`}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Name</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Description</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Teacher</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] text-center">Members</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                        {ss.isLoading ? (
                                            Array.from({ length: 6 }).map((_, i) => (
                                                <SkeletonRow key={i} cols={5} />
                                            ))
                                        ) : ss.classes.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                                    No classes found.
                                                </td>
                                            </tr>
                                        ) : (
                                            ss.classes.map((cls) => (
                                                <tr
                                                    key={cls.id}
                                                    onClick={() => openClassPanel(cls)}
                                                    className={`transition-colors cursor-pointer ${
                                                        selectedClass?.id === cls.id
                                                            ? "bg-[#F4F1EA]/50"
                                                            : "hover:bg-[#F4F1EA]/10"
                                                    }`}
                                                >
                                                    <td className="p-4">
                                                        {editingClassId === cls.id ? (
                                                            <input
                                                                value={editClassForm.name}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) => setEditClassForm((p) => ({ ...p, name: e.target.value }))}
                                                                className="w-full h-8 px-2 bg-[#F4F1EA]/60 border border-[#121212]/20 text-sm text-[#121212] focus:outline-none rounded"
                                                            />
                                                        ) : (
                                                            <span className="text-sm font-medium text-[#121212]">{cls.name}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-xs text-[#8A817C] font-light max-w-[180px] truncate">
                                                        {editingClassId === cls.id ? (
                                                            <input
                                                                value={editClassForm.description}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) => setEditClassForm((p) => ({ ...p, description: e.target.value }))}
                                                                className="w-full h-8 px-2 bg-[#F4F1EA]/60 border border-[#121212]/20 text-xs text-[#121212] focus:outline-none rounded"
                                                            />
                                                        ) : (
                                                            cls.description ?? <span className="italic opacity-40">—</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-xs text-[#8A817C] font-mono">
                                                        {editingClassId === cls.id ? (
                                                            <input
                                                                value={editClassForm.teacherId}
                                                                placeholder="Teacher ID"
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) => setEditClassForm((p) => ({ ...p, teacherId: e.target.value }))}
                                                                className="w-full h-8 px-2 bg-[#F4F1EA]/60 border border-[#121212]/20 text-xs text-[#121212] focus:outline-none rounded"
                                                            />
                                                        ) : cls.teacher ? (
                                                            fullName(cls.teacher)
                                                        ) : (
                                                            <span className="italic opacity-40">—</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="inline-flex items-center gap-1 text-xs font-mono text-[#8A817C]">
                                                            <Users className="w-3 h-3" />
                                                            {cls.membersCount}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                        {editingClassId === cls.id ? (
                                                            <div className="flex items-center justify-end space-x-1">
                                                                <button
                                                                    onClick={() => handleUpdateClass(cls.id)}
                                                                    disabled={ss.isSubmitting}
                                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg border border-transparent hover:border-green-100 transition-colors"
                                                                >
                                                                    <Check className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingClassId(null)}
                                                                    className="p-2 text-[#8A817C] hover:bg-[#F4F1EA] rounded-lg transition-colors"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ) : deletingClassId === cls.id ? (
                                                            <div className="flex items-center justify-end space-x-1">
                                                                <button
                                                                    onClick={() => handleDeleteClass(cls.id)}
                                                                    disabled={ss.isSubmitting}
                                                                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
                                                                >
                                                                    Confirm
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeletingClassId(null)}
                                                                    className="p-2 text-[#8A817C] hover:bg-[#F4F1EA] rounded-lg transition-colors"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-end space-x-1">
                                                                <button
                                                                    onClick={() => openClassPanel(cls)}
                                                                    className="p-2 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 hover:border-[#121212] rounded-lg transition-colors"
                                                                    title="View members"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingClassId(cls.id);
                                                                        setEditClassForm({
                                                                            name: cls.name,
                                                                            description: cls.description ?? "",
                                                                            teacherId: cls.teacher?.id ?? "",
                                                                        });
                                                                    }}
                                                                    className="p-2 text-[#8A817C] hover:text-[#121212] rounded-lg hover:bg-[#F4F1EA] border border-transparent transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeletingClassId(cls.id)}
                                                                    className="p-2 text-[#8A817C] hover:text-red-600 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationBar
                                pagination={ss.classPagination}
                                onPage={ss.goToClassPage}
                                label="classes"
                            />
                        </div>

                        {/* Class detail panel */}
                        {classPanelOpen && selectedClass && (
                            <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative overflow-hidden">
                                <button
                                    onClick={closeClassPanel}
                                    className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md z-10 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                <div className="p-6 border-b border-[#121212]/5">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">
                                        Class Detail
                                    </div>
                                    <h2 className="text-xl font-light tracking-tight text-[#121212] pr-10">
                                        {selectedClass.name}
                                    </h2>
                                    {selectedClass.description && (
                                        <p className="text-xs text-[#8A817C] font-light mt-1">
                                            {selectedClass.description}
                                        </p>
                                    )}
                                    {selectedClass.teacher && (
                                        <p className="text-xs font-mono text-[#8A817C] mt-1">
                                            Teacher: {fullName(selectedClass.teacher)}
                                        </p>
                                    )}
                                    <button
                                        onClick={() => switchToSessionsForClass(selectedClass)}
                                        className="mt-3 flex items-center gap-1.5 h-8 px-3 border border-[#121212]/10 text-xs text-[#8A817C] hover:text-[#121212] hover:border-[#121212] rounded-lg transition-colors"
                                    >
                                        <Calendar className="w-3 h-3" />
                                        View Sessions
                                    </button>
                                </div>

                                <div className="p-6 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212] flex items-center space-x-2">
                                            <Users className="w-4 h-4 text-[#8A817C]" />
                                            <span>Members</span>
                                        </h3>
                                    </div>

                                    {memberActionMsg && (
                                        <div className={`flex items-center gap-2 p-3 rounded-lg text-xs border ${
                                            memberActionMsg.type === "ok"
                                                ? "bg-green-50 border-green-100 text-green-700"
                                                : "bg-red-50 border-red-100 text-red-700"
                                        }`}>
                                            {memberActionMsg.type === "ok"
                                                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                                                : <ShieldAlert className="w-4 h-4 shrink-0" />
                                            }
                                            {memberActionMsg.text}
                                        </div>
                                    )}

                                    <form onSubmit={handleAddMember} className="flex gap-2">
                                        <input
                                            value={addMemberId}
                                            onChange={(e) => setAddMemberId(e.target.value)}
                                            placeholder="Member ID"
                                            className="flex-1 h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg"
                                        />
                                        <button
                                            type="submit"
                                            disabled={ss.isSubmitting || !addMemberId.trim()}
                                            className="h-9 px-3 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-40 transition-colors"
                                        >
                                            Add
                                        </button>
                                    </form>

                                    <div className="border border-[#121212]/10 rounded-xl overflow-hidden">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                                    <th className="p-3 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Member</th>
                                                    <th className="p-3 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] text-right">Remove</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#121212]/5">
                                                {membersLoading ? (
                                                    Array.from({ length: 4 }).map((_, i) => (
                                                        <SkeletonRow key={i} cols={2} />
                                                    ))
                                                ) : classMembers.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={2} className="p-8 text-center text-xs text-[#8A817C] font-light">
                                                            No members in this class.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    classMembers.map((m) => (
                                                        <tr key={m.id} className="hover:bg-[#F4F1EA]/10 transition-colors">
                                                            <td className="p-3">
                                                                <div className="text-sm font-medium text-[#121212]">{fullName(m)}</div>
                                                                <div className="text-[11px] font-mono text-[#8A817C]">{m.email}</div>
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                <button
                                                                    onClick={() => handleRemoveMember(m.id)}
                                                                    disabled={ss.isSubmitting}
                                                                    className="p-1.5 text-[#8A817C] hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                                                                    title="Remove from class"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                        <PaginationBar
                                            pagination={membersPagination}
                                            onPage={(p) => loadClassMembers(selectedClass.id, p)}
                                            label="members"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Create class panel */}
                        {showCreateClass && (
                            <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative overflow-hidden">
                                <button
                                    onClick={() => setShowCreateClass(false)}
                                    className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md z-10 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="p-6 border-b border-[#121212]/5">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">New Class</div>
                                    <h2 className="text-xl font-light tracking-tight text-[#121212] pr-10">Create Sunday School Class</h2>
                                </div>
                                <div className="p-6">
                                    {classFormMsg && (
                                        <div className={`flex items-center gap-2 p-3 rounded-lg text-xs border mb-4 ${
                                            classFormMsg.type === "ok"
                                                ? "bg-green-50 border-green-100 text-green-700"
                                                : "bg-red-50 border-red-100 text-red-700"
                                        }`}>
                                            {classFormMsg.type === "ok"
                                                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                                                : <ShieldAlert className="w-4 h-4 shrink-0" />
                                            }
                                            {classFormMsg.text}
                                        </div>
                                    )}
                                    <form onSubmit={handleCreateClass} className="space-y-5">
                                        <Field label="Class Name">
                                            <input
                                                type="text"
                                                required
                                                value={classForm.name}
                                                onChange={(e) => setClassForm((p) => ({ ...p, name: e.target.value }))}
                                                placeholder="e.g., Beginners Class"
                                                className={inputCls}
                                            />
                                        </Field>
                                        <Field label="Description (optional)">
                                            <textarea
                                                rows={3}
                                                value={classForm.description}
                                                onChange={(e) => setClassForm((p) => ({ ...p, description: e.target.value }))}
                                                placeholder="Brief description of this class..."
                                                className="w-full p-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                                            />
                                        </Field>
                                        <Field label="Teacher ID (optional)">
                                            <input
                                                type="text"
                                                value={classForm.teacherId}
                                                onChange={(e) => setClassForm((p) => ({ ...p, teacherId: e.target.value }))}
                                                placeholder="UUID of the teacher"
                                                className={inputCls}
                                            />
                                        </Field>
                                        <button type="submit" disabled={ss.isSubmitting} className={submitCls}>
                                            {ss.isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                            <span>{ss.isSubmitting ? "Creating..." : "Create Class"}</span>
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Sessions tab ── */}
            {activeTab === "sessions" && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="w-full sm:max-w-xs">
                            <select
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                            >
                                <option value="">— Select a class —</option>
                                {ss.classes.map((cls) => (
                                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => {
                                setSessionForm({ classId: selectedClassId, sessionDate: "", notes: "" });
                                setSessionFormMsg(null);
                                setShowCreateSession(true);
                            }}
                            disabled={!selectedClassId}
                            className="flex items-center gap-1.5 h-9 px-4 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-40 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            New Session
                        </button>
                    </div>

                    {sessionFormMsg?.type === "ok" && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            {sessionFormMsg.text}
                        </div>
                    )}

                    {!selectedClassId ? (
                        <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-12 text-center text-xs text-[#8A817C] font-light">
                            Select a class above to view its sessions.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                            <div className={`${sessionPanelOpen ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden`}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Date</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Status</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Notes</th>
                                            <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                        {ss.isLoading ? (
                                            Array.from({ length: 5 }).map((_, i) => (
                                                <SkeletonRow key={i} cols={4} />
                                            ))
                                        ) : ss.sessions.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                                    No sessions found for this class.
                                                </td>
                                            </tr>
                                        ) : (
                                            ss.sessions.map((session) => (
                                                <tr key={session.id} className="hover:bg-[#F4F1EA]/10 transition-colors">
                                                    <td className="p-4 text-sm text-[#121212]">
                                                        {fmtDate(session.sessionDate)}
                                                    </td>
                                                    <td className="p-4">
                                                        <SessionStatusBadge status={session.status} />
                                                    </td>
                                                    <td className="p-4 text-xs text-[#8A817C] font-light max-w-[200px] truncate">
                                                        {session.notes ?? <span className="italic opacity-40">—</span>}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        {deletingSessionId === session.id ? (
                                                            <div className="flex items-center justify-end space-x-1">
                                                                <button
                                                                    onClick={() => handleDeleteSession(session.id)}
                                                                    disabled={ss.isSubmitting}
                                                                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
                                                                >
                                                                    Confirm
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeletingSessionId(null)}
                                                                    className="p-2 text-[#8A817C] hover:bg-[#F4F1EA] rounded-lg transition-colors"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-end space-x-1">
                                                                {session.status === "CLOSED" ? (
                                                                    <button
                                                                        onClick={() => {
                                                                            setOpenSessionId(session.id);
                                                                            setClosesInMinutes("60");
                                                                        }}
                                                                        className="p-2 text-[#8A817C] hover:text-green-600 border border-[#121212]/10 hover:border-green-200 hover:bg-green-50 rounded-lg transition-colors"
                                                                        title="Open session"
                                                                    >
                                                                        <UnlockKeyhole className="w-3.5 h-3.5" />
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleCloseSession(session.id)}
                                                                        disabled={ss.isSubmitting}
                                                                        className="p-2 text-[#8A817C] hover:text-amber-600 border border-[#121212]/10 hover:border-amber-200 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-40"
                                                                        title="Close session"
                                                                    >
                                                                        <LockKeyhole className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => openRoster(session.id)}
                                                                    className="p-2 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 hover:border-[#121212] rounded-lg transition-colors"
                                                                    title="View roster"
                                                                >
                                                                    <ClipboardList className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => openMarkAttendance(session)}
                                                                    className="p-2 text-[#8A817C] hover:text-[#121212] rounded-lg hover:bg-[#F4F1EA] border border-transparent transition-colors"
                                                                    title="Mark attendance"
                                                                >
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeletingSessionId(session.id)}
                                                                    className="p-2 text-[#8A817C] hover:text-red-600 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationBar
                                pagination={ss.sessionPagination}
                                onPage={(p) => ss.fetchSessions(selectedClassId, p)}
                                label="sessions"
                            />
                            </div>

                            {sessionPanelOpen && (
                                <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative overflow-hidden">
                                    <button
                                        onClick={() => { setShowCreateSession(false); setOpenSessionId(null); setRosterSessionId(null); setMarkSessionId(null); }}
                                        className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md z-10 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>

                                    {showCreateSession && (
                                        <div>
                                            <div className="p-6 border-b border-[#121212]/5">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">New Session</div>
                                                <h2 className="text-xl font-light tracking-tight text-[#121212] pr-10">Create Session</h2>
                                            </div>
                                            <div className="p-6">
                                                {sessionFormMsg && (
                                                    <div className={`flex items-center gap-2 p-3 rounded-lg text-xs border mb-4 ${
                                                        sessionFormMsg.type === "ok"
                                                            ? "bg-green-50 border-green-100 text-green-700"
                                                            : "bg-red-50 border-red-100 text-red-700"
                                                    }`}>
                                                        {sessionFormMsg.type === "ok"
                                                            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                                                            : <ShieldAlert className="w-4 h-4 shrink-0" />
                                                        }
                                                        {sessionFormMsg.text}
                                                    </div>
                                                )}
                                                <form onSubmit={handleCreateSession} className="space-y-5">
                                                    <Field label="Class">
                                                        <select
                                                            required
                                                            value={sessionForm.classId}
                                                            onChange={(e) => setSessionForm((p) => ({ ...p, classId: e.target.value }))}
                                                            className="w-full h-11 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                                        >
                                                            <option value="">— Select class —</option>
                                                            {ss.classes.map((cls) => (
                                                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                                                            ))}
                                                        </select>
                                                    </Field>
                                                    <Field label="Session Date">
                                                        <input
                                                            type="date"
                                                            required
                                                            value={sessionForm.sessionDate}
                                                            onChange={(e) => setSessionForm((p) => ({ ...p, sessionDate: e.target.value }))}
                                                            className={inputCls}
                                                        />
                                                    </Field>
                                                    <Field label="Notes (optional)">
                                                        <textarea
                                                            rows={3}
                                                            value={sessionForm.notes}
                                                            onChange={(e) => setSessionForm((p) => ({ ...p, notes: e.target.value }))}
                                                            placeholder="Any notes for this session..."
                                                            className="w-full p-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                                                        />
                                                    </Field>
                                                    <button type="submit" disabled={ss.isSubmitting} className={submitCls}>
                                                        {ss.isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                                        <span>{ss.isSubmitting ? "Creating..." : "Create Session"}</span>
                                                    </button>
                                                </form>
                                            </div>
                                        </div>
                                    )}

                                    {openSessionId && (
                                        <div>
                                            <div className="p-6 border-b border-[#121212]/5">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Open Session</div>
                                                <h2 className="text-xl font-light tracking-tight text-[#121212] pr-10">Set Session Timer</h2>
                                            </div>
                                            <div className="p-6">
                                                <form onSubmit={handleOpenSession} className="space-y-5">
                                                    <Field label="Auto-close after (minutes)">
                                                        <input
                                                            type="number"
                                                            min={5}
                                                            max={480}
                                                            required
                                                            value={closesInMinutes}
                                                            onChange={(e) => setClosesInMinutes(e.target.value)}
                                                            className={inputCls}
                                                        />
                                                        <p className="text-[11px] text-[#8A817C] font-mono mt-1">Between 5 and 480 minutes.</p>
                                                    </Field>
                                                    <button type="submit" disabled={ss.isSubmitting} className={submitCls}>
                                                        {ss.isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                                        <span>{ss.isSubmitting ? "Opening..." : "Open Session"}</span>
                                                    </button>
                                                </form>
                                            </div>
                                        </div>
                                    )}

                                    {rosterSessionId && (
                                        <div>
                                            <div className="p-6 border-b border-[#121212]/5">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Attendance Roster</div>
                                                <h2 className="text-xl font-light tracking-tight text-[#121212] pr-10">Session Roster</h2>
                                            </div>
                                            <div className="p-6">
                                                {rosterLoading ? (
                                                    <div className="space-y-2">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <div key={i} className="h-10 bg-[#F4F1EA] rounded-lg animate-pulse" />
                                                        ))}
                                                    </div>
                                                ) : roster.length === 0 ? (
                                                    <p className="text-xs text-[#8A817C] font-light text-center py-8">
                                                        No attendance records for this session.
                                                    </p>
                                                ) : (
                                                    <div className="border border-[#121212]/10 rounded-xl overflow-hidden">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead>
                                                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                                                    <th className="p-3 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Member</th>
                                                                    <th className="p-3 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-[#121212]/5">
                                                                {roster.map((att) => (
                                                                    <tr key={att.id} className="hover:bg-[#F4F1EA]/10 transition-colors">
                                                                        <td className="p-3">
                                                                            <div className="text-sm font-medium text-[#121212]">{fullName(att.member)}</div>
                                                                            <div className="text-[11px] font-mono text-[#8A817C]">{att.member.email}</div>
                                                                        </td>
                                                                        <td className="p-3">
                                                                            <AttendanceBadge status={att.status} />
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {markSessionId && (
                                        <div>
                                            <div className="p-6 border-b border-[#121212]/5">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Mark Attendance</div>
                                                <h2 className="text-xl font-light tracking-tight text-[#121212] pr-10">Bulk Mark Attendance</h2>
                                            </div>
                                            <div className="p-6">
                                                {markMsg && (
                                                    <div className={`flex items-center gap-2 p-3 rounded-lg text-xs border mb-4 ${
                                                        markMsg.type === "ok"
                                                            ? "bg-green-50 border-green-100 text-green-700"
                                                            : "bg-red-50 border-red-100 text-red-700"
                                                    }`}>
                                                        {markMsg.type === "ok"
                                                            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                                                            : <ShieldAlert className="w-4 h-4 shrink-0" />
                                                        }
                                                        {markMsg.text}
                                                    </div>
                                                )}
                                                {markLoading ? (
                                                    <div className="space-y-2">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <div key={i} className="h-10 bg-[#F4F1EA] rounded-lg animate-pulse" />
                                                        ))}
                                                    </div>
                                                ) : markMembers.length === 0 ? (
                                                    <p className="text-xs text-[#8A817C] font-light text-center py-8">
                                                        No members in this class to mark.
                                                    </p>
                                                ) : (
                                                    <form onSubmit={handleBulkMark} className="space-y-5">
                                                        <div className="border border-[#121212]/10 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                                                            <table className="w-full text-left border-collapse">
                                                                <thead className="sticky top-0">
                                                                    <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/90">
                                                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Member</th>
                                                                        <th className="p-3 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-[#121212]/5">
                                                                    {markMembers.map((m) => (
                                                                        <tr key={m.id} className="hover:bg-[#F4F1EA]/10 transition-colors">
                                                                            <td className="p-3">
                                                                                <div className="text-sm font-medium text-[#121212]">{fullName(m)}</div>
                                                                                <div className="text-[11px] font-mono text-[#8A817C]">{m.email}</div>
                                                                            </td>
                                                                            <td className="p-3">
                                                                                <div className="flex gap-1">
                                                                                    {(["PRESENT", "ABSENT", "EXCUSED"] as AttendanceStatus[]).map((s) => (
                                                                                        <button
                                                                                            key={s}
                                                                                            type="button"
                                                                                            onClick={() => setMarkStatuses((prev) => ({ ...prev, [m.id]: s }))}
                                                                                            className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border rounded transition-colors ${
                                                                                                markStatuses[m.id] === s
                                                                                                    ? s === "PRESENT"
                                                                                                        ? "bg-green-100 border-green-300 text-green-700"
                                                                                                        : s === "ABSENT"
                                                                                                            ? "bg-red-100 border-red-300 text-red-700"
                                                                                                            : "bg-amber-100 border-amber-300 text-amber-700"
                                                                                                    : "bg-white border-[#121212]/10 text-[#8A817C] hover:border-[#121212]/30"
                                                                                            }`}
                                                                                        >
                                                                                            {s === "PRESENT" ? "P" : s === "ABSENT" ? "A" : "E"}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <button type="submit" disabled={ss.isSubmitting} className={submitCls}>
                                                            {ss.isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                                            <span>{ss.isSubmitting ? "Saving..." : "Submit Attendance"}</span>
                                                        </button>
                                                    </form>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default withAuth(SundaySchoolPage, { requiredPermission: 'sunday_school:read' });
