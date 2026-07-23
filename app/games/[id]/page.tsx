"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { withAuth } from "@/utils/auth/with-auth";
import {
    ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, Radio, Pencil, X,
} from "lucide-react";
import { useGameDetail, GameQuestion, QuestionPayload } from "@/hooks/use-games";
import { DismissibleError } from "@/components/ui/dismissible-error";

const EMPTY_DRAFT: QuestionPayload = {
    questionText: "",
    options: ["", ""],
    correctOptionIndex: 0,
    points: 1000,
    timeLimitSeconds: 20,
};

function QuestionForm({
    draft, setDraft, onSubmit, onCancel, isSaving, submitLabel,
}: Readonly<{
    draft: QuestionPayload;
    setDraft: React.Dispatch<React.SetStateAction<QuestionPayload>>;
    onSubmit: () => void;
    onCancel?: () => void;
    isSaving: boolean;
    submitLabel: string;
}>) {
    function setOption(index: number, value: string) {
        setDraft((p) => ({ ...p, options: p.options.map((o, i) => (i === index ? value : o)) }));
    }
    function addOption() {
        setDraft((p) => ({ ...p, options: [...p.options, ""] }));
    }
    function removeOption(index: number) {
        setDraft((p) => ({
            ...p,
            options: p.options.filter((_, i) => i !== index),
            correctOptionIndex: p.correctOptionIndex >= index && p.correctOptionIndex > 0
                ? p.correctOptionIndex - 1 : p.correctOptionIndex,
        }));
    }

    const canSubmit = draft.questionText.trim().length > 0
        && draft.options.filter((o) => o.trim()).length >= 2
        && draft.correctOptionIndex < draft.options.length;

    return (
        <div className="space-y-3 text-xs">
            <div>
                <label htmlFor="q-text" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Question</label>
                <textarea id="q-text" rows={2} value={draft.questionText} onChange={(e) => setDraft((p) => ({ ...p, questionText: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg resize-none" />
            </div>
            <div>
                <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Options — select the correct one</span>
                <div className="space-y-2">
                    {draft.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setDraft((p) => ({ ...p, correctOptionIndex: i }))}
                                aria-label={`Mark option ${i + 1} correct`}
                                className={`w-6 h-6 shrink-0 rounded-full border flex items-center justify-center transition-colors ${draft.correctOptionIndex === i ? "bg-green-600 border-green-600 text-white" : "border-[#121212]/20 text-transparent"}`}
                            >
                                <Radio className="w-3 h-3" />
                            </button>
                            <input
                                value={opt}
                                onChange={(e) => setOption(i, e.target.value)}
                                placeholder={`Option ${i + 1}`}
                                className="flex-1 h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] placeholder:text-[#8A817C]/60 focus:outline-none focus:border-[#121212] rounded-lg"
                            />
                            {draft.options.length > 2 && (
                                <button type="button" onClick={() => removeOption(i)} className="text-[#8A817C] hover:text-red-600">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                {draft.options.length < 6 && (
                    <button type="button" onClick={addOption} className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#8A817C] hover:text-[#121212]">
                        <Plus className="w-3 h-3" /> Add option
                    </button>
                )}
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="q-points" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Points</label>
                    <input id="q-points" type="number" min={100} max={10000} step={100} value={draft.points}
                        onChange={(e) => setDraft((p) => ({ ...p, points: Number(e.target.value) }))}
                        className="w-full h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg" />
                </div>
                <div>
                    <label htmlFor="q-time" className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A817C] mb-1.5">Time limit (sec)</label>
                    <input id="q-time" type="number" min={5} max={300} value={draft.timeLimitSeconds}
                        onChange={(e) => setDraft((p) => ({ ...p, timeLimitSeconds: Number(e.target.value) }))}
                        className="w-full h-9 px-3 bg-[#F4F1EA]/40 border border-[#121212]/10 text-xs text-[#121212] focus:outline-none focus:border-[#121212] rounded-lg" />
                </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-[#121212]/5">
                <button
                    onClick={onSubmit}
                    disabled={isSaving || !canSubmit}
                    className="h-9 px-5 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#121212]/90 transition-colors disabled:opacity-40"
                >
                    {isSaving ? "Saving…" : submitLabel}
                </button>
                {onCancel && (
                    <button onClick={onCancel} className="h-9 px-4 border border-[#121212]/10 text-xs font-semibold uppercase tracking-wider text-[#8A817C] rounded-lg hover:bg-[#F4F1EA]/50">
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}

function GameQuestionsContent() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const {
        game, questions, isLoading, isSaving, error,
        fetchAll, addQuestion, updateQuestion, deleteQuestion, reorderQuestions, startSession,
    } = useGameDetail(id);

    const [showAddForm, setShowAddForm] = useState(false);
    const [addDraft, setAddDraft] = useState<QuestionPayload>(EMPTY_DRAFT);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState<QuestionPayload>(EMPTY_DRAFT);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    async function handleAdd() {
        const ok = await addQuestion({
            ...addDraft,
            options: addDraft.options.map((o) => o.trim()).filter(Boolean),
        });
        if (ok) {
            setAddDraft(EMPTY_DRAFT);
            setShowAddForm(false);
        }
    }

    function startEdit(q: GameQuestion) {
        setEditingId(q.id);
        setEditDraft({
            questionText: q.questionText,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
            points: q.points,
            timeLimitSeconds: q.timeLimitSeconds,
        });
    }

    async function handleUpdate() {
        if (!editingId) return;
        const ok = await updateQuestion(editingId, {
            ...editDraft,
            options: editDraft.options.map((o) => o.trim()).filter(Boolean),
        });
        if (ok) setEditingId(null);
    }

    async function handleDelete(questionId: string) {
        if (!window.confirm("Delete this question?")) return;
        await deleteQuestion(questionId);
    }

    async function moveQuestion(index: number, direction: -1 | 1) {
        const target = index + direction;
        if (target < 0 || target >= questions.length) return;
        const ids = questions.map((q) => q.id);
        [ids[index], ids[target]] = [ids[target], ids[index]];
        await reorderQuestions(ids);
    }

    async function handleStartSession() {
        const session = await startSession();
        if (session) router.push(`/games/present/${session.sessionCode}`);
    }

    return (
        <div className="space-y-6 font-sans">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/games")} className="w-8 h-8 rounded-full bg-[#F4F1EA] flex items-center justify-center text-[#121212] hover:bg-[#EADCC9] transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-light tracking-tight text-[#121212]">{game?.title ?? "Loading…"}</h1>
                        <p className="text-xs uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                            {questions.length} question{questions.length === 1 ? "" : "s"}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleStartSession}
                    disabled={isSaving || isLoading || questions.length === 0}
                    className="h-9 px-5 bg-red-600 text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40"
                >
                    Start Live Session
                </button>
            </div>

            <DismissibleError message={error} />

            <div className="space-y-3">
                {questions.map((q, i) => (
                    <div key={q.id} className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-4">
                        {editingId === q.id ? (
                            <QuestionForm
                                draft={editDraft}
                                setDraft={setEditDraft}
                                onSubmit={handleUpdate}
                                onCancel={() => setEditingId(null)}
                                isSaving={isSaving}
                                submitLabel="Save"
                            />
                        ) : (
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-[#8A817C] uppercase tracking-wider mb-1">Q{i + 1} — {q.points} pts — {q.timeLimitSeconds}s</p>
                                    <p className="text-sm text-[#121212] font-medium mb-2">{q.questionText}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {q.options.map((opt, oi) => (
                                            <span key={oi} className={`px-2 py-0.5 rounded text-[10px] ${oi === q.correctOptionIndex ? "bg-green-50 text-green-700 font-semibold" : "bg-[#F4F1EA] text-[#8A817C]"}`}>
                                                {opt}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => moveQuestion(i, -1)} disabled={i === 0 || isSaving} aria-label="Move up" className="p-1.5 text-[#8A817C] hover:text-[#121212] disabled:opacity-30">
                                        <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => moveQuestion(i, 1)} disabled={i === questions.length - 1 || isSaving} aria-label="Move down" className="p-1.5 text-[#8A817C] hover:text-[#121212] disabled:opacity-30">
                                        <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => startEdit(q)} aria-label="Edit" className="p-1.5 text-[#8A817C] hover:text-[#121212]">
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDelete(q.id)} aria-label="Delete" className="p-1.5 text-[#8A817C] hover:text-red-600">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {!isLoading && questions.length === 0 && !showAddForm && (
                    <div className="text-center py-12 text-[#8A817C] font-light bg-[#FFFFFF] border border-[#121212]/10 rounded-xl">
                        No questions yet — add your first one below.
                    </div>
                )}

                {showAddForm ? (
                    <div className="bg-[#FFFFFF] border border-[#121212]/10 rounded-xl p-4">
                        <QuestionForm
                            draft={addDraft}
                            setDraft={setAddDraft}
                            onSubmit={handleAdd}
                            onCancel={() => { setShowAddForm(false); setAddDraft(EMPTY_DRAFT); }}
                            isSaving={isSaving}
                            submitLabel="Add Question"
                        />
                    </div>
                ) : (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="w-full flex items-center justify-center gap-1.5 h-11 border border-dashed border-[#121212]/20 text-xs font-semibold uppercase tracking-wider text-[#8A817C] rounded-xl hover:border-[#121212]/40 hover:text-[#121212] transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Question
                    </button>
                )}
            </div>
        </div>
    );
}

const GameQuestionsPage = () => <GameQuestionsContent />;

export default withAuth(GameQuestionsPage, { requiredPermission: "games:write" });
