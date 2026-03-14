import { useEffect, useState } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";
import {
  ArcElement,
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!user?.studentProfile?._id) return;

    client.get(`/students/${user.studentProfile._id}/dashboard`).then((res) => setData(res.data.data));
  }, [user]);

  if (!data) return <div className="text-brand-ink">Loading student insights...</div>;

  const cgpaLabels = data.cgpaTrend.map((r) => `Sem ${r.semester}`);
  const cgpaValues = data.cgpaTrend.map((r) => r.cgpa);
  const sgpaValues = data.semesterPerformance.map((r) => r.sgpa);
  const latestAttendance = data.attendance.at(-1)?.percentage || 0;
  const latestBacklog = data.backlogBySemester.at(-1)?.backlogCount || 0;
  const latestCgpa = data.cgpaTrend.at(-1)?.cgpa || 0;

  const riskPie = {
    HIGH: [1, 0, 0],
    MEDIUM: [0, 1, 0],
    LOW: [0, 0, 1]
  }[data.riskLevel] || [0, 0, 1];

  const marksBySemester = Object.values(
    data.marks.reduce((acc, mark) => {
      const key = `Sem ${mark.semester}`;
      if (!acc[key]) acc[key] = { semester: key, total: 0, count: 0 };
      acc[key].total += mark.total;
      acc[key].count += 1;
      return acc;
    }, {})
  ).map((row) => ({ semester: row.semester, average: row.count ? Number((row.total / row.count).toFixed(2)) : 0 }));

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl text-brand-ink">My Academic Progress</h2>

      <section className="rounded-2xl border border-white/40 bg-white/80 p-5">
        <h3 className="font-heading text-lg text-brand-ink">Profile Information</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-lg bg-white p-3"><p className="text-brand-ink/70">Name</p><p className="font-semibold">{data.student.name}</p></div>
          <div className="rounded-lg bg-white p-3"><p className="text-brand-ink/70">Roll No</p><p className="font-semibold">{data.student.rollNo}</p></div>
          <div className="rounded-lg bg-white p-3"><p className="text-brand-ink/70">Department</p><p className="font-semibold">{data.student.department?.code}</p></div>
          <div className="rounded-lg bg-white p-3"><p className="text-brand-ink/70">Current Semester</p><p className="font-semibold">{data.student.currentSemester}</p></div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Current Risk" value={data.riskLevel} accent="from-brand-flame to-brand-ocean" />
        <StatCard title="Attendance" value={`${latestAttendance}%`} accent="from-brand-mint to-brand-ocean" />
        <StatCard title="Backlogs" value={latestBacklog} accent="from-brand-ocean to-brand-flame" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Latest CGPA" value={latestCgpa} />
        <StatCard title="Semesters Tracked" value={data.semesterPerformance.length} accent="from-brand-flame to-brand-ocean" />
        <StatCard title="Marks Entries" value={data.marks.length} accent="from-brand-mint to-brand-ocean" />
        <StatCard title="SGPA Entries" value={sgpaValues.length} accent="from-brand-ocean to-brand-flame" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">CGPA Growth Graph</h3>
          <div className="mt-4 h-80">
            <Line
              data={{
                labels: cgpaLabels,
                datasets: [
                  {
                    label: "CGPA",
                    data: cgpaValues,
                    borderColor: "#0D6EFD",
                    backgroundColor: "rgba(13,110,253,0.15)",
                    fill: true,
                    tension: 0.3
                  }
                ]
              }}
              options={{ maintainAspectRatio: false }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Semester Performance Chart (SGPA)</h3>
          <div className="mt-4 h-80">
            <Bar
              data={{
                labels: cgpaLabels,
                datasets: [{ label: "SGPA", data: sgpaValues, backgroundColor: "rgba(32,201,151,0.65)" }]
              }}
              options={{ maintainAspectRatio: false }}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Average Marks by Semester</h3>
          <div className="mt-4 h-72">
            <Bar
              data={{
                labels: marksBySemester.map((m) => m.semester),
                datasets: [{ label: "Average Marks", data: marksBySemester.map((m) => m.average), backgroundColor: "rgba(255,107,53,0.65)" }]
              }}
              options={{ maintainAspectRatio: false }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Risk Analysis</h3>
          <div className="mt-4 h-72">
            <Pie
              data={{
                labels: ["High", "Medium", "Low"],
                datasets: [{ data: riskPie, backgroundColor: ["#dc3545", "#ffc107", "#20c997"] }]
              }}
              options={{ maintainAspectRatio: false }}
            />
          </div>
          <p className="mt-3 rounded-lg bg-white p-3 text-sm text-brand-ink/90"><strong>Recommendation:</strong> {data.recommendation}</p>
        </div>
      </section>
    </div>
  );
}
