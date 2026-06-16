import React from "react";
import Sidebar from "@/components/layout/side-bar";

interface ShellProps {
    children: React.ReactNode;
}

export default function Shell({ children }: ShellProps) {
    return (
        <div className="flex w-screen h-screen overflow-hidden">
            <Sidebar />

            <main className="flex-1 h-full overflow-y-auto flex flex-col min-w-0">
                <header className="h-16 border-b border-[#121212]/10 bg-[#FFFFFF] flex items-center justify-between px-6 shrink-0">
                    <div className="text-xs font-semibold tracking-widest uppercase text-[#8A817C]">
                        Administrative Portal
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <div className="text-xs font-medium text-[#121212]">Admin User</div>
                            <div className="text-[10px] text-[#8A817C] uppercase tracking-wider font-semibold">Dev Team</div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}