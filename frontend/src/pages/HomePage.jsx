import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const roleLabel = {
  admin: "Admin",
  hod: "Department",
  department: "Department",
  student: "Student",
  faculty: "Faculty"
};

const dashboardLinks = [
  { to: "/admin", label: "Admin Dashboard", allowed: ["admin"] },
  { to: "/hod", label: "Department Dashboard", allowed: ["hod"] },
  { to: "/faculty", label: "Faculty Panel", allowed: ["faculty", "hod", "admin"] },
  { to: "/student", label: "Student Dashboard", allowed: ["student"] }
];

export default function HomePage() {
  const { user } = useAuth();
  const normalizedRole = String(user?.role || "").toLowerCase() === "department" ? "hod" : String(user?.role || "").toLowerCase();
  const visibleLinks = dashboardLinks.filter((link) => link.allowed.includes(normalizedRole));

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/40 bg-white/80 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-ink/70">Home</p>
        <h2 className="mt-2 font-heading text-3xl text-brand-ink">Welcome, {user?.name}</h2>
        <p className="mt-2 text-brand-ink/80">
          Logged in as <strong>{roleLabel[normalizedRole] || normalizedRole}</strong>. Use the quick links below to continue.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visibleLinks.map((link) => (
          <Link key={link.to} to={link.to} className="rounded-2xl border border-white/40 bg-white/80 p-4 hover:bg-white">
            {link.label}
          </Link>
        ))}
      </section>
    </div>
  );
}
