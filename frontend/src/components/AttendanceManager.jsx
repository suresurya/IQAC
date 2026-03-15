export default function AttendanceManager({
  sections,
  selectedSection,
  onSectionChange,
  date,
  onDateChange,
  rows,
  onStatusChange,
  onSave
}) {
  return (
    <section className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
      <h3 className="font-heading text-xl text-brand-ink">Attendance Management</h3>
      <p className="mt-1 text-sm text-brand-ink/75">Select section and date, mark attendance for 5 students, then save.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <select value={selectedSection} onChange={(e) => onSectionChange(e.target.value)} className="rounded-lg border border-brand-ink/20 px-3 py-2">
          <option value="">Select Section</option>
          {sections.map((section) => (
            <option key={section} value={section}>Section {section}</option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} className="rounded-lg border border-brand-ink/20 px-3 py-2" />
      </div>

      <div className="mt-4 space-y-2">
        {rows.map((row) => (
          <div key={row.studentId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/60 bg-white/70 px-3 py-2">
            <p className="text-sm text-brand-ink"><span className="font-medium">{row.rollNo}</span> - {row.name}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onStatusChange(row.studentId, "PRESENT")}
                className={`rounded-lg px-3 py-1 text-xs ${row.status === "PRESENT" ? "bg-emerald-600 text-white" : "bg-white text-brand-ink"}`}
              >
                Present
              </button>
              <button
                type="button"
                onClick={() => onStatusChange(row.studentId, "ABSENT")}
                className={`rounded-lg px-3 py-1 text-xs ${row.status === "ABSENT" ? "bg-rose-600 text-white" : "bg-white text-brand-ink"}`}
              >
                Absent
              </button>
            </div>
          </div>
        ))}
        {!rows.length && <p className="text-sm text-brand-ink/60">No students available for selected section.</p>}
      </div>

      <button onClick={onSave} className="mt-4 rounded-lg bg-brand-ink px-4 py-2 text-sm text-white">Save Attendance</button>
    </section>
  );
}
