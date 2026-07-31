"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function ErrorBoundary({
    error,
    reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
            <div className="max-w-sm w-full bg-white border border-[#121212]/10 rounded-xl p-8 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                    <h1 className="text-lg font-light tracking-tight text-[#121212]">Something went wrong</h1>
                    <p className="text-xs text-[#8A817C] mt-1.5 leading-relaxed">
                        An unexpected error occurred. You can try again, or head back to the dashboard.
                    </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                    <button
                        onClick={() => reset()}
                        className="flex-1 flex items-center justify-center gap-1.5 h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Try Again
                    </button>
                    <a
                        href="/dashboard"
                        className="flex-1 flex items-center justify-center gap-1.5 h-10 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors"
                    >
                        <Home className="w-3.5 h-3.5" /> Dashboard
                    </a>
                </div>
            </div>
        </div>
    );
}
