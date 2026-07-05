"use client";

import React, { useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { withAuth } from "@/utils/auth/with-auth";
import {
    Megaphone, FileText, Send, Trash2, Calendar, User, Clock,
    Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
    Heading1, Heading2, Undo, Redo,
    RefreshCw, Pencil, X, Check, Building2, UserCircle, Globe, Users, HardHat,
} from "lucide-react";
import {
    useAnnouncements,
    Announcement,
    AnnouncementAudience,
    AnnouncementFilters,
    CreateAnnouncementPayload,
} from "@/hooks/use-announcements";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useDepartments } from "@/hooks/use-departments";
import { api } from "@/utils/auth/axios-client";
import { toInputDateTime } from "@/utils/parse-local-time";
import { DismissibleError } from "@/components/ui/dismissible-error";

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
    if (announcement.audience === "WORKERS_ONLY") {
        return (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 text-[9px] font-semibold uppercase tracking-wider rounded">
                <HardHat className="w-2.5 h-2.5" />
                <span>Workers Only</span>
            </span>
        );
    }
    if (announcement.audience === "MEMBERS_ONLY") {
        return (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-green-50 border border-green-100 text-green-700 text-[9px] font-semibold uppercase tracking-wider rounded">
                <Users className="w-2.5 h-2.5" />
                <span>Members Only</span>
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

// ─── Member search combobox ───────────────────────────────────────────────────

interface MemberResult {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
}

interface MemberSearchInputProps {
    value: string;
    onChange: (id: string) => void;
}

function MemberSearchInput({ value, onChange }: MemberSearchInputProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<MemberResult[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedName, setSelectedName] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!value) { setSelectedName(""); }
    }, [value]);

    React.useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const doSearch = async (q: string) => {
        if (!q.trim()) { setResults([]); setOpen(false); return; }
        setLoading(true);
        try {
            const res = await api.get(`/members?page=1&limit=8&search=${encodeURIComponent(q)}`);
            const list: MemberResult[] = res.data?.data?.data ?? [];
            setResults(list);
            setOpen(list.length > 0);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setQuery(q);
        if (!q) { onChange(""); setSelectedName(""); }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(q), 300);
    };

    const handleSelect = (m: MemberResult) => {
        onChange(m.id);
        setSelectedName(`${m.firstname} ${m.lastname}`);
        setQuery("");
        setResults([]);
        setOpen(false);
    };

    const handleClear = () => {
        onChange("");
        setSelectedName("");
        setQuery("");
        setResults([]);
        setOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            {selectedName ? (
                <div className="flex items-center gap-3 h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 rounded-lg">
                    <UserCircle className="w-4 h-4 text-[#8A817C] shrink-0" />
                    <span className="text-sm text-[#121212] font-light flex-1 truncate">{selectedName}</span>
                    <button type="button" onClick={handleClear} className="p-0.5 text-[#8A817C] hover:text-[#121212] transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={handleInput}
                        onFocus={() => results.length > 0 && setOpen(true)}
                        placeholder="Type a name or email to search…"
                        className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                    {loading && (
                        <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A817C] animate-spin pointer-events-none" />
                    )}
                </div>
            )}
            {open && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#121212]/10 rounded-xl shadow-lg z-20 overflow-hidden max-h-60 overflow-y-auto">
                    {results.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); handleSelect(m); }}
                            className="w-full text-left px-4 py-3 hover:bg-[#F4F1EA]/60 transition-colors border-b border-[#121212]/5 last:border-0"
                        >
                            <div className="text-sm text-[#121212] font-light">{m.firstname} {m.lastname}</div>
                            <div className="text-[11px] text-[#8A817C] font-mono">{m.email}</div>
                        </button>
                    ))}
                </div>
            )}
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
        filters,
        isLoading,
        isSubmitting,
        error,
        goToPage,
        refetch,
        applyFilters,
        createAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
    } = useAnnouncements(10);

    const { departments } = useDepartments();

    const [form, setForm] = useState(defaultForm);
    const [memberInputKey, setMemberInputKey] = useState(0);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createSuccess, setCreateSuccess] = useState<string | null>(null);

    const [audienceFilter, setAudienceFilter] = useState<AnnouncementAudience | "">("");
    const [titleSearch, setTitleSearch] = useState("");
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            setMemberInputKey((k) => k + 1);
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
        setEditExpiresAt(a.expiresAt ? toInputDateTime(a.expiresAt) : "");
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
                        Announcements
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

            <DismissibleError message={error} />

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
                                {([
                                    ["ALL", "Everyone"],
                                    ["WORKERS_ONLY", "Workers"],
                                    ["MEMBERS_ONLY", "Members"],
                                    ["DEPARTMENT", "Department"],
                                    ["INDIVIDUAL", "Individual"],
                                ] as const).map(([aud, label]) => (
                                    <button
                                        key={aud}
                                        type="button"
                                        onClick={() => setForm((p) => ({ ...p, audience: aud }))}
                                        className={`h-10 text-[11px] font-semibold uppercase tracking-wider border rounded-lg transition-colors ${form.audience === aud
                                                ? "bg-[#121212] text-white border-[#121212]"
                                                : "bg-white text-[#8A817C] border-[#121212]/10 hover:text-[#121212]"
                                            }`}
                                    >
                                        {label}
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
                                <MemberSearchInput
                                    key={memberInputKey}
                                    value={form.targetMemberId}
                                    onChange={(id) => setForm((p) => ({ ...p, targetMemberId: id }))}
                                />
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
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] mb-4 flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-[#8A817C]" />
                        <span>
                            Announcement Feed
                            {pagination ? ` (${pagination.totalCount})` : ""}
                        </span>
                    </h2>

                    <div className="flex flex-wrap gap-2 mb-6">
                        <input
                            type="text"
                            value={titleSearch}
                            onChange={(e) => {
                                const val = e.target.value;
                                setTitleSearch(val);
                                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                                searchDebounceRef.current = setTimeout(() => {
                                    applyFilters({ search: val || undefined, audience: audienceFilter || undefined } as AnnouncementFilters);
                                }, 400);
                            }}
                            placeholder="Search by title…"
                            className="h-8 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-lg min-w-[180px] flex-1"
                        />
                        {(["", "ALL", "WORKERS_ONLY", "MEMBERS_ONLY", "DEPARTMENT", "INDIVIDUAL"] as const).map((val) => {
                            const label = val === "" ? "All" : val === "ALL" ? "Everyone" : val === "WORKERS_ONLY" ? "Workers" : val === "MEMBERS_ONLY" ? "Members" : val === "DEPARTMENT" ? "Dept" : "Individual";
                            return (
                                <button key={val} type="button" onClick={() => {
                                    setAudienceFilter(val);
                                    applyFilters({ search: titleSearch || undefined, audience: val || undefined });
                                }}
                                    className={`h-8 px-3 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap ${audienceFilter === val ? "bg-[#121212] text-white" : "bg-[#F4F1EA] text-[#8A817C] hover:text-[#121212]"}`}>
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {isLoading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
                        </div>
                    ) : announcements.length === 0 && !filters.search && !filters.audience ? (
                        <div className="flex-1 border-2 border-dashed border-[#121212]/10 flex flex-col items-center justify-center text-center p-12 bg-[#F4F1EA]/20 rounded-xl">
                            <Megaphone className="w-8 h-8 text-[#8A817C]/40 mb-3" />
                            <div className="text-xs uppercase tracking-wider font-semibold text-[#121212]">
                                No Announcements Yet
                            </div>
                            <p className="text-xs text-[#8A817C] font-light max-w-xs mt-1">
                                Compose your first broadcast using the form on the left.
                            </p>
                        </div>
                    ) : announcements.length === 0 ? (
                        <div className="flex-1 border-2 border-dashed border-[#121212]/10 flex flex-col items-center justify-center text-center p-12 bg-[#F4F1EA]/20 rounded-xl">
                            <Megaphone className="w-8 h-8 text-[#8A817C]/40 mb-3" />
                            <div className="text-xs uppercase tracking-wider font-semibold text-[#121212]">No matches</div>
                            <p className="text-xs text-[#8A817C] font-light max-w-xs mt-1">No announcements match the current filter.</p>
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

                            <PaginationBar
                                pagination={pagination}
                                onPage={goToPage}
                                isLoading={isLoading}
                                label="announcements"
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}, { requiredPermission: 'announcements:read' });