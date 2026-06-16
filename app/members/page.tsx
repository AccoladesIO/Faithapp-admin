"use client";

import React, { useState, useMemo } from "react";
import {
    User,
    Search,
    SlidersHorizontal,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    Eye,
    GraduationCap,
    X,
    CheckCircle2,
    AlertCircle,
    UserPlus,
    ShieldAlert
} from "lucide-react";

interface AcademyClass {
    className: "Believers Class" | "Baptismal Class" | "Workers in Training Class";
    status: "Not Enrolled" | "Enrolled" | "Completed" | "Dropped";
    grade?: string | null;
}

interface Member {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    membershipStatus: "Gold" | "Diamond" | "Platinum";
    joinDate: string;
    classes: AcademyClass[];
    isVolunteerWorker: boolean;
}

const INITIAL_MEMBERS: Member[] = [
    {
        id: "M-90214",
        name: "Efe Utomi",
        email: "efe.utomi@gmail.com",
        phoneNumber: "+234 803 111 2222",
        membershipStatus: "Gold",
        joinDate: "2024-03-10",
        isVolunteerWorker: false,
        classes: [
            { className: "Believers Class", status: "Completed", grade: "A" },
            { className: "Baptismal Class", status: "Completed", grade: "Pass" },
            { className: "Workers in Training Class", status: "Enrolled", grade: null }
        ]
    },
    {
        id: "M-44102",
        name: "Blessing Jackson",
        email: "b.jackson@yahoo.com",
        phoneNumber: "+234 816 333 4444",
        membershipStatus: "Diamond",
        joinDate: "2025-01-19",
        isVolunteerWorker: false,
        classes: [
            { className: "Believers Class", status: "Enrolled", grade: null },
            { className: "Baptismal Class", status: "Not Enrolled", grade: null },
            { className: "Workers in Training Class", status: "Not Enrolled", grade: null }
        ]
    },
    {
        id: "M-11209",
        name: "Tochukwu Okafor",
        email: "t.okafor@outlook.com",
        phoneNumber: "+234 705 555 6666",
        membershipStatus: "Platinum",
        joinDate: "2023-08-14",
        isVolunteerWorker: true,
        classes: [
            { className: "Believers Class", status: "Completed", grade: "A" },
            { className: "Baptismal Class", status: "Completed", grade: "Pass" },
            { className: "Workers in Training Class", status: "Completed", grade: "A" }
        ]
    },
    {
        id: "M-88301",
        name: "Yinka Balogun",
        email: "yinka.b@live.com",
        phoneNumber: "+234 902 777 8888",
        membershipStatus: "Gold",
        joinDate: "2025-05-02",
        isVolunteerWorker: false,
        classes: [
            { className: "Believers Class", status: "Not Enrolled", grade: null },
            { className: "Baptismal Class", status: "Not Enrolled", grade: null },
            { className: "Workers in Training Class", status: "Not Enrolled", grade: null }
        ]
    }
];

type SortKey = "name" | "membershipStatus" | "joinDate";
type SortOrder = "asc" | "desc";

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("All");
    const [volunteerFilter, setVolunteerFilter] = useState<string>("All");

    const [sortKey, setSortKey] = useState<SortKey>("name");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 4;

    const [volunteerError, setVolunteerError] = useState<string | null>(null);
    const [gradingClassName, setGradingClassName] = useState<string | null>(null);
    const [tempGrade, setTempGrade] = useState("");

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortOrder("asc");
        }
    };

    const filteredAndSortedMembers = useMemo(() => {
        let result = [...members];

        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (m) =>
                    m.name.toLowerCase().includes(query) ||
                    m.email.toLowerCase().includes(query) ||
                    m.id.toLowerCase().includes(query)
            );
        }

        if (statusFilter !== "All") {
            result = result.filter((m) => m.membershipStatus === statusFilter);
        }

        if (volunteerFilter !== "All") {
            const targetBool = volunteerFilter === "Volunteer";
            result = result.filter((m) => m.isVolunteerWorker === targetBool);
        }

        result.sort((a, b) => {
            let valA = a[sortKey].toLowerCase();
            let valB = b[sortKey].toLowerCase();
            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

        return result;
    }, [members, searchQuery, statusFilter, volunteerFilter, sortKey, sortOrder]);

    const paginatedMembers = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedMembers.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAndSortedMembers, currentPage]);

    const totalPages = Math.ceil(filteredAndSortedMembers.length / itemsPerPage);

    const handleClassStatusChange = (className: string, newStatus: any) => {
        if (!selectedMember) return;

        const updatedClasses = selectedMember.classes.map((c) => {
            if (c.className === className) {
                return {
                    ...c,
                    status: newStatus,
                    grade: newStatus === "Completed" ? c.grade || "Pass" : null
                };
            }
            return c;
        });

        const updatedMember = { ...selectedMember, classes: updatedClasses };

        setMembers((prev) => prev.map((m) => m.id === selectedMember.id ? updatedMember : m));
        setSelectedMember(updatedMember);
        setVolunteerError(null);

        if (newStatus === "Completed") {
            const targetClass = selectedMember.classes.find(c => c.className === className);
            setTempGrade(targetClass?.grade || "Pass");
            setGradingClassName(className);
        } else {
            if (gradingClassName === className) {
                setGradingClassName(null);
            }
        }
    };

    const saveGrade = () => {
        if (!selectedMember || !gradingClassName) return;

        const updatedClasses = selectedMember.classes.map((c) =>
            c.className === gradingClassName ? { ...c, grade: tempGrade || "Pass" } : c
        );

        const updatedMember = { ...selectedMember, classes: updatedClasses };

        setMembers((prev) => prev.map((m) => m.id === selectedMember.id ? updatedMember : m));
        setSelectedMember(updatedMember);
        setGradingClassName(null);
    };

    const promoteToVolunteer = () => {
        if (!selectedMember) return;

        const believersClass = selectedMember.classes.find((c) => c.className === "Believers Class");
        const hasEnrolledInBelievers = believersClass && (believersClass.status === "Enrolled" || believersClass.status === "Completed");

        if (!hasEnrolledInBelievers) {
            setVolunteerError("Access Restricted: Core foundational deployment requires active enrollment or completion within the Believers Class pipeline.");
            return;
        }

        const updatedMember: Member = { ...selectedMember, isVolunteerWorker: true };

        setMembers((prev) => prev.map((m) => m.id === selectedMember.id ? updatedMember : m));
        setSelectedMember(updatedMember);
        setVolunteerError(null);
    };

    return (
        <div className="space-y-10 font-sans">
            <div>
                <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                    Congregation & Membership Register
                </h1>
                <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                    Review member demographics, manage development program enrollments, and authorize worker promotions
                </p>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 items-center justify-between bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                <div className="w-full xl:max-w-md relative">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8A817C]" />
                    <input
                        type="text"
                        placeholder="Search congregation indices by name, email, or digital key..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="w-full h-11 pl-11 pr-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>

                <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#8A817C]" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Tier:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none min-w-[140px]"
                        >
                            <option value="All">All Tiers</option>
                            <option value="Gold">Gold</option>
                            <option value="Diamond">Diamond</option>
                            <option value="Platinum">Platinum</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Assignment:</span>
                        <select
                            value={volunteerFilter}
                            onChange={(e) => { setVolunteerFilter(e.target.value); setCurrentPage(1); }}
                            className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none min-w-[140px]"
                        >
                            <option value="All">All Personnel</option>
                            <option value="Volunteer">Volunteer Workers</option>
                            <option value="Standard">Standard Members</option>
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
                                            <span>Full Name</span>
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort("membershipStatus")}
                                        className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212]"
                                    >
                                        <div className="flex items-center space-x-1.5">
                                            <span>Status Tier</span>
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Deployment</th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                {paginatedMembers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                            No matching records configured in database indices.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedMembers.map((member) => (
                                        <tr
                                            key={member.id}
                                            className={`transition-colors cursor-pointer ${selectedMember?.id === member.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
                                            onClick={() => { setSelectedMember(member); setVolunteerError(null); setGradingClassName(null); }}
                                        >
                                            <td className="p-4">
                                                <div className="text-sm font-medium text-[#121212]">{member.name}</div>
                                                <div className="text-xs text-[#8A817C] font-mono mt-0.5">{member.email}</div>
                                            </td>
                                            <td className="p-4 text-xs">
                                                <span className="font-medium text-[#121212]">{member.membershipStatus}</span>
                                            </td>
                                            <td className="p-4">
                                                {member.isVolunteerWorker ? (
                                                    <span className="inline-block px-2 py-0.5 bg-[#EADCC9] text-[#121212] text-[9px] font-bold uppercase tracking-wider rounded">
                                                        Volunteer Worker
                                                    </span>
                                                ) : (
                                                    <span className="inline-block px-2 py-0.5 bg-[#F4F1EA] text-[#8A817C] text-[9px] font-semibold uppercase tracking-wider rounded border border-[#121212]/5">
                                                        Member
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => { setSelectedMember(member); setVolunteerError(null); setGradingClassName(null); }}
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

                <div className="lg:col-span-5 h-100 overflow-auto">
                    {selectedMember ? (
                        <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl space-y-6 relative">
                            <button
                                onClick={() => { setSelectedMember(null); setVolunteerError(null); setGradingClassName(null); }}
                                className="absolute top-6 right-6 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">
                                    Membership Details
                                </div>
                                <h2 className="text-xl font-light tracking-tight text-[#121212]">
                                    {selectedMember.name}
                                </h2>
                                <p className="text-xs font-mono text-[#8A817C] mt-1">{selectedMember.phoneNumber}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-y border-[#121212]/5 py-4 font-mono text-xs">
                                <div>
                                    <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Classification</span>
                                    <span className="text-[#121212]">{selectedMember.membershipStatus}</span>
                                </div>
                                <div>
                                    <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">System Entry Log</span>
                                    <span className="text-[#121212]">{selectedMember.joinDate}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212] flex items-center space-x-2">
                                    <GraduationCap className="w-4 h-4 text-[#8A817C]" />
                                    <span>Enrollments</span>
                                </h3>

                                <div className="space-y-3">
                                    {selectedMember.classes.map((cls) => (
                                        <div key={cls.className} className="p-3.5 border border-[#121212]/10 rounded-lg bg-[#F4F1EA]/10 flex flex-col space-y-3">
                                            <div className="flex items-center justify-between gap-4 w-full">
                                                <div>
                                                    <div className="text-xs font-medium text-[#121212]">{cls.className}</div>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider ${cls.status === "Completed" ? "text-green-700" :
                                                            cls.status === "Enrolled" ? "text-blue-700" : "text-[#8A817C]"
                                                            }`}>
                                                            {cls.status === "Completed" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                                                            {cls.status}
                                                        </span>
                                                        {cls.status === "Completed" && cls.grade && (
                                                            <span className="text-[10px] font-mono text-[#8A817C]">
                                                                Grade: <strong className="text-[#121212] font-semibold">{cls.grade}</strong>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-2">
                                                    {cls.status === "Completed" && gradingClassName !== cls.className && (
                                                        <button
                                                            onClick={() => {
                                                                setTempGrade(cls.grade || "Pass");
                                                                setGradingClassName(cls.className);
                                                            }}
                                                            className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-[#121212] text-white rounded hover:bg-[#121212]/90 transition-colors"
                                                        >
                                                            Grade
                                                        </button>
                                                    )}
                                                    <select
                                                        value={cls.status}
                                                        onChange={(e) => handleClassStatusChange(cls.className, e.target.value)}
                                                        className="h-8 px-2 bg-white border border-[#121212]/10 text-xs text-[#121212] focus:outline-none rounded-md"
                                                    >
                                                        <option value="Not Enrolled">Not Enrolled</option>
                                                        <option value="Enrolled">Enrolled</option>
                                                        <option value="Completed">Completed</option>
                                                        <option value="Dropped">Dropped</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {gradingClassName === cls.className && (
                                                <div className="pt-3 border-t border-[#121212]/5 flex items-end justify-between gap-3 animate-fadeIn w-full">
                                                    <div className="flex-1">
                                                        <label className="block text-[9px] font-bold uppercase tracking-wider text-[#8A817C] mb-1">Evaluation Score / Grade</label>
                                                        <input
                                                            type="text"
                                                            value={tempGrade}
                                                            placeholder="e.g. A, B+, Pass"
                                                            onChange={(e) => setTempGrade(e.target.value)}
                                                            className="w-full h-8 px-2 bg-white border border-[#121212]/10 text-xs focus:outline-none rounded"
                                                        />
                                                    </div>
                                                    <div className="flex space-x-1 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => setGradingClassName(null)}
                                                            className="text-[10px] font-semibold uppercase px-2 py-1 text-[#8A817C] hover:text-[#121212]"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={saveGrade}
                                                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-[#121212] text-white rounded"
                                                        >
                                                            Save
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {volunteerError && (
                                <div className="bg-[#fdfaf2] border border-dashed border-[#121212]/15 p-4 text-xs text-[#121212] font-light flex items-start space-x-2.5 rounded-lg animate-fadeIn">
                                    <ShieldAlert className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="block font-semibold uppercase tracking-wider text-[11px] mb-0.5">Enlistment Blocked</strong>
                                        {volunteerError}
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                {selectedMember.isVolunteerWorker ? (
                                    <div className="w-full h-11 bg-[#F4F1EA] text-[#8A817C] text-xs font-semibold uppercase tracking-widest flex items-center justify-center space-x-2 rounded-xl border border-[#121212]/5">
                                        <CheckCircle2 className="w-4 h-4 text-green-700" />
                                        <span>Authorized Volunteer Worker</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={promoteToVolunteer}
                                        className="w-full h-11 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors flex items-center justify-center space-x-2 rounded-xl"
                                    >
                                        <UserPlus className="w-3.5 h-3.5" />
                                        <span>Enlist as Volunteer Worker</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="border-2 border-dashed border-[#121212]/10 flex flex-col items-center justify-center text-center p-12 bg-[#FFFFFF] rounded-xl h-64">
                            <User className="w-8 h-8 text-[#8A817C]/40 mb-3" />
                            <div className="text-xs uppercase tracking-wider font-semibold text-[#121212]">
                                No Profile Evaluated
                            </div>
                            <p className="text-xs text-[#8A817C] font-light max-w-xs mt-1">
                                Select a member element from the table registry index grid to modify training metrics or execute structural recruitment sequences.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}