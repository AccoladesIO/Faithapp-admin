"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Megaphone,
    Users,
    Network,
    Wallet,
    Boxes,
    CalendarCheck,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    LogOut,
    MicVocalIcon
} from "lucide-react";
import { useAuth } from "@/context/auth-context";

interface SubNavItem {
    name: string;
    href: string;
}

interface NavItem {
    name: string;
    href?: string;
    icon: React.ComponentType<{ className?: string }>;
    subItems?: SubNavItem[];
}

export default function Sidebar() {
    const pathname = usePathname();
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const { logout } = useAuth()
    const navigationData: NavItem[] = [
        {
            name: "Dashboard",
            href: "/dashboard",
            icon: LayoutDashboard
        },
        {
            name: "Events & Announcements",
            icon: Megaphone,
            subItems: [
                { name: "Events", href: "/events" },
                { name: "Venues", href: "/venue" },
                { name: "Announcements", href: "/announcements" }
            ]
        },
        {
            name: "People Management",
            icon: Users,
            subItems: [
                { name: "Manage Workers", href: "/workers" },
                { name: "Manage Members", href: "/members" }
            ]
        },
        {
            name: "Ministries",
            icon: MicVocalIcon,
            subItems: [
                { name: "Children's Ministry", href: "/childrens-ministry" },
                { name: "Classes", href: "/classes" },
                { name: "Connect Center", href: "/connect-center" },
                { name: "Follow up", href: "/follow-up" },
                { name: "Sunday School", href: "/sunday-school" }
            ]
        },
        {
            name: "Attendance",
            href: "/attendance",
            icon: CalendarCheck
        },
        {
            name: "Departments",
            href: "/departments",
            icon: Network
        },
        {
            name: "Finances",
            href: "/finances",
            icon: Wallet
        },
        {
            name: "Inventories",
            href: "/inventories",
            icon: Boxes
        }
    ];

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
            className={`h-screen bg-[#121212] text-[#FFFFFF] flex flex-col justify-between border-r border-black font-sans select-none relative transition-all duration-300 ${isMinimized ? "w-20" : "w-64"
                }`}
        >
            <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="absolute top-7 -right-3 w-6 h-6 bg-[#121212] border border-white/10 rounded-full flex items-center justify-center text-[#8A817C] hover:text-[#FFFFFF] transition-colors z-50"
            >
                {isMinimized ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <div className="flex flex-col overflow-x-hidden">
                <div className={`p-8 border-b border-white/10 flex items-center ${isMinimized ? "justify-center px-4" : "space-x-3"}`}>
                    <img
                        src="https://i.ibb.co/cX1MnZ5z/DC-LOGO.png"
                        alt="RCCG Discovery Centre Logo"
                        className="w-12 h-6 object-contain invert brightness-0 text-white shrink-0"
                    />
                    {!isMinimized && (
                        <div className="text-xs tracking-widest font-semibold uppercase text-[#8A817C] truncate">
                            Discovery Hub
                        </div>
                    )}
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {navigationData.map((item) => {
                        const Icon = item.icon;

                        if (item.subItems) {
                            const isDropdownOpen = openDropdown === item.name && !isMinimized;
                            const hasActiveChild = item.subItems.some(sub => pathname === sub.href);

                            return (
                                <div key={item.name} className="">
                                    <button
                                        onClick={() => toggleDropdown(item.name)}
                                        title={isMinimized ? item.name : undefined}
                                        className={`w-full text-left py-1 text-xs tracking-wider font-semibold uppercase transition-colors flex items-center justify-between rounded-lg ${isMinimized ? "px-0 justify-center" : "px-4"
                                            } ${hasActiveChild ? "text-[#FFFFFF]" : "text-[#8A817C] hover:text-[#FFFFFF]"}`}
                                    >
                                        <div className="flex items-center min-w-0 space-x-2">
                                            <div className={`p-2 rounded-xl transition-colors ${hasActiveChild ? "bg-[#8A817C]/30 text-[#FFFFFF]" : "bg-transparent"}`}>
                                                <Icon className="w-4 h-4 shrink-0" />
                                            </div>
                                            {!isMinimized && <span className="truncate">{item.name}</span>}
                                        </div>
                                        {!isMinimized && (
                                            <span className="text-[10px] shrink-0 ml-2">
                                                {isDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </span>
                                        )}
                                    </button>

                                    {isDropdownOpen && (
                                        <div className="bg-[#1C1C1C] border-l border-[#8A817C]/30 pl-2 ml-6 rounded-r-lg">
                                            {item.subItems.map((subItem) => {
                                                const isSubActive = pathname === subItem.href;
                                                return (
                                                    <Link
                                                        key={subItem.name}
                                                        href={subItem.href}
                                                        className={`block px-4 py-2 text-xs tracking-wider uppercase font-medium transition-colors rounded-md ${isSubActive
                                                            ? "text-[#FFFFFF] bg-[#8A817C]/20"
                                                            : "text-[#8A817C] hover:text-[#FFFFFF]"
                                                            }`}
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

                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href || "#"}
                                title={isMinimized ? item.name : undefined}
                                className={`flex items-center text-xs tracking-wider font-semibold uppercase transition-colors rounded-lg ${isMinimized ? "px-2 justify-center py-1" : "px-4 py-1"
                                    } ${isActive && !isMinimized ? "text-[#FFFFFF] bg-[#8A817C]/20" : "text-[#8A817C] hover:text-[#FFFFFF]"}`}
                            >
                                <div className="flex items-center space-x-2  min-w-0 w-full">
                                    <div className={`p-2 rounded-xl transition-colors ${isActive && isMinimized ? "bg-[#8A817C]/30 text-[#FFFFFF]" : "bg-transparent"}`}>
                                        <Icon className="w-4 h-4 shrink-0" />
                                    </div>
                                    {!isMinimized && <span className="truncate">{item.name}</span>}
                                </div>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className={`p-6 space-y-2 border-t border-white/10 transition-all duration-300 ${isMinimized ? "text-center px-2" : ""}`}>
                <div className={`w-full flex items-center space-x-3 text-xs font-bold p-3 text-[#8A817C] hover:text-white rounded-sm ${isMinimized ? "bg-transparent" : "bg-white/10"}`} onClick={logout}>
                    <div className={`p-2 rounded-xl transition-colors bg-transparent`}>
                        <LogOut className="w-4 h-4 shrink-0" />
                    </div>
                    {!isMinimized && "Logout"}
                </div>
                {!isMinimized ? (
                    <>
                        <div className="text-[10px] tracking-widest font-semibold uppercase text-[#8A817C] truncate">
                            RCCG Discovery Centre
                        </div>
                        <div className="text-[9px] text-[#8A817C]/60 font-mono mt-1">
                            v2.0.26 &bull; Dev Team
                        </div>
                    </>
                ) : (
                    <div className="text-[10px] font-mono font-semibold text-[#8A817C]">
                        ’26
                    </div>
                )}
            </div>
        </aside>
    );
}