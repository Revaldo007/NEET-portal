import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  not_started: "bg-gray-100 text-gray-500",
};

const PAYMENT_COLORS = {
  unpaid: "bg-orange-100 text-orange-700",
  paid: "bg-green-100 text-green-700",
};

function Badge({ label, colorClass }) {
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${colorClass}`}>
      {label?.replace("_", " ")}
    </span>
  );
}

export default function ApplicationHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    client
      .get("/api/applications/history")
      .then((res) => {
        setHistory(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load application history. Please try again.");
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[var(--color-teal)] mb-1">
            EXAM HISTORY
          </p>
          <h1 className="font-display text-3xl">My Applications</h1>
          <p className="text-sm text-gray-500 mt-1">
            All your NEET exam applications across every cycle
          </p>
        </div>
        <Link to="/dashboard" className="btn btn-outline text-sm self-start">
          ← Back to Dashboard
        </Link>
      </div>

      {loading && (
        <div className="doc-card p-10 text-center text-gray-500 text-sm">
          Loading your application history…
        </div>
      )}

      {error && (
        <div className="doc-card p-8 text-center text-red-600 text-sm">{error}</div>
      )}

      {!loading && !error && history.length === 0 && (
        <div className="doc-card p-10 text-center">
          <div className="text-5xl mb-4">📂</div>
          <h2 className="font-display text-xl mb-2">No applications yet</h2>
          <p className="text-sm text-gray-500 mb-6">
            You haven't applied for any exam cycle yet.
          </p>
          <Link to="/application" className="btn btn-teal">
            Apply Now
          </Link>
        </div>
      )}

      {!loading && !error && history.length > 0 && (
        <div className="space-y-4">
          {history.map((app, i) => (
            <div
              key={app.id}
              className="doc-card p-6 hover:border-[var(--color-teal)] transition-colors"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Left: cycle info */}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="font-display text-lg">
                      {app.cycle_title || `Exam Cycle ${app.exam_schedule_id}`}
                    </h2>
                    {app.cycle_year && (
                      <span className="text-xs bg-[var(--color-navy)] text-white px-2 py-0.5 rounded-full">
                        {app.cycle_year}
                      </span>
                    )}
                  </div>
                  {app.cycle_exam_date && (
                    <p className="text-xs text-gray-500 mb-3">
                      Exam Date:{" "}
                      <span className="font-medium text-gray-700">
                        {new Date(app.cycle_exam_date).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </p>
                  )}

                  {/* Status row */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge
                      label={`Application: ${app.status}`}
                      colorClass={STATUS_COLORS[app.status] || STATUS_COLORS.draft}
                    />
                    <Badge
                      label={`Payment: ${app.payment_status}`}
                      colorClass={PAYMENT_COLORS[app.payment_status] || PAYMENT_COLORS.unpaid}
                    />
                  </div>
                </div>

                {/* Right: identifiers & actions */}
                <div className="text-right space-y-2 flex-shrink-0">
                  {app.application_code && (
                    <p className="text-xs text-gray-500">
                      Code:{" "}
                      <span className="font-mono font-semibold text-gray-800">
                        {app.application_code}
                      </span>
                    </p>
                  )}
                  {app.roll_number && (
                    <p className="text-xs text-gray-500">
                      Roll No:{" "}
                      <span className="font-mono font-semibold text-gray-800">
                        {app.roll_number}
                      </span>
                    </p>
                  )}
                  {app.created_at && (
                    <p className="text-xs text-gray-400">
                      Applied:{" "}
                      {new Date(app.created_at).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}

                  {/* Quick actions */}
                  <div className="flex gap-2 justify-end pt-1">
                    {app.status === "approved" && (
                      <Link to="/admit-card" className="btn btn-teal text-xs !py-1.5 !px-3">
                        Admit Card
                      </Link>
                    )}
                    {app.status === "draft" || app.status === "submitted" ? (
                      <Link to="/application" className="btn btn-outline text-xs !py-1.5 !px-3">
                        {app.status === "draft" ? "Continue" : "View"}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Call to action if no active application shown */}
      {!loading && !error && history.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500 mb-3">
            Looking to apply for the current exam cycle?
          </p>
          <Link to="/application" className="btn btn-teal">
            Go to Current Application
          </Link>
        </div>
      )}
    </div>
  );
}
