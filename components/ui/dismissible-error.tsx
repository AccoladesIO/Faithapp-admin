"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, X } from "lucide-react";

interface Props {
    message: string | null;
    autoDismissMs?: number;
    variant?: "error" | "warning";
}

const VARIANT_CLASSES = {
    error: "bg-red-50 border-red-100 text-red-700",
    warning: "bg-amber-50 border-amber-100 text-amber-700",
};
const VARIANT_BUTTON_CLASSES = {
    error: "text-red-400 hover:text-red-700",
    warning: "text-amber-400 hover:text-amber-700",
};

export function DismissibleError({ message, autoDismissMs = 4000, variant = "error" }: Props) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!message) { setVisible(false); return; }
        setVisible(true);
        const t = setTimeout(() => setVisible(false), autoDismissMs);
        return () => clearTimeout(t);
    }, [message, autoDismissMs]);

    if (!visible || !message) return null;

    return (
        <div className={`flex items-center gap-2 p-3 border rounded-lg text-xs ${VARIANT_CLASSES[variant]}`}>
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="flex-1">{message}</span>
            <button
                type="button"
                onClick={() => setVisible(false)}
                className={`shrink-0 p-0.5 transition-colors ${VARIANT_BUTTON_CLASSES[variant]}`}
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
