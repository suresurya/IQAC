import { useEffect, useMemo, useState } from "react";
import client from "../api/client";
import FacultySidebar from "../components/FacultySidebar.jsx";
import FacultyStatsCards from "../components/FacultyStatsCards.jsx";
import FacultyRiskChart from "../components/FacultyRiskChart.jsx";
import SectionComparisonChart from "../components/SectionComparisonChart.jsx";
import TopStudentsTable from "../components/TopStudentsTable.jsx";
import AttendanceManager from "../components/AttendanceManager.jsx";
import FacultyAchievements from "../components/FacultyAchievements.jsx";
import FacultyProfile from "../components/FacultyProfile.jsx";
import NlqSearchBar from "../components/NlqSearchBar.jsx";

const MENU_ITEMS = [
  "Overview",
  "My Profile",
  "My Sections",
  "Mark Attendance",
  "Student Performance",
  "Top Students",
  "Student Risk Analysis",
  "My Achievements"
];

export default function FacultyDashboard() {
  const [portal, setPortal] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [status, setStatus] = useState("");
  const [activeMenu, setActiveMenu] = useState("Overview");

  const [markForm, setMarkForm] = useState({
    subjectCode: "",
    subjectName: "",
    semester: "",
    academicYear: "",
    total: ""
  });

  const [attendanceForm, setAttendanceForm] = useState({
    semester: "",
    academicYear: "",
    subjectCode: "",
    subjectName: "",
    classesConducted: "",
    classesAttended: ""
  });

  const [assignmentForm, setAssignmentForm] = useState({
    semester: "",
    academicYear: "",
    section: "",
    subjectCode: "",
    subjectName: ""
  });

  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [markRows, setMarkRows] = useState([]);

  const [profileForm, setProfileForm] = useState({
    phone: "",
    officeLocation: "",
    designation: "",
    qualification: "",
    experienceYears: 0,
    phd: false,
    bio: "",
    scholarsText: "",
    papersText: "",
    expertiseText: ""
  });

  const [achievementForm, setAchievementForm] = useState({
    title: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    category: "Research"
  });
  const [achievementRows, setAchievementRows] = useState([]);

  const [attendanceSection, setAttendanceSection] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [recentAttendanceSummary, setRecentAttendanceSummary] = useState([]);

  const loadPortal = async () => {
    const [portalRes, analyticsRes] = await Promise.all([client.get("/faculty/portal"), client.get("/faculty/dashboard-analytics")]);

    const portalData = portalRes.data.data;
    const analyticsData = analyticsRes.data.data || {};
    const studentData = analyticsData.studentsScoped || [];

    setPortal(portalData);
    setAnalytics(analyticsData);
    setStudents(studentData);

    if (studentData.length) {
      setSelectedStudent(studentData[0]._id);
    }

    const p = portalData?.faculty?.facultyProfile || {};
    const fr = portalData?.facultyRecord || {};
    setProfileForm({
      phone: fr.phone || "",
      officeLocation: fr.officeLocation || "",
      designation: fr.designation || p.designation || "",
      qualification: fr.qualification || p.qualification || "",
      experienceYears: Number(fr.experience || p.experienceYears || 0),
      phd: !!p.phd,
      bio: p.bio || "",
      scholarsText: (p.scholars || []).join("\n"),
      papersText: (p.recentPapers || []).join("\n"),
      expertiseText: fr.researchArea || (p.expertise || []).join(", ")
    });

    const sections = [...new Set([...(analyticsData?.assignments || []).map((a) => a.section), ...(portalData?.facultyRecord?.sections || [])])];
    if (sections.length && !attendanceSection) {
      setAttendanceSection(sections[0]);
    }
  };

  useEffect(() => {
    loadPortal().catch((err) => {
      setStatus(err.response?.data?.message || "Unable to load faculty dashboard");
    });
  }, []);

  const assignedSections = useMemo(
    () => [...new Set([...(analytics?.assignments || []).map((a) => a.section), ...(portal?.facultyRecord?.sections || [])])],
    [analytics, portal]
  );

  const sectionStudents = useMemo(
    () => students.filter((student) => assignedSections.includes(student.section)),
    [students, assignedSections]
  );

  useEffect(() => {
    if (!attendanceSection) {
      setAttendanceRows([]);
      return;
    }

    const rows = students
      .filter((student) => student.section === attendanceSection)
      .slice(0, 5)
      .map((student) => ({
        studentId: student._id,
        name: student.name,
        rollNo: student.rollNo,
        status: "PRESENT"
      }));

    setAttendanceRows(rows);
  }, [attendanceSection, students]);

  const statsCards = useMemo(() => {
    const overview = analytics?.sectionOverview || {};
    const avgCgpa = Number(overview.averageCgpa || 0).toFixed(2);
    const attendancePercent = sectionStudents.length
      ? (sectionStudents.reduce((sum, student) => sum + Number(student.attendance || 0), 0) / sectionStudents.length).toFixed(1)
      : "0.0";
    const riskCount = Number((analytics?.riskDistribution?.high || 0) + (analytics?.riskDistribution?.medium || 0));

    return [
      {
        title: "Total Students in My Sections",
        value: Number(overview.totalStudents || sectionStudents.length),
        trend: "",
        trendUp: true,
        color: "from-blue-500/70 via-sky-400/70 to-cyan-300/70"
      },
      {
        title: "Average Section CGPA",
        value: avgCgpa,
        trend: "",
        trendUp: true,
        color: "from-emerald-500/65 via-teal-400/65 to-cyan-300/65"
      },
      {
        title: "Attendance Percentage",
        value: `${attendancePercent}%`,
        trend: "",
        trendUp: true,
        color: "from-indigo-500/65 via-violet-400/65 to-fuchsia-300/65"
      },
      {
        title: "Students At Risk",
        value: riskCount,
        trend: "",
        trendUp: !riskCount,
        color: "from-amber-500/65 via-orange-400/65 to-rose-300/65"
      }
    ];
  }, [analytics, sectionStudents]);

  const riskData = useMemo(() => {
    const high = Number(analytics?.riskDistribution?.high || 0);
    const medium = Number(analytics?.riskDistribution?.medium || 0);
    const low = Number(analytics?.riskDistribution?.low || 0);

    return [
      { name: "High Risk", value: high, color: "#ef4444" },
      { name: "Medium Risk", value: medium, color: "#f97316" },
      { name: "Low Risk", value: low, color: "#16a34a" }
    ];
  }, [analytics]);

  const sectionComparisonData = useMemo(() => {
    const rows = analytics?.sectionPerformance || [];
    return rows.map((row) => ({
      section: row.section,
      averageMarks: Number(row.averageCgpa || 0),
      passPercent: Number(analytics?.sectionOverview?.passPercentage || 0)
    }));
  }, [analytics]);

  const topStudents = useMemo(() => {
    return (analytics?.topStudents || []).map((row) => ({
      studentId: row.studentId,
      name: row.name,
      rollNo: row.rollNo,
      cgpa: Number(row.cgpa || 0),
      section: row.section
    }));
  }, [analytics]);

  const lowPerformingStudents = useMemo(
    () => sectionStudents
      .map((student) => ({
        ...student,
        latestCgpa: Number(student.cgpa || 0)
      }))
      .filter((student) => student.latestCgpa < 6.5)
      .sort((a, b) => a.latestCgpa - b.latestCgpa)
      .slice(0, 5),
    [sectionStudents]
  );

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
        internal: "",
        external: "",
        total: 0
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
      phone: profileForm.phone,
      officeLocation: profileForm.officeLocation,
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

  const saveAttendanceManager = async () => {
    if (!attendanceRows.length) return;

    const currentAssignment = (portal?.assignments || []).find((a) => a.section === attendanceSection) || {};

    await Promise.all(
      attendanceRows.map((row) =>
        client.post(`/faculty/students/${row.studentId}/attendance`, {
          semester: Number(currentAssignment.semester || attendanceForm.semester),
          academicYear: currentAssignment.academicYear || attendanceForm.academicYear,
          subjectCode: currentAssignment.subjectCode || attendanceForm.subjectCode,
          subjectName: currentAssignment.subjectName || attendanceForm.subjectName,
          classesConducted: 1,
          classesAttended: row.status === "PRESENT" ? 1 : 0,
          date: attendanceDate
        })
      )
    );

    setRecentAttendanceSummary((prev) => [
      {
        id: `${attendanceSection}-${attendanceDate}`,
        section: attendanceSection,
        date: attendanceDate,
        present: attendanceRows.filter((row) => row.status === "PRESENT").length,
        absent: attendanceRows.filter((row) => row.status === "ABSENT").length
      },
      ...prev
    ].slice(0, 5));

    setStatus("Attendance saved for selected section");
  };

  const onAttendanceStatusChange = (studentId, statusValue) => {
    setAttendanceRows((prev) => prev.map((row) => (row.studentId === studentId ? { ...row, status: statusValue } : row)));
  };

  const onProfileFormChange = (key, value) => {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
  };

  const onAchievementInput = (e) => {
    const { name, value } = e.target;
    setAchievementForm((prev) => ({ ...prev, [name]: value }));
  };

  const addAchievement = async (e) => {
    e.preventDefault();

    const categoryMap = {
      Research: "Journal",
      Award: "Patent",
      Conference: "Conference"
    };

    const response = await client.post("/faculty/research", {
      title: achievementForm.title,
      publicationType: categoryMap[achievementForm.category] || "Journal",
      journalOrConference: achievementForm.description,
      publishedOn: achievementForm.date,
      accreditationCriteria: "NAAC-C3"
    });

    const newRow = {
      _id: response.data.data._id,
      title: achievementForm.title,
      description: achievementForm.description,
      date: achievementForm.date,
      category: achievementForm.category
    };

    setAchievementRows((prev) => [newRow, ...prev]);
    setAchievementForm({ title: "", description: "", date: new Date().toISOString().slice(0, 10), category: "Research" });
    setStatus("Achievement added");
  };

  if (!portal) {
    return <div className="text-brand-ink">Loading faculty dashboard...</div>;
  }

  return (
    <div className="grid min-h-[78vh] gap-6 lg:grid-cols-[260px,1fr]">
      <FacultySidebar items={MENU_ITEMS} active={activeMenu} onChange={setActiveMenu} />

      <section className="space-y-6">
        <header className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-ink/65">IQAC Academic Intelligence</p>
          <h1 className="mt-2 font-heading text-2xl text-brand-ink sm:text-3xl">Faculty Analytics Control Panel</h1>
          <p className="mt-1 text-sm text-brand-ink/75">Section-level analytics, attendance workflows, and student performance insights in one dashboard.</p>
          {status && <p className="mt-3 rounded-lg border border-white/60 bg-white/70 px-3 py-2 text-sm text-brand-ink">{status}</p>}
        </header>

        {activeMenu === "Overview" && (
          <div className="space-y-6">
            <NlqSearchBar departmentId={portal?.facultyRecord?.department?._id} />
            <FacultyStatsCards stats={statsCards} />

            <div className="grid gap-5 xl:grid-cols-2">
              <FacultyRiskChart data={riskData} />
              <SectionComparisonChart data={sectionComparisonData} />
            </div>

            <section className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
              <h3 className="font-heading text-xl text-brand-ink">Faculty Section Insights</h3>
              <p className="mt-1 text-sm text-brand-ink/75">Top students, low performing students, and recent attendance summary.</p>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <article
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveMenu("Top Students")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveMenu("Top Students");
                    }
                  }}
                  className="cursor-pointer rounded-2xl border border-white/60 bg-white/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <p className="text-sm font-semibold text-brand-ink">Top Students List</p>
                  <div className="mt-2 space-y-1 text-xs text-brand-ink/75">
                    {topStudents.slice(0, 5).map((row) => (
                      <p key={row.studentId}>{row.rollNo} - {row.name} ({row.cgpa})</p>
                    ))}
                    {!topStudents.length && <p>No records</p>}
                  </div>
                  <p className="mt-3 text-xs font-medium text-brand-ocean">Click to open full Top Students table</p>
                </article>

                <article className="rounded-2xl border border-white/60 bg-white/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <p className="text-sm font-semibold text-brand-ink">Low Performing Students</p>
                  <div className="mt-2 space-y-1 text-xs text-brand-ink/75">
                    {lowPerformingStudents.map((row) => (
                      <p key={row.studentId || row._id}>{row.rollNo} - {row.name} ({row.latestCgpa})</p>
                    ))}
                    {!lowPerformingStudents.length && <p>No records</p>}
                  </div>
                </article>

                <article className="rounded-2xl border border-white/60 bg-white/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <p className="text-sm font-semibold text-brand-ink">Recent Attendance Summary</p>
                  <div className="mt-2 space-y-1 text-xs text-brand-ink/75">
                    {recentAttendanceSummary.map((row) => (
                      <p key={row.id}>Sec {row.section} | {row.date} | P:{row.present} A:{row.absent}</p>
                    ))}
                    {!recentAttendanceSummary.length && <p>No records</p>}
                  </div>
                </article>
              </div>
            </section>

            <section className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
              <h3 className="font-heading text-xl text-brand-ink">Subject Pass Percentage</h3>
              <p className="mt-1 text-sm text-brand-ink/75">Pass percentage for subjects assigned to you.</p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-brand-ink/70">
                    <tr>
                      <th className="px-3 py-2">Subject Code</th>
                      <th className="px-3 py-2">Subject Name</th>
                      <th className="px-3 py-2">Pass %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics?.subjectPassPercentage || []).map((row) => (
                      <tr key={`${row.subjectCode}-${row.subjectName}`} className="border-t border-brand-ink/10">
                        <td className="px-3 py-2">{row.subjectCode}</td>
                        <td className="px-3 py-2">{row.subjectName}</td>
                        <td className="px-3 py-2 font-medium">{row.passPercentage}%</td>
                      </tr>
                    ))}
                    {!(analytics?.subjectPassPercentage || []).length && (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-brand-ink/60">No subject result data available yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activeMenu === "My Sections" && (
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
              <h3 className="font-heading text-xl text-brand-ink">My Sections</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {assignedSections.map((section) => (
                  <span key={section} className="rounded-full bg-brand-sand px-3 py-1 text-sm text-brand-ink">Section {section}</span>
                ))}
                {!assignedSections.length && <p className="text-sm text-brand-ink/60">No sections assigned yet.</p>}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {(portal.assignments || []).map((a) => (
                  <div key={a._id} className="rounded-lg bg-white/75 px-3 py-2">Sem {a.semester} | {a.academicYear} | Sec {a.section} | {a.subjectCode} - {a.subjectName}</div>
                ))}
              </div>
            </section>

            <form onSubmit={createAssignment} className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
              <h3 className="font-heading text-xl text-brand-ink">Create Teaching Assignment</h3>
              <div className="mt-4 grid gap-3">
                <input type="number" value={assignmentForm.semester} onChange={(e) => setAssignmentForm((p) => ({ ...p, semester: Number(e.target.value) }))} placeholder="Semester" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
                <input value={assignmentForm.academicYear} onChange={(e) => setAssignmentForm((p) => ({ ...p, academicYear: e.target.value }))} placeholder="Academic Year" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
                <input value={assignmentForm.section} onChange={(e) => setAssignmentForm((p) => ({ ...p, section: e.target.value.toUpperCase() }))} placeholder="Section" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
                <input value={assignmentForm.subjectCode} onChange={(e) => setAssignmentForm((p) => ({ ...p, subjectCode: e.target.value.toUpperCase() }))} placeholder="Subject Code" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
                <input value={assignmentForm.subjectName} onChange={(e) => setAssignmentForm((p) => ({ ...p, subjectName: e.target.value }))} placeholder="Subject Name" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
              </div>
              <button className="mt-4 rounded-lg bg-brand-ink px-4 py-2 text-white">Save Assignment</button>
            </form>
          </div>
        )}

        {activeMenu === "Mark Attendance" && (
          <AttendanceManager
            sections={assignedSections}
            selectedSection={attendanceSection}
            onSectionChange={setAttendanceSection}
            date={attendanceDate}
            onDateChange={setAttendanceDate}
            rows={attendanceRows}
            onStatusChange={onAttendanceStatusChange}
            onSave={saveAttendanceManager}
          />
        )}

        {activeMenu === "Student Performance" && (
          <div className="space-y-5">
            <section className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
              <label className="text-sm text-brand-ink/70">Select Student</label>
              <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className="mt-2 w-full rounded-lg border border-brand-ink/20 px-3 py-2">
                {students.map((student) => (
                  <option key={student._id} value={student._id}>{student.rollNo} - {student.name}</option>
                ))}
              </select>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <form onSubmit={submitMarks} className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
                <h3 className="font-heading text-xl text-brand-ink">Upload Marks</h3>
                <div className="mt-4 grid gap-3">
                  <input value={markForm.subjectCode} onChange={(e) => setMarkForm((p) => ({ ...p, subjectCode: e.target.value }))} placeholder="Subject Code" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
                  <input value={markForm.subjectName} onChange={(e) => setMarkForm((p) => ({ ...p, subjectName: e.target.value }))} placeholder="Subject Name" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
                  <input type="number" value={markForm.semester} onChange={(e) => setMarkForm((p) => ({ ...p, semester: Number(e.target.value) }))} placeholder="Semester" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
                  <input value={markForm.academicYear} onChange={(e) => setMarkForm((p) => ({ ...p, academicYear: e.target.value }))} placeholder="Academic Year" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
                  <input type="number" value={markForm.total} onChange={(e) => setMarkForm((p) => ({ ...p, total: Number(e.target.value) }))} placeholder="Total Marks" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
                </div>
                <button className="mt-4 rounded-lg bg-brand-ink px-4 py-2 text-white">Upload Marks</button>
              </form>

              <form onSubmit={submitAttendance} className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
                <h3 className="font-heading text-xl text-brand-ink">Upload Attendance</h3>
                <div className="mt-4 grid gap-3">
                  <input type="number" value={attendanceForm.semester} onChange={(e) => setAttendanceForm((p) => ({ ...p, semester: Number(e.target.value) }))} placeholder="Semester" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
                  <input value={attendanceForm.academicYear} onChange={(e) => setAttendanceForm((p) => ({ ...p, academicYear: e.target.value }))} placeholder="Academic Year" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
                  <input value={attendanceForm.subjectCode} onChange={(e) => setAttendanceForm((p) => ({ ...p, subjectCode: e.target.value }))} placeholder="Subject Code" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
                  <input value={attendanceForm.subjectName} onChange={(e) => setAttendanceForm((p) => ({ ...p, subjectName: e.target.value }))} placeholder="Subject Name" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
                  <input type="number" value={attendanceForm.classesConducted} onChange={(e) => setAttendanceForm((p) => ({ ...p, classesConducted: Number(e.target.value) }))} placeholder="Classes Conducted" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
                  <input type="number" value={attendanceForm.classesAttended} onChange={(e) => setAttendanceForm((p) => ({ ...p, classesAttended: Number(e.target.value) }))} placeholder="Classes Attended" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
                </div>
                <button className="mt-4 rounded-lg bg-brand-ocean px-4 py-2 text-white">Upload Attendance</button>
              </form>
            </div>

            <section className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
              <h3 className="font-heading text-xl text-brand-ink">Bulk Upload Section Marks</h3>
              <select value={selectedAssignment} onChange={(e) => selectAssignmentAndLoad(e.target.value)} className="mt-3 w-full rounded-lg border border-brand-ink/20 px-3 py-2">
                <option value="">Select Assignment</option>
                {(portal.assignments || []).map((a) => (
                  <option key={a._id} value={a._id}>Sem {a.semester} | Sec {a.section} | {a.subjectCode}</option>
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
                          <td className="px-3 py-2"><input type="number" value={row.internal} onChange={(e) => updateMarkRow(row.studentId, "internal", e.target.value)} className="w-24 rounded border border-brand-ink/20 px-2 py-1" /></td>
                          <td className="px-3 py-2"><input type="number" value={row.external} onChange={(e) => updateMarkRow(row.studentId, "external", e.target.value)} className="w-24 rounded border border-brand-ink/20 px-2 py-1" /></td>
                          <td className="px-3 py-2 font-semibold">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="mt-4 rounded-lg bg-brand-ink px-4 py-2 text-white">Upload Section Marks</button>
                </form>
              )}
            </section>
          </div>
        )}

        {activeMenu === "Top Students" && (
          <TopStudentsTable
            rows={topStudents}
            onRowClick={(row) => {
              setSelectedStudent(row.studentId);
              setActiveMenu("Student Performance");
            }}
          />
        )}

        {activeMenu === "Student Risk Analysis" && (
          <div className="grid gap-5 xl:grid-cols-2">
            <FacultyRiskChart data={riskData} />
            <section className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
              <h3 className="font-heading text-xl text-brand-ink">Risk Student List</h3>
              <div className="mt-4 space-y-2 text-sm">
                {sectionStudents
                  .filter((s) =>
                    s.riskLevel === "HIGH" ||
                    s.riskLevel === "MEDIUM" ||
                    (s.riskLevel == null && Number(s.cgpa || 0) <= 7)
                  )
                  .map((s) => (
                    <div key={s.studentId || s._id} className="rounded-lg bg-white/75 px-3 py-2">
                      <p className="font-medium text-brand-ink">{s.rollNo} - {s.name}</p>
                      <p className="text-brand-ink/70">Section {s.section} | CGPA {Number(s.cgpa || 0).toFixed(2)}</p>
                    </div>
                  ))}
                {!sectionStudents.some((s) =>
                  s.riskLevel === "HIGH" ||
                  s.riskLevel === "MEDIUM" ||
                  (s.riskLevel == null && Number(s.cgpa || 0) <= 7)
                ) && <p className="text-brand-ink/60">No risk students currently.</p>}
              </div>
            </section>
          </div>
        )}

        {activeMenu === "My Achievements" && (
          <FacultyAchievements form={achievementForm} onInput={onAchievementInput} onSubmit={addAchievement} rows={achievementRows} />
        )}

        {activeMenu === "My Profile" && (
          <FacultyProfile
            faculty={portal.faculty}
            facultyRecord={portal.facultyRecord}
            profileForm={profileForm}
            onFormChange={onProfileFormChange}
            onSubmit={saveProfile}
          />
        )}
      </section>
    </div>
  );
}
