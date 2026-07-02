"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { authService } from "@/utils/auth/auth";
import { useToast } from "@/context/toast-context";
import {
    X,
    Eye,
    EyeOff,
    Users,
    Wallet,
    CalendarDays,
    Bell,
    BarChart3,
    Building2,
    Lock,
} from "lucide-react";

const APP_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME ?? "Discovery Hub";
const CHURCH_NAME = process.env.NEXT_PUBLIC_CHURCH_NAME ?? "Your Church";
const LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL ?? null;

type ResetStep = "request" | "verify";

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
    const { success, error } = useToast();
    const [step, setStep] = useState<ResetStep>("request");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await authService.forgotPassword(email);
            setStep("verify");
        } catch (err: any) {
            error(err?.response?.data?.message || "Could not send reset code. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await authService.resetPassword(email, otp, newPassword);
            success("Password reset successfully. You can now log in.");
            onClose();
        } catch (err: any) {
            error(err?.response?.data?.message || "Invalid code or password. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-6"
            onClick={onClose}
        >
            <div
                className="bg-white border border-[#121212]/10 w-full max-w-sm p-8 space-y-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-widest text-[#121212]">
                            {step === "request" ? "Reset Password" : "Confirm Reset"}
                        </h2>
                        <p className="text-[11px] text-[#8A817C] mt-1 font-light">
                            {step === "request"
                                ? "Enter your email — a 6-digit code will be sent."
                                : `Code sent to ${email}. Enter it below with your new password.`}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 text-[#8A817C] hover:text-[#121212] transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {step === "request" ? (
                    <form onSubmit={handleRequest} className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                disabled={isLoading}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] disabled:opacity-50"
                                style={{ borderRadius: "0px" }}
                            />
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLoading}
                                className="flex-1 h-10 text-xs font-semibold uppercase tracking-widest border border-[#121212]/10 text-[#121212] hover:bg-[#F4F1EA] disabled:opacity-50 transition-colors"
                                style={{ borderRadius: "0px" }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 disabled:opacity-50 transition-colors"
                                style={{ borderRadius: "0px" }}
                            >
                                {isLoading ? "Sending…" : "Send Code"}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleReset} className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Reset Code
                            </label>
                            <input
                                type="text"
                                required
                                maxLength={6}
                                pattern="\d{6}"
                                disabled={isLoading}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                placeholder="123456"
                                className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] disabled:opacity-50 tracking-[0.25em]"
                                style={{ borderRadius: "0px" }}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                New Password
                            </label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                disabled={isLoading}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] disabled:opacity-50"
                                style={{ borderRadius: "0px" }}
                            />
                            <p className="text-[10px] text-[#8A817C] mt-1.5 font-light">
                                Min. 8 characters · uppercase · number · special (@$!%*?&amp;)
                            </p>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setStep("request")}
                                disabled={isLoading}
                                className="flex-1 h-10 text-xs font-semibold uppercase tracking-widest border border-[#121212]/10 text-[#121212] hover:bg-[#F4F1EA] disabled:opacity-50 transition-colors"
                                style={{ borderRadius: "0px" }}
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 disabled:opacity-50 transition-colors"
                                style={{ borderRadius: "0px" }}
                            >
                                {isLoading ? "Resetting…" : "Reset Password"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showForgot, setShowForgot] = useState(false);

    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { requiresPasswordChange, permissions: perms } = await login(email, password);
            if (requiresPasswordChange) {
                router.push("/change-password");
                return;
            }
            const { getFirstAccessibleRoute } = await import("@/utils/auth/first-route");
            router.push(getFirstAccessibleRoute(perms) ?? "/dashboard");
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                err?.message ||
                "Invalid administrative credentials."
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-screen h-screen flex select-none">
            {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

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
                        <img
                            src={LOGO_URL}
                            alt={CHURCH_NAME}
                            className="h-12 w-auto mb-8 object-contain"
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

                    <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-4">
                        What you can manage
                    </p>
                    <ul className="grid grid-cols-2 gap-3">
                        {[
                            { Icon: Users,        label: "Members",      color: "text-amber-400",  bg: "bg-amber-400/10" },
                            { Icon: Wallet,       label: "Finance",      color: "text-emerald-400",bg: "bg-emerald-400/10" },
                            { Icon: CalendarDays, label: "Events",       color: "text-sky-400",    bg: "bg-sky-400/10" },
                            { Icon: Bell,         label: "Announcements",color: "text-violet-400", bg: "bg-violet-400/10" },
                            { Icon: Building2,    label: "Facilities",   color: "text-orange-400", bg: "bg-orange-400/10" },
                            { Icon: BarChart3,    label: "Reports",      color: "text-rose-400",   bg: "bg-rose-400/10" },
                        ].map(({ Icon, label, color, bg }) => (
                            <li
                                key={label}
                                className="flex items-center gap-2.5 border border-white/8 bg-white/[0.03] px-3 py-2.5"
                            >
                                <span className={`${bg} p-1.5 flex-shrink-0`}>
                                    <Icon className={`w-3.5 h-3.5 ${color}`} strokeWidth={2} />
                                </span>
                                <span className="text-[12px] text-white/70 font-medium tracking-wide leading-tight">
                                    {label}
                                </span>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-7 pt-6 border-t border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                            <span className="text-[10px] text-emerald-400/80 uppercase tracking-widest font-semibold">
                                System Active
                            </span>
                        </div>
                        <p className="text-base font-semibold text-white/80 leading-snug">
                            Faithful stewardship —<br />every action is recorded.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right form panel */}
            <div className="flex-1 bg-[#F4F1EA] flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white border border-[#121212]/10 p-10 flex flex-col">

                    {/* Mobile-only church name */}
                    <p className="lg:hidden text-[10px] uppercase tracking-widest font-semibold text-[#8A817C] text-center mb-8">
                        {CHURCH_NAME} &bull; Hub Portal
                    </p>

                    <div className="mb-8">
                        <h2 className="text-lg font-light tracking-tight text-[#121212] uppercase">
                            Sign In
                        </h2>
                        <p className="text-[11px] uppercase tracking-widest text-[#8A817C] mt-1 font-semibold">
                            Administrative credentials required
                        </p>
                    </div>

                    {error && (
                        <div className="bg-[#fdfaf2] border border-dashed border-[#121212]/15 p-4 mb-6 text-xs text-[#121212] font-light">
                            <strong className="block font-semibold uppercase tracking-wider text-[11px] mb-1">
                                Access Denied
                            </strong>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                disabled={isLoading}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] disabled:opacity-50"
                                style={{ borderRadius: "0px" }}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C]">
                                    Security Password
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowForgot(true)}
                                    className="text-[10px] text-[#8A817C] hover:text-[#121212] uppercase tracking-wider transition-colors"
                                >
                                    Forgot password?
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    disabled={isLoading}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-11 px-4 pr-11 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] disabled:opacity-50"
                                    style={{ borderRadius: "0px" }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A817C] hover:text-[#121212] transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 mt-4"
                            style={{ borderRadius: "0px" }}
                        >
                            {isLoading ? "Authenticating..." : "Authorize Access"}
                        </button>
                    </form>

                    {/* Mobile-only footer notice */}
                    <div className="lg:hidden mt-10 text-center">
                        <p className="text-[10px] text-[#8A817C] uppercase tracking-wider">
                            Protected Environment &mdash; System Logs Active
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
