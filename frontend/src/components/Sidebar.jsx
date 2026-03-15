const ICONS = {
  Overview: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12h7V3H3zM14 21h7v-7h-7zM14 10h7V3h-7zM3 21h7v-7H3z" />
    </svg>
  ),
  "Add Department": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 11h6M12 8v6" />
    </svg>
  ),
  "Add Faculty": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 11c1.66 0 3-1.79 3-4s-1.34-4-3-4-3 1.79-3 4 1.34 4 3 4z" />
      <path d="M8 13c2.76 0 5-2.24 5-5S10.76 3 8 3 3 5.24 3 8s2.24 5 5 5z" />
      <path d="M2 21v-1c0-2.76 2.24-5 5-5h2c2.76 0 5 2.24 5 5v1" />
    </svg>
  ),
  "Accreditation Report": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 14l2 2 4-4" />
    </svg>
  ),
  "Department Compare": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <path d="M7 14v4M12 10v8M17 6v12" />
    </svg>
  ),
  "Institutional Analysis": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
};

export default function Sidebar({ items, activeItem, onSelect }) {
  return (
    <aside className="sticky top-6 h-fit rounded-3xl border border-white/55 bg-white/70 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-md">
      <p className="text-xs uppercase tracking-[0.18em] text-brand-ink/60">IQAC Admin Dashboard</p>

      <nav className="mt-6 space-y-2">
        {items.map((item) => {
          const active = activeItem === item;
          return (
            <button
              key={item}
              onClick={() => onSelect(item)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-gradient-to-r from-brand-ink to-brand-ocean text-white shadow-md"
                  : "text-brand-ink/80 hover:bg-white hover:text-brand-ink"
              }`}
            >
              <span className={`transition ${active ? "text-white" : "text-brand-ocean group-hover:text-brand-ink"}`}>{ICONS[item]}</span>
              <span>{item}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
