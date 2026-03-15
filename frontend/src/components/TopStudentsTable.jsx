export default function TopStudentsTable({ rows, onRowClick }) {
  return (
    <section className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
      <h3 className="font-heading text-xl text-brand-ink">Section Top Students</h3>
      <p className="mt-1 text-sm text-brand-ink/75">Top performers based on latest CGPA in your assigned sections.</p>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-brand-ink/70">
            <tr>
              <th className="px-3 py-2">Rank</th>
              <th className="px-3 py-2">Student Name</th>
              <th className="px-3 py-2">Roll Number</th>
              <th className="px-3 py-2">CGPA</th>
              <th className="px-3 py-2">Section</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.studentId}
                className={`border-t border-brand-ink/10 ${onRowClick ? "cursor-pointer hover:bg-brand-sand/50" : ""}`}
                onClick={() => onRowClick?.(row)}
              >
                <td className="px-3 py-2">
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${idx === 0 ? "bg-amber-200 text-amber-800" : idx === 1 ? "bg-slate-200 text-slate-700" : idx === 2 ? "bg-orange-200 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                    {idx + 1}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium text-brand-ink">{row.name}</td>
                <td className="px-3 py-2">{row.rollNo}</td>
                <td className="px-3 py-2">{row.cgpa}</td>
                <td className="px-3 py-2">{row.section}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-5 text-center text-brand-ink/60">No students available for ranking.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
