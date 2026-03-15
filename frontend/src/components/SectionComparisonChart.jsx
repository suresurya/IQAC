import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
import SafeChartContainer from "./SafeChartContainer.jsx";

export default function SectionComparisonChart({ data }) {
  return (
    <section className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
      <h3 className="font-heading text-xl text-brand-ink">Section Performance Comparison</h3>
      <p className="mt-1 text-sm text-brand-ink/75">Average marks and pass percentage across Section A, B, and C.</p>
      <SafeChartContainer className="mt-4 h-72 w-full min-w-0" minHeight={280}>
        {(size) => (
            <BarChart width={size.width} height={size.height} data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d5deea" />
              <XAxis dataKey="section" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="averageMarks" name="Average Marks" fill="#2563eb" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={900} />
              <Bar dataKey="passPercent" name="Pass Percentage" fill="#06b6d4" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={1200} />
            </BarChart>
        )}
      </SafeChartContainer>
    </section>
  );
}
