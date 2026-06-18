const SESSION_KEY = "dc_rt";

type Tokens = {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
};

let tokens: Tokens | null = null;
const listeners = new Set<(t: Tokens | null) => void>();

export const tokenStore = {
    get: (): Tokens | null => {
        if (tokens) return tokens;
        const rt = sessionStorage.getItem(SESSION_KEY);
        if (!rt) return null;
        return { accessToken: "", refreshToken: rt, expiresAt: 0 };
    },

    set: (next: Tokens | null) => {
        tokens = next;
        if (next) {
            sessionStorage.setItem(SESSION_KEY, next.refreshToken);
        } else {
            sessionStorage.removeItem(SESSION_KEY);
        }
        listeners.forEach((l) => l(next));
    },

    clear: () => {
        tokens = null;
        sessionStorage.removeItem(SESSION_KEY);
        listeners.forEach((l) => l(null));
    },

    subscribe: (fn: (t: Tokens | null) => void) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
    },
};