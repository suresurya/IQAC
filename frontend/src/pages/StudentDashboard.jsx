import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import client from "../api/client";
import StatCard from "../components/StatCard.jsx";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [semester, setSemester] = useState("");
  const studentId = typeof user?.studentProfile === "string" ? user.studentProfile : user?.studentProfile?._id;

  const loadDashboard = async (targetSemester) => {
    setLoading(true);
    setError("");
    const query = targetSemester ? `?semester=${targetSemester}` : "";
    try {
      const url = studentId ? `/students/${studentId}/dashboard${query}` : `/students/me/dashboard${query}`;
      const res = await client.get(url);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load student insights");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [studentId]);

  if (loading) return <div className="text-brand-ink">Loading student insights...</div>;
  if (error) return <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>;
  if (!data) return <div className="text-brand-ink">No student data available.</div>;

  const cgpaLabels = data.cgpaTrend.map((r) => `Sem ${r.semester}`);
  const cgpaValues = data.cgpaTrend.map((r) => r.cgpa);
  const latestAttendance = data.overview?.attendancePercentage || data.attendance.at(-1)?.percentage || 0;
  const latestBacklog = data.overview?.backlogCount || data.backlogBySemester.at(-1)?.backlogCount || 0;
  const menu = [
    { key: "dashboard", label: "Dashboard" },
    { key: "attendance", label: "Attendance" },
    { key: "fee", label: "Fee Details" },
    { key: "marks", label: "Semester Marks" },
    { key: "internal", label: "Internal Marks" },
    { key: "credits", label: "Credit Details" },
    { key: "feeds", label: "College Feeds" },
    { key: "activities", label: "Activities Details" },
    { key: "personal", label: "Personal Details" },
    { key: "logout", label: "Logout" }
  ];

  const semesterOptions = Array.from(
    new Set([
      ...data.marks.map((m) => m.semester),
      ...data.attendance.map((a) => a.semester),
      ...data.cgpaTrend.map((c) => c.semester)
    ])
  ).sort((a, b) => a - b);

  const onMenuClick = async (key) => {
    if (key === "logout") {
      logout();
      navigate("/auth");
      return;
    }
    setActiveMenu(key);
  };

  const onSemesterChange = async (e) => {
    const selected = e.target.value;
    setSemester(selected);
    await loadDashboard(selected || undefined);
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl text-brand-ink">Student Academic Overview</h2>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Student Name" value={data.overview.studentName} />
        <StatCard title="Roll Number" value={data.overview.rollNumber} accent="from-brand-flame to-brand-ocean" />
        <StatCard title="Department" value={data.student.department?.code || "NA"} accent="from-brand-mint to-brand-ocean" />
        <StatCard title="Semester" value={data.overview.semester} accent="from-brand-ocean to-brand-flame" />
        <StatCard title="Current CGPA" value={data.overview.currentCgpa} />
        <StatCard title="Attendance %" value={`${latestAttendance}%`} accent="from-brand-flame to-brand-ocean" />
        <StatCard title="Backlogs" value={latestBacklog} accent="from-brand-ocean to-brand-flame" />
        <StatCard title="Risk" value={data.overview.riskLevel} accent="from-brand-mint to-brand-ocean" />
      </section>

      <section className="rounded-2xl border border-white/40 bg-white/80 p-4">
        <h3 className="font-heading text-lg text-brand-ink">CGPA Trend</h3>
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
      </section>
    </div>
  );

  const renderAttendance = () => (
    <section className="rounded-2xl border border-white/40 bg-white/80 p-4">
      <h3 className="font-heading text-xl text-brand-ink">Attendance by Subject</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-brand-ink/70">
            <tr>
              <th className="px-3 py-2">Subject Name</th>
              <th className="px-3 py-2">Classes Conducted</th>
              <th className="px-3 py-2">Classes Attended</th>
              <th className="px-3 py-2">Attendance %</th>
            </tr>
          </thead>
          <tbody>
            {data.attendanceBySubject.map((row) => (
              <tr key={row.subjectCode} className="border-t border-brand-ink/10">
                <td className="px-3 py-2">{row.subjectName}</td>
                <td className="px-3 py-2">{row.classesConducted}</td>
                <td className="px-3 py-2">{row.classesAttended}</td>
                <td className={`px-3 py-2 font-semibold ${row.percentage < 75 ? "text-red-600" : "text-green-700"}`}>
                  {row.percentage}% {row.percentage < 75 ? "(Below 75%)" : ""}
                </td>
              </tr>
            ))}
            {!data.attendanceBySubject.length && (
              <tr>
                <td className="px-3 py-3 text-brand-ink/70" colSpan={4}>No attendance data for selected semester.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderFee = () => {
    const fee = data.feeDetails || {};
    return (
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Fee" value={`Rs ${fee.totalFee || 0}`} />
        <StatCard title="Paid Amount" value={`Rs ${fee.paidAmount || 0}`} accent="from-brand-mint to-brand-ocean" />
        <StatCard title="Pending Amount" value={`Rs ${fee.pendingAmount || 0}`} accent="from-brand-flame to-brand-ocean" />
        <StatCard title="Payment Status" value={fee.paymentStatus || "PENDING"} accent="from-brand-ocean to-brand-flame" />
      </section>
    );
  };

  const renderMarks = () => (
    <section className="rounded-2xl border border-white/40 bg-white/80 p-4">
      <h3 className="font-heading text-xl text-brand-ink">Semester Marks</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-brand-ink/70">
            <tr>
              <th className="px-3 py-2">Subject Name</th>
              <th className="px-3 py-2">Marks Obtained</th>
              <th className="px-3 py-2">Grade</th>
              <th className="px-3 py-2">Credits</th>
            </tr>
          </thead>
          <tbody>
            {data.semesterMarks.map((mark) => (
              <tr key={mark._id} className="border-t border-brand-ink/10">
                <td className="px-3 py-2">{mark.subjectName}</td>
                <td className="px-3 py-2">{mark.total}</td>
                <td className="px-3 py-2">{mark.grade}</td>
                <td className="px-3 py-2">{mark.credits}</td>
              </tr>
            ))}
            {!data.semesterMarks.length && (
              <tr>
                <td className="px-3 py-3 text-brand-ink/70" colSpan={4}>No marks data for selected semester.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm font-semibold text-brand-ink">Semester GPA: {data.semesterGpa}</p>
    </section>
  );

  const renderInternalMarks = () => (
    <section>
      <h3 className="font-heading text-xl text-brand-ink">Internal Marks</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.internalMarks.map((mark) => (
          <article key={mark.subjectCode} className="rounded-2xl border border-white/40 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-ink/70">{mark.subjectCode}</p>
            <h4 className="mt-1 font-semibold text-brand-ink">{mark.subjectName}</h4>
            <p className="mt-3 text-3xl font-bold text-brand-ink">{mark.internal}</p>
            <p className={`mt-2 text-sm font-semibold ${mark.passed ? "text-green-700" : "text-red-600"}`}>
              {mark.passed ? "Pass" : "Fail"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );

  const renderCredits = () => (
    <section className="grid gap-4 sm:grid-cols-3">
      <StatCard title="Total Credits Completed" value={data.credits.totalCompleted} />
      <StatCard title="Current Semester Credits" value={data.credits.currentSemester} accent="from-brand-mint to-brand-ocean" />
      <StatCard title="Credits Required" value={data.credits.requiredForGraduation} accent="from-brand-flame to-brand-ocean" />
    </section>
  );

  const renderFeeds = () => (
    <section className="space-y-3">
      {data.announcements.map((item) => (
        <article key={item._id} className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-brand-ink">{item.title}</h4>
            <span className="rounded-full bg-brand-sand px-2 py-1 text-xs text-brand-ink">{item.category}</span>
          </div>
          <p className="mt-2 text-sm text-brand-ink/80">{item.body}</p>
        </article>
      ))}
      {!data.announcements.length && <p className="text-brand-ink/70">No announcements available.</p>}
    </section>
  );

  const renderActivities = () => (
    <section className="space-y-3">
      {data.activities.map((activity) => (
        <article key={activity._id} className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-brand-ink">{activity.title}</h4>
            <span className="rounded-full bg-brand-sand px-2 py-1 text-xs text-brand-ink">{activity.category}</span>
          </div>
          <p className="mt-2 text-sm text-brand-ink/80">{activity.description}</p>
        </article>
      ))}
      {!data.activities.length && <p className="text-brand-ink/70">No activity records available.</p>}
    </section>
  );

  const renderPersonalDetails = () => (
    <section className="rounded-2xl border border-white/40 bg-white/80 p-4">
      <h3 className="font-heading text-xl text-brand-ink">Personal Details</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <p><strong>Name:</strong> {data.personalDetails.name}</p>
        <p><strong>Roll Number:</strong> {data.personalDetails.rollNo}</p>
        <p><strong>Department:</strong> {data.personalDetails.department}</p>
        <p><strong>Email:</strong> {data.personalDetails.email}</p>
        <p><strong>Phone:</strong> {data.personalDetails.phone || "Not available"}</p>
        <p><strong>Address:</strong> {data.personalDetails.address || "Not available"}</p>
      </div>
    </section>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[260px,1fr]">
      <aside className="rounded-2xl border border-white/40 bg-white/80 p-3">
        <h3 className="px-2 pb-2 font-heading text-lg text-brand-ink">Student Menu</h3>
        <nav className="space-y-1">
          {menu.map((item) => (
            <button
              key={item.key}
              onClick={() => onMenuClick(item.key)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${activeMenu === item.key ? "bg-brand-ink text-white" : "text-brand-ink hover:bg-brand-sand"}`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/40 bg-white/80 p-4">
          <h2 className="font-heading text-xl text-brand-ink">{menu.find((m) => m.key === activeMenu)?.label}</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-brand-ink/70">Semester</label>
            <select value={semester} onChange={onSemesterChange} className="rounded-lg border border-brand-ink/20 px-3 py-2">
              <option value="">Current</option>
              {semesterOptions.map((s) => (
                <option key={s} value={s}>Sem {s}</option>
              ))}
            </select>
          </div>
        </div>

        {activeMenu === "dashboard" && renderDashboard()}
        {activeMenu === "attendance" && renderAttendance()}
        {activeMenu === "fee" && renderFee()}
        {activeMenu === "marks" && renderMarks()}
        {activeMenu === "internal" && renderInternalMarks()}
        {activeMenu === "credits" && renderCredits()}
        {activeMenu === "feeds" && renderFeeds()}
        {activeMenu === "activities" && renderActivities()}
        {activeMenu === "personal" && renderPersonalDetails()}
      </section>
    </div>
  );
}
