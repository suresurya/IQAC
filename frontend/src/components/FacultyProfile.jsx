function initials(name = "Faculty") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");
}

export default function FacultyProfile({ faculty, facultyRecord, profileForm, onFormChange, onSubmit }) {
  return (
    <section className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
      <h3 className="font-heading text-xl text-brand-ink">Profile Management</h3>
      <p className="mt-1 text-sm text-brand-ink/75">Edit profile details while preserving current backend profile fields.</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[220px,1fr]">
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-brand-ocean to-brand-mint text-2xl font-semibold text-white">
            {initials(faculty?.name)}
          </div>
          <p className="mt-3 font-semibold text-brand-ink">{faculty?.name}</p>
          <p className="text-sm text-brand-ink/70">{faculty?.department?.name || "Department"}</p>
          <p className="mt-1 text-xs text-brand-ink/60">{facultyRecord?.employeeId || faculty?.facultyId || "Faculty ID"}</p>
          <p className="mt-1 text-xs text-brand-ink/60">{facultyRecord?.officeLocation || "Office location not set"}</p>
          <p className="mt-1 text-xs text-brand-ink/60">
            Joined: {facultyRecord?.joiningDate ? new Date(facultyRecord.joiningDate).toLocaleDateString() : "-"}
          </p>
        </div>

        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <input value={faculty?.name || ""} disabled className="rounded-lg border border-brand-ink/20 bg-slate-100 px-3 py-2" />
          <input value={faculty?.email || ""} disabled className="rounded-lg border border-brand-ink/20 bg-slate-100 px-3 py-2" />
          <input value={facultyRecord?.username || faculty?.username || ""} disabled className="rounded-lg border border-brand-ink/20 bg-slate-100 px-3 py-2" />
          <input value={profileForm.phone} onChange={(e) => onFormChange("phone", e.target.value)} placeholder="Phone" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
          <input value={profileForm.designation} onChange={(e) => onFormChange("designation", e.target.value)} placeholder="Designation" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
          <input value={profileForm.qualification} onChange={(e) => onFormChange("qualification", e.target.value)} placeholder="Qualification" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
          <input type="number" value={profileForm.experienceYears} onChange={(e) => onFormChange("experienceYears", Number(e.target.value))} placeholder="Experience (years)" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
          <input value={profileForm.expertiseText} onChange={(e) => onFormChange("expertiseText", e.target.value)} placeholder="Research interests (comma separated)" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
          <input value={profileForm.officeLocation} onChange={(e) => onFormChange("officeLocation", e.target.value)} placeholder="Office Location" className="rounded-lg border border-brand-ink/20 px-3 py-2 sm:col-span-2" />
          <textarea value={profileForm.bio} onChange={(e) => onFormChange("bio", e.target.value)} placeholder="Bio" rows={2} className="rounded-lg border border-brand-ink/20 px-3 py-2 sm:col-span-2" />
          <textarea value={profileForm.scholarsText} onChange={(e) => onFormChange("scholarsText", e.target.value)} placeholder="Scholars (one per line)" rows={2} className="rounded-lg border border-brand-ink/20 px-3 py-2" />
          <textarea value={profileForm.papersText} onChange={(e) => onFormChange("papersText", e.target.value)} placeholder="Recent papers (one per line)" rows={2} className="rounded-lg border border-brand-ink/20 px-3 py-2" />
          <label className="flex items-center gap-2 text-sm text-brand-ink sm:col-span-2">
            <input type="checkbox" checked={profileForm.phd} onChange={(e) => onFormChange("phd", e.target.checked)} />
            PhD
          </label>
          <button className="rounded-lg bg-brand-ocean px-4 py-2 text-sm text-white sm:col-span-2">Update Profile</button>
        </form>
      </div>
    </section>
  );
}
