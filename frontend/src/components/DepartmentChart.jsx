import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import SafeChartContainer from "./SafeChartContainer.jsx";

export default function DepartmentChart({ data }) {
  return (
    <section className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
      <h3 className="font-heading text-xl text-brand-ink">Department Comparison Chart</h3>
      <p className="mt-1 text-sm text-brand-ink/75">Live comparison of departments from MongoDB: Pass %, Placement %, and Average CGPA.</p>

      <SafeChartContainer className="mt-4 h-80 w-full min-w-0" minHeight={320}>
        {() => (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
            <BarChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d5deea" />
              <XAxis dataKey="department" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="percent" tick={{ fontSize: 11 }} domain={[0, 100]} />
              <YAxis yAxisId="cgpa" orientation="right" tick={{ fontSize: 11 }} domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="percent" dataKey="passPercentage" name="Pass Percentage" fill="#2563eb" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={1000} />
              <Bar yAxisId="percent" dataKey="placementRate" name="Placement Rate" fill="#06b6d4" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={1250} />
              <Bar yAxisId="cgpa" dataKey="averageCGPA" name="Average CGPA" fill="#14b8a6" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={1450} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SafeChartContainer>
    </section>
  );
}
