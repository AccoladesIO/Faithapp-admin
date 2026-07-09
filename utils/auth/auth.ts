import { api, commitAuthPayload, refreshAccessToken, AuthPayload } from "./axios-client";
import { tokenStore } from "./token-store";

declare module 'axios' {
    interface InternalAxiosRequestConfig {
        _skipAuth?: boolean;
    }
    interface AxiosRequestConfig {
        _skipAuth?: boolean;
    }
}

export type LoginResult = {
    requiresPasswordChange: boolean;
};

export class VerifyUser {
    checkUserSession(callback: (isActive: boolean) => void): void {
        const current = tokenStore.get();

        // Valid in-memory session — no network call needed
        if (current?.accessToken && current.expiresAt > Date.now()) {
            callback(true);
            return;
        }

        // No in-memory session — attempt refresh; httpOnly cookie is sent automatically
        refreshAccessToken()
            .then(() => callback(true))
            .catch(() => callback(false));
    }

    checkUserRole(): void {
        // Role logic here
    }

    async login(email: string, password: string): Promise<LoginResult> {
        const res = await api.post(
            "/auth/admin-login",
            { email, password },
            { _skipAuth: true }
        );
        const payload: AuthPayload = res.data?.data;
        if (!payload?.access_token) {
            throw new Error("Malformed login response");
        }
        commitAuthPayload(payload);
        return { requiresPasswordChange: !!payload.requires_password_change };
    }

    async forgotPassword(email: string): Promise<void> {
        await api.post("/auth/forgot-password", { email }, { _skipAuth: true });
    }

    async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
        await api.post("/auth/reset-password", { email, otp, newPassword }, { _skipAuth: true });
    }

    async changePassword(oldPassword: string, newPassword: string, confirmPassword: string): Promise<void> {
        await api.post("/auth/change-password", { oldPassword, newPassword, confirmPassword });
    }

    async logout(): Promise<void> {
        const current = tokenStore.get();
        if (!current?.accessToken) {
            tokenStore.clear();
            return;
        }

        try {
            await api.post(
                "/auth/logout",
                {},
                {
                    _skipAuth: true,
                    headers: {
                        Authorization: `Bearer ${current.accessToken}`,
                    },
                }
            );
        } catch {
        } finally {
            tokenStore.clear();
        }
    }
}

export const authService = new VerifyUser();
