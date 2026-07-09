type Tokens = {
    accessToken: string;
    expiresAt: number;
};

let tokens: Tokens | null = null;
const listeners = new Set<(t: Tokens | null) => void>();

export const tokenStore = {
    get: (): Tokens | null => tokens,

    set: (next: Tokens | null) => {
        tokens = next;
        listeners.forEach((l) => l(next));
    },

    clear: () => {
        tokens = null;
        listeners.forEach((l) => l(null));
    },

    subscribe: (fn: (t: Tokens | null) => void) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
    },
};
