"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Radio, ChevronRight } from "lucide-react";
import { useActiveSessions } from "@/hooks/use-service-session";

function elapsedLabel(startedAt: string): string {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    const m = Math.floor(seconds / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
}

export function LiveSessionPill() {
    const sessions = useActiveSessions();
    const router = useRouter();
    const [showMenu, setShowMenu] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowMenu(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (sessions.length === 0) return null;

    const goTo = (sessionCode: string) => {
        setShowMenu(false);
        router.push(`/service-programme/live/${sessionCode}`);
    };

    if (sessions.length === 1) {
        const s = sessions[0];
        return (
            <button
                onClick={() => goTo(s.sessionCode)}
                title="Open the live session dashboard"
                className="flex items-center gap-2 h-9 pl-2.5 pr-3 rounded-full bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
            >
                <Radio className="w-3 h-3 text-red-600 animate-pulse" />
                <span className="text-[11px] font-semibold text-red-700 max-w-[160px] truncate">{s.serviceSlotName}</span>
                <span className="text-[10px] font-mono text-red-500/70">{elapsedLabel(s.startedAt)}</span>
                <ChevronRight className="w-3 h-3 text-red-400" />
            </button>
        );
    }

    return (
        <div className="relative" ref={wrapRef}>
            <button
                onClick={() => setShowMenu((v) => !v)}
                className="flex items-center gap-2 h-9 pl-2.5 pr-3 rounded-full bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
            >
                <Radio className="w-3 h-3 text-red-600 animate-pulse" />
                <span className="text-[11px] font-semibold text-red-700">{sessions.length} Live</span>
                <ChevronRight className={`w-3 h-3 text-red-400 transition-transform ${showMenu ? "rotate-90" : ""}`} />
            </button>
            {showMenu && (
                <div className="absolute right-0 top-11 w-64 bg-white border border-[#121212]/10 rounded-xl shadow-lg overflow-hidden z-50">
                    {sessions.map((s) => (
                        <button
                            key={s.sessionCode}
                            onClick={() => goTo(s.sessionCode)}
                            className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 hover:bg-[#F4F1EA]/60 text-left transition-colors border-b border-[#121212]/5 last:border-b-0"
                        >
                            <span className="flex items-center gap-2 min-w-0">
                                <Radio className="w-2.5 h-2.5 text-red-600 shrink-0 animate-pulse" />
                                <span className="text-xs text-[#121212] font-light truncate">{s.serviceSlotName}</span>
                            </span>
                            <span className="text-[10px] font-mono text-[#8A817C] shrink-0">{elapsedLabel(s.startedAt)}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
