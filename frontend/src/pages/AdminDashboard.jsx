import { useEffect, useMemo, useState } from "react";
import client from "../api/client";
import Sidebar from "../components/Sidebar.jsx";
import StatsCards from "../components/StatsCards.jsx";
import RiskChart from "../components/RiskChart.jsx";
import DepartmentChart from "../components/DepartmentChart.jsx";
import AddFacultyDrawer from "../components/AddFacultyDrawer.jsx";

const NAV_ITEMS = [
  "Overview",
  "Add Department",
  "Add Faculty",
  "Accreditation Report",
  "Department Compare",
  "Institutional Analysis"
];

export default function AdminDashboard() {
  const [activeItem, setActiveItem] = useState("Overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
  }, [activeItem]);

  const stats = useMemo(
    () => [
      {
        title: "Total Students",
        value: String(analytics?.summary?.totalStudents || entities.students?.length || 0),
        trend: "+4.1%",
        trendUp: true,
        color: "from-blue-500/70 via-sky-400/70 to-cyan-300/70"
      },
      {
        title: "Total Faculty",
        value: String(analytics?.summary?.totalFaculties || faculties.length || 0),
        trend: "+0.12",
        trendUp: true,
        color: "from-emerald-500/65 via-teal-400/65 to-cyan-300/65"
      },
      {
        title: "Departments",
        value: String(analytics?.summary?.totalDepartments || entities.departments?.length || 0),
        trend: "+2.6%",
        trendUp: true,
        color: "from-indigo-500/65 via-violet-400/65 to-fuchsia-300/65"
      },
      {
        title: "Faculty Achievements",
        value: String(analytics?.summary?.totalFacultyAchievements || 0),
        trend: "-0.8%",
        trendUp: false,
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
