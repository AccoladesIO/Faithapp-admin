"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { LoadingScreen } from "@/components/layout/loading";
import { getFirstAccessibleRoute } from "@/utils/auth/first-route";

type WithAuthOptions = {
    requiredPermission?: string;
};

function ForbiddenScreen() {
    const router = useRouter();
    const { permissions } = useAuth();
    const target = getFirstAccessibleRoute(permissions);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
            <div className="w-16 h-16 rounded-full bg-[#F4F1EA] flex items-center justify-center">
                <ShieldX className="w-7 h-7 text-[#8A817C]" />
            </div>
            <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A817C]">Access Denied</p>
                <h2 className="text-xl font-light text-[#121212] mt-1 tracking-tight">You don&apos;t have permission to view this page</h2>
                <p className="text-xs text-[#8A817C] font-light mt-2">
                    {target
                        ? "Use the navigation to access other sections, or contact your administrator."
                        : "Contact your administrator to request access."}
                </p>
            </div>
            {target && (
                <button
                    onClick={() => router.push(target)}
                    className="h-9 px-5 border border-[#121212]/10 text-[#8A817C] text-xs font-semibold uppercase tracking-wider rounded-lg hover:text-[#121212] hover:bg-[#F4F1EA] transition-colors"
                >
                    Go Home
                </button>
            )}
        </div>
    );
}

export function withAuth<P extends object>(
    Component: React.ComponentType<P>,
    options?: WithAuthOptions
) {
    return function ProtectedPage(props: P) {
        const { isAuthenticated, isLoading, hasPermission } = useAuth();
        const router = useRouter();

        useEffect(() => {
            if (!isLoading && !isAuthenticated) {
                router.replace("/");
            }
        }, [isAuthenticated, isLoading, router]);

        if (isLoading || !isAuthenticated) {
            return <LoadingScreen />;
        }

        if (options?.requiredPermission && !hasPermission(options.requiredPermission)) {
            return <ForbiddenScreen />;
        }

        return <Component {...props} />;
    };
}
