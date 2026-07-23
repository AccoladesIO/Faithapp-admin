import { useState, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

type ApiError = { response?: { data?: { message?: string } }; message?: string };

export type GameStatus = "DRAFT" | "LIVE_SESSION_ACTIVE" | "ARCHIVED";
export type GameSessionStatus = "SCHEDULED" | "LIVE" | "ENDED";

export interface Game {
    id: string;
    title: string;
    description: string | null;
    status: GameStatus;
    department: { id: string; name: string } | null;
    churchClass: { id: string; name: string } | null;
    createdAt: string;
    updatedAt: string;
}

export interface GamePagination {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
}

export interface GameQuestion {
    id: string;
    order: number;
    questionText: string;
    options: string[];
    correctOptionIndex: number;
    points: number;
    timeLimitSeconds: number;
}

export interface GameSession {
    id: string;
    sessionCode: string;
    status: GameSessionStatus;
    currentQuestionIndex: number | null;
    startedAt: string | null;
    endedAt: string | null;
}

export interface PublicGameQuestion {
    id: string;
    order: number;
    questionText: string;
    options: string[];
    timeLimitSeconds: number;
    points: number;
}

export interface LeaderboardEntry {
    participantId: string;
    memberId: string;
    memberName: string;
    totalScore: number;
}

export interface GameSessionStatePayload {
    sessionCode: string;
    status: GameSessionStatus;
    currentQuestionIndex: number | null;
    totalQuestions: number;
    currentQuestion: PublicGameQuestion | null;
    secondsRemaining: number | null;
    answeredCount: number;
    participantCount: number;
    leaderboard: LeaderboardEntry[];
}

export interface GamePayload {
    title: string;
    description?: string;
    departmentId?: string;
    churchClassId?: string;
}

export interface QuestionPayload {
    questionText: string;
    options: string[];
    correctOptionIndex: number;
    points?: number;
    timeLimitSeconds?: number;
}

export function useGames(defaultLimit = 20) {
    const [games, setGames] = useState<Game[]>([]);
    const [pagination, setPagination] = useState<GamePagination | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchGames = useCallback(async (page = 1) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/admin/games?page=${page}&limit=${defaultLimit}`);
            const outer = res.data?.data;
            const list: Game[] = Array.isArray(outer?.data) ? outer.data : [];
            setGames(list);
            setPagination({
                page: outer?.page ?? page,
                limit: outer?.limit ?? defaultLimit,
                totalCount: outer?.totalCount ?? list.length,
                totalPages: outer?.totalPages ?? 1,
            });
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch games.");
        } finally {
            setIsLoading(false);
        }
    }, [defaultLimit]);

    const createGame = useCallback(async (payload: GamePayload): Promise<Game | null> => {
        setIsSaving(true);
        setError(null);
        try {
            const res = await api.post("/admin/games", payload);
            const created: Game = res.data?.data ?? res.data;
            setGames((prev) => [created, ...prev]);
            return created;
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to create game.");
            return null;
        } finally {
            setIsSaving(false);
        }
    }, []);

    const updateGame = useCallback(async (id: string, payload: Partial<GamePayload>): Promise<boolean> => {
        setIsSaving(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/games/${id}`, payload);
            const updated: Game = res.data?.data ?? res.data;
            setGames((prev) => prev.map((g) => (g.id === id ? updated : g)));
            return true;
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to update game.");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, []);

    const deleteGame = useCallback(async (id: string): Promise<boolean> => {
        setIsSaving(true);
        setError(null);
        try {
            await api.delete(`/admin/games/${id}`);
            setGames((prev) => prev.filter((g) => g.id !== id));
            return true;
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to delete game.");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, []);

    return { games, pagination, isLoading, isSaving, error, fetchGames, createGame, updateGame, deleteGame };
}

export function useGameDetail(gameId: string | null) {
    const [game, setGame] = useState<Game | null>(null);
    const [questions, setQuestions] = useState<GameQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        if (!gameId) return;
        setIsLoading(true);
        setError(null);
        try {
            const [gameRes, questionsRes] = await Promise.all([
                api.get(`/admin/games/${gameId}`),
                api.get(`/admin/games/${gameId}/questions`),
            ]);
            setGame(gameRes.data?.data ?? gameRes.data);
            setQuestions(questionsRes.data?.data ?? questionsRes.data ?? []);
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to fetch game.");
        } finally {
            setIsLoading(false);
        }
    }, [gameId]);

    const addQuestion = useCallback(async (payload: QuestionPayload): Promise<boolean> => {
        if (!gameId) return false;
        setIsSaving(true);
        setError(null);
        try {
            const res = await api.post(`/admin/games/${gameId}/questions`, payload);
            const created: GameQuestion = res.data?.data ?? res.data;
            setQuestions((prev) => [...prev, created]);
            return true;
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to add question.");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [gameId]);

    const updateQuestion = useCallback(async (questionId: string, payload: Partial<QuestionPayload>): Promise<boolean> => {
        setIsSaving(true);
        setError(null);
        try {
            const res = await api.patch(`/admin/games/questions/${questionId}`, payload);
            const updated: GameQuestion = res.data?.data ?? res.data;
            setQuestions((prev) => prev.map((q) => (q.id === questionId ? updated : q)));
            return true;
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to update question.");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, []);

    const deleteQuestion = useCallback(async (questionId: string): Promise<boolean> => {
        setIsSaving(true);
        setError(null);
        try {
            await api.delete(`/admin/games/questions/${questionId}`);
            setQuestions((prev) => prev.filter((q) => q.id !== questionId));
            return true;
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to delete question.");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, []);

    const reorderQuestions = useCallback(async (questionIds: string[]): Promise<boolean> => {
        if (!gameId) return false;
        setIsSaving(true);
        setError(null);
        try {
            const res = await api.put(`/admin/games/${gameId}/questions/reorder`, { questionIds });
            setQuestions(res.data?.data ?? res.data ?? []);
            return true;
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to reorder questions.");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [gameId]);

    const startSession = useCallback(async (): Promise<GameSession | null> => {
        if (!gameId) return null;
        setIsSaving(true);
        setError(null);
        try {
            const res = await api.post(`/admin/games/${gameId}/start`);
            return res.data?.data ?? res.data;
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to start session.");
            return null;
        } finally {
            setIsSaving(false);
        }
    }, [gameId]);

    return {
        game, questions, isLoading, isSaving, error,
        fetchAll, addQuestion, updateQuestion, deleteQuestion, reorderQuestions, startSession,
    };
}

export function useGameSessionControl(sessionCode: string | null) {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const nextQuestion = useCallback(async (): Promise<GameSessionStatePayload | null> => {
        if (!sessionCode) return null;
        setIsSaving(true);
        setError(null);
        try {
            const res = await api.post(`/admin/games/sessions/${sessionCode}/next-question`);
            return res.data?.data ?? res.data;
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to advance question.");
            return null;
        } finally {
            setIsSaving(false);
        }
    }, [sessionCode]);

    const endSession = useCallback(async (): Promise<GameSessionStatePayload | null> => {
        if (!sessionCode) return null;
        setIsSaving(true);
        setError(null);
        try {
            const res = await api.post(`/admin/games/sessions/${sessionCode}/end`);
            return res.data?.data ?? res.data;
        } catch (err: unknown) {
            const e = err as ApiError;
            setError(e?.response?.data?.message || e?.message || "Failed to end session.");
            return null;
        } finally {
            setIsSaving(false);
        }
    }, [sessionCode]);

    const fetchState = useCallback(async (): Promise<GameSessionStatePayload | null> => {
        if (!sessionCode) return null;
        try {
            const res = await api.get(`/admin/games/sessions/${sessionCode}/state`);
            return res.data?.data ?? res.data;
        } catch {
            return null;
        }
    }, [sessionCode]);

    return { isSaving, error, nextQuestion, endSession, fetchState };
}
