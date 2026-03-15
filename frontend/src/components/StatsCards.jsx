const CARD_ICONS = {
  "Total Students": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 11c1.66 0 3-1.79 3-4s-1.34-4-3-4-3 1.79-3 4 1.34 4 3 4z" />
      <path d="M8 13c2.76 0 5-2.24 5-5S10.76 3 8 3 3 5.24 3 8s2.24 5 5 5z" />
      <path d="M2 21v-1c0-2.76 2.24-5 5-5h2c2.76 0 5 2.24 5 5v1" />
    </svg>
  ),
  "Total Faculty": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="8" r="3" />
      <path d="M2.5 20c1-3 2.9-5 5.5-5s4.5 2 5.5 5" />
      <path d="M10.5 20c1-2.3 2.9-3.8 5.5-3.8 2.5 0 4.2 1.4 5 3.8" />
    </svg>
  ),
  Departments: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 21h18" />
      <path d="M5 21V8l7-4 7 4v13" />
      <path d="M9 12h6" />
    </svg>
  ),
  "Faculty Achievements": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3h8v3a4 4 0 0 1-8 0z" />
      <path d="M6 6H4a3 3 0 0 0 3 3" />
      <path d="M18 6h2a3 3 0 0 1-3 3" />
      <path d="M12 10v5" />
      <path d="M9 21h6" />
    </svg>
  ),
  "Average CGPA": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l2.9 6.3L22 9l-5 4.7L18.2 21 12 17.7 5.8 21 7 13.7 2 9l7.1-.7z" />
    </svg>
  ),
  "Placement Rate": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  ),
  "NAAC Readiness": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
};

function TrendArrow({ up }) {
  if (up) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 14l5-5 5 5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 10l5 5 5-5" />
    </svg>
  );
}

export default function StatsCards({ stats }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((card) => (
        <article
          key={card.title}
          className="group rounded-2xl border border-white/50 bg-white/55 p-4 shadow-lg shadow-slate-200/35 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          <div className={`rounded-xl bg-gradient-to-r ${card.color} p-4 text-white`}>
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-white/20 p-2">{CARD_ICONS[card.title]}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${card.trendUp ? "bg-emerald-600/90" : "bg-rose-600/90"}`}>
                <TrendArrow up={card.trendUp} />
                {card.trend}
              </span>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-white/85">{card.title}</p>
            <p className="mt-1 text-3xl font-semibold">{card.value}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
