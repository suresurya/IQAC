import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import SafeChartContainer from "./SafeChartContainer.jsx";

export default function RiskChart({ data }) {
  return (
    <section className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
      <h3 className="font-heading text-xl text-brand-ink">Student Risk Distribution</h3>
      <p className="mt-1 text-sm text-brand-ink/75">Categorized into High, Medium, and Low risk cohorts.</p>

      <SafeChartContainer className="mt-4 h-80 w-full min-w-0" minHeight={320}>
        {() => (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                innerRadius={55}
                isAnimationActive
                animationDuration={1000}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </SafeChartContainer>
    </section>
  );
}
