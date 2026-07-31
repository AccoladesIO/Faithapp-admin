"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html lang="en">
            <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#121212" }}>
                <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
                    <div style={{ maxWidth: 380, width: "100%", background: "#fff", border: "1px solid rgba(18,18,18,0.1)", borderRadius: 12, padding: 32, textAlign: "center" }}>
                        <h1 style={{ fontSize: 18, fontWeight: 300, margin: 0 }}>Something went wrong</h1>
                        <p style={{ fontSize: 12, color: "#8A817C", marginTop: 10, lineHeight: 1.6 }}>
                            The application failed to load. Please try again.
                        </p>
                        <button
                            onClick={() => reset()}
                            style={{
                                marginTop: 20, height: 40, padding: "0 20px", background: "#121212", color: "#fff",
                                fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
                                border: "none", borderRadius: 8, cursor: "pointer",
                            }}
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
