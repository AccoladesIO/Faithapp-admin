"use client";

import { useState } from "react";
import { Mail, X, Send, Check } from "lucide-react";

interface Props {
    onExport: (recipientEmail?: string) => Promise<void>;
    label?: string;
}

export function EmailReportButton({ onExport, label = "Email Report" }: Props) {
    const [open, setOpen] = useState(false);
    const [recipientEmail, setRecipientEmail] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const close = () => {
        setOpen(false);
        setRecipientEmail("");
        setError(null);
        setSent(false);
    };

    const handleSend = async () => {
        setIsSending(true);
        setError(null);
        try {
            await onExport(recipientEmail.trim() || undefined);
            setSent(true);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            setError(e?.response?.data?.message || e?.message || "Failed to send report.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="h-9 px-4 border border-[#121212]/10 text-[#8A817C] hover:text-[#121212] text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5"
            >
                <Mail className="w-3.5 h-3.5" />
                {label}
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4"
                    onClick={close}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl border border-[#121212]/10 w-full max-w-sm p-6 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C] mb-0.5">
                                    Export
                                </div>
                                <h3 className="text-sm font-semibold text-[#121212]">Email this report</h3>
                            </div>
                            <button
                                type="button"
                                onClick={close}
                                className="p-1.5 text-[#8A817C] hover:text-[#121212] border border-[#121212]/5 hover:border-[#121212]/20 rounded-md transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {sent ? (
                            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 text-green-700 rounded-lg text-xs">
                                <Check className="w-4 h-4 shrink-0" />
                                <span>Report queued — it&rsquo;ll arrive in the inbox shortly.</span>
                            </div>
                        ) : (
                            <>
                                <p className="text-xs text-[#8A817C] font-light">
                                    Sends the current filtered view as a spreadsheet. Leave blank to send to your own email.
                                </p>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                                        Recipient (optional)
                                    </label>
                                    <input
                                        type="email"
                                        value={recipientEmail}
                                        onChange={(e) => setRecipientEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] rounded-lg"
                                    />
                                </div>
                                {error && (
                                    <div className="p-2.5 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs">
                                        {error}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={handleSend}
                                    disabled={isSending}
                                    className="w-full h-10 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    {isSending ? "Sending…" : "Send"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
