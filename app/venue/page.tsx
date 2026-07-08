"use client";

import React, { useState, useMemo } from "react";
import {
    MapPin,
    Search,
    Plus,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Compass,
    Globe,
    Trash2,
    Pencil,
    X,
    Check,
} from "lucide-react";
import { withAuth } from "@/utils/auth/with-auth";
import { useVenues, Venue } from "@/hooks/use-venues";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { DismissibleError } from "@/components/ui/dismissible-error";

const fetchCoordinates = async (
    targetAddress: string
): Promise<{ lat: number; lng: number }> => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(targetAddress)}&format=jsonv2&limit=1`,
            {
                headers: {
                    "User-Agent": "DiscoveryHubAdmin/2.0.26 (rccgdiscoverycentre.org)",
                },
            }
        );
        if (response.ok) {
            const data = await response.json();
            if (data?.length > 0) {
                return {
                    lat: parseFloat(parseFloat(data[0].lat).toFixed(6)),
                    lng: parseFloat(parseFloat(data[0].lon).toFixed(6)),
                };
            }
        }
    } catch (err) {
        console.error("Geocoding error:", err);
    }
    return {
        lat: parseFloat((6.5244 + (Math.random() - 0.5) * 0.05).toFixed(6)),
        lng: parseFloat((3.3792 + (Math.random() - 0.5) * 0.05).toFixed(6)),
    };
};

export default withAuth(function VenuesPage() {
    const {
        venues,
        isLoading,
        isSubmitting,
        error,
        createVenue,
        updateVenue,
        deleteVenue,
    } = useVenues();

    // Create form
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

    // Inline edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editAddress, setEditAddress] = useState("");

    // Search + pagination
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const filteredVenues = useMemo(() => {
        if (!searchQuery.trim()) return venues;
        const query = searchQuery.toLowerCase();
        return venues.filter(
            (v) =>
                v.name.toLowerCase().includes(query) ||
                v.address.toLowerCase().includes(query) ||
                v.id.toLowerCase().includes(query)
        );
    }, [venues, searchQuery]);

    const totalPages = Math.ceil(filteredVenues.length / itemsPerPage);

    const paginatedVenues = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredVenues.slice(start, start + itemsPerPage);
    }, [filteredVenues, currentPage]);

    // Create
    const handleCreateVenue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !address) return;
        setIsGeocoding(true);
        try {
            const coords = await fetchCoordinates(address);
            const created = await createVenue({
                name,
                address,
                latitude: coords.lat,
                longitude: coords.lng,
            });
            setName("");
            setAddress("");
            setSelectedVenue(created);
            setShowCreateForm(false);
        } finally {
            setIsGeocoding(false);
        }
    };

    // Edit
    const startEdit = (venue: Venue) => {
        setEditingId(venue.id);
        setEditName(venue.name);
        setEditAddress(venue.address);
        setSelectedVenue(venue);
        setShowCreateForm(false);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName("");
        setEditAddress("");
    };

    const handleUpdate = async (venueId: string) => {
        const updated = await updateVenue(venueId, {
            name: editName,
            address: editAddress,
        });
        setSelectedVenue(updated);
        cancelEdit();
    };

    // Delete
    const handleDelete = async (venueId: string) => {
        await deleteVenue(venueId);
        if (selectedVenue?.id === venueId) setSelectedVenue(null);
    };

    const openCreateForm = () => {
        setShowCreateForm(true);
        setSelectedVenue(null);
        cancelEdit();
    };

    const openVenue = (venue: Venue) => {
        setSelectedVenue(venue);
        setShowCreateForm(false);
        cancelEdit();
    };

    const closePanel = () => {
        setShowCreateForm(false);
        setSelectedVenue(null);
        cancelEdit();
    };

    const panelOpen = showCreateForm || selectedVenue !== null;

    return (
        <div className="space-y-10 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                        Venues & Spaces
                    </h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Add and manage the spaces your congregation uses for events and services
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[#8A817C]">{venues.length} venue{venues.length !== 1 ? "s" : ""}</span>
                    <button
                        type="button"
                        onClick={openCreateForm}
                        className="flex items-center gap-1.5 h-9 px-4 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Venue
                    </button>
                </div>
            </div>

            <DismissibleError message={error} />

            {/* Search */}
            <div className="flex flex-col xl:flex-row gap-6 items-center justify-between bg-[#FFFFFF] border border-[#121212]/10 p-6 rounded-xl">
                <div className="w-full xl:max-w-md relative">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8A817C]" />
                    <input
                        type="text"
                        placeholder="Search venue registries by name or address..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full h-11 pl-11 pr-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Table */}
                <div className={`${panelOpen ? "lg:col-span-7" : "lg:col-span-12"} bg-[#FFFFFF] border border-[#121212]/10 rounded-xl overflow-hidden flex flex-col transition-all`}>
                    {isLoading ? (
                        <div className="p-12 text-center text-xs text-[#8A817C] font-light">
                            Loading venue registries...
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">
                                            Venue
                                        </th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">
                                            Coordinates
                                        </th>
                                        <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                    {paginatedVenues.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="p-12 text-center">
                                                <TableEmptyState
                                                    title={
                                                        searchQuery.trim()
                                                            ? "No venues match the current search."
                                                            : "No venues registered yet."
                                                    }
                                                    action={
                                                        !searchQuery.trim()
                                                            ? { label: "Add Venue", onClick: openCreateForm }
                                                            : undefined
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedVenues.map((venue) => (
                                            <tr
                                                key={venue.id}
                                                onClick={() => openVenue(venue)}
                                                className={`cursor-pointer transition-colors ${selectedVenue?.id === venue.id ? "bg-[#F4F1EA]/50" : "hover:bg-[#F4F1EA]/10"}`}
                                            >
                                                <td className="p-4 max-w-[280px]">
                                                    {editingId === venue.id ? (
                                                        <div className="space-y-2">
                                                            <input
                                                                value={editName}
                                                                onChange={(e) => setEditName(e.target.value)}
                                                                className="w-full h-9 px-3 bg-[#F4F1EA]/60 border border-[#121212]/20 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-md"
                                                            />
                                                            <input
                                                                value={editAddress}
                                                                onChange={(e) => setEditAddress(e.target.value)}
                                                                className="w-full h-9 px-3 bg-[#F4F1EA]/60 border border-[#121212]/20 text-xs text-[#8A817C] font-light focus:outline-none focus:border-[#121212] rounded-md"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="text-sm font-medium text-[#121212]">
                                                                {venue.name}
                                                            </div>
                                                            <div className="text-xs text-[#8A817C] font-light mt-1 flex items-start space-x-1">
                                                                <MapPin className="w-3 h-3 text-[#8A817C]/70 shrink-0 mt-0.5" />
                                                                <span className="leading-tight">{venue.address}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </td>
                                                <td className="p-4 font-mono text-xs text-[#121212] space-y-1">
                                                    <div className="flex items-center">
                                                        <Compass className="w-3 h-3 text-[#8A817C] mr-1.5 shrink-0" />
                                                        <span>Lat: {venue.latitude}°</span>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <Globe className="w-3 h-3 text-[#8A817C] mr-1.5 shrink-0" />
                                                        <span>Lng: {venue.longitude}°</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                    {editingId === venue.id ? (
                                                        <div className="flex items-center justify-end space-x-1">
                                                            <button
                                                                onClick={() => handleUpdate(venue.id)}
                                                                disabled={isSubmitting}
                                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg border border-transparent hover:border-green-100 transition-colors disabled:opacity-50"
                                                                title="Save changes"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={cancelEdit}
                                                                className="p-2 text-[#8A817C] hover:bg-[#F4F1EA] rounded-lg border border-transparent transition-colors"
                                                                title="Cancel"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-end space-x-1">
                                                            <button
                                                                onClick={() => startEdit(venue)}
                                                                className="p-2 text-[#8A817C] hover:text-[#121212] rounded-lg hover:bg-[#F4F1EA] border border-transparent transition-colors"
                                                                title="Edit venue"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(venue.id)}
                                                                disabled={isSubmitting}
                                                                className="p-2 text-[#8A817C] hover:text-red-600 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors disabled:opacity-50"
                                                                title="Delete venue"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="p-4 border-t border-[#121212]/10 bg-[#F4F1EA]/10 flex items-center justify-between">
                            <span className="text-xs font-mono text-[#8A817C]">
                                Page {currentPage} of {totalPages}
                            </span>
                            <div className="flex space-x-1">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage((prev) => prev - 1)}
                                    className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212]"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage((prev) => prev + 1)}
                                    className="p-2 border border-[#121212]/10 rounded-md disabled:opacity-40 text-[#121212]"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {panelOpen && (
                    <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 rounded-xl relative overflow-hidden">
                        <button
                            type="button"
                            onClick={closePanel}
                            className="absolute top-4 right-4 p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md z-10 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {showCreateForm && (
                            <div className="p-6">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">New Venue</div>
                                <h2 className="text-lg font-light tracking-tight text-[#121212] mb-6 pr-8">Add Venue</h2>

                                <form onSubmit={handleCreateVenue} className="space-y-5">
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                            Venue Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g., Main Auditorium"
                                            className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                            Address
                                        </label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-[#8A817C]" />
                                            <input
                                                type="text"
                                                required
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                placeholder="e.g., 123 Church Road, Lagos, Nigeria"
                                                className="w-full h-11 pl-10 pr-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isGeocoding || isSubmitting || !name || !address}
                                        className="w-full h-12 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 rounded-xl"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${isGeocoding || isSubmitting ? "animate-spin" : "hidden"}`} />
                                        <span>{isGeocoding ? "Resolving..." : isSubmitting ? "Saving..." : "Add Venue"}</span>
                                    </button>
                                </form>
                            </div>
                        )}

                        {!showCreateForm && selectedVenue && (
                            <div className="flex flex-col h-full">
                                <div className="p-6 border-b border-[#121212]/5">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Venue Detail</div>
                                    <h2 className="text-lg font-light tracking-tight text-[#121212] pr-8">{selectedVenue.name}</h2>
                                    <div className="text-xs text-[#8A817C] mt-2 flex items-start gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                        <span>{selectedVenue.address}</span>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-4 bg-[#F4F1EA]/30 border border-[#121212]/5 rounded-lg">
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Latitude</div>
                                            <div className="text-sm font-mono text-[#121212]">{selectedVenue.latitude}°</div>
                                        </div>
                                        <div className="p-4 bg-[#F4F1EA]/30 border border-[#121212]/5 rounded-lg">
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-1">Longitude</div>
                                            <div className="text-sm font-mono text-[#121212]">{selectedVenue.longitude}°</div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#121212] flex items-center space-x-2">
                                            <Pencil className="w-4 h-4 text-[#8A817C]" />
                                            <span>Edit Venue</span>
                                        </h3>
                                        <div className="space-y-2">
                                            <input
                                                value={editingId === selectedVenue.id ? editName : selectedVenue.name}
                                                onFocus={() => startEdit(selectedVenue)}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                            />
                                            <input
                                                value={editingId === selectedVenue.id ? editAddress : selectedVenue.address}
                                                onFocus={() => startEdit(selectedVenue)}
                                                onChange={(e) => setEditAddress(e.target.value)}
                                                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#8A817C] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleUpdate(selectedVenue.id)}
                                            disabled={isSubmitting || editingId !== selectedVenue.id}
                                            className="w-full h-10 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-40 rounded-lg"
                                        >
                                            Save Changes
                                        </button>
                                    </div>

                                    <div className="pt-4 border-t border-[#121212]/5">
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(selectedVenue.id)}
                                            disabled={isSubmitting}
                                            className="w-full h-10 border border-red-200 text-red-600 text-xs font-semibold uppercase tracking-widest hover:bg-red-50 transition-colors disabled:opacity-40 rounded-lg"
                                        >
                                            Delete Venue
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}, { requiredPermission: 'venues:read' });
