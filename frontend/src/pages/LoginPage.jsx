import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import client from "../api/client";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "admin@iqac.edu",
    password: "Admin@123",
    role: "admin",
    registrationNumber: "",
    facultyId: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "signup") {
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
        await login(form.email, form.password, form.role);
        navigate("/home");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pattern grid place-items-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl border border-white/50 bg-white/75 p-6 shadow-lg backdrop-blur"
      >
        <div className="mb-4 inline-flex rounded-xl border border-brand-ink/15 bg-white p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-lg px-4 py-2 text-sm ${mode === "login" ? "bg-brand-ink text-white" : "text-brand-ink"}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-lg px-4 py-2 text-sm ${mode === "signup" ? "bg-brand-ink text-white" : "text-brand-ink"}`}
          >
            Signup
          </button>
        </div>

        <h2 className="font-heading text-3xl text-brand-ink">{mode === "login" ? "Welcome Back" : "Create Account"}</h2>
        <p className="mt-1 text-sm text-brand-ink/70">
          {mode === "login" ? "Login to IQAC Monitoring Platform" : "Register for Student / Faculty / Department / Admin"}
        </p>

        <div className="mt-6 space-y-4">
          {mode === "signup" && (
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder="Full Name"
              className="w-full rounded-xl border border-brand-ink/20 bg-white px-4 py-3"
            />
          )}

          {mode === "signup" && form.role === "student" && (
            <input
              name="registrationNumber"
              value={form.registrationNumber}
              onChange={onChange}
              placeholder="Student Registration Number"
              className="w-full rounded-xl border border-brand-ink/20 bg-white px-4 py-3"
            />
          )}

          {mode === "signup" && form.role === "faculty" && (
            <input
              name="facultyId"
              value={form.facultyId}
              onChange={onChange}
              placeholder="Faculty ID"
              className="w-full rounded-xl border border-brand-ink/20 bg-white px-4 py-3"
            />
          )}

          <select
            name="role"
            value={form.role}
            onChange={onChange}
            className="w-full rounded-xl border border-brand-ink/20 bg-white px-4 py-3"
          >
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="department">Department</option>
            <option value="admin">Admin</option>
          </select>

          <input
            name="email"
            value={form.email}
            onChange={onChange}
            placeholder="Email / Registration Number / Faculty ID"
            className="w-full rounded-xl border border-brand-ink/20 bg-white px-4 py-3"
          />
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            placeholder="Password"
            className="w-full rounded-xl border border-brand-ink/20 bg-white px-4 py-3"
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-3 text-sm text-green-700">{success}</p>}

        <button
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-brand-ink px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Sign Up"}
        </button>

        <p className="mt-4 text-xs text-brand-ink/65">
          Demo users after seed: admin@iqac.edu, hod.cse@iqac.edu, ravi@student.iqac.edu (password: Admin@123)
        </p>
      </form>
    </div>
  );
}
