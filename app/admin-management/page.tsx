"use client";

import React, { useState, useMemo } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    useAdminRoles,
    useAdminUsers,
    PERMISSION_GROUPS,
    AdminPermission,
    AdminRole,
    AdminUser,
    CreateRolePayload,
    UpdateRolePayload,
} from "@/hooks/use-admin-management";
import { useModuleState } from "@/hooks/use-module-state";
import {
    ShieldCheck, RefreshCw, Plus, X, Trash2, Eye,
    Pencil, Check, ShieldAlert, CheckCircle2, ChevronLeft, ChevronRight,
    Users, Shield, Search, MousePointerClick,
} from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { DismissibleError } from "@/components/ui/dismissible-error";
import { MemberSearchSelect } from "@/components/ui/member-search-select";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

// ─── helpers ───────────────────────────────────────────────────────────────

const fullName = (admin: AdminUser) =>
    [admin.member.firstname, admin.member.lastname].filter(Boolean).join(" ");

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

// ─── skeleton ──────────────────────────────────────────────────────────────

function SkeletonRow({ cols }: Readonly<{ cols: number }>) {
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

// ─── permission picker ──────────────────────────────────────────────────────

function PermissionPicker({
    selected,
    onChange,
}: Readonly<{ selected: AdminPermission[]; onChange: (p: AdminPermission[]) => void }>) {
    const { isModuleEnabled } = useModuleState();
    const visibleGroups = useMemo(
        () => PERMISSION_GROUPS.filter((g) => isModuleEnabled(g.moduleKey)),
        [isModuleEnabled]
    );
    const allPerms = useMemo(
        () => visibleGroups.flatMap((g) => g.permissions.map((p) => p.value)),
        [visibleGroups]
    );
    const allSelected = allPerms.length > 0 && allPerms.every((p) => selected.includes(p));

    const toggle = (perm: AdminPermission) => {
        onChange(selected.includes(perm) ? selected.filter((p) => p !== perm) : [...selected, perm]);
    };

    const toggleGroup = (perms: AdminPermission[]) => {
        const allOn = perms.every((p) => selected.includes(p));
        onChange(allOn ? selected.filter((p) => !perms.includes(p)) : [...selected, ...perms.filter((p) => !selected.includes(p))]);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#121212]/5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8A817C]">
                    {selected.length} of {allPerms.length} selected
                </span>
                <button
                    type="button"
                    onClick={() => onChange(allSelected ? [] : allPerms)}
                    className="text-[10px] font-semibold uppercase tracking-wider text-[#121212] hover:text-[#8A817C] transition-colors"
                >
                    {allSelected ? "Deselect All" : "Select All"}
                </button>
            </div>
            <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                {visibleGroups.map((group) => {
                    const groupPerms = group.permissions.map((p) => p.value);
                    const allOn = groupPerms.every((p) => selected.includes(p));
                    return (
                        <div key={group.group}>
                            <button
                                type="button"
                                onClick={() => toggleGroup(groupPerms)}
                                className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#121212] hover:text-[#8A817C] mb-1.5 w-full text-left"
                            >
                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${allOn ? "bg-[#121212] border-[#121212]" : "border-[#121212]/20 bg-white"}`}>
                                    {allOn && <Check className="w-2 h-2 text-white" />}
                                </div>
                                {group.group}
                            </button>
                            <div className="grid grid-cols-1 gap-y-1 pl-5">
                                {group.permissions.map((p) => (
                                    <label key={p.value} className="flex items-center gap-2 text-xs text-[#121212] font-light cursor-pointer hover:text-[#8A817C]">
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(p.value)}
                                            onChange={() => toggle(p.value)}
                                            className="w-3 h-3 accent-[#121212]"
                                        />
                                        {p.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── role form (shared by create + edit) ───────────────────────────────────

interface RoleFormValues {
    name: string;
    description: string;
    permissions: AdminPermission[];
}

const defaultRoleForm: RoleFormValues = { name: "", description: "", permissions: [] };

// ─── main page ──────────────────────────────────────────────────────────────

type PageTab = "admins" | "roles";

export default withAuth(function AdminManagementPage() {
    const {
        roles, isLoading: rolesLoading, isSubmitting: roleSubmitting,
        error: roleError, fetchRoles, createRole, updateRole, deleteRole,
    } = useAdminRoles();

    const {
        admins, isLoading: adminsLoading, isSubmitting: adminSubmitting,
        error: adminError, fetchAdmins, grantAdmin, updateAdmin, revokeAdmin,
    } = useAdminUsers();

    const isSubmitting = roleSubmitting || adminSubmitting;

    // ── tab ────────────────────────────────────────────────────────────────
    const [tab, setTab] = useState<PageTab>("admins");

    // ── admin table state ──────────────────────────────────────────────────
    const [adminPage, setAdminPage] = useState(1);
    const adminPerPage = 8;

    const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
    const [adminRoleId, setAdminRoleId] = useState("");
    const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
    const [adminPanelError, setAdminPanelError] = useState<string | null>(null);
    const [adminPanelSuccess, setAdminPanelSuccess] = useState<string | null>(null);

    // ── right panel mode ───────────────────────────────────────────────────
    const [showGrantForm, setShowGrantForm] = useState(false);

    const openGrantForm = () => {
        setShowGrantForm(true);
        setSelectedAdmin(null);
        setGrantMemberId("");
        setGrantMemberLabel("");
        setGrantRoleId("");
        setGrantError(null);
        setGrantSuccess(null);
    };

    const closePanel = () => {
        setShowGrantForm(false);
        setSelectedAdmin(null);
    };

    // ── admin filters ──────────────────────────────────────────────────────
    const [adminSearch, setAdminSearch] = useState("");
    const [adminRoleFilter, setAdminRoleFilter] = useState("");
    const [adminStatusFilter, setAdminStatusFilter] = useState<"all" | "active" | "inactive">("all");

    const handleAdminSearch = (val: string) => { setAdminSearch(val); setAdminPage(1); };
    const handleAdminRoleFilter = (val: string) => { setAdminRoleFilter(val); setAdminPage(1); };
    const handleAdminStatusFilter = (val: "all" | "active" | "inactive") => { setAdminStatusFilter(val); setAdminPage(1); };

    // ── grant form ─────────────────────────────────────────────────────────
    const [grantMemberId, setGrantMemberId] = useState("");
    const [grantMemberLabel, setGrantMemberLabel] = useState("");
    const [grantRoleId, setGrantRoleId] = useState("");
    const [grantError, setGrantError] = useState<string | null>(null);
    const [grantSuccess, setGrantSuccess] = useState<string | null>(null);

    // ── roles tab state ────────────────────────────────────────────────────
    const [roleSearch, setRoleSearch] = useState("");
    const filteredRoles = useMemo(
        () => roleSearch.trim()
            ? roles.filter((r) => r.name.toLowerCase().includes(roleSearch.toLowerCase()))
            : roles,
        [roles, roleSearch]
    );

    const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
    const [roleForm, setRoleForm] = useState<RoleFormValues>(defaultRoleForm);
    const [roleFormMode, setRoleFormMode] = useState<"create" | "edit">("create");
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [roleFormError, setRoleFormError] = useState<string | null>(null);
    const [roleFormSuccess, setRoleFormSuccess] = useState<string | null>(null);

    // ── filtered + paginated admins ────────────────────────────────────────
    const filteredAdmins = useMemo(() => {
        const q = adminSearch.trim().toLowerCase();
        return admins.filter((a) => {
            const nameMatch = !q || fullName(a).toLowerCase().includes(q) || a.member.email.toLowerCase().includes(q);
            const roleMatch = !adminRoleFilter || a.adminRole?.id === adminRoleFilter;
            const statusMatch = adminStatusFilter === "all" || (adminStatusFilter === "active" ? a.isActive : !a.isActive);
            return nameMatch && roleMatch && statusMatch;
        });
    }, [admins, adminSearch, adminRoleFilter, adminStatusFilter]);

    const paginatedAdmins = useMemo(() => {
        const start = (adminPage - 1) * adminPerPage;
        return filteredAdmins.slice(start, start + adminPerPage);
    }, [filteredAdmins, adminPage]);

    const totalAdminPages = Math.ceil(filteredAdmins.length / adminPerPage);

    // ── open admin detail ──────────────────────────────────────────────────
    const openAdmin = (admin: AdminUser) => {
        setSelectedAdmin(admin);
        setShowGrantForm(false);
        setAdminRoleId(admin.adminRole?.id ?? "");
        setAdminPanelError(null);
        setAdminPanelSuccess(null);
        setRevokeConfirmId(null);
    };

    // ── grant admin ────────────────────────────────────────────────────────
    const handleGrant = async (e: React.FormEvent) => {
        e.preventDefault();
        setGrantError(null);
        setGrantSuccess(null);
        try {
            await grantAdmin({ memberId: grantMemberId, adminRoleId: grantRoleId });
            setGrantMemberId("");
            setGrantMemberLabel("");
            setGrantRoleId("");
            setGrantSuccess("Admin access granted successfully.");
            setTimeout(() => {
                setGrantSuccess(null);
                setShowGrantForm(false);
            }, 2000);
        } catch (err: unknown) {
            const e = err as ApiError;
            setGrantError(e?.message ?? "Failed to grant admin access.");
        }
    };

    // ── update admin role ──────────────────────────────────────────────────
    const handleAdminRoleChange = async (newRoleId: string) => {
        if (!selectedAdmin) return;
        setAdminRoleId(newRoleId);
        setAdminPanelError(null);
        setAdminPanelSuccess(null);
        try {
            await updateAdmin(selectedAdmin.id, { adminRoleId: newRoleId });
            setAdminPanelSuccess("Role updated.");
            setTimeout(() => setAdminPanelSuccess(null), 2000);
        } catch (err: unknown) {
            const e = err as ApiError;
            setAdminPanelError(e?.message ?? "Failed to update role.");
        }
    };

    // ── revoke admin ───────────────────────────────────────────────────────
    const handleRevoke = async (adminId: string) => {
        setAdminPanelError(null);
        try {
            await revokeAdmin(adminId);
            setSelectedAdmin(null);
        } catch (err: unknown) {
            const e = err as ApiError;
            setAdminPanelError(e?.message ?? "Failed to revoke access.");
        }
    };

    // ── open role for edit ─────────────────────────────────────────────────
    const openRoleEdit = (role: AdminRole) => {
        setSelectedRole(role);
        setRoleForm({ name: role.name, description: role.description ?? "", permissions: [...role.permissions] });
        setRoleFormMode("edit");
        setRoleFormError(null);
        setRoleFormSuccess(null);
        setDeleteConfirmId(null);
    };

    const openRoleCreate = () => {
        setSelectedRole(null);
        setRoleForm(defaultRoleForm);
        setRoleFormMode("create");
        setRoleFormError(null);
        setRoleFormSuccess(null);
    };

    // ── save role ──────────────────────────────────────────────────────────
    const handleRoleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setRoleFormError(null);
        setRoleFormSuccess(null);
        const payload: CreateRolePayload | UpdateRolePayload = {
            name: roleForm.name,
            description: roleForm.description || undefined,
            permissions: roleForm.permissions,
        };
        try {
            if (roleFormMode === "create") {
                await createRole(payload as CreateRolePayload);
                setRoleForm(defaultRoleForm);
                setRoleFormSuccess("Role created successfully.");
            } else if (selectedRole) {
                const updated = await updateRole(selectedRole.id, payload);
                setSelectedRole(updated);
                setRoleFormSuccess("Role updated.");
            }
            setTimeout(() => setRoleFormSuccess(null), 3000);
        } catch (err: unknown) {
            const e = err as ApiError;
            setRoleFormError(e?.message ?? "Failed to save role.");
        }
    };

    // ── delete role ────────────────────────────────────────────────────────
    const handleDeleteRole = async (roleId: string) => {
        setRoleFormError(null);
        try {
            await deleteRole(roleId);
            setSelectedRole(null);
            setRoleForm(defaultRoleForm);
            setRoleFormMode("create");
        } catch (err: unknown) {
            const e = err as ApiError;
            setRoleFormError(e?.message ?? "Failed to delete role.");
        }
    };

    const activeCount = useMemo(() => admins.filter((a) => a.isActive).length, [admins]);

    const panelOpen = showGrantForm || selectedAdmin !== null;

    return (
        <div className="space-y-10 font-sans">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                        Admin Users & Roles
                    </h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Grant admin access, define roles, and control permission sets
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[#8A817C]">{activeCount} active admin{activeCount !== 1 ? "s" : ""}</span>
                    {tab === "admins" && (
                        <button
                            type="button"
                            onClick={openGrantForm}
                            className="flex items-center gap-1.5 h-9 px-4 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Grant Access
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => { fetchAdmins(); fetchRoles(); }}
                        disabled={adminsLoading || rolesLoading}
                        className="p-2 border border-[#121212]/10 rounded-lg text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors disabled:opacity-40"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${adminsLoading || rolesLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            <DismissibleError message={adminError ?? roleError} />

            {/* Tabs */}
            <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl w-fit">
                {(["admins", "roles"] as const).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={`flex items-center space-x-1.5 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${
                            tab === t ? "bg-[#121212] text-[#FFFFFF]" : "text-[#8A817C] hover:text-[#121212]"
                        }`}
                    >
                        {t === "admins" ? <Users className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                        <span>{t === "admins" ? "Admin Users" : "Roles & Permissions"}</span>
                    </button>
                ))}
            </div>

            {/* ── Admins tab ── */}
            {tab === "admins" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* Left: Admins table */}
                    <div className={`${panelOpen ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col transition-all`}>

                        {/* Filter bar */}
                        <div className="p-4 border-b border-[#121212]/10 bg-[#F4F1EA]/10 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                            <div className="relative flex-1 min-w-0">
                                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8A817C]" />
                                <input
                                    type="text"
                                    placeholder="Search by name or email…"
                                    value={adminSearch}
                                    onChange={(e) => handleAdminSearch(e.target.value)}
                                    className="w-full h-9 pl-9 pr-4 bg-white border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                />
                            </div>
                            <select
                                value={adminRoleFilter}
                                onChange={(e) => handleAdminRoleFilter(e.target.value)}
                                className="h-9 px-3 bg-white border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none shrink-0"
                            >
                                <option value="">All Roles</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                            <div className="flex bg-[#F4F1EA] p-0.5 rounded-lg border border-[#121212]/5 shrink-0">
                                {(["all", "active", "inactive"] as const).map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => handleAdminStatusFilter(s)}
                                        className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-colors ${adminStatusFilter === s ? "bg-[#121212] text-white" : "text-[#8A817C] hover:text-[#121212]"}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Name</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden sm:table-cell">Email</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Role</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Status</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] hidden md:table-cell">Granted</th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                    {adminsLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
                                    ) : paginatedAdmins.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                                {admins.length === 0
                                                    ? "No admin accounts yet. Click Grant Access to add one."
                                                    : "No admins match your filters."}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedAdmins.map((admin) => (
                                            <tr
                                                key={admin.id}
                                                onClick={() => openAdmin(admin)}
                                                className={`transition-colors cursor-pointer ${selectedAdmin?.id === admin.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
                                            >
                                                <td className="p-4 text-sm font-medium text-[#121212]">{fullName(admin)}</td>
                                                <td className="p-4 text-xs font-mono text-[#8A817C] hidden sm:table-cell">{admin.member.email}</td>
                                                <td className="p-4">
                                                    <span className="inline-block px-2 py-0.5 bg-[#F4F1EA] border border-[#121212]/5 text-[#121212] text-[9px] font-bold uppercase tracking-wider rounded">
                                                        {admin.adminRole?.name ?? "—"}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${admin.isActive ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-600"}`}>
                                                        {admin.isActive ? "Active" : "Inactive"}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-xs font-mono text-[#8A817C] hidden md:table-cell">{fmtDate(admin.createdAt)}</td>
                                                <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        onClick={() => openAdmin(admin)}
                                                        className="p-2 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 hover:border-[#121212] rounded-lg transition-colors"
                                                        title="View"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {(totalAdminPages > 1 || filteredAdmins.length !== admins.length) && (
                            <div className="p-4 border-t border-[#121212]/10 bg-[#F4F1EA]/10 flex items-center justify-between">
                                <span className="text-xs font-mono text-[#8A817C]">
                                    {filteredAdmins.length !== admins.length
                                        ? `${filteredAdmins.length} of ${admins.length} admins`
                                        : `${admins.length} total`}
                                    {totalAdminPages > 1 && ` · Page ${adminPage} of ${totalAdminPages}`}
                                </span>
                                {totalAdminPages > 1 && (
                                    <div className="flex space-x-1">
                                        <button
                                            type="button"
                                            disabled={adminPage === 1}
                                            onClick={() => setAdminPage((p) => p - 1)}
                                            className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212] hover:bg-[#F4F1EA]"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={adminPage === totalAdminPages}
                                            onClick={() => setAdminPage((p) => p + 1)}
                                            className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212] hover:bg-[#F4F1EA]"
                                        >
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: contextual panel */}
                    {panelOpen && (
                        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative">

                            {/* Panel close button */}
                            <button
                                type="button"
                                onClick={closePanel}
                                className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md z-10 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* ── Grant Access form ── */}
                            {showGrantForm && (
                                <div className="p-6">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">New Admin</div>
                                    <h2 className="text-lg font-light tracking-tight text-[#121212] mb-6 pr-8">Grant Admin Access</h2>

                                    {grantSuccess && (
                                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700 mb-4">
                                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                                            {grantSuccess}
                                        </div>
                                    )}
                                    {grantError && (
                                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 mb-4">
                                            <ShieldAlert className="w-4 h-4 shrink-0" />
                                            <span className="flex-1">{grantError}</span>
                                            <button onClick={() => setGrantError(null)} className="shrink-0 p-0.5 text-red-400 hover:text-red-700 transition-colors" aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
                                        </div>
                                    )}

                                    <form onSubmit={handleGrant} className="space-y-5">
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                                Member
                                            </label>
                                            <MemberSearchSelect
                                                value={grantMemberId}
                                                label={grantMemberLabel}
                                                onChange={(id, label) => { setGrantMemberId(id); setGrantMemberLabel(label); }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                                Admin Role
                                            </label>
                                            <select
                                                required
                                                value={grantRoleId}
                                                onChange={(e) => setGrantRoleId(e.target.value)}
                                                className="w-full h-11 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                            >
                                                <option value="">-- Select a role --</option>
                                                {roles.map((r) => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !grantMemberId || !grantRoleId}
                                            className="w-full h-12 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 rounded-xl"
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? "animate-spin" : "hidden"}`} />
                                            <span>{isSubmitting ? "Granting..." : "Grant Access"}</span>
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* ── Admin detail ── */}
                            {!showGrantForm && selectedAdmin && (
                                <div className="flex flex-col h-full">
                                    {/* Detail header */}
                                    <div className="p-6 border-b border-[#121212]/5">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Admin Detail</div>
                                        <h2 className="text-lg font-light tracking-tight text-[#121212] pr-8">{fullName(selectedAdmin)}</h2>
                                        <div className="text-xs font-mono text-[#8A817C] mt-1 truncate">{selectedAdmin.member.email}</div>
                                        <div className="flex items-center gap-2 mt-3">
                                            <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${selectedAdmin.isActive ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-600"}`}>
                                                {selectedAdmin.isActive ? "Active" : "Inactive"}
                                            </span>
                                            <span className="text-[10px] font-mono text-[#8A817C]/60">Granted {fmtDate(selectedAdmin.createdAt)}</span>
                                        </div>
                                    </div>

                                    {/* Detail body */}
                                    <div className="p-6 space-y-6 overflow-y-auto flex-1">

                                        {/* Feedback */}
                                        {adminPanelSuccess && (
                                            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700">
                                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                                {adminPanelSuccess}
                                            </div>
                                        )}
                                        {adminPanelError && (
                                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                                                <ShieldAlert className="w-4 h-4 shrink-0" />
                                                <span className="flex-1">{adminPanelError}</span>
                                                <button onClick={() => setAdminPanelError(null)} className="shrink-0 p-0.5 text-red-400 hover:text-red-700 transition-colors" aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
                                            </div>
                                        )}

                                        {/* Role change */}
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212] flex items-center space-x-2">
                                                <ShieldCheck className="w-4 h-4 text-[#8A817C]" />
                                                <span>Assigned Role</span>
                                            </h3>
                                            <select
                                                value={adminRoleId}
                                                onChange={(e) => handleAdminRoleChange(e.target.value)}
                                                disabled={isSubmitting || !selectedAdmin.isActive}
                                                className="w-full h-11 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none disabled:opacity-50"
                                            >
                                                {roles.map((r) => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </select>
                                            <p className="text-[10px] font-mono text-[#8A817C]">Changing the role takes effect immediately.</p>
                                        </div>

                                        {/* Permissions preview */}
                                        <div className="space-y-2">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212]">
                                                Permissions on current role
                                            </h3>
                                            <div className="flex flex-wrap gap-1.5">
                                                {(selectedAdmin.adminRole?.permissions ?? []).map((p) => (
                                                    <span key={p} className="inline-block px-2 py-0.5 bg-[#F4F1EA] border border-[#121212]/5 text-[#121212] text-[9px] font-bold uppercase tracking-wider rounded font-mono">
                                                        {p}
                                                    </span>
                                                ))}
                                                {!selectedAdmin.adminRole?.permissions?.length && (
                                                    <span className="text-xs text-[#8A817C] italic font-light">No permissions on current role.</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Revoke */}
                                        {selectedAdmin.isActive && (
                                            <div className="pt-4 border-t border-[#121212]/5">
                                                {revokeConfirmId === selectedAdmin.id ? (
                                                    <div className="space-y-3">
                                                        <p className="text-xs text-red-600 font-medium">Revoke admin access for {fullName(selectedAdmin)}?</p>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRevoke(selectedAdmin.id)}
                                                                disabled={isSubmitting}
                                                                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
                                                            >
                                                                Confirm Revoke
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setRevokeConfirmId(null)}
                                                                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 rounded transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setRevokeConfirmId(selectedAdmin.id)}
                                                        className="flex items-center gap-1.5 text-xs text-red-600/70 hover:text-red-700 transition-colors"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                        Revoke admin access
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Empty state hint (no panel open, table takes full width) */}
                    {!panelOpen && admins.length > 0 && (
                        <div className="lg:col-span-12 flex items-center justify-center gap-2 text-xs text-[#8A817C] font-light py-2">
                            <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
                            Click any row to view admin details
                        </div>
                    )}
                </div>
            )}

            {/* ── Roles tab ── */}
            {tab === "roles" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* Role form */}
                    <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] mb-6 flex items-center space-x-2">
                            {roleFormMode === "create"
                                ? <><Plus className="w-4 h-4 text-[#8A817C]" /><span>Create Role</span></>
                                : <><Pencil className="w-4 h-4 text-[#8A817C]" /><span>Edit Role</span></>
                            }
                        </h2>

                        {roleFormSuccess && (
                            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700 mb-4">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                {roleFormSuccess}
                            </div>
                        )}
                        {roleFormError && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 mb-4">
                                <ShieldAlert className="w-4 h-4 shrink-0" />
                                {roleFormError}
                            </div>
                        )}

                        <form onSubmit={handleRoleSave} className="space-y-5">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Role Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={roleForm.name}
                                    onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g., Finance Manager"
                                    className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Description
                                </label>
                                <textarea
                                    rows={2}
                                    value={roleForm.description}
                                    onChange={(e) => setRoleForm((f) => ({ ...f, description: e.target.value }))}
                                    placeholder="Describe the responsibilities of this role..."
                                    className="w-full p-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Permissions ({roleForm.permissions.length} selected)
                                </label>
                                <div className="border border-[#121212]/10 rounded-lg p-4 bg-[#F4F1EA]/20">
                                    <PermissionPicker
                                        selected={roleForm.permissions}
                                        onChange={(p) => setRoleForm((f) => ({ ...f, permissions: p }))}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || roleForm.permissions.length === 0}
                                    className="flex-1 h-12 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 rounded-xl"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? "animate-spin" : "hidden"}`} />
                                    <span>{isSubmitting ? "Saving..." : roleFormMode === "create" ? "Create Role" : "Save Changes"}</span>
                                </button>
                                {roleFormMode === "edit" && (
                                    <button
                                        type="button"
                                        onClick={openRoleCreate}
                                        className="h-12 px-4 border border-[#121212]/10 text-xs font-semibold uppercase tracking-wider text-[#8A817C] hover:text-[#121212] hover:bg-[#F4F1EA] rounded-xl transition-colors"
                                    >
                                        New
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Roles list */}
                    <div className="lg:col-span-8 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8A817C]" />
                            <input
                                type="text"
                                placeholder="Search roles..."
                                value={roleSearch}
                                onChange={(e) => setRoleSearch(e.target.value)}
                                className="w-full h-11 pl-11 pr-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>
                        {rolesLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-5 animate-pulse">
                                    <div className="h-4 bg-[#F4F1EA] rounded w-40 mb-2" />
                                    <div className="h-3 bg-[#F4F1EA] rounded w-72" />
                                </div>
                            ))
                        ) : filteredRoles.length === 0 ? (
                            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-12 text-center text-xs text-[#8A817C] font-light">
                                {roles.length === 0 ? "No roles defined yet. Create one to get started." : "No roles match your search."}
                            </div>
                        ) : (
                            filteredRoles.map((role) => (
                                <div
                                    key={role.id}
                                    className={`bg-[#FFFFFF] border rounded-xl p-5 cursor-pointer transition-colors ${selectedRole?.id === role.id ? "border-[#121212]/30 bg-[#F4F1EA]/20" : "border-[#121212]/10 hover:border-[#121212]/20 hover:bg-[#F4F1EA]/10"}`}
                                    onClick={() => openRoleEdit(role)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1.5 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-[#8A817C] shrink-0" />
                                                <span className="text-sm font-medium text-[#121212]">{role.name}</span>
                                                <span className="inline-block px-2 py-0.5 bg-[#F4F1EA] border border-[#121212]/5 text-[#121212] text-[9px] font-bold uppercase tracking-wider rounded">
                                                    {role.permissions.length} permission{role.permissions.length !== 1 ? "s" : ""}
                                                </span>
                                            </div>
                                            {role.description && (
                                                <p className="text-xs font-light text-[#8A817C] pl-6">{role.description}</p>
                                            )}
                                            <div className="flex flex-wrap gap-1 pl-6 pt-1">
                                                {role.permissions.slice(0, 5).map((p) => (
                                                    <span key={p} className="text-[9px] bg-[#EADCC9] text-[#121212] px-1.5 py-0.5 rounded font-mono font-bold">{p}</span>
                                                ))}
                                                {role.permissions.length > 5 && (
                                                    <span className="text-[10px] text-[#8A817C] font-mono">+{role.permissions.length - 5} more</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => openRoleEdit(role)}
                                                className="p-2 text-[#8A817C] hover:text-[#121212] rounded-lg hover:bg-[#F4F1EA] transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDeleteConfirmId(role.id)}
                                                className="p-2 text-[#8A817C] hover:text-red-600 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
            {deleteConfirmId && (
                <ConfirmModal
                    title="Delete admin role"
                    message="This role will be permanently deleted. Admins currently assigned to this role will lose access."
                    confirmLabel="Delete role"
                    onConfirm={() => handleDeleteRole(deleteConfirmId)}
                    onCancel={() => setDeleteConfirmId(null)}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    );
}, { requiredPermission: 'admin:read' });
