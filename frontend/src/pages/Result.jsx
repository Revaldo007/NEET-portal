import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import client from "../api/client";

const ROWS = [
  { key: "physics_score", label: "Physics" },
  { key: "chemistry_score", label: "Chemistry" },
  { key: "biology_score", label: "Biology" },
];

export default function Result() {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setLoading(true);
    client
      .get("/api/exam/result")
      .then((res) => {
        setResult(res.data);
        setError("");
      })
      .catch((err) => {
        const status = err.response?.status;
        if (status === 404) {
          setError("Result not available yet. Please complete the online examination first.");
        } else if (status === 403) {
          setError("Access denied. Your application must be approved before accessing results.");
        } else {
          setError(err.response?.data?.detail || "Could not load your result. Please try again.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRetake = async () => {
    setResetting(true);
    try {
      await client.post("/api/exam/reset");
      navigate("/exam");
    } catch {
      setResetting(false);
      alert("Failed to reset exam. Please try again.");
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-teal)] mb-1">NEET ONLINE EXAMINATION RESULT</p>
      <h1 className="font-display text-3xl mb-8">Official Scorecard</h1>

      {loading && (
        <div className="doc-card p-6 text-sm text-gray-500">Loading your result…</div>
      )}

      {!loading && error && (
        <div className="doc-card p-6 space-y-4">
          <div className="text-sm" style={{ color: "var(--color-amber)" }}>
            {error}
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Link to="/exam" className="btn btn-teal text-sm">
              Go to Examination
            </Link>
            <Link to="/dashboard" className="btn btn-outline text-sm">
              Dashboard
            </Link>
          </div>
        </div>
      )}

      {!loading && result && (
        <div className="doc-card overflow-hidden" style={{ borderColor: "var(--color-navy)" }}>
          <div className="px-6 py-5 flex items-center justify-between" style={{ background: "var(--color-navy)" }}>
            <span className="font-display text-lg text-white">Score summary</span>
            <span
              className="status-pill"
              style={{
                background: result.passed ? "var(--color-green-light)" : "var(--color-red-light)",
                color: result.passed ? "var(--color-green)" : "var(--color-red)",
              }}
            >
              {result.passed ? "PASSED" : "NOT CLEARED"}
            </span>
          </div>

          <div className="p-6">
            <div className="space-y-2 mb-5">
              {ROWS.map((row) => (
                <div key={row.key} className="flex justify-between text-sm border-b pb-2" style={{ borderColor: "var(--color-line)" }}>
                  <span className="text-gray-600">{row.label}</span>
                  <span className="font-semibold">{result[row.key]}</span>
                </div>
              ))}
              <div className="flex justify-between text-base pt-1">
                <span className="font-semibold">Total</span>
                <span className="font-display font-semibold">{result.total_score} / {result.max_score}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center mb-6">
              <div className="doc-card p-3">
                <p className="text-lg font-semibold" style={{ color: "var(--color-green)" }}>{result.correct_count}</p>
                <p className="text-[11px] text-gray-500">Correct</p>
              </div>
              <div className="doc-card p-3">
                <p className="text-lg font-semibold" style={{ color: "var(--color-red)" }}>{result.wrong_count}</p>
                <p className="text-[11px] text-gray-500">Wrong</p>
              </div>
              <div className="doc-card p-3">
                <p className="text-lg font-semibold text-gray-500">{result.unanswered_count}</p>
                <p className="text-[11px] text-gray-500">Unanswered</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleRetake}
                disabled={resetting}
                className="btn btn-primary text-sm flex-1"
              >
                {resetting ? "Resetting…" : "Practice Retake"}
              </button>
              <Link to="/dashboard" className="btn btn-outline text-sm">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

