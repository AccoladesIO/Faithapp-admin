"use client";

import { useState, useRef } from "react";
import { X, RefreshCw } from "lucide-react";
import { api } from "@/utils/auth/axios-client";
import { OverrideSlotPayload } from "@/hooks/use-service-session";

interface MemberResult {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
}

interface SlotEditModalProps {
    topic: string;
    speakerLabel: string;
    isSubmitting: boolean;
    onSave: (dto: OverrideSlotPayload) => Promise<void>;
    onClose: () => void;
}

export function SlotEditModal({ topic, speakerLabel, isSubmitting, onSave, onClose }: Readonly<SlotEditModalProps>) {
    const [topicValue, setTopicValue] = useState(topic);
    const [speakerQuery, setSpeakerQuery] = useState(speakerLabel);
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [results, setResults] = useState<MemberResult[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const doSearch = async (q: string) => {
        if (!q.trim()) { setResults([]); setOpen(false); return; }
        setLoading(true);
        try {
            const res = await api.get(`/members?page=1&limit=8&search=${encodeURIComponent(q)}`);
            const list: MemberResult[] = res.data?.data?.data ?? [];
            setResults(list);
            setOpen(list.length > 0);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSpeakerInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setSpeakerQuery(q);
        setSelectedMemberId(null);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(q), 300);
    };

    const handleSelectMember = (m: MemberResult) => {
        setSelectedMemberId(m.id);
        setSpeakerQuery(`${m.firstname} ${m.lastname}`);
        setResults([]);
        setOpen(false);
    };

    const handleSubmit = async () => {
        const dto: OverrideSlotPayload = { overriddenTopic: topicValue };
        if (selectedMemberId) {
            dto.overriddenMemberId = selectedMemberId;
        } else if (speakerQuery.trim()) {
            dto.overriddenSpeakerName = speakerQuery.trim();
        }
        await onSave(dto);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#121212]">Edit Slot</h3>
                    <button onClick={onClose} className="text-[#8A817C] hover:text-[#121212]">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                        Topic
                    </label>
                    <input
                        value={topicValue}
                        onChange={(e) => setTopicValue(e.target.value)}
                        className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] rounded-lg focus:outline-none focus:border-[#121212]"
                    />
                </div>

                <div className="relative">
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">
                        Minister / Speaker
                    </label>
                    <div className="relative">
                        <input
                            value={speakerQuery}
                            onChange={handleSpeakerInput}
                            onFocus={() => results.length > 0 && setOpen(true)}
                            placeholder="Search a member, or type a guest name…"
                            className="w-full h-10 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] rounded-lg focus:outline-none focus:border-[#121212]"
                        />
                        {loading && (
                            <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A817C] animate-spin" />
                        )}
                    </div>
                    {open && results.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#121212]/10 rounded-xl shadow-lg z-10 overflow-hidden max-h-48 overflow-y-auto">
                            {results.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); handleSelectMember(m); }}
                                    className="w-full text-left px-3 py-2 hover:bg-[#F4F1EA]/60 border-b border-[#121212]/5 last:border-0 transition-colors"
                                >
                                    <div className="text-xs text-[#121212]">{m.firstname} {m.lastname}</div>
                                    <div className="text-[10px] text-[#8A817C] font-mono">{m.email}</div>
                                </button>
                            ))}
                        </div>
                    )}
                    {selectedMemberId && (
                        <p className="text-[10px] text-green-700 mt-1">Linked to a member profile</p>
                    )}
                </div>

                <div className="flex gap-2 pt-1">
                    <button
                        onClick={onClose}
                        className="flex-1 h-9 border border-[#121212]/10 text-[#8A817C] text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !topicValue.trim()}
                        className="flex-1 h-9 bg-[#121212] text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5 hover:bg-[#121212]/90 transition-colors"
                    >
                        {isSubmitting && <RefreshCw className="w-3 h-3 animate-spin" />} Save
                    </button>
                </div>
            </div>
        </div>
    );
}
