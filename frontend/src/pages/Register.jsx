import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DeveloperBadge from "../components/DeveloperBadge";

const OMR_ROWS = [2, 0, 1, 3, 0];
const OPTIONS = ["A", "B", "C", "D"];
const STEPS = [
  "Register and fill in your application",
  "Upload your documents",
  "Download your admit card",
  "Take the exam online",
  "See your result",
];

function OmrSheet() {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-sm">
      <p className="mb-4 text-sm text-white/60">Answer sheet</p>
      <div className="space-y-3">
        {OMR_ROWS.map((filled, row) => (
          <div key={row} className="flex items-center gap-4">
            <span className="w-6 text-sm tabular-nums text-white/50">{row + 1}</span>
            <div className="flex gap-3">
              {OPTIONS.map((opt, i) => (
                <span
                  key={opt}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
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

const inputClass =
  "login-input w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-slate-900 placeholder:text-slate-400";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", date_of_birth: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Check your details and try again.");
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

      {/* Left: what happens after registering */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#14213d] p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative">
          <h2 className="font-display text-4xl leading-tight">
            Register for the
            <br />
            NEET online exam.
          </h2>
          <ul className="mt-6 space-y-3">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-3 text-white/80">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-300 text-sm font-bold tabular-nums text-slate-900">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative max-w-sm">
          <OmrSheet />
        </div>
      </aside>

      {/* Right: registration form (compact so it clears the developer badge) */}
      <main className="flex w-full items-start justify-center bg-slate-50 px-6 pb-64 pt-6 lg:w-1/2 lg:justify-start lg:pl-10">
        <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
          <h1 className="font-display text-2xl text-slate-900">Create your student account</h1>

          {error && (
            <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className={labelClass}>Full name</label>
                <input
                  id="name"
                  required
                  autoComplete="name"
                  className={inputClass}
                  value={form.name}
                  onChange={update("name")}
                  placeholder="Rahul Kumar"
                />
              </div>
              <div>
                <label htmlFor="phone" className={labelClass}>Phone</label>
                <input
                  id="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  className={inputClass}
                  value={form.phone}
                  onChange={update("phone")}
                  placeholder="9876543210"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>Email address</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className={inputClass}
                value={form.email}
                onChange={update("email")}
                placeholder="you@example.com"
              />
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label htmlFor="dob" className={labelClass}>Date of birth</label>
                <input
                  id="dob"
                  type="date"
                  required
                  className={inputClass}
                  value={form.date_of_birth}
                  onChange={update("date_of_birth")}
                />
              </div>
              <div>
                <label htmlFor="password" className={labelClass}>Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={`${inputClass} pr-16`}
                    value={form.password}
                    onChange={update("password")}
                    placeholder="6+ characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-teal-700 hover:text-teal-900"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#14213d] px-4 py-2.5 font-semibold text-white transition hover:bg-[#1d2f57] focus-visible:outline focus-visible:outline-4 focus-visible:outline-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-teal-700 hover:text-teal-900 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>

      <DeveloperBadge />
    </div>
  );
}