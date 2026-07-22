import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

export interface ModuleState {
    key: string;
    enabled: boolean;
    displayName: string;
}

// Single source of truth for "is module X on for this church," consumed by
// both the sidebar (nav visibility) and the role-management permission-group
// filter — mirrors the /enums pattern already used for other reference data.
export function useModuleState() {
    const [modules, setModules] = useState<ModuleState[] | null>(null);

    const fetchState = useCallback(async () => {
        try {
            const res = await api.get<{ data: ModuleState[] }>("/modules/state");
            setModules(res.data.data);
        } catch {
            setModules([]);
        }
    }, []);

    useEffect(() => {
        fetchState();
    }, [fetchState]);

    const isModuleEnabled = useCallback((key?: string): boolean => {
        if (!key) return true;
        if (modules === null) return true;
        const found = modules.find((m) => m.key === key);
        return found ? found.enabled : true;
    }, [modules]);

    return { modules, isModuleEnabled, refetch: fetchState };
}
