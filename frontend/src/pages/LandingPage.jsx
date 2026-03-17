import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const MODULES = [
  {
    title: "Student Risk AI",
    desc: "Predict low, medium, and high-risk students using attendance and marks.",
    tone: "from-[#ff7b54]/30 to-[#ffc36a]/20"
  },
  {
    title: "Department Intelligence",
    desc: "Track pass percentage, CGPA trends, and section-wise performance.",
    tone: "from-[#58a6ff]/30 to-[#4cc9f0]/20"
  },
  {
    title: "Faculty Research Analytics",
    desc: "Monitor publications, patents, and academic output.",
    tone: "from-[#7f5af0]/30 to-[#c77dff]/20"
  },
  {
    title: "NAAC / NBA Readiness Engine",
    desc: "Track accreditation evidence and compliance status.",
    tone: "from-[#1fbf75]/30 to-[#8be9a8]/20"
  },
  {
    title: "Automated Reports",
    desc: "Generate PDF and Excel reports for departments and administration.",
    tone: "from-[#ff4d6d]/30 to-[#ff9e80]/20"
  }
];

const CAPABILITIES = [
  "Student Performance Tracking",
  "Faculty Research Monitoring",
  "Section-wise Analytics",
  "Department CGPA Insights",
  "Placement Tracking",
  "Accreditation Monitoring"
];

const WORKFLOW = [
  "Faculty Upload Data",
  "AI Analyze Academic Performance",
  "HOD Monitor Department Insights",
  "Admin Generate Accreditation Reports"
];

function useCountUp(target, duration = 1400) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const stepMs = 25;
    const increment = Math.max(1, Math.floor(target / (duration / stepMs)));

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
        return;
      }
      setCount(start);
    }, stepMs);

    return () => clearInterval(timer);
  }, [target, duration]);

  return count;
}

function CounterCard({ label, value, suffix }) {
  const count = useCountUp(value);
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/25">
      <div className="text-3xl font-bold text-white sm:text-4xl">{count.toLocaleString()}{suffix}</div>
      <div className="mt-2 text-sm text-slate-300">{label}</div>
    </div>
  );
}

function MiniLineChart() {
  return (
    <div className="rounded-xl border border-white/15 bg-[#0b1423]/90 p-3">
      <p className="text-xs text-slate-300">Department CGPA Trends</p>
      <div className="mt-3 flex h-20 items-end gap-2">
        {[36, 42, 40, 49, 54, 58, 62].map((h) => (
          <div key={h} className="flex-1 rounded-t-md bg-gradient-to-t from-[#4cc9f0] to-[#7f5af0]" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

function MiniRiskCards({ risks }) {
  const data = [
    { label: "High Risk", value: `${risks.high || 0}%`, color: "bg-[#ff595e]" },
    { label: "Medium", value: `${risks.medium || 0}%`, color: "bg-[#ffca3a]" },
    { label: "Low", value: `${risks.low || 0}%`, color: "bg-[#2ec4b6]" }
  ];

  return (
    <div className="space-y-2 rounded-xl border border-white/15 bg-[#0b1423]/90 p-3">
      <p className="text-xs text-slate-300">Student Risk Analysis</p>
      {data.map((risk) => (
        <div key={risk.label} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${risk.color}`} />
            <span className="text-xs text-slate-200">{risk.label}</span>
          </div>
          <span className="text-xs font-semibold text-white">{risk.value}</span>
        </div>
      ))}
    </div>
  );
}

function MiniPlacement({ rate }) {
  return (
    <div className="rounded-xl border border-white/15 bg-[#0b1423]/90 p-3">
      <p className="text-xs text-slate-300">Placement Statistics</p>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative h-16 w-16 rounded-full border-4 border-[#2ec4b6]/25">
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#2ec4b6] border-r-[#2ec4b6]" />
          <span className="absolute inset-0 grid place-items-center text-xs font-semibold">{rate}%</span>
        </div>
        <div>
          <p className="text-sm font-semibold">Placement Success Rate</p>
          <p className="text-xs text-slate-400">Across monitored departments</p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [liveStats, setLiveStats] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/analytics/public-stats`)
      .then(res => setLiveStats(res.data.data))
      .catch(() => null);
  }, []);

  const metrics = [
    { label: "Students Analyzed", value: liveStats?.totalStudents || 0, suffix: "+" },
    { label: "Faculty Insights", value: liveStats?.totalFaculties || 0, suffix: "" },
    { label: "Departments Monitored", value: liveStats?.totalDepartments || 0, suffix: "" },
    { label: "Automated Reports Generated", value: liveStats?.totalResearch || 0, suffix: "+" }
  ];

  const riskPercent = liveStats?.riskDistribution || { high: 0, medium: 0, low: 0 };
  const placementRate = liveStats?.placementRate || 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050b16] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(76,201,240,0.15),transparent_35%),radial-gradient(circle_at_82%_12%,rgba(127,90,240,0.2),transparent_35%),radial-gradient(circle_at_70%_72%,rgba(31,191,117,0.14),transparent_35%)]" />

      <main className="relative mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-5 py-4 backdrop-blur-xl">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-300">Academic Intelligence & Accreditation Monitoring Platform</p>
            <h1 className="mt-1 font-heading text-xl sm:text-2xl">University AI Analytics Suite</h1>
          </div>
          <Link to="/auth" className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20">
            Admin Login
          </Link>
        </header>

        <section className="mt-12 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-[#4cc9f0]/40 bg-[#4cc9f0]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#7ed7ff]">
              AI Analytics For Higher Education
            </p>
            <h2 className="mt-5 max-w-2xl font-heading text-4xl leading-tight sm:text-5xl">
              AI-Powered Academic Intelligence for Universities
            </h2>
            <p className="mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
              Monitor student performance, department outcomes, and accreditation readiness in one intelligent platform.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" className="rounded-xl bg-gradient-to-r from-[#4cc9f0] to-[#7f5af0] px-6 py-3 text-sm font-semibold text-[#04101f] shadow-lg shadow-[#7f5af0]/30 transition hover:translate-y-[-1px]">
                Live Demo
              </Link>
              <Link to="/auth" className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20">
                Login / Signup
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-10 -top-6 h-32 w-32 rounded-full bg-[#4cc9f0]/30 blur-3xl" />
            <div className="absolute -bottom-8 right-0 h-36 w-36 rounded-full bg-[#7f5af0]/30 blur-3xl" />
            <div className="relative rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-2xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">Floating Dashboard Preview</p>
                <span className="rounded-full bg-[#2ec4b6]/20 px-2 py-1 text-[10px] font-semibold uppercase text-[#87f6e2]">Live AI</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniRiskCards risks={riskPercent} />
                <MiniLineChart />
                <div className="sm:col-span-2">
                  <MiniPlacement rate={placementRate} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <h3 className="text-sm uppercase tracking-[0.22em] text-slate-300">University Impact Metrics</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <CounterCard key={metric.label} label={metric.label} value={metric.value} suffix={metric.suffix} />
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h3 className="text-sm uppercase tracking-[0.22em] text-slate-300">Platform Intelligence Modules</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {MODULES.map((item, idx) => (
              <article
                key={item.title}
                className="group rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/25"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className={`mb-3 h-1.5 w-24 rounded-full bg-gradient-to-r ${item.tone}`} />
                <h4 className="font-heading text-xl">{item.title}</h4>
                <p className="mt-2 text-sm text-slate-300">{item.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <h3 className="font-heading text-2xl">Interactive Dashboard Preview</h3>
          <p className="mt-2 text-sm text-slate-300">A real-time command center for administrators and department leaders.</p>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-[#0b1423]/90 p-4">
              <p className="text-sm font-medium text-slate-200">CGPA Trend Chart</p>
              <div className="mt-4 flex h-36 items-end gap-2">
                {[42, 48, 52, 57, 61, 64, 68, 72].map((h) => (
                  <div key={h} className="flex-1 rounded-t-md bg-gradient-to-t from-[#4cc9f0] to-[#7f5af0]" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-[#0b1423]/90 p-4">
              <p className="text-sm font-medium text-slate-200">Attendance Distribution</p>
              <div className="mt-4 space-y-3">
                {[
                  ["Above 85%", 62, "#2ec4b6"],
                  ["75% - 85%", 24, "#ffd166"],
                  ["Below 75%", 14, "#ef476f"]
                ].map(([name, val, color]) => (
                  <div key={name}>
                    <div className="mb-1 flex justify-between text-xs text-slate-300">
                      <span>{name}</span>
                      <span>{val}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-2 rounded-full" style={{ width: `${val}%`, backgroundColor: color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-[#0b1423]/90 p-4">
              <p className="text-sm font-medium text-slate-200">Section Comparison</p>
              <div className="mt-4 grid grid-cols-4 gap-3 text-center text-xs text-slate-300">
                {["A", "B", "C", "D"].map((section, idx) => (
                  <div key={section}>
                    <div className="mx-auto mb-2 h-16 w-8 rounded-md bg-white/10 p-1">
                      <div
                        className="w-full rounded-sm bg-gradient-to-t from-[#1fbf75] to-[#7df5a8]"
                        style={{ height: `${[62, 74, 58, 81][idx]}%`, marginTop: "auto" }}
                      />
                    </div>
                    <p>Sec {section}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-[#0b1423]/90 p-4">
              <p className="text-sm font-medium text-slate-200">Placement Success Rate</p>
              <div className="mt-5 flex items-center gap-5">
                <div className="relative h-24 w-24 rounded-full border-[10px] border-[#2ec4b6]/20">
                  <div className="absolute inset-0 rounded-full border-[10px] border-transparent border-r-[#2ec4b6] border-t-[#2ec4b6]" />
                  <span className="absolute inset-0 grid place-items-center text-lg font-bold">{placementRate}%</span>
                </div>
                <div className="text-sm text-slate-300">
                  <p className="font-semibold text-white">Placement season active</p>
                  <p>Top recruiters and package analytics updated live.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <h3 className="text-sm uppercase tracking-[0.22em] text-slate-300">Platform Workflow</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {WORKFLOW.map((step, index) => (
              <div key={step} className="relative rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-xl">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-[#4cc9f0] to-[#7f5af0] text-sm font-bold text-[#04111e]">
                  {index + 1}
                </div>
                <p className="text-sm text-slate-200">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <h3 className="font-heading text-2xl">Key Capabilities</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((capability) => (
              <div key={capability} className="rounded-xl border border-white/15 bg-[#0b1423]/80 px-4 py-3 text-sm text-slate-200">
                {capability}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-3xl border border-[#4cc9f0]/25 bg-gradient-to-r from-[#0b1423] via-[#111a2e] to-[#120f2c] p-8 text-center">
          <h3 className="font-heading text-3xl">Experience Academic Intelligence in Action</h3>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">
            Explore intelligent insights, accreditation readiness dashboards, and AI-powered recommendations tailored for higher education institutions.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth" className="rounded-xl bg-gradient-to-r from-[#4cc9f0] to-[#2ec4b6] px-6 py-3 text-sm font-semibold text-[#04111f] transition hover:translate-y-[-1px]">
              Start Demo
            </Link>
            <Link to="/auth" className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20">
              View Analytics
            </Link>
          </div>
        </section>

        <footer className="mt-14 grid gap-4 rounded-2xl border border-white/15 bg-white/5 p-5 text-sm text-slate-300 backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-4">
          <a href="#" className="transition hover:text-white">About Platform</a>
          <a href="#" className="transition hover:text-white">Features</a>
          <a href="#" className="transition hover:text-white">Documentation</a>
          <Link to="/auth" className="transition hover:text-white">Admin Login</Link>
        </footer>
      </main>
    </div>
  );
}
