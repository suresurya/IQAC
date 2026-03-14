import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-brand-ink">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const normalizedRole = String(user.role || "").toLowerCase() === "department"
    ? "hod"
    : String(user.role || "").toLowerCase();

  if (!allowedRoles.includes(normalizedRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
