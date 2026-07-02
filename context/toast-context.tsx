"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
}

type ToastState = {
    toast: (message: string, type?: ToastType) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
};

const ToastContext = createContext<ToastState | null>(null);

const ICONS: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />,
    error:   <XCircle className="w-4 h-4 text-red-500 shrink-0" />,
    info:    <Info className="w-4 h-4 text-blue-500 shrink-0" />,
};

const STYLES: Record<ToastType, string> = {
    success: "border-green-200 bg-white",
    error:   "border-red-200 bg-white",
    info:    "border-blue-200 bg-white",
};

const MAX_TOASTS = 4;
const DURATION_MS = 4000;

function ToastList({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
    if (toasts.length === 0) return null;
    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm w-full font-sans animate-in slide-in-from-bottom-2 fade-in duration-200 ${STYLES[t.type]}`}
                >
                    {ICONS[t.type]}
                    <p className="flex-1 text-xs font-light text-[#121212] leading-relaxed">{t.message}</p>
                    <button
                        onClick={() => onDismiss(t.id)}
                        className="shrink-0 p-0.5 text-[#8A817C] hover:text-[#121212] transition-colors"
                        aria-label="Dismiss"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        const timer = timers.current.get(id);
        if (timer) { clearTimeout(timer); timers.current.delete(id); }
    }, []);

    const toast = useCallback((message: string, type: ToastType = "info") => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts((prev) => {
            const next = [...prev, { id, message, type }];
            return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
        });
        const timer = setTimeout(() => dismiss(id), DURATION_MS);
        timers.current.set(id, timer);
    }, [dismiss]);

    const success = useCallback((message: string) => toast(message, "success"), [toast]);
    const error   = useCallback((message: string) => toast(message, "error"),   [toast]);
    const info    = useCallback((message: string) => toast(message, "info"),    [toast]);

    return (
        <ToastContext.Provider value={{ toast, success, error, info }}>
            {children}
            <ToastList toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
}

export function useToast(): ToastState {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}
