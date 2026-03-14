import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import client from "../api/client";

const FEATURE_ITEMS = [
  "Student Risk AI",
  "Department Intelligence",
  "Faculty Research Analytics",
  "NAAC/NBA Readiness Monitoring",
  "Automated Academic Reports"
];

const METRIC_ITEMS = [
  { label: "Students Analyzed", value: "1200+" },
  { label: "Faculty Insights", value: "85" },
  { label: "Departments Monitored", value: "12" },
  { label: "Automated Reports Generated", value: "50+" }
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "admin@iqac.edu",
    password: "Admin@123",
    confirmPassword: "",
    role: "admin",
    registrationNumber: "",
    facultyId: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "signup") {
        if (form.password !== form.confirmPassword) {
          setError("Password and confirm password do not match");
          return;
        }

        await client.post("/auth/public-signup", {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          registrationNumber: form.role === "student" ? form.registrationNumber : undefined,
          facultyId: form.role === "faculty" ? form.facultyId : undefined
        });
        setSuccess("Signup successful. Please login with your new account.");
        setMode("login");
      } else {
        // Do not force role during login; backend will return the account's actual role.
        await login(form.email, form.password);
        if (!rememberMe) {
          sessionStorage.setItem("session_login", "true");
        }
        navigate("/home");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050b16] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(58,134,255,0.18),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(127,90,240,0.22),transparent_34%),radial-gradient(circle_at_78%_82%,rgba(46,196,182,0.16),transparent_36%)]" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-10">
        <section className="rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur-2xl sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-300">IQAC Academic Intelligence</p>
          <h1 className="mt-4 max-w-xl font-heading text-4xl leading-tight sm:text-5xl">
            AI-Powered Academic Analytics for Universities
          </h1>
          <p className="mt-4 max-w-xl text-slate-300">
            Monitor student performance, department outcomes, faculty research, and accreditation readiness in one intelligent platform.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {FEATURE_ITEMS.map((item, idx) => (
              <div
                key={item}
                className="rounded-xl border border-white/15 bg-[#0c1525]/70 px-4 py-3 text-sm text-slate-200 backdrop-blur"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {METRIC_ITEMS.map((metric) => (
              <div key={metric.label} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur">
                <p className="text-2xl font-bold text-white">{metric.value}</p>
                <p className="text-xs text-slate-300">{metric.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-white/15 bg-[#0b1423]/90 p-4">
            <p className="text-sm font-semibold">Platform Dashboard Preview</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                <p className="text-xs text-slate-300">CGPA Trends</p>
                <div className="mt-2 flex h-20 items-end gap-1.5">
                  {[42, 49, 54, 60, 65, 71].map((h) => (
                    <div key={h} className="flex-1 rounded-t-md bg-gradient-to-t from-[#3a86ff] to-[#7f5af0]" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                <p className="text-xs text-slate-300">Student Risk Distribution</p>
                <div className="mt-3 space-y-2">
                  {["High", "Medium", "Low"].map((label, idx) => (
                    <div key={label} className="flex items-center justify-between text-xs">
                      <span>{label}</span>
                      <span>{[14, 31, 55][idx]}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/5 p-3 sm:col-span-2">
                <p className="text-xs text-slate-300">Department Performance</p>
                <div className="mt-2 flex gap-2 text-[11px] text-slate-300">
                  {[
                    ["CSE", "89%"],
                    ["ECE", "84%"],
                    ["MECH", "80%"],
                    ["CIVIL", "77%"]
                  ].map(([dept, val]) => (
                    <div key={dept} className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-center">
                      <p>{dept}</p>
                      <p className="mt-1 font-semibold text-white">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-lg rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl shadow-[#0c1e39]/45 backdrop-blur-2xl sm:p-8">
          <div className="mb-6 inline-flex rounded-xl border border-white/15 bg-[#0d1729]/70 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-lg px-5 py-2 text-sm transition ${mode === "login" ? "bg-gradient-to-r from-[#4cc9f0] to-[#7f5af0] font-semibold text-[#02111f]" : "text-slate-300 hover:text-white"}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-lg px-5 py-2 text-sm transition ${mode === "signup" ? "bg-gradient-to-r from-[#4cc9f0] to-[#7f5af0] font-semibold text-[#02111f]" : "text-slate-300 hover:text-white"}`}
            >
              Signup
            </button>
          </div>

          <h2 className="font-heading text-3xl">{mode === "login" ? "Welcome Back" : "Create Your Account"}</h2>
          <p className="mt-2 text-sm text-slate-300">
            {mode === "login" ? "Access IQAC Academic Intelligence" : "Join the AI-powered academic platform"}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <input
                required
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="Full Name"
                className="w-full rounded-xl border border-white/20 bg-[#0d1729]/70 px-4 py-3 text-white outline-none transition focus:border-[#7ed7ff]"
              />
            )}

            <select
              name="role"
              value={form.role}
              onChange={onChange}
              className="w-full rounded-xl border border-white/20 bg-[#0d1729]/70 px-4 py-3 text-white outline-none transition focus:border-[#7ed7ff]"
            >
              <option value="admin">Admin</option>
              <option value="hod">HOD</option>
              <option value="faculty">Faculty</option>
              <option value="student">Student</option>
            </select>

            {mode === "signup" && form.role === "student" && (
              <input
                required
                name="registrationNumber"
                value={form.registrationNumber}
                onChange={onChange}
                placeholder="Student Registration Number"
                className="w-full rounded-xl border border-white/20 bg-[#0d1729]/70 px-4 py-3 text-white outline-none transition focus:border-[#7ed7ff]"
              />
            )}

            {mode === "signup" && form.role === "faculty" && (
              <input
                required
                name="facultyId"
                value={form.facultyId}
                onChange={onChange}
                placeholder="Faculty ID"
                className="w-full rounded-xl border border-white/20 bg-[#0d1729]/70 px-4 py-3 text-white outline-none transition focus:border-[#7ed7ff]"
              />
            )}

            <input
              required
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              placeholder="Email"
              className="w-full rounded-xl border border-white/20 bg-[#0d1729]/70 px-4 py-3 text-white outline-none transition focus:border-[#7ed7ff]"
            />

            <input
              required
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder="Password"
              className="w-full rounded-xl border border-white/20 bg-[#0d1729]/70 px-4 py-3 text-white outline-none transition focus:border-[#7ed7ff]"
            />

            {mode === "signup" && (
              <input
                required
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={onChange}
                placeholder="Confirm Password"
                className="w-full rounded-xl border border-white/20 bg-[#0d1729]/70 px-4 py-3 text-white outline-none transition focus:border-[#7ed7ff]"
              />
            )}

            <div className="flex items-center justify-between text-sm text-slate-300">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe((prev) => !prev)}
                  className="h-4 w-4 rounded border-white/30 bg-[#0d1729]"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => setError("Please contact your administrator to reset password.")}
                className="text-[#7ed7ff] transition hover:text-[#b7edff]"
              >
                Forgot password
              </button>
            </div>

            {error && <p className="rounded-lg border border-red-400/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
            {success && <p className="rounded-lg border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{success}</p>}

            <button
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#4cc9f0] to-[#7f5af0] px-4 py-3 font-semibold text-[#02101f] shadow-lg shadow-[#7f5af0]/35 transition hover:translate-y-[-1px] disabled:opacity-50"
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p className="mt-5 text-xs text-slate-400">
            Demo users after seed: admin@iqac.edu, hod.cse@iqac.edu, ravi@student.iqac.edu (password: Admin@123)
          </p>
        </section>
      </div>
    </div>
  );
}
