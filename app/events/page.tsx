"use client";

import React, { useState } from "react";
import { Calendar, MapPin, RefreshCw, Clock, AlignLeft, Search, Plus, Sliders, Layers } from "lucide-react";

interface GeolocationCoordinates {
    lat: string;
    lng: string;
}

interface EventConfig {
    id: string;
    name: string;
    venue: string;
    coordinates: GeolocationCoordinates | null;
    isRecurring: boolean;
    frequency: "none" | "daily" | "weekly" | "monthly";
}

interface ChurchEvent {
    id: string;
    configId: string | null;
    title: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    venue: string;
    coordinates: GeolocationCoordinates | null;
    isRecurring: boolean;
    frequency: "none" | "daily" | "weekly" | "monthly";
}

export default function EventsPage() {
    const [activeTab, setActiveTab] = useState<"events" | "configs">("events");
    const [events, setEvents] = useState<ChurchEvent[]>([]);
    const [configs, setConfigs] = useState<EventConfig[]>([]);

    const [selectedConfigId, setSelectedConfigId] = useState<string>("");
    const [title, setTitle] = useState("");
    const [startDate, setStartDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endDate, setEndDate] = useState("");
    const [endTime, setEndTime] = useState("");
    const [venue, setVenue] = useState("");
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState<"none" | "daily" | "weekly" | "monthly">("none");
    const [isGeocoding, setIsGeocoding] = useState(false);

    const [configName, setConfigName] = useState("");
    const [configVenue, setConfigVenue] = useState("");
    const [configIsRecurring, setConfigIsRecurring] = useState(false);
    const [configFrequency, setConfigFrequency] = useState<"none" | "daily" | "weekly" | "monthly">("none");
    const [isConfigGeocoding, setIsConfigGeocoding] = useState(false);

    const fetchCoordinatesFallback = async (address: string): Promise<GeolocationCoordinates | null> => {
        try {
            const query = encodeURIComponent(address);
            const url = `https://geocode.maps.co/search?q=${query}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    return {
                        lat: parseFloat(data[0].lat).toFixed(6),
                        lng: parseFloat(data[0].lon).toFixed(6),
                    };
                }
            }
        } catch {
            return null;
        }

        const mockLat = (6.45 + (Math.random() - 0.5) * 0.1).toFixed(6);
        const mockLng = (3.40 + (Math.random() - 0.5) * 0.1).toFixed(6);
        return { lat: mockLat, lng: mockLng };
    };

    const handleConfigSelectChange = (id: string) => {
        setSelectedConfigId(id);
        if (id === "custom" || id === "") {
            setTitle("");
            setVenue("");
            setIsRecurring(false);
            setFrequency("none");
        } else {
            const config = configs.find((c) => c.id === id);
            if (config) {
                setTitle(config.name);
                setVenue(config.venue);
                setIsRecurring(config.isRecurring);
                setFrequency(config.frequency);
            }
        }
    };

    const handleCreateConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!configName || !configVenue) return;

        setIsConfigGeocoding(true);
        const resolvedCoordinates = await fetchCoordinatesFallback(configVenue);

        const newConfig: EventConfig = {
            id: crypto.randomUUID(),
            name: configName,
            venue: configVenue,
            coordinates: resolvedCoordinates,
            isRecurring: configIsRecurring,
            frequency: configIsRecurring ? configFrequency : "none",
        };

        setConfigs((prev) => [newConfig, ...prev]);
        setConfigName("");
        setConfigVenue("");
        setConfigIsRecurring(false);
        setConfigFrequency("none");
        setIsConfigGeocoding(false);
    };

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !startDate || !startTime || !endDate || !endTime || !venue) return;

        setIsGeocoding(true);

        let resolvedCoordinates: GeolocationCoordinates | null = null;
        const isUsingConfig = selectedConfigId !== "" && selectedConfigId !== "custom";

        if (isUsingConfig) {
            const matchedConfig = configs.find((c) => c.id === selectedConfigId);
            resolvedCoordinates = matchedConfig?.coordinates || null;
        } else {
            resolvedCoordinates = await fetchCoordinatesFallback(venue);
        }

        const newEvent: ChurchEvent = {
            id: crypto.randomUUID(),
            configId: isUsingConfig ? selectedConfigId : null,
            title,
            startDate,
            startTime,
            endDate,
            endTime,
            venue,
            coordinates: resolvedCoordinates,
            isRecurring,
            frequency: isRecurring ? frequency : "none",
        };

        setEvents((prev) => [newEvent, ...prev]);
        console.log("New Event Created:", newEvent);
        setSelectedConfigId("");
        setTitle("");
        setStartDate("");
        setStartTime("");
        setEndDate("");
        setEndTime("");
        setVenue("");
        setIsRecurring(false);
        setFrequency("none");
        setIsGeocoding(false);
    };

    return (
        <div className="space-y-10 font-sans">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">
                        Events & Management Hub
                    </h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Build global presets and deploy structured church operational calendars
                    </p>
                </div>

                <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl self-start md:self-auto">
                    <button
                        onClick={() => setActiveTab("events")}
                        className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${activeTab === "events"
                                ? "bg-[#121212] text-[#FFFFFF]"
                                : "text-[#8A817C] hover:text-[#121212]"
                            }`}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Operational Events</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("configs")}
                        className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${activeTab === "configs"
                                ? "bg-[#121212] text-[#FFFFFF]"
                                : "text-[#8A817C] hover:text-[#121212]"
                            }`}
                    >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Config Presets</span>
                    </button>
                </div>
            </div>

            {activeTab === "events" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 p-8 rounded-xl">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] mb-6 flex items-center space-x-2">
                            <Plus className="w-4 h-4 text-[#8A817C]" />
                            <span>Schedule Operational Event</span>
                        </h2>

                        <form onSubmit={handleCreateEvent} className="space-y-5">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Link Config Configuration Preset
                                </label>
                                <select
                                    value={selectedConfigId}
                                    onChange={(e) => handleConfigSelectChange(e.target.value)}
                                    className="w-full h-11 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                >
                                    <option value="">-- No configuration template bound --</option>
                                    <option value="custom">Custom Configuration Entry</option>
                                    {configs.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            Preset: {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Event Title
                                </label>
                                <div className="relative">
                                    <AlignLeft className="absolute left-3 top-3.5 w-4 h-4 text-[#8A817C]" />
                                    <input
                                        type="text"
                                        required
                                        disabled={selectedConfigId !== "" && selectedConfigId !== "custom"}
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., Midweek Revival Service"
                                        className="w-full h-11 pl-10 pr-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg disabled:opacity-60"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-xl space-y-4">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">
                                    Timeline Manifest
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                            Start Date
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3 w-3.5 h-3.5 text-[#8A817C]" />
                                            <input
                                                type="date"
                                                required
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full h-10 pl-9 pr-3 bg-[#FFFFFF] border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                            Start Time
                                        </label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-3 w-3.5 h-3.5 text-[#8A817C]" />
                                            <input
                                                type="time"
                                                required
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                                className="w-full h-10 pl-9 pr-3 bg-[#FFFFFF] border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                            End Date
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3 w-3.5 h-3.5 text-[#8A817C]" />
                                            <input
                                                type="date"
                                                required
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full h-10 pl-9 pr-3 bg-[#FFFFFF] border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                            End Time
                                        </label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-3 w-3.5 h-3.5 text-[#8A817C]" />
                                            <input
                                                type="time"
                                                required
                                                value={endTime}
                                                onChange={(e) => setEndTime(e.target.value)}
                                                className="w-full h-10 pl-9 pr-3 bg-[#FFFFFF] border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Physical Venue Address
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-[#8A817C]" />
                                    <input
                                        type="text"
                                        required
                                        disabled={selectedConfigId !== "" && selectedConfigId !== "custom"}
                                        value={venue}
                                        onChange={(e) => setVenue(e.target.value)}
                                        placeholder="e.g., 62 Igi Olugbin Street, Bariga, Lagos"
                                        className="w-full h-11 pl-10 pr-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg disabled:opacity-60"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 border-t border-[#121212]/5 space-y-4">
                                <label className="flex items-center space-x-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        disabled={selectedConfigId !== "" && selectedConfigId !== "custom"}
                                        checked={isRecurring}
                                        onChange={(e) => {
                                            setIsRecurring(e.target.checked);
                                            if (!e.target.checked) setFrequency("none");
                                            else setFrequency("daily");
                                        }}
                                        className="w-4 h-4 rounded border-[#121212]/10 text-[#121212] focus:ring-0 disabled:opacity-50"
                                    />
                                    <span className="text-xs uppercase tracking-wider font-semibold text-[#121212]">
                                        Configure Lifecycle Recurrence
                                    </span>
                                </label>

                                {isRecurring && (
                                    <div className="bg-[#F4F1EA]/50 p-4 border border-[#121212]/5 rounded-xl space-y-2">
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">
                                            Recurrence Interval Rate
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(["daily", "weekly", "monthly"] as const).map((freq) => (
                                                <button
                                                    key={freq}
                                                    type="button"
                                                    disabled={selectedConfigId !== "" && selectedConfigId !== "custom"}
                                                    onClick={() => setFrequency(freq)}
                                                    className={`h-9 text-xs font-semibold uppercase tracking-wider transition-colors border rounded-md ${frequency === freq
                                                            ? "bg-[#121212] text-[#FFFFFF] border-[#121212]"
                                                            : "bg-[#FFFFFF] text-[#8A817C] border-[#121212]/10 hover:text-[#121212]"
                                                        } disabled:opacity-50`}
                                                >
                                                    {freq}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isGeocoding}
                                className="w-full h-12 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 rounded-xl mt-6"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isGeocoding ? "animate-spin" : ""}`} />
                                <span>{isGeocoding ? "Resolving Mapping Matrix..." : "Save Operational Event"}</span>
                            </button>
                        </form>
                    </div>

                    <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#121212]/10 p-8 rounded-xl flex flex-col">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] mb-6 flex items-center space-x-2">
                            <Search className="w-4 h-4 text-[#8A817C]" />
                            <span>Active Operational Index ({events.length})</span>
                        </h2>

                        {events.length === 0 ? (
                            <div className="flex-1 border-2 border-dashed border-[#121212]/10 flex flex-col items-center justify-center text-center p-12 bg-[#F4F1EA]/20 rounded-xl">
                                <Calendar className="w-8 h-8 text-[#8A817C]/40 mb-3" />
                                <div className="text-xs uppercase tracking-wider font-semibold text-[#121212]">
                                    No Operational Events Active
                                </div>
                                <p className="text-xs text-[#8A817C] font-light max-w-xs mt-1">
                                    Database registers clear. Bind parameters or template options inside the form generator dashboard panel.
                                </p>
                            </div>
                        ) : (
                            <div className="border border-[#121212]/10 rounded-xl overflow-hidden bg-[#FFFFFF]">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Event Identification</th>
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Timeline Spectrum</th>
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Geodetic Matrix</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                            {events.map((event) => (
                                                <tr key={event.id} className="hover:bg-[#F4F1EA]/10 transition-colors">
                                                    <td className="p-4 align-top">
                                                        <div className="text-sm font-medium text-[#121212]">{event.title}</div>
                                                        <div className="text-xs text-[#8A817C] font-light mt-1 flex items-center space-x-1">
                                                            <MapPin className="w-3 h-3 text-[#8A817C]/70 shrink-0" />
                                                            <span className="truncate max-w-[160px]" title={event.venue}>{event.venue}</span>
                                                        </div>
                                                        {event.configId && (
                                                            <span className="inline-block mt-2 px-1.5 py-0.5 bg-[#121212]/5 border border-[#121212]/10 text-[#8A817C] text-[9px] font-semibold uppercase tracking-wider rounded">
                                                                Config Bound
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 align-top font-mono text-xs space-y-1">
                                                        <div className="text-[#121212]">
                                                            <span className="text-[#8A817C] font-semibold uppercase text-[9px] tracking-wider block">Start</span>
                                                            {event.startDate} &bull; {event.startTime}
                                                        </div>
                                                        <div className="text-[#121212] pt-1 border-t border-[#121212]/5">
                                                            <span className="text-[#8A817C] font-semibold uppercase text-[9px] tracking-wider block">Term</span>
                                                            {event.endDate} &bull; {event.endTime}
                                                        </div>
                                                        {event.isRecurring && (
                                                            <span className="inline-block mt-2 px-2 py-0.5 bg-[#EADCC9] text-[#121212] text-[9px] font-bold uppercase tracking-wider rounded">
                                                                ♻ {event.frequency}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 align-top font-mono text-xs">
                                                        {event.coordinates ? (
                                                            <div className="text-[#121212] space-y-0.5 flex flex-col">
                                                                <span className="flex items-center text-[11px]">
                                                                    <span className="text-[#8A817C] font-semibold uppercase text-[9px] tracking-wider w-8">Lat:</span>
                                                                    {event.coordinates.lat}°
                                                                </span>
                                                                <span className="flex items-center text-[11px]">
                                                                    <span className="text-[#8A817C] font-semibold uppercase text-[9px] tracking-wider w-8">Lng:</span>
                                                                    {event.coordinates.lng}°
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-[#8A817C] uppercase font-semibold tracking-wider bg-[#F4F1EA] px-2 py-1 border border-dashed border-[#121212]/10 rounded">
                                                                Unresolved Vector
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === "configs" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 p-8 rounded-xl">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] mb-6 flex items-center space-x-2">
                            <Plus className="w-4 h-4 text-[#8A817C]" />
                            <span>Register Presets Module</span>
                        </h2>

                        <form onSubmit={handleCreateConfig} className="space-y-5">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Preset Configuration Identifier
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={configName}
                                    onChange={(e) => setConfigName(e.target.value)}
                                    placeholder="e.g., Sunday Worship Template"
                                    className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                    Default Operational Venue
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-[#8A817C]" />
                                    <input
                                        type="text"
                                        required
                                        value={configVenue}
                                        onChange={(e) => setConfigVenue(e.target.value)}
                                        placeholder="e.g., 62 Igi Olugbin Street, Bariga, Lagos"
                                        className="w-full h-11 pl-10 pr-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 border-t border-[#121212]/5 space-y-4">
                                <label className="flex items-center space-x-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={configIsRecurring}
                                        onChange={(e) => {
                                            setConfigIsRecurring(e.target.checked);
                                            if (!e.target.checked) setConfigFrequency("none");
                                            else setConfigFrequency("daily");
                                        }}
                                        className="w-4 h-4 rounded border-[#121212]/10 text-[#121212] focus:ring-0"
                                    />
                                    <span className="text-xs uppercase tracking-wider font-semibold text-[#121212]">
                                        Default Template Recurrence Group
                                    </span>
                                </label>

                                {configIsRecurring && (
                                    <div className="bg-[#F4F1EA]/50 p-4 border border-[#121212]/5 rounded-xl space-y-2">
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">
                                            Default Lifecycle Frequency
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(["daily", "weekly", "monthly"] as const).map((freq) => (
                                                <button
                                                    key={freq}
                                                    type="button"
                                                    onClick={() => setConfigFrequency(freq)}
                                                    className={`h-9 text-xs font-semibold uppercase tracking-wider transition-colors border rounded-md ${configFrequency === freq
                                                            ? "bg-[#121212] text-[#FFFFFF] border-[#121212]"
                                                            : "bg-[#FFFFFF] text-[#8A817C] border-[#121212]/10 hover:text-[#121212]"
                                                        }`}
                                                >
                                                    {freq}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isConfigGeocoding}
                                className="w-full h-12 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 rounded-xl mt-6"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isConfigGeocoding ? "animate-spin" : ""}`} />
                                <span>{isConfigGeocoding ? "Parsing Config Layout..." : "Save Config Preset"}</span>
                            </button>
                        </form>
                    </div>

                    <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#121212]/10 p-8 rounded-xl flex flex-col">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] mb-6 flex items-center space-x-2">
                            <Search className="w-4 h-4 text-[#8A817C]" />
                            <span>Available Config System Presets ({configs.length})</span>
                        </h2>

                        {configs.length === 0 ? (
                            <div className="flex-1 border-2 border-dashed border-[#121212]/10 flex flex-col items-center justify-center text-center p-12 bg-[#F4F1EA]/20 rounded-xl">
                                <Sliders className="w-8 h-8 text-[#8A817C]/40 mb-3" />
                                <div className="text-xs uppercase tracking-wider font-semibold text-[#121212]">
                                    No Presets Configured
                                </div>
                                <p className="text-xs text-[#8A817C] font-light max-w-xs mt-1">
                                    Create high-level config components to accelerate event creation sequences.
                                </p>
                            </div>
                        ) : (
                            <div className="border border-[#121212]/10 rounded-xl overflow-hidden bg-[#FFFFFF]">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Configuration Spec</th>
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Preset Lifecycle Rules</th>
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Default Location Lat/Lng</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                            {configs.map((config) => (
                                                <tr key={config.id} className="hover:bg-[#F4F1EA]/10 transition-colors">
                                                    <td className="p-4 align-top">
                                                        <div className="text-sm font-medium text-[#121212]">{config.name}</div>
                                                        <div className="text-xs text-[#8A817C] font-light mt-1 flex items-center space-x-1">
                                                            <MapPin className="w-3 h-3 text-[#8A817C]/70 shrink-0" />
                                                            <span className="truncate max-w-[160px]" title={config.venue}>{config.venue}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-top font-mono text-xs">
                                                        {config.isRecurring ? (
                                                            <span className="inline-block px-2 py-0.5 bg-[#EADCC9] text-[#121212] text-[9px] font-bold uppercase tracking-wider rounded">
                                                                Recurrence: {config.frequency}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[#8A817C] italic text-xs">Single-instance Preset</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 align-top font-mono text-xs">
                                                        {config.coordinates ? (
                                                            <div className="text-[#121212] space-y-0.5 flex flex-col">
                                                                <span className="flex items-center text-[11px]">
                                                                    <span className="text-[#8A817C] font-semibold uppercase text-[9px] tracking-wider w-8">Lat:</span>
                                                                    {config.coordinates.lat}°
                                                                </span>
                                                                <span className="flex items-center text-[11px]">
                                                                    <span className="text-[#8A817C] font-semibold uppercase text-[9px] tracking-wider w-8">Lng:</span>
                                                                    {config.coordinates.lng}°
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-[#8A817C] uppercase font-semibold tracking-wider bg-[#F4F1EA] px-2 py-1 border border-dashed border-[#121212]/10 rounded">
                                                                Unresolved Vector
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}