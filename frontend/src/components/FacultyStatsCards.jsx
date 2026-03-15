function Trend({ up, value }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${up ? "bg-emerald-600/90" : "bg-rose-600/90"} text-white`}>
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
        {up ? <path d="M7 14l5-5 5 5" /> : <path d="M7 10l5 5 5-5" />}
      </svg>
      {value}
    </span>
  );
}

const ICONS = {
  "Total Students in My Sections": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 5h16M4 12h16M4 19h16" /></svg>
  ),
  "Average Section CGPA": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="8" r="3" /><path d="M3 20c0-3 2.4-5 6-5s6 2 6 5" /><path d="M13 20c.2-2 1.8-3.8 4-4.5" /></svg>
  ),
  "Attendance Percentage": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20h16" /><path d="M7 16v-5M12 16V8M17 16v-7" /></svg>
  ),
  "Students At Risk": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.5 2.5 18a2 2 0 0 0 1.8 3h15.4a2 2 0 0 0 1.8-3L13.7 3.5a2 2 0 0 0-3.4 0z" /></svg>
  )
};

export default function FacultyStatsCards({ stats }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((card) => (
        <article key={card.title} className="group rounded-2xl border border-white/50 bg-white/55 p-4 shadow-lg shadow-slate-200/35 backdrop-blur-md transition hover:-translate-y-1 hover:shadow-xl">
          <div className={`rounded-xl bg-gradient-to-r ${card.color} p-4 text-white`}>
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-white/20 p-2">{ICONS[card.title]}</span>
              <Trend up={card.trendUp} value={card.trend} />
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-white/85">{card.title}</p>
            <p className="mt-1 text-3xl font-semibold">{card.value}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
