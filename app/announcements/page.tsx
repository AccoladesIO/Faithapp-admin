"use client";

import React, { useState, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { withAuth } from "@/utils/auth/with-auth";
import {
    Megaphone, FileText, Send, Trash2, Calendar, User, Clock,
    Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
    Heading1, Heading2, Undo, Redo, ChevronLeft, ChevronRight,
    RefreshCw, Pencil, X, Check, Building2, UserCircle, Globe,
} from "lucide-react";
import {
    useAnnouncements,
    Announcement,
    AnnouncementAudience,
    CreateAnnouncementPayload,
} from "@/hooks/use-announcements";
import { useDepartments } from "@/hooks/use-departments";
import { useMembers } from "@/hooks/use-member";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fullName = (p: { firstname: string; lastname: string }) =>
    [p.firstname, p.lastname].filter(Boolean).join(" ");

const formatDateTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const isExpired = (expiresAt: string | null) =>
    expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;

const isScheduled = (publishedAt: string) =>
    new Date(publishedAt).getTime() > Date.now();

// ─── Audience badge ───────────────────────────────────────────────────────────

function AudienceBadge({ announcement }: { announcement: Announcement }) {
    if (announcement.audience === "ALL") {
        return (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#F4F1EA] border border-[#121212]/5 text-[#8A817C] text-[9px] font-semibold uppercase tracking-wider rounded">
                <Globe className="w-2.5 h-2.5" />
                <span>Everyone</span>
            </span>
        );
    }
    if (announcement.audience === "DEPARTMENT") {
        return (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-[9px] font-semibold uppercase tracking-wider rounded">
                <Building2 className="w-2.5 h-2.5" />
                <span>{announcement.department?.name ?? "Department"}</span>
            </span>
        );
    }
    return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-purple-50 border border-purple-100 text-purple-700 text-[9px] font-semibold uppercase tracking-wider rounded">
            <UserCircle className="w-2.5 h-2.5" />
            <span>{announcement.targetMember ? fullName(announcement.targetMember) : "Individual"}</span>
        </span>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <div className="p-6 border border-[#121212]/10 rounded-xl animate-pulse space-y-3">
            <div className="h-4 w-20 bg-[#F4F1EA] rounded" />
            <div className="h-5 w-2/3 bg-[#F4F1EA] rounded" />
            <div className="h-3 w-full bg-[#F4F1EA] rounded" />
            <div className="h-3 w-4/5 bg-[#F4F1EA] rounded" />
        </div>
    );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function EditorToolbar({ editor }: { editor: any }) {
    if (!editor) return null;
    return (
        <div className="border-b border-[#121212]/10 bg-[#F4F1EA]/40 p-2 flex flex-wrap gap-1">
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded transition-colors ${editor.isActive("bold") ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}>
                <Bold className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded transition-colors ${editor.isActive("italic") ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}>
                <Italic className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded transition-colors ${editor.isActive("underline") ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}>
                <UnderlineIcon className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] bg-[#121212]/10 mx-1" />
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-1.5 rounded transition-colors ${editor.isActive("heading", { level: 1 }) ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}>
                <Heading1 className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded transition-colors ${editor.isActive("heading", { level: 2 }) ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}>
                <Heading2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] bg-[#121212]/10 mx-1" />
            <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded transition-colors ${editor.isActive("bulletList") ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}>
                <List className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded transition-colors ${editor.isActive("orderedList") ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}>
                <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <div className="ml-auto flex gap-1">
                <button type="button" onClick={() => editor.chain().focus().undo().run()} className="p-1.5 text-[#8A817C] hover:text-[#121212]">
                    <Undo className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => editor.chain().focus().redo().run()} className="p-1.5 text-[#8A817C] hover:text-[#121212]">
                    <Redo className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

// ─── Default form ─────────────────────────────────────────────────────────────

const defaultForm = {
    title: "",
    audience: "ALL" as AnnouncementAudience,
    departmentId: "",
    targetMemberId: "",
    schedulePublish: false,
    publishedAt: "",
    setExpiry: false,
    expiresAt: "",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default withAuth(function AnnouncementsPage() {
    const {
        announcements,
        pagination,
        isLoading,
        isSubmitting,
        error,
        goToPage,
        refetch,
        createAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
    } = useAnnouncements(10);

    const { departments } = useDepartments();
    const { members } = useMembers(100);

    const [form, setForm] = useState(defaultForm);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createSuccess, setCreateSuccess] = useState<string | null>(null);

    // Inline edit
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editExpiresAt, setEditExpiresAt] = useState("");

    // Delete confirm
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { class: "text-[#8A817C] underline cursor-pointer" },
            }),
        ],
        content: "",
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4 font-light text-sm text-[#121212]",
            },
        },
        immediatelyRender: false,
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !editor || editor.isEmpty) return;
        setCreateError(null);
        setCreateSuccess(null);

        const payload: CreateAnnouncementPayload = {
            title: form.title,
            body: editor.getHTML(),
            audience: form.audience,
        };

        if (form.audience === "DEPARTMENT") {
            if (!form.departmentId) {
                setCreateError("Please select a department.");
                return;
            }
            payload.departmentId = form.departmentId;
        }

        if (form.audience === "INDIVIDUAL") {
            if (!form.targetMemberId) {
                setCreateError("Please select a target member.");
                return;
            }
            payload.targetMemberId = form.targetMemberId;
        }

        if (form.schedulePublish && form.publishedAt) {
            payload.publishedAt = new Date(form.publishedAt).toISOString();
        }

        if (form.setExpiry && form.expiresAt) {
            payload.expiresAt = new Date(form.expiresAt).toISOString();
        }

        try {
            await createAnnouncement(payload);
            setForm(defaultForm);
            editor.commands.clearContent();
            setCreateSuccess("Announcement published successfully.");
            setTimeout(() => setCreateSuccess(null), 3000);
        } catch (err: any) {
            setCreateError(err?.message ?? "Failed to create announcement.");
        }
    };

    const startEdit = (a: Announcement) => {
        setEditingId(a.id);
        setEditTitle(a.title);
        setEditExpiresAt(a.expiresAt ? a.expiresAt.slice(0, 16) : "");
    };

    const handleSaveEdit = async (id: string) => {
        try {
            await updateAnnouncement(id, {
                title: editTitle,
                expiresAt: editExpiresAt ? new Date(editExpiresAt).toISOString() : null,
            });
            setEditingId(null);
        } catch {
            // error surfaced via hook
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteAnnouncement(id);
            setDeletingId(null);
        } catch {
            // error surfaced via hook
        }
    };

    return (
        <div className="space-y-10 font-sans">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                        Announcements CMS
                    </h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Publish broadcasts to everyone, a department, or an individual member
                    </p>
                </div>
                <button
                    onClick={refetch}
                    disabled={isLoading}
                    className="p-2 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-40 self-start sm:self-auto"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-xs text-red-700">
                    <strong className="block font-semibold uppercase tracking-wider text-[11px] mb-1">Error</strong>
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Compose form */}
                <div className="lg:col-span-6 bg-[#FFFFFF] border border-[#121212]/10 p-8 rounded-xl">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] mb-6 flex items-center space-x-2">
                        <Megaphone className="w-4 h-4 text-[#8A817C]" />
                        <span>Compose Broadcast</span>
                    </h2>

                    {createSuccess && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700 mb-5">
                            <Check className="w-4 h-4 shrink-0" />
                            {createSuccess}
                        </div>
                    )}
                    {createError && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 mb-5">
                            {createError}
                        </div>
                    )}

                    <form onSubmit={handleCreate} className="space-y-5">
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Announcement Title
                            </label>
                            <input
                                type="text"
                                required
                                value={form.title}
                                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                                placeholder="e.g., Church Picnic — July 20th"
                                className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Broadcast Body
                            </label>
                            <div className="border border-[#121212]/10 rounded-lg overflow-hidden bg-[#F4F1EA]/20">
                                <EditorToolbar editor={editor} />
                                <EditorContent editor={editor} />
                            </div>
                        </div>

                        {/* Audience */}
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Target Audience
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {(["ALL", "DEPARTMENT", "INDIVIDUAL"] as const).map((aud) => (
                                    <button
                                        key={aud}
                                        type="button"
                                        onClick={() => setForm((p) => ({ ...p, audience: aud }))}
                                        className={`h-10 text-[11px] font-semibold uppercase tracking-wider border rounded-lg transition-colors ${form.audience === aud
                                                ? "bg-[#121212] text-white border-[#121212]"
                                                : "bg-white text-[#8A817C] border-[#121212]/10 hover:text-[#121212]"
                                            }`}
                                    >
                                        {aud === "ALL" ? "Everyone" : aud === "DEPARTMENT" ? "Department" : "Individual"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {form.audience === "DEPARTMENT" && (
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Select Department
                                </label>
                                <select
                                    required
                                    value={form.departmentId}
                                    onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
                                    className="w-full h-11 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                >
                                    <option value="">-- Select department --</option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {form.audience === "INDIVIDUAL" && (
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Select Member
                                </label>
                                <select
                                    required
                                    value={form.targetMemberId}
                                    onChange={(e) => setForm((p) => ({ ...p, targetMemberId: e.target.value }))}
                                    className="w-full h-11 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                >
                                    <option value="">-- Select member --</option>
                                    {members.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {fullName(m)} — {m.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Schedule publish */}
                        <div className="pt-2 border-t border-[#121212]/5 space-y-3">
                            <label className="flex items-center space-x-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={form.schedulePublish}
                                    onChange={(e) => setForm((p) => ({ ...p, schedulePublish: e.target.checked }))}
                                    className="w-4 h-4 rounded border-[#121212]/10 text-[#121212] focus:ring-0"
                                />
                                <span className="text-xs uppercase tracking-wider font-semibold text-[#121212]">
                                    Schedule for Later
                                </span>
                            </label>

                            {form.schedulePublish && (
                                <div className="p-4 bg-[#F4F1EA]/50 border border-[#121212]/5 rounded-xl">
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-2">
                                        Publish At
                                    </label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={form.publishedAt}
                                        onChange={(e) => setForm((p) => ({ ...p, publishedAt: e.target.value }))}
                                        className="w-full h-10 px-3 bg-white border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Expiry */}
                        <div className="space-y-3">
                            <label className="flex items-center space-x-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={form.setExpiry}
                                    onChange={(e) => setForm((p) => ({ ...p, setExpiry: e.target.checked }))}
                                    className="w-4 h-4 rounded border-[#121212]/10 text-[#121212] focus:ring-0"
                                />
                                <span className="text-xs uppercase tracking-wider font-semibold text-[#121212]">
                                    Set Expiry Date
                                </span>
                            </label>

                            {form.setExpiry && (
                                <div className="p-4 bg-[#F4F1EA]/50 border border-[#121212]/5 rounded-xl">
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-2">
                                        Expires At
                                    </label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={form.expiresAt}
                                        onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
                                        className="w-full h-10 px-3 bg-white border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                    />
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 rounded-xl mt-6"
                        >
                            {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            <span>{isSubmitting ? "Publishing..." : "Publish Announcement"}</span>
                        </button>
                    </form>
                </div>

                {/* Feed */}
                <div className="lg:col-span-6 bg-[#FFFFFF] border border-[#121212]/10 p-8 rounded-xl flex flex-col">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] mb-6 flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-[#8A817C]" />
                        <span>
                            Announcement Feed
                            {pagination ? ` (${pagination.totalCount})` : ""}
                        </span>
                    </h2>

                    {isLoading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
                        </div>
                    ) : announcements.length === 0 ? (
                        <div className="flex-1 border-2 border-dashed border-[#121212]/10 flex flex-col items-center justify-center text-center p-12 bg-[#F4F1EA]/20 rounded-xl">
                            <Megaphone className="w-8 h-8 text-[#8A817C]/40 mb-3" />
                            <div className="text-xs uppercase tracking-wider font-semibold text-[#121212]">
                                No Announcements Yet
                            </div>
                            <p className="text-xs text-[#8A817C] font-light max-w-xs mt-1">
                                Compose your first broadcast using the form on the left.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4 max-h-[720px] overflow-y-auto pr-2">
                                {announcements.map((item) => {
                                    const expired = isExpired(item.expiresAt);
                                    const scheduled = isScheduled(item.publishedAt);
                                    return (
                                        <div
                                            key={item.id}
                                            className={`p-6 border rounded-xl relative group transition-all ${expired
                                                    ? "bg-[#F4F1EA]/30 border-dashed border-[#121212]/15 opacity-70"
                                                    : "bg-[#FFFFFF] border-[#121212]/10 hover:border-[#121212]/30"
                                                }`}
                                        >
                                            {/* Action buttons */}
                                            {editingId !== item.id && deletingId !== item.id && (
                                                <div className="absolute top-6 right-6 flex items-center gap-1">
                                                    <button
                                                        onClick={() => startEdit(item)}
                                                        className="p-1.5 text-[#8A817C] hover:text-[#121212] rounded-md hover:bg-[#F4F1EA] transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeletingId(item.id)}
                                                        className="p-1.5 text-[#8A817C] hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Badges */}
                                            <div className="flex flex-wrap gap-2 mb-3 items-center pr-16">
                                                {scheduled && (
                                                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-blue-900 text-white">
                                                        Scheduled
                                                    </span>
                                                )}
                                                {expired && (
                                                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-[#EADCC9] text-[#121212]">
                                                        Expired
                                                    </span>
                                                )}
                                                <AudienceBadge announcement={item} />
                                            </div>

                                            {/* Title / edit */}
                                            {editingId === item.id ? (
                                                <div className="space-y-3 mb-3">
                                                    <input
                                                        value={editTitle}
                                                        onChange={(e) => setEditTitle(e.target.value)}
                                                        className="w-full h-9 px-3 bg-[#F4F1EA]/60 border border-[#121212]/20 text-sm text-[#121212] focus:outline-none focus:border-[#121212] rounded"
                                                    />
                                                    <div>
                                                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">
                                                            Expires At
                                                        </label>
                                                        <input
                                                            type="datetime-local"
                                                            value={editExpiresAt}
                                                            onChange={(e) => setEditExpiresAt(e.target.value)}
                                                            className="w-full h-9 px-3 bg-[#F4F1EA]/60 border border-[#121212]/20 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleSaveEdit(item.id)}
                                                            disabled={isSubmitting}
                                                            className="px-3 py-1.5 bg-[#121212] text-white text-[10px] font-bold uppercase tracking-wider rounded disabled:opacity-50 flex items-center gap-1"
                                                        >
                                                            {isSubmitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            className="px-3 py-1.5 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded hover:text-[#121212]"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <h3 className="text-base font-medium text-[#121212] pr-8">
                                                    {item.title}
                                                </h3>
                                            )}

                                            {/* Body */}
                                            {editingId !== item.id && (
                                                <div
                                                    className="rich-text-content text-xs text-[#121212]/80 font-light mt-3 leading-relaxed whitespace-normal break-words prose prose-xs"
                                                    dangerouslySetInnerHTML={{ __html: item.body }}
                                                />
                                            )}

                                            {/* Delete confirm */}
                                            {deletingId === item.id && (
                                                <div className="mt-4 p-3 bg-[#fdfaf2] border border-dashed border-[#121212]/15 rounded-lg text-xs space-y-2">
                                                    <p className="text-[#121212] font-light">
                                                        Delete this announcement permanently?
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            disabled={isSubmitting}
                                                            className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                                                        >
                                                            {isSubmitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                                                            Confirm Delete
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingId(null)}
                                                            className="px-3 py-1.5 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded hover:text-[#121212]"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Meta */}
                                            <div className="mt-5 pt-3 border-t border-[#121212]/5 flex flex-col space-y-1 text-[10px] text-[#8A817C] font-mono">
                                                <div className="flex items-center">
                                                    <User className="w-3 h-3 mr-1.5 shrink-0" />
                                                    <span>By {fullName(item.author)}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <Calendar className="w-3 h-3 mr-1.5 shrink-0" />
                                                    <span>Published: {formatDateTime(item.publishedAt)}</span>
                                                </div>
                                                {item.expiresAt && (
                                                    <div className="flex items-center">
                                                        <Clock className="w-3 h-3 mr-1.5 shrink-0" />
                                                        <span>Expires: {formatDateTime(item.expiresAt)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {pagination && pagination.totalPages > 1 && (
                                <div className="pt-4 mt-2 border-t border-[#121212]/10 flex items-center justify-between">
                                    <span className="text-xs font-mono text-[#8A817C]">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </span>
                                    <div className="flex space-x-1">
                                        <button
                                            disabled={pagination.page <= 1 || isLoading}
                                            onClick={() => goToPage(pagination.page - 1)}
                                            className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212] hover:bg-[#F4F1EA]"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            disabled={pagination.page >= pagination.totalPages || isLoading}
                                            onClick={() => goToPage(pagination.page + 1)}
                                            className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212] hover:bg-[#F4F1EA]"
                                        >
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});