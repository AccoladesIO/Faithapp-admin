import React from "react";
import { Mic, Music, HandHeart, HandCoins, Megaphone, Star, HelpCircle, Coffee } from "lucide-react";
import { ServiceSlotType } from "@/hooks/use-service-programme";

interface SlotTypeConfig {
    label: string;
    icon: React.ReactNode;
    border: string;
    bg: string;
    text: string;
    badge: string;
}

export const SLOT_TYPE_CONFIG: Record<ServiceSlotType, SlotTypeConfig> = {
    SPEAKER:      { label: "Speaker",      icon: <Mic className="w-3.5 h-3.5" />,       border: "border-l-amber-500",  bg: "bg-amber-50/60",   text: "text-amber-800",  badge: "bg-amber-100 text-amber-800 border-amber-200" },
    WORSHIP:      { label: "Praise & Worship", icon: <Music className="w-3.5 h-3.5" />,  border: "border-l-blue-500",   bg: "bg-blue-50/60",    text: "text-blue-800",   badge: "bg-blue-100 text-blue-800 border-blue-200" },
    PRAYER:       { label: "Prayer",       icon: <HandHeart className="w-3.5 h-3.5" />,  border: "border-l-purple-500", bg: "bg-purple-50/60",  text: "text-purple-800", badge: "bg-purple-100 text-purple-800 border-purple-200" },
    OFFERING:     { label: "Offering",     icon: <HandCoins className="w-3.5 h-3.5" />,  border: "border-l-green-500",  bg: "bg-green-50/60",   text: "text-green-800",  badge: "bg-green-100 text-green-800 border-green-200" },
    ANNOUNCEMENT: { label: "Announcement", icon: <Megaphone className="w-3.5 h-3.5" />,  border: "border-l-gray-400",   bg: "bg-gray-50/60",    text: "text-gray-700",   badge: "bg-gray-100 text-gray-700 border-gray-200" },
    DEDICATION:   { label: "Dedication",   icon: <Star className="w-3.5 h-3.5" />,       border: "border-l-teal-500",   bg: "bg-teal-50/60",    text: "text-teal-800",   badge: "bg-teal-100 text-teal-800 border-teal-200" },
    OTHER:        { label: "Other",        icon: <HelpCircle className="w-3.5 h-3.5" />, border: "border-l-zinc-400",   bg: "bg-zinc-50/60",    text: "text-zinc-700",   badge: "bg-zinc-100 text-zinc-700 border-zinc-200" },
    BREAK:        { label: "Break",        icon: <Coffee className="w-3.5 h-3.5" />,     border: "border-l-slate-300",  bg: "bg-slate-50/40",   text: "text-slate-600",  badge: "bg-slate-100 text-slate-600 border-slate-200" },
};

export function SlotTypeBadge({ type }: { type: ServiceSlotType }) {
    const cfg = SLOT_TYPE_CONFIG[type];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${cfg.badge}`}>
            {cfg.icon}
            {cfg.label}
        </span>
    );
}
