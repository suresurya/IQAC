export default function FacultyAchievements({ form, onInput, onSubmit, rows }) {
  return (
    <section className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
      <h3 className="font-heading text-xl text-brand-ink">My Achievements</h3>
      <p className="mt-1 text-sm text-brand-ink/75">Add research/award/conference entries. They flow through existing faculty research API.</p>

      <form onSubmit={onSubmit} className="mt-4 grid gap-3 lg:grid-cols-2">
        <input name="title" value={form.title} onChange={onInput} placeholder="Title" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
        <select name="category" value={form.category} onChange={onInput} className="rounded-lg border border-brand-ink/20 px-3 py-2">
          <option value="Research">Research</option>
          <option value="Award">Award</option>
          <option value="Conference">Conference</option>
        </select>
        <input type="date" name="date" value={form.date} onChange={onInput} className="rounded-lg border border-brand-ink/20 px-3 py-2" />
        <input name="description" value={form.description} onChange={onInput} placeholder="Description" className="rounded-lg border border-brand-ink/20 px-3 py-2 lg:col-span-2" />
        <button className="rounded-lg bg-brand-ocean px-4 py-2 text-sm text-white lg:col-span-2">Add Achievement</button>
      </form>

      <div className="mt-4 space-y-2 text-sm">
        {rows.map((row) => (
          <article key={row._id} className="rounded-xl border border-white/60 bg-white/70 px-3 py-2">
            <p className="font-semibold text-brand-ink">{row.title}</p>
            <p className="text-brand-ink/70">{row.description}</p>
            <p className="text-xs text-brand-ink/60">{row.category} | {row.date}</p>
          </article>
        ))}
        {!rows.length && <p className="text-brand-ink/60">No achievements added yet.</p>}
      </div>
    </section>
  );
}
