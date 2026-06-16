"use client";

import React, { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import {
    Megaphone,
    FileText,
    Send,
    Trash2,
    Calendar,
    User,
    Clock,
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Undo,
    Redo
} from "lucide-react";

interface ScheduledAnnouncement {
    id: string;
    title: string;
    contentHtml: string;
    targetAudience: "all" | "workers" | "members";
    status: "published" | "scheduled" | "draft";
    publishDate: string;
    publishTime: string;
    createdAt: string;
}

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<ScheduledAnnouncement[]>([]);
    const [title, setTitle] = useState("");
    const [targetAudience, setTargetAudience] = useState<"all" | "workers" | "members">("all");
    const [status, setStatus] = useState<"published" | "scheduled" | "draft">("published");
    const [publishDate, setPublishDate] = useState("");
    const [publishTime, setPublishTime] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: "text-[#8A817C] underline cursor-pointer",
                },
            }),
        ],
        content: "",
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4 font-light text-sm text-[#121212]",
            },
        },
    });

    const handleCreateAnnouncement = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !editor || editor.isEmpty) return;

        setIsSubmitting(true);

        const newAnnouncement: ScheduledAnnouncement = {
            id: crypto.randomUUID(),
            title,
            contentHtml: editor.getHTML(),
            targetAudience,
            status,
            publishDate: status === "scheduled" ? publishDate : new Date().toISOString().split("T")[0],
            publishTime: status === "scheduled" ? publishTime : new Date().toLocaleTimeString("en-US", { hour12: false }).slice(0, 5),
            createdAt: new Date().toLocaleDateString("en-NG", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }),
        };

        setTimeout(() => {
            setAnnouncements((prev) => [newAnnouncement, ...prev]);
            setTitle("");
            editor.commands.clearContent();
            setTargetAudience("all");
            setStatus("published");
            setPublishDate("");
            setPublishTime("");
            setIsSubmitting(false);
        }, 400);
    };

    const deleteAnnouncement = (id: string) => {
        setAnnouncements((prev) => prev.filter((item) => item.id !== id));
    };

    return (
        <div className="space-y-10 font-sans">
            <div>
                <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                    Announcements CMS
                </h1>
                <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                    Publish, defer, and schedule editorial dispatches across the application lifecycle
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-6 bg-[#FFFFFF] border border-[#121212]/10 p-8 rounded-xl">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] mb-6 flex items-center space-x-2">
                        <Megaphone className="w-4 h-4 text-[#8A817C]" />
                        <span>Compose Broadcast</span>
                    </h2>

                    <form onSubmit={handleCreateAnnouncement} className="space-y-5">
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Announcement Title
                            </label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Extended Covenant Hour Notice"
                                className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Broadcast Body Content (Rich Text)
                            </label>

                            <div className="border border-[#121212]/10 rounded-lg overflow-hidden bg-[#F4F1EA]/20">
                                {editor && (
                                    <div className="border-b border-[#121212]/10 bg-[#F4F1EA]/40 p-2 flex flex-wrap gap-1">
                                        <button
                                            type="button"
                                            onClick={() => editor.chain().focus().toggleBold().run()}
                                            className={`p-1.5 rounded transition-colors ${editor.isActive("bold") ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                                        >
                                            <Bold className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => editor.chain().focus().toggleItalic().run()}
                                            className={`p-1.5 rounded transition-colors ${editor.isActive("italic") ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                                        >
                                            <Italic className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                                            className={`p-1.5 rounded transition-colors ${editor.isActive("underline") ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                                        >
                                            <UnderlineIcon className="w-3.5 h-3.5" />
                                        </button>
                                        <div className="w-[1px] bg-[#121212]/10 mx-1" />
                                        <button
                                            type="button"
                                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                                            className={`p-1.5 rounded transition-colors ${editor.isActive("heading", { level: 1 }) ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                                        >
                                            <Heading1 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                                            className={`p-1.5 rounded transition-colors ${editor.isActive("heading", { level: 2 }) ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                                        >
                                            <Heading2 className="w-3.5 h-3.5" />
                                        </button>
                                        <div className="w-[1px] bg-[#121212]/10 mx-1" />
                                        <button
                                            type="button"
                                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                                            className={`p-1.5 rounded transition-colors ${editor.isActive("bulletList") ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                                        >
                                            <List className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                            className={`p-1.5 rounded transition-colors ${editor.isActive("orderedList") ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                                        >
                                            <ListOrdered className="w-3.5 h-3.5" />
                                        </button>
                                        <div className="ml-auto flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() => editor.chain().focus().undo().run()}
                                                className="p-1.5 text-[#8A817C] hover:text-[#121212]"
                                            >
                                                <Undo className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => editor.chain().focus().redo().run()}
                                                className="p-1.5 text-[#8A817C] hover:text-[#121212]"
                                            >
                                                <Redo className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <EditorContent editor={editor} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Target Audience
                                </label>
                                <select
                                    value={targetAudience}
                                    onChange={(e) => setTargetAudience(e.target.value as any)}
                                    className="w-full h-11 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                >
                                    <option value="all">Everyone</option>
                                    <option value="workers">Workers Only</option>
                                    <option value="members">Members Only</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Release Configuration
                                </label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as any)}
                                    className="w-full h-11 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                >
                                    <option value="published">Immediate Push</option>
                                    <option value="scheduled">Schedule Release</option>
                                    <option value="draft">Save as Draft</option>
                                </select>
                            </div>
                        </div>

                        {status === "scheduled" && (
                            <div className="grid grid-cols-2 gap-4 p-4 bg-[#F4F1EA]/50 border border-[#121212]/5 rounded-xl animate-fadeIn">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-2">
                                        Release Date
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3 w-4 h-4 text-[#8A817C]" />
                                        <input
                                            type="date"
                                            required
                                            value={publishDate}
                                            onChange={(e) => setPublishDate(e.target.value)}
                                            className="w-full h-10 pl-10 pr-4 bg-[#FFFFFF] border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-md"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-2">
                                        Release Time
                                    </label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-3 w-4 h-4 text-[#8A817C]" />
                                        <input
                                            type="time"
                                            required
                                            value={publishTime}
                                            onChange={(e) => setPublishTime(e.target.value)}
                                            className="w-full h-10 pl-10 pr-4 bg-[#FFFFFF] border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-md"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 rounded-xl mt-6"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span>{isSubmitting ? "Committing Content..." : "Commit Announcement"}</span>
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-6 bg-[#FFFFFF] border border-[#121212]/10 p-8 rounded-xl flex flex-col">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] mb-6 flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-[#8A817C]" />
                        <span>Live Feed Log ({announcements.length})</span>
                    </h2>

                    {announcements.length === 0 ? (
                        <div className="flex-1 border-2 border-dashed border-[#121212]/10 flex flex-col items-center justify-center text-center p-12 bg-[#F4F1EA]/20 rounded-xl">
                            <Megaphone className="w-8 h-8 text-[#8A817C]/40 mb-3" />
                            <div className="text-xs uppercase tracking-wider font-semibold text-[#121212]">
                                CMS Index Empty
                            </div>
                            <p className="text-xs text-[#8A817C] font-light max-w-xs mt-1">
                                No system announcements found. Build and assign scheduling timelines to entry configurations.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[720px] overflow-y-auto pr-2">
                            {announcements.map((item) => (
                                <div
                                    key={item.id}
                                    className={`p-6 border rounded-xl relative group transition-all ${item.status === "draft"
                                            ? "bg-[#F4F1EA]/30 border-dashed border-[#121212]/15"
                                            : "bg-[#FFFFFF] border-[#121212]/10 hover:border-[#121212]/30"
                                        }`}
                                >
                                    <button
                                        onClick={() => deleteAnnouncement(item.id)}
                                        className="absolute top-6 right-6 p-1.5 text-[#8A817C] hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                                        title="Remove item"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>

                                    <div className="flex flex-wrap gap-2 mb-3 items-center">
                                        <span
                                            className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${item.status === "published"
                                                    ? "bg-[#121212] text-[#FFFFFF]"
                                                    : item.status === "scheduled"
                                                        ? "bg-blue-900 text-white"
                                                        : "bg-[#EADCC9] text-[#121212]"
                                                }`}
                                        >
                                            {item.status}
                                        </span>

                                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#F4F1EA] border border-[#121212]/5 text-[#8A817C] text-[9px] font-semibold uppercase tracking-wider rounded">
                                            <User className="w-2.5 h-2.5" />
                                            <span>Target: {item.targetAudience}</span>
                                        </span>
                                    </div>

                                    <h3 className="text-base font-medium text-[#121212] pr-8">{item.title}</h3>

                                    <div
                                        className="rich-text-content text-xs text-[#121212]/80 font-light mt-3 leading-relaxed whitespace-normal break-words prose prose-xs"
                                        dangerouslySetInnerHTML={{ __html: item.contentHtml }}
                                    />

                                    <div className="mt-5 pt-3 border-t border-[#121212]/5 flex flex-col space-y-1 text-[10px] text-[#8A817C] font-mono">
                                        <div className="flex items-center">
                                            <Calendar className="w-3 h-3 mr-1.5 shrink-0" />
                                            <span>Created Log: {item.createdAt}</span>
                                        </div>
                                        {item.status === "scheduled" && (
                                            <div className="flex items-center text-blue-900 font-semibold">
                                                <Clock className="w-3 h-3 mr-1.5 shrink-0" />
                                                <span>Deferred Delivery: {item.publishDate} @ {item.publishTime}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}