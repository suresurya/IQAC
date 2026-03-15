import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import SafeChartContainer from "./SafeChartContainer.jsx";

export default function SectionPerformanceChart({ data }) {
  return (
    <section className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
      <h3 className="font-heading text-xl text-brand-ink">Section Performance Chart</h3>
      <p className="mt-1 text-sm text-brand-ink/75">Average marks and pass percentage by section.</p>
      <SafeChartContainer className="mt-4 h-72 w-full min-w-0" minHeight={280}>
        {() => (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d5deea" />
              <XAxis dataKey="section" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="averageMarks" name="Average Marks" fill="#2563eb" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={900} />
              <Bar dataKey="passPercent" name="Pass %" fill="#14b8a6" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={1200} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SafeChartContainer>
    </section>
  );
}
