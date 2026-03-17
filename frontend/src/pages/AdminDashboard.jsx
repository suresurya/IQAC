import { useEffect, useMemo, useState } from "react";
import client from "../api/client";
import Sidebar from "../components/Sidebar.jsx";
import StatsCards from "../components/StatsCards.jsx";
import RiskChart from "../components/RiskChart.jsx";
import DepartmentChart from "../components/DepartmentChart.jsx";
import AddFacultyDrawer from "../components/AddFacultyDrawer.jsx";

import NlqSearchBar from "../components/NlqSearchBar.jsx";

const NAV_ITEMS = [
  "Overview",
  "Add Department",
  "Add Faculty",
  "Accreditation Reports",
  "Department Compare",
  "Institutional Analysis"
];

export default function AdminDashboard() {
  const [activeItem, setActiveItem] = useState("Overview");
  const [reportMode, setReportMode] = useState("");
  const [reportType, setReportType] = useState("STUDENT_PROGRESS");
  const [documentFormat, setDocumentFormat] = useState("PDF");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState("");
  const [reportHistoryRows, setReportHistoryRows] = useState([]);
  const [reportStatus, setReportStatus] = useState("");
  const [entities, setEntities] = useState({ departments: [], faculties: [], students: [] });
  const [analytics, setAnalytics] = useState(null);
  const [faculties, setFaculties] = useState([]);
  const [departmentComparisonRows, setDepartmentComparisonRows] = useState([]);

  const loadDashboard = async () => {
    const [entitiesRes, analyticsRes, facultyRes, departmentCompareRes] = await Promise.all([
      client.get("/admin/entities"),
      client.get("/admin/analytics"),
      client.get("/faculty"),
      client.get("/admin/department-comparison")
    ]);

    setEntities(entitiesRes.data.data || { departments: [], faculties: [], students: [] });
    setAnalytics(analyticsRes.data.data || null);
    setFaculties(facultyRes.data.data || []);
    setDepartmentComparisonRows(departmentCompareRes.data.data || []);
  };

  useEffect(() => {
    loadDashboard().catch(() => null);
  }, []);

  useEffect(() => {
    if (activeItem === "Add Faculty") {
      setDrawerOpen(true);
    }

    if (activeItem !== "Accreditation Reports") {
      setReportMode("");
      setReportStatus("");
      setDownloadingReport("");
    }
  }, [activeItem]);

  const downloadReport = async () => {
    if (!reportType) return;
    setReportStatus("");
    setDownloadingReport(reportType);

    try {
      const payload = { reportType, format: documentFormat };
      const res = await client.post("/reports/generate", payload, {
        responseType: "blob"
      });

      const blob = new Blob([res.data], { type: documentFormat === "PDF" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      
      const ext = documentFormat === "PDF" ? "pdf" : "xlsx";
      a.href = url;
      a.download = `${reportType.toLowerCase()}_report.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setReportStatus("Report downloaded successfully.");
    } catch (error) {
      let msg = "Unable to generate report";
      try {
        if (error.response?.data instanceof Blob) {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          msg = json.message || msg;
        } else if (error.response?.data?.message) {
          msg = error.response.data.message;
        }
      } catch (_) { /* parsing failed, use default */ }
      setReportStatus(msg);
    } finally {
      setDownloadingReport("");
    }
  };

  const loadReportHistory = async () => {
    setReportStatus("");
    try {
      const { data } = await client.get("/reports/history");
      setReportHistoryRows(data.data || []);
    } catch (error) {
      setReportStatus(error.response?.data?.message || "Unable to load report history");
    }
  };

  const stats = useMemo(
    () => [
      {
        title: "Total Students",
        value: String(analytics?.summary?.totalStudents || entities.students?.length || 0),
        trend: "",
        trendUp: true,
        color: "from-blue-500/70 via-sky-400/70 to-cyan-300/70"
      },
      {
        title: "Total Faculty",
        value: String(analytics?.summary?.totalFaculties || faculties.length || 0),
        trend: "",
        trendUp: true,
        color: "from-emerald-500/65 via-teal-400/65 to-cyan-300/65"
      },
      {
        title: "Departments",
        value: String(analytics?.summary?.totalDepartments || entities.departments?.length || 0),
        trend: "",
        trendUp: true,
        color: "from-indigo-500/65 via-violet-400/65 to-fuchsia-300/65"
      },
      {
        title: "Faculty Achievements",
        value: String(analytics?.summary?.totalFacultyAchievements || 0),
        trend: "",
        trendUp: true,
        color: "from-amber-500/65 via-orange-400/65 to-rose-300/65"
      }
    ],
    [analytics, entities, faculties]
  );

  const riskDistribution = useMemo(() => {
    const rows = analytics?.departmentComparison || [];
    const sums = rows.reduce(
      (acc, row) => {
        acc.high += Number(row.riskDistribution?.high || 0);
        acc.medium += Number(row.riskDistribution?.medium || 0);
        acc.low += Number(row.riskDistribution?.low || 0);
        return acc;
      },
      { high: 0, medium: 0, low: 0 }
    );

    return [
      { name: "High Risk", value: sums.high, color: "#ef4444" },
      { name: "Medium Risk", value: sums.medium, color: "#f97316" },
      { name: "Low Risk", value: sums.low, color: "#16a34a" }
    ];
  }, [analytics]);

  const departmentComparison = useMemo(() => {
    return (departmentComparisonRows || []).map((row) => ({
      department: row.department,
      passPercentage: Number(row.passPercentage || 0),
      placementRate: Number(row.placementRate || 0),
      averageCGPA: Number(row.averageCGPA || 0)
    }));
  }, [departmentComparisonRows]);

  const facultyByDepartment = useMemo(() => {
    const buckets = new Map();
    faculties.forEach((row) => {
      const key = row.department?.code || row.department?.name || "UNASSIGNED";
      buckets.set(key, (buckets.get(key) || 0) + 1);
    });

    return Array.from(buckets.entries())
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);
  }, [faculties]);

  const handleCreateFaculty = async (payload) => {
    setSubmitting(true);
    try {
      await client.post("/faculty/add", payload);
      await loadDashboard();
      setActiveItem("Overview");
      setDrawerOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-[78vh] gap-6 lg:grid-cols-[260px,1fr]">
      <Sidebar items={NAV_ITEMS} activeItem={activeItem} onSelect={setActiveItem} />

      <section className="space-y-6">
        <header className="relative overflow-hidden rounded-3xl border border-white/45 bg-[radial-gradient(circle_at_15%_20%,rgba(37,99,235,0.16),transparent_38%),radial-gradient(circle_at_80%_30%,rgba(16,185,129,0.16),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.82),rgba(243,248,254,0.92))] p-5 shadow-xl shadow-slate-200/40 backdrop-blur-md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-ink/65">IQAC Academic Intelligence</p>
              <h1 className="mt-2 font-heading text-2xl text-brand-ink sm:text-3xl">University Analytics Control Panel</h1>
              <p className="mt-1 text-sm text-brand-ink/75">
                Institutional metrics, faculty intelligence, accreditation readiness, and department comparisons in one cockpit.
              </p>
            </div>
            <button
              onClick={() => setDrawerOpen(true)}
              className="rounded-xl bg-gradient-to-r from-brand-ink to-brand-ocean px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02]"
            >
              Add Faculty
            </button>
          </div>
        </header>

        {activeItem === "Overview" && (
          <div className="space-y-6">
            <NlqSearchBar />
            <StatsCards stats={stats} />

            <div className="grid gap-5 xl:grid-cols-2">
              <RiskChart data={riskDistribution} />
              <DepartmentChart data={departmentComparison} />
            </div>

            <section className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
              <h3 className="font-heading text-xl text-brand-ink">Department Faculty Distribution</h3>
              <p className="mt-1 text-sm text-brand-ink/75">This updates instantly whenever a new faculty profile is created.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {facultyByDepartment.map((row) => (
                  <article key={row.department} className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.14em] text-brand-ink/60">{row.department}</p>
                    <p className="mt-2 text-3xl font-semibold text-brand-ink">{row.count}</p>
                    <p className="text-xs text-brand-ink/70">Faculty members</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
              <h3 className="font-heading text-xl text-brand-ink">Faculty Directory Snapshot</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-brand-ink/70">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Employee ID</th>
                      <th className="px-3 py-2">Department</th>
                      <th className="px-3 py-2">Designation</th>
                      <th className="px-3 py-2">Sections</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faculties.slice(0, 8).map((row) => (
                      <tr key={row._id} className="border-t border-brand-ink/10">
                        <td className="px-3 py-2 font-medium text-brand-ink">{row.name}</td>
                        <td className="px-3 py-2">{row.employeeId}</td>
                        <td className="px-3 py-2">{row.department?.code || row.department?.name}</td>
                        <td className="px-3 py-2">{row.designation}</td>
                        <td className="px-3 py-2">{(row.sections || []).join(", ") || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activeItem !== "Overview" && activeItem !== "Add Faculty" && (
          <section className="rounded-3xl border border-white/45 bg-white/45 p-6 shadow-xl shadow-slate-200/35 backdrop-blur-md">
            <h3 className="font-heading text-xl text-brand-ink">{activeItem}</h3>
            <p className="mt-2 text-sm text-brand-ink/75">
              This panel is ready for workflow integration. The analytics widgets above are fully functional with live institutional data.
            </p>
            {activeItem === "Department Compare" && (
              <div className="mt-6">
                <DepartmentChart data={departmentComparison} />
              </div>
            )}
            {activeItem === "Accreditation Reports" && (
              <div className="mt-6 space-y-5">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setReportMode("generate")}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow transition hover:scale-[1.02] ${reportMode === "generate" ? "bg-gradient-to-r from-brand-ink to-brand-ocean" : "bg-gradient-to-r from-brand-ink/80 to-brand-ocean/80"}`}
                  >
                    Report Generation
                  </button>
                  <button
                    onClick={async () => {
                      setReportMode("history");
                      await loadReportHistory();
                    }}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow transition hover:scale-[1.02] ${reportMode === "history" ? "bg-gradient-to-r from-brand-ocean to-brand-flame" : "bg-gradient-to-r from-brand-ocean/80 to-brand-flame/80"}`}
                  >
                    View Previous Reports
                  </button>
                </div>

                {reportStatus && <p className="text-sm text-brand-ink">{reportStatus}</p>}

                {reportMode === "generate" && (
                  <div className="rounded-2xl border border-white/55 bg-white/70 p-6 shadow-sm">
                    <h4 className="font-semibold text-brand-ink">Generate New System Report</h4>
                    <p className="mt-2 text-sm text-brand-ink/75">Select the report type and format. System will auto-aggregate data and attach LLM analysis where applicable.</p>
                    
                    <div className="mt-5 grid max-w-lg gap-4">
                      <div>
                        <label className="text-sm font-medium text-brand-ink/80 block mb-1">Report Target</label>
                        <select 
                          className="w-full rounded-xl border-brand-ink/20 bg-white/80 p-2 text-sm shadow-sm outline-none focus:border-brand-ocean focus:ring-1 focus:ring-brand-ocean"
                          value={reportType}
                          onChange={(e) => setReportType(e.target.value)}
                        >
                          <option value="STUDENT_PROGRESS">Student Academic Progress Report</option>
                          <option value="DEPARTMENT_PERFORMANCE">Department Performance Comparison</option>
                          <option value="CGPA_DISTRIBUTION">Institution CGPA Distribution Analysis</option>
                          <option value="BACKLOG_ANALYSIS">Backlog and Risk Analysis Report</option>
                          <option value="PLACEMENT">Placement Forecast and Statistics</option>
                          <option value="FACULTY_CONTRIBUTION">Faculty Contribution (NBA Criterion 4)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-brand-ink/80 block mb-1">Export Format</label>
                        <select 
                          className="w-full rounded-xl border-brand-ink/20 bg-white/80 p-2 text-sm shadow-sm outline-none focus:border-brand-ocean focus:ring-1 focus:ring-brand-ocean"
                          value={documentFormat}
                          onChange={(e) => setDocumentFormat(e.target.value)}
                        >
                          <option value="PDF">Professional PDF Document</option>
                          <option value="EXCEL">Excel Spreadsheet (.xlsx)</option>
                        </select>
                      </div>

                      <button
                        onClick={downloadReport}
                        disabled={!!downloadingReport}
                        className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-ink to-brand-ocean px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-60"
                      >
                        {downloadingReport ? "Building Document..." : "Generate and Download"}
                      </button>
                    </div>
                  </div>
                )}

                {reportMode === "history" && (
                  <div className="overflow-x-auto rounded-2xl border border-white/50 bg-white/70 p-3">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-brand-ink/70">
                        <tr>
                          <th className="px-3 py-2">Report Type</th>
                          <th className="px-3 py-2">Format</th>
                          <th className="px-3 py-2">Generated By</th>
                          <th className="px-3 py-2">Created At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportHistoryRows.map((row) => (
                          <tr key={row._id} className="border-t border-brand-ink/10">
                            <td className="px-3 py-2">{row.reportType}</td>
                            <td className="px-3 py-2">{row.format}</td>
                            <td className="px-3 py-2">{row.generatedBy?.name || row.generatedBy?.email || "System"}</td>
                            <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                        {!reportHistoryRows.length && (
                          <tr>
                            <td colSpan={4} className="px-3 py-5 text-center text-brand-ink/60">No previous reports found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {activeItem === "Add Faculty" && (
          <section className="rounded-3xl border border-white/45 bg-white/45 p-6 shadow-xl shadow-slate-200/35 backdrop-blur-md">
            <h3 className="font-heading text-xl text-brand-ink">Faculty Management</h3>
            <p className="mt-2 text-sm text-brand-ink/75">Use the Add Faculty button to open the full profile creation drawer.</p>
            <button onClick={() => setDrawerOpen(true)} className="mt-4 rounded-xl bg-brand-ink px-4 py-2 text-white">Open Add Faculty</button>
          </section>
        )}
      </section>

      <AddFacultyDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          if (activeItem === "Add Faculty") setActiveItem("Overview");
        }}
        departments={entities.departments || []}
        onSubmit={handleCreateFaculty}
        loading={submitting}
      />
    </div>
  );
}
