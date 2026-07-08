"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authService } from "@/utils/auth/auth";
import { useToast } from "@/context/toast-context";
import { Eye, EyeOff, ShieldCheck, KeyRound, CheckCircle2, Lock } from "lucide-react";
import { DismissibleError } from "@/components/ui/dismissible-error";

type ApiError = { response?: { status?: number; data?: { message?: string } }; message?: string };

const APP_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME ?? "Discovery Hub";
const CHURCH_NAME = process.env.NEXT_PUBLIC_CHURCH_NAME ?? "Your Church";
const LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL ?? null;

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

    useEffect(() => {
        if (!sessionStorage.getItem('requires_pw_change')) {
            router.replace('/dashboard');
        }
    }, [router]);

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
            sessionStorage.removeItem('requires_pw_change');
            success("Password updated. You can now access the portal.");
            router.replace("/dashboard");
        } catch (err: unknown) {
            const e = err as ApiError;
            if (e?.response?.status === 401) {
                sessionStorage.removeItem('requires_pw_change');
                router.replace('/');
                return;
            }
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Could not update password. Please try again."
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-screen h-screen flex select-none">
            {/* Left branding panel — hidden on mobile */}
            <div
                className="hidden lg:flex lg:w-[400px] xl:w-[460px] flex-shrink-0 bg-[#121212] flex-col justify-center p-12 relative overflow-hidden"
                style={{
                    backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                }}
            >
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                {/* Large faded lock watermark */}
                <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 pointer-events-none select-none">
                    <Lock className="w-72 h-72 text-white/[0.025]" strokeWidth={0.75} />
                </div>

                <div className="relative flex flex-col gap-0">
                    {LOGO_URL && (
                        <Image
                            src={LOGO_URL}
                            alt={CHURCH_NAME}
                            className="h-12 w-auto mb-8 object-contain"
                            width={200}
                            height={48}
                        />
                    )}

                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-semibold mb-2">
                        Administrative Portal
                    </p>
                    <h1 className="text-4xl font-bold text-white tracking-tight leading-tight">
                        {APP_NAME}
                    </h1>
                    <p className="text-sm text-white/40 font-light mt-2">
                        {CHURCH_NAME}
                    </p>

                    <div className="my-7 h-px bg-white/10" />

                    <div className="flex items-center gap-3 mb-5">
                        <span className="bg-amber-400/10 p-2 flex-shrink-0">
                            <KeyRound className="w-4 h-4 text-amber-400" strokeWidth={2} />
                        </span>
                        <div>
                            <p className="text-xs font-semibold text-white/80 uppercase tracking-widest">
                                First-time setup
                            </p>
                            <p className="text-[11px] text-white/40 font-light mt-0.5 leading-relaxed">
                                A new password is required before you can access the portal.
                            </p>
                        </div>
                    </div>

                    <ul className="space-y-3">
                        {[
                            "Enter the temporary password sent to you",
                            "Choose a strong new password",
                            "Gain full access to your portal",
                        ].map((step, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full border border-white/15 flex items-center justify-center mt-0.5">
                                    <span className="text-[9px] font-bold text-white/40">{i + 1}</span>
                                </span>
                                <span className="text-[12px] text-white/50 font-light leading-relaxed">
                                    {step}
                                </span>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-7 pt-6 border-t border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80" strokeWidth={2} />
                            <span className="text-[10px] text-emerald-400/80 uppercase tracking-widest font-semibold">
                                Secure Channel
                            </span>
                        </div>
                        <p className="text-base font-semibold text-white/80 leading-snug">
                            Your account is protected —<br />all actions are recorded.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right form panel */}
            <div className="flex-1 bg-[#F4F1EA] flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white border border-[#121212]/10 p-10 flex flex-col gap-8">

                    {/* Mobile-only brand header */}
                    <div
                        className="lg:hidden -mx-10 -mt-10 bg-[#121212] px-8 py-6 relative overflow-hidden"
                        style={{
                            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)",
                            backgroundSize: "28px 28px",
                        }}
                    >
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        {LOGO_URL && (
                            <Image
                                src={LOGO_URL}
                                alt={CHURCH_NAME}
                                className="h-8 w-auto mb-3 object-contain"
                                width={160}
                                height={32}
                            />
                        )}
                        <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-semibold mb-1">
                            Administrative Portal
                        </p>
                        <h2 className="text-xl font-bold text-white tracking-tight leading-tight">
                            {APP_NAME}
                        </h2>
                        <p className="text-xs text-white/40 font-light mt-0.5">
                            {CHURCH_NAME}
                        </p>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-amber-50 border border-amber-200 flex-shrink-0">
                            <KeyRound className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#121212]">
                                Password Change Required
                            </h2>
                            <p className="text-[11px] text-[#8A817C] mt-1 font-light leading-relaxed">
                                Enter your temporary password and choose a new one to access the portal.
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
                            <ul className="mt-2 space-y-1">
                                {([
                                    { label: 'At least 8 characters', met: newPassword.length >= 8 },
                                    { label: 'Uppercase letter', met: /[A-Z]/.test(newPassword) },
                                    { label: 'Number', met: /[0-9]/.test(newPassword) },
                                    { label: 'Special character (@$!%*?&)', met: /[@$!%*?&]/.test(newPassword) },
                                ] as { label: string; met: boolean }[]).map(({ label, met }) => (
                                    <li key={label} className={`text-[10px] font-light flex items-center gap-1.5 ${met ? 'text-emerald-600' : 'text-[#8A817C]'}`}>
                                        <CheckCircle2 className={`w-3 h-3 shrink-0 ${met ? 'text-emerald-500' : 'text-[#8A817C]/30'}`} />
                                        {label}
                                    </li>
                                ))}
                            </ul>
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
                            {confirmPassword && newPassword && (
                                <p className={`text-[10px] mt-1.5 font-light flex items-center gap-1 ${newPassword === confirmPassword ? "text-emerald-600" : "text-red-500"}`}>
                                    <CheckCircle2 className="w-3 h-3" />
                                    {newPassword === confirmPassword ? "Passwords match" : "Passwords do not match"}
                                </p>
                            )}
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

                    <p className="text-center text-[10px] text-[#8A817C] uppercase tracking-wider">
                        {CHURCH_NAME} &bull; Administrative Portal
                    </p>
                </div>
            </div>
        </div>
    );
}
