"use client";

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { useRouter } from "next/navigation";
import { tokenStore } from "@/utils/auth/token-store";
import { authService, LoginResult } from "@/utils/auth/auth";
import { refreshAccessToken } from "@/utils/auth/axios-client";

type AuthState = {
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<LoginResult>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);
const REFRESH_LEAD_MS = 60 * 1000;

const log = (label: string, detail?: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
    const base = `[Auth ${time}] ${label}`;
    console.log(detail ? `${base} — ${detail}` : base);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const router = useRouter();

    const clearTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const scheduleRefresh = useCallback(() => {
        clearTimer();
        const t = tokenStore.get();
        if (!t) return;

        const now = Date.now();
        const delay = t.expiresAt - now - REFRESH_LEAD_MS;

        const expiresAt = new Date(t.expiresAt).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
        const refreshAt = new Date(t.expiresAt - REFRESH_LEAD_MS).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });

        log(
            "⏱  Refresh scheduled",
            delay > 0
                ? `token expires at ${expiresAt} — refresh fires at ${refreshAt} (in ${Math.round(delay / 1000)}s)`
                : `token already near/past expiry — refreshing immediately`
        );

        const run = async () => {
            log("🔄 Refreshing access token...");
            try {
                await refreshAccessToken();
                const fresh = tokenStore.get();
                const newExpiresAt = fresh
                    ? new Date(fresh.expiresAt).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                    })
                    : "unknown";
                log("✅ Token refreshed", `new token expires at ${newExpiresAt}`);
            } catch {
                log("❌ Token refresh failed — clearing session and redirecting to login");
                tokenStore.clear();
                router.push("/");
            }
        };

        if (delay <= 0) run();
        else timerRef.current = setTimeout(run, delay);
    }, [router]);

    useEffect(() => {
        const unsub = tokenStore.subscribe((t) => {
            if (t) {
                const expiresAt = new Date(t.expiresAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                });
                log("🔑 Token stored", `expires at ${expiresAt}`);
                setIsAuthenticated(true);
                scheduleRefresh();
            } else {
                log("🚪 Token cleared — user is unauthenticated");
                setIsAuthenticated(false);
                clearTimer();
            }
        });
        return () => {
            unsub();
            clearTimer();
        };
    }, [scheduleRefresh]);

    useEffect(() => {
        log("🔍 Checking session on mount...");
        authService.checkUserSession((isActive) => {
            log(
                isActive ? "✅ Session valid" : "❌ No valid session",
                isActive ? "user remains authenticated" : "redirecting to login"
            );
            setIsAuthenticated(isActive);
            setIsLoading(false);
        });
    }, []);

    const login = useCallback(
        (email: string, password: string) => {
            log("🔐 Login attempt...");
            return authService.login(email, password);
        },
        []
    );

    const logout = useCallback(async () => {
        log("🚪 Logout initiated");
        await authService.logout();
        log("✅ Logout complete — redirecting to login");
        router.push("/");
    }, [router]);

    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthState {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}