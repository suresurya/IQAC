import { useEffect, useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip
} from "chart.js";
import client from "../api/client";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function FacultyDashboard() {
  const [profile, setProfile] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [sectionStudents, setSectionStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [attendanceReport, setAttendanceReport] = useState([]);
  const [markForm, setMarkForm] = useState({
    subjectCode: "CS401",
    subjectName: "Data Structures",
    semester: 4,
    academicYear: "2025-26",
    internal: 24,
    external: 48,
    total: 72,
    passed: true
  });
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    subjectCode: "CS401",
    subjectName: "Data Structures",
    academicYear: "2025-26",
    semester: 4,
    totalClasses: 90,
    attendedClasses: 72
  });
  const [profileForm, setProfileForm] = useState({ designation: "", contactNumber: "", researchInterests: "" });
  const [achievementForm, setAchievementForm] = useState({ title: "", type: "publication", description: "" });
  const [attendanceRows, setAttendanceRows] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [profileRes, analyticsRes, studentsRes, achievementsRes] = await Promise.all([
        client.get("/faculty/profile"),
        client.get("/faculty/analytics"),
        client.get("/students"),
        client.get("/faculty/achievements")
      ]);

      setProfile(profileRes.data.data);
      setProfileForm({
        designation: profileRes.data.data.designation || "",
        contactNumber: profileRes.data.data.contactNumber || "",
        researchInterests: (profileRes.data.data.researchInterests || []).join(", ")
      });
      setAnalytics(analyticsRes.data.data);
      setStudents(studentsRes.data.data || []);
      setAchievements(achievementsRes.data.data || []);

      const sectionList = profileRes.data.data.sections || [];
      setSections(sectionList);
      if (sectionList.length) {
        setSelectedSection(sectionList[0]._id);
      }
      if (studentsRes.data.data?.length) setSelectedStudent(studentsRes.data.data[0]._id);
    };

    load();
  }, []);

  useEffect(() => {
    if (!selectedSection) return;
    const filtered = students.filter((student) => String(student.section?._id || student.section) === String(selectedSection));
    setSectionStudents(filtered);
    setAttendanceRows(
      filtered.map((student) => ({
        studentId: student._id,
        name: student.name,
        rollNo: student.rollNo,
        status: "PRESENT"
      }))
    );
  }, [selectedSection, students]);

  const submitMarks = async (e) => {
    e.preventDefault();
    await client.post(`/faculty/students/${selectedStudent}/marks`, markForm);
    alert("Marks uploaded");
  };

  const submitAttendance = async (e) => {
    e.preventDefault();
    await client.post(`/faculty/students/${selectedStudent}/attendance`, {
      ...attendanceForm,
      semester: Number(attendanceForm.semester),
      totalClasses: Number(attendanceForm.totalClasses),
      attendedClasses: Number(attendanceForm.attendedClasses)
    });
    alert("Attendance aggregate uploaded");
  };

  const submitSectionAttendance = async (e) => {
    e.preventDefault();
    await client.post(`/faculty/sections/${selectedSection}/attendance`, {
      date: attendanceForm.date,
      subjectCode: attendanceForm.subjectCode,
      subjectName: attendanceForm.subjectName,
      academicYear: attendanceForm.academicYear,
      entries: attendanceRows.map((row) => ({ studentId: row.studentId, status: row.status }))
    });
    const reportRes = await client.get(`/faculty/sections/${selectedSection}/attendance-report`);
    setAttendanceReport(reportRes.data.data || []);
    alert("Section attendance marked");
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    await client.put("/faculty/profile", {
      designation: profileForm.designation,
      contactNumber: profileForm.contactNumber,
      researchInterests: profileForm.researchInterests.split(",").map((item) => item.trim()).filter(Boolean)
    });
    alert("Profile updated");
  };

  const addAchievement = async (e) => {
    e.preventDefault();
    await client.post("/faculty/achievements", achievementForm);
    const refreshed = await client.get("/faculty/achievements");
    setAchievements(refreshed.data.data || []);
    setAchievementForm({ title: "", type: "publication", description: "" });
  };

  if (!profile || !analytics) return <div className="text-brand-ink">Loading faculty dashboard...</div>;

  const sectionLabels = analytics.sectionPerformance.map((item) => item.section);
  const sectionPass = analytics.sectionPerformance.map((item) => item.passPercent);

  const marksDistributionData = analytics.charts.marksDistribution;
  const attendanceStats = analytics.charts.attendanceStats;

  const onAttendanceStatus = (studentId, status) => {
    setAttendanceRows((prev) => prev.map((item) => (item.studentId === studentId ? { ...item, status } : item)));
  };

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl text-brand-ink">Faculty Portal</h2>

      <section className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={updateProfile} className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Profile</h3>
          <div className="mt-3 grid gap-3">
            <input value={profile.name} disabled className="rounded-lg border border-brand-ink/20 bg-slate-100 px-3 py-2" />
            <input value={profile.email} disabled className="rounded-lg border border-brand-ink/20 bg-slate-100 px-3 py-2" />
            <input value={profileForm.designation} onChange={(e) => setProfileForm((prev) => ({ ...prev, designation: e.target.value }))} placeholder="Designation" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input value={profileForm.contactNumber} onChange={(e) => setProfileForm((prev) => ({ ...prev, contactNumber: e.target.value }))} placeholder="Contact Number" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input value={profileForm.researchInterests} onChange={(e) => setProfileForm((prev) => ({ ...prev, researchInterests: e.target.value }))} placeholder="Research Interests (comma separated)" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <button className="rounded-lg bg-brand-ink px-4 py-2 text-white">Update Profile</button>
          </div>
        </form>

        <form onSubmit={addAchievement} className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Faculty Achievements</h3>
          <div className="mt-3 grid gap-3">
            <input value={achievementForm.title} onChange={(e) => setAchievementForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Title" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <select value={achievementForm.type} onChange={(e) => setAchievementForm((prev) => ({ ...prev, type: e.target.value }))} className="rounded-lg border border-brand-ink/20 px-3 py-2">
              <option value="publication">Publication</option>
              <option value="conference">Conference</option>
              <option value="award">Award</option>
              <option value="patent">Patent</option>
              <option value="other">Other</option>
            </select>
            <textarea value={achievementForm.description} onChange={(e) => setAchievementForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
            <button className="rounded-lg bg-brand-ocean px-4 py-2 text-white">Add Achievement</button>
          </div>

          <div className="mt-4 max-h-40 space-y-2 overflow-auto text-sm">
            {achievements.slice(0, 6).map((item) => (
              <div key={item._id} className="rounded-lg bg-white px-3 py-2">
                <p className="font-semibold">{item.title}</p>
                <p className="text-brand-ink/70">{item.type}</p>
              </div>
            ))}
          </div>
        </form>
      </section>

      <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
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
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Section Performance</h3>
          <div className="h-72">
            <Bar
              data={{ labels: sectionLabels, datasets: [{ label: "Pass %", data: sectionPass, backgroundColor: "rgba(13,110,253,0.65)" }] }}
              options={{ maintainAspectRatio: false }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Marks Distribution</h3>
          <div className="h-72">
            <Pie
              data={{
                labels: [">=80", "60-79", "<60"],
                datasets: [{
                  data: [marksDistributionData.above80, marksDistributionData.between60And79, marksDistributionData.below60],
                  backgroundColor: ["#20c997", "#ffc107", "#dc3545"]
                }]
              }}
              options={{ maintainAspectRatio: false }}
            />
          </div>
          <p className="mt-2 text-sm text-brand-ink/75">Pass Percentage: {analytics.charts.passPercentage}%</p>
          <p className="text-sm text-brand-ink/75">Attendance Stats: Present {attendanceStats.present}, Absent {attendanceStats.absent}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Top Students In Assigned Sections</h3>
          <div className="mt-3 space-y-2 text-sm">
            {analytics.topStudents.slice(0, 8).map((student) => (
              <div key={student.studentId} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                <span>{student.name}</span>
                <span className="font-semibold">CGPA {student.cgpa}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Risk Students In Section</h3>
          <div className="mt-3 space-y-2 text-sm">
            {analytics.riskStudents.slice(0, 8).map((student) => (
              <div key={student.studentId} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                <span>{student.name}</span>
                <span className="font-semibold text-red-600">{student.riskLevel}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={submitMarks} className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Upload Marks</h3>
          <div className="mt-3 grid gap-3">
            <input
              placeholder="Subject Code"
              value={markForm.subjectCode}
              onChange={(e) => setMarkForm((prev) => ({ ...prev, subjectCode: e.target.value }))}
              className="rounded-lg border border-brand-ink/20 px-3 py-2"
            />
            <input
              placeholder="Subject Name"
              value={markForm.subjectName}
              onChange={(e) => setMarkForm((prev) => ({ ...prev, subjectName: e.target.value }))}
              className="rounded-lg border border-brand-ink/20 px-3 py-2"
            />
            <input
              type="number"
              placeholder="Total"
              value={markForm.total}
              onChange={(e) => setMarkForm((prev) => ({ ...prev, total: Number(e.target.value) }))}
              className="rounded-lg border border-brand-ink/20 px-3 py-2"
            />
          </div>
          <button className="mt-3 rounded-lg bg-brand-ink px-4 py-2 text-white">Upload Marks</button>
        </form>

        <form onSubmit={submitAttendance} className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Upload Attendance</h3>
          <div className="mt-3 grid gap-3">
            <input
              type="number"
              placeholder="Total Classes"
              value={attendanceForm.totalClasses}
              onChange={(e) => setAttendanceForm((prev) => ({ ...prev, totalClasses: Number(e.target.value) }))}
              className="rounded-lg border border-brand-ink/20 px-3 py-2"
            />
            <input
              type="number"
              placeholder="Attended Classes"
              value={attendanceForm.attendedClasses}
              onChange={(e) => setAttendanceForm((prev) => ({ ...prev, attendedClasses: Number(e.target.value) }))}
              className="rounded-lg border border-brand-ink/20 px-3 py-2"
            />
          </div>
          <button className="mt-3 rounded-lg bg-brand-ocean px-4 py-2 text-white">Upload Attendance</button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/40 bg-white/80 p-4">
        <h3 className="font-heading text-lg text-brand-ink">Faculty Attendance System</h3>
        <form onSubmit={submitSectionAttendance} className="mt-3 grid gap-3 lg:grid-cols-4">
          <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="rounded-lg border border-brand-ink/20 px-3 py-2">
            {sections.map((section) => (
              <option key={section._id} value={section._id}>{section.code}</option>
            ))}
          </select>
          <input type="date" value={attendanceForm.date} onChange={(e) => setAttendanceForm((prev) => ({ ...prev, date: e.target.value }))} className="rounded-lg border border-brand-ink/20 px-3 py-2" />
          <input value={attendanceForm.subjectCode} onChange={(e) => setAttendanceForm((prev) => ({ ...prev, subjectCode: e.target.value }))} placeholder="Subject Code" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
          <input value={attendanceForm.subjectName} onChange={(e) => setAttendanceForm((prev) => ({ ...prev, subjectName: e.target.value }))} placeholder="Subject Name" className="rounded-lg border border-brand-ink/20 px-3 py-2" />
          <button className="rounded-lg bg-brand-ink px-4 py-2 text-white lg:col-span-4">Mark Section Attendance</button>
        </form>

        <div className="mt-4 grid gap-2 text-sm">
          {attendanceRows.map((row) => (
            <div key={row.studentId} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
              <span>{row.rollNo} - {row.name}</span>
              <select value={row.status} onChange={(e) => onAttendanceStatus(row.studentId, e.target.value)} className="rounded border border-brand-ink/20 px-2 py-1">
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
              </select>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <h4 className="font-semibold text-brand-ink">Attendance Report</h4>
          <div className="mt-2 space-y-2 text-sm">
            {attendanceReport.map((row) => (
              <div key={row.studentId} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                <span>{row.rollNo} - {row.name}</span>
                <span className="font-semibold">{row.attendancePercent}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
