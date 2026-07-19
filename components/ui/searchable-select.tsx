"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

export interface SearchableOption {
    id: string;
    label: string;
    sublabel?: string;
}

export function SearchableSelect({
    options, value, onChange, placeholder, emptyLabel,
}: {
    options: SearchableOption[];
    value: string;
    onChange: (id: string) => void;
    placeholder: string;
    emptyLabel: string;
}) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selected = options.find((o) => o.id === value);
    const q = query.trim().toLowerCase();
    const results = (q
        ? options.filter((o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q))
        : options
    ).slice(0, 10);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const handleSelect = (o: SearchableOption) => {
        onChange(o.id);
        setQuery("");
        setOpen(false);
    };

    const handleClear = () => {
        onChange("");
        setQuery("");
        setOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            {selected ? (
                <div className="flex items-center gap-3 h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 rounded-lg">
                    <span className="text-xs text-[#121212] font-light flex-1 truncate">
                        {selected.label}
                        {selected.sublabel && <span className="text-[#8A817C]"> — {selected.sublabel}</span>}
                    </span>
                    <button type="button" onClick={handleClear} className="p-0.5 text-[#8A817C] hover:text-[#121212] transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8A817C] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                        placeholder={placeholder}
                        className="w-full h-10 pl-9 pr-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>
            )}
            {open && !selected && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#121212]/10 rounded-xl shadow-lg z-20 overflow-hidden max-h-60 overflow-y-auto">
                    {results.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-[#8A817C] font-light">{emptyLabel}</p>
                    ) : (
                        results.map((o) => (
                            <button
                                key={o.id}
                                type="button"
                                onClick={() => handleSelect(o)}
                                className="w-full text-left px-4 py-2.5 text-xs text-[#121212] font-light hover:bg-[#F4F1EA]/60 transition-colors border-b border-[#121212]/5 last:border-b-0"
                            >
                                {o.label}
                                {o.sublabel && <span className="text-[#8A817C]"> — {o.sublabel}</span>}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
