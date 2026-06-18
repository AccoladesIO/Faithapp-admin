"use client";

import React, { useState, useMemo } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import {
    Boxes,
    Search,
    Plus,
    SlidersHorizontal,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Eye,
    X,
    PackagePlus,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    FileSpreadsheet,
    RefreshCw
} from "lucide-react";

interface InventoryItem {
    id: string;
    name: string;
    category: "Electronics" | "Furniture" | "Musical Instruments" | "Sanctuary Assets" | "Books & Media";
    quantity: number;
    minRequired: number;
    status: "In Stock" | "Low Stock" | "Out of Stock";
    locationStorage: string;
    lastAuditedDate: string;
    condition: "Excellent" | "Good" | "Needs Repair" | "Deprecated";
    notes: string;
}

const INITIAL_INVENTORY: InventoryItem[] = [
    {
        id: "INV-88301",
        name: "Behringer X32 Digital Mixer",
        category: "Electronics",
        quantity: 1,
        minRequired: 1,
        status: "In Stock",
        locationStorage: "Main Auditorium Control Booth",
        lastAuditedDate: "2026-05-20",
        condition: "Excellent",
        notes: "Primary audio route mixer console. Firmware patches tracked up to date."
    },
    {
        id: "INV-44102",
        name: "Yamaha Custom Acoustic Drum Kit",
        category: "Musical Instruments",
        quantity: 1,
        minRequired: 1,
        status: "In Stock",
        locationStorage: "Main Sanctuary Altar Stage",
        lastAuditedDate: "2026-05-18",
        condition: "Good",
        notes: "Snare mesh replaced during Q2 maintenance cycles."
    },
    {
        id: "INV-11920",
        name: "Plastic Stackable Chairs (Blue)",
        category: "Furniture",
        quantity: 450,
        minRequired: 500,
        status: "Low Stock",
        locationStorage: "Overflow Storage Bay B",
        lastAuditedDate: "2026-06-01",
        condition: "Good",
        notes: "50 units decommissioned due to structural stress fractures. Replacement log required."
    },
    {
        id: "INV-33401",
        name: "Wireless Handheld Microphones (Shure)",
        category: "Electronics",
        quantity: 0,
        minRequired: 4,
        status: "Out of Stock",
        locationStorage: "Technical Locker Alpha",
        lastAuditedDate: "2026-06-10",
        condition: "Needs Repair",
        notes: "Sent to specialized service agent for frequency board realignments."
    },
    {
        id: "INV-90214",
        name: "Discovery Hub Training Manuals",
        category: "Books & Media",
        quantity: 85,
        minRequired: 20,
        status: "In Stock",
        locationStorage: "Administration Resource Office",
        lastAuditedDate: "2026-06-15",
        condition: "Excellent",
        notes: "Fresh print batch for incoming Workers in Training classes."
    }
];

type SortKey = "name" | "quantity" | "status" | "category";
type SortOrder = "asc" | "desc";

export default withAuth(function InventoriesPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("All");
    const [statusFilter, setStatusFilter] = useState<string>("All");

    const [sortKey, setSortKey] = useState<SortKey>("name");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const [name, setName] = useState("");
    const [category, setCategory] = useState<InventoryItem["category"]>("Electronics");
    const [quantity, setQuantity] = useState("");
    const [minRequired, setMinRequired] = useState("");
    const [locationStorage, setLocationStorage] = useState("");
    const [condition, setCondition] = useState<InventoryItem["condition"]>("Excellent");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [tempQty, setTempQty] = useState("");
    const [isUpdatingStock, setIsUpdatingStock] = useState(false);

    const stats = useMemo(() => {
        let totalItems = inventory.length;
        let lowStock = inventory.filter(i => i.status === "Low Stock").length;
        let outOfStock = inventory.filter(i => i.status === "Out of Stock").length;
        return { totalItems, lowStock, outOfStock };
    }, [inventory]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortOrder("asc");
        }
    };

    const filteredAndSortedInventory = useMemo(() => {
        let result = [...inventory];

        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (i) =>
                    i.name.toLowerCase().includes(query) ||
                    i.id.toLowerCase().includes(query) ||
                    i.locationStorage.toLowerCase().includes(query)
            );
        }

        if (categoryFilter !== "All") {
            result = result.filter((i) => i.category === categoryFilter);
        }

        if (statusFilter !== "All") {
            result = result.filter((i) => i.status === statusFilter);
        }

        result.sort((a, b) => {
            if (sortKey === "quantity") {
                return sortOrder === "asc" ? a.quantity - b.quantity : b.quantity - a.quantity;
            }
            let valA = a[sortKey].toLowerCase();
            let valB = b[sortKey].toLowerCase();
            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

        return result;
    }, [inventory, searchQuery, categoryFilter, statusFilter, sortKey, sortOrder]);

    const paginatedInventory = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedInventory.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAndSortedInventory, currentPage]);

    const totalPages = Math.ceil(filteredAndSortedInventory.length / itemsPerPage);

    const determineStatus = (qty: number, min: number): InventoryItem["status"] => {
        if (qty === 0) return "Out of Stock";
        if (qty <= min) return "Low Stock";
        return "In Stock";
    };

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        const qtyParsed = parseInt(quantity);
        const minParsed = parseInt(minRequired);
        if (!name || isNaN(qtyParsed) || isNaN(minParsed) || !locationStorage) return;

        setIsSubmitting(true);

        const newItem: InventoryItem = {
            id: `INV-${Math.floor(10000 + Math.random() * 90000)}`,
            name,
            category,
            quantity: qtyParsed,
            minRequired: minParsed,
            status: determineStatus(qtyParsed, minParsed),
            locationStorage,
            lastAuditedDate: new Date().toISOString().split("T")[0],
            condition,
            notes: notes || "Initial asset provisioning log entry."
        };

        setTimeout(() => {
            setInventory((prev) => [newItem, ...prev]);
            setName("");
            setQuantity("");
            setMinRequired("");
            setLocationStorage("");
            setNotes("");
            setIsSubmitting(false);
        }, 400);
    };

    const handleModifyStock = () => {
        if (!selectedItem || tempQty === "") return;
        const nextQty = parseInt(tempQty);
        if (isNaN(nextQty) || nextQty < 0) return;

        setIsUpdatingStock(true);

        const updatedItem: InventoryItem = {
            ...selectedItem,
            quantity: nextQty,
            status: determineStatus(nextQty, selectedItem.minRequired),
            lastAuditedDate: new Date().toISOString().split("T")[0]
        };

        setTimeout(() => {
            setInventory(prev => prev.map(i => i.id === selectedItem.id ? updatedItem : i));
            setSelectedItem(updatedItem);
            setTempQty("");
            setIsUpdatingStock(false);
        }, 300);
    };

    return (
        <div className="space-y-10 font-sans">
            <div>
                <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                    Asset & Material Inventory
                </h1>
                <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                    Track property placement matrices, manage resource quantities, and enforce audit checkpoints
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">Indexed Asset Types</div>
                    <div className="text-2xl font-light text-[#121212] mt-2 font-mono">{stats.totalItems} SKUs</div>
                </div>
                <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] flex items-center space-x-1.5 text-yellow-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Low Stock</span>
                    </div>
                    <div className="text-2xl font-light text-yellow-700 mt-2 font-mono">{stats.lowStock} Items</div>
                </div>
                <div className="bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] flex items-center space-x-1.5 text-red-700">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Critical Deficit</span>
                    </div>
                    <div className="text-2xl font-light text-red-700 mt-2 font-mono">{stats.outOfStock} Depleted</div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 items-center justify-between bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                <div className="w-full xl:max-w-md relative">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8A817C]" />
                    <input
                        type="text"
                        placeholder="Search material assets by name, SKU ID code, or storage quadrant location..."
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
                            value={categoryFilter}
                            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                            className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none min-w-[140px]"
                        >
                            <option value="All">All Categories</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Furniture">Furniture</option>
                            <option value="Musical Instruments">Musical Instruments</option>
                            <option value="Sanctuary Assets">Sanctuary Assets</option>
                            <option value="Books & Media">Books & Media</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Availability:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none min-w-[140px]"
                        >
                            <option value="All">All Levels</option>
                            <option value="In Stock">In Stock</option>
                            <option value="Low Stock">Low Stock</option>
                            <option value="Out of Stock">Out of Stock</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#121212]/10 p-8 rounded-xl">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] mb-6 flex items-center space-x-2">
                        <Plus className="w-4 h-4 text-[#8A817C]" />
                        <span>Provision Material Asset</span>
                    </h2>

                    <form onSubmit={handleAddItem} className="space-y-5">
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Asset Descriptor Name
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., HD PTZ Camera Node"
                                className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Category Classification
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value as any)}
                                    className="w-full h-11 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                >
                                    <option value="Electronics">Electronics</option>
                                    <option value="Furniture">Furniture</option>
                                    <option value="Musical Instruments">Musical Instruments</option>
                                    <option value="Sanctuary Assets">Sanctuary Assets</option>
                                    <option value="Books & Media">Books & Media</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Condition Rating
                                </label>
                                <select
                                    value={condition}
                                    onChange={(e) => setCondition(e.target.value as any)}
                                    className="w-full h-11 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                >
                                    <option value="Excellent">Excellent</option>
                                    <option value="Good">Good</option>
                                    <option value="Needs Repair">Needs Repair</option>
                                    <option value="Deprecated">Deprecated</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Initial Qty Count
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="0"
                                    className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Min Threshold Limit
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={minRequired}
                                    onChange={(e) => setMinRequired(e.target.value)}
                                    placeholder="1"
                                    className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Storage Quadrant / Location Securement
                            </label>
                            <input
                                type="text"
                                required
                                value={locationStorage}
                                onChange={(e) => setLocationStorage(e.target.value)}
                                placeholder="e.g., Media Studio Rack Compartment C"
                                className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Technical Asset Log Notes
                            </label>
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add serial token numbers, vendor metadata, or warranty profiles..."
                                className="w-full p-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none block"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 rounded-xl mt-6"
                        >
                            <span>{isSubmitting ? "Registering Sku Vector..." : "Commit Asset Node"}</span>
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
                                            <span>Asset Matrix</span>
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort("category")}
                                        className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212]"
                                    >
                                        <div className="flex items-center space-x-1.5">
                                            <span>Classification</span>
                                            <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort("quantity")}
                                        className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] cursor-pointer hover:text-[#121212]"
                                    >
                                        <div className="flex items-center space-x-1.5">
                                            <span>Inventory Level</span>
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
                                {paginatedInventory.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-xs text-[#8A817C] font-light">
                                            No materials or logistical equipment nodes register tracking coordinates.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedInventory.map((item) => (
                                        <tr
                                            key={item.id}
                                            className={`transition-colors cursor-pointer ${selectedItem?.id === item.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
                                            onClick={() => { setSelectedItem(item); setTempQty(""); }}
                                        >
                                            <td className="p-4">
                                                <div className="text-sm font-medium text-[#121212]">{item.name}</div>
                                                <div className="text-xs text-[#8A817C] font-mono mt-0.5">Check: {item.lastAuditedDate}</div>
                                            </td>
                                            <td className="p-4 text-xs font-light text-[#121212]">
                                                {item.category}
                                            </td>
                                            <td className="p-4 font-mono text-xs text-[#121212]">
                                                <span className="font-semibold">{item.quantity}</span>
                                                <span className="text-[#8A817C] text-[10px] ml-1">/ limit: {item.minRequired}</span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${item.status === "In Stock" ? "bg-green-100 text-green-800" :
                                                    item.status === "Low Stock" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => { setSelectedItem(item); setTempQty(""); }}
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

            {selectedItem && (
                <div className="bg-[#FFFFFF] border border-[#121212]/10 p-8 rounded-xl relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn">
                    <button
                        onClick={() => setSelectedItem(null)}
                        className="absolute top-6 right-6 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/10 rounded-md"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="lg:col-span-7 space-y-6">
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">
                                Material Component Index File: {selectedItem.id}
                            </div>
                            <h2 className="text-xl font-light tracking-tight text-[#121212]">
                                {selectedItem.name}
                            </h2>
                            <div className="flex items-center space-x-3 mt-3">
                                <span className="px-2 py-0.5 bg-[#F4F1EA] text-[#121212] text-[10px] font-bold uppercase tracking-wider rounded border border-[#121212]/5">
                                    Class: {selectedItem.category}
                                </span>
                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${selectedItem.condition === "Excellent" || selectedItem.condition === "Good"
                                    ? "bg-green-50 text-green-700 border border-green-100"
                                    : "bg-red-50 text-red-700 border border-red-100"
                                    }`}>
                                    Condition: {selectedItem.condition}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-y border-[#121212]/5 py-6 font-mono text-xs">
                            <div>
                                <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Storage Vault Site</span>
                                <span className="text-[#121212] font-medium leading-tight block">{selectedItem.locationStorage}</span>
                            </div>
                            <div>
                                <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Last Verification</span>
                                <span className="text-[#121212] block">{selectedItem.lastAuditedDate}</span>
                            </div>
                            <div>
                                <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest mb-1">Available Units</span>
                                <span className="text-sm font-semibold text-[#121212] block">{selectedItem.quantity} <span className="text-xs text-[#8A817C] font-normal">in stock</span></span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-[#8A817C] block text-[10px] font-semibold uppercase tracking-widest">Administrative Audit Registry Notes</span>
                            <p className="text-xs text-[#121212]/90 font-light leading-relaxed bg-[#F4F1EA]/30 p-4 border border-[#121212]/5 rounded-lg max-w-2xl">
                                {selectedItem.notes}
                            </p>
                        </div>
                    </div>

                    <div className="lg:col-span-5 bg-[#F4F1EA]/20 border border-[#121212]/10 p-6 rounded-xl space-y-5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212] flex items-center space-x-2">
                            <PackagePlus className="w-4 h-4 text-[#8A817C]" />
                            <span>Perform Stock Balance Re-Audit</span>
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                    Actual Quantified Unit Count
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={tempQty}
                                    onChange={(e) => setTempQty(e.target.value)}
                                    placeholder={`Current volume level: ${selectedItem.quantity}`}
                                    className="w-full h-10 px-3 bg-white border border-[#121212]/10 text-xs font-mono text-[#121212] focus:outline-none rounded-lg"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleModifyStock}
                                disabled={isUpdatingStock || tempQty === ""}
                                className="w-full h-10 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-40 flex items-center justify-center space-x-2 rounded-lg pt-0.5"
                            >
                                <RefreshCw className={`w-3 h-3 ${isUpdatingStock ? "animate-spin" : ""}`} />
                                <span>{isUpdatingStock ? "Updating Matrix Nodes..." : "Commit Inventory Variance"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
})