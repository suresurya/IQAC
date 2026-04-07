import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import client from "../api/client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import FacultySidebar from "../components/FacultySidebar.jsx";
import SafeChartContainer from "../components/SafeChartContainer.jsx";
import NlqSearchBar from "../components/NlqSearchBar.jsx";

const NAV_ITEMS = [
  "Dashboard Overview",
  "Student Risk Analysis",
  "Student Performance",
  "Faculty Analytics",
  "Top Students",
  "My Sections",
  "Mark Attendance",
  "My Achievements"
];
const REPORTS = [
  { label: "Department Performance Report", reportType: "SECTION_WISE" },
  { label: "Backlog Report", reportType: "BACKLOG_ANALYSIS" },
  { label: "CGPA Distribution Report", reportType: "CGPA_DISTRIBUTION" },
  { label: "Faculty Contribution Report", reportType: "FACULTY_CONTRIBUTION" }
];

export default function HodDashboard() {
  const { user } = useAuth();
  const [activeItem, setActiveItem] = useState("Dashboard Overview");
  const [dashboard, setDashboard] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState("");
  const departmentId = typeof user?.department === "string" ? user.department : user?.department?._id;
  const effectiveDepartmentId = dashboard?.department?.id || departmentId;
  const departmentName = typeof user?.department === "object" ? user?.department?.name : "Department";
  const [placementForm, setPlacementForm] = useState({
    academicYear: "",
    totalEligible: "",
    totalPlaced: "",
    highestPackageLPA: "",
    medianPackageLPA: ""
  });
  const [allocationForm, setAllocationForm] = useState({
    section: "",
    semester: "",
    subject: "",
    facultyId: "",
    academicYear: ""
  });
  const [savingAllocation, setSavingAllocation] = useState(false);
  const [riskStudents, setRiskStudents] = useState([]);
  const [riskStudentsLoading, setRiskStudentsLoading] = useState(false);
  const [studentRows, setStudentRows] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const url = departmentId ? `/departments/${departmentId}/hod-dashboard` : "/departments/me/hod-dashboard";
        const res = await client.get(url);
        setDashboard(res.data.data);
        setStatus("");
      } catch (err) {
        if (err.response?.status !== 404 || departmentId) throw err;

        const { data } = await client.get("/departments");
        const departments = data.data || [];
        const tokenSources = [user?.name, user?.email, user?.username, user?.facultyId].filter(Boolean).join(" ").toUpperCase();
        const tokens = tokenSources.split(/[^A-Z0-9]+/).filter(Boolean);

        let matched = departments.find((dept) => tokens.includes(String(dept.code || "").toUpperCase()));
        if (!matched) {
          matched = departments.find((dept) => {
            const name = String(dept.name || "").toUpperCase();
            return tokens.some((token) => token.length >= 3 && name.includes(token));
          });
        }

        if (!matched?._id) throw err;
        const resolved = await client.get(`/departments/${matched._id}/hod-dashboard`);
        setDashboard(resolved.data.data);
        setStatus("");
      }
    };

    setLoading(true);
    loadDashboard()
      .catch((err) => setStatus(err.response?.data?.message || "Unable to load department dashboard"))
      .finally(() => setLoading(false));
  }, [departmentId]);

  const savePlacement = async (e) => {
    e.preventDefault();
    if (!effectiveDepartmentId) {
      setStatus("Department mapping missing for this HOD account.");
      return;
    }
    try {
      await client.post(`/departments/${effectiveDepartmentId}/placement`, placementForm);
      const refreshed = await client.get(`/departments/${effectiveDepartmentId}/hod-dashboard`);
      setDashboard(refreshed.data.data);
      setStatus("Placement statistics updated");
    } catch (err) {
      setStatus(err.response?.data?.message || "Unable to save placement data");
    }
  };

  const refreshDashboard = async () => {
    try {
      setLoading(true);
      const url = effectiveDepartmentId ? `/departments/${effectiveDepartmentId}/hod-dashboard` : "/departments/me/hod-dashboard";
      const res = await client.get(url);
      setDashboard(res.data.data);
      setStatus("Dashboard refreshed");
    } catch (err) {
      setStatus(err.response?.data?.message || "Unable to refresh dashboard");
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (reportType) => {
    setDownloading(reportType);
    setStatus("");
    try {
      const response = await client.post(
        "/reports/generate",
        { reportType, format: "PDF", department: effectiveDepartmentId },
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType.toLowerCase()}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setStatus(err.response?.data?.message || "Unable to generate report");
    } finally {
      setDownloading("");
    }
  };

  const saveSectionAllocation = async (e) => {
    e.preventDefault();
    if (!effectiveDepartmentId) {
      setStatus("Department mapping missing for this HOD account.");
      return;
    }

    if (!allocationForm.facultyId) {
      setStatus("Please select a faculty before saving allocation.");
      return;
    }

    setSavingAllocation(true);
    try {
      await client.post("/faculty/allocations", {
        department: effectiveDepartmentId,
        section: allocationForm.section,
        semester: Number(allocationForm.semester),
        subject: allocationForm.subject,
        facultyId: allocationForm.facultyId,
        academicYear: allocationForm.academicYear
      });

      setStatus("Section allocation saved successfully.");
      const refreshed = await client.get(`/departments/${effectiveDepartmentId}/hod-dashboard`);
      setDashboard(refreshed.data.data);
    } catch (err) {
      setStatus(err.response?.data?.message || "Unable to save section allocation");
    } finally {
      setSavingAllocation(false);
    }
  };

  const riskChartData = useMemo(() => {
    if (!dashboard?.riskDistribution) return [];
    return [
      { name: "High Risk", value: Number(dashboard.riskDistribution.high || 0), color: "#ef4444" },
      { name: "Medium Risk", value: Number(dashboard.riskDistribution.medium || 0), color: "#f59e0b" },
      { name: "Low Risk", value: Number(dashboard.riskDistribution.low || 0), color: "#10b981" }
    ];
  }, [dashboard]);

  const facultyAnalytics = dashboard?.facultyAnalytics || {
    facultyCount: 0,
    designationDistribution: [],
    researchOutput: { publications: 0, patents: 0, researchGrants: 0 },
    achievements: [],
    facultyList: []
  };

  const designationDistributionData = useMemo(
    () => (facultyAnalytics.designationDistribution || []).map((row) => ({
      designation: row.designation,
      count: Number(row.count || 0)
    })),
    [facultyAnalytics]
  );

  const designationCounts = useMemo(() => {
    const map = (facultyAnalytics.designationDistribution || []).reduce((acc, row) => {
      acc[String(row.designation || "").toLowerCase()] = Number(row.count || 0);
      return acc;
    }, {});

    return {
      professors: map["professor"] || 0,
      associateProfessors: map["associate professor"] || 0,
      assistantProfessors: map["assistant professor"] || 0
    };
  }, [facultyAnalytics]);

  useEffect(() => {
    if (activeItem !== "Student Risk Analysis" || !effectiveDepartmentId) return;

    setRiskStudentsLoading(true);
    client
      .get(`/departments/${effectiveDepartmentId}/risk-students`)
      .then((res) => setRiskStudents(res.data?.data || []))
      .catch((err) => {
        setStatus((prev) => prev || err.response?.data?.message || "Unable to load risk students");
      })
      .finally(() => setRiskStudentsLoading(false));
  }, [activeItem, effectiveDepartmentId]);

  useEffect(() => {
    if (activeItem !== "Student Performance" || !effectiveDepartmentId) return;

    setStudentsLoading(true);
    client
      .get(`/departments/${effectiveDepartmentId}/students`)
      .then((res) => setStudentRows(res.data?.data || []))
      .catch((err) => {
        setStatus((prev) => prev || err.response?.data?.message || "Unable to load department students");
      })
      .finally(() => setStudentsLoading(false));
  }, [activeItem, effectiveDepartmentId]);

  const showOverview = activeItem === "Dashboard Overview";
  const showRisk = activeItem === "Student Risk Analysis";
  const showPerformance = activeItem === "Student Performance";
  const showFacultyAnalytics = activeItem === "Faculty Analytics";
  const showTopStudents = activeItem === "Top Students";
  const showSections = activeItem === "My Sections";
  const showAttendance = activeItem === "Mark Attendance";
  const showAchievements = activeItem === "My Achievements";

  if (!effectiveDepartmentId && !dashboard) return <div className="text-brand-ink">Department mapping missing for this HOD account.</div>;
  if (!dashboard && status) return <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{status}</div>;
  if (!dashboard || loading) return <div className="text-brand-ink">Loading department analytics...</div>;

  return (
    <div className="grid min-h-[78vh] gap-6 lg:grid-cols-[260px,1fr]">
      <FacultySidebar items={NAV_ITEMS} active={activeItem} onChange={setActiveItem} title="HOD Department Dashboard" />

      <section className="space-y-6 rounded-3xl bg-[radial-gradient(circle_at_12%_20%,rgba(14,165,233,0.12),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(16,185,129,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.6),rgba(248,251,255,0.9))] p-1">
        <header className="rounded-3xl border border-white/60 bg-white/65 p-6 shadow-xl shadow-slate-200/45 backdrop-blur-md transition duration-300 hover:shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-brand-ink/65">IQAC Academic Intelligence</p>
              <h1 className="mt-2 font-heading text-2xl text-brand-ink sm:text-3xl">{dashboard.department?.name || departmentName} Department Intelligence Dashboard</h1>
              <p className="mt-1 text-sm text-brand-ink/75">A live department command center for student performance, academic risk, faculty output, and outcome intelligence.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Live Data</span>
              <button onClick={refreshDashboard} className="rounded-xl bg-brand-ink px-3 py-2 text-xs text-white transition hover:scale-[1.03]">Refresh</button>
            </div>
          </div>
          {status && <p className="mt-4 rounded-lg border border-white/60 bg-white/70 px-3 py-2 text-sm text-brand-ink">{status}</p>}
        </header>

        {(showOverview || showPerformance || showRisk || showSections) && (
          <NlqSearchBar departmentId={effectiveDepartmentId} />
        )}

        {(showOverview || showPerformance || showRisk || showSections) && (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card title="Total Students" value={dashboard.overviewCards.totalStudents} subtitle="Across department" />
            <Card title="Average CGPA" value={dashboard.overviewCards.averageCgpa} subtitle="Latest cumulative" color="from-brand-flame to-brand-ocean" />
            <Card title="Pass Percentage" value={`${dashboard.overviewCards.passPercentage}%`} subtitle="No-backlog ratio" color="from-emerald-500 to-teal-500" />
            <Card title="Placement Rate" value={`${dashboard.overviewCards.placementRate}%`} subtitle="Placement seasons" color="from-brand-mint to-brand-ocean" />
            <Card title="Total Faculty" value={dashboard.overviewCards.totalFaculty} subtitle="Teaching and research" color="from-brand-ocean to-brand-flame" />
            <Card title="Students At Risk" value={dashboard.overviewCards.studentsAtRisk} subtitle="Need intervention" color="from-orange-500 to-rose-500" />
          </section>
        )}

        {(showOverview || showTopStudents || showPerformance) && (
          <section className="rounded-2xl border border-white/55 bg-white/75 p-4 shadow-sm transition duration-300 hover:shadow-lg">
            <h3 className="font-heading text-lg text-brand-ink">Top Students</h3>
            <p className="mt-1 text-xs text-brand-ink/65">Top 10 students ranked by latest CGPA</p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-brand-ink/70">
                  <tr>
                    <th className="px-3 py-2">Rank</th>
                    <th className="px-3 py-2">Student Name</th>
                    <th className="px-3 py-2">Roll Number</th>
                    <th className="px-3 py-2">Section</th>
                    <th className="px-3 py-2">CGPA</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboard.topStudents || []).map((row, index) => (
                    <tr key={row.studentId} className="border-t border-brand-ink/10 transition hover:bg-white/80">
                      <td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-brand-ink">#{index + 1}</span></td>
                      <td className="px-3 py-2 font-medium">{row.name}</td>
                      <td className="px-3 py-2">{row.rollNo}</td>
                      <td className="px-3 py-2">{row.section}</td>
                      <td className="px-3 py-2">{row.cgpa}</td>
                    </tr>
                  ))}
                  {!(dashboard.topStudents || []).length && (
                    <tr>
                      <td colSpan={5} className="px-3 py-5 text-center text-brand-ink/60">No student metrics available yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {(showOverview || showRisk || showSections) && (
          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Student Risk Distribution">
              <SafeChartContainer className="h-72 w-full min-w-0" minHeight={280}>
                {(size) => (
                    <PieChart width={size.width} height={size.height}>
                      <Pie data={riskChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={52}>
                        {riskChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                )}
              </SafeChartContainer>
            </Panel>

            <Panel title="Section Performance Comparison">
              <SafeChartContainer className="h-72 w-full min-w-0" minHeight={280}>
                {(size) => (
                    <BarChart width={size.width} height={size.height} data={dashboard.sectionPerformance || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d5deea" />
                      <XAxis dataKey="section" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="averageCgpa" name="Average CGPA" fill="#2563eb" radius={[8, 8, 0, 0]} />
                    </BarChart>
                )}
              </SafeChartContainer>
            </Panel>
          </div>
        )}

        {showPerformance && (
          <Panel title="Department Students (MongoDB)">
            {studentsLoading && <p className="text-sm text-brand-ink/70">Loading students...</p>}
            {!studentsLoading && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-brand-ink/70">
                    <tr>
                      <th className="px-3 py-2">Roll Number</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Section</th>
                      <th className="px-3 py-2">Semester</th>
                      <th className="px-3 py-2">CGPA</th>
                      <th className="px-3 py-2">Attendance %</th>
                      <th className="px-3 py-2">Backlogs</th>
                      <th className="px-3 py-2">At Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentRows.map((row) => (
                      <tr key={row._id} className="border-t border-brand-ink/10 transition hover:bg-white/80">
                        <td className="px-3 py-2">{row.rollNo}</td>
                        <td className="px-3 py-2 font-medium">{row.name}</td>
                        <td className="px-3 py-2">{row.section}</td>
                        <td className="px-3 py-2">{row.semester}</td>
                        <td className="px-3 py-2">{row.cgpa}</td>
                        <td className="px-3 py-2">{row.attendancePercent}</td>
                        <td className="px-3 py-2">{row.backlogs}</td>
                        <td className="px-3 py-2">{row.atRisk ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                    {!studentRows.length && !studentsLoading && (
                      <tr>
                        <td colSpan={8} className="px-3 py-5 text-center text-brand-ink/60">
                          No students found for this department in MongoDB.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {showRisk && (
          <Panel title="At-Risk Students (MongoDB)">
            {riskStudentsLoading && <p className="text-sm text-brand-ink/70">Loading at-risk students...</p>}
            {!riskStudentsLoading && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-brand-ink/70">
                    <tr>
                      <th className="px-3 py-2">Roll Number</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Section</th>
                      <th className="px-3 py-2">Semester</th>
                      <th className="px-3 py-2">CGPA</th>
                      <th className="px-3 py-2">Attendance %</th>
                      <th className="px-3 py-2">Backlogs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskStudents.map((row) => (
                      <tr key={row._id} className="border-t border-brand-ink/10 transition hover:bg-white/80">
                        <td className="px-3 py-2">{row.rollNo}</td>
                        <td className="px-3 py-2 font-medium">{row.name}</td>
                        <td className="px-3 py-2">{row.section}</td>
                        <td className="px-3 py-2">{row.semester}</td>
                        <td className="px-3 py-2">{row.cgpa}</td>
                        <td className="px-3 py-2">{row.attendancePercent}</td>
                        <td className="px-3 py-2">{row.backlogs}</td>
                      </tr>
                    ))}
                    {!riskStudents.length && !riskStudentsLoading && (
                      <tr>
                        <td colSpan={7} className="px-3 py-5 text-center text-brand-ink/60">
                          No at-risk students found for this department in MongoDB.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {(showOverview || showPerformance) && (
          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Subject Pass Percentage">
              <SafeChartContainer className="h-72 w-full min-w-0" minHeight={280}>
                {(size) => (
                    <BarChart width={size.width} height={size.height} data={dashboard.subjectPassPercentage || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d5deea" />
                      <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="passPercentage" name="Pass %" fill="#10b981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                )}
              </SafeChartContainer>
            </Panel>

            <Panel title="Backlog Analytics">
              <SafeChartContainer className="h-72 w-full min-w-0" minHeight={280}>
                {(size) => (
                    <BarChart width={size.width} height={size.height} data={dashboard.backlogAnalysis || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d5deea" />
                      <XAxis dataKey="semester" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="backlogCount" name="Backlog Count" fill="#f97316" radius={[8, 8, 0, 0]} />
                    </BarChart>
                )}
              </SafeChartContainer>
            </Panel>
          </div>
        )}

        {(showOverview || showSections) && (
          <Panel title="Attendance Monitoring">
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 transition hover:shadow-sm">
                <p className="text-sm text-amber-800">Students with attendance below 75%</p>
                <p className="mt-1 text-3xl font-semibold text-amber-900">{dashboard.overviewCards.attendanceBelow75}</p>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-2">
                <SafeChartContainer className="h-52 w-full min-w-0" minHeight={200}>
                  {(size) => (
                      <BarChart width={size.width} height={size.height} data={dashboard.sectionAttendanceTrends || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#d5deea" />
                        <XAxis dataKey="section" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="attendancePercent" name="Attendance %" fill="#0284c7" radius={[8, 8, 0, 0]} />
                      </BarChart>
                  )}
                </SafeChartContainer>
              </div>
            </div>
          </Panel>
        )}

        {(showOverview || showPerformance) && (
          <Panel title="Faculty Contribution Analytics">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-brand-ink/70">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Publications</th>
                    <th className="px-3 py-2">Patents</th>
                    <th className="px-3 py-2">Awards</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboard.facultyContributions || []).map((row) => (
                    <tr key={row.name} className="border-t border-brand-ink/10 transition hover:bg-white/80">
                      <td className="px-3 py-2 font-medium">{row.name}</td>
                      <td className="px-3 py-2">{row.publications}</td>
                      <td className="px-3 py-2">{row.patents}</td>
                      <td className="px-3 py-2">{row.awards}</td>
                    </tr>
                  ))}
                  {!(dashboard.facultyContributions || []).length && (
                    <tr>
                      <td colSpan={4} className="px-3 py-5 text-center text-brand-ink/60">No faculty contribution data yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {(showOverview || showFacultyAnalytics) && (
          <section className="space-y-5 rounded-2xl border border-white/55 bg-white/75 p-4 shadow-sm transition duration-300 hover:shadow-lg">
            <h3 className="font-heading text-lg text-brand-ink">Department Faculty Analytics</h3>
            <p className="text-sm text-brand-ink/70">
              Department-level faculty monitoring powered by the shared MongoDB faculties collection. This section is read-only for HOD.
            </p>

            <Panel title="Data Flow">
              <div className="grid gap-3 md:grid-cols-[1fr,auto,1fr,auto,1fr] md:items-center">
                <article className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-center">
                  <p className="text-xs uppercase tracking-[0.14em] text-sky-700">Source</p>
                  <p className="mt-1 font-semibold text-sky-900">MongoDB Atlas</p>
                </article>

                <p className="text-center text-lg font-bold text-brand-ink/60">→</p>

                <article className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-center">
                  <p className="text-xs uppercase tracking-[0.14em] text-indigo-700">Collection</p>
                  <p className="mt-1 font-semibold text-indigo-900">faculties</p>
                </article>

                <p className="text-center text-lg font-bold text-brand-ink/60">→</p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                    <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">Faculty Portal</p>
                    <p className="mt-1 font-semibold text-emerald-900">Editable</p>
                  </article>
                  <article className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                    <p className="text-xs uppercase tracking-[0.14em] text-amber-700">HOD Portal</p>
                    <p className="mt-1 font-semibold text-amber-900">Read-only</p>
                  </article>
                </div>
              </div>
            </Panel>

            <Panel title="Department Faculty Overview">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <article className="rounded-xl border border-white/60 bg-white/85 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-brand-ink/60">Total Faculty</p>
                  <p className="mt-1 text-2xl font-semibold text-brand-ink">{facultyAnalytics.facultyCount}</p>
                </article>
                <article className="rounded-xl border border-white/60 bg-white/85 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-brand-ink/60">Professors</p>
                  <p className="mt-1 text-2xl font-semibold text-brand-ink">{designationCounts.professors}</p>
                </article>
                <article className="rounded-xl border border-white/60 bg-white/85 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-brand-ink/60">Associate Professors</p>
                  <p className="mt-1 text-2xl font-semibold text-brand-ink">{designationCounts.associateProfessors}</p>
                </article>
                <article className="rounded-xl border border-white/60 bg-white/85 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-brand-ink/60">Assistant Professors</p>
                  <p className="mt-1 text-2xl font-semibold text-brand-ink">{designationCounts.assistantProfessors}</p>
                </article>
              </div>
            </Panel>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card
                title="Faculty Count"
                value={facultyAnalytics.facultyCount}
                subtitle="Total faculty in department"
                color="from-blue-600 to-cyan-500"
              />
              <Card
                title="Publications"
                value={facultyAnalytics.researchOutput.publications}
                subtitle="Total research publications"
                color="from-emerald-600 to-teal-500"
              />
              <Card
                title="Patents"
                value={facultyAnalytics.researchOutput.patents}
                subtitle="Department patents"
                color="from-violet-600 to-indigo-500"
              />
              <Card
                title="Research Grants"
                value={facultyAnalytics.researchOutput.researchGrants}
                subtitle="Recognized grants"
                color="from-amber-600 to-orange-500"
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <Panel title="Designation Distribution">
                <SafeChartContainer className="h-72 w-full min-w-0" minHeight={280}>
                  {(size) => (
                    <BarChart width={size.width} height={size.height} data={designationDistributionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d5deea" />
                      <XAxis dataKey="designation" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Faculty" fill="#2563eb" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  )}
                </SafeChartContainer>
              </Panel>

              <Panel title="Faculty Achievements Panel">
                <div className="max-h-72 space-y-2 overflow-auto text-sm">
                  {(facultyAnalytics.achievements || []).map((row) => (
                    <article key={row.id} className="rounded-lg border border-white/60 bg-white/75 px-3 py-2">
                      <p className="font-medium text-brand-ink">{row.title}</p>
                      <p className="text-brand-ink/70">{row.facultyName}</p>
                      <p className="text-xs text-brand-ink/60">{row.category}{row.date ? ` | ${new Date(row.date).toLocaleDateString()}` : ""}</p>
                    </article>
                  ))}
                  {!(facultyAnalytics.achievements || []).length && <p className="text-brand-ink/60">No faculty achievements yet.</p>}
                </div>
              </Panel>
            </div>

            <Panel title="Faculty List">
              <div className="grid gap-3 sm:grid-cols-2">
                {(facultyAnalytics.facultyList || []).map((row) => (
                  <article key={`${row.rowId || row.facultyId}-card`} className="rounded-xl border border-white/60 bg-white/85 p-3">
                    <p className="font-semibold text-brand-ink">{row.name}</p>
                    <p className="mt-1 text-sm text-brand-ink/70">{row.designation}</p>
                    <p className="text-xs text-brand-ink/60">Faculty ID : {row.facultyId || "N/A"}</p>
                    <p className="mt-2 text-sm text-brand-ink">Publications : {row.publications}</p>
                    <p className="text-sm text-brand-ink">Patents : {row.patents}</p>
                    <p className="text-sm text-brand-ink">Awards : {row.awards}</p>
                  </article>
                ))}
                {!(facultyAnalytics.facultyList || []).length && <p className="text-brand-ink/60">No faculty records available for this department.</p>}
              </div>
            </Panel>

            <Panel title="Faculty List (Read-only)">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-brand-ink/70">
                    <tr>
                      <th className="px-3 py-2">Faculty ID</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Designation</th>
                      <th className="px-3 py-2">Publications</th>
                      <th className="px-3 py-2">Patents</th>
                      <th className="px-3 py-2">Awards</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(facultyAnalytics.facultyList || []).map((row) => (
                      <tr key={row.rowId || row.facultyId} className="border-t border-brand-ink/10 transition hover:bg-white/80">
                        <td className="px-3 py-2">{row.facultyId || "N/A"}</td>
                        <td className="px-3 py-2 font-medium">{row.name}</td>
                        <td className="px-3 py-2">{row.designation}</td>
                        <td className="px-3 py-2">{row.publications}</td>
                        <td className="px-3 py-2">{row.patents}</td>
                        <td className="px-3 py-2">{row.awards}</td>
                      </tr>
                    ))}
                    {!(facultyAnalytics.facultyList || []).length && (
                      <tr>
                        <td colSpan={6} className="px-3 py-5 text-center text-brand-ink/60">No faculty records available for this department.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-brand-ink/60">Read-only view: no edit actions are available in HOD department portal.</p>
            </Panel>

            <Panel title="Create Section Allocation (Admin/HOD)">
              <p className="mb-3 text-sm text-brand-ink/70">Assign faculty to section and subject so faculty analytics gets populated instantly.</p>
              <form onSubmit={saveSectionAllocation} className="grid gap-3 md:grid-cols-2">
                <select
                  value={allocationForm.facultyId}
                  onChange={(e) => setAllocationForm((prev) => ({ ...prev, facultyId: e.target.value }))}
                  className="rounded-lg border border-brand-ink/20 px-3 py-2"
                >
                  <option value="">Select Faculty</option>
                  {(facultyAnalytics.facultyList || []).map((row) => (
                    <option key={`${row.rowId || row.facultyId}-opt`} value={row.facultyId}>
                      {row.name} ({row.facultyId || "N/A"})
                    </option>
                  ))}
                </select>
                <input
                  value={allocationForm.subject}
                  onChange={(e) => setAllocationForm((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="Subject"
                  className="rounded-lg border border-brand-ink/20 px-3 py-2"
                />
                <input
                  value={allocationForm.section}
                  onChange={(e) => setAllocationForm((prev) => ({ ...prev, section: e.target.value.toUpperCase() }))}
                  placeholder="Section (A/B/C)"
                  className="rounded-lg border border-brand-ink/20 px-3 py-2"
                />
                <input
                  type="number"
                  value={allocationForm.semester}
                  onChange={(e) => setAllocationForm((prev) => ({ ...prev, semester: Number(e.target.value) }))}
                  placeholder="Semester"
                  className="rounded-lg border border-brand-ink/20 px-3 py-2"
                />
                <input
                  value={allocationForm.academicYear}
                  onChange={(e) => setAllocationForm((prev) => ({ ...prev, academicYear: e.target.value }))}
                  placeholder="Academic Year"
                  className="rounded-lg border border-brand-ink/20 px-3 py-2"
                />
                <button
                  disabled={savingAllocation}
                  className="rounded-lg bg-brand-ink px-4 py-2 text-sm text-white transition hover:scale-[1.02] hover:bg-brand-ocean disabled:opacity-60"
                >
                  {savingAllocation ? "Saving..." : "Save Allocation"}
                </button>
              </form>
            </Panel>
          </section>
        )}

        {(showOverview || showAchievements) && (
          <Panel title="Department Achievements">
            <div className="max-h-80 space-y-2 overflow-auto text-sm">
              {(dashboard.departmentAchievements || []).map((row) => (
                <article key={row.id} className="rounded-lg border border-white/60 bg-white/75 px-3 py-2 transition hover:-translate-y-0.5 hover:shadow-sm">
                  <p className="font-medium text-brand-ink">{row.title}</p>
                  <p className="text-brand-ink/70">{row.type}: {row.person}</p>
                  <p className="text-xs text-brand-ink/60">{row.category} | {row.date ? new Date(row.date).toLocaleDateString() : "-"}</p>
                </article>
              ))}
              {!(dashboard.departmentAchievements || []).length && <p className="text-brand-ink/60">No achievements captured for this department.</p>}
            </div>
          </Panel>
        )}

        {(showOverview || showPerformance) && (
          <Panel title="Automated Reports">
            <div className="grid gap-2 sm:grid-cols-2">
              {REPORTS.map((report) => (
                <button
                  key={report.reportType}
                  onClick={() => downloadReport(report.reportType)}
                  disabled={downloading === report.reportType}
                  className="rounded-lg bg-brand-ink px-3 py-2 text-sm text-white transition duration-200 hover:scale-[1.02] hover:bg-brand-ocean disabled:opacity-60"
                >
                  {downloading === report.reportType ? "Generating..." : report.label}
                </button>
              ))}
            </div>
          </Panel>
        )}

        {(showOverview || showSections) && (
          <form onSubmit={savePlacement} className="rounded-2xl border border-white/50 bg-white/80 p-4 shadow-sm transition hover:shadow-md">
            <h3 className="font-heading text-lg text-brand-ink">Upload Placement Statistics</h3>
            <p className="mt-1 text-xs text-brand-ink/65">Update year-wise placement numbers for department-level intelligence metrics.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input
                placeholder="Academic Year"
                value={placementForm.academicYear}
                onChange={(e) => setPlacementForm((prev) => ({ ...prev, academicYear: e.target.value }))}
                className="rounded-lg border border-brand-ink/20 px-3 py-2"
              />
              <input
                type="number"
                placeholder="Total Eligible"
                value={placementForm.totalEligible}
                onChange={(e) => setPlacementForm((prev) => ({ ...prev, totalEligible: Number(e.target.value) }))}
                className="rounded-lg border border-brand-ink/20 px-3 py-2"
              />
              <input
                type="number"
                placeholder="Total Placed"
                value={placementForm.totalPlaced}
                onChange={(e) => setPlacementForm((prev) => ({ ...prev, totalPlaced: Number(e.target.value) }))}
                className="rounded-lg border border-brand-ink/20 px-3 py-2"
              />
            </div>
            <button className="mt-3 rounded-lg bg-brand-ink px-4 py-2 text-white transition hover:scale-[1.02] hover:bg-brand-ocean">Save Placement Data</button>
          </form>
        )}

        {showAttendance && (
          <Panel title="Mark Attendance">
            <p className="text-sm text-brand-ink/75">
              Attendance insights are shown under My Sections. For daily marking workflow, use the Faculty-style attendance entry module when enabled for HOD in this deployment.
            </p>
          </Panel>
        )}
      </section>
    </div>
  );
}

function Card({ title, value, subtitle, color = "from-[#112a46] to-[#0d6efd]" }) {
  return (
    <article className="group rounded-2xl border border-white/55 bg-white/85 p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-brand-ink/60">{title}</p>
          <p className={`mt-2 bg-gradient-to-r ${color} bg-clip-text text-3xl font-semibold text-transparent`}>{value}</p>
          <p className="mt-1 text-xs text-brand-ink/65">{subtitle}</p>
        </div>
        <span className="rounded-full bg-slate-100 p-2 text-brand-ink/70 transition group-hover:bg-slate-200">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 18h16" />
            <path d="M7 14l3-3 3 2 4-5" />
          </svg>
        </span>
      </div>
    </article>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/50 bg-white/85 p-4 shadow-sm transition duration-300 hover:shadow-md">
      <h3 className="font-heading text-lg text-brand-ink">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}
