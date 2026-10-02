import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DeveloperBadge from "../components/DeveloperBadge";

// Answer pattern shown on the OMR sheet (index of the filled bubble per row)
const OMR_ROWS = [1, 3, 0, 2, 1];
const OPTIONS = ["A", "B", "C", "D"];

function OmrSheet() {
  return (
    <div className="omr-sheet rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-sm">
      <p className="mb-4 text-sm text-white/60">Answer sheet</p>
      <div className="space-y-3">
        {OMR_ROWS.map((filled, row) => (
          <div key={row} className="flex items-center gap-4">
            <span className="w-6 text-sm tabular-nums text-white/50">{row + 1}</span>
            <div className="flex gap-3">
              {OPTIONS.map((opt, i) => (
                <span
                  key={opt}
                  className={`omr-bubble flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                    i === filled
                      ? "omr-filled border-teal-300 bg-teal-300 text-slate-900"
                      : "border-white/30 text-white/60"
                  }`}
                  style={i === filled ? { animationDelay: `${0.3 + row * 0.35}s` } : undefined}
                >
                  {opt}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      navigate(data.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Check your email and password, then try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] bg-white">
      <style>{`
        @keyframes omr-fill {
          from { background-color: transparent; color: rgba(255,255,255,.6); transform: scale(.85); }
          to   { transform: scale(1); }
        }
        .omr-filled { animation: omr-fill .45s ease-out both; }
        .login-input:focus { outline: 3px solid #5eead4; outline-offset: 1px; border-color: #0f766e; }
        @media (prefers-reduced-motion: reduce) { .omr-filled { animation: none; } }
      `}</style>

      {/* Left: what the portal is for */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#14213d] p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative">
          <h2 className="font-display text-4xl leading-tight">
            Your NEET exam,
            <br />
            from application to result.
          </h2>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-white/70">
            Apply online, download your admit card, take the exam on this portal and see your result when it is published.
          </p>
        </div>

        <div className="relative max-w-sm">
          <OmrSheet />
        </div>
      </aside>

      {/* Right: sign-in form */}
      <main className="flex w-full items-start justify-center bg-slate-50 px-6 pb-64 pt-10 lg:w-1/2 lg:justify-start lg:pl-14">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
          <h1 className="font-display text-3xl text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in to manage your NEET application and exam.</p>

          {error && (
            <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="login-input w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="login-input w-full rounded-lg border border-slate-300 bg-white py-3 pl-4 pr-16 text-slate-900 placeholder:text-slate-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 px-4 text-sm font-medium text-teal-700 hover:text-teal-900"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#14213d] px-4 py-3 font-semibold text-white transition hover:bg-[#1d2f57] focus-visible:outline focus-visible:outline-4 focus-visible:outline-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            New student?{" "}
            <Link to="/register" className="font-semibold text-teal-700 hover:text-teal-900 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>

      <DeveloperBadge />
    </div>
  );
}