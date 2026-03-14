import { useAuth } from "../context/AuthContext.jsx";

export default function HodDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/40 bg-white/80 p-8 shadow-sm">
        <h2 className="font-heading text-2xl font-bold text-brand-ink">
          HOD Dashboard
        </h2>
        <p className="mt-2 text-brand-ink/70">
          Welcome, {user?.name}. This is your departmental overview.
        </p>
      </div>
      {/* Add HOD specific components here later */}
    </div>
  );
}
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import client from "../api/client";

export default function HodDashboard() {
  const { user } = useAuth();
  const [analytics, setAnhttps://github.com/anitha112005/IQAC/pull/2/conflict?name=backend%252Fsrc%252Fserver.js&ancestor_oid=48bc8ca45c07f293850be3a15b8ee140c01b50b7&base_oid=ac9a99a699b99544ac94aa7ec8ecca050dd275a6&head_oid=3168848349b2fc1c8e96613d2a5a5283b2f843a3alytics] = useState(null);
  const [placementForm, setPlacementForm] = useState({
    academicYear: "2025-26",
    totalEligible: 120,
    totalPlaced: 88,
    highestPackageLPA: 18,
    medianPackageLPA: 7.5
  });

  useEffect(() => {
    if (!user?.department?._id) return;

    const loadAnalytics = async () => {
      const res = await client.get(`/departments/${user.department._id}/analytics`);
      setAnalytics(res.data.data);
    };

    loadAnalytics();
  }, [user]);

  const savePlacement = async (e) => {
    e.preventDefault();
    await client.post(`/departments/${user.department._id}/placement`, placementForm);
    const refreshed = await client.get(`/departments/${user.department._id}/analytics`);
    setAnalytics(refreshed.data.data);
  };

  if (!user?.department) return <div>Department mapping missing for this HOD account.</div>;
  if (!analytics) return <div className="text-brand-ink">Loading department analytics...</div>;

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl text-brand-ink">{user.department.name} Performance</h2>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card title="Pass %" value={`${analytics.passPercent}%`} />
        <Card title="Average CGPA" value={analytics.averageCgpa} color="from-brand-flame to-brand-ocean" />
        <Card title="Backlog Rate" value={`${analytics.backlogRate}%`} color="from-brand-flame to-brand-mint" />
        <Card title="Placement Rate" value={`${analytics.placementRate}%`} color="from-brand-mint to-brand-ocean" />
        <Card title="Achievements" value={analytics.achievements} color="from-brand-ocean to-brand-flame" />
      </section>

      <form onSubmit={savePlacement} className="rounded-2xl border border-white/40 bg-white/80 p-4">
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

function Card({ title, value, color = "from-[#112a46] to-[#0d6efd]" }) {
  return (
    <article className="rounded-2xl border border-white/50 bg-white/85 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-brand-ink/60">{title}</p>
      <p className={`mt-2 bg-gradient-to-r ${color} bg-clip-text text-3xl font-semibold text-transparent`}>{value}</p>
    </article>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/50 bg-white/85 p-4 shadow-sm">
      <h3 className="font-heading text-lg text-brand-ink">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}
