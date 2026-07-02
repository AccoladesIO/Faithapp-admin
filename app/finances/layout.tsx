import React from "react";
import Shell from "../Shell";

export default function FinancesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <Shell>
            {children}
        </Shell>
    );
}
