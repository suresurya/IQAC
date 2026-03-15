import { useMemo, useState } from "react";

const DEPARTMENT_OPTIONS = ["CSE", "ECE", "EEE", "IT", "ACSE", "MECH", "BIOTECH", "BIOMEDICAL", "BSC"];
const DESIGNATION_OPTIONS = ["Professor", "Associate Professor", "Assistant Professor", "Lecturer"];
const QUALIFICATION_OPTIONS = ["PhD", "MTech", "MSc", "Other"];
const SECTION_OPTIONS = ["A", "B", "C"];

const INITIAL_FORM = {
  name: "",
  employeeId: "",
  email: "",
  phone: "",
  department: "CSE",
  designation: "Assistant Professor",
  qualification: "PhD",
  experience: 0,
  username: "",
  password: "",
  sections: ["A"],
  subjects: [{ subjectName: "", semester: 1 }],
  researchArea: "",
  publications: 0,
  googleScholarLink: "",
  orcidId: "",
  achievements: "",
  awards: "",
  patents: "",
  conferenceParticipation: "",
  officeLocation: "",
  joiningDate: "",
  profilePhoto: ""
};

function FieldLabel({ text }) {
  return <label className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-ink/65">{text}</label>;
}

function FloatingInput({ label, type = "text", value, onChange, required = false, min, max }) {
  return (
    <label className="group relative block">
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        max={max}
        placeholder=" "
        className="peer mt-1 w-full rounded-xl border border-brand-ink/15 bg-white/90 px-3 pb-2 pt-5 outline-none transition focus:border-brand-ocean"
      />
      <span className="pointer-events-none absolute left-3 top-4 origin-left text-sm text-brand-ink/55 transition-all peer-placeholder-shown:top-6 peer-placeholder-shown:text-sm peer-focus:top-3 peer-focus:scale-90 peer-focus:text-brand-ocean peer-[&:not(:placeholder-shown)]:top-3 peer-[&:not(:placeholder-shown)]:scale-90">
        {label}
      </span>
    </label>
  );
}

function FloatingSelect({ label, value, onChange, options }) {
  return (
    <label className="group relative block">
      <select
        value={value}
        onChange={onChange}
        className="peer mt-1 w-full rounded-xl border border-brand-ink/15 bg-white/90 px-3 pb-2 pt-5 outline-none transition focus:border-brand-ocean"
      >
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute left-3 top-3 origin-left scale-90 text-sm text-brand-ocean transition-all">
        {label}
      </span>
    </label>
  );
}

export default function AddFacultyDrawer({ open, onClose, onSubmit, departments = [], loading = false }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const mergedDepartments = useMemo(() => {
    const fromApi = departments.map((item) => item.code || item.name).filter(Boolean).map((x) => String(x).toUpperCase());
    return [...new Set([...DEPARTMENT_OPTIONS, ...fromApi])];
  }, [departments]);

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateSubject = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      subjects: prev.subjects.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        return { ...row, [key]: key === "semester" ? Number(value) : value };
      })
    }));
  };

  const addSubjectRow = () => {
    setForm((prev) => ({ ...prev, subjects: [...prev.subjects, { subjectName: "", semester: 1 }] }));
  };

  const removeSubjectRow = (index) => {
    setForm((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((_, rowIndex) => rowIndex !== index)
    }));
  };

  const toggleSection = (section) => {
    setForm((prev) => {
      const exists = prev.sections.includes(section);
      const nextSections = exists ? prev.sections.filter((item) => item !== section) : [...prev.sections, section];
      return { ...prev, sections: nextSections.length ? nextSections : ["A"] };
    });
  };

  const onPhotoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateForm("profilePhoto", String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await onSubmit({
        ...form,
        department: String(form.department || "").toUpperCase(),
        sections: form.sections,
        subjects: form.subjects.filter((row) => row.subjectName.trim())
      });

      setSuccess("Faculty profile created and synced successfully.");
      setForm(INITIAL_FORM);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to add faculty");
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <aside
        className={`fixed right-0 top-0 z-50 h-screen w-full max-w-3xl overflow-y-auto border-l border-white/35 bg-[radial-gradient(circle_at_10%_15%,rgba(56,189,248,0.18),transparent_42%),radial-gradient(circle_at_90%_20%,rgba(52,211,153,0.14),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.88),rgba(238,246,252,0.94))] p-6 shadow-2xl transition-transform duration-500 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-ink/60">Faculty Management</p>
            <h2 className="mt-2 font-heading text-2xl text-brand-ink">Add Faculty Intelligence Profile</h2>
            <p className="mt-1 text-sm text-brand-ink/75">Create faculty account, assignments, research and achievements in one flow.</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white/80 px-3 py-2 text-sm text-brand-ink shadow hover:bg-white">Close</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="grid gap-3 rounded-3xl border border-white/50 bg-white/60 p-4 shadow-xl backdrop-blur-md sm:grid-cols-2">
            <div className="sm:col-span-2"><FieldLabel text="Basic Information" /></div>
            <div>
              <FloatingInput label="Faculty Name" value={form.name} onChange={(e) => updateForm("name", e.target.value)} required />
            </div>
            <div>
              <FloatingInput label="Employee ID" value={form.employeeId} onChange={(e) => updateForm("employeeId", e.target.value.toUpperCase())} required />
            </div>
            <div>
              <FloatingInput type="email" label="Email Address" value={form.email} onChange={(e) => updateForm("email", e.target.value)} required />
            </div>
            <div>
              <FloatingInput label="Phone Number" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} />
            </div>
          </section>

          <section className="grid gap-3 rounded-3xl border border-white/50 bg-white/60 p-4 shadow-xl backdrop-blur-md sm:grid-cols-2">
            <div className="sm:col-span-2"><FieldLabel text="Academic Information" /></div>
            <div>
              <FloatingSelect label="Department" value={form.department} onChange={(e) => updateForm("department", e.target.value)} options={mergedDepartments} />
            </div>
            <div>
              <FloatingSelect label="Designation" value={form.designation} onChange={(e) => updateForm("designation", e.target.value)} options={DESIGNATION_OPTIONS} />
            </div>
            <div>
              <FloatingSelect label="Qualification" value={form.qualification} onChange={(e) => updateForm("qualification", e.target.value)} options={QUALIFICATION_OPTIONS} />
            </div>
            <div>
              <FloatingInput type="number" min="0" label="Teaching Experience (Years)" value={form.experience} onChange={(e) => updateForm("experience", Number(e.target.value))} />
            </div>
          </section>

          <section className="grid gap-3 rounded-3xl border border-white/50 bg-white/60 p-4 shadow-xl backdrop-blur-md sm:grid-cols-2">
            <div className="sm:col-span-2"><FieldLabel text="Login Credentials" /></div>
            <div>
              <FloatingInput label="Username" value={form.username} onChange={(e) => updateForm("username", e.target.value.toLowerCase())} required />
            </div>
            <div>
              <FloatingInput type="password" label="Password" value={form.password} onChange={(e) => updateForm("password", e.target.value)} required />
            </div>
          </section>

          <section className="grid gap-3 rounded-3xl border border-white/50 bg-white/60 p-4 shadow-xl backdrop-blur-md">
            <div><FieldLabel text="Faculty Assignments" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel text="Assigned Sections" />
                <div className="mt-2 flex gap-2">
                  {SECTION_OPTIONS.map((section) => (
                    <button
                      key={section}
                      type="button"
                      onClick={() => toggleSection(section)}
                      className={`rounded-full px-3 py-1 text-xs transition ${form.sections.includes(section) ? "bg-brand-ink text-white" : "bg-white text-brand-ink"}`}
                    >
                      Section {section}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel text="Subjects Teaching" />
              {form.subjects.map((row, index) => (
                <div key={`${index}-${row.subjectName}`} className="grid gap-2 sm:grid-cols-[1fr,140px,90px]">
                  <input
                    value={row.subjectName}
                    onChange={(e) => updateSubject(index, "subjectName", e.target.value)}
                    placeholder="Subject Name"
                    className="rounded-xl border border-brand-ink/15 bg-white/90 px-3 py-2"
                  />
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={row.semester}
                    onChange={(e) => updateSubject(index, "semester", e.target.value)}
                    placeholder="Semester"
                    className="rounded-xl border border-brand-ink/15 bg-white/90 px-3 py-2"
                  />
                  <button type="button" onClick={() => removeSubjectRow(index)} className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" onClick={addSubjectRow} className="rounded-xl bg-white px-3 py-2 text-sm text-brand-ink">
                Add Subject
              </button>
            </div>
          </section>

          <section className="grid gap-3 rounded-3xl border border-white/50 bg-white/60 p-4 shadow-xl backdrop-blur-md sm:grid-cols-2">
            <div className="sm:col-span-2"><FieldLabel text="Research Information" /></div>
            <div>
              <FieldLabel text="Research Area" />
              <input value={form.researchArea} onChange={(e) => updateForm("researchArea", e.target.value)} className="mt-1 w-full rounded-xl border border-brand-ink/15 bg-white/90 px-3 py-2" />
            </div>
            <div>
              <FieldLabel text="Publications Count" />
              <input type="number" min="0" value={form.publications} onChange={(e) => updateForm("publications", Number(e.target.value))} className="mt-1 w-full rounded-xl border border-brand-ink/15 bg-white/90 px-3 py-2" />
            </div>
            <div>
              <FieldLabel text="Google Scholar Link" />
              <input value={form.googleScholarLink} onChange={(e) => updateForm("googleScholarLink", e.target.value)} className="mt-1 w-full rounded-xl border border-brand-ink/15 bg-white/90 px-3 py-2" />
            </div>
            <div>
              <FieldLabel text="ORCID ID" />
              <input value={form.orcidId} onChange={(e) => updateForm("orcidId", e.target.value)} className="mt-1 w-full rounded-xl border border-brand-ink/15 bg-white/90 px-3 py-2" />
            </div>
          </section>

          <section className="grid gap-3 rounded-3xl border border-white/50 bg-white/60 p-4 shadow-xl backdrop-blur-md sm:grid-cols-2">
            <div className="sm:col-span-2"><FieldLabel text="Faculty Achievements" /></div>
            <div>
              <FieldLabel text="Awards" />
              <textarea value={form.awards} onChange={(e) => updateForm("awards", e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-brand-ink/15 bg-white/90 px-3 py-2" placeholder="One per line or comma separated" />
            </div>
            <div>
              <FieldLabel text="Patents" />
              <textarea value={form.patents} onChange={(e) => updateForm("patents", e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-brand-ink/15 bg-white/90 px-3 py-2" placeholder="One per line or comma separated" />
            </div>
            <div>
              <FieldLabel text="Conference Participation" />
              <textarea value={form.conferenceParticipation} onChange={(e) => updateForm("conferenceParticipation", e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-brand-ink/15 bg-white/90 px-3 py-2" />
            </div>
            <div>
              <FieldLabel text="Other Achievements" />
              <textarea value={form.achievements} onChange={(e) => updateForm("achievements", e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-brand-ink/15 bg-white/90 px-3 py-2" />
            </div>
          </section>

          <section className="grid gap-3 rounded-3xl border border-white/50 bg-white/60 p-4 shadow-xl backdrop-blur-md sm:grid-cols-2">
            <div className="sm:col-span-2"><FieldLabel text="Profile Information" /></div>
            <div>
              <FieldLabel text="Profile Photo Upload" />
              <input type="file" accept="image/*" onChange={onPhotoSelect} className="mt-2 text-sm" />
            </div>
            <div>
              <FieldLabel text="Office Location" />
              <input value={form.officeLocation} onChange={(e) => updateForm("officeLocation", e.target.value)} className="mt-1 w-full rounded-xl border border-brand-ink/15 bg-white/90 px-3 py-2" />
            </div>
            <div>
              <FieldLabel text="Joining Date" />
              <input type="date" value={form.joiningDate} onChange={(e) => updateForm("joiningDate", e.target.value)} className="mt-1 w-full rounded-xl border border-brand-ink/15 bg-white/90 px-3 py-2" />
            </div>
            {form.profilePhoto && (
              <div>
                <img src={form.profilePhoto} alt="profile-preview" className="h-20 w-20 rounded-2xl object-cover" />
              </div>
            )}
          </section>

          {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
          {success && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

          <div className="sticky bottom-0 flex gap-3 border-t border-white/60 bg-white/70 py-4 backdrop-blur-sm">
            <button type="button" onClick={onClose} className="rounded-xl border border-brand-ink/20 px-4 py-2 text-brand-ink">Cancel</button>
            <button disabled={loading} className="rounded-xl bg-gradient-to-r from-brand-ink to-brand-ocean px-5 py-2 font-semibold text-white disabled:opacity-60">
              {loading ? "Creating Faculty..." : "Create Faculty Profile"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
