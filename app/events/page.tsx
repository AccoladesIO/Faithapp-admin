"use client";

import React, { useState } from "react";
import {
    Calendar, MapPin, RefreshCw, Clock, AlignLeft,
    Search, Plus, Sliders, Layers, Trash2, Pencil,
    X, Globe, ToggleLeft, ToggleRight,
} from "lucide-react";
import { withAuth } from "@/utils/auth/with-auth";
import { useEvents, ServiceSlot, Recurrence, CreateEventPayload } from "@/hooks/use-events";
import { useEventConfigs, CreateEventConfigPayload } from "@/hooks/use-event-configs";
import { useVenues } from "@/hooks/use-venues";
import Error from "@/components/layout/error";
import { toInputDateTime, toPayloadDateTime } from "@/utils/parse-local-time";

// ─── Reusable offset input ────────────────────────────────────────────────────

function OffsetInput({
    label, value, onChange,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
}) {
    return (
        <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                {label}
            </label>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
            />
        </div>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, description }: {
    icon: React.ElementType;
    title: string;
    description: string;
}) {
    return (
        <div className="flex-1 border-2 border-dashed border-[#121212]/10 flex flex-col items-center justify-center text-center p-12 bg-[#F4F1EA]/20 rounded-xl">
            <Icon className="w-8 h-8 text-[#8A817C]/40 mb-3" />
            <div className="text-xs uppercase tracking-wider font-semibold text-[#121212]">{title}</div>
            <p className="text-xs text-[#8A817C] font-light max-w-xs mt-1">{description}</p>
        </div>
    );
}

// ─── Service slot row ─────────────────────────────────────────────────────────

function SlotRow({
    slot, index, configs, venues, onChange, onRemove,
}: {
    slot: ServiceSlot;
    index: number;
    configs: { id: string; name: string }[];
    venues: { id: string; name: string }[];
    onChange: (index: number, field: keyof ServiceSlot, value: string) => void;
    onRemove: (index: number) => void;
}) {
    return (
        <div className="p-4 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">
                    Slot {index + 1}
                </span>
                <button type="button" onClick={() => onRemove(index)} className="p-1 text-[#8A817C] hover:text-red-500 transition-colors">
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>

            <input
                type="text"
                required
                placeholder="Slot name e.g. First Service"
                value={slot.name}
                onChange={(e) => onChange(index, "name", e.target.value)}
                className="w-full h-9 px-3 bg-[#FFFFFF] border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
            />

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Start Time</label>
                    <input
                        type="datetime-local"
                        required
                        value={toInputDateTime(slot.startTime)}
                        onChange={(e) => onChange(index, "startTime", toPayloadDateTime(e.target.value))}
                        className="w-full h-9 px-3 bg-[#FFFFFF] border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">End Time</label>
                    <input
                        type="datetime-local"
                        required
                        value={toInputDateTime(slot.endTime)}
                        onChange={(e) => onChange(index, "endTime", toPayloadDateTime(e.target.value))}
                        className="w-full h-9 px-3 bg-[#FFFFFF] border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Config</label>
                    <select
                        required
                        value={slot.configId}
                        onChange={(e) => onChange(index, "configId", e.target.value)}
                        className="w-full h-9 px-3 bg-[#FFFFFF] border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                    >
                        <option value="">-- Select config --</option>
                        {configs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1">Venue Override</label>
                    <select
                        value={slot.venueOverrideId ?? ""}
                        onChange={(e) => onChange(index, "venueOverrideId", e.target.value)}
                        className="w-full h-9 px-3 bg-[#FFFFFF] border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                    >
                        <option value="">-- Use config default --</option>
                        {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>
            </div>
        </div>
    );
}

// ─── Default form states ──────────────────────────────────────────────────────

const defaultEventForm = {
    name: "",
    description: "",
    eventDate: "",
    endDate: "",
    onlineAttendanceEnabled: false,
    isRecurring: false,
    recurrence: {
        recurrencePattern: "weekly" as "daily" | "weekly" | "monthly",
        recurrenceInterval: 1,
        recurrenceEndDate: "",
    },
    serviceSlots: [] as ServiceSlot[],
};

const defaultConfigForm: CreateEventConfigPayload = {
    name: "",
    description: "",
    defaultVenueId: "",
    workerCheckinStartOffsetSeconds: -5400,
    workerLateOffsetSeconds: 0,
    memberCheckinStartOffsetSeconds: -1800,
    checkinStopOffsetSeconds: 3600,
    allowedDistanceInMeters: 150,
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default withAuth(function AdminEventsPage() {
    const [activeTab, setActiveTab] = useState<"events" | "configs">("events");

    const { events, isLoading: eventsLoading, isSubmitting: eventSubmitting, error: eventError, createEvent, updateEvent, deleteEvent } = useEvents();
    const { eventConfigs, isLoading: configsLoading, isSubmitting: configSubmitting, error: configError, createEventConfig, updateEventConfig, deleteEventConfig } = useEventConfigs();
    const { venues } = useVenues();

    const [eventForm, setEventForm] = useState(defaultEventForm);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [configForm, setConfigForm] = useState<CreateEventConfigPayload>(defaultConfigForm);
    const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

    // ── Slot helpers ──────────────────────────────────────────────────────────
    const addSlot = () => setEventForm((prev) => ({
        ...prev,
        serviceSlots: [
            ...prev.serviceSlots,
            { name: "", startTime: "", endTime: "", configId: "", venueOverrideId: "" },
        ],
    }));

    const removeSlot = (index: number) => setEventForm((prev) => ({
        ...prev,
        serviceSlots: prev.serviceSlots.filter((_, i) => i !== index),
    }));

    const updateSlot = (index: number, field: keyof ServiceSlot, value: string) =>
        setEventForm((prev) => ({
            ...prev,
            serviceSlots: prev.serviceSlots.map((s, i) => i === index ? { ...s, [field]: value } : s),
        }));

    // ── Event submit ──────────────────────────────────────────────────────────
    const handleEventSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload: CreateEventPayload = {
            name: eventForm.name,
            description: eventForm.description,
            eventDate: eventForm.eventDate,
            endDate: eventForm.endDate,
            onlineAttendanceEnabled: eventForm.onlineAttendanceEnabled,
            isRecurring: eventForm.isRecurring,
            serviceSlots: eventForm.serviceSlots.map((s) => ({
                ...s,
                ...(s.venueOverrideId === "" ? {} : { venueOverrideId: s.venueOverrideId }),
            })),
            ...(eventForm.isRecurring && { recurrence: eventForm.recurrence }),
        };
        try {
            if (editingEventId) {
                await updateEvent(editingEventId, payload);
                setEditingEventId(null);
            } else {
                await createEvent(payload);
            }
            setEventForm(defaultEventForm);
        } catch { /* error surfaced via hook */ }
    };

    const startEditEvent = (event: typeof events[0]) => {
        setEditingEventId(event?.id);
        setEventForm({
            name: event?.name ?? "",
            description: event?.description ?? "",
            eventDate: event?.eventDate ?? "",
            endDate: event?.endDate ?? "",
            onlineAttendanceEnabled: !!event?.onlineAttendanceEnabled,
            isRecurring: !!event?.isRecurring,
            recurrence: event?.recurrence ?? {
                recurrencePattern: "weekly" as "daily" | "weekly" | "monthly",
                recurrenceInterval: 1,
                recurrenceEndDate: "",
            },
            // API returns full nested slot objects — map to flat ID strings
            serviceSlots: (event?.serviceSlots ?? []).map((s: any) => ({
                name: s.name ?? "",
                startTime: s.startTime ?? "",
                endTime: s.endTime ?? "",
                configId: s.config?.id ?? s.configId ?? "",
                venueOverrideId: s.venueOverride?.id ?? s.venueOverrideId ?? "",
            })),
        });
        setActiveTab("events");
    };

    // ── Config submit ─────────────────────────────────────────────────────────
    const handleConfigSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingConfigId) {
                await updateEventConfig(editingConfigId, configForm);
                setEditingConfigId(null);
            } else {
                await createEventConfig(configForm);
            }
            setConfigForm(defaultConfigForm);
        } catch { /* error surfaced via hook */ }
    };

    const startEditConfig = (config: typeof eventConfigs[0]) => {
        setEditingConfigId(config.id);
        setConfigForm({
            name: config.name,
            description: config.description,
            defaultVenueId: config.defaultVenueId,
            workerCheckinStartOffsetSeconds: config.workerCheckinStartOffsetSeconds,
            workerLateOffsetSeconds: config.workerLateOffsetSeconds,
            memberCheckinStartOffsetSeconds: config.memberCheckinStartOffsetSeconds,
            checkinStopOffsetSeconds: config.checkinStopOffsetSeconds,
            allowedDistanceInMeters: config.allowedDistanceInMeters,
        });
        setActiveTab("configs");
    };

    const isEventBusy = eventSubmitting || eventsLoading;
    const isConfigBusy = configSubmitting || configsLoading;

    return (
        <div className="space-y-10 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-light tracking-tight text-[#121212]">Events & Management Hub</h1>
                    <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        Build global presets and deploy structured church operational calendars
                    </p>
                </div>
                <div className="flex bg-[#F4F1EA] p-1 border border-[#121212]/5 rounded-xl self-start md:self-auto">
                    {(["events", "configs"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${activeTab === tab ? "bg-[#121212] text-[#FFFFFF]" : "text-[#8A817C] hover:text-[#121212]"}`}
                        >
                            {tab === "events" ? <Layers className="w-3.5 h-3.5" /> : <Sliders className="w-3.5 h-3.5" />}
                            <span>{tab === "events" ? "Operational Events" : "Config Presets"}</span>
                        </button>
                    ))}
                </div>
            </div>

            {(eventError || configError) && (
                <Error error={eventError || configError || "An unexpected error occurred."} />
            )}

            {/* ── EVENTS TAB ───────────────────────────────────────────────── */}
            {activeTab === "events" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 p-8 rounded-xl">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] mb-6 flex items-center space-x-2">
                            <Plus className="w-4 h-4 text-[#8A817C]" />
                            <span>{editingEventId ? "Edit Event" : "Schedule Operational Event"}</span>
                        </h2>

                        <form onSubmit={handleEventSubmit} className="space-y-5">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Event Name</label>
                                <div className="relative">
                                    <AlignLeft className="absolute left-3 top-3.5 w-4 h-4 text-[#8A817C]" />
                                    <input
                                        type="text"
                                        required
                                        value={eventForm.name}
                                        onChange={(e) => setEventForm((p) => ({ ...p, name: e.target.value }))}
                                        placeholder="e.g., Sunday Service"
                                        className="w-full h-11 pl-10 pr-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Description</label>
                                <textarea
                                    value={eventForm.description}
                                    onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))}
                                    placeholder="Brief description of the event?..."
                                    rows={2}
                                    className="w-full px-4 py-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                                />
                            </div>

                            <div className="p-4 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-xl space-y-4">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">Timeline Manifest</div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Event Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3 w-3.5 h-3.5 text-[#8A817C]" />
                                            <input
                                                type="date"
                                                required
                                                value={eventForm.eventDate}
                                                onChange={(e) => setEventForm((p) => ({ ...p, eventDate: e.target.value }))}
                                                className="w-full h-10 pl-9 pr-3 bg-[#FFFFFF] border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">End Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3 w-3.5 h-3.5 text-[#8A817C]" />
                                            <input
                                                type="date"
                                                required
                                                value={eventForm.endDate}
                                                onChange={(e) => setEventForm((p) => ({ ...p, endDate: e.target.value }))}
                                                className="w-full h-10 pl-9 pr-3 bg-[#FFFFFF] border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <label className="flex items-center space-x-3 cursor-pointer select-none">
                                <button
                                    type="button"
                                    onClick={() => setEventForm((p) => ({ ...p, onlineAttendanceEnabled: !p.onlineAttendanceEnabled }))}
                                    className="text-[#121212]"
                                >
                                    {eventForm.onlineAttendanceEnabled
                                        ? <ToggleRight className="w-6 h-6" />
                                        : <ToggleLeft className="w-6 h-6 text-[#8A817C]" />}
                                </button>
                                <span className="text-xs uppercase tracking-wider font-semibold text-[#121212]">Online Attendance Enabled</span>
                            </label>

                            <div className="pt-2 border-t border-[#121212]/5 space-y-4">
                                <label className="flex items-center space-x-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={eventForm.isRecurring ?? false}
                                        onChange={(e) => setEventForm((p) => ({ ...p, isRecurring: e.target.checked }))}
                                        className="w-4 h-4 rounded border-[#121212]/10 text-[#121212] focus:ring-0"
                                    />
                                    <span className="text-xs uppercase tracking-wider font-semibold text-[#121212]">Configure Recurrence</span>
                                </label>

                                {eventForm.isRecurring && (
                                    <div className="bg-[#F4F1EA]/50 p-4 border border-[#121212]/5 rounded-xl space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-2">Pattern</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {(["daily", "weekly", "monthly"] as const).map((pattern) => (
                                                    <button
                                                        key={pattern}
                                                        type="button"
                                                        onClick={() => setEventForm((p) => ({ ...p, recurrence: { ...p.recurrence, recurrencePattern: pattern } }))}
                                                        className={`h-9 text-xs font-semibold uppercase tracking-wider transition-colors border rounded-md ${eventForm.recurrence.recurrencePattern === pattern ? "bg-[#121212] text-[#FFFFFF] border-[#121212]" : "bg-[#FFFFFF] text-[#8A817C] border-[#121212]/10 hover:text-[#121212]"}`}
                                                    >
                                                        {pattern}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Interval</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={eventForm.recurrence.recurrenceInterval}
                                                    onChange={(e) => setEventForm((p) => ({ ...p, recurrence: { ...p.recurrence, recurrenceInterval: Number(e.target.value) } }))}
                                                    className="w-full h-9 px-3 bg-[#FFFFFF] border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">End Date</label>
                                                <div className="relative">
                                                    <Clock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8A817C]" />
                                                    <input
                                                        type="date"
                                                        required
                                                        value={eventForm.recurrence.recurrenceEndDate}
                                                        onChange={(e) => setEventForm((p) => ({ ...p, recurrence: { ...p.recurrence, recurrenceEndDate: e.target.value } }))}
                                                        className="w-full h-9 pl-9 pr-3 bg-[#FFFFFF] border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 border-t border-[#121212]/5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#8A817C]">Service Slots</span>
                                    <button
                                        type="button"
                                        onClick={addSlot}
                                        className="flex items-center space-x-1 px-3 py-1.5 border border-[#121212]/10 rounded-lg text-[10px] font-semibold uppercase tracking-wider text-[#121212] hover:bg-[#F4F1EA] transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /><span>Add Slot</span>
                                    </button>
                                </div>

                                {eventForm.serviceSlots.length === 0 && (
                                    <p className="text-[10px] text-[#8A817C] font-mono">No slots added. At least one service slot is required.</p>
                                )}

                                {eventForm.serviceSlots.map((slot, i) => (
                                    <SlotRow
                                        key={i}
                                        slot={slot}
                                        index={i}
                                        configs={eventConfigs}
                                        venues={venues}
                                        onChange={updateSlot}
                                        onRemove={removeSlot}
                                    />
                                ))}
                            </div>

                            <div className="flex gap-3 mt-6">
                                {editingEventId && (
                                    <button
                                        type="button"
                                        onClick={() => { setEditingEventId(null); setEventForm(defaultEventForm); }}
                                        className="h-12 px-6 border border-[#121212]/10 text-xs font-semibold uppercase tracking-widest text-[#8A817C] hover:text-[#121212] transition-colors rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={isEventBusy || eventForm.serviceSlots.length === 0}
                                    className="flex-1 h-12 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 rounded-xl"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isEventBusy ? "animate-spin" : ""}`} />
                                    <span>{isEventBusy ? "Processing..." : editingEventId ? "Update Event" : "Save Operational Event"}</span>
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#121212]/10 p-8 rounded-xl flex flex-col">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] mb-6 flex items-center space-x-2">
                            <Search className="w-4 h-4 text-[#8A817C]" />
                            <span>Active Operational Index ({events.length})</span>
                        </h2>

                        {eventsLoading ? (
                            <div className="p-12 text-center text-xs text-[#8A817C]">Loading events...</div>
                        ) : events.length === 0 ? (
                            <EmptyState icon={Calendar} title="No Operational Events Active" description="Schedule a new event using the form on the left." />
                        ) : (
                            <div className="border border-[#121212]/10 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Event</th>
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Date</th>
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Slots</th>
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                            {events.map((event) => (
                                                <tr key={event?.id} className="hover:bg-[#F4F1EA]/10 transition-colors">
                                                    <td className="p-4 align-top">
                                                        <div className="text-sm font-medium text-[#121212]">{event?.name}</div>
                                                        <div className="text-xs text-[#8A817C] font-light mt-0.5">{event?.description}</div>
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {event?.onlineAttendanceEnabled && (
                                                                <span className="px-1.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 text-[9px] font-bold uppercase tracking-wider rounded">Online</span>
                                                            )}
                                                            {event?.isRecurring && (
                                                                <span className="px-1.5 py-0.5 bg-[#EADCC9] text-[#121212] text-[9px] font-bold uppercase tracking-wider rounded">
                                                                    ♻ {event?.recurrence?.recurrencePattern}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-top font-mono text-xs">
                                                        <div className="flex items-center space-x-1 text-[#121212]">
                                                            <Calendar className="w-3 h-3 text-[#8A817C]" />
                                                            <span>{event?.eventDate}</span>
                                                        </div>
                                                        {event?.endDate !== event?.eventDate && (
                                                            <div className="text-[10px] text-[#8A817C] mt-1">→ {event?.endDate}</div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <span className="inline-flex items-center px-2 py-0.5 bg-[#F4F1EA] border border-[#121212]/10 text-[#121212] text-[10px] font-semibold rounded">
                                                            {event?.serviceSlots?.length ?? 0} slot{(event?.serviceSlots?.length ?? 0) !== 1 ? "s" : ""}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 align-top text-right">
                                                        <div className="flex items-center justify-end space-x-1">
                                                            <button onClick={() => startEditEvent(event)} className="p-2 text-[#8A817C] hover:text-[#121212] rounded-lg hover:bg-[#F4F1EA] border border-transparent transition-colors" title="Edit">
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button onClick={() => deleteEvent(event?.id)} disabled={isEventBusy} className="p-2 text-[#8A817C] hover:text-red-600 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors disabled:opacity-50" title="Delete">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
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

            {/* ── CONFIGS TAB ──────────────────────────────────────────────── */}
            {activeTab === "configs" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#121212]/10 p-8 rounded-xl">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] mb-6 flex items-center space-x-2">
                            <Plus className="w-4 h-4 text-[#8A817C]" />
                            <span>{editingConfigId ? "Edit Config Preset" : "Register Config Preset"}</span>
                        </h2>

                        <form onSubmit={handleConfigSubmit} className="space-y-5">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Config Name</label>
                                <input
                                    type="text"
                                    required
                                    value={configForm.name}
                                    onChange={(e) => setConfigForm((p) => ({ ...p, name: e.target.value }))}
                                    placeholder="e.g., Default Sunday Config"
                                    className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Description</label>
                                <textarea
                                    value={configForm.description}
                                    onChange={(e) => setConfigForm((p) => ({ ...p, description: e.target.value }))}
                                    placeholder="Standard check-in config for..."
                                    rows={2}
                                    className="w-full px-4 py-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">Default Venue</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-[#8A817C]" />
                                    <select
                                        required
                                        value={configForm.defaultVenueId}
                                        onChange={(e) => setConfigForm((p) => ({ ...p, defaultVenueId: e.target.value }))}
                                        className="w-full h-11 pl-10 pr-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg appearance-none"
                                    >
                                        <option value="">-- Select a venue --</option>
                                        {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="p-4 bg-[#F4F1EA]/20 border border-[#121212]/5 rounded-xl space-y-4">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">Check-in Offset Parameters (seconds)</div>
                                <div className="grid grid-cols-2 gap-4">
                                    <OffsetInput label="Worker Start Offset" value={configForm.workerCheckinStartOffsetSeconds} onChange={(v) => setConfigForm((p) => ({ ...p, workerCheckinStartOffsetSeconds: v }))} />
                                    <OffsetInput label="Worker Late Offset" value={configForm.workerLateOffsetSeconds} onChange={(v) => setConfigForm((p) => ({ ...p, workerLateOffsetSeconds: v }))} />
                                    <OffsetInput label="Member Start Offset" value={configForm.memberCheckinStartOffsetSeconds} onChange={(v) => setConfigForm((p) => ({ ...p, memberCheckinStartOffsetSeconds: v }))} />
                                    <OffsetInput label="Checkin Stop Offset" value={configForm.checkinStopOffsetSeconds} onChange={(v) => setConfigForm((p) => ({ ...p, checkinStopOffsetSeconds: v }))} />
                                </div>
                                <OffsetInput label="Allowed Distance (meters)" value={configForm.allowedDistanceInMeters} onChange={(v) => setConfigForm((p) => ({ ...p, allowedDistanceInMeters: v }))} />
                            </div>

                            <div className="flex gap-3 mt-6">
                                {editingConfigId && (
                                    <button
                                        type="button"
                                        onClick={() => { setEditingConfigId(null); setConfigForm(defaultConfigForm); }}
                                        className="h-12 px-6 border border-[#121212]/10 text-xs font-semibold uppercase tracking-widest text-[#8A817C] hover:text-[#121212] transition-colors rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={isConfigBusy}
                                    className="flex-1 h-12 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 rounded-xl"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isConfigBusy ? "animate-spin" : ""}`} />
                                    <span>{isConfigBusy ? "Processing..." : editingConfigId ? "Update Config" : "Save Config Preset"}</span>
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#121212]/10 p-8 rounded-xl flex flex-col">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#121212] mb-6 flex items-center space-x-2">
                            <Search className="w-4 h-4 text-[#8A817C]" />
                            <span>Available Config Presets ({eventConfigs.length})</span>
                        </h2>

                        {configsLoading ? (
                            <div className="p-12 text-center text-xs text-[#8A817C]">Loading configs...</div>
                        ) : eventConfigs.length === 0 ? (
                            <EmptyState icon={Sliders} title="No Presets Configured" description="Create high-level config components to accelerate event creation sequences." />
                        ) : (
                            <div className="border border-[#121212]/10 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[#121212]/10 bg-[#F4F1EA]/40">
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Config Spec</th>
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C]">Offsets</th>
                                                <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A817C] text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#121212]/5 text-[#121212]">
                                            {eventConfigs.map((config) => {
                                                const venue = venues.find((v) => v.id === config?.defaultVenueId);
                                                return (
                                                    <tr key={config.id} className="hover:bg-[#F4F1EA]/10 transition-colors">
                                                        <td className="p-4 align-top">
                                                            <div className="text-sm font-medium text-[#121212]">{config?.name}</div>
                                                            <div className="text-xs text-[#8A817C] font-light mt-0.5">{config?.description}</div>
                                                            {venue && (
                                                                <div className="text-xs text-[#8A817C] font-light mt-1 flex items-center space-x-1">
                                                                    <MapPin className="w-3 h-3 shrink-0" />
                                                                    <span>{venue.name}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-4 align-top font-mono text-[10px] text-[#8A817C] space-y-0.5">
                                                            <div>Worker start: {config.workerCheckinStartOffsetSeconds}s</div>
                                                            <div>Worker late: {config.workerLateOffsetSeconds}s</div>
                                                            <div>Member start: {config.memberCheckinStartOffsetSeconds}s</div>
                                                            <div>Stop: {config.checkinStopOffsetSeconds}s</div>
                                                            <div className="flex items-center space-x-1 pt-1">
                                                                <Globe className="w-3 h-3" />
                                                                <span>{config.allowedDistanceInMeters}m radius</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 align-top text-right">
                                                            <div className="flex items-center justify-end space-x-1">
                                                                <button onClick={() => startEditConfig(config)} className="p-2 text-[#8A817C] hover:text-[#121212] rounded-lg hover:bg-[#F4F1EA] border border-transparent transition-colors" title="Edit">
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button onClick={() => deleteEventConfig(config.id)} disabled={isConfigBusy} className="p-2 text-[#8A817C] hover:text-red-600 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors disabled:opacity-50" title="Delete">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
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
});