"use client";

import React, { useState, useEffect, useCallback } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { Plus, Pencil, Trash2, X, CalendarX2, CheckCircle2, XCircle, Clock, Building2, Tag } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
    useFacilityRental,
    RentalFacility,
    RentalPricingTier,
    RentalAddon,
    RentalBooking,
    BookingStatus,
    MemberCategory,
    DiscountType,
} from "@/hooks/use-facility-rental";

// ─── Constants ────────────────────────────────────────────────────────────────

type Tab = "facilities" | "pricing-tiers" | "addons" | "calendar-blocks" | "bookings";

const TABS: { key: Tab; label: string }[] = [
    { key: "facilities", label: "Facilities" },
    { key: "pricing-tiers", label: "Pricing Tiers" },
    { key: "addons", label: "Add-ons" },
    { key: "calendar-blocks", label: "Calendar Blocks" },
    { key: "bookings", label: "Bookings" },
];

const BOOKING_STATUSES: { value: BookingStatus | ""; label: string }[] = [
    { value: "", label: "All" },
    { value: "PENDING", label: "Pending" },
    { value: "CONFIRMED", label: "Confirmed" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled" },
    { value: "REJECTED", label: "Rejected" },
];

const MEMBER_CATEGORIES: MemberCategory[] = ["PUBLIC", "MEMBER", "WORKER", "LEADER"];
const DISCOUNT_TYPES: DiscountType[] = ["PERCENTAGE", "FLAT"];

const BOOKING_STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-amber-50 border-amber-100 text-amber-700",
    CONFIRMED: "bg-blue-50 border-blue-100 text-blue-700",
    IN_PROGRESS: "bg-green-50 border-green-100 text-green-700",
    COMPLETED: "bg-[#F4F1EA] border-[#121212]/10 text-[#8A817C]",
    CANCELLED: "bg-red-50 border-red-100 text-red-700",
    REJECTED: "bg-red-50 border-red-100 text-red-700",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number) {
    return Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDateTime(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const inp = "w-full h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg";
const sel = `${inp} appearance-none`;
const lbl = "block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5";

function SkeletonRow({ cols }: { cols: number }) {
    return (
        <tr className="border-b border-[#121212]/5 animate-pulse">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="p-4"><div className="h-3 bg-[#F4F1EA] rounded w-3/4" /></td>
            ))}
        </tr>
    );
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${isActive ? "bg-green-50 border-green-100 text-green-700" : "bg-[#F4F1EA] border-[#121212]/10 text-[#8A817C]"}`}>
            {isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {isActive ? "Active" : "Inactive"}
        </span>
    );
}

function BookingStatusBadge({ status }: { status: string }) {
    const cls = BOOKING_STATUS_COLORS[status] ?? "bg-[#F4F1EA] border-[#121212]/10 text-[#8A817C]";
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${cls}`}>
            {status.replace("_", " ")}
        </span>
    );
}

function PanelHeader({ eyebrow, title, onClose }: { eyebrow: string; title: string; onClose: () => void }) {
    return (
        <div className="p-6 border-b border-[#121212]/5 relative">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md z-10 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">{eyebrow}</div>
            <h2 className="text-xl font-light tracking-tight text-[#121212] pr-10">{title}</h2>
        </div>
    );
}

function InlineError({ msg }: { msg: string | null }) {
    if (!msg) return null;
    return <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs font-light">{msg}</div>;
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
    return (
        <div className="flex gap-1 flex-wrap">
            {TABS.map((t) => (
                <button
                    key={t.key}
                    onClick={() => onChange(t.key)}
                    className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-widest transition-colors rounded-lg ${active === t.key ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                >
                    {t.label}
                </button>
            ))}
        </div>
    );
}

// ─── Facilities Tab ───────────────────────────────────────────────────────────

interface FacilityFormState {
    name: string;
    description: string;
    basePrice: string;
    capacity: string;
    isActive: boolean;
}

const EMPTY_FACILITY_FORM: FacilityFormState = {
    name: "", description: "", basePrice: "", capacity: "", isActive: true,
};

function facilityToForm(f: RentalFacility): FacilityFormState {
    return {
        name: f.name,
        description: f.description ?? "",
        basePrice: String(f.basePrice),
        capacity: f.capacity != null ? String(f.capacity) : "",
        isActive: f.isActive,
    };
}

interface FacilityPanelProps {
    editing: RentalFacility | null;
    isSubmitting: boolean;
    onClose: () => void;
    onSave: (dto: { name: string; description?: string; basePrice: number; capacity?: number; isActive?: boolean }) => Promise<void>;
}

function FacilityPanel({ editing, isSubmitting, onClose, onSave }: FacilityPanelProps) {
    const [form, setForm] = useState<FacilityFormState>(editing ? facilityToForm(editing) : EMPTY_FACILITY_FORM);
    const [err, setErr] = useState<string | null>(null);

    const set = (k: keyof FacilityFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((p) => ({ ...p, [k]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { setErr("Name is required."); return; }
        if (!form.basePrice || isNaN(Number(form.basePrice))) { setErr("A valid base price is required."); return; }
        setErr(null);
        try {
            await onSave({
                name: form.name.trim(),
                description: form.description.trim() || undefined,
                basePrice: Number(form.basePrice),
                capacity: form.capacity ? Number(form.capacity) : undefined,
                isActive: form.isActive,
            });
            onClose();
        } catch (ex: any) {
            setErr(ex?.message || "Something went wrong.");
        }
    };

    return (
        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative overflow-hidden flex flex-col">
            <PanelHeader
                eyebrow={editing ? "Edit Facility" : "New Facility"}
                title={editing ? editing.name : "Add a facility"}
                onClose={onClose}
            />
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                <InlineError msg={err} />
                <div>
                    <label className={lbl}>Name <span className="text-red-500">*</span></label>
                    <input className={inp} value={form.name} onChange={set("name")} placeholder="e.g. Main Hall" />
                </div>
                <div>
                    <label className={lbl}>Description</label>
                    <textarea className="w-full px-4 py-2.5 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none" rows={3} value={form.description} onChange={set("description")} placeholder="Optional description" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={lbl}>Base Price <span className="text-red-500">*</span></label>
                        <input type="number" min={0} step="0.01" className={inp} value={form.basePrice} onChange={set("basePrice")} placeholder="0.00" />
                    </div>
                    <div>
                        <label className={lbl}>Capacity</label>
                        <input type="number" min={0} className={inp} value={form.capacity} onChange={set("capacity")} placeholder="Optional" />
                    </div>
                </div>
                {editing && (
                    <div>
                        <label className="flex items-center gap-2 text-sm text-[#121212] font-light cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.isActive}
                                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                                className="rounded"
                            />
                            Active
                        </label>
                    </div>
                )}
                <div className="flex gap-3 pt-2 border-t border-[#121212]/5">
                    <button type="button" onClick={onClose} className="flex-1 h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-40 transition-colors">
                        {isSubmitting ? "Saving…" : editing ? "Save Changes" : "Create Facility"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function FacilitiesTab() {
    const { facilities, isLoading, isSubmitting, fetchFacilities, createFacility, updateFacility } = useFacilityRental();
    const [panel, setPanel] = useState<"create" | "edit" | null>(null);
    const [editing, setEditing] = useState<RentalFacility | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => { fetchFacilities(); }, [fetchFacilities]);

    const panelOpen = panel !== null;

    const filtered = search.trim()
        ? facilities.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()) || (f.description ?? "").toLowerCase().includes(search.toLowerCase()))
        : facilities;

    const handleSave = useCallback(async (dto: Parameters<typeof createFacility>[0] & { isActive?: boolean }) => {
        if (editing) {
            await updateFacility(editing.id, dto);
        } else {
            await createFacility(dto);
        }
    }, [editing, createFacility, updateFacility]);

    const openEdit = (f: RentalFacility) => { setEditing(f); setPanel("edit"); };
    const openCreate = () => { setEditing(null); setPanel("create"); };
    const closePanel = () => { setPanel(null); setEditing(null); };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <input
                    className="flex-1 h-9 px-4 bg-[#FFFFFF] border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg placeholder:text-[#8A817C]"
                    placeholder="Search facilities…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button onClick={openCreate} className="flex items-center gap-2 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors whitespace-nowrap">
                    <Plus className="w-3.5 h-3.5" /> New Facility
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className={`${panelOpen ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["Name", "Base Price", "Capacity", "Status", ""].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            {search ? "No facilities match your search." : "No facilities found."}
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((f) => (
                                        <tr key={f.id} className="border-b border-[#121212]/5 hover:bg-[#F4F1EA]/30 transition-colors">
                                            <td className="p-4">
                                                <p className="text-sm text-[#121212] font-light">{f.name}</p>
                                                {f.description && <p className="text-xs text-[#8A817C] font-light mt-0.5 truncate max-w-[200px]">{f.description}</p>}
                                            </td>
                                            <td className="p-4 text-sm text-[#121212] font-light">{fmt(f.basePrice)}</td>
                                            <td className="p-4 text-sm text-[#8A817C] font-light">{f.capacity ?? "—"}</td>
                                            <td className="p-4"><ActiveBadge isActive={f.isActive} /></td>
                                            <td className="p-4">
                                                <button onClick={() => openEdit(f)} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md transition-colors" title="Edit">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {panelOpen && (
                    <FacilityPanel
                        editing={editing}
                        isSubmitting={isSubmitting}
                        onClose={closePanel}
                        onSave={handleSave}
                    />
                )}
            </div>
        </div>
    );
}

// ─── Pricing Tiers Tab ────────────────────────────────────────────────────────

interface TierFormState {
    memberCategory: MemberCategory;
    discountType: DiscountType;
    discountValue: string;
}

const EMPTY_TIER_FORM: TierFormState = {
    memberCategory: "PUBLIC",
    discountType: "PERCENTAGE",
    discountValue: "",
};

interface TierPanelProps {
    editing: RentalPricingTier | null;
    existingCategories: MemberCategory[];
    isSubmitting: boolean;
    onClose: () => void;
    onSave: (dto: { memberCategory: MemberCategory; discountType: DiscountType; discountValue: number }) => Promise<void>;
}

function TierPanel({ editing, existingCategories, isSubmitting, onClose, onSave }: TierPanelProps) {
    const [form, setForm] = useState<TierFormState>(
        editing
            ? { memberCategory: editing.memberCategory, discountType: editing.discountType, discountValue: String(editing.discountValue) }
            : EMPTY_TIER_FORM
    );
    const [err, setErr] = useState<string | null>(null);

    const availableCategories = editing
        ? MEMBER_CATEGORIES
        : MEMBER_CATEGORIES.filter((c) => !existingCategories.includes(c));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.discountValue || isNaN(Number(form.discountValue))) { setErr("A valid discount value is required."); return; }
        setErr(null);
        try {
            await onSave({ memberCategory: form.memberCategory, discountType: form.discountType, discountValue: Number(form.discountValue) });
            onClose();
        } catch (ex: any) {
            setErr(ex?.message || "Something went wrong.");
        }
    };

    return (
        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative overflow-hidden flex flex-col">
            <PanelHeader
                eyebrow={editing ? "Edit Tier" : "New Pricing Tier"}
                title={editing ? `${editing.memberCategory} tier` : "Set pricing tier"}
                onClose={onClose}
            />
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                <InlineError msg={err} />
                <div>
                    <label className={lbl}>Member Category</label>
                    {editing ? (
                        <div className={`${inp} flex items-center text-[#8A817C] bg-[#F4F1EA]/70`}>{editing.memberCategory}</div>
                    ) : (
                        <select
                            className={sel}
                            value={form.memberCategory}
                            onChange={(e) => setForm((p) => ({ ...p, memberCategory: e.target.value as MemberCategory }))}
                        >
                            {availableCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    )}
                </div>
                <div>
                    <label className={lbl}>Discount Type</label>
                    <select
                        className={sel}
                        value={form.discountType}
                        onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value as DiscountType }))}
                    >
                        {DISCOUNT_TYPES.map((d) => <option key={d} value={d}>{d === "PERCENTAGE" ? "Percentage (%)" : "Flat Amount"}</option>)}
                    </select>
                </div>
                <div>
                    <label className={lbl}>Discount Value <span className="text-red-500">*</span></label>
                    <input
                        type="number"
                        min={0}
                        step="0.01"
                        className={inp}
                        value={form.discountValue}
                        onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))}
                        placeholder={form.discountType === "PERCENTAGE" ? "e.g. 10 for 10%" : "e.g. 500.00"}
                    />
                </div>
                <div className="flex gap-3 pt-2 border-t border-[#121212]/5">
                    <button type="button" onClick={onClose} className="flex-1 h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-40 transition-colors">
                        {isSubmitting ? "Saving…" : "Save Tier"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function PricingTiersTab() {
    const { pricingTiers, isLoading, isSubmitting, fetchPricingTiers, upsertPricingTier, deletePricingTier } = useFacilityRental();
    const [panel, setPanel] = useState(false);
    const [editing, setEditing] = useState<RentalPricingTier | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    useEffect(() => { fetchPricingTiers(); }, [fetchPricingTiers]);

    const existingCategories = pricingTiers.map((t) => t.memberCategory);

    const handleSave = useCallback(async (dto: Parameters<typeof upsertPricingTier>[0]) => {
        await upsertPricingTier(dto);
    }, [upsertPricingTier]);

    const openEdit = (t: RentalPricingTier) => { setEditing(t); setPanel(true); };
    const openCreate = () => { setEditing(null); setPanel(true); };
    const closePanel = () => { setPanel(false); setEditing(null); };

    const handleDelete = async (id: string) => {
        await deletePricingTier(id);
        setPendingDeleteId(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-[#8A817C] font-light">
                    Category tiers apply a discount to the facility base price for bookings made by members in that category. One tier per category, applied across all facilities.
                </p>
                <button
                    onClick={openCreate}
                    disabled={existingCategories.length >= MEMBER_CATEGORIES.length}
                    className="flex items-center gap-2 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                    <Plus className="w-3.5 h-3.5" /> Add Tier
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className={`${panel ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["Category", "Discount Type", "Discount Value", "Status", ""].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                                ) : pricingTiers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                            <Tag className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            No pricing tiers configured.
                                        </td>
                                    </tr>
                                ) : (
                                    pricingTiers.map((t) => (
                                        <tr key={t.id} className="border-b border-[#121212]/5 hover:bg-[#F4F1EA]/30 transition-colors">
                                            <td className="p-4 text-sm text-[#121212] font-light">{t.memberCategory}</td>
                                            <td className="p-4 text-sm text-[#8A817C] font-light">{t.discountType === "PERCENTAGE" ? "Percentage" : "Flat"}</td>
                                            <td className="p-4 text-sm text-[#121212] font-light">
                                                {t.discountType === "PERCENTAGE" ? `${t.discountValue}%` : fmt(t.discountValue)}
                                            </td>
                                            <td className="p-4"><ActiveBadge isActive={t.isActive} /></td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => openEdit(t)} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md transition-colors" title="Edit">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => setPendingDeleteId(t.id)} className="p-1.5 text-[#8A817C] hover:text-red-600 border border-[#121212]/5 hover:border-red-200 rounded-md transition-colors" title="Delete">
                                                        <Trash2 className="w-3.5 h-3.5" />
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
                {panel && (
                    <TierPanel
                        editing={editing}
                        existingCategories={existingCategories}
                        isSubmitting={isSubmitting}
                        onClose={closePanel}
                        onSave={handleSave}
                    />
                )}
            </div>
            {pendingDeleteId && (
                <ConfirmModal
                    title="Delete pricing tier"
                    message="This tier will be permanently removed. Existing bookings using this tier will not be affected."
                    confirmLabel="Delete tier"
                    onConfirm={() => handleDelete(pendingDeleteId)}
                    onCancel={() => setPendingDeleteId(null)}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    );
}

// ─── Add-ons Tab ──────────────────────────────────────────────────────────────

interface AddonFormState {
    name: string;
    description: string;
    price: string;
    cautionAmount: string;
    isActive: boolean;
}

const EMPTY_ADDON_FORM: AddonFormState = {
    name: "", description: "", price: "", cautionAmount: "", isActive: true,
};

interface AddonPanelProps {
    editing: RentalAddon | null;
    isSubmitting: boolean;
    onClose: () => void;
    onSave: (dto: { name: string; description?: string; price: number; cautionAmount?: number; isActive?: boolean }) => Promise<void>;
}

function AddonPanel({ editing, isSubmitting, onClose, onSave }: AddonPanelProps) {
    const [form, setForm] = useState<AddonFormState>(
        editing
            ? { name: editing.name, description: editing.description ?? "", price: String(editing.price), cautionAmount: editing.cautionAmount ? String(editing.cautionAmount) : "", isActive: editing.isActive }
            : EMPTY_ADDON_FORM
    );
    const [err, setErr] = useState<string | null>(null);

    const set = (k: keyof AddonFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((p) => ({ ...p, [k]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { setErr("Name is required."); return; }
        if (!form.price || isNaN(Number(form.price))) { setErr("A valid price is required."); return; }
        setErr(null);
        try {
            await onSave({
                name: form.name.trim(),
                description: form.description.trim() || undefined,
                price: Number(form.price),
                cautionAmount: form.cautionAmount ? Number(form.cautionAmount) : undefined,
                isActive: form.isActive,
            });
            onClose();
        } catch (ex: any) {
            setErr(ex?.message || "Something went wrong.");
        }
    };

    return (
        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative overflow-hidden flex flex-col">
            <PanelHeader
                eyebrow={editing ? "Edit Add-on" : "New Add-on"}
                title={editing ? editing.name : "Add a service add-on"}
                onClose={onClose}
            />
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                <InlineError msg={err} />
                <div>
                    <label className={lbl}>Name <span className="text-red-500">*</span></label>
                    <input className={inp} value={form.name} onChange={set("name")} placeholder="e.g. Sound System" />
                </div>
                <div>
                    <label className={lbl}>Description</label>
                    <textarea className="w-full px-4 py-2.5 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none" rows={2} value={form.description} onChange={set("description")} placeholder="Optional description" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={lbl}>Price <span className="text-red-500">*</span></label>
                        <input type="number" min={0} step="0.01" className={inp} value={form.price} onChange={set("price")} placeholder="0.00" />
                    </div>
                    <div>
                        <label className={lbl}>Refundable Deposit</label>
                        <input type="number" min={0} step="0.01" className={inp} value={form.cautionAmount} onChange={set("cautionAmount")} placeholder="0.00" />
                    </div>
                </div>
                {editing && (
                    <div>
                        <label className="flex items-center gap-2 text-sm text-[#121212] font-light cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.isActive}
                                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                                className="rounded"
                            />
                            Active
                        </label>
                    </div>
                )}
                <div className="flex gap-3 pt-2 border-t border-[#121212]/5">
                    <button type="button" onClick={onClose} className="flex-1 h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-40 transition-colors">
                        {isSubmitting ? "Saving…" : editing ? "Save Changes" : "Create Add-on"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function AddonsTab() {
    const { addons, isLoading, isSubmitting, fetchAddons, createAddon, updateAddon } = useFacilityRental();
    const [panel, setPanel] = useState(false);
    const [editing, setEditing] = useState<RentalAddon | null>(null);

    useEffect(() => { fetchAddons(); }, [fetchAddons]);

    const handleSave = useCallback(async (dto: Parameters<typeof createAddon>[0] & { isActive?: boolean }) => {
        if (editing) {
            await updateAddon(editing.id, dto);
        } else {
            await createAddon(dto);
        }
    }, [editing, createAddon, updateAddon]);

    const openEdit = (a: RentalAddon) => { setEditing(a); setPanel(true); };
    const openCreate = () => { setEditing(null); setPanel(true); };
    const closePanel = () => { setPanel(false); setEditing(null); };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-[#8A817C] font-light">
                    Add-ons are optional extra services (e.g. Sound System, Projector, Chairs) that can be included in a booking at an additional cost. The refundable deposit is returned after the booking when equipment is returned in good condition.
                </p>
                <button onClick={openCreate} className="flex items-center gap-2 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors whitespace-nowrap">
                    <Plus className="w-3.5 h-3.5" /> New Add-on
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className={`${panel ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["Name", "Price", "Refundable Deposit", "Status", ""].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                                ) : addons.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                            <Plus className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            No add-ons found.
                                        </td>
                                    </tr>
                                ) : (
                                    addons.map((a) => (
                                        <tr key={a.id} className="border-b border-[#121212]/5 hover:bg-[#F4F1EA]/30 transition-colors">
                                            <td className="p-4">
                                                <p className="text-sm text-[#121212] font-light">{a.name}</p>
                                                {a.description && <p className="text-xs text-[#8A817C] font-light mt-0.5 truncate max-w-[200px]">{a.description}</p>}
                                            </td>
                                            <td className="p-4 text-sm text-[#121212] font-light">{fmt(a.price)}</td>
                                            <td className="p-4 text-sm text-[#8A817C] font-light">{fmt(a.cautionAmount)}</td>
                                            <td className="p-4"><ActiveBadge isActive={a.isActive} /></td>
                                            <td className="p-4">
                                                <button onClick={() => openEdit(a)} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md transition-colors" title="Edit">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {panel && (
                    <AddonPanel
                        editing={editing}
                        isSubmitting={isSubmitting}
                        onClose={closePanel}
                        onSave={handleSave}
                    />
                )}
            </div>
        </div>
    );
}

// ─── Calendar Blocks Tab ──────────────────────────────────────────────────────

interface BlockFormState {
    startDateTime: string;
    endDateTime: string;
    reason: string;
}

const EMPTY_BLOCK_FORM: BlockFormState = { startDateTime: "", endDateTime: "", reason: "" };

interface BlockPanelProps {
    facilityId: string;
    isSubmitting: boolean;
    onClose: () => void;
    onSave: (dto: { facilityId: string; startDateTime: string; endDateTime: string; reason?: string }) => Promise<void>;
}

function BlockPanel({ facilityId, isSubmitting, onClose, onSave }: BlockPanelProps) {
    const [form, setForm] = useState<BlockFormState>(EMPTY_BLOCK_FORM);
    const [err, setErr] = useState<string | null>(null);

    const set = (k: keyof BlockFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((p) => ({ ...p, [k]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.startDateTime || !form.endDateTime) { setErr("Start and end date/time are required."); return; }
        if (new Date(form.startDateTime) >= new Date(form.endDateTime)) { setErr("End must be after start."); return; }
        setErr(null);
        try {
            await onSave({
                facilityId,
                startDateTime: new Date(form.startDateTime).toISOString(),
                endDateTime: new Date(form.endDateTime).toISOString(),
                reason: form.reason.trim() || undefined,
            });
            onClose();
        } catch (ex: any) {
            setErr(ex?.message || "Something went wrong.");
        }
    };

    return (
        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative overflow-hidden flex flex-col">
            <PanelHeader eyebrow="New Block" title="Block calendar period" onClose={onClose} />
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                <InlineError msg={err} />
                <div>
                    <label className={lbl}>Start Date & Time <span className="text-red-500">*</span></label>
                    <input type="datetime-local" className={inp} value={form.startDateTime} onChange={set("startDateTime")} />
                </div>
                <div>
                    <label className={lbl}>End Date & Time <span className="text-red-500">*</span></label>
                    <input type="datetime-local" className={inp} value={form.endDateTime} onChange={set("endDateTime")} />
                </div>
                <div>
                    <label className={lbl}>Reason</label>
                    <textarea className="w-full px-4 py-2.5 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none" rows={2} value={form.reason} onChange={set("reason")} placeholder="Optional reason for blocking" />
                </div>
                <div className="flex gap-3 pt-2 border-t border-[#121212]/5">
                    <button type="button" onClick={onClose} className="flex-1 h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-40 transition-colors">
                        {isSubmitting ? "Saving…" : "Create Block"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function CalendarBlocksTab() {
    const { facilities, calendarBlocks, isLoading, isSubmitting, fetchFacilities, fetchCalendarBlocks, createCalendarBlock, deleteCalendarBlock } = useFacilityRental();
    const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");
    const [panel, setPanel] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    useEffect(() => { fetchFacilities(); }, [fetchFacilities]);

    useEffect(() => {
        if (selectedFacilityId) fetchCalendarBlocks(selectedFacilityId);
    }, [selectedFacilityId, fetchCalendarBlocks]);

    useEffect(() => {
        if (facilities.length > 0 && !selectedFacilityId) {
            setSelectedFacilityId(facilities[0].id);
        }
    }, [facilities, selectedFacilityId]);

    const handleDelete = async (id: string) => {
        await deleteCalendarBlock(id);
        setPendingDeleteId(null);
    };

    const handleSave = useCallback(async (dto: Parameters<typeof createCalendarBlock>[0]) => {
        await createCalendarBlock(dto);
    }, [createCalendarBlock]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <select
                    className="h-10 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none min-w-[220px]"
                    value={selectedFacilityId}
                    onChange={(e) => setSelectedFacilityId(e.target.value)}
                >
                    {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <button
                    onClick={() => setPanel(true)}
                    disabled={!selectedFacilityId}
                    className="flex items-center gap-2 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-40 transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" /> Add Block
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className={`${panel ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["Start", "End", "Reason", ""].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                                ) : !selectedFacilityId ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-xs text-[#8A817C] font-light">Select a facility to view blocks.</td>
                                    </tr>
                                ) : calendarBlocks.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                            <CalendarX2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            No calendar blocks for this facility.
                                        </td>
                                    </tr>
                                ) : (
                                    calendarBlocks.map((b) => (
                                        <tr key={b.id} className="border-b border-[#121212]/5 hover:bg-[#F4F1EA]/30 transition-colors">
                                            <td className="p-4 text-sm text-[#121212] font-light">{fmtDateTime(b.startDateTime)}</td>
                                            <td className="p-4 text-sm text-[#121212] font-light">{fmtDateTime(b.endDateTime)}</td>
                                            <td className="p-4 text-sm text-[#8A817C] font-light">{b.reason ?? "—"}</td>
                                            <td className="p-4">
                                                <button onClick={() => setPendingDeleteId(b.id)} className="p-1.5 text-[#8A817C] hover:text-red-600 border border-[#121212]/5 hover:border-red-200 rounded-md transition-colors" title="Delete">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {panel && selectedFacilityId && (
                    <BlockPanel
                        facilityId={selectedFacilityId}
                        isSubmitting={isSubmitting}
                        onClose={() => setPanel(false)}
                        onSave={handleSave}
                    />
                )}
            </div>
            {pendingDeleteId && (
                <ConfirmModal
                    title="Delete calendar block"
                    message="This block will be permanently removed. Bookings within the blocked period are not cancelled automatically."
                    confirmLabel="Delete block"
                    onConfirm={() => handleDelete(pendingDeleteId)}
                    onCancel={() => setPendingDeleteId(null)}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    );
}

// ─── Bookings Tab ─────────────────────────────────────────────────────────────

interface BookingDetailPanelProps {
    booking: RentalBooking;
    isSubmitting: boolean;
    onClose: () => void;
    onConfirm: (id: string, notes?: string) => Promise<void>;
    onReject: (id: string, reason: string) => Promise<void>;
    onMarkPaid: (paymentId: string, reference?: string) => Promise<void>;
    onRefund: (paymentId: string) => Promise<void>;
    onApplyDiscount: (id: string, dto: { overrideDiscountType: DiscountType; overrideDiscountValue: number; overrideDiscountNote?: string }) => Promise<void>;
    onRemoveDiscount: (id: string) => Promise<void>;
}

function BookingDetailPanel({ booking, isSubmitting, onClose, onConfirm, onReject, onMarkPaid, onRefund, onApplyDiscount, onRemoveDiscount }: BookingDetailPanelProps) {
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [showDiscountForm, setShowDiscountForm] = useState(false);
    const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
    const [discountValue, setDiscountValue] = useState("");
    const [discountNote, setDiscountNote] = useState("");
    const [confirmNotes, setConfirmNotes] = useState("");
    const [showConfirmNotes, setShowConfirmNotes] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const isPending = booking.status === "PENDING";
    const hasOverrideDiscount = booking.overrideDiscountType !== null;

    const handleConfirm = async () => {
        setErr(null);
        try {
            await onConfirm(booking.id, confirmNotes.trim() || undefined);
            setShowConfirmNotes(false);
        } catch (ex: any) {
            setErr(ex?.message || "Failed to confirm.");
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) { setErr("Rejection reason is required."); return; }
        setErr(null);
        try {
            await onReject(booking.id, rejectReason.trim());
            setShowRejectForm(false);
        } catch (ex: any) {
            setErr(ex?.message || "Failed to reject.");
        }
    };

    const handleApplyDiscount = async () => {
        if (!discountValue || isNaN(Number(discountValue))) { setErr("A valid discount value is required."); return; }
        setErr(null);
        try {
            await onApplyDiscount(booking.id, {
                overrideDiscountType: discountType,
                overrideDiscountValue: Number(discountValue),
                overrideDiscountNote: discountNote.trim() || undefined,
            });
            setShowDiscountForm(false);
            setDiscountValue("");
            setDiscountNote("");
        } catch (ex: any) {
            setErr(ex?.message || "Failed to apply discount.");
        }
    };

    const handleRemoveDiscount = async () => {
        setErr(null);
        try {
            await onRemoveDiscount(booking.id);
        } catch (ex: any) {
            setErr(ex?.message || "Failed to remove discount.");
        }
    };

    const memberName = `${booking.member.firstname} ${booking.member.lastname}`;

    return (
        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative overflow-hidden flex flex-col">
            <PanelHeader
                eyebrow="Booking Detail"
                title={memberName}
                onClose={onClose}
            />
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <InlineError msg={err} />

                {/* Status + meta */}
                <div className="flex items-center gap-2 flex-wrap">
                    <BookingStatusBadge status={booking.status} />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#8A817C] border border-[#121212]/10 rounded px-2 py-0.5">{booking.memberCategory}</span>
                </div>

                {/* Member */}
                <div className="bg-[#F4F1EA]/40 border border-[#121212]/5 rounded-xl p-4 space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Member</p>
                    <p className="text-sm text-[#121212] font-light">{memberName}</p>
                    <p className="text-xs text-[#8A817C] font-light">{booking.member.email}</p>
                </div>

                {/* Facility + Period */}
                <div className="grid grid-cols-1 gap-3">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Facility</p>
                        <p className="text-sm text-[#121212] font-light mt-0.5">{booking.facility.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Start</p>
                            <p className="text-sm text-[#121212] font-light mt-0.5">{fmtDateTime(booking.startDateTime)}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">End</p>
                            <p className="text-sm text-[#121212] font-light mt-0.5">{fmtDateTime(booking.endDateTime)}</p>
                        </div>
                    </div>
                    {booking.purpose && (
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Purpose</p>
                            <p className="text-sm text-[#121212] font-light mt-0.5">{booking.purpose}</p>
                        </div>
                    )}
                    {booking.notes && (
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Notes</p>
                            <p className="text-sm text-[#8A817C] font-light mt-0.5">{booking.notes}</p>
                        </div>
                    )}
                    {booking.rejectionReason && (
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-red-400">Rejection Reason</p>
                            <p className="text-sm text-red-600 font-light mt-0.5">{booking.rejectionReason}</p>
                        </div>
                    )}
                </div>

                {/* Price breakdown */}
                <div className="bg-[#F4F1EA]/40 border border-[#121212]/5 rounded-xl p-4 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Price Breakdown</p>
                    <div className="flex justify-between text-sm font-light">
                        <span className="text-[#8A817C]">Base Price</span>
                        <span className="text-[#121212]">{fmt(booking.basePrice)}</span>
                    </div>
                    {booking.discountValue != null && (
                        <div className="flex justify-between text-sm font-light">
                            <span className="text-[#8A817C]">Discount ({booking.discountSource})</span>
                            <span className="text-green-600">–{booking.discountType === "PERCENTAGE" ? `${booking.discountValue}%` : fmt(booking.discountValue)}</span>
                        </div>
                    )}
                    {booking.overrideDiscountValue != null && (
                        <div className="flex justify-between text-sm font-light">
                            <span className="text-[#8A817C]">Override Discount{booking.overrideDiscountNote ? ` (${booking.overrideDiscountNote})` : ""}</span>
                            <span className="text-green-600">–{booking.overrideDiscountType === "PERCENTAGE" ? `${booking.overrideDiscountValue}%` : fmt(booking.overrideDiscountValue)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm font-light">
                        <span className="text-[#8A817C]">Service Fee</span>
                        <span className="text-[#121212]">{fmt(booking.serviceFee)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-light">
                        <span className="text-[#8A817C]">Caution Total</span>
                        <span className="text-[#121212]">{fmt(booking.cautionTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold border-t border-[#121212]/5 pt-2 mt-2">
                        <span className="text-[#121212]">Grand Total</span>
                        <span className="text-[#121212]">{fmt(booking.grandTotal)}</span>
                    </div>
                </div>

                {/* Add-ons */}
                {booking.bookingAddons.length > 0 && (
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Add-ons</p>
                        <div className="space-y-1">
                            {booking.bookingAddons.map((ba) => (
                                <div key={ba.id} className="flex justify-between text-sm font-light">
                                    <span className="text-[#8A817C]">{ba.addon.name} × {ba.quantity}</span>
                                    <span className="text-[#121212]">{fmt(ba.addon.price * ba.quantity)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Payments */}
                {booking.payments.length > 0 && (
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Payments</p>
                        <div className="space-y-2">
                            {booking.payments.map((p) => (
                                <div key={p.id} className="flex items-center justify-between bg-[#F4F1EA]/40 border border-[#121212]/5 rounded-lg px-3 py-2">
                                    <div>
                                        <p className="text-xs text-[#121212] font-light">{p.type} — {fmt(p.amount)}</p>
                                        <p className="text-[10px] text-[#8A817C] font-mono mt-0.5">{p.status}{p.reference ? ` · ${p.reference}` : ""}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        {p.status === "PENDING" && (
                                            <button
                                                onClick={() => onMarkPaid(p.id)}
                                                disabled={isSubmitting}
                                                className="h-7 px-2.5 bg-[#121212] text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-40 transition-colors"
                                            >
                                                Mark Paid
                                            </button>
                                        )}
                                        {p.status === "PAID" && p.type === "CAUTION" && (
                                            <button
                                                onClick={() => onRefund(p.id)}
                                                disabled={isSubmitting}
                                                className="h-7 px-2.5 bg-red-500 text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:bg-red-600 disabled:opacity-40 transition-colors"
                                            >
                                                Refund
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Confirm / Reject */}
                {isPending && (
                    <div className="space-y-3 pt-2 border-t border-[#121212]/5">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Actions</p>
                        {showConfirmNotes ? (
                            <div className="space-y-2">
                                <textarea
                                    className="w-full px-4 py-2.5 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                                    rows={2}
                                    placeholder="Optional confirmation notes…"
                                    value={confirmNotes}
                                    onChange={(e) => setConfirmNotes(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => setShowConfirmNotes(false)} className="flex-1 h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors">Cancel</button>
                                    <button onClick={handleConfirm} disabled={isSubmitting} className="flex-1 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-40 transition-colors">
                                        {isSubmitting ? "Confirming…" : "Confirm Booking"}
                                    </button>
                                </div>
                            </div>
                        ) : showRejectForm ? (
                            <div className="space-y-2">
                                <textarea
                                    className="w-full px-4 py-2.5 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                                    rows={2}
                                    placeholder="Reason for rejection…"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => setShowRejectForm(false)} className="flex-1 h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors">Cancel</button>
                                    <button onClick={handleReject} disabled={isSubmitting} className="flex-1 h-9 px-4 bg-red-500 text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-red-600 disabled:opacity-40 transition-colors">
                                        {isSubmitting ? "Rejecting…" : "Reject Booking"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <button onClick={() => setShowConfirmNotes(true)} className="flex-1 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors">
                                    Confirm
                                </button>
                                <button onClick={() => setShowRejectForm(true)} className="flex-1 h-9 px-4 bg-red-500 text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-red-600 transition-colors">
                                    Reject
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Discount */}
                <div className="pt-2 border-t border-[#121212]/5 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Override Discount</p>
                        {hasOverrideDiscount && (
                            <button onClick={handleRemoveDiscount} disabled={isSubmitting} className="text-[10px] text-red-500 hover:text-red-700 font-semibold uppercase tracking-wider disabled:opacity-40 transition-colors">
                                Remove
                            </button>
                        )}
                    </div>
                    {showDiscountForm ? (
                        <div className="space-y-3">
                            <select className={sel} value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
                                <option value="PERCENTAGE">Percentage (%)</option>
                                <option value="FLAT">Flat Amount</option>
                            </select>
                            <input type="number" min={0} step="0.01" className={inp} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === "PERCENTAGE" ? "e.g. 10 for 10%" : "Amount"} />
                            <input className={inp} value={discountNote} onChange={(e) => setDiscountNote(e.target.value)} placeholder="Optional note…" />
                            <div className="flex gap-2">
                                <button onClick={() => setShowDiscountForm(false)} className="flex-1 h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors">Cancel</button>
                                <button onClick={handleApplyDiscount} disabled={isSubmitting} className="flex-1 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 disabled:opacity-40 transition-colors">
                                    {isSubmitting ? "Applying…" : "Apply"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowDiscountForm(true)} className="w-full h-9 px-4 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors">
                            {hasOverrideDiscount ? "Edit Discount" : "Apply Discount"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function BookingsTab() {
    const {
        bookings, isLoading, isSubmitting,
        fetchBookings, fetchBookingById,
        selectedBooking, setSelectedBooking,
        confirmBooking, rejectBooking,
        applyBookingDiscount, removeBookingDiscount,
        markPaymentPaid, refundPayment,
    } = useFacilityRental();

    const [statusFilter, setStatusFilter] = useState<BookingStatus | "">("");

    useEffect(() => { fetchBookings(statusFilter || undefined); }, [statusFilter, fetchBookings]);

    const handleRowClick = useCallback(async (b: RentalBooking) => {
        await fetchBookingById(b.id);
    }, [fetchBookingById]);

    const handleConfirm = useCallback(async (id: string, notes?: string) => {
        await confirmBooking(id, { notes });
    }, [confirmBooking]);

    const handleReject = useCallback(async (id: string, reason: string) => {
        await rejectBooking(id, { rejectionReason: reason });
    }, [rejectBooking]);

    const handleMarkPaid = useCallback(async (paymentId: string, reference?: string) => {
        await markPaymentPaid(paymentId, { reference });
    }, [markPaymentPaid]);

    const handleRefund = useCallback(async (paymentId: string) => {
        await refundPayment(paymentId);
    }, [refundPayment]);

    const handleApplyDiscount = useCallback(async (id: string, dto: { overrideDiscountType: DiscountType; overrideDiscountValue: number; overrideDiscountNote?: string }) => {
        await applyBookingDiscount(id, dto);
    }, [applyBookingDiscount]);

    const handleRemoveDiscount = useCallback(async (id: string) => {
        await removeBookingDiscount(id);
    }, [removeBookingDiscount]);

    const panelOpen = selectedBooking !== null;

    return (
        <div className="space-y-4">
            {/* Status filter chips */}
            <div className="flex gap-1 flex-wrap">
                {BOOKING_STATUSES.map((s) => (
                    <button
                        key={s.value}
                        onClick={() => setStatusFilter(s.value)}
                        className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest rounded-lg transition-colors ${statusFilter === s.value ? "bg-[#121212] text-white" : "text-[#8A817C] border border-[#121212]/10 hover:text-[#121212]"}`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className={`${panelOpen ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    {["Member", "Facility", "Start", "End", "Status", "Total"].map((h) => (
                                        <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                                ) : bookings.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                            <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            No bookings found.
                                        </td>
                                    </tr>
                                ) : (
                                    bookings.map((b) => (
                                        <tr
                                            key={b.id}
                                            onClick={() => handleRowClick(b)}
                                            className={`border-b border-[#121212]/5 hover:bg-[#F4F1EA]/30 transition-colors cursor-pointer ${selectedBooking?.id === b.id ? "bg-[#F4F1EA]/50" : ""}`}
                                        >
                                            <td className="p-4">
                                                <p className="text-sm text-[#121212] font-light">{b.member.firstname} {b.member.lastname}</p>
                                                <p className="text-xs text-[#8A817C] font-light mt-0.5">{b.member.email}</p>
                                            </td>
                                            <td className="p-4 text-sm text-[#8A817C] font-light">{b.facility.name}</td>
                                            <td className="p-4 text-xs text-[#8A817C] font-light">{fmtDateTime(b.startDateTime)}</td>
                                            <td className="p-4 text-xs text-[#8A817C] font-light">{fmtDateTime(b.endDateTime)}</td>
                                            <td className="p-4"><BookingStatusBadge status={b.status} /></td>
                                            <td className="p-4 text-sm text-[#121212] font-light">{fmt(b.grandTotal)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {panelOpen && selectedBooking && (
                    <BookingDetailPanel
                        booking={selectedBooking}
                        isSubmitting={isSubmitting}
                        onClose={() => setSelectedBooking(null)}
                        onConfirm={handleConfirm}
                        onReject={handleReject}
                        onMarkPaid={handleMarkPaid}
                        onRefund={handleRefund}
                        onApplyDiscount={handleApplyDiscount}
                        onRemoveDiscount={handleRemoveDiscount}
                    />
                )}
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default withAuth(function FacilityRentalPage() {
    const [tab, setTab] = useState<Tab>("facilities");

    return (
        <div className="space-y-8 font-sans">
            {/* Header */}
            <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Facility</div>
                <h1 className="text-xl font-light tracking-tight text-[#121212]">Facility Rental</h1>
            </div>

            {/* Tabs */}
            <TabBar active={tab} onChange={setTab} />

            {/* Tab content */}
            {tab === "facilities" && <FacilitiesTab />}
            {tab === "pricing-tiers" && <PricingTiersTab />}
            {tab === "addons" && <AddonsTab />}
            {tab === "calendar-blocks" && <CalendarBlocksTab />}
            {tab === "bookings" && <BookingsTab />}
        </div>
    );
}, { requiredPermission: 'facility_rental:read' });
