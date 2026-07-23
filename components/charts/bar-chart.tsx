"use client";

import {
    BarChart as RBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

export interface BarSeries {
    key: string;
    label: string;
    color: string;
}

export function BarChart({
    data,
    xKey,
    series,
    height = 280,
    layout = "horizontal",
}: Readonly<{
    data: Record<string, unknown>[];
    xKey: string;
    series: BarSeries[];
    height?: number;
    layout?: "horizontal" | "vertical";
}>) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <RBarChart data={data} layout={layout}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(18,18,18,0.08)" />
                {layout === "horizontal" ? (
                    <>
                        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#8A817C" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#8A817C" }} allowDecimals={false} />
                    </>
                ) : (
                    <>
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#8A817C" }} allowDecimals={false} />
                        <YAxis type="category" dataKey={xKey} tick={{ fontSize: 11, fill: "#8A817C" }} width={100} />
                    </>
                )}
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(18,18,18,0.1)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {series.map((s) => (
                    <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={layout === "horizontal" ? [4, 4, 0, 0] : [0, 4, 4, 0]} />
                ))}
            </RBarChart>
        </ResponsiveContainer>
    );
}
