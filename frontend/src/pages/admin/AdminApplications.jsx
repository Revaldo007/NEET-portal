import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import StatusPill from "../../components/StatusPill";

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState("0");
  const [loading, setLoading] = useState(true);

  // Load cycles for filter dropdown
  useEffect(() => {
    client
      .get("/api/admin/exam-schedules")
      .then((res) => setCycles(res.data))
      .catch(() => {});
  }, []);

  // Load applications
  useEffect(() => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (scheduleFilter && scheduleFilter !== "0") params.schedule_id = Number(scheduleFilter);

    client
      .get("/api/admin/applications", { params })
      .then((res) => {
        setApplications(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [statusFilter, scheduleFilter]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-teal)] mb-1">ADMIN</p>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl">Candidate Applications</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and approve candidate registrations across all exam cycles.
          </p>
        </div>
        <Link to="/admin/exam-schedule" className="btn btn-outline text-xs !py-1.5 !px-3">
          Manage Exam Cycles →
        </Link>
      </div>

      {/* Filters: Cycle & Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 p-4 rounded-lg bg-gray-50 border border-gray-200">
        {/* Cycle filter dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-700">Exam Cycle:</label>
          <select
            value={scheduleFilter}
            onChange={(e) => setScheduleFilter(e.target.value)}
            className="field-input !py-1 !px-2.5 text-xs bg-white min-w-[200px]"
          >
            <option value="0">All Exam Cycles ({cycles.length})</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.year || "Cycle"}) {c.is_active ? "★ Active" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-gray-700 mr-1">Status:</span>
          {["", "submitted", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="btn text-xs !py-1 !px-3"
              style={{
                background: statusFilter === s ? "var(--color-navy)" : "white",
                color: statusFilter === s ? "white" : "var(--color-ink)",
                border: "1px solid var(--color-line)",
              }}
            >
              {s === "" ? "All" : s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Applications Table */}
      <div className="doc-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ background: "var(--color-paper)" }}>
              <th className="px-4 py-3 font-semibold">Application ID</th>
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 font-semibold">Exam Cycle</th>
              <th className="px-4 py-3 font-semibold">Mode</th>
              <th className="px-4 py-3 font-semibold">Documents</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Loading applications…
                </td>
              </tr>
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No applications found for the selected filters.
                </td>
              </tr>
            ) : (
              applications.map((a) => (
                <tr key={a.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: "var(--color-line)" }}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">
                    {a.application_code || `#${a.id}`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{a.full_name}</div>
                    <div className="text-xs text-gray-500">{a.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {a.exam_cycle ? (
                      <div>
                        <div className="text-xs font-semibold text-gray-800">{a.exam_cycle.title}</div>
                        <div className="text-[11px] text-gray-500">{a.exam_cycle.year || "2026"}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded font-medium text-emerald-700 bg-emerald-50">
                      Online CBT
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={a.document_status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/applications/${a.id}`}
                      className="text-xs font-semibold hover:underline"
                      style={{ color: "var(--color-teal)" }}
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
