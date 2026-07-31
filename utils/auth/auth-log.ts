// Verbose auth-flow tracing (token refresh, login, logout) — useful in dev,
// noisy in a production browser console. Gated on NODE_ENV rather than a
// runtime flag since these are build-time-inlined NEXT_PUBLIC-style checks.
export function authLog(message: string) {
    if (process.env.NODE_ENV === "production") return;
    const time = new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
    console.log(`[Auth ${time}]`, message);
}
