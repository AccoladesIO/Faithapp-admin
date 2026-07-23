"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Megaphone,
    Users,
    Wallet,
    CalendarCheck,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    LogOut,
    MicVocalIcon,
    Building2,
    UserCircle,
    Settings2,
    HeartHandshake,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useModuleState } from "@/hooks/use-module-state";

interface SubNavItem {
    name: string;
    href: string;
    permission?: string;
    moduleKey?: string;
    comingSoon?: boolean;
}

interface NavItem {
    name: string;
    href?: string;
    icon: React.ComponentType<{ className?: string }>;
    permission?: string;
    subItems?: SubNavItem[];
}

function NavLink({ item, pathname, isMinimized }: Readonly<{ item: NavItem; pathname: string; isMinimized: boolean }>) {
    const Icon = item.icon;
    const isActive = pathname === item.href;
    const iconCls = isActive && isMinimized ? "bg-[#8A817C]/30 text-[#FFFFFF]" : "bg-transparent";
    const linkCls = isActive && !isMinimized ? "text-[#FFFFFF] bg-[#8A817C]/20" : "text-[#8A817C] hover:text-[#FFFFFF]";
    return (
        <Link
            href={item.href || "#"}
            title={isMinimized ? item.name : undefined}
            className={`flex items-center text-xs tracking-wider font-semibold uppercase transition-colors rounded-lg ${isMinimized ? "px-2 justify-center py-1" : "px-4 py-1"} ${linkCls}`}
        >
            <div className="flex items-center space-x-2 min-w-0 w-full">
                <div className={`p-2 rounded-xl transition-colors ${iconCls}`}>
                    <Icon className="w-4 h-4 shrink-0" />
                </div>
                {!isMinimized && <span className="truncate">{item.name}</span>}
            </div>
        </Link>
    );
}

function NavDropdown({ item, pathname, isMinimized, isOpen, onToggle, visibleSubItems }: Readonly<{
    item: NavItem;
    pathname: string;
    isMinimized: boolean;
    isOpen: boolean;
    onToggle: () => void;
    visibleSubItems: SubNavItem[];
}>) {
    const Icon = item.icon;
    const hasActiveChild = visibleSubItems.some(sub => !sub.comingSoon && pathname.startsWith(sub.href));
    const iconCls = hasActiveChild ? "bg-[#8A817C]/30 text-[#FFFFFF]" : "bg-transparent";
    const textCls = hasActiveChild ? "text-[#FFFFFF]" : "text-[#8A817C] hover:text-[#FFFFFF]";
    const paddingCls = isMinimized ? "px-0 justify-center" : "px-4";
    return (
        <div>
            <button
                onClick={onToggle}
                title={isMinimized ? item.name : undefined}
                className={`w-full text-left py-1 text-xs tracking-wider font-semibold uppercase transition-colors flex items-center justify-between rounded-lg ${paddingCls} ${textCls}`}
            >
                <div className="flex items-center min-w-0 space-x-2">
                    <div className={`p-2 rounded-xl transition-colors ${iconCls}`}>
                        <Icon className="w-4 h-4 shrink-0" />
                    </div>
                    {!isMinimized && <span className="truncate">{item.name}</span>}
                </div>
                {!isMinimized && (
                    <span className="text-[10px] shrink-0 ml-2">
                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                )}
            </button>
            {isOpen && (
                <div className="bg-[#1C1C1C] border-l border-[#8A817C]/30 pl-2 ml-6 rounded-r-lg">
                    {visibleSubItems.map((subItem) => {
                        if (subItem.comingSoon) {
                            return (
                                <div
                                    key={subItem.name}
                                    className="flex items-center justify-between px-4 py-2 text-xs tracking-wider uppercase font-medium text-[#8A817C]/40 cursor-not-allowed rounded-md select-none"
                                >
                                    <span>{subItem.name}</span>
                                    <span className="text-[8px] bg-[#8A817C]/15 text-[#8A817C]/50 px-1.5 py-0.5 rounded font-mono tracking-wide">Soon</span>
                                </div>
                            );
                        }
                        const isSubActive = pathname.startsWith(subItem.href);
                        return (
                            <Link
                                key={subItem.name}
                                href={subItem.href}
                                className={`block px-4 py-2 text-xs tracking-wider uppercase font-medium transition-colors rounded-md ${isSubActive ? "text-[#FFFFFF] bg-[#8A817C]/20" : "text-[#8A817C] hover:text-[#FFFFFF]"}`}
                            >
                                {subItem.name}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const { logout, hasPermission, adminName, adminRoleName } = useAuth();
    const { isModuleEnabled } = useModuleState();

    const navigationData: NavItem[] = useMemo(() => [
        {
            name: "Dashboard",
            href: "/dashboard",
            icon: LayoutDashboard,
            permission: "dashboard:read",
        },
        {
            name: "Events",
            icon: CalendarCheck,
            subItems: [
                { name: "Services",        href: "/events",             permission: "events:read" },
                { name: "Venues",          href: "/venue",              permission: "venues:read" },
                { name: "Headcount",       href: "/service-headcount",  permission: "headcount:read" },
                { name: "Programme",       href: "/service-programme",  permission: "service_programme:read" },
                { name: "Live Session",    href: "/service-session",    permission: "service_programme:read" },
                { name: "Prayer Schedule", href: "/prayer",             permission: "prayer:read", moduleKey: "prayer" },
            ],
        },
        {
            name: "People",
            icon: Users,
            subItems: [
                { name: "Members",        href: "/members",          permission: "members:read" },
                { name: "Workers",        href: "/workers",          permission: "departments:read" },
                { name: "Attendance",     href: "/attendance",       permission: "attendance:read" },
                { name: "Leave Requests", href: "/leave",            permission: "leave:read" },
                { name: "Birthdays",      href: "/birthday",         permission: "members:read" },
            ],
        },
        {
            name: "Care & Outreach",
            icon: HeartHandshake,
            subItems: [
                { name: "Follow Up",        href: "/follow-up",       permission: "follow_up:read", moduleKey: "follow_up" },
                { name: "Evangelism",       href: "/evangelism",      permission: "evangelism:read", moduleKey: "evangelism" },
                { name: "Prayer Requests",  href: "/prayer-requests", permission: "prayer:read", moduleKey: "prayer" },
                { name: "Pastor Feedback",  href: "/pastor-feedback", permission: "pastor_feedback:read", moduleKey: "pastor_feedback" },
            ],
        },
        {
            name: "Ministry",
            icon: MicVocalIcon,
            subItems: [
                { name: "Departments",      href: "/departments",    permission: "departments:read" },
                { name: "Training Classes", href: "/classes",        permission: "classes:read", moduleKey: "classes" },
                { name: "Children's Church",href: "/childrens-church", permission: "children_church:read", moduleKey: "children_church" },
                { name: "Sunday School",    href: "/sunday-school",  permission: "sunday_school:read", moduleKey: "sunday_school" },
            ],
        },
        {
            name: "Engagement",
            icon: Megaphone,
            subItems: [
                { name: "Broadcasts", href: "/announcements", permission: "announcements:read", moduleKey: "announcements" },
                { name: "Groups",     href: "/groups",         permission: "groups:read", moduleKey: "announcements" },
                { name: "Sermons",    href: "/sermons",        permission: "sermon:read", moduleKey: "sermons" },
                { name: "Games",      href: "/games",          permission: "games:read", moduleKey: "games" },
            ],
        },
        {
            name: "System",
            icon: Settings2,
            subItems: [
                { name: "Admin Users",       href: "/admin-management",  permission: "admin:read" },
                { name: "Audit Trail",       href: "/audit-logs",        permission: "audit:read" },
                { name: "Email Logs",        href: "/email-logs",         permission: "email_logs:read" },
                { name: "SMS Logs",          href: "/sms-logs",           permission: "sms:read" },
                { name: "Incident Reports",  href: "/incident-reports",   permission: "incident_report:read", moduleKey: "incident_report" },
                { name: "Module Settings",   href: "/system-settings",    permission: "admin:read" },
            ],
        },
        {
            name: "Facility",
            icon: Building2,
            subItems: [
                { name: "Inventories",    href: "/inventories",    permission: "asset_management:read", moduleKey: "asset_management" },
                { name: "Facility Rental",href: "/facility-rental",permission: "facility_rental:read", moduleKey: "facility_rental" },
            ],
        },
        {
            name: "Finances",
            icon: Wallet,
            subItems: [
                { name: "Reports",            href: "/finances/reports",            permission: "finance:report" },
                { name: "Finance Requests",   href: "/finances/requests",           permission: "finance:approve" },
                { name: "Tithe & Giving",     href: "/finances/tithes",            permission: "tithe:read", moduleKey: "tithe" },
                { name: "Giving Records",     href: "/finances/offerings",          permission: "finance:read" },
                { name: "Journal Entries",    href: "/finances/journal-entries",    permission: "finance:read" },
                { name: "Petty Cash",         href: "/finances/petty-cash",         permission: "finance:read" },
                { name: "Budgets",            href: "/finances/budgets",            permission: "finance:read" },
                { name: "Pledges",            href: "/finances/pledges",            permission: "finance:read" },
                { name: "Chart of Accounts",  href: "/finances/accounts",           permission: "finance:read" },
                { name: "Funds",              href: "/finances/funds",              permission: "finance:read" },
                { name: "Accounting Periods", href: "/finances/accounting-periods", permission: "finance:read" },
                { name: "Reconciliation",     href: "/finances/reconciliation",     permission: "finance:reconcile" },
                { name: "External Payees",    href: "/finances/external-payees",    permission: "finance:read" },
                { name: "Bank Import Profiles", href: "/finances/bank-import-profiles", permission: "finance:read" },
                { name: "Recurring Entries",  href: "/finances/recurring-entries",  permission: "finance:read" },
            ],
        },
    ], []);

    const isNavItemVisible = (item: NavItem): boolean => {
        if (item.subItems) {
            return getVisibleSubItems(item).length > 0;
        }
        return !item.permission || hasPermission(item.permission);
    };

    const getVisibleSubItems = (item: NavItem): SubNavItem[] => {
        if (!item.subItems) return [];
        return item.subItems.filter(sub =>
            (sub.comingSoon || !sub.permission || hasPermission(sub.permission))
            && isModuleEnabled(sub.moduleKey)
        );
    };

    useEffect(() => {
        const activeGroup = navigationData.find(item =>
            item.subItems?.some(sub => !sub.comingSoon && pathname.startsWith(sub.href))
        );
        if (activeGroup) setOpenDropdown(activeGroup.name);
    }, [pathname, navigationData]);

    const toggleDropdown = (name: string) => {
        if (isMinimized) {
            setIsMinimized(false);
            setOpenDropdown(name);
            return;
        }
        setOpenDropdown(openDropdown === name ? null : name);
    };

    return (
        <aside
            className={`h-screen bg-[#121212] text-[#FFFFFF] flex flex-col justify-between border-r border-black font-sans select-none relative transition-all duration-300 ${isMinimized ? "w-20" : "w-64"}`}
        >
            <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="absolute top-7 -right-3 w-6 h-6 bg-[#121212] border border-white/10 rounded-full flex items-center justify-center text-[#8A817C] hover:text-[#FFFFFF] transition-colors z-50"
            >
                {isMinimized ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <div className="flex flex-col overflow-x-hidden">
                <div className={`p-6 border-b border-white/10 flex items-center ${isMinimized ? "justify-center" : ""}`}>
                    {isMinimized ? (
                        <div className="w-8 h-8 bg-white/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-white tracking-tight">DH</span>
                        </div>
                    ) : (
                        <div className="min-w-0 w-full overflow-hidden">
                            <div className="text-sm font-bold text-white truncate">
                                {process.env.NEXT_PUBLIC_PRODUCT_NAME ?? "Discovery Hub"}
                            </div>
                            <div className="text-[10px] tracking-widest font-light text-[#8A817C] mt-0.5 truncate">
                                {process.env.NEXT_PUBLIC_CHURCH_NAME ?? "Your Church"}
                            </div>
                        </div>
                    )}
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {navigationData.filter(isNavItemVisible).map((item) => {
                        if (item.subItems) {
                            const visibleSubItems = getVisibleSubItems(item);
                            return (
                                <NavDropdown
                                    key={item.name}
                                    item={item}
                                    pathname={pathname}
                                    isMinimized={isMinimized}
                                    isOpen={openDropdown === item.name && !isMinimized}
                                    onToggle={() => toggleDropdown(item.name)}
                                    visibleSubItems={visibleSubItems}
                                />
                            );
                        }
                        return (
                            <NavLink
                                key={item.name}
                                item={item}
                                pathname={pathname}
                                isMinimized={isMinimized}
                            />
                        );
                    })}
                </nav>
            </div>

            <div className={`p-6 space-y-2 border-t border-white/10 transition-all duration-300 ${isMinimized ? "text-center px-2" : ""}`}>
                {!isMinimized && (adminName || adminRoleName) && (
                    <button
                        type="button"
                        onClick={() => router.push("/profile")}
                        className="flex items-center gap-2 mb-3 px-1 w-full text-left hover:opacity-80 transition-opacity"
                    >
                        <UserCircle className="w-4 h-4 text-[#8A817C] shrink-0" />
                        <div className="min-w-0">
                            {adminName && <p className="text-[10px] text-[#FFFFFF]/70 font-medium truncate">{adminName}</p>}
                            {adminRoleName && <p className="text-[9px] text-[#8A817C] truncate">{adminRoleName}</p>}
                        </div>
                    </button>
                )}
                <button
                    type="button"
                    onClick={logout}
                    className={`w-full flex items-center space-x-3 text-xs font-bold p-3 text-[#8A817C] hover:text-white rounded-sm ${isMinimized ? "bg-transparent" : "bg-white/10"}`}
                >
                    <div className="p-2 rounded-xl transition-colors bg-transparent">
                        <LogOut className="w-4 h-4 shrink-0" />
                    </div>
                    {!isMinimized && "Logout"}
                </button>
                {!isMinimized && (
                    <div className="text-[9px] text-[#8A817C]/60 font-mono mt-1">
                        v{process.env.NEXT_PUBLIC_APP_VERSION}
                    </div>
                )}
            </div>
        </aside>
    );
}
