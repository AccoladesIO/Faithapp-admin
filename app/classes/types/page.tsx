"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Plus,
    RefreshCw,
    Trash2,
    Pencil,
    X,
    Check,
    ArrowRight,
} from "lucide-react";
import { withAuth } from "@/utils/auth/with-auth";
import { useClassTypes, ClassType } from "@/hooks/use-class-types";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { DismissibleError } from "@/components/ui/dismissible-error";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

const emptyForm = { name: "", description: "", nextClassTypeId: "" };

export default withAuth(function ClassTypesPage() {
    const router = useRouter();
    const {
        classTypes,
        isLoading,
        isSubmitting,
        error,
        fetchClassTypes,
        createClassType,
        updateClassType,
        deleteClassType,
    } = useClassTypes();

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selected, setSelected] = useState<ClassType | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [createError, setCreateError] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState(emptyForm);

    const [deletingId, setDeletingId] = useState<string | null>(null);

    const panelOpen = showCreateForm || selected !== null;

    const openCreateForm = () => {
        setShowCreateForm(true);
        setSelected(null);
        setCreateError(null);
        setForm(emptyForm);
    };

    const closePanel = () => {
        setShowCreateForm(false);
        setSelected(null);
        setEditingId(null);
    };

    const selectType = (t: ClassType) => {
        setSelected(t);
        setShowCreateForm(false);
        setEditingId(null);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);
        try {
            const created = await createClassType({
                name: form.name,
                description: form.description || undefined,
                nextClassTypeId: form.nextClassTypeId || undefined,
            });
            setForm(emptyForm);
            setShowCreateForm(false);
            setSelected(created);
        } catch (err: unknown) {
            const e2 = err as ApiError;
            setCreateError(e2?.message ?? "Failed to create class type.");
        }
    };

    const startEdit = (t: ClassType) => {
        setEditingId(t.id);
        setEditForm({
            name: t.name,
            description: t.description ?? "",
            nextClassTypeId: t.nextClassType?.id ?? "",
        });
    };

    // Row-level pencil click can happen before the panel is ever open (selected
    // is still null), so it must open the panel itself rather than relying on
    // startEdit() alone — otherwise editingId gets set with no panel to show it.
    const startEditFromRow = (t: ClassType) => {
        setSelected(t);
        setShowCreateForm(false);
        startEdit(t);
    };

    const handleSaveEdit = async (id: string) => {
        try {
            const updated = await updateClassType(id, {
                name: editForm.name,
                description: editForm.description,
                nextClassTypeId: editForm.nextClassTypeId || null,
            });
            setSelected(updated);
            setEditingId(null);
        } catch {
            // surfaced via hook
        }
    };

    const handleToggleActive = async (t: ClassType) => {
        const updated = await updateClassType(t.id, { isActive: !t.isActive });
        setSelected(updated);
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteClassType(id);
            if (selected?.id === id) setSelected(null);
            setDeletingId(null);
        } catch {
            // surfaced via hook
        }
    };

    return (
        <div className="space-y-8 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <button
                        onClick={() => router.push("/classes")}
                        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] hover:text-[#121212] transition-colors mb-2"
                    >
                        <ArrowLeft className="w-3 h-3" /> Back to Training Classes
                    </button>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                        Class Types
                    </h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Define class types and the level each one promotes into
                    </p>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-auto">
                    <button
                        onClick={openCreateForm}
                        className="flex items-center gap-2 px-4 py-2 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors rounded-lg"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Class Type
                    </button>
                    <button
                        onClick={() => fetchClassTypes()}
                        disabled={isLoading}
                        className="p-2 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-40"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            <DismissibleError message={error} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className={`${panelOpen ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden`}>
                    {isLoading ? (
                        <div className="p-12 text-center text-xs text-[#8A817C] font-light">Loading class types...</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Name</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden sm:table-cell">Next Level</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Status</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                {classTypes.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center">
                                            <TableEmptyState
                                                title="No class types yet."
                                                action={{ label: "New Class Type", onClick: openCreateForm }}
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    classTypes.map((t) => (
                                        <tr
                                            key={t.id}
                                            onClick={() => deletingId !== t.id && selectType(t)}
                                            className={`cursor-pointer transition-colors ${selected?.id === t.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
                                        >
                                            <td className="p-4 text-sm font-medium text-[#121212]">{t.name}</td>
                                            <td className="p-4 text-xs text-[#8A817C] font-light hidden sm:table-cell">
                                                {t.nextClassType ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <ArrowRight className="w-3 h-3" /> {t.nextClassType.name}
                                                    </span>
                                                ) : "Standalone"}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${t.isActive ? "bg-green-50 border-green-100 text-green-700" : "bg-[#F4F1EA] border-[#121212]/10 text-[#8A817C]"}`}>
                                                    {t.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                {deletingId === t.id ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => handleDelete(t.id)}
                                                            disabled={isSubmitting}
                                                            className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingId(null)}
                                                            className="p-2 text-[#8A817C] hover:bg-[#F4F1EA] rounded-lg transition-colors"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => startEditFromRow(t)}
                                                            className="p-2 text-[#8A817C] hover:text-[#121212] rounded-lg hover:bg-[#F4F1EA] transition-colors"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingId(t.id)}
                                                            className="p-2 text-[#8A817C] hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
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
                    )}
                </div>

                {panelOpen && (
                    <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative">
                        <button
                            type="button"
                            onClick={closePanel}
                            className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md z-10 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {showCreateForm && (
                            <div className="p-6">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">New Class Type</div>
                                <h2 className="text-lg font-light tracking-tight text-[#121212] mb-6 pr-8">Add Class Type</h2>

                                {createError && (
                                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 mb-4">
                                        {createError}
                                    </div>
                                )}

                                <form onSubmit={handleCreate} className="space-y-5">
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={form.name}
                                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                            placeholder="e.g., Foundation School"
                                            className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={form.description}
                                            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                            className="w-full p-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                            Promotes Into (optional)
                                        </label>
                                        <select
                                            value={form.nextClassTypeId}
                                            onChange={(e) => setForm((p) => ({ ...p, nextClassTypeId: e.target.value }))}
                                            className="w-full h-11 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                        >
                                            <option value="">Standalone — no next level</option>
                                            {classTypes.map((t) => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-[#8A817C] mt-1.5">
                                            When a member completes this class, admins will be offered the option to promote them here.
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full h-12 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded-xl"
                                    >
                                        {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                        {isSubmitting ? "Creating..." : "Create Class Type"}
                                    </button>
                                </form>
                            </div>
                        )}

                        {!showCreateForm && selected && (
                            <div className="flex flex-col">
                                <div className="p-6 border-b border-[#121212]/5">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Class Type Detail</div>
                                    <h2 className="text-lg font-light tracking-tight text-[#121212] pr-8">{selected.name}</h2>
                                </div>

                                <div className="p-6 space-y-5">
                                    {editingId === selected.id ? (
                                        <div className="space-y-3">
                                            <input
                                                value={editForm.name}
                                                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                            />
                                            <textarea
                                                rows={2}
                                                value={editForm.description}
                                                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                                                className="w-full p-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                                            />
                                            <select
                                                value={editForm.nextClassTypeId}
                                                onChange={(e) => setEditForm((p) => ({ ...p, nextClassTypeId: e.target.value }))}
                                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                            >
                                                <option value="">Standalone — no next level</option>
                                                {classTypes.filter((t) => t.id !== selected.id).map((t) => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleSaveEdit(selected.id)}
                                                    disabled={isSubmitting}
                                                    className="flex-1 h-9 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                >
                                                    <Check className="w-3.5 h-3.5" /> Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-widest rounded-lg"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-xs text-[#121212]/80 font-light leading-relaxed bg-[#F4F1EA]/30 p-4 border border-[#121212]/5 rounded-lg">
                                                {selected.description || "No description provided."}
                                            </p>
                                            <div className="p-4 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-lg">
                                                <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">
                                                    Promotes Into
                                                </span>
                                                <span className="text-sm text-[#121212]">
                                                    {selected.nextClassType ? selected.nextClassType.name : "Standalone — no next level"}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => startEdit(selected)}
                                                className="w-full h-10 border border-[#121212]/20 text-[#121212] text-xs font-semibold uppercase tracking-widest hover:bg-[#F4F1EA] transition-colors rounded-lg"
                                            >
                                                Edit Class Type
                                            </button>
                                        </>
                                    )}

                                    <div className="pt-4 border-t border-[#121212]/5 space-y-2">
                                        <button
                                            onClick={() => handleToggleActive(selected)}
                                            disabled={isSubmitting}
                                            className="w-full h-10 border border-[#121212]/20 text-[#121212] text-xs font-semibold uppercase tracking-widest hover:bg-[#F4F1EA] transition-colors disabled:opacity-40 rounded-lg"
                                        >
                                            {selected.isActive ? "Deactivate" : "Reactivate"}
                                        </button>
                                        <button
                                            onClick={() => setDeletingId(selected.id)}
                                            disabled={isSubmitting}
                                            className="w-full h-10 border border-red-200 text-red-600 text-xs font-semibold uppercase tracking-widest hover:bg-red-50 transition-colors disabled:opacity-40 rounded-lg"
                                        >
                                            Delete Class Type
                                        </button>
                                        {deletingId === selected.id && (
                                            <div className="flex items-center gap-2 pt-1">
                                                <button
                                                    onClick={() => handleDelete(selected.id)}
                                                    className="flex-1 h-9 bg-red-600 text-white text-xs font-semibold uppercase tracking-widest rounded-lg"
                                                >
                                                    Confirm Delete
                                                </button>
                                                <button
                                                    onClick={() => setDeletingId(null)}
                                                    className="h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-widest rounded-lg"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}, { requiredPermission: 'classes:write' });
