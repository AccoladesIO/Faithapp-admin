import { toLocalDate } from "@/utils/parse-local-time";

export type DatePreset = "all" | "7d" | "30d" | "month" | "custom";

export const toIsoDate = (d: Date) => toLocalDate(d);

export function presetRange(preset: DatePreset): { dateFrom: string; dateTo: string } {
    const today = new Date();
    if (preset === "7d") {
        const from = new Date(today); from.setDate(from.getDate() - 7);
        return { dateFrom: toIsoDate(from), dateTo: toIsoDate(today) };
    }
    if (preset === "30d") {
        const from = new Date(today); from.setDate(from.getDate() - 30);
        return { dateFrom: toIsoDate(from), dateTo: toIsoDate(today) };
    }
    if (preset === "month") {
        return {
            dateFrom: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
            dateTo: toIsoDate(today),
        };
    }
    return { dateFrom: "", dateTo: "" };
}
