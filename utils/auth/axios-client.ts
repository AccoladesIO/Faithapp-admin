import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { tokenStore } from "./token-store";

type RetriableConfig = InternalAxiosRequestConfig & {
    _retry?: boolean;
    _skipAuth?: boolean;
};

export type AuthPayload = {
    token_type: string;
    expires_in: number;
    access_token: string;
    refresh_token?: string; // present only for mobile (MEMBER surface)
    requires_password_change?: boolean;
};

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const cfg = config as RetriableConfig;
    const t = tokenStore.get();
    if (t?.accessToken && !cfg._skipAuth) {
        config.headers.Authorization = `Bearer ${t.accessToken}`;
    }
    return config;
});

export const commitAuthPayload = (payload: AuthPayload) => {
    const expiresAt = Date.now() + payload.expires_in * 1000;
    tokenStore.set({ accessToken: payload.access_token, expiresAt });
    const expiresAtTime = new Date(expiresAt).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
    console.log(
        `[Auth ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}]`,
        `💾 Token committed — expires_in: ${payload.expires_in}s — expires at: ${expiresAtTime}`
    );
};

let refreshPromise: Promise<string> | null = null;

const doRefresh = async (): Promise<string> => {
    console.log(
        `[Auth ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}]`,
        "📡 Sending refresh request to /auth/refresh..."
    );

    // The httpOnly cookie is sent automatically via withCredentials — no manual token needed
    const res = await axios.post(
        `${api.defaults.baseURL}/auth/refresh`,
        {},
        { withCredentials: true }
    );

    const payload: AuthPayload = res.data?.data;
    if (!payload?.access_token) throw new Error("Malformed refresh response");
    commitAuthPayload(payload);
    return payload.access_token;
};

export const refreshAccessToken = (): Promise<string> => {
    if (refreshPromise) {
        console.log(
            `[Auth ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}]`,
            "⏳ Refresh already in progress — reusing existing promise"
        );
    } else {
        refreshPromise = doRefresh().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
};

api.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
        const config = error.config as RetriableConfig | undefined;
        if (!config || config._retry || config._skipAuth) {
            throw error;
        }
        if (error.response?.status === 401) {
            console.log(
                `[Auth ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}]`,
                `⚠️  401 on ${config.url} — attempting token refresh before retry`
            );
            config._retry = true;
            try {
                const newToken = await refreshAccessToken();
                config.headers.set('Authorization', `Bearer ${newToken}`);
                console.log(
                    `[Auth ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}]`,
                    `🔁 Retrying ${config.url} with new token`
                );
                return api(config);
            } catch (refreshErr) {
                console.log(
                    `[Auth ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}]`,
                    "❌ Refresh failed on 401 retry — clearing session"
                );
                tokenStore.clear();
                throw refreshErr;
            }
        }
        throw error;
    }
);
