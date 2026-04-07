const MENU_ICONS = {
  "Dashboard Overview": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 13h8V3H3zM13 21h8V11h-8zM13 3h8v6h-8zM3 21h8v-6H3z" />
    </svg>
  ),
  "My Profile": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.8-3.2 4.4-5 8-5s6.2 1.8 8 5" />
    </svg>
  ),
  "My Sections": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 5h16M4 12h16M4 19h16" />
    </svg>
  ),
  "Mark Attendance": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 2v4M16 2v4M3 10h18" />
      <rect x="3" y="6" width="18" height="16" rx="2" />
      <path d="M9 16l2 2 4-4" />
    </svg>
  ),
  "Student Performance": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20h16" />
      <path d="M7 16v-4M12 16V8M17 16v-7" />
    </svg>
  ),
  "Faculty Analytics": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <rect x="6" y="11" width="3" height="7" />
      <rect x="11" y="8" width="3" height="10" />
      <rect x="16" y="5" width="3" height="13" />
    </svg>
  ),
  "Top Students": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l2.5 5 5.5.8-4 3.8.9 5.4L12 15.8 7.1 18l.9-5.4-4-3.8 5.5-.8z" />
    </svg>
  ),
  "Student Risk Analysis": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.5 2.5 18a2 2 0 0 0 1.8 3h15.4a2 2 0 0 0 1.8-3L13.7 3.5a2 2 0 0 0-3.4 0z" />
    </svg>
  ),
  "My Achievements": (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M8 13v8l4-2 4 2v-8" />
    </svg>
  )
};

export default function FacultySidebar({ items, active, onChange, title = "Faculty Portal" }) {
  return (
    <aside className="sticky top-6 h-fit rounded-3xl border border-white/55 bg-white/70 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-md">
      <p className="text-xs uppercase tracking-[0.18em] text-brand-ink/60">{title}</p>
      <nav className="mt-6 space-y-2">
        {items.map((item) => {
          const isActive = active === item;
          return (
            <button
              key={item}
              onClick={() => onChange(item)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-brand-ink to-brand-ocean text-white shadow-md"
                  : "text-brand-ink/80 hover:bg-white hover:text-brand-ink"
              }`}
            >
              <span className={`transition ${isActive ? "text-white" : "text-brand-ocean group-hover:text-brand-ink"}`}>{MENU_ICONS[item]}</span>
              <span>{item}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
