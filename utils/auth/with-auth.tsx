"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { LoadingScreen } from "@/components/layout/loading";

export function withAuth<P extends object>(
    Component: React.ComponentType<P>
) {
    return function ProtectedPage(props: P) {
        const { isAuthenticated, isLoading } = useAuth();
        const router = useRouter();

        useEffect(() => {
            if (!isLoading && !isAuthenticated) {
                router.replace("/");
            }
        }, [isAuthenticated, isLoading, router]);

        if (isLoading || !isAuthenticated) {
            return <LoadingScreen />;
        }

        return <Component { ...props } />;
    };
}