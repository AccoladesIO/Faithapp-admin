"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useMembers } from "@/hooks/use-member";

// Shared "pick one member" input used anywhere in the admin portal — always
// shows email alongside name so same-named members stay identifiable. Unlike
// SearchableSelect (which filters a small pre-loaded options list), this
// drives a live debounced server search via useMembers, since the member
// list can be arbitrarily large.
export function MemberSearchSelect({
    value,
    label,
    onChange,
    placeholder = "Search by name or email…",
    roleFilter,
}: Readonly<{
    value: string;
    label: string;
    onChange: (id: string, label: string) => void;
    placeholder?: string;
    roleFilter?: "MEMBER" | "WORKER";
}>) {
    const { members, isLoading, onSearchChange } = useMembers(8, roleFilter);
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const handleSelect = (m: { id: string; firstname: string; lastname: string }) => {
        onChange(m.id, `${m.firstname} ${m.lastname}`);
        setQuery("");
        setOpen(false);
    };

    const handleClear = () => {
        onChange("", "");
        setQuery("");
        setOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            {value ? (
                <div className="flex items-center gap-3 h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 rounded-lg">
                    <span className="text-xs text-[#121212] font-light flex-1 truncate">{label}</span>
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
                        onChange={(e) => { setQuery(e.target.value); onSearchChange(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                        placeholder={placeholder}
                        className="w-full h-10 pl-9 pr-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                    />
                </div>
            )}
            {open && !value && query.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#121212]/10 rounded-xl shadow-lg z-20 overflow-hidden max-h-60 overflow-y-auto">
                    {isLoading ? (
                        <p className="px-4 py-3 text-xs text-[#8A817C] font-light">Searching…</p>
                    ) : members.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-[#8A817C] font-light">No members found.</p>
                    ) : (
                        members.map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => handleSelect(m)}
                                className="w-full text-left px-4 py-2.5 text-xs text-[#121212] font-light hover:bg-[#F4F1EA]/60 transition-colors border-b border-[#121212]/5 last:border-b-0"
                            >
                                {m.firstname} {m.lastname}
                                <span className="text-[#8A817C]"> — {m.email}</span>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
