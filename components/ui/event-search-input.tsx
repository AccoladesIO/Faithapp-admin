"use client";

import React, { useState, useEffect, useRef } from "react";
import { RefreshCw, X } from "lucide-react";
import { api } from "@/utils/auth/axios-client";

// Events are searched server-side rather than loaded in bulk, since the list
// only grows over time and a plain <select>/client-filtered list of every
// event stops scaling (a church accrues dozens of events a year).

export interface EventSearchResult {
    id: string;
    name: string;
    eventDate: string;
}

export const fmtEventSearchDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export function EventSearchInput({
    value,
    onChange,
    placeholder = "Search events by name…",
}: Readonly<{ value: string; onChange: (id: string) => void; placeholder?: string }>) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<EventSearchResult[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!value) setSelectedLabel("");
    }, [value]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const doSearch = async (q: string) => {
        if (!q.trim()) { setResults([]); setOpen(false); return; }
        setLoading(true);
        try {
            const res = await api.get(`/events?page=1&limit=8&search=${encodeURIComponent(q)}`);
            const list: EventSearchResult[] = res.data?.data?.data ?? [];
            setResults(list);
            setOpen(list.length > 0);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setQuery(q);
        if (!q) { onChange(""); setSelectedLabel(""); }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(q), 300);
    };

    const handleSelect = (ev: EventSearchResult) => {
        onChange(ev.id);
        setSelectedLabel(`${ev.name} — ${fmtEventSearchDate(ev.eventDate)}`);
        setQuery("");
        setResults([]);
        setOpen(false);
    };

    const handleClear = () => {
        onChange("");
        setSelectedLabel("");
        setQuery("");
        setResults([]);
        setOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            {selectedLabel ? (
                <div className="flex items-center gap-2 h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 rounded-lg">
                    <span className="text-xs text-[#121212] font-light flex-1 truncate">{selectedLabel}</span>
                    <button type="button" onClick={handleClear} className="p-0.5 text-[#8A817C] hover:text-[#121212] transition-colors">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={handleInput}
                        onFocus={() => results.length > 0 && setOpen(true)}
                        placeholder={placeholder}
                        className="w-full h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                    {loading && (
                        <RefreshCw className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#8A817C] animate-spin pointer-events-none" />
                    )}
                </div>
            )}
            {open && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#121212]/10 rounded-lg shadow-lg z-20 overflow-hidden max-h-48 overflow-y-auto">
                    {results.map((ev) => (
                        <button
                            key={ev.id}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); handleSelect(ev); }}
                            className="w-full text-left px-3 py-2 hover:bg-[#F4F1EA]/60 transition-colors border-b border-[#121212]/5 last:border-0"
                        >
                            <div className="text-xs text-[#121212] font-light">{ev.name}</div>
                            <div className="text-[10px] text-[#8A817C] font-mono">{fmtEventSearchDate(ev.eventDate)}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
