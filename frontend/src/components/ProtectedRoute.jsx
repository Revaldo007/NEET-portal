import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ role, children }) {
  const auth = useAuth();

  if (!auth.token) {
    return <Navigate to="/login" replace />;
  }
  if (role && auth.role !== role) {
    return <Navigate to={auth.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }
  return children;
}
