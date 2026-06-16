"use client";

import React, { useState, useMemo } from "react";
import {
    Network,
    Search,
    Plus,
    UserPlus,
    X,
    User,
    Briefcase,
    ShieldCheck,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Eye
} from "lucide-react";

interface DepartmentWorker {
    id: string;
    name: string;
    email: string;
    role: "HOD" | "Asst HOD" | "Worker";
}

interface Department {
    id: string;
    name: string;
    description: string;
    hodName: string;
    asstHodName: string;
    createdAt: string;
    workersCount: number;
}

const INITIAL_DEPARTMENTS: Department[] = [
    {
        id: "D-MEDIA",
        name: "Media & Tech",
        description: "Responsible for live streaming, sound reinforcement, digital asset optimization, and software systems tracking.",
        hodName: "Ayeni Jeremiah",
        asstHodName: "John Akunsuyi",
        createdAt: "2024-01-10",
        workersCount: 14
    },
    {
        id: "D-USHER",
        name: "Ushering",
        description: "Maintains sanctuary order, manages guest seating vectors, and controls crowd movement protocols during services.",
        hodName: "Chidi Obi",
        asstHodName: "Yinka Balogun",
        createdAt: "2024-01-12",
        workersCount: 22
    },
    {
        id: "D-KIDS",
        name: "Children's Church",
        description: "Oversees curriculum enforcement, classroom safety metrics, and child pickup authorization processes.",
        hodName: "Amara Nwosu",
        asstHodName: "Blessing Jackson",
        createdAt: "2024-01-15",
        workersCount: 18
    }
];

const AVAILABLE_WORKERS_POOL = [
    { id: "W-101", name: "Tunde Bakare", email: "t.bakare@discoverycentre.org" },
    { id: "W-102", name: "Funmi Oladele", email: "f.oladele@discoverycentre.org" },
    { id: "W-103", name: "Tochukwu Okafor", email: "t.okafor@discoverycentre.org" },
    { id: "W-104", name: "Efe Utomi", email: "e.utomi@discoverycentre.org" },
    { id: "W-105", name: "Blessing Jackson", email: "b.jackson@discoverycentre.org" },
    { id: "W-106", name: "Yinka Balogun", email: "yinka.b@discoverycentre.org" }
];

type SortKey = "name" | "workersCount" | "createdAt";
type SortOrder = "asc" | "desc";

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
    const [selectedDept, setSelectedDept] = useState<Department | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("name");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 4;

    const [deptName, setDeptName] = useState("");
    const [description, setDescription] = useState("");
    const [hodName, setHodName] = useState("");
    const [asstHodName, setAsstHodName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [selectedWorkerId, setSelectedWorkerId] = useState("");
    const [assignedRole, setAssignedRole] = useState<"HOD" | "Asst HOD" | "Worker">("Worker");
    const [isAssigning, setIsAssigning] = useState(false);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortOrder("asc");
        }
    };

    const filteredAndSortedDepts = useMemo(() => {
        let result = [...departments];

        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (d) =>
                    d.name.toLowerCase().includes(query) ||
                    d.hodName.toLowerCase().includes(query) ||
                    d.id.toLowerCase().includes(query)
            );
        }

        result.sort((a, b) => {
            let valA = typeof a[sortKey] === "string" ? (a[sortKey] as string).toLowerCase() : a[sortKey];
            let valB = typeof b[sortKey] === "string" ? (b[sortKey] as string).toLowerCase() : b[sortKey];

            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

        return result;
    }, [departments, searchQuery, sortKey, sortOrder]);

    const paginatedDepts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedDepts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAndSortedDepts, currentPage]);

    const totalPages = Math.ceil(filteredAndSortedDepts.length / itemsPerPage);

    const handleCreateDepartment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!deptName || !hodName) return;

        setIsSubmitting(true);

        const newDept: Department = {
            id: `D-${deptName.replace(/\s+/g, "").toUpperCase().slice(0, 8)}`,
            name: deptName,
            description: description || "No deployment notes configured for this unit entry.",
            hodName,
            asstHodName: asstHodName || "Unassigned",
            createdAt: new Date().toISOString().split("T")[0],
            workersCount: 1
        };

        setTimeout(() => {
            setDepartments((prev) => [newDept, ...prev]);
            setDeptName("");
            setDescription("");
            setHodName("");
            setAsstHodName("");
            setIsSubmitting(false);
        }, 400);
    };

    const handleAddWorkerToDept = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDept || !selectedWorkerId) return;

        setIsAssigning(true);
        const targetWorker = AVAILABLE_WORKERS_POOL.find(w => w.id === selectedWorkerId);

        if (targetWorker) {
            setDepartments((prev) =>
                prev.map((d) => {
                    if (d.id === selectedDept.id) {
                        return {
                            ...d,
                            workersCount: d.workersCount + 1,
                            hodName: assignedRole === "HOD" ? targetWorker.name : d.hodName,
                            asstHodName: assignedRole === "Asst HOD" ? targetWorker.name : d.asstHodName
                        };
                    }
                    return d;
                })
            );

            setSelectedDept((prev) => {
                if (!prev) return null;
                return {
                    ...prev,
                    workersCount: prev.workersCount + 1,
                    hodName: assignedRole === "HOD" ? targetWorker.name : prev.hodName,
                    asstHodName: assignedRole === "Asst HOD" ? targetWorker.name : prev.asstHodName
                };
            });
        }

        setTimeout(() => {
            setSelectedWorkerId("");
            setAssignedRole("Worker");
            setIsAssigning(false);
        }, 300);
    };

    return (
        <div className="space-y-10 font-sans">
            <div>
                <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                    Structural Department Directories
                </h1>
                <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                    Configure operations teams, assign management units, and manage workforce deployments
                </p>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 items-center justify-between bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                <div className="w-full xl:max-w-md relative">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8A817C]" />
                    <input
                        type="text"
                        placeholder="Search departments by code, identifier, or leadership tracking rows..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="w-full h-11 pl-11 pr-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] mb-6 flex items-center space-x-2">
                        <Plus className="w-4 h-4 text-[#8A817C]" />
                        <span>Create Department</span>
                    </h2>

                    <form onSubmit={handleCreateDepartment} className="space-y-5">
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Department Name
                            </label>
                            <input
                                type="text"
                                required
                                value={deptName}
                                onChange={(e) => setDeptName(e.target.value)}
                                placeholder="e.g., Usable Space Logistics"
                                className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Operational Mandate Description
                            </label>
                            <textarea
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Detail core operational responsibilities..."
                                className="w-full p-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none block"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 border-t border-[#121212]/5 pt-4">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Head of Department (HOD)
                                </label>
                                <select
                                    required
                                    value={hodName}
                                    onChange={(e) => setHodName(e.target.value)}
                                    className="w-full h-11 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                >
                                    <option value="">-- Assign Master HOD --</option>
                                    {AVAILABLE_WORKERS_POOL.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Assistant HOD
                                </label>
                                <select
                                    value={asstHodName}
                                    onChange={(e) => setAsstHodName(e.target.value)}
                                    className="w-full h-11 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                >
                                    <option value="">-- Assign Deputy Assistant --</option>
                                    {AVAILABLE_WORKERS_POOL.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 rounded-xl mt-6"
                        >
                            <span>{isSubmitting ? "Generating Structural Node..." : "Initialize Department"}</span>
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    <th
                                        onClick={() => handleSort("name")}
                                        className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212]"
                                    >
                                        <div className="flex items-center space-x-1.5">
                                            <span>Department Name</span>
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Leadership Matrix</th>
                                    <th
                                        onClick={() => handleSort("workersCount")}
                                        className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212]"
                                    >
                                        <div className="flex items-center space-x-1.5">
                                            <span>Staff Index</span>
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                {paginatedDepts.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                            No operational departments indexed within core systems layout.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedDepts.map((dept) => (
                                        <tr
                                            key={dept.id}
                                            className={`transition-colors cursor-pointer ${selectedDept?.id === dept.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
                                            onClick={() => { setSelectedDept(dept); }}
                                        >
                                            <td className="p-4">
                                                <div className="text-sm font-medium text-[#121212]">{dept.name}</div>
                                                {/* <div className="text-xs text-[#8A817C] font-mono mt-0.5">{dept.id} &bull; Registered: {dept.createdAt}</div> */}
                                            </td>
                                            <td className="p-4 text-xs font-mono text-[#121212] space-y-1">
                                                <div>
                                                    <span className="text-[#8A817C] font-semibold uppercase text-[9px] tracking-wider inline-block w-16">HOD:</span>
                                                    {dept.hodName}
                                                </div>
                                                <div>
                                                    <span className="text-[#8A817C] font-semibold uppercase text-[9px] tracking-wider inline-block w-16">Asst HOD:</span>
                                                    {dept.asstHodName}
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm font-light font-mono text-[#121212]">
                                                {dept.workersCount} personnel
                                            </td>
                                            <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => { setSelectedDept(dept); }}
                                                    className="p-2 text-[#8A817C] hover:text-[#121212] border border-[#121212]/10 hover:border-[#121212] rounded-lg transition-colors"
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
            </div>

            {selectedDept && (
                <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative animate-fadeIn">
                    <button
                        onClick={() => setSelectedDept(null)}
                        className="absolute top-6 right-6 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="lg:col-span-7 space-y-6">
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">
                                Operational Framework Spec
                            </div>
                            <h2 className="text-xl font-light tracking-tight text-[#121212]">
                                {selectedDept.name} &mdash; Details
                            </h2>
                            <p className="text-xs text-[#121212]/80 font-light leading-relaxed mt-3 bg-[#F4F1EA]/30 p-4 border border-[#121212]/5 rounded-lg">
                                {selectedDept.description}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 font-mono text-xs border-t border-[#121212]/5 pt-6">
                            <div className="p-4 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-lg flex items-start space-x-3">
                                <ShieldCheck className="w-4 h-4 text-[#8A817C] mt-0.5 shrink-0" />
                                <div>
                                    <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Head of Unit</span>
                                    <span className="text-[#121212] font-medium">{selectedDept.hodName}</span>
                                </div>
                            </div>
                            <div className="p-4 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-lg flex items-start space-x-3">
                                <Briefcase className="w-4 h-4 text-[#8A817C] mt-0.5 shrink-0" />
                                <div>
                                    <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Assistant Unit Head</span>
                                    <span className="text-[#121212] font-medium">{selectedDept.asstHodName}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5 bg-[#F4F1EA]/20 border border-[#121212]/10 p-6 rounded-xl space-y-6">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212] flex items-center space-x-2">
                            <UserPlus className="w-4 h-4 text-[#8A817C]" />
                            <span>Deploy Personnel to Unit</span>
                        </h3>

                        <form onSubmit={handleAddWorkerToDept} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                    Select Worker from Register
                                </label>
                                <select
                                    required
                                    value={selectedWorkerId}
                                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                                    className="w-full h-10 px-3 bg-white border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-lg"
                                >
                                    <option value="">-- Select target resource --</option>
                                    {AVAILABLE_WORKERS_POOL.map(w => (
                                        <option key={w.id} value={w.id}>
                                            {w.name} ({w.id})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                    Assign Operational Role Rank
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["Worker", "Asst HOD", "HOD"] as const).map((role) => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => setAssignedRole(role)}
                                            className={`h-9 text-[11px] font-semibold uppercase tracking-wider border rounded-md transition-colors ${assignedRole === role
                                                    ? "bg-[#121212] text-white border-[#121212]"
                                                    : "bg-white text-[#8A817C] border-[#121212]/10 hover:text-[#121212]"
                                                }`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isAssigning || !selectedWorkerId}
                                className="w-full h-10 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-40 flex items-center justify-center space-x-2 rounded-lg pt-1"
                            >
                                <span>{isAssigning ? "Updating Matrix Nodes..." : "Authorize Deployment"}</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}