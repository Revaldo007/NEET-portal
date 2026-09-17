import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", date_of_birth: "" });
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
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 ledger-bg">
      <div className="w-full max-w-md doc-card doc-card-accent p-8">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-teal)] mb-1">NEET EXAMINATION PORTAL</p>
        <h1 className="font-display text-2xl mb-6">Create your student account</h1>

        {error && (
          <div className="mb-4 text-sm px-3 py-2 rounded" style={{ background: "var(--color-red-light)", color: "var(--color-red)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">Full name</label>
            <input required className="field-input" value={form.name} onChange={update("name")} placeholder="Rahul Kumar" />
          </div>
          <div>
            <label className="field-label">Email address</label>
            <input type="email" required className="field-input" value={form.email} onChange={update("email")} placeholder="you@example.com" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Phone</label>
              <input required className="field-input" value={form.phone} onChange={update("phone")} placeholder="9876543210" />
            </div>
            <div>
              <label className="field-label">Date of birth</label>
              <input type="date" required className="field-input" value={form.date_of_birth} onChange={update("date_of_birth")} />
            </div>
          </div>
          <div>
            <label className="field-label">Password</label>
            <input type="password" required minLength={6} className="field-input" value={form.password} onChange={update("password")} placeholder="At least 6 characters" />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
            {loading ? "Creating account…" : "Register"}
          </button>
        </form>

        <p className="text-sm text-center mt-6 text-gray-600">
          Already registered?{" "}
          <Link to="/login" className="text-[var(--color-teal)] font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
