"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, X } from "lucide-react";

interface Props {
    message: string | null;
    autoDismissMs?: number;
}

export function DismissibleError({ message, autoDismissMs = 4000 }: Props) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!message) { setVisible(false); return; }
        setVisible(true);
        const t = setTimeout(() => setVisible(false), autoDismissMs);
        return () => clearTimeout(t);
    }, [message, autoDismissMs]);

    if (!visible || !message) return null;

    return (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="flex-1">{message}</span>
            <button
                type="button"
                onClick={() => setVisible(false)}
                className="shrink-0 p-0.5 text-red-400 hover:text-red-700 transition-colors"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
