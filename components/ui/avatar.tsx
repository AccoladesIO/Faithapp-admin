import React from "react";
import Image from "next/image";

function initialsOf(name: string): string {
    return name.trim().split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
}

export function Avatar({
    photoUrl,
    name,
    size = 36,
    textSize = "text-[11px]",
}: {
    photoUrl?: string | null;
    name: string;
    size?: number;
    textSize?: string;
}) {
    if (photoUrl) {
        return (
            <div
                className="relative rounded-full overflow-hidden flex-shrink-0 bg-[#F4F1EA]"
                style={{ width: size, height: size }}
            >
                <Image src={photoUrl} alt={name} fill sizes={`${size}px`} className="object-cover" />
            </div>
        );
    }

    return (
        <div
            className="rounded-full bg-[#121212] flex items-center justify-center flex-shrink-0"
            style={{ width: size, height: size }}
        >
            <span className={`${textSize} font-semibold text-white uppercase`}>{initialsOf(name)}</span>
        </div>
    );
}
