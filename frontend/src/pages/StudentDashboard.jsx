import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import StatusPill from "../components/StatusPill";

const TILES = [
  { key: "application_status", label: "Application", to: "/application" },
  { key: "document_status", label: "Documents", to: "/documents" },
  { key: "payment_status", label: "Payment", to: "/application" },
  { key: "exam_status", label: "Exam", to: "/exam" },
];

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    client
      .get("/api/dashboard")
      .then((res) => setData(res.data))
      .catch(() => setError("Could not load your dashboard right now."));
  }, []);

  if (error) return <div className="max-w-5xl mx-auto px-4 py-10 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="max-w-5xl mx-auto px-4 py-10 text-sm text-gray-500">Loading…</div>;

  const notStarted = data.application_status === "not_started";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-teal)] mb-1">STUDENT DASHBOARD</p>
      <h1 className="font-display text-3xl mb-1">Welcome, {data.student_name}</h1>

      {/* Active Cycle Banner */}
      <div className="flex flex-wrap items-center gap-3 mb-8 mt-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-700">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse inline-block" />
          Active Cycle: {data.active_cycle_title || `NEET ${data.active_cycle_year}`}
        </span>
        {data.total_applications > 1 && (
          <Link
            to="/my-applications"
            className="text-xs text-[var(--color-teal)] underline underline-offset-2 hover:opacity-70"
          >
            View all {data.total_applications} applications →
          </Link>
        )}
      </div>

      {notStarted ? (
        /* No application yet for this cycle */
        <div className="doc-card p-8 mb-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="font-display text-xl mb-2">No application for this cycle yet</h2>
          <p className="text-sm text-gray-600 mb-6">
            The <strong>{data.active_cycle_title}</strong> exam cycle is now open.
            Start your application to register.
          </p>
          <Link to="/application" className="btn btn-teal">
            Start Application
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {TILES.map((tile) => (
            <Link key={tile.key} to={tile.to} className="doc-card p-5 hover:border-[var(--color-teal)] transition-colors">
              <p className="text-xs text-gray-500 mb-2">{tile.label}</p>
              <StatusPill status={data[tile.key]} />
            </Link>
          ))}
        </div>
      )}

      {!notStarted && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="doc-card p-6">
            <h2 className="font-display text-lg mb-2">Admit Card</h2>
            <p className="text-sm text-gray-600 mb-4">
              {data.admit_card_available
                ? "Your admit card is ready to view and download with exam date and online CBT link."
                : "Available once your application has been approved by the admin."}
            </p>
            <Link to="/admit-card" className={`btn text-sm ${data.admit_card_available ? "btn-teal" : "btn-outline"}`}>
              View Admit Card
            </Link>
          </div>
          <div className="doc-card p-6">
            <h2 className="font-display text-lg mb-2">Result</h2>
            <p className="text-sm text-gray-600 mb-4">
              {data.result_available
                ? "Your NEET examination has been evaluated. View your official scorecard."
                : "Available after you complete the NEET online examination."}
            </p>
            <Link to="/result" className={`btn text-sm ${data.result_available ? "btn-teal" : "btn-outline"}`}>
              View Result
            </Link>
          </div>
        </div>
      )}

      {/* Past Applications shortcut */}
      {data.total_applications > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            You have applied to <strong>{data.total_applications}</strong> exam cycle{data.total_applications !== 1 ? "s" : ""} in total.
          </p>
          <Link to="/my-applications" className="btn btn-outline text-sm">
            My Applications History
          </Link>
        </div>
      )}
    </div>
  );
}
