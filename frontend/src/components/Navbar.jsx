import { Link, NavLink, useNavigate } from "react-router-dom";
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

// Logo mark: four answer bubbles, one filled and glowing (echoes the OMR sheet)
function LogoMark() {
  return (
    <span className="grid h-10 w-10 grid-cols-2 gap-1.5 rounded-xl bg-gradient-to-br from-white/15 to-white/5 p-2 ring-1 ring-white/20 shadow-lg shadow-teal-400/10">
      <span className="rounded-full border-[1.5px] border-white/55" />
      <span className="rounded-full bg-teal-300 shadow-[0_0_10px_rgba(94,234,212,0.9)]" />
      <span className="rounded-full border-[1.5px] border-white/55" />
      <span className="rounded-full border-[1.5px] border-white/55" />
    </span>
  );
}

const desktopLink = ({ isActive }) =>
  `flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-white/10 text-white ring-1 ring-white/15"
      : "text-white/65 hover:bg-white/5 hover:text-white"
  }`;

const mobileLink = ({ isActive }) =>
  `whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
    isActive ? "bg-teal-300 text-slate-900" : "bg-white/10 text-white/75 hover:bg-white/15"
  }`;

export default function Navbar() {
  const auth = useAuth();
  const navigate = useNavigate();
  const isAdmin = auth.role === "admin";
  const links = isAdmin ? adminLinks : studentLinks;
  const initial = (auth.name || "?").trim().charAt(0).toUpperCase();

  const handleLogout = () => {
    auth.logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-[#14213d] via-[#16294a] to-[#0f3a4a] shadow-lg shadow-slate-900/20">
      <style>{`
        .nb-scroll { scrollbar-width: none; }
        .nb-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/* soft teal glow in the top-right corner */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-10 -top-16 h-40 w-72 rounded-full bg-teal-400/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6">
        <Link
          to={isAdmin ? "/admin" : "/dashboard"}
          className="flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-300"
        >
        
          <span className="leading-none">
            <span className="block font-display text-lg text-white">National Competitive Examination Management System</span>
           
          </span>
        </Link>

        {auth.token && (
          <nav aria-label="Main" className="hidden items-center gap-1 xl:flex">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === "/admin"} className={desktopLink}>
                {({ isActive }) => (
                  <>
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-teal-300 shadow-[0_0_6px_rgba(94,234,212,0.9)]" />}
                    {link.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {auth.token ? (
            <>
              <div className="flex items-center gap-2.5 rounded-full bg-white/10 py-1 pl-1 pr-1 ring-1 ring-white/10 2xl:pr-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-200 to-teal-400 text-sm font-bold text-slate-900">
                  {initial}
                </span>
                <span className="hidden text-sm leading-tight text-white 2xl:block">
                  {auth.name}
                  <span className="block text-xs capitalize text-white/55">{auth.role}</span>
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-300 hover:bg-red-400/10 hover:text-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/register"
                className="hidden rounded-full border border-white/25 px-4 py-2 text-sm font-medium text-white/85 transition hover:border-white/50 hover:bg-white/10 hover:text-white sm:block"
              >
                Create account
              </Link>
              <Link
                to="/login"
                className="rounded-full bg-gradient-to-r from-teal-300 to-emerald-300 px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-teal-400/25 transition hover:-translate-y-px hover:shadow-teal-400/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
              >
                Log in
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Smaller screens: links move to a scrollable row under the header */}
      {auth.token && (
        <nav aria-label="Main" className="nb-scroll relative flex gap-2 overflow-x-auto px-6 pb-3 xl:hidden">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === "/admin"} className={mobileLink}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}

      {/* thin teal accent line that fades out at both ends */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-teal-300/60 to-transparent" />
    </header>
  );
}