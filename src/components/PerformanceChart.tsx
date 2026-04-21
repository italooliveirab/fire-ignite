import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export function PerformanceChart({ data }: { data: { date: string; leads: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0 0)" />
        <XAxis dataKey="date" stroke="oklch(0.6 0 0)" fontSize={11} />
        <YAxis stroke="oklch(0.6 0 0)" fontSize={11} />
        <Tooltip contentStyle={{ background: "oklch(0.16 0 0)", border: "1px solid oklch(0.25 0 0)", borderRadius: 8 }} />
        <Line type="monotone" dataKey="leads" stroke="#FF5A00" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}