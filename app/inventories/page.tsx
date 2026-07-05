"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    Search, Plus, X,
    Package, AlertTriangle, Wrench, XCircle, Eye, Pencil,
    RotateCcw, LogOut, CheckCircle2,
} from "lucide-react";
import { api } from "@/utils/auth/axios-client";
import { useAssets, Asset, AssetStatus, CreateAssetDto, AssetCheckout } from "@/hooks/use-assets";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { DismissibleError } from "@/components/ui/dismissible-error";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<AssetStatus, string> = {
    ACTIVE: "Active",
    INACTIVE: "Inactive",
    UNDER_MAINTENANCE: "Under Maintenance",
    DECOMMISSIONED: "Decommissioned",
};

const STATUS_COLORS: Record<AssetStatus, string> = {
    ACTIVE: "bg-green-50 border-green-100 text-green-700",
    INACTIVE: "bg-[#F4F1EA] border-[#121212]/10 text-[#8A817C]",
    UNDER_MAINTENANCE: "bg-amber-50 border-amber-100 text-amber-700",
    DECOMMISSIONED: "bg-red-50 border-red-100 text-red-700",
};

const STATUS_ICONS: Record<AssetStatus, React.ReactNode> = {
    ACTIVE: <CheckCircle2 className="w-3 h-3" />,
    INACTIVE: <XCircle className="w-3 h-3" />,
    UNDER_MAINTENANCE: <Wrench className="w-3 h-3" />,
    DECOMMISSIONED: <AlertTriangle className="w-3 h-3" />,
};

const ASSET_STATUSES: AssetStatus[] = ["ACTIVE", "INACTIVE", "UNDER_MAINTENANCE", "DECOMMISSIONED"];

type Tab = "assets" | "checkouts";

interface FormState {
    tagNumber: string; name: string; description: string; category: string;
    location: string; serialNumber: string; manufacturer: string; model: string;
    vendorName: string; vendorContact: string; purchaseDate: string; purchaseValue: string;
    maintenanceEnabled: boolean; inventoryEnabled: boolean;
}

const EMPTY_FORM: FormState = {
    tagNumber: "", name: "", description: "", category: "",
    location: "", serialNumber: "", manufacturer: "", model: "",
    vendorName: "", vendorContact: "", purchaseDate: "", purchaseValue: "",
    maintenanceEnabled: false, inventoryEnabled: false,
};

function formToDto(f: FormState): CreateAssetDto {
    return {
        tagNumber: f.tagNumber, name: f.name,
        description: f.description || undefined, category: f.category,
        location: f.location || undefined, serialNumber: f.serialNumber || undefined,
        manufacturer: f.manufacturer || undefined, model: f.model || undefined,
        vendorName: f.vendorName || undefined, vendorContact: f.vendorContact || undefined,
        purchaseDate: f.purchaseDate || undefined,
        purchaseValue: f.purchaseValue ? parseFloat(f.purchaseValue) : undefined,
        maintenanceEnabled: f.maintenanceEnabled, inventoryEnabled: f.inventoryEnabled,
    };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
    return (
        <tr className="border-b border-[#121212]/5 animate-pulse">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="p-4"><div className="h-3 bg-[#F4F1EA] rounded w-3/4" /></td>
            ))}
        </tr>
    );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AssetStatus }) {
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${STATUS_COLORS[status]}`}>
            {STATUS_ICONS[status]}
            {STATUS_LABELS[status]}
        </span>
    );
}

// ─── Asset form modal ─────────────────────────────────────────────────────────

interface AssetFormModalProps {
    initial?: Partial<FormState>;
    onClose: () => void;
    onSave: (dto: CreateAssetDto) => Promise<void>;
    isSubmitting: boolean;
}

function AssetFormModal({ initial, onClose, onSave, isSubmitting }: AssetFormModalProps) {
    const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, ...initial });
    const [err, setErr] = useState<string | null>(null);

    const setStr = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((prev) => ({ ...prev, [k]: e.target.value }));
    const setBool = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [k]: e.target.checked }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.tagNumber.trim() || !form.name.trim() || !form.category.trim()) {
            setErr("Tag number, name and category are required.");
            return;
        }
        setErr(null);
        try {
            await onSave(formToDto(form));
            onClose();
        } catch (ex: any) {
            setErr(ex?.message || "Something went wrong.");
        }
    };

    const inp = "w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg";
    const lbl = "block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5";

    return (
        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#121212]/5">
                <h2 className="text-sm font-light tracking-tight text-[#121212]">
                    {initial?.tagNumber ? "Edit Asset" : "New Asset"}
                </h2>
                <button onClick={onClose} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
                    {err && <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs font-light">{err}</div>}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={lbl}>Tag Number <span className="text-red-500">*</span></label>
                            <input className={inp} value={form.tagNumber} onChange={setStr("tagNumber")} placeholder="e.g. ASSET-001" />
                        </div>
                        <div>
                            <label className={lbl}>Category <span className="text-red-500">*</span></label>
                            <input className={inp} value={form.category} onChange={setStr("category")} placeholder="e.g. Electronics" />
                        </div>
                    </div>
                    <div>
                        <label className={lbl}>Name <span className="text-red-500">*</span></label>
                        <input className={inp} value={form.name} onChange={setStr("name")} placeholder="Asset name" />
                    </div>
                    <div>
                        <label className={lbl}>Description</label>
                        <textarea className="w-full px-3 py-2 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none" rows={2} value={form.description} onChange={setStr("description")} placeholder="Optional description" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={lbl}>Location</label><input className={inp} value={form.location} onChange={setStr("location")} /></div>
                        <div><label className={lbl}>Serial Number</label><input className={inp} value={form.serialNumber} onChange={setStr("serialNumber")} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={lbl}>Manufacturer</label><input className={inp} value={form.manufacturer} onChange={setStr("manufacturer")} /></div>
                        <div><label className={lbl}>Model</label><input className={inp} value={form.model} onChange={setStr("model")} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={lbl}>Purchase Date</label>
                            <input type="date" className={inp} value={form.purchaseDate} onChange={setStr("purchaseDate")} />
                        </div>
                        <div>
                            <label className={lbl}>Purchase Value</label>
                            <input type="number" min={0} step="0.01" className={inp} value={form.purchaseValue} onChange={setStr("purchaseValue")} placeholder="0.00" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={lbl}>Vendor Name</label><input className={inp} value={form.vendorName} onChange={setStr("vendorName")} /></div>
                        <div><label className={lbl}>Vendor Contact</label><input className={inp} value={form.vendorContact} onChange={setStr("vendorContact")} /></div>
                    </div>
                    <div className="flex gap-6">
                        <label className="flex items-center gap-2 text-sm text-[#121212] font-light cursor-pointer">
                            <input type="checkbox" checked={form.maintenanceEnabled} onChange={setBool("maintenanceEnabled")} className="rounded" />
                            Maintenance tracking
                        </label>
                        <label className="flex items-center gap-2 text-sm text-[#121212] font-light cursor-pointer">
                            <input type="checkbox" checked={form.inventoryEnabled} onChange={setBool("inventoryEnabled")} className="rounded" />
                            Inventory tracking
                        </label>
                    </div>
                    <div className="flex gap-3 pt-2 border-t border-[#121212]/5">
                        <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-[#121212]/10 text-sm text-[#8A817C] font-light hover:bg-[#F4F1EA]/40">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting} className="flex-1 h-10 rounded-lg bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#121212]/90 disabled:opacity-40 transition-colors">
                            {isSubmitting ? "Saving…" : "Save Asset"}
                        </button>
                    </div>
                </form>
        </div>
    );
}

// ─── Asset detail modal ───────────────────────────────────────────────────────

interface AssetDetailModalProps {
    asset: Asset;
    onClose: () => void;
    onEdit: () => void;
}

function AssetDetailModal({ asset, onClose, onEdit }: AssetDetailModalProps) {
    return (
        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#121212]/5">
                <div>
                    <h2 className="text-sm font-light tracking-tight text-[#121212]">{asset.name}</h2>
                    <p className="text-[11px] font-mono text-[#8A817C] mt-0.5">{asset.tagNumber}</p>
                </div>
                <button onClick={onClose} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={asset.status} />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#8A817C] border border-[#121212]/10 rounded px-2 py-0.5">{asset.category}</span>
                    </div>
                    {asset.description && <p className="text-sm text-[#8A817C] font-light leading-relaxed">{asset.description}</p>}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        {asset.location && <div><p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Location</p><p className="text-sm text-[#121212] font-light mt-0.5">{asset.location}</p></div>}
                        {asset.serialNumber && <div><p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Serial</p><p className="text-sm text-[#121212] font-light mt-0.5">{asset.serialNumber}</p></div>}
                        {asset.manufacturer && <div><p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Manufacturer</p><p className="text-sm text-[#121212] font-light mt-0.5">{asset.manufacturer}</p></div>}
                        {asset.model && <div><p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Model</p><p className="text-sm text-[#121212] font-light mt-0.5">{asset.model}</p></div>}
                        {asset.purchaseDate && <div><p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Purchased</p><p className="text-sm text-[#121212] font-light mt-0.5">{new Date(asset.purchaseDate).toLocaleDateString()}</p></div>}
                        {asset.purchaseValue != null && <div><p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Value</p><p className="text-sm text-[#121212] font-light mt-0.5">{asset.purchaseValue.toLocaleString()}</p></div>}
                        {asset.vendorName && <div><p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Vendor</p><p className="text-sm text-[#121212] font-light mt-0.5">{asset.vendorName}</p></div>}
                        {asset.department && <div><p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Department</p><p className="text-sm text-[#121212] font-light mt-0.5">{asset.department.name}</p></div>}
                    </div>
                    {asset.inventoryEnabled && (
                        <div className="bg-[#F4F1EA]/40 border border-[#121212]/5 rounded-xl p-4 grid grid-cols-4 gap-3 text-center">
                            {(
                                [["In Storage", asset.inStorage], ["In Use", asset.inUse], ["Under Repair", asset.underRepair], ["Written Off", asset.writtenOff]] as [string, number | undefined][]
                            ).map(([label, val]) => (
                                <div key={label}>
                                    <p className="text-xl font-light text-[#121212]">{val ?? 0}</p>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mt-0.5">{label}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    <button onClick={onEdit} className="w-full h-10 rounded-lg border border-[#121212]/10 text-sm text-[#121212] font-light hover:bg-[#F4F1EA]/40 flex items-center justify-center gap-2 transition-colors">
                        <Pencil className="w-3.5 h-3.5" /> Edit Asset
                    </button>
            </div>
        </div>
    );
}

// ─── Active checkouts panel ───────────────────────────────────────────────────

function ActiveCheckoutsPanel() {
    const [checkouts, setCheckouts] = useState<AssetCheckout[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchActive = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get("/admin/assets/checkouts");
            const outer = res.data?.data;
            setCheckouts(Array.isArray(outer?.data) ? outer.data : Array.isArray(outer) ? outer : []);
        } catch {
            setCheckouts([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchActive(); }, [fetchActive]);

    return (
        <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#121212]/5 flex items-center justify-between">
                <h2 className="text-sm font-light tracking-tight text-[#121212]">Active Checkouts</h2>
                <button onClick={fetchActive} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" />
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                            {["Asset", "Checked Out To", "Checked Out", "Expected Return", "Purpose"].map((h) => (
                                <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                        ) : checkouts.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                    <LogOut className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    No active checkouts.
                                </td>
                            </tr>
                        ) : (
                            checkouts.map((c) => (
                                <tr key={c.id} className="border-b border-[#121212]/5 hover:bg-[#F4F1EA]/30 transition-colors">
                                    <td className="p-4">
                                        <p className="text-sm text-[#121212] font-light">{c.asset.name}</p>
                                        <p className="text-[11px] font-mono text-[#8A817C] mt-0.5">{c.asset.tagNumber}</p>
                                    </td>
                                    <td className="p-4 text-sm text-[#121212] font-light">
                                        {c.checkedOutToMember
                                            ? `${c.checkedOutToMember.firstname} ${c.checkedOutToMember.lastname}`
                                            : c.checkedOutToDepartment?.name || "—"}
                                    </td>
                                    <td className="p-4 text-xs text-[#8A817C] font-light">{new Date(c.checkedOutAt).toLocaleDateString()}</td>
                                    <td className="p-4 text-xs text-[#8A817C] font-light">{c.expectedReturnAt ? new Date(c.expectedReturnAt).toLocaleDateString() : "—"}</td>
                                    <td className="p-4 text-xs text-[#8A817C] font-light">{c.purpose || "—"}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default withAuth(function InventoryPage() {
    const { assets, pagination, isLoading, isSubmitting, error, clearError, fetchAssets, createAsset, updateAsset, goToPage } = useAssets(20);

    const [tab, setTab] = useState<Tab>("assets");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<AssetStatus | "">("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);

    const categories = useMemo(() => {
        const cats = new Set(assets.map((a) => a.category).filter(Boolean));
        return Array.from(cats).sort();
    }, [assets]);

    const handleSearch = useCallback(() => {
        fetchAssets({ page: 1, search: search.trim() || undefined, status: statusFilter, category: categoryFilter || undefined });
    }, [fetchAssets, search, statusFilter, categoryFilter]);

    const handleCreate = async (dto: CreateAssetDto) => {
        await createAsset(dto);
    };

    const handleUpdate = async (dto: CreateAssetDto) => {
        if (!editingAsset) return;
        await updateAsset(editingAsset.id, dto);
        setEditingAsset(null);
    };

    const assetToFormState = (a: Asset): Partial<FormState> => ({
        tagNumber: a.tagNumber, name: a.name, description: a.description ?? "",
        category: a.category, location: a.location ?? "", serialNumber: a.serialNumber ?? "",
        manufacturer: a.manufacturer ?? "", model: a.model ?? "",
        vendorName: a.vendorName ?? "", vendorContact: a.vendorContact ?? "",
        purchaseDate: a.purchaseDate ?? "", purchaseValue: a.purchaseValue?.toString() ?? "",
        maintenanceEnabled: a.maintenanceEnabled, inventoryEnabled: a.inventoryEnabled,
    });

    const tabCls = (t: Tab) =>
        `px-4 py-2 text-[11px] font-semibold uppercase tracking-widest transition-colors rounded-lg ${tab === t ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`;

    return (
        <div className="space-y-10 font-sans">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Asset Management</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Track and manage your organisation&apos;s assets
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {pagination && (
                        <span className="text-[10px] font-mono text-[#8A817C] border border-[#121212]/10 px-3 py-1.5 rounded-lg">
                            {pagination.totalCount} assets
                        </span>
                    )}
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 h-9 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" /> New Asset
                    </button>
                </div>
            </div>

            <DismissibleError message={error} />

            {/* Tabs */}
            <div className="flex gap-1">
                <button className={tabCls("assets")} onClick={() => setTab("assets")}>Assets</button>
                <button className={tabCls("checkouts")} onClick={() => setTab("checkouts")}>Active Checkouts</button>
            </div>

            {tab === "assets" && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                        <div className="relative flex-1 min-w-[180px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A817C]" />
                            <input
                                type="text"
                                placeholder="Search assets…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                className="w-full h-10 pl-9 pr-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as AssetStatus | "")}
                            className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                        >
                            <option value="">All Statuses</option>
                            {ASSET_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                        </select>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                        >
                            <option value="">All Categories</option>
                            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button
                            onClick={handleSearch}
                            className="h-10 px-4 text-xs font-semibold uppercase tracking-wider bg-[#121212] text-white rounded-lg hover:bg-[#121212]/90 transition-colors"
                        >
                            Apply
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    <div className={`${showForm || editingAsset || viewingAsset ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                        {["Tag", "Name", "Category", "Location", "Status", ""].map((h) => (
                                            <th key={h} className="p-4 text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                                    ) : assets.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                                <Package className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                No assets found.
                                            </td>
                                        </tr>
                                    ) : (
                                        assets.map((a) => (
                                            <tr key={a.id} className="border-b border-[#121212]/5 hover:bg-[#F4F1EA]/30 transition-colors">
                                                <td className="p-4 text-[11px] font-mono text-[#8A817C]">{a.tagNumber}</td>
                                                <td className="p-4">
                                                    <p className="text-sm text-[#121212] font-light">{a.name}</p>
                                                    {a.manufacturer && <p className="text-xs text-[#8A817C] font-light mt-0.5">{a.manufacturer}{a.model ? ` · ${a.model}` : ""}</p>}
                                                </td>
                                                <td className="p-4 text-xs text-[#8A817C] font-light">{a.category}</td>
                                                <td className="p-4 text-xs text-[#8A817C] font-light">{a.location || "—"}</td>
                                                <td className="p-4"><StatusBadge status={a.status} /></td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => setViewingAsset(a)} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md transition-colors" title="View">
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => setEditingAsset(a)} className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md transition-colors" title="Edit">
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <PaginationBar
                            pagination={pagination}
                            onPage={goToPage}
                            label="assets"
                        />
                    </div>

                        {showForm && (
                            <AssetFormModal onClose={() => { setShowForm(false); }} onSave={handleCreate} isSubmitting={isSubmitting} />
                        )}
                        {editingAsset && (
                            <AssetFormModal
                                initial={assetToFormState(editingAsset)}
                                onClose={() => setEditingAsset(null)}
                                onSave={handleUpdate}
                                isSubmitting={isSubmitting}
                            />
                        )}
                        {!editingAsset && viewingAsset && (
                            <AssetDetailModal
                                asset={viewingAsset}
                                onClose={() => setViewingAsset(null)}
                                onEdit={() => { setEditingAsset(viewingAsset); setViewingAsset(null); }}
                            />
                        )}
                    </div>
                </div>
            )}

            {tab === "checkouts" && <ActiveCheckoutsPanel />}
        </div>
    );
}, { requiredPermission: 'asset_management:read' });
