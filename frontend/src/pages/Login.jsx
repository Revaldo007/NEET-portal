import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DeveloperBadge from "../components/DeveloperBadge";

const OPTIONS = ["A", "B", "C", "D"];
// Answer pattern on the answer sheet (index of the filled bubble per row)
const OMR_ROWS = [1, 3, 0, 2, 1];

/*
  Every size below is "original size, but never bigger than N vh".
  At an 800px-tall window you get exactly the design you approved.
  On shorter windows everything shrinks a little instead of making the page scroll.
*/
const css = `
  @keyframes omr-fill {
    from { background-color: transparent; color: rgba(255,255,255,.6); transform: scale(.85); }
    to   { transform: scale(1); }
  }
  .omr-filled { animation: omr-fill .45s ease-out both; }
  .auth-input:focus { outline: 3px solid #5eead4; outline-offset: 1px; border-color: #0f766e; }

  /* The navbar is 65px (64px bar + 1px accent line); the page is exactly the rest of the screen. */
  .auth-page { min-height: calc(100vh - 65px); min-height: calc(100dvh - 65px); }
  .auth-main { scrollbar-width: none; }
  .auth-main::-webkit-scrollbar { display: none; }

  @media (min-width: 1024px) {
    .auth-page {
      height: calc(100vh - 65px);
      height: calc(100dvh - 65px);
      min-height: 0;
      overflow: hidden;
    }
    body:has(.auth-page) { overflow: hidden; }
  }

  .auth-h2 { font-size: clamp(1.6rem, min(4.5vh, 3.2vw), 2.25rem); line-height: 1.25; }

  /* Very short windows: drop the decorative answer sheet so the text is never squeezed */
  @media (max-height: 620px) { .auth-omr { display: none; } }
  /* Narrow desktop windows: no room for both the answer sheet and the badge */
  @media (max-width: 1149px) { .auth-omr { display: none; } }
  @media (prefers-reduced-motion: reduce) { .omr-filled { animation: none; } }
`;

function OmrSheet() {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-[clamp(1rem,3vh,1.5rem)] backdrop-blur-sm">
      <p className="mb-[clamp(0.5rem,2vh,1rem)] text-sm text-white/60">Answer sheet</p>
      <div className="space-y-[clamp(0.35rem,1.5vh,0.75rem)]">
        {OMR_ROWS.map((filled, row) => (
          <div key={row} className="flex items-center gap-4">
            <span className="w-6 text-sm tabular-nums text-white/50">{row + 1}</span>
            <div className="flex gap-3">
              {OPTIONS.map((opt, i) => (
                <span
                  key={opt}
                  className={`flex h-[clamp(1.5rem,4vh,2rem)] w-[clamp(1.5rem,4vh,2rem)] items-center justify-center rounded-full border text-xs font-semibold ${
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

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";
const inputClass =
  "auth-input w-full rounded-lg border border-slate-300 bg-white px-4 py-[clamp(0.5rem,1.5vh,0.75rem)] text-slate-900 placeholder:text-slate-400";

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
    <div className="auth-page relative flex bg-white">
      <style>{css}</style>

      {/* Left: dark panel (hidden below 1024px) */}
      <aside className="relative hidden w-1/2 flex-col justify-between gap-4 overflow-hidden bg-[#14213d] p-[clamp(1.5rem,6vh,3rem)] text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative">
          <h2 className="auth-h2 font-display">
            Your NEET exam,
            <br />
            from application to result.
          </h2>
          <p className="mt-[clamp(0.5rem,2vh,1rem)] max-w-sm text-[clamp(0.875rem,2vh,1rem)] leading-relaxed text-white/70">
            Apply online, download your admit card, take the exam on this portal and see your result when it is published.
          </p>
        </div>

        <div className="auth-omr relative max-w-sm">
          <OmrSheet />
        </div>
      </aside>

      {/* Right: sign-in form, at the top like the approved design */}
      <main className="auth-main flex w-full items-start justify-center overflow-y-auto bg-slate-50 px-6 pb-24 pt-[clamp(1rem,5vh,2.5rem)] lg:w-1/2 lg:justify-start lg:pl-[clamp(1.5rem,4.4vw,3.5rem)] 2xl:justify-center 2xl:pl-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-[clamp(1.25rem,4vh,2rem)] shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
          <h1 className="font-display text-[clamp(1.5rem,3.75vh,1.875rem)] leading-[1.2] text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in to manage your NEET application and exam.</p>

          {error && (
            <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-[clamp(0.75rem,3vh,1.5rem)] space-y-[clamp(0.75rem,2.5vh,1.25rem)]">
            <div>
              <label htmlFor="email" className={labelClass}>Email address</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className={`${inputClass} pr-16`}
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
              className="w-full rounded-lg bg-[#14213d] px-4 py-[clamp(0.5rem,1.5vh,0.75rem)] font-semibold text-white transition hover:bg-[#1d2f57] focus-visible:outline focus-visible:outline-4 focus-visible:outline-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-[clamp(0.75rem,4vh,2rem)] text-center text-sm text-slate-600">
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