"use client";

import React, { useState } from "react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const payload = {
            email: email,
            password: password,
        };

        try {
            // const response = await fetch("/api/auth/login", {
            //     method: "POST",
            //     headers: {
            //         "Content-Type": "application/json",
            //     },
            //     body: JSON.stringify(payload),
            // });

            // if (!response.ok) {
            //     throw new Error("Invalid administrative credentials.");
            // }

            window.location.href = "/dashboard";
        } catch (err: any) {
            setError(err.message || "An authentication error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-screen h-screen bg-[#F4F1EA] flex items-center justify-center p-6 select-none">
            <div className="w-full max-w-md bg-[#FFFFFF] border border-[#121212]/10 p-10 flex flex-col">
                <div className="flex flex-col items-center mb-10 text-center">
                    {/* <img
                        src="https://i.ibb.co/cX1MnZ5z/DC-LOGO.png"
                        alt="RCCG Discovery Centre Logo"
                        className="w-16 h-8 object-contain mb-4"
                    /> */}
                    <h1 className="text-xl font-light tracking-tight text-[#121212] uppercase">
                        Administrative Login
                    </h1>
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-[#8A817C] mt-1">
                        RCCG Discovery Centre &bull; Hub Portal
                    </p>
                </div>

                {error && (
                    <div className="bg-[#fdfaf2] border border-dashed border-[#121212]/15 p-4 mb-6 text-xs text-[#121212] font-light">
                        <strong className="block font-semibold uppercase tracking-wider text-[11px] mb-1">
                            Access Denied
                        </strong>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            required
                            disabled={isLoading}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] disabled:opacity-50"
                            style={{ borderRadius: "0px" }}
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#8A817C] mb-2">
                            Security Password
                        </label>
                        <input
                            type="password"
                            required
                            disabled={isLoading}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-11 px-4 bg-[#F4F1EA]/40 border border-[#121212]/10 text-sm text-[#121212] font-light focus:outline-none focus:border-[#121212] disabled:opacity-50"
                            style={{ borderRadius: "0px" }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 bg-[#121212] text-[#FFFFFF] text-xs font-semibold uppercase tracking-widest hover:bg-[#121212]/90 transition-colors disabled:opacity-50 mt-4"
                        style={{ borderRadius: "0px" }}
                    >
                        {isLoading ? "Authenticating..." : "Authorize Access"}
                    </button>
                </form>

                <div className="mt-12 text-center">
                    <p className="text-[10px] text-[#8A817C] uppercase tracking-wider">
                        Protected Environment &mdash; System Logs Active
                    </p>
                </div>
            </div>
        </div>
    );
}