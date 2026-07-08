"use client";

import React, { useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { useChurchSettings, ChurchSetting } from "@/hooks/use-church-settings";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { Settings2, RefreshCw, Lock } from "lucide-react";
import { DismissibleError } from "@/components/ui/dismissible-error";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

function ModuleRow({
    setting,
    canWrite,
    isSubmitting,
    onToggle,
}: {
    setting: ChurchSetting;
    canWrite: boolean;
    isSubmitting: boolean;
    onToggle: (key: string, enabled: boolean) => void;
}) {
    const [pending, setPending] = useState(false);

    const handleToggle = async () => {
        if (!canWrite || setting.required || isSubmitting || pending) return;
        setPending(true);
        try {
            await onToggle(setting.key, !setting.enabled);
        } finally {
            setPending(false);
        }
    };

    const toggling = pending || isSubmitting;

    return (
        <div className="flex items-center justify-between py-5 border-b border-[#121212]/8 last:border-0">
            <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#121212]">
                        {setting.moduleName}
                    </span>
                    {setting.required && (
                        <span className="inline-flex items-center gap-1 h-5 px-2 text-[10px] font-semibold uppercase tracking-wider bg-[#F4F1EA] text-[#8A817C] border border-[#121212]/10">
                            <Lock className="w-2.5 h-2.5" />
                            Required
                        </span>
                    )}
                </div>
                <p className="text-[11px] text-[#8A817C] mt-0.5 font-light">
                    Key: <code className="font-mono text-[10px] bg-[#F4F1EA] px-1 py-0.5">{setting.key}</code>
                </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${setting.enabled ? "text-emerald-600" : "text-[#8A817C]"}`}>
                    {setting.enabled ? "Enabled" : "Disabled"}
                </span>

                <button
                    type="button"
                    role="switch"
                    aria-checked={setting.enabled}
                    disabled={!canWrite || setting.required || toggling}
                    onClick={handleToggle}
                    title={
                        setting.required
                            ? "This module is required and cannot be disabled"
                            : !canWrite
                            ? "You need admin:write permission to change this"
                            : undefined
                    }
                    className={[
                        "relative w-10 h-6 transition-colors duration-200 focus:outline-none",
                        setting.enabled ? "bg-[#121212]" : "bg-[#121212]/15",
                        !canWrite || setting.required || toggling
                            ? "opacity-40 cursor-not-allowed"
                            : "cursor-pointer",
                    ].join(" ")}
                    style={{ borderRadius: "9999px" }}
                >
                    <span
                        className={[
                            "absolute top-1 w-4 h-4 bg-white shadow-sm transition-transform duration-200",
                            setting.enabled ? "translate-x-5" : "translate-x-1",
                        ].join(" ")}
                        style={{ borderRadius: "9999px" }}
                    />
                </button>
            </div>
        </div>
    );
}

const SystemSettingsPage = withAuth(
    () => {
        const { settings, isLoading, isSubmitting, error, updateSetting, refetch } =
            useChurchSettings();
        const { hasPermission } = useAuth();
        const { success, error: toastError } = useToast();
        const canWrite = hasPermission("admin:write");

        const handleToggle = async (key: string, enabled: boolean) => {
            try {
                await updateSetting(key, enabled);
                success(`Module ${enabled ? "enabled" : "disabled"} successfully.`);
            } catch (err: unknown) {
                const e = err as ApiError;
                toastError(e?.message || "Failed to update module.");
            }
        };

        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#F4F1EA] border border-[#121212]/10">
                            <Settings2 className="w-4 h-4 text-[#121212]" />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold uppercase tracking-widest text-[#121212]">
                                Module Settings
                            </h1>
                            <p className="text-[11px] text-[#8A817C] font-light mt-0.5">
                                Enable or disable optional features for your congregation
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={refetch}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 h-8 px-3 border border-[#121212]/10 text-[#8A817C] hover:text-[#121212] hover:border-[#121212]/20 text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                        style={{ borderRadius: "0px" }}
                    >
                        <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>

                {!canWrite && (
                    <div className="bg-amber-50 border border-amber-200 px-4 py-3 text-[11px] text-amber-800 font-light">
                        You have read-only access. Contact a super admin to change module settings.
                    </div>
                )}

                <DismissibleError message={error} />

                <div className="bg-white border border-[#121212]/10 px-6">
                    {isLoading ? (
                        <div className="space-y-0">
                            {[1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between py-5 border-b border-[#121212]/8 last:border-0"
                                >
                                    <div className="space-y-1.5">
                                        <div className="h-3.5 w-36 bg-[#F4F1EA] animate-pulse" />
                                        <div className="h-2.5 w-24 bg-[#F4F1EA] animate-pulse" />
                                    </div>
                                    <div className="h-6 w-10 bg-[#F4F1EA] animate-pulse rounded-full" />
                                </div>
                            ))}
                        </div>
                    ) : settings.length === 0 ? (
                        <div className="py-12 text-center text-[11px] text-[#8A817C] uppercase tracking-wider font-semibold">
                            No configurable modules found
                        </div>
                    ) : (
                        settings.map((s) => (
                            <ModuleRow
                                key={s.key}
                                setting={s}
                                canWrite={canWrite}
                                isSubmitting={isSubmitting}
                                onToggle={handleToggle}
                            />
                        ))
                    )}
                </div>

                <p className="text-[10px] text-[#8A817C] font-light">
                    Required modules are core features and cannot be disabled.
                    Changes take effect immediately and are recorded in the audit trail.
                </p>
            </div>
        );
    },
    { requiredPermission: "admin:read" }
);

export default SystemSettingsPage;
