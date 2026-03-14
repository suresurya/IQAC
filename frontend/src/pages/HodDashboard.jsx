import { useEffect, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";
import { useAuth } from "../context/AuthContext.jsx";
import client from "../api/client";
import StatCard from "../components/StatCard.jsx";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

export default function HodDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [placementForm, setPlacementForm] = useState({
    academicYear: "2025-26",
    totalEligible: 120,
    totalPlaced: 88,
    highestPackageLPA: 18,
    medianPackageLPA: 7.5
  });

  useEffect(() => {
    if (!user?.department?._id) return;

    client.get(`/departments/${user.department._id}/hod-dashboard`).then((res) => setDashboard(res.data.data));
  }, [user]);

  const addPlacement = async (e) => {
    e.preventDefault();
    await client.post(`/departments/${user.department._id}/placement`, placementForm);
    const refreshed = await client.get(`/departments/${user.department._id}/hod-dashboard`);
    setDashboard(refreshed.data.data);
  };

  if (!user?.department) return <div>Department mapping missing for this HOD account.</div>;
  if (!dashboard) return <div className="text-brand-ink">Loading department analytics...</div>;

  const sectionLabels = dashboard.comparisons.sectionPerformance.map((s) => s.section);
  const sectionPass = dashboard.comparisons.sectionPerformance.map((s) => s.passPercent);
  const sectionCgpa = dashboard.comparisons.sectionPerformance.map((s) => s.averageCgpa);
  const facultyLabels = dashboard.comparisons.facultyContribution.map((f) => f.facultyName);
  const facultyContributionData = dashboard.comparisons.facultyContribution.map((f) => f.contributionCount);

  const trendSource = dashboard.comparisons.studentPerformanceTrends.slice(0, 5);
  const trendSemesters = trendSource[0]?.trend?.map((t) => `Sem ${t.semester}`) || [];
  const trendDatasets = trendSource.map((row, idx) => ({
    label: row.name,
    data: row.trend.map((t) => t.cgpa),
    borderColor: ["#0d6efd", "#20c997", "#ff6b35", "#9c27b0", "#f59e0b"][idx % 5],
    tension: 0.3
  }));

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl text-brand-ink">{dashboard.overview.departmentName} Analytics</h2>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Students" value={dashboard.overview.totalStudents} />
        <StatCard title="Total Faculty" value={dashboard.overview.totalFaculty} accent="from-brand-flame to-brand-ocean" />
        <StatCard title="Total Sections" value={dashboard.overview.totalSections} accent="from-brand-mint to-brand-ocean" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Pass %" value={`${dashboard.analytics.passPercent}%`} />
        <StatCard title="Average CGPA" value={dashboard.analytics.averageCgpa} accent="from-brand-flame to-brand-ocean" />
        <StatCard title="Risk Students %" value={`${dashboard.analytics.riskStudentsPercent}%`} accent="from-brand-flame to-brand-mint" />
        <StatCard title="Top Students" value={dashboard.analytics.topStudents.length} accent="from-brand-mint to-brand-ocean" />
        <StatCard title="Faculty Achievements" value={dashboard.achievements.facultyAchievements.length} accent="from-brand-ocean to-brand-flame" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Section Wise Performance</h3>
          <div className="h-72">
            <Bar
              data={{
                labels: sectionLabels,
                datasets: [
                  { label: "Pass %", data: sectionPass, backgroundColor: "rgba(13,110,253,0.65)" },
                  { label: "Average CGPA", data: sectionCgpa, backgroundColor: "rgba(32,201,151,0.65)" }
                ]
              }}
              options={{ maintainAspectRatio: false }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Faculty Contribution</h3>
          <div className="h-72">
            <Bar
              data={{ labels: facultyLabels, datasets: [{ label: "Achievement Count", data: facultyContributionData, backgroundColor: "rgba(255,107,53,0.7)" }] }}
              options={{ maintainAspectRatio: false }}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/40 bg-white/80 p-4">
        <h3 className="font-heading text-lg text-brand-ink">Student Performance Trends</h3>
        <div className="h-80">
          <Line
            data={{ labels: trendSemesters, datasets: trendDatasets }}
            options={{ maintainAspectRatio: false }}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Top Performing Students</h3>
          <div className="mt-3 space-y-2 text-sm">
            {dashboard.analytics.topStudents.map((student) => (
              <div key={student.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                <span>{student.name} ({student.rollNo})</span>
                <span className="font-semibold">CGPA {student.cgpa}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Recent Achievements</h3>
          <div className="mt-3 space-y-2 text-sm">
            {dashboard.achievements.facultyAchievements.slice(0, 5).map((item) => (
              <div key={item._id} className="rounded-lg bg-white px-3 py-2">
                <p className="font-semibold">{item.title}</p>
                <p className="text-brand-ink/70">Faculty: {item.faculty?.name || "-"}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <form onSubmit={addPlacement} className="rounded-2xl border border-white/40 bg-white/80 p-4">
        <h3 className="font-heading text-lg text-brand-ink">Upload Placement Statistics</h3>
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
        <button className="mt-3 rounded-lg bg-brand-ink px-4 py-2 text-white">Save Placement Data</button>
      </form>
    </div>
  );
}
