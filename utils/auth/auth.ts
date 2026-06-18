import { api, commitAuthPayload, refreshAccessToken, AuthPayload } from "./axios-client";
import { tokenStore } from "./token-store";

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

        // No session at all
        if (!current?.refreshToken) {
            callback(false);
            return;
        }

        // Reload case — refresh token in sessionStorage, access token gone
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
            { _skipAuth: true } as any
        );
        const payload: AuthPayload = res.data?.data;
        if (!payload?.access_token) {
            throw new Error("Malformed login response");
        }
        commitAuthPayload(payload);
        return { requiresPasswordChange: !!payload.requires_password_change };
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
                } as any
            );
        } catch {
        } finally {
            tokenStore.clear();
        }
    }
}

export const authService = new VerifyUser();