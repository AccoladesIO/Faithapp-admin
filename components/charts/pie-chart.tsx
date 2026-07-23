"use client";

import { PieChart as RPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export interface PieSlice {
    name: string;
    value: number;
    color: string;
}

export function PieChart({
    data,
    height = 240,
}: Readonly<{ data: PieSlice[]; height?: number }>) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <RPieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {data.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                    ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(18,18,18,0.1)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
            </RPieChart>
        </ResponsiveContainer>
    );
}
