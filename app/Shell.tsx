"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/side-bar";
import { HelpDrawer, WelcomeTour, useHelpSystem } from "@/components/layout/help-system";
import { HelpCircle, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/auth-context";

interface ShellProps {
    children: React.ReactNode;
}

const ROUTE_MAP: Record<string, [string, string]> = {
    "/dashboard":                         ["",          "Dashboard"],
    "/events":                            ["Events",    "Services"],
    "/venue":                             ["Events",    "Venues"],
    "/service-headcount":                 ["Events",    "Headcount"],
    "/service-programme":                 ["Events",    "Programme"],
    "/service-session":                   ["Events",    "Live Session"],
    "/prayer":                            ["Events",    "Prayer Schedule"],
    "/members":                           ["People",    "Members"],
    "/workers":                           ["People",    "Workers"],
    "/attendance":                        ["People",    "Attendance"],
    "/birthday":                          ["People",    "Birthdays"],
    "/admin-management":                  ["People",    "Admin Users"],
    "/leave":                             ["People",    "Worker Leave"],
    "/profile":                           ["",          "My Profile"],
    "/departments":                       ["Ministry",  "Departments"],
    "/classes":                           ["Ministry",  "Classes"],
    "/childrens-church":                  ["Ministry",  "Children's Church"],
    "/sunday-school":                     ["Ministry",  "Sunday School"],
    "/follow-up":                         ["Ministry",  "Follow Up"],
    "/announcements":                     ["",          "Announcements"],
    "/audit-logs":                        ["System",    "Audit Trail"],
    "/email-logs":                        ["System",    "Email Logs"],
    "/incident-reports":                  ["System",    "Incident Reports"],
    "/system-settings":                   ["System",    "Module Settings"],
    "/inventories":                       ["Facility",  "Inventories"],
    "/facility-rental":                   ["Facility",  "Facility Rental"],
    "/finances/reports":                  ["Finances",  "Reports"],
    "/finances/requests":                 ["Finances",  "Finance Requests"],
    "/finances/tithes":                   ["Finances",  "Tithe & Giving"],
    "/finances/offerings":                ["Finances",  "Giving Records"],
    "/finances/journal-entries":          ["Finances",  "Journal Entries"],
    "/finances/petty-cash":               ["Finances",  "Petty Cash"],
    "/finances/budgets":                  ["Finances",  "Budgets"],
    "/finances/pledges":                  ["Finances",  "Pledges"],
    "/finances/accounts":                 ["Finances",  "Chart of Accounts"],
    "/finances/funds":                    ["Finances",  "Funds"],
    "/finances/accounting-periods":       ["Finances",  "Accounting Periods"],
    "/finances/reconciliation":           ["Finances",  "Reconciliation"],
    "/finances/external-payees":          ["Finances",  "External Payees"],
    "/finances/bank-import-profiles":     ["Finances",  "Bank Import Profiles"],
    "/finances/recurring-entries":        ["Finances",  "Recurring Entries"],
};

function useBreadcrumb(pathname: string): { group: string; label: string } {
    const match = Object.entries(ROUTE_MAP)
        .filter(([path]) => pathname === path || pathname.startsWith(path + "/"))
        .sort((a, b) => b[0].length - a[0].length)[0];

    if (!match) return { group: "", label: "" };
    const [group, label] = match[1];
    return { group, label };
}

export default function Shell({ children }: ShellProps) {
    const { drawerOpen, tourOpen, openDrawer, closeDrawer, openTour, closeTour } = useHelpSystem();
    const { adminName, adminRoleName } = useAuth();
    const pathname = usePathname();
    const { group, label } = useBreadcrumb(pathname);

    return (
        <div className="flex w-screen h-screen overflow-hidden">
            <Sidebar />

            <main className="flex-1 h-full overflow-y-auto flex flex-col min-w-0">
                <header className="h-16 border-b border-[#121212]/10 bg-[#FFFFFF] flex items-center justify-between px-6 shrink-0">
                    <nav className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest">
                        {group ? (
                            <>
                                <span className="text-[#8A817C]">{group}</span>
                                <ChevronRight className="w-3 h-3 text-[#8A817C]/50 shrink-0" />
                                <span className="text-[#121212]">{label}</span>
                            </>
                        ) : (
                            <span className="text-[#121212]">{label || "Administrative Portal"}</span>
                        )}
                    </nav>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={openDrawer}
                            title="Help"
                            className="flex items-center gap-1.5 h-8 px-3 border border-[#121212]/10 text-[#8A817C] hover:text-[#121212] hover:border-[#121212]/20 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-colors"
                        >
                            <HelpCircle className="w-3.5 h-3.5" />
                            Help
                        </button>
                        <Link href="/profile" className="text-right group">
                            <div className="text-xs font-medium text-[#121212] group-hover:text-[#8A817C] transition-colors">
                                {adminName ?? "Admin User"}
                            </div>
                            <div className="text-[10px] text-[#8A817C] uppercase tracking-wider font-semibold">
                                {adminRoleName ?? "—"}
                            </div>
                        </Link>
                    </div>
                </header>

                <div className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto">
                    {children}
                </div>
            </main>

            <HelpDrawer isOpen={drawerOpen} onClose={closeDrawer} onShowTour={openTour} />
            {tourOpen && <WelcomeTour onClose={closeTour} />}
        </div>
    );
}
