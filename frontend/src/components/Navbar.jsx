import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const studentLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/application", label: "Application" },
  { to: "/my-applications", label: "My Applications" },
  { to: "/documents", label: "Documents" },
  { to: "/admit-card", label: "Admit Card" },
  { to: "/exam", label: "Exam" },
  { to: "/result", label: "Result" },
];

const adminLinks = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/students", label: "Students" },
  { to: "/admin/applications", label: "Applications" },
  { to: "/admin/exam-schedule", label: "Exam Schedule" },
  { to: "/admin/questions", label: "Questions" },
];

export default function Navbar() {
  const auth = useAuth();
  const navigate = useNavigate();
  const links = auth.role === "admin" ? adminLinks : studentLinks;

  const handleLogout = () => {
    auth.logout();
    navigate("/login");
  };

  return (
    <header style={{ background: "var(--color-navy)" }} className="text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to={auth.role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2">
            <span className="font-display text-lg tracking-tight">NEET Examination Portal</span>
          </Link>
          {auth.token && (
            <div className="hidden md:flex items-center gap-1">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="px-3 py-2 text-sm rounded hover:bg-white/10 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            {auth.token ? (
              <>
                <span className="hidden sm:inline text-sm text-white/70">
                  {auth.name} · <span className="uppercase tracking-wide text-xs">{auth.role}</span>
                </span>
                <button onClick={handleLogout} className="btn btn-outline !border-white !text-white text-xs !py-1.5 !px-3">
                  Log out
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-teal !py-1.5 !px-3 text-xs">Log in</Link>
            )}
          </div>
        </div>
        {auth.token && (
          <div className="md:hidden flex flex-wrap gap-1 pb-3">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="px-2.5 py-1 text-xs rounded bg-white/10 hover:bg-white/20"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
