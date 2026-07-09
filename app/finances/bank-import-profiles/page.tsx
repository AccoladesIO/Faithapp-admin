"use client";

import { DismissibleError } from "@/components/ui/dismissible-error";

import React, { useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { Settings2, Plus, Pencil, Download, X, RefreshCw, CheckCircle } from "lucide-react";
import {
    useBankImportProfiles,
    BankImportProfile,
    CreateProfilePayload,
    AmountConvention,
} from "@/hooks/use-bank-import-profiles";

const DATE_FORMATS = ["YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY", "MM/DD/YYYY"];
const CONVENTIONS: { value: AmountConvention; label: string; hint: string }[] = [
    { value: "SIGNED", label: "Signed amount", hint: "One column; negative = debit" },
    { value: "SEPARATE_COLUMNS", label: "Separate columns", hint: "Separate debit & credit columns" },
    { value: "AMOUNT_WITH_TYPE", label: "Amount + type column", hint: "Amount column + Dr/Cr indicator column" },
];

const BLANK: CreateProfilePayload = {
    name: "",
    delimiter: ",",
    skipHeaderRows: 1,
    dateColumnIndex: 0,
    dateFormat: "YYYY-MM-DD",
    narrationColumnIndex: 1,
    amountConvention: "SIGNED",
    amountColumnIndex: 2,
};

function RowSkeleton() {
    return (
        <tr className="border-b border-[#121212]/5 animate-pulse">
            {[48, 16, 20, 16, 12].map((w, i) => (
                <td key={i} className="p-4">
                    <div className="h-3 bg-[#F4F1EA] rounded" style={{ width: `${w * 3}px` }} />
                </td>
            ))}
            <td className="p-4"><div className="h-3 w-20 bg-[#F4F1EA] rounded" /></td>
        </tr>
    );
}

export default withAuth(function BankImportProfilesPage() {
    const { profiles, isLoading, isSubmitting, error, createProfile, updateProfile, downloadTemplate, refetch } =
        useBankImportProfiles();

    const [showCreate, setShowCreate] = useState(false);
    const [editing, setEditing] = useState<BankImportProfile | null>(null);
    const [form, setForm] = useState<CreateProfilePayload>(BLANK);
    const [actionError, setActionError] = useState<string | null>(null);

    function openEdit(p: BankImportProfile) {
        setEditing(p);
        setForm({
            name: p.name,
            isDefault: p.isDefault,
            delimiter: p.delimiter,
            skipHeaderRows: p.skipHeaderRows,
            dateColumnIndex: p.dateColumnIndex,
            dateFormat: p.dateFormat,
            dateColumnName: p.dateColumnName ?? undefined,
            narrationColumnIndex: p.narrationColumnIndex,
            narrationColumnName: p.narrationColumnName ?? undefined,
            amountConvention: p.amountConvention,
            amountColumnIndex: p.amountColumnIndex ?? undefined,
            amountColumnName: p.amountColumnName ?? undefined,
            typeColumnIndex: p.typeColumnIndex ?? undefined,
            typeColumnName: p.typeColumnName ?? undefined,
            debitIndicator: p.debitIndicator ?? undefined,
            creditIndicator: p.creditIndicator ?? undefined,
            debitColumnIndex: p.debitColumnIndex ?? undefined,
            creditColumnIndex: p.creditColumnIndex ?? undefined,
        });
        setActionError(null);
        setShowCreate(false);
    }

    function openCreate() {
        setEditing(null);
        setForm(BLANK);
        setActionError(null);
        setShowCreate(true);
    }

    function closePanel() {
        setShowCreate(false);
        setEditing(null);
        setActionError(null);
    }

    async function handleSubmit() {
        if (!form.name || !form.delimiter || !form.dateFormat) return;
        setActionError(null);
        try {
            if (editing) {
                await updateProfile(editing.id, form);
            } else {
                await createProfile(form);
            }
            closePanel();
        } catch (e: unknown) {
            setActionError((e as Error).message);
        }
    }

    const panelOpen = showCreate || !!editing;

    return (
        <div className="space-y-8 font-sans">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Bank Import Profiles</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        CSV parsing rules for reconciliation uploads
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={refetch}
                        disabled={isLoading}
                        className="h-10 px-4 border border-[#121212]/10 text-[#121212] text-xs font-semibold uppercase tracking-widest hover:bg-[#F4F1EA]/40 disabled:opacity-40 transition-colors rounded-xl flex items-center space-x-2"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={openCreate}
                        className="h-10 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/80 transition-colors rounded-xl flex items-center space-x-2"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Profile</span>
                    </button>
                </div>
            </div>

                            <DismissibleError message={error} />

            <div className="bg-white border border-[#121212]/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                {["Profile Name", "Delimiter", "Date Format", "Convention", "Skip Rows", ""].map((h) => (
                                    <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
                            ) : profiles.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-xs text-[#8A817C] font-light">
                                        No import profiles yet. Create one to configure CSV parsing for bank statements.
                                    </td>
                                </tr>
                            ) : (
                                profiles.map((p) => (
                                    <tr key={p.id} className="hover:bg-[#F4F1EA]/20 transition-colors">
                                        <td className="p-4 text-xs font-medium text-[#121212]">
                                            <div className="flex items-center space-x-2">
                                                <Settings2 className="w-3.5 h-3.5 text-[#8A817C]" />
                                                <span>{p.name}</span>
                                                {p.isDefault && (
                                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-green-100 text-green-800">
                                                        <CheckCircle className="w-2.5 h-2.5" />
                                                        <span>Default</span>
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono text-xs text-[#8A817C]">
                                            {p.delimiter === "," ? "Comma" : p.delimiter === "\t" ? "Tab" : p.delimiter === ";" ? "Semicolon" : p.delimiter}
                                        </td>
                                        <td className="p-4 font-mono text-xs text-[#8A817C]">{p.dateFormat}</td>
                                        <td className="p-4 text-xs text-[#8A817C]">
                                            {CONVENTIONS.find((c) => c.value === p.amountConvention)?.label ?? p.amountConvention}
                                        </td>
                                        <td className="p-4 font-mono text-xs text-[#8A817C]">{p.skipHeaderRows}</td>
                                        <td className="p-4">
                                            <div className="flex items-center space-x-2 justify-end">
                                                <button
                                                    onClick={() => downloadTemplate(p.id, p.name)}
                                                    title="Download CSV template"
                                                    className="h-7 px-2.5 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider hover:bg-[#F4F1EA]/40 rounded-lg flex items-center space-x-1.5 transition-colors"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    <span>Template</span>
                                                </button>
                                                <button
                                                    onClick={() => openEdit(p)}
                                                    className="h-7 px-2.5 border border-[#121212]/10 text-[#121212] text-[10px] font-semibold uppercase tracking-wider hover:bg-[#F4F1EA]/40 rounded-lg flex items-center space-x-1.5 transition-colors"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                    <span>Edit</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {panelOpen && (
                <div className="fixed inset-0 z-40 flex">
                    <div className="flex-1 bg-black/20" onClick={closePanel} />
                    <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#121212]/10">
                            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#121212]">
                                {editing ? "Edit Profile" : "New Import Profile"}
                            </h2>
                            <button onClick={closePanel} className="text-[#8A817C] hover:text-[#121212] transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 flex-1">
                                                            <DismissibleError message={actionError} />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Profile Name</label>
                                    <input
                                        className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20"
                                        placeholder="e.g. GTBank NGN"
                                        value={form.name}
                                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Delimiter</label>
                                    <select
                                        className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20 bg-white"
                                        value={form.delimiter}
                                        onChange={(e) => setForm((f) => ({ ...f, delimiter: e.target.value }))}
                                    >
                                        <option value=",">Comma (,)</option>
                                        <option value=";">Semicolon (;)</option>
                                        <option value={"\t"}>Tab</option>
                                        <option value="|">Pipe (|)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Skip Header Rows</label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20"
                                        value={form.skipHeaderRows}
                                        onChange={(e) => setForm((f) => ({ ...f, skipHeaderRows: Number(e.target.value) }))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Date Column Index</label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20"
                                        value={form.dateColumnIndex}
                                        onChange={(e) => setForm((f) => ({ ...f, dateColumnIndex: Number(e.target.value) }))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Date Format</label>
                                    <select
                                        className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20 bg-white"
                                        value={form.dateFormat}
                                        onChange={(e) => setForm((f) => ({ ...f, dateFormat: e.target.value }))}
                                    >
                                        {DATE_FORMATS.map((d) => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Narration Column Index</label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20"
                                        value={form.narrationColumnIndex}
                                        onChange={(e) => setForm((f) => ({ ...f, narrationColumnIndex: Number(e.target.value) }))}
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Amount Convention</label>
                                    <div className="space-y-2">
                                        {CONVENTIONS.map((c) => (
                                            <label key={c.value} className="flex items-start space-x-3 cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    name="amountConvention"
                                                    value={c.value}
                                                    checked={form.amountConvention === c.value}
                                                    onChange={() => setForm((f) => ({ ...f, amountConvention: c.value }))}
                                                    className="mt-0.5"
                                                />
                                                <div>
                                                    <div className="text-xs font-medium text-[#121212]">{c.label}</div>
                                                    <div className="text-[10px] text-[#8A817C]">{c.hint}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {form.amountConvention === "SIGNED" && (
                                    <div className="col-span-2">
                                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Amount Column Index</label>
                                        <input
                                            type="number"
                                            min={0}
                                            className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20"
                                            value={form.amountColumnIndex ?? ""}
                                            onChange={(e) => setForm((f) => ({ ...f, amountColumnIndex: Number(e.target.value) }))}
                                        />
                                    </div>
                                )}

                                {form.amountConvention === "AMOUNT_WITH_TYPE" && (
                                    <>
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Amount Column Index</label>
                                            <input type="number" min={0} className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20" value={form.amountColumnIndex ?? ""} onChange={(e) => setForm((f) => ({ ...f, amountColumnIndex: Number(e.target.value) }))} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Type Column Index</label>
                                            <input type="number" min={0} className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20" value={form.typeColumnIndex ?? ""} onChange={(e) => setForm((f) => ({ ...f, typeColumnIndex: Number(e.target.value) }))} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Debit Indicator</label>
                                            <input className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20" placeholder="e.g. Dr" value={form.debitIndicator ?? ""} onChange={(e) => setForm((f) => ({ ...f, debitIndicator: e.target.value }))} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Credit Indicator</label>
                                            <input className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20" placeholder="e.g. Cr" value={form.creditIndicator ?? ""} onChange={(e) => setForm((f) => ({ ...f, creditIndicator: e.target.value }))} />
                                        </div>
                                    </>
                                )}

                                {form.amountConvention === "SEPARATE_COLUMNS" && (
                                    <>
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Debit Column Index</label>
                                            <input type="number" min={0} className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20" value={form.debitColumnIndex ?? ""} onChange={(e) => setForm((f) => ({ ...f, debitColumnIndex: Number(e.target.value) }))} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Credit Column Index</label>
                                            <input type="number" min={0} className="w-full border border-[#121212]/10 rounded-xl px-3 py-2.5 text-xs text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20" value={form.creditColumnIndex ?? ""} onChange={(e) => setForm((f) => ({ ...f, creditColumnIndex: Number(e.target.value) }))} />
                                        </div>
                                    </>
                                )}

                                <div className="col-span-2 flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="isDefault"
                                        checked={form.isDefault ?? false}
                                        onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                                    />
                                    <label htmlFor="isDefault" className="text-xs text-[#121212] cursor-pointer">
                                        Set as default profile for uploads
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-[#121212]/10 flex justify-end space-x-3">
                            <button onClick={closePanel} className="h-9 px-4 border border-[#121212]/10 text-[#121212] text-xs font-semibold uppercase tracking-widest rounded-xl hover:bg-[#F4F1EA]/40 transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !form.name}
                                className="h-9 px-5 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest rounded-xl hover:bg-[#121212]/80 disabled:opacity-40 transition-colors"
                            >
                                {isSubmitting ? "Saving…" : editing ? "Update" : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}, { requiredPermission: 'finance:read' });
