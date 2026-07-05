"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/utils/auth/auth";
import { useToast } from "@/context/toast-context";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import { DismissibleError } from "@/components/ui/dismissible-error";

export default function ChangePasswordPage() {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { success } = useToast();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await authService.changePassword(oldPassword, newPassword, confirmPassword);
            success("Password updated. You can now access the portal.");
            router.replace("/dashboard");
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                err?.message ||
                "Could not update password. Please try again."
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-screen h-screen flex items-center justify-center bg-[#F4F1EA] p-6">
            <div className="w-full max-w-md bg-white border border-[#121212]/10 p-10 flex flex-col gap-8">
                <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-amber-50 border border-amber-200">
                        <ShieldAlert className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-widest text-[#121212]">
                            Password Change Required
                        </h2>
                        <p className="text-[11px] text-[#8A817C] mt-1 font-light leading-relaxed">
                            Your account requires a new password before you can continue.
                            Enter your temporary password and choose a new one.
                        </p>
                    </div>
                </div>

                <DismissibleError message={error} />

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                            Current / Temporary Password
                        </label>
                        <div className="relative">
                            <input
                                type={showOld ? "text" : "password"}
                                required
                                disabled={isLoading}
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                className="w-full h-11 px-4 pr-11 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] disabled:opacity-50"
                                style={{ borderRadius: "0px" }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowOld((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A817C] hover:text-[#121212] transition-colors"
                                tabIndex={-1}
                            >
                                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showNew ? "text" : "password"}
                                required
                                minLength={8}
                                disabled={isLoading}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full h-11 px-4 pr-11 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] disabled:opacity-50"
                                style={{ borderRadius: "0px" }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A817C] hover:text-[#121212] transition-colors"
                                tabIndex={-1}
                            >
                                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-[#8A817C] mt-1.5 font-light">
                            Min. 8 characters · uppercase · number · special (@$!%*?&amp;)
                        </p>
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirm ? "text" : "password"}
                                required
                                minLength={8}
                                disabled={isLoading}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full h-11 px-4 pr-11 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] disabled:opacity-50"
                                style={{ borderRadius: "0px" }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A817C] hover:text-[#121212] transition-colors"
                                tabIndex={-1}
                            >
                                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 mt-2"
                        style={{ borderRadius: "0px" }}
                    >
                        {isLoading ? "Updating…" : "Set New Password"}
                    </button>
                </form>
            </div>
        </div>
    );
}
