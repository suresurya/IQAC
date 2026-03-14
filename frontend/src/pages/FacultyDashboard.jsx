import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from "chart.js";
import client from "../api/client";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function FacultyDashboard() {
  const [portal, setPortal] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [status, setStatus] = useState("");

  const [markForm, setMarkForm] = useState({
    subjectCode: "CS401",
    subjectName: "Data Structures",
    semester: 4,
    academicYear: "2025-26",
    total: 72
  });

  const [attendanceForm, setAttendanceForm] = useState({
    semester: 4,
    academicYear: "2025-26",
    subjectCode: "CS401",
    subjectName: "Data Structures",
    classesConducted: 90,
    classesAttended: 72
  });

  const [assignmentForm, setAssignmentForm] = useState({
    semester: 4,
    academicYear: "2025-26",
    section: "A",
    subjectCode: "CS401",
    subjectName: "Data Structures"
  });

  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [markRows, setMarkRows] = useState([]);

  const [profileForm, setProfileForm] = useState({
    designation: "",
    qualification: "",
    experienceYears: 0,
    phd: false,
    bio: "",
    scholarsText: "",
    papersText: "",
    expertiseText: ""
  });

  const loadPortal = async () => {
    const [portalRes, studentsRes] = await Promise.all([client.get("/faculty/portal"), client.get("/students")]);

    const portalData = portalRes.data.data;
    setPortal(portalData);
    setStudents(studentsRes.data.data || []);

    if (studentsRes.data.data?.length) {
      setSelectedStudent(studentsRes.data.data[0]._id);
    }

    const p = portalData?.faculty?.facultyProfile || {};
    setProfileForm({
      designation: p.designation || "",
      qualification: p.qualification || "",
      experienceYears: Number(p.experienceYears || 0),
      phd: !!p.phd,
      bio: p.bio || "",
      scholarsText: (p.scholars || []).join("\n"),
      papersText: (p.recentPapers || []).join("\n"),
      expertiseText: (p.expertise || []).join(", ")
    });
  };

  useEffect(() => {
    loadPortal().catch((err) => {
      setStatus(err.response?.data?.message || "Unable to load faculty dashboard");
    });
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

  const submitMarks = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    await client.post(`/faculty/students/${selectedStudent}/marks`, {
      ...markForm,
      semester: Number(markForm.semester),
      total: Number(markForm.total)
    });

    setStatus("Marks uploaded successfully");
  };

  const submitAttendance = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    await client.post(`/faculty/students/${selectedStudent}/attendance`, {
      ...attendanceForm,
      semester: Number(attendanceForm.semester),
      classesConducted: Number(attendanceForm.classesConducted),
      classesAttended: Number(attendanceForm.classesAttended)
    });

    setStatus("Attendance uploaded successfully");
  };

  const createAssignment = async (e) => {
    e.preventDefault();

    await client.post("/faculty/assignments", {
      ...assignmentForm,
      semester: Number(assignmentForm.semester),
      section: assignmentForm.section.toUpperCase(),
      subjectCode: assignmentForm.subjectCode.toUpperCase()
    });

    await loadPortal();
    setStatus("Teaching assignment saved");
  };

  const selectAssignmentAndLoad = async (assignmentId) => {
    setSelectedAssignment(assignmentId);
    if (!assignmentId) {
      setMarkRows([]);
      return;
    }

    const assignment = portal?.assignments?.find((a) => a._id === assignmentId);
    if (!assignment) return;

    const { data } = await client.get(`/faculty/sections/${assignment.section}/students?semester=${assignment.semester}`);
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

  const updateMarkRow = (studentId, key, value) => {
    setMarkRows((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;
        const next = { ...row, [key]: Number(value) };
        next.total = Number(next.internal) + Number(next.external);
        return next;
      })
    );
  };

  const uploadSectionMarks = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    const assignment = portal?.assignments?.find((a) => a._id === selectedAssignment);
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

    setStatus("Section marks uploaded successfully");
  };

  const saveProfile = async (e) => {
    e.preventDefault();

    await client.put("/faculty/profile", {
      designation: profileForm.designation,
      qualification: profileForm.qualification,
      experienceYears: Number(profileForm.experienceYears),
      phd: !!profileForm.phd,
      bio: profileForm.bio,
      scholars: profileForm.scholarsText.split("\n").map((x) => x.trim()).filter(Boolean),
      recentPapers: profileForm.papersText.split("\n").map((x) => x.trim()).filter(Boolean),
      expertise: profileForm.expertiseText.split(",").map((x) => x.trim()).filter(Boolean)
    });

    await loadPortal();
    setStatus("Profile updated");
  };

  if (!portal) {
    return <div className="text-brand-ink">Loading faculty dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl text-brand-ink">Faculty Panel</h2>

      {status && <p className="rounded-lg bg-white p-3 text-sm text-brand-ink">{status}</p>}

      <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
        <h3 className="font-heading text-lg text-brand-ink">Section-wise Performance</h3>
        <div className="mt-4 h-64">
          <Bar data={chartData} options={{ maintainAspectRatio: false }} />
        </div>
      </div>

      <section className="rounded-2xl border border-white/40 bg-white/80 p-4">
        <label className="text-sm text-brand-ink/70">Select Student</label>
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="mt-2 w-full rounded-lg border border-brand-ink/20 px-3 py-2"
        >
          {students.map((student) => (
            <option key={student._id} value={student._id}>
              {student.rollNo} - {student.name}
            </option>
          ))}
        </select>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={submitMarks} className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Upload Marks</h3>
          <div className="mt-3 grid gap-3">
            <input value={markForm.subjectCode} onChange={(e) => setMarkForm((p) => ({ ...p, subjectCode: e.target.value }))} placeholder="Subject Code" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input value={markForm.subjectName} onChange={(e) => setMarkForm((p) => ({ ...p, subjectName: e.target.value }))} placeholder="Subject Name" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input type="number" value={markForm.semester} onChange={(e) => setMarkForm((p) => ({ ...p, semester: Number(e.target.value) }))} placeholder="Semester" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input value={markForm.academicYear} onChange={(e) => setMarkForm((p) => ({ ...p, academicYear: e.target.value }))} placeholder="Academic Year" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input type="number" value={markForm.total} onChange={(e) => setMarkForm((p) => ({ ...p, total: Number(e.target.value) }))} placeholder="Total Marks" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
          </div>
          <button className="mt-3 rounded-lg bg-brand-ink px-4 py-2 text-white">Upload Marks</button>
        </form>

        <form onSubmit={submitAttendance} className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Upload Attendance</h3>
          <div className="mt-3 grid gap-3">
            <input type="number" value={attendanceForm.semester} onChange={(e) => setAttendanceForm((p) => ({ ...p, semester: Number(e.target.value) }))} placeholder="Semester" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input value={attendanceForm.academicYear} onChange={(e) => setAttendanceForm((p) => ({ ...p, academicYear: e.target.value }))} placeholder="Academic Year" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input value={attendanceForm.subjectCode} onChange={(e) => setAttendanceForm((p) => ({ ...p, subjectCode: e.target.value }))} placeholder="Subject Code" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input value={attendanceForm.subjectName} onChange={(e) => setAttendanceForm((p) => ({ ...p, subjectName: e.target.value }))} placeholder="Subject Name" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input type="number" value={attendanceForm.classesConducted} onChange={(e) => setAttendanceForm((p) => ({ ...p, classesConducted: Number(e.target.value) }))} placeholder="Classes Conducted" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input type="number" value={attendanceForm.classesAttended} onChange={(e) => setAttendanceForm((p) => ({ ...p, classesAttended: Number(e.target.value) }))} placeholder="Classes Attended" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
          </div>
          <button className="mt-3 rounded-lg bg-brand-ocean px-4 py-2 text-white">Upload Attendance</button>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={createAssignment} className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Create Teaching Assignment</h3>
          <div className="mt-3 grid gap-3">
            <input type="number" value={assignmentForm.semester} onChange={(e) => setAssignmentForm((p) => ({ ...p, semester: Number(e.target.value) }))} placeholder="Semester" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input value={assignmentForm.academicYear} onChange={(e) => setAssignmentForm((p) => ({ ...p, academicYear: e.target.value }))} placeholder="Academic Year" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input value={assignmentForm.section} onChange={(e) => setAssignmentForm((p) => ({ ...p, section: e.target.value.toUpperCase() }))} placeholder="Section" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input value={assignmentForm.subjectCode} onChange={(e) => setAssignmentForm((p) => ({ ...p, subjectCode: e.target.value.toUpperCase() }))} placeholder="Subject Code" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input value={assignmentForm.subjectName} onChange={(e) => setAssignmentForm((p) => ({ ...p, subjectName: e.target.value }))} placeholder="Subject Name" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
          </div>
          <button className="mt-3 rounded-lg bg-brand-ink px-4 py-2 text-white">Save Assignment</button>
        </form>

        <form onSubmit={saveProfile} className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Update Faculty Profile</h3>
          <div className="mt-3 grid gap-3">
            <input value={profileForm.designation} onChange={(e) => setProfileForm((p) => ({ ...p, designation: e.target.value }))} placeholder="Designation" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input value={profileForm.qualification} onChange={(e) => setProfileForm((p) => ({ ...p, qualification: e.target.value }))} placeholder="Qualification" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input type="number" value={profileForm.experienceYears} onChange={(e) => setProfileForm((p) => ({ ...p, experienceYears: Number(e.target.value) }))} placeholder="Experience (years)" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <label className="flex items-center gap-2 text-sm text-brand-ink">
              <input type="checkbox" checked={profileForm.phd} onChange={(e) => setProfileForm((p) => ({ ...p, phd: e.target.checked }))} />
              PhD
            </label>
            <textarea value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} placeholder="Bio" rows={2} className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <textarea value={profileForm.scholarsText} onChange={(e) => setProfileForm((p) => ({ ...p, scholarsText: e.target.value }))} placeholder="Scholars (one per line)" rows={2} className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <textarea value={profileForm.papersText} onChange={(e) => setProfileForm((p) => ({ ...p, papersText: e.target.value }))} placeholder="Recent Papers (one per line)" rows={2} className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input value={profileForm.expertiseText} onChange={(e) => setProfileForm((p) => ({ ...p, expertiseText: e.target.value }))} placeholder="Expertise (comma separated)" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
          </div>
          <button className="mt-3 rounded-lg bg-brand-ocean px-4 py-2 text-white">Update Profile</button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/40 bg-white/80 p-4">
        <h3 className="font-heading text-lg text-brand-ink">Bulk Upload Section Marks</h3>
        <select
          value={selectedAssignment}
          onChange={(e) => selectAssignmentAndLoad(e.target.value)}
          className="mt-3 w-full rounded-lg border border-brand-ink/20 px-3 py-2"
        >
          <option value="">Select Assignment</option>
          {(portal.assignments || []).map((a) => (
            <option key={a._id} value={a._id}>
              Sem {a.semester} | Sec {a.section} | {a.subjectCode}
            </option>
          ))}
        </select>

        {markRows.length > 0 && (
          <form onSubmit={uploadSectionMarks} className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-brand-ink/70">
                <tr>
                  <th className="px-3 py-2">Roll No</th>
                  <th className="px-3 py-2">Name</th>
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
                      <input type="number" value={row.internal} onChange={(e) => updateMarkRow(row.studentId, "internal", e.target.value)} className="w-24 rounded border border-brand-ink/20 px-2 py-1" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={row.external} onChange={(e) => updateMarkRow(row.studentId, "external", e.target.value)} className="w-24 rounded border border-brand-ink/20 px-2 py-1" />
                    </td>
                    <td className="px-3 py-2 font-semibold">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="mt-3 rounded-lg bg-brand-ink px-4 py-2 text-white">Upload Section Marks</button>
          </form>
        )}
      </section>
    </div>
  );
}
