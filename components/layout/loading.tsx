"use client"

import React, { useEffect, useState } from 'react';

export const LoadingScreen = () => {
    const [motivationalIndex, setMotivationalIndex] = useState(0);

    const REMINDERS = [
        "Preparing your sanctuary space...",
        "Gathering fellowship logs...",
        "Aligning your stewardship ledger...",
        "Taking a step toward the light..."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setMotivationalIndex((prev) => (prev + 1) % REMINDERS.length);
        }, 2200);
        return () => clearInterval(interval);
    }, [REMINDERS.length]);

    return (
        <div className="fixed inset-0 bg-[#FFFFFF] z-50 flex flex-col items-center justify-between p-12 font-sans selection:bg-[#121212] selection:text-[#FFFFFF]">

            <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                <div className="relative flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border border-[#121212]/5 absolute animate-ping duration-1000 opacity-20" />
                    <div className="w-12 h-12 rounded-full border border-[#8A817C]/10 absolute scale-125 animate-pulse" />

                    <div className="w-8 h-8 rounded-full border-2 border-[#121212] border-t-transparent animate-spin" />
                </div>

                <div className="text-center space-y-1.5 h-12 flex flex-col justify-center">
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-bold animate-pulse">
                        Loading
                    </p>
                    <p className="text-sm font-light text-[#8A817C] transition-all duration-500 ease-in-out">
                        {REMINDERS[motivationalIndex]}
                    </p>
                </div>
            </div>

            <div className="text-center space-y-1">
                <span className="text-[10px] uppercase tracking-widest text-[#121212]/40 font-semibold block">
                    RCCG DISCOVERY CENTER Family
                </span>
                <span className="text-xs font-light tracking-tight text-gray-400 block">
                    Church Platform v2.6
                </span>
            </div>

        </div>
    );
};