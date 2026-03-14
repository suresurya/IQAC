import { useEffect, useMemo, useState } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip
} from "chart.js";
import { Bar } from "react-chartjs-2";
import client from "../api/client";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function FacultyDashboard() {
  const [portal, setPortal] = useState(null);
  const [activePane, setActivePane] = useState("overview");
  const [status, setStatus] = useState({ type: "", text: "" });
  const [assignmentForm, setAssignmentForm] = useState({
    semester: 4,
    academicYear: "2025-26",
    section: "A",
    subjectCode: "CNS",
    subjectName: "Computer Networks"
  });
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [sectionStudents, setSectionStudents] = useState([]);
  const [markRows, setMarkRows] = useState([]);
  const [profileForm, setProfileForm] = useState({
    designation: "",
    bio: "",
    scholarsText: "",
    papersText: "",
    expertiseText: ""
  });

  const loadPortal = async () => {
    const { data } = await client.get("/faculty/portal");
    setPortal(data.data);

    const p = data.data.faculty?.facultyProfile || {};
    setProfileForm({
      designation: p.designation || "",
      bio: p.bio || "",
      scholarsText: (p.scholars || []).join("\n"),
      papersText: (p.recentPapers || []).join("\n"),
      expertiseText: (p.expertise || []).join(", ")
    });
  };

  useEffect(() => {
    loadPortal();
  }, []);

  const chartData = useMemo(() => {
    const rows = portal?.sectionAnalytics || [];
    return {
      labels: rows.map((r) => `Sec ${r.section}`),
      datasets: [
        {
          label: "Average Marks",
          data: rows.map((r) => r.averageMarks),
          backgroundColor: "#0D6EFD"
        },
        {
          label: "Pass %",
          data: rows.map((r) => r.passPercent),
          backgroundColor: "#66D1C1"
        }
      ]
    };
  }, [portal]);

  const chartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          boxWidth: 8
        }
      }
    },
    scales: {
      x: {
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: { stepSize: 10 }
      }
    }
  };

  const notify = (type, text) => setStatus({ type, text });

  const createAssignment = async (e) => {
    e.preventDefault();
    await client.post("/faculty/assignments", assignmentForm);
    await loadPortal();
    notify("success", "Teaching assignment saved.");
  };

  const selectAssignment = async (value) => {
    setSelectedAssignment(value);
    if (!value) return;

    const assignment = portal.assignments.find((a) => a._id === value);
    if (!assignment) return;

    const { data } = await client.get(`/faculty/sections/${assignment.section}/students?semester=${assignment.semester}`);
    setSectionStudents(data.data || []);
    setMarkRows(
      (data.data || []).map((student) => ({
        studentId: student._id,
        rollNo: student.rollNo,
        name: student.name,
        internal: 20,
        external: 40,
        total: 60
      }))
    );
  };

  const updateMarkRow = (studentId, field, value) => {
    setMarkRows((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;
        const updated = { ...row, [field]: Number(value) };
        updated.total = Number(updated.internal) + Number(updated.external);
        return updated;
      })
    );
  };

  const uploadSectionMarks = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    const assignment = portal.assignments.find((a) => a._id === selectedAssignment);
    if (!assignment) return;

    await client.post(`/faculty/sections/${assignment.section}/marks/bulk`, {
      semester: assignment.semester,
      academicYear: assignment.academicYear,
      subjectCode: assignment.subjectCode,
      subjectName: assignment.subjectName,
      credits: 3,
      marks: markRows.map((row) => ({
        studentId: row.studentId,
        internal: row.internal,
        external: row.external,
        total: row.total
      }))
    });

    await loadPortal();
    notify("success", "Section marks uploaded successfully.");
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    await client.put("/faculty/profile", {
      designation: profileForm.designation,
      bio: profileForm.bio,
      scholars: profileForm.scholarsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      recentPapers: profileForm.papersText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      expertise: profileForm.expertiseText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    });

    await loadPortal();
    notify("success", "Profile updated.");
  };

  if (!portal) return <div className="text-brand-ink">Loading faculty portal...</div>;

  const uniqueSections = [...new Set((portal.assignments || []).map((a) => a.section))];
  const panels = [
    { key: "overview", label: "Overview" },
    { key: "assignments", label: "Teaching Assignments" },
    { key: "marks", label: "Bulk Marks Entry" },
    { key: "profile", label: "Profile & Scholars" }
  ];

  return (
    <div className="min-h-[74vh] rounded-3xl border border-white/40 bg-gradient-to-br from-[#eef7ff] via-[#f8f6ff] to-[#fff5ee] p-4 shadow-xl sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[250px,1fr]">
        <aside className="rounded-2xl border border-white/50 bg-white/80 p-4 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.22em] text-brand-ink/60">Faculty Workspace</p>
          <h2 className="mt-2 font-heading text-xl text-brand-ink">{portal.faculty.name}</h2>
          <p className="text-sm text-brand-ink/70">{portal.faculty.department?.name || "Department not mapped"}</p>

          <nav className="mt-6 space-y-2">
            {panels.map((panel) => (
              <button
                key={panel.key}
                onClick={() => setActivePane(panel.key)}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                  activePane === panel.key
                    ? "bg-brand-ink text-white"
                    : "bg-white text-brand-ink hover:bg-brand-sand"
                }`}
              >
                {panel.label}
              </button>
            ))}
          </nav>

          <div className="mt-6 rounded-xl bg-gradient-to-r from-[#0d6efd] to-[#48cae4] p-3 text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-white/80">Sections</p>
            <p className="mt-1 text-lg font-semibold">{uniqueSections.join(", ") || "None"}</p>
          </div>
        </aside>

        <main className="space-y-4">
          <section className="rounded-2xl border border-white/50 bg-white/85 p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-brand-ink/60">Portal</p>
                <h3 className="font-heading text-2xl text-brand-ink">Faculty Dashboard</h3>
                <p className="text-sm text-brand-ink/70">
                  Manage section-wise teaching, profile updates, and bulk marks in one place.
                </p>
              </div>
              <span className="rounded-full bg-brand-sand px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-ink">
                {portal.faculty.department?.code || "NA"}
              </span>
            </div>

            {status.text && (
              <div
                className={`mt-3 rounded-xl px-3 py-2 text-sm ${
                  status.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}
              >
                {status.text}
              </div>
            )}
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/50 bg-white/85 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-brand-ink/60">Faculty ID</p>
              <p className="mt-2 text-2xl font-semibold text-brand-ink">{portal.faculty.facultyId || "NA"}</p>
            </div>
            <div className="rounded-2xl border border-white/50 bg-white/85 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-brand-ink/60">Assigned Subjects</p>
              <p className="mt-2 text-2xl font-semibold text-brand-ink">{portal.assignments.length}</p>
            </div>
            <div className="rounded-2xl border border-white/50 bg-white/85 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-brand-ink/60">Active Sections</p>
              <p className="mt-2 text-2xl font-semibold text-brand-ink">{uniqueSections.length}</p>
            </div>
            <div className="rounded-2xl border border-white/50 bg-white/85 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-brand-ink/60">Scholars Listed</p>
              <p className="mt-2 text-2xl font-semibold text-brand-ink">{portal.faculty.facultyProfile?.scholars?.length || 0}</p>
            </div>
          </section>

          {(activePane === "overview" || activePane === "assignments") && (
            <section className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
              <div className="rounded-2xl border border-white/50 bg-white/85 p-4 shadow-sm">
                <h4 className="font-heading text-lg text-brand-ink">Section-wise Performance Graph</h4>
                <div className="mt-3 h-72">
                  <Bar data={chartData} options={chartOptions} />
                </div>
              </div>

              <form onSubmit={createAssignment} className="rounded-2xl border border-white/50 bg-white/85 p-4 shadow-sm">
                <h4 className="font-heading text-lg text-brand-ink">Add Teaching Assignment</h4>
                <p className="mt-1 text-sm text-brand-ink/70">Faculty can map multiple subjects across multiple sections.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input type="number" value={assignmentForm.semester} onChange={(e) => setAssignmentForm((p) => ({ ...p, semester: Number(e.target.value) }))} className="rounded-xl border border-brand-ink/20 bg-white px-3 py-2" placeholder="Semester" />
                  <input value={assignmentForm.academicYear} onChange={(e) => setAssignmentForm((p) => ({ ...p, academicYear: e.target.value }))} className="rounded-xl border border-brand-ink/20 bg-white px-3 py-2" placeholder="Academic Year" />
                  <input value={assignmentForm.section} onChange={(e) => setAssignmentForm((p) => ({ ...p, section: e.target.value.toUpperCase() }))} className="rounded-xl border border-brand-ink/20 bg-white px-3 py-2" placeholder="Section" />
                  <input value={assignmentForm.subjectCode} onChange={(e) => setAssignmentForm((p) => ({ ...p, subjectCode: e.target.value.toUpperCase() }))} className="rounded-xl border border-brand-ink/20 bg-white px-3 py-2" placeholder="Subject Code" />
                  <input value={assignmentForm.subjectName} onChange={(e) => setAssignmentForm((p) => ({ ...p, subjectName: e.target.value }))} className="rounded-xl border border-brand-ink/20 bg-white px-3 py-2 sm:col-span-2" placeholder="Subject Name" />
                </div>
                <button className="mt-4 rounded-xl bg-brand-ink px-4 py-2 text-white">Save Assignment</button>
              </form>
            </section>
          )}

          {(activePane === "overview" || activePane === "marks") && (
            <section className="rounded-2xl border border-white/50 bg-white/85 p-4 shadow-sm">
              <h4 className="font-heading text-lg text-brand-ink">Bulk Marks Entry by Section</h4>
              <p className="mt-1 text-sm text-brand-ink/70">Upload marks for all students in one section and subject at once.</p>

              <select
                value={selectedAssignment}
                onChange={(e) => selectAssignment(e.target.value)}
                className="mt-3 w-full rounded-xl border border-brand-ink/20 bg-white px-3 py-2"
              >
                <option value="">Select Assignment</option>
                {portal.assignments.map((assignment) => (
                  <option key={assignment._id} value={assignment._id}>
                    Sem {assignment.semester} | Sec {assignment.section} | {assignment.subjectCode} - {assignment.subjectName}
                  </option>
                ))}
              </select>

              {!!sectionStudents.length && (
                <form onSubmit={uploadSectionMarks} className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-brand-ink/70">
                      <tr>
                        <th className="px-3 py-2">Roll No</th>
                        <th className="px-3 py-2">Student Name</th>
                        <th className="px-3 py-2">Internal</th>
                        <th className="px-3 py-2">External</th>
                        <th className="px-3 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {markRows.map((row) => (
                        <tr key={row.studentId} className="border-t border-brand-ink/10">
                          <td className="px-3 py-2">{row.rollNo}</td>
                          <td className="px-3 py-2">{row.name}</td>
                          <td className="px-3 py-2">
                            <input type="number" value={row.internal} onChange={(e) => updateMarkRow(row.studentId, "internal", e.target.value)} className="w-24 rounded-lg border border-brand-ink/20 px-2 py-1" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" value={row.external} onChange={(e) => updateMarkRow(row.studentId, "external", e.target.value)} className="w-24 rounded-lg border border-brand-ink/20 px-2 py-1" />
                          </td>
                          <td className="px-3 py-2 font-semibold text-brand-ink">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="mt-4 rounded-xl bg-brand-ink px-4 py-2 text-white">Upload Section Marks</button>
                </form>
              )}
            </section>
          )}

          {(activePane === "overview" || activePane === "profile") && (
            <section className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
              <form onSubmit={saveProfile} className="rounded-2xl border border-white/50 bg-white/85 p-4 shadow-sm">
                <h4 className="font-heading text-lg text-brand-ink">Edit Faculty Profile</h4>
                <div className="mt-3 grid gap-3">
                  <input value={profileForm.designation} onChange={(e) => setProfileForm((p) => ({ ...p, designation: e.target.value }))} className="rounded-xl border border-brand-ink/20 bg-white px-3 py-2" placeholder="Designation" />
                  <textarea value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} className="rounded-xl border border-brand-ink/20 bg-white px-3 py-2" placeholder="Short Bio" rows={2} />
                  <textarea value={profileForm.papersText} onChange={(e) => setProfileForm((p) => ({ ...p, papersText: e.target.value }))} className="rounded-xl border border-brand-ink/20 bg-white px-3 py-2" placeholder="Recent Papers (one per line)" rows={3} />
                  <textarea value={profileForm.scholarsText} onChange={(e) => setProfileForm((p) => ({ ...p, scholarsText: e.target.value }))} className="rounded-xl border border-brand-ink/20 bg-white px-3 py-2" placeholder="Scholars (one per line)" rows={3} />
                  <input value={profileForm.expertiseText} onChange={(e) => setProfileForm((p) => ({ ...p, expertiseText: e.target.value }))} className="rounded-xl border border-brand-ink/20 bg-white px-3 py-2" placeholder="Expertise (comma separated)" />
                </div>
                <button className="mt-4 rounded-xl bg-brand-ocean px-4 py-2 text-white">Update Profile</button>
              </form>

              <div className="rounded-2xl border border-white/50 bg-white/85 p-4 shadow-sm">
                <h4 className="font-heading text-lg text-brand-ink">Current Assignments</h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {portal.assignments.map((assignment) => (
                    <span key={assignment._id} className="rounded-full bg-brand-sand px-3 py-1 text-xs text-brand-ink">
                      Sem {assignment.semester} | {assignment.section} | {assignment.subjectCode}
                    </span>
                  ))}
                  {!portal.assignments.length && <span className="text-sm text-brand-ink/70">No assignments yet.</span>}
                </div>

                <h5 className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-brand-ink/60">Scholars</h5>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-ink/80">
                  {(portal.faculty.facultyProfile?.scholars || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  {!portal.faculty.facultyProfile?.scholars?.length && <li>Not added yet.</li>}
                </ul>

                <h5 className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-brand-ink/60">Recent Papers</h5>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-ink/80">
                  {(portal.faculty.facultyProfile?.recentPapers || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  {!portal.faculty.facultyProfile?.recentPapers?.length && <li>Not added yet.</li>}
                </ul>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
