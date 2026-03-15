import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";
import SafeChartContainer from "./SafeChartContainer.jsx";

export default function FacultyRiskChart({ data }) {
  return (
    <section className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
      <h3 className="font-heading text-xl text-brand-ink">Section Risk Distribution</h3>
      <p className="mt-1 text-sm text-brand-ink/75">High, medium, and low risk students in your sections.</p>
      <SafeChartContainer className="mt-4 h-72 w-full min-w-0" minHeight={280}>
        {(size) => (
            <PieChart width={size.width} height={size.height}>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={105} innerRadius={52} animationDuration={1000}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
        )}
      </SafeChartContainer>
    </section>
  );
}
