"use client";

import React, { useState, useMemo } from "react";
import {
    CalendarCheck,
    Search,
    SlidersHorizontal,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Cpu
} from "lucide-react";

interface AttendanceRecord {
    workerId: string;
    name: string;
    department: string;
    tier: "Gold" | "Diamond" | "Platinum";
    sessionsAttended: number;
    totalSessions: number;
    punctualCount: number;
    lastActiveDate: string;
}

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
    {
        workerId: "W-74920",
        name: "Oluwaseun Adebayo",
        department: "Media & Tech",
        tier: "Platinum",
        sessionsAttended: 24,
        totalSessions: 24,
        punctualCount: 23,
        lastActiveDate: "2026-06-14"
    },
    {
        workerId: "W-33948",
        name: "Amara Nwosu",
        department: "Children's Church",
        tier: "Diamond",
        sessionsAttended: 22,
        totalSessions: 24,
        punctualCount: 20,
        lastActiveDate: "2026-06-14"
    },
    {
        workerId: "W-11209",
        name: "Tochukwu Okafor",
        department: "Prayer Band",
        tier: "Platinum",
        sessionsAttended: 21,
        totalSessions: 24,
        punctualCount: 19,
        lastActiveDate: "2026-06-14"
    },
    {
        workerId: "W-11402",
        name: "Chidi Obi",
        department: "Ushering",
        tier: "Gold",
        sessionsAttended: 18,
        totalSessions: 24,
        punctualCount: 14,
        lastActiveDate: "2026-06-11"
    },
    {
        workerId: "W-98211",
        name: "Tunde Bakare",
        department: "Praise Team",
        tier: "Gold",
        sessionsAttended: 15,
        totalSessions: 24,
        punctualCount: 10,
        lastActiveDate: "2026-06-14"
    }
];

type SortKey = "rank" | "name" | "rate" | "punctuality";
type SortOrder = "asc" | "desc";

export default function AttendancePage() {
    const [attendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);

    const [searchQuery, setSearchQuery] = useState("");
    const [deptFilter, setDeptFilter] = useState<string>("All");
    const [tierFilter, setTierFilter] = useState<string>("All");

    const [sortKey, setSortKey] = useState<SortKey>("rank");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    const departments = useMemo(() => {
        const depts = new Set(attendance.map(a => a.department));
        return ["All", ...Array.from(depts)];
    }, [attendance]);

    const rankedRecords = useMemo(() => {
        const calculated = attendance.map(item => {
            const rate = item.totalSessions > 0 ? (item.sessionsAttended / item.totalSessions) * 100 : 0;
            const punctuality = item.sessionsAttended > 0 ? (item.punctualCount / item.sessionsAttended) * 100 : 0;
            return { ...item, rate, punctuality };
        });

        calculated.sort((a, b) => {
            if (b.rate !== a.rate) return b.rate - a.rate;
            return b.punctuality - a.punctuality;
        });

        return calculated.map((item, index) => ({ ...item, currentRank: index + 1 }));
    }, [attendance]);

    const leaderboardTopThree = useMemo(() => {
        return rankedRecords.slice(0, 3);
    }, [rankedRecords]);

    const filteredAndSortedRecords = useMemo(() => {
        let result = [...rankedRecords];

        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (a) =>
                    a.name.toLowerCase().includes(query) ||
                    a.workerId.toLowerCase().includes(query)
            );
        }

        if (deptFilter !== "All") {
            result = result.filter((a) => a.department === deptFilter);
        }

        if (tierFilter !== "All") {
            result = result.filter((a) => a.tier === tierFilter);
        }

        if (sortKey !== "rank") {
            result.sort((a, b) => {
                if (sortKey === "name") {
                    return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
                }
                if (sortKey === "rate") {
                    return sortOrder === "asc" ? a.rate - b.rate : b.rate - a.rate;
                }
                if (sortKey === "punctuality") {
                    return sortOrder === "asc" ? a.punctuality - b.punctuality : b.punctuality - a.punctuality;
                }
                return 0;
            });
        } else {
            if (sortOrder === "desc") {
                result.reverse();
            }
        }

        return result;
    }, [rankedRecords, searchQuery, deptFilter, tierFilter, sortKey, sortOrder]);

    const paginatedRecords = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedRecords.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAndSortedRecords, currentPage]);

    const totalPages = Math.ceil(filteredAndSortedRecords.length / itemsPerPage);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortOrder("asc");
        }
    };

    return (
        <div className="space-y-10 font-sans">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                        Attendance Metrics & Leaderboard
                    </h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Real-time automated check-in monitoring and staff performance rankings
                    </p>
                </div>

                <div className="flex items-center space-x-2 bg-[#FFFFFF] border border-[#121212]/10 px-4 py-2 rounded-xl text-[11px] font-mono font-semibold uppercase tracking-wider text-[#8A817C]">
                    <Cpu className="w-3.5 h-3.5 text-green-600 animate-pulse" />
                    <span>Biometric System Active</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {leaderboardTopThree.map((item, idx) => {
                    const medals = ["🥇", "🥈", "🥉"];
                    const borders = ["border-yellow-500", "border-slate-400", "border-amber-700"];
                    return (
                        <div
                            key={item.workerId}
                            className={`bg-[#FFFFFF] border-t-4 ${borders[idx] || "border-[#121212]/10"} p-6 rounded-b-xl relative overflow-hidden flex flex-col justify-between`}
                            style={{ borderTopLeftRadius: "0px", borderTopRightRadius: "0px" }}
                        >
                            <div className="absolute right-4 top-4 text-2xl select-none">{medals[idx]}</div>
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">
                                    Rank 0{item.currentRank}
                                </div>
                                <div className="text-lg font-medium text-[#121212] mt-1 truncate max-w-[85%]">{item.name}</div>
                                <div className="text-xs text-[#8A817C] font-mono mt-0.5">{item.department} &bull; {item.tier}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 border-t border-[#121212]/5 pt-4 mt-4 font-mono text-xs">
                                <div>
                                    <span className="text-[#8A817C] block text-[9px] font-semibold uppercase tracking-widest">Attendance</span>
                                    <span className="text-[#121212] font-semibold">{item.rate.toFixed(1)}%</span>
                                </div>
                                <div>
                                    <span className="text-[#8A817C] block text-[9px] font-semibold uppercase tracking-widest">Punctual Rate</span>
                                    <span className="text-[#121212] font-semibold">{item.punctuality.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-col xl:flex-row gap-6 items-center justify-between bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                <div className="w-full xl:max-w-md relative">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8A817C]" />
                    <input
                        type="text"
                        placeholder="Search roster lines by name index or staff token keys..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="w-full h-11 pl-11 pr-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>

                <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#8A817C]" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Unit:</span>
                        <select
                            value={deptFilter}
                            onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
                            className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none min-w-[140px]"
                        >
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Tier:</span>
                        <select
                            value={tierFilter}
                            onChange={(e) => { setTierFilter(e.target.value); setCurrentPage(1); }}
                            className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none min-w-[140px]"
                        >
                            <option value="All">All Tiers</option>
                            <option value="Gold">Gold</option>
                            <option value="Diamond">Diamond</option>
                            <option value="Platinum">Platinum</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                <th
                                    onClick={() => handleSort("rank")}
                                    className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212]"
                                >
                                    <div className="flex items-center space-x-1.5">
                                        <span>Rank</span>
                                        <ArrowUpDown className="w-3 h-3" />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort("name")}
                                    className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212]"
                                >
                                    <div className="flex items-center space-x-1.5">
                                        <span>Personnel Identity</span>
                                        <ArrowUpDown className="w-3 h-3" />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort("rate")}
                                    className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212]"
                                >
                                    <div className="flex items-center space-x-1.5">
                                        <span>Attendance Rate</span>
                                        <ArrowUpDown className="w-3 h-3" />
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort("punctuality")}
                                    className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212]"
                                >
                                    <div className="flex items-center space-x-1.5">
                                        <span>Punctuality Ratio</span>
                                        <ArrowUpDown className="w-3 h-3" />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                            {paginatedRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                        No matching resource metrics mapped within current verification sequences.
                                    </td>
                                </tr>
                            ) : (
                                paginatedRecords.map((item) => (
                                    <tr key={item.workerId} className="hover:bg-[#F4F1EA]/10 transition-colors">
                                        <td className="p-4 font-mono text-sm font-semibold text-[#121212]">
                                            #{item.currentRank.toString().padStart(2, "0")}
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-medium text-[#121212]">{item.name}</div>
                                            <div className="text-xs text-[#8A817C] font-mono mt-0.5">{item.department} &bull; {item.tier}</div>
                                        </td>
                                        <td className="p-4 font-mono text-xs text-[#121212]">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-semibold">{item.rate.toFixed(1)}%</span>
                                                <span className="text-[#8A817C] text-[10px]">({item.sessionsAttended}/{item.totalSessions})</span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono text-xs text-[#121212]">
                                            <span className="font-semibold">{item.punctuality.toFixed(1)}%</span>
                                            <span className="text-[#8A817C] text-[10px] ml-1">({item.punctualCount} late-free)</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 border-t border-[#121212]/10 bg-[#F4F1EA]/10 flex items-center justify-between">
                        <span className="text-xs font-mono text-[#8A817C]">
                            Page {currentPage} of {totalPages}
                        </span>
                        <div className="flex space-x-1">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                                className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212]"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212]"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}