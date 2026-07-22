"use client";

import React, { useState } from "react";
import { withAuth } from "@/utils/auth/with-auth";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, CheckCircle2 } from "lucide-react";
import { useCreateMember, CreateMemberPayload } from "@/hooks/use-member";
import { DismissibleError } from "@/components/ui/dismissible-error";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

function NewMemberPage() {
    const router = useRouter();
    const { isSubmitting, createMember } = useCreateMember();

    const [form, setForm] = useState<CreateMemberPayload>({
        firstname: "",
        lastname: "",
        email: "",
        phoneNumber: "",
    });
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<{ firstname: string; lastname: string; email: string } | null>(null);

    const canSubmit =
        form.firstname.trim() && form.lastname.trim() && form.email.trim() && !isSubmitting;

    const handleSubmit = async () => {
        setError(null);
        try {
            const member = await createMember({
                firstname: form.firstname.trim(),
                lastname: form.lastname.trim(),
                email: form.email.trim(),
                phoneNumber: form.phoneNumber?.trim() || undefined,
            });
            setCreated(member);
            setForm({ firstname: "", lastname: "", email: "", phoneNumber: "" });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.message || "Something went wrong.");
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-2xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-lg border border-[#121212]/10 hover:bg-[#F4F1EA] transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 text-[#8A817C]" />
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-[#121212]">New Member</h1>
                    <p className="text-xs text-[#8A817C]">
                        Create an account for a member without a phone or who can&apos;t self-register. They&apos;ll receive a temporary password by email and be asked to set a new one on first login.
                    </p>
                </div>
            </div>

            {created && (
                <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-green-800 text-sm flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                        {created.firstname} {created.lastname} was created and emailed a temporary password at{" "}
                        <span className="font-mono">{created.email}</span>.
                    </span>
                </div>
            )}

            <DismissibleError message={error} />

            <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-6 space-y-5">
                <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-[#8A817C]" />
                    <h2 className="text-sm font-semibold text-[#121212]">Member Details</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-[#8A817C] uppercase tracking-wider">
                            First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.firstname}
                            onChange={(e) => setForm((f) => ({ ...f, firstname: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-[#121212]/10 rounded-lg bg-[#F4F1EA] text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-[#8A817C] uppercase tracking-wider">
                            Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.lastname}
                            onChange={(e) => setForm((f) => ({ ...f, lastname: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-[#121212]/10 rounded-lg bg-[#F4F1EA] text-[#121212] focus:outline-none focus:ring-1 focus:ring-[#121212]/20"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-[#8A817C] uppercase tracking-wider">
                        Email <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="email"
                        placeholder="member@example.com"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-[#121212]/10 rounded-lg bg-[#F4F1EA] text-[#121212] placeholder:text-[#8A817C] focus:outline-none focus:ring-1 focus:ring-[#121212]/20"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-[#8A817C] uppercase tracking-wider">
                        Phone Number <span className="text-[#8A817C] font-normal">(optional)</span>
                    </label>
                    <input
                        type="tel"
                        placeholder="e.g. +2348012345678"
                        value={form.phoneNumber}
                        onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-[#121212]/10 rounded-lg bg-[#F4F1EA] text-[#121212] placeholder:text-[#8A817C] focus:outline-none focus:ring-1 focus:ring-[#121212]/20"
                    />
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#121212] text-white text-sm font-medium hover:bg-[#121212]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    {isSubmitting ? "Creating..." : "Create Member"}
                </button>
            </div>
        </div>
    );
}

export default withAuth(NewMemberPage, { requiredPermission: 'members:write' });
