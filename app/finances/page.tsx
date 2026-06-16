"use client";

import React, { useState, useMemo } from "react";
import {
    Wallet,
    Search,
    Plus,
    SlidersHorizontal,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Eye,
    X,
    CheckCircle2,
    AlertCircle,
    XCircle,
    FileCheck,
    TrendingUp,
    Banknote
} from "lucide-react";

interface FinancialRecord {
    id: string;
    type: "Tithe" | "Offering" | "Donation";
    sourceName: string;
    amount: number;
    date: string;
    paymentMethod: "Bank Transfer" | "Cash" | "POS" | "Online Portal";
    status: "Confirmed" | "Pending Review" | "Declined";
    referenceOrNote: string;
}

const INITIAL_FINANCES: FinancialRecord[] = [
    {
        id: "TX-94021",
        type: "Tithe",
        sourceName: "Oluwaseun Adebayo",
        amount: 45000,
        date: "2026-06-14",
        paymentMethod: "Online Portal",
        status: "Confirmed",
        referenceOrNote: "Proof verified automatically via gateway callback matrix."
    },
    {
        id: "TX-11842",
        type: "Offering",
        sourceName: "Sunday Main Service",
        amount: 185200,
        date: "2026-06-14",
        paymentMethod: "Cash",
        status: "Confirmed",
        referenceOrNote: "Vault count completed by auditing unit floor stewards."
    },
    {
        id: "TX-88391",
        type: "Tithe",
        sourceName: "Efe Utomi",
        amount: 60000,
        date: "2026-06-12",
        paymentMethod: "Bank Transfer",
        status: "Pending Review",
        referenceOrNote: "Ref ID: #74920. Awaiting matching bank ledger confirmation."
    },
    {
        id: "TX-55402",
        type: "Donation",
        sourceName: "Anonymous Partner",
        amount: 500000,
        date: "2026-06-10",
        paymentMethod: "Bank Transfer",
        status: "Confirmed",
        referenceOrNote: "Sanctuary building expansion project infrastructure fund."
    },
    {
        id: "TX-22910",
        type: "Tithe",
        sourceName: "Yinka Balogun",
        amount: 25000,
        date: "2026-06-08",
        paymentMethod: "Online Portal",
        status: "Declined",
        referenceOrNote: "Transaction failed. Insufficient funds ledger bounce record."
    }
];

type SortKey = "date" | "amount" | "type" | "status";
type SortOrder = "asc" | "desc";

export default function FinancesPage() {
    const [records, setRecords] = useState<FinancialRecord[]>(INITIAL_FINANCES);
    const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("All");
    const [statusFilter, setStatusFilter] = useState<string>("All");

    const [sortKey, setSortKey] = useState<SortKey>("date");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const [entryType, setEntryType] = useState<"Tithe" | "Offering" | "Donation">("Tithe");
    const [sourceName, setSourceName] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"Bank Transfer" | "Cash" | "POS" | "Online Portal">("Bank Transfer");
    const [referenceOrNote, setReferenceOrNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const stats = useMemo(() => {
        let tithes = 0;
        let offerings = 0;
        let donations = 0;

        records.forEach(r => {
            if (r.status === "Confirmed") {
                if (r.type === "Tithe") tithes += r.amount;
                if (r.type === "Offering") offerings += r.amount;
                if (r.type === "Donation") donations += r.amount;
            }
        });

        return { tithes, offerings, donations, total: tithes + offerings + donations };
    }, [records]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortOrder("asc");
        }
    };

    const filteredAndSortedRecords = useMemo(() => {
        let result = [...records];

        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (r) =>
                    r.sourceName.toLowerCase().includes(query) ||
                    r.id.toLowerCase().includes(query) ||
                    r.referenceOrNote.toLowerCase().includes(query)
            );
        }

        if (typeFilter !== "All") {
            result = result.filter((r) => r.type === typeFilter);
        }

        if (statusFilter !== "All") {
            result = result.filter((r) => r.status === statusFilter);
        }

        result.sort((a, b) => {
            if (sortKey === "amount") {
                return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount;
            }
            let valA = a[sortKey].toLowerCase();
            let valB = b[sortKey].toLowerCase();
            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

        return result;
    }, [records, searchQuery, typeFilter, statusFilter, sortKey, sortOrder]);

    const paginatedRecords = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedRecords.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAndSortedRecords, currentPage]);

    const totalPages = Math.ceil(filteredAndSortedRecords.length / itemsPerPage);

    const handleManualEntry = (e: React.FormEvent) => {
        e.preventDefault();
        const parsedAmount = parseFloat(amount);
        if (!sourceName || isNaN(parsedAmount) || parsedAmount <= 0 || !date) return;

        setIsSubmitting(true);

        const newRecord: FinancialRecord = {
            id: `TX-${Math.floor(10000 + Math.random() * 90000)}`,
            type: entryType,
            sourceName,
            amount: parsedAmount,
            date,
            paymentMethod,
            status: "Confirmed",
            referenceOrNote: referenceOrNote || "Manual entries committed via administration vault terminal."
        };

        setTimeout(() => {
            setRecords((prev) => [newRecord, ...prev]);
            setSourceName("");
            setAmount("");
            setDate("");
            setReferenceOrNote("");
            setIsSubmitting(false);
        }, 400);
    };

    const updateStatus = (targetId: string, nextStatus: "Confirmed" | "Declined") => {
        setRecords(prev => prev.map(r => r.id === targetId ? { ...r, status: nextStatus } : r));
        setSelectedRecord(prev => prev && prev.id === targetId ? { ...prev, status: nextStatus } : prev);
    };

    return (
        <div className="space-y-10 font-sans">
            <div>
                <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                    Treasury & Financial Ledger
                </h1>
                <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                    Review automated processing data streams, parse asset distributions, and clear funding logs
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] flex items-center space-x-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Aggregate Vault Fills</span>
                    </div>
                    <div className="text-2xl font-light text-[#121212] mt-2 font-mono">₦{stats.total.toLocaleString()}</div>
                </div>
                <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Tithe Postings</div>
                    <div className="text-xl font-light text-[#121212] mt-2 font-mono">₦{stats.tithes.toLocaleString()}</div>
                </div>
                <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Offering Postings</div>
                    <div className="text-xl font-light text-[#121212] mt-2 font-mono">₦{stats.offerings.toLocaleString()}</div>
                </div>
                <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Donation Matrix</div>
                    <div className="text-xl font-light text-[#121212] mt-2 font-mono">₦{stats.donations.toLocaleString()}</div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 items-center justify-between bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                <div className="w-full xl:max-w-md relative">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8A817C]" />
                    <input
                        type="text"
                        placeholder="Search transactions by contributor name, ID token, or reference code..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="w-full h-11 pl-11 pr-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>

                <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#8A817C]" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Category:</span>
                        <select
                            value={typeFilter}
                            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                            className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none min-w-[130px]"
                        >
                            <option value="All">All Streams</option>
                            <option value="Tithe">Tithe</option>
                            <option value="Offering">Offering</option>
                            <option value="Donation">Donation</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Clearing:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none min-w-[130px]"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Pending Review">Pending Review</option>
                            <option value="Declined">Declined</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#121212]/10 p-8 rounded-xl">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] mb-6 flex items-center space-x-2">
                        <Plus className="w-4 h-4 text-[#8A817C]" />
                        <span>Manual Entry Vault</span>
                    </h2>

                    <form onSubmit={handleManualEntry} className="space-y-5">
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Posting Allocation Asset Type
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {(["Tithe", "Offering", "Donation"] as const).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setEntryType(t)}
                                        className={`h-9 text-[11px] font-semibold uppercase tracking-wider border rounded-md transition-colors ${entryType === t
                                                ? "bg-[#121212] text-white border-[#121212]"
                                                : "bg-white text-[#8A817C] border-[#121212]/10 hover:text-[#121212]"
                                            }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Source Entity / Contributor Name
                            </label>
                            <input
                                type="text"
                                required
                                value={sourceName}
                                onChange={(e) => setSourceName(e.target.value)}
                                placeholder="e.g., Jane Doe or Sunday Mid Service"
                                className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Amount (NGN)
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="₦ 0.00"
                                    className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Value Date
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Deposit Settlement Vector
                            </label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value as any)}
                                className="w-full h-11 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                            >
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Cash">Cash Deposit</option>
                                <option value="POS">POS Terminal</option>
                                <option value="Online Portal">Online Portal Payment</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Audit Log Notes
                            </label>
                            <textarea
                                rows={2}
                                value={referenceOrNote}
                                onChange={(e) => setReferenceOrNote(e.target.value)}
                                placeholder="Append physical receipt manifest references or partner project metadata notes..."
                                className="w-full p-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none block"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 rounded-xl mt-6"
                        >
                            <span>{isSubmitting ? "Committing Asset Records..." : "Authorize Vault Deposit"}</span>
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                    <th
                                        onClick={() => handleSort("date")}
                                        className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212]"
                                    >
                                        <div className="flex items-center space-x-1.5">
                                            <span>Value Date</span>
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort("type")}
                                        className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212]"
                                    >
                                        <div className="flex items-center space-x-1.5">
                                            <span>Asset Allocation</span>
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Source Matrix</th>
                                    <th
                                        onClick={() => handleSort("amount")}
                                        className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212]"
                                    >
                                        <div className="flex items-center space-x-1.5">
                                            <span>Amount</span>
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
                                {paginatedRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                            No matching operational accounting lines logged within current criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedRecords.map((record) => (
                                        <tr
                                            key={record.id}
                                            className={`transition-colors cursor-pointer ${selectedRecord?.id === record.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
                                            onClick={() => { setSelectedRecord(record); }}
                                        >
                                            <td className="p-4 font-mono text-xs font-light text-[#121212]">
                                                {record.date}
                                            </td>
                                            <td className="p-4 text-xs font-medium text-[#121212]">
                                                {record.type}
                                            </td>
                                            <td className="p-4">
                                                <div className="text-xs font-medium text-[#121212]">{record.sourceName}</div>
                                                <div className="text-[10px] text-[#8A817C] font-mono mt-0.5">{record.paymentMethod}</div>
                                            </td>
                                            <td className="p-4 font-mono text-xs font-medium text-[#121212]">
                                                ₦{record.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${record.status === "Confirmed" ? "bg-green-100 text-green-800" :
                                                        record.status === "Pending Review" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                                                    }`}>
                                                    {record.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => { setSelectedRecord(record); }}
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

            {selectedRecord && (
                <div className="bg-[#FFFFFF] border border-[#121212]/10 p-8 rounded-xl relative flex flex-col space-y-6 animate-fadeIn">
                    <button
                        onClick={() => setSelectedRecord(null)}
                        className="absolute top-6 right-6 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">
                            Audit Entry Token Node: {selectedRecord.id}
                        </div>
                        <h2 className="text-xl font-light tracking-tight text-[#121212]">
                            ₦{selectedRecord.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} &mdash; {selectedRecord.type} Allocation
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-y border-[#121212]/5 py-6 font-mono text-xs">
                        <div>
                            <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Origin entity</span>
                            <span className="text-[#121212] font-medium">{selectedRecord.sourceName}</span>
                        </div>
                        <div>
                            <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Value date</span>
                            <span className="text-[#121212]">{selectedRecord.date}</span>
                        </div>
                        <div>
                            <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Settlement node</span>
                            <span className="text-[#121212]">{selectedRecord.paymentMethod}</span>
                        </div>
                        <div>
                            <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Clearing validation</span>
                            <span className={`font-semibold uppercase text-[10px] ${selectedRecord.status === "Confirmed" ? "text-green-700" :
                                    selectedRecord.status === "Pending Review" ? "text-yellow-700" : "text-red-700"
                                }`}>{selectedRecord.status}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest">Metadata Reference Trace Record</span>
                        <p className="text-xs text-[#121212]/90 font-light leading-relaxed bg-[#F4F1EA]/30 p-4 border border-[#121212]/5 rounded-lg max-w-3xl">
                            {selectedRecord.referenceOrNote}
                        </p>
                    </div>

                    {selectedRecord.status === "Pending Review" && (
                        <div className="flex items-center space-x-3 pt-2">
                            <button
                                onClick={() => updateStatus(selectedRecord.id, "Confirmed")}
                                className="h-10 px-4 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors rounded-xl flex items-center space-x-2"
                            >
                                <FileCheck className="w-3.5 h-3.5" />
                                <span>Confirm Payment Verification</span>
                            </button>
                            <button
                                onClick={() => updateStatus(selectedRecord.id, "Declined")}
                                className="h-10 px-4 bg-white text-red-700 border border-red-200 text-xs font-semibold uppercase tracking-widest hover:bg-red-50 transition-colors rounded-xl flex items-center space-x-2"
                            >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject Entry Post</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}