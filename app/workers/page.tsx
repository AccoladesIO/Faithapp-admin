"use client";

import React, { useState, useMemo } from "react";
import { withAuth } from "@/utils/auth/with-auth";

import {
    Users,
    Search,
    SlidersHorizontal,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    Eye,
    GraduationCap,
    X,
    CheckCircle2,
    AlertCircle
} from "lucide-react";

interface Enrollment {
    className: "Believers Class" | "Baptismal Class" | "Workers in Training Class";
    status: "Enrolled" | "Completed" | "Dropped";
    grade: string | null;
}

interface Worker {
    id: string;
    name: string;
    email: string;
    department: string;
    status: "Active" | "On Leave" | "Suspended";
    joinDate: string;
    enrollments: Enrollment[];
}

const INITIAL_WORKERS: Worker[] = [
    {
        id: "W-74920",
        name: "Oluwaseun Adebayo",
        email: "o.adebayo@discoverycentre.org",
        department: "Media & Tech",
        status: "Active",
        joinDate: "2024-01-15",
        enrollments: [
            { className: "Believers Class", status: "Completed", grade: "A" },
            { className: "Baptismal Class", status: "Completed", grade: "Pass" },
            { className: "Workers in Training Class", status: "Completed", grade: "B+" }
        ]
    },
    {
        id: "W-11402",
        name: "Chidi Obi",
        email: "c.obi@discoverycentre.org",
        department: "Ushering",
        status: "Active",
        joinDate: "2024-06-20",
        enrollments: [
            { className: "Believers Class", status: "Completed", grade: "A-" },
            { className: "Baptismal Class", status: "Completed", grade: "Pass" },
            { className: "Workers in Training Class", status: "Enrolled", grade: null }
        ]
    },
    {
        id: "W-33948",
        name: "Amara Nwosu",
        email: "a.nwosu@discoverycentre.org",
        department: "Children's Church",
        status: "On Leave",
        joinDate: "2023-11-02",
        enrollments: [
            { className: "Believers Class", status: "Completed", grade: "B" },
            { className: "Baptismal Class", status: "Completed", grade: "Pass" },
            { className: "Workers in Training Class", status: "Completed", grade: "A" }
        ]
    },
    {
        id: "W-98211",
        name: "Tunde Bakare",
        email: "t.bakare@discoverycentre.org",
        department: "Praise Team",
        status: "Active",
        joinDate: "2025-02-10",
        enrollments: [
            { className: "Believers Class", status: "Enrolled", grade: null },
            { className: "Baptismal Class", status: "Dropped", grade: null },
            { className: "Workers in Training Class", status: "Enrolled", grade: null }
        ]
    },
    {
        id: "W-55401",
        name: "Funmi Oladele",
        email: "f.oladele@discoverycentre.org",
        department: "Prayer Band",
        status: "Suspended",
        joinDate: "2023-04-12",
        enrollments: [
            { className: "Believers Class", status: "Completed", grade: "A" },
            { className: "Baptismal Class", status: "Completed", grade: "Pass" },
            { className: "Workers in Training Class", status: "Completed", grade: "C" }
        ]
    }
];

type SortKey = "name" | "department" | "status" | "joinDate";
type SortOrder = "asc" | "desc";

export default withAuth(function WorkersPage() {
    const [workers, setWorkers] = useState<Worker[]>(INITIAL_WORKERS);
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("All");
    const [deptFilter, setDeptFilter] = useState<string>("All");

    const [sortKey, setSortKey] = useState<SortKey>("name");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 4;

    const [gradingIndex, setGradingIndex] = useState<number | null>(null);
    const [tempGrade, setTempGrade] = useState("");
    const [tempStatus, setTempStatus] = useState<"Enrolled" | "Completed" | "Dropped">("Enrolled");

    const departments = useMemo(() => {
        const depts = new Set(workers.map(w => w.department));
        return ["All", ...Array.from(depts)];
    }, [workers]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortOrder("asc");
        }
    };

    const filteredAndSortedWorkers = useMemo(() => {
        let result = [...workers];

        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (w) =>
                    w.name.toLowerCase().includes(query) ||
                    w.email.toLowerCase().includes(query) ||
                    w.id.toLowerCase().includes(query)
            );
        }

        if (statusFilter !== "All") {
            result = result.filter((w) => w.status === statusFilter);
        }

        if (deptFilter !== "All") {
            result = result.filter((w) => w.department === deptFilter);
        }

        result.sort((a, b) => {
            let valA = a[sortKey].toLowerCase();
            let valB = b[sortKey].toLowerCase();
            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

        return result;
    }, [workers, searchQuery, statusFilter, deptFilter, sortKey, sortOrder]);

    const paginatedWorkers = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedWorkers.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAndSortedWorkers, currentPage]);

    const totalPages = Math.ceil(filteredAndSortedWorkers.length / itemsPerPage);

    const startGrading = (index: number, enrollment: Enrollment) => {
        setGradingIndex(index);
        setTempGrade(enrollment.grade || "");
        setTempStatus(enrollment.status);
    };

    const saveGrade = () => {
        if (!selectedWorker || gradingIndex === null) return;

        const updatedEnrollments = [...selectedWorker.enrollments];
        updatedEnrollments[gradingIndex] = {
            ...updatedEnrollments[gradingIndex],
            status: tempStatus,
            grade: tempStatus === "Completed" ? tempGrade || "Pass" : null
        };

        const updatedWorker = { ...selectedWorker, enrollments: updatedEnrollments };

        setWorkers(prev => prev.map(w => w.id === selectedWorker.id ? updatedWorker : w));
        setSelectedWorker(updatedWorker);
        setGradingIndex(null);
    };

    return (
        <div className="space-y-10 font-sans">
            <div>
                <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                    Personnel & Workers Ledger
                </h1>
                <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                    Monitor structural deployments, access indices, and worker qualification training tracks
                </p>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 items-center justify-between bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                <div className="w-full xl:max-w-md relative">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8A817C]" />
                    <input
                        type="text"
                        placeholder="Search workers by name, email, or system token identifier..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="w-full h-11 pl-11 pr-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>

                <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#8A817C]" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Dept:</span>
                        <select
                            value={deptFilter}
                            onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
                            className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none min-w-[140px]"
                        >
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Status:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none min-w-[140px]"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="On Leave">On Leave</option>
                            <option value="Suspended">Suspended</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    <th
                                        onClick={() => handleSort("name")}
                                        className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212]"
                                    >
                                        <div className="flex items-center space-x-1.5">
                                            <span>Worker Identity</span>
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort("department")}
                                        className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212]"
                                    >
                                        <div className="flex items-center space-x-1.5">
                                            <span>Department</span>
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort("status")}
                                        className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212]"
                                    >
                                        <div className="flex items-center space-x-1.5">
                                            <span>Status</span>
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                {paginatedWorkers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                            No matching personnel logs registered in system matrices.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedWorkers.map((worker) => (
                                        <tr
                                            key={worker.id}
                                            className={`transition-colors cursor-pointer ${selectedWorker?.id === worker.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
                                            onClick={() => { setSelectedWorker(worker); setGradingIndex(null); }}
                                        >
                                            <td className="p-4">
                                                <div className="text-sm font-medium text-[#121212]">{worker.name}</div>
                                                <div className="text-xs text-[#8A817C] font-mono mt-0.5">{worker.email}</div>
                                            </td>
                                            <td className="p-4 text-xs font-light text-[#121212]">
                                                {worker.department}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${worker.status === "Active" ? "bg-green-100 text-green-800" :
                                                        worker.status === "On Leave" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                                                    }`}>
                                                    {worker.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => { setSelectedWorker(worker); setGradingIndex(null); }}
                                                    className="p-2 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 hover:border-[#121212] rounded-lg transition-colors"
                                                    title="Review profile layout"
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

                <div className="lg:col-span-5 h-[400px] overflow-auto">
                    {selectedWorker ? (
                        <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl space-y-8 relative">
                            <button
                                onClick={() => setSelectedWorker(null)}
                                className="absolute top-6 right-6 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">
                                    Personnel Record Details
                                </div>
                                <h2 className="text-xl font-light tracking-tight text-[#121212]">
                                    {selectedWorker.name}
                                </h2>
                                <p className="text-xs font-mono text-[#8A817C] mt-1">{selectedWorker.email}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-y border-[#121212]/5 py-4 font-mono text-xs">
                                <div>
                                    <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Deployment</span>
                                    <span className="text-[#121212]">{selectedWorker.department}</span>
                                </div>
                                <div>
                                    <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Enrollment Date</span>
                                    <span className="text-[#121212]">{selectedWorker.joinDate}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212] flex items-center space-x-2">
                                    <GraduationCap className="w-4 h-4 text-[#8A817C]" />
                                    <span>Enrollments</span>
                                </h3>

                                <div className="space-y-3">
                                    {selectedWorker.enrollments.map((enr, idx) => (
                                        <div
                                            key={enr.className}
                                            className="p-4 border border-[#121212]/10 rounded-lg bg-[#F4F1EA]/20 space-y-3"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="text-xs font-medium text-[#121212]">{enr.className}</div>
                                                    <div className="flex items-center space-x-2 mt-1.5">
                                                        <span className={`inline-flex items-center space-x-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${enr.status === "Completed" ? "bg-green-50 text-green-700 border border-green-200" :
                                                                enr.status === "Enrolled" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-gray-100 text-gray-600"
                                                            }`}>
                                                            {enr.status === "Completed" ? <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> : <AlertCircle className="w-2.5 h-2.5 mr-0.5" />}
                                                            {enr.status}
                                                        </span>
                                                        {enr.grade && (
                                                            <span className="text-[10px] font-mono text-[#8A817C]">
                                                                Evaluation Grade: <strong className="text-[#121212] font-semibold">{enr.grade}</strong>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {gradingIndex !== idx && (
                                                    <button
                                                        onClick={() => startGrading(idx, enr)}
                                                        className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-[#121212] text-white rounded-md hover:bg-[#121212]/90 transition-colors"
                                                    >
                                                        Grade / Update
                                                    </button>
                                                )}
                                            </div>

                                            {gradingIndex === idx && (
                                                <div className="pt-3 border-t border-[#121212]/5 space-y-3 animate-fadeIn">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-[9px] font-bold uppercase tracking-wider text-[#8A817C] mb-1">Status</label>
                                                            <select
                                                                value={tempStatus}
                                                                onChange={(e) => setTempStatus(e.target.value as any)}
                                                                className="w-full h-8 px-2 bg-white border border-[#121212]/10 text-xs focus:outline-none rounded"
                                                            >
                                                                <option value="Enrolled">Enrolled</option>
                                                                <option value="Completed">Completed</option>
                                                                <option value="Dropped">Dropped</option>
                                                            </select>
                                                        </div>

                                                        {tempStatus === "Completed" && (
                                                            <div>
                                                                <label className="block text-[9px] font-bold uppercase tracking-wider text-[#8A817C] mb-1">Grade / Score</label>
                                                                <input
                                                                    type="text"
                                                                    value={tempGrade}
                                                                    placeholder="e.g. A, B+, Pass"
                                                                    onChange={(e) => setTempGrade(e.target.value)}
                                                                    className="w-full h-8 px-2 bg-white border border-[#121212]/10 text-xs focus:outline-none rounded"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex justify-end space-x-1">
                                                        <button
                                                            onClick={() => setGradingIndex(null)}
                                                            className="text-[10px] font-semibold uppercase px-2 py-1 text-[#8A817C] hover:text-[#121212]"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={saveGrade}
                                                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-[#121212] text-white rounded"
                                                        >
                                                            Commit Change
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="border-2 border-dashed border-[#121212]/10 flex flex-col items-center justify-center text-center p-12 bg-[#FFFFFF] rounded-xl h-64">
                            <Users className="w-8 h-8 text-[#8A817C]/40 mb-3" />
                            <div className="text-xs uppercase tracking-wider font-semibold text-[#121212]">
                                No Profile Evaluated
                            </div>
                            <p className="text-xs text-[#8A817C] font-light max-w-xs mt-1">
                                Select an entry row element from the tracking index grid to display personnel metrics and academic grades.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
})