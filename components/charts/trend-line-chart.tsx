"use client";

import {
    LineChart as RLineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

export interface LineSeries {
    key: string;
    label: string;
    color: string;
}

export function TrendLineChart({
    data,
    xKey,
    series,
    height = 280,
}: Readonly<{
    data: Record<string, unknown>[];
    xKey: string;
    series: LineSeries[];
    height?: number;
}>) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <RLineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(18,18,18,0.08)" />
                <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#8A817C" }} />
                <YAxis tick={{ fontSize: 11, fill: "#8A817C" }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(18,18,18,0.1)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {series.map((s) => (
                    <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} />
                ))}
            </RLineChart>
        </ResponsiveContainer>
    );
}
