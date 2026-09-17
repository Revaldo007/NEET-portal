import { useEffect, useState } from "react";
import client from "../../api/client";

const defaultNewCycle = {
  title: "NEET (UG) 2027 Online Examination",
  year: "2027",
  exam_date: "2027-05-15",
  start_time: "10:00",
  duration_minutes: 180,
  instructions:
    "1. Ensure a high-speed, stable internet connection.\n2. Keep your web camera and microphone active throughout the examination.\n3. Do not switch tabs, minimize the browser, or open unauthorized applications.\n4. All responses are saved automatically in real-time.\n5. The exam will automatically submit once the time expires.",
};

export default function AdminExamSchedule() {
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [form, setForm] = useState(null);
  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
  const [newCycleForm, setNewCycleForm] = useState(defaultNewCycle);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState(null);

  const loadCycles = async (preferId = null) => {
    try {
      setLoading(true);
      const { data } = await client.get("/api/admin/exam-schedules");
      setCycles(data);
      if (data.length > 0) {
        // Prefer specified cycle, or the active one, or the first
        const active = preferId
          ? data.find((c) => c.id === preferId)
          : data.find((c) => c.is_active) || data[0];
        const target = active || data[0];
        setSelectedCycleId(target.id);
        setForm({
          title: target.title || "",
          year: target.year || "",
          exam_date: target.exam_date || "",
          start_time: target.start_time || "",
          duration_minutes: target.duration_minutes || 180,
          instructions: target.instructions || "",
          is_active: target.is_active ?? false,
        });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load exam cycles." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCycles();
  }, []);

  const selectCycle = (cycle) => {
    setSelectedCycleId(cycle.id);
    setForm({
      title: cycle.title || "",
      year: cycle.year || "",
      exam_date: cycle.exam_date || "",
      start_time: cycle.start_time || "",
      duration_minutes: cycle.duration_minutes || 180,
      instructions: cycle.instructions || "",
      is_active: cycle.is_active ?? false,
    });
    setMessage(null);
  };

  const updateField = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const updateNewField = (field) => (e) => {
    setNewCycleForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedCycleId) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        ...form,
        duration_minutes: Number(form.duration_minutes) || 180,
      };
      await client.put(`/api/admin/exam-schedules/${selectedCycleId}`, payload);
      setMessage({ type: "success", text: "Exam cycle updated successfully." });
      await loadCycles(selectedCycleId);
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Could not save exam cycle." });
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id, title) => {
    setMessage(null);
    try {
      await client.post(`/api/admin/exam-schedules/${id}/activate`);
      setMessage({ type: "success", text: `"${title}" is now the ACTIVE exam cycle for student applications.` });
      await loadCycles(id);
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Could not activate cycle." });
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete exam cycle "${title}"?`)) return;
    setMessage(null);
    try {
      await client.delete(`/api/admin/exam-schedules/${id}`);
      setMessage({ type: "success", text: `Exam cycle "${title}" deleted.` });
      await loadCycles();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Could not delete cycle." });
    }
  };

  const handleCreateCycle = async (e) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const payload = {
        ...newCycleForm,
        duration_minutes: Number(newCycleForm.duration_minutes) || 180,
      };
      const { data } = await client.post("/api/admin/exam-schedules", payload);
      setShowNewCycleModal(false);
      setMessage({
        type: "success",
        text: `Created new exam cycle "${data.title}". Click "Activate" to open it for student applications.`,
      });
      await loadCycles(data.id);
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Could not create exam cycle." });
    } finally {
      setCreating(false);
    }
  };

  const applyPresetNow = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    setForm((prev) => ({
      ...prev,
      exam_date: `${yyyy}-${mm}-${dd}`,
      start_time: `${hh}:${min}`,
      duration_minutes: 180,
    }));
  };

  const applyPresetTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    setForm((prev) => ({
      ...prev,
      exam_date: `${yyyy}-${mm}-${dd}`,
      start_time: "10:00",
      duration_minutes: 180,
    }));
  };

  const formatHoursMins = (mins) => {
    const m = Number(mins) || 0;
    const h = Math.floor(m / 60);
    const remainder = m % 60;
    return `${h}h ${remainder > 0 ? remainder + "m" : ""}`.trim();
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-10 text-sm text-gray-500">Loading exam cycles…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-teal)] mb-1">ADMIN SETTINGS</p>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl">Exam Cycles & Online Schedules</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage multiple exam cycles (e.g. NEET 2026, NEET 2027). Each cycle allows students to submit a separate application.
          </p>
        </div>
        <button
          onClick={() => setShowNewCycleModal(true)}
          className="btn btn-teal text-sm flex items-center gap-1.5"
        >
          <span>＋</span> Create New Exam Cycle
        </button>
      </div>

      {message && (
        <div
          className="mb-6 text-sm px-4 py-3 rounded border flex items-center justify-between"
          style={{
            background: message.type === "error" ? "var(--color-red-light)" : "var(--color-green-light)",
            color: message.type === "error" ? "var(--color-red)" : "var(--color-green)",
            borderColor: message.type === "error" ? "var(--color-red)" : "var(--color-green)",
          }}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs underline font-semibold ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Cycle List Section */}
      <section className="doc-card p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl">All Exam Cycles ({cycles.length})</h2>
          <span className="text-xs text-gray-500">The Active cycle is the one currently open for student registration.</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ background: "var(--color-paper)" }}>
                <th className="px-4 py-2.5 font-semibold">Title</th>
                <th className="px-4 py-2.5 font-semibold">Year</th>
                <th className="px-4 py-2.5 font-semibold">Exam Date</th>
                <th className="px-4 py-2.5 font-semibold">Time & Duration</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((c) => {
                const isSelected = c.id === selectedCycleId;
                return (
                  <tr
                    key={c.id}
                    className={`border-t transition-colors ${
                      isSelected ? "bg-teal-50/50" : "hover:bg-gray-50/70"
                    }`}
                    style={{ borderColor: "var(--color-line)" }}
                  >
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {c.title}
                        {isSelected && (
                          <span className="text-[10px] uppercase font-bold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded">
                            Editing
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{c.year || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{c.exam_date}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.start_time} · {c.duration_minutes}m ({formatHoursMins(c.duration_minutes)})
                    </td>
                    <td className="px-4 py-3">
                      {c.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!c.is_active && (
                          <button
                            onClick={() => handleActivate(c.id, c.title)}
                            className="btn btn-outline text-xs !py-1 !px-2.5 text-teal-700 hover:bg-teal-50"
                            title="Set as the currently open registration cycle"
                          >
                            Set Active
                          </button>
                        )}
                        <button
                          onClick={() => selectCycle(c)}
                          className={`btn text-xs !py-1 !px-2.5 ${
                            isSelected ? "btn-teal" : "btn-outline"
                          }`}
                        >
                          {isSelected ? "Editing" : "Configure"}
                        </button>
                        {!c.is_active && (
                          <button
                            onClick={() => handleDelete(c.id, c.title)}
                            className="text-xs text-red-600 hover:text-red-800 px-1 py-1"
                            title="Delete this cycle"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit Selected Cycle Form & Preview */}
      {form && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl">
                Configure: <span className="text-[var(--color-teal)]">{form.title}</span>
              </h2>
              <p className="text-xs text-gray-500">
                Update date, start time, instructions, and duration for this cycle.
              </p>
            </div>
            {/* Quick Presets */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={applyPresetNow}
                className="btn btn-outline text-xs !py-1 !px-2.5"
                title="Set to right now for live testing"
              >
                ⚡ Start Right Now (Live Test)
              </button>
              <button
                type="button"
                onClick={applyPresetTomorrow}
                className="btn btn-outline text-xs !py-1 !px-2.5"
                title="Set to tomorrow 10 AM"
              >
                📅 Tomorrow 10:00 AM
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
            {/* Form */}
            <form onSubmit={handleSave} className="doc-card p-6 space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="field-label">Cycle Title</label>
                  <input
                    required
                    className="field-input"
                    value={form.title}
                    onChange={updateField("title")}
                    placeholder="e.g. NEET (UG) 2026 Online Examination"
                  />
                </div>
                <div>
                  <label className="field-label">Year</label>
                  <input
                    required
                    className="field-input font-semibold"
                    value={form.year}
                    onChange={updateField("year")}
                    placeholder="2026"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Exam Date</label>
                  <input
                    required
                    type="date"
                    className="field-input"
                    value={form.exam_date}
                    onChange={updateField("exam_date")}
                  />
                </div>
                <div>
                  <label className="field-label">Exam Start Time</label>
                  <input
                    required
                    type="time"
                    className="field-input"
                    value={form.start_time}
                    onChange={updateField("start_time")}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="field-label !mb-0">Duration (Minutes)</label>
                  <span className="text-xs font-semibold" style={{ color: "var(--color-teal)" }}>
                    {formatHoursMins(form.duration_minutes)}
                  </span>
                </div>
                <input
                  required
                  type="number"
                  min="5"
                  max="600"
                  className="field-input"
                  value={form.duration_minutes}
                  onChange={updateField("duration_minutes")}
                  placeholder="180"
                />
              </div>

              <div>
                <label className="field-label">Candidate Instructions</label>
                <textarea
                  rows={4}
                  className="field-input font-mono text-xs"
                  value={form.instructions}
                  onChange={updateField("instructions")}
                  placeholder="Instructions displayed on admit card and before exam start..."
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--color-line)" }}>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? "Saving Changes…" : "Save Cycle Changes"}
                </button>
                {!form.is_active && (
                  <button
                    type="button"
                    onClick={() => handleActivate(selectedCycleId, form.title)}
                    className="btn btn-teal text-xs"
                  >
                    Activate This Cycle
                  </button>
                )}
              </div>
            </form>

            {/* Live Preview Card */}
            <div className="space-y-4">
              <div className="doc-card overflow-hidden" style={{ borderColor: "var(--color-navy)" }}>
                <div
                  className="px-5 py-3 text-white flex items-center justify-between text-xs"
                  style={{ background: "var(--color-navy)" }}
                >
                  <span className="font-semibold uppercase tracking-wider">Admit Card Preview</span>
                  <span className="text-white/70">{form.is_active ? "Active Cycle" : "Inactive Cycle"}</span>
                </div>
                <div className="p-5 space-y-3 text-xs">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Examination</span>
                    <span className="font-semibold text-right">{form.title || "—"}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Year</span>
                    <span className="font-semibold">{form.year || "—"}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Mode</span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Online Examination (Remote CBT)
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Scheduled Date</span>
                    <span className="font-semibold">{form.exam_date || "—"}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Start Time</span>
                    <span className="font-semibold">{form.start_time || "—"}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-semibold">
                      {form.duration_minutes} minutes ({formatHoursMins(form.duration_minutes)})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reporting Window</span>
                    <span className="font-semibold text-gray-700">
                      {form.start_time} (15 mins prior login)
                    </span>
                  </div>
                </div>
              </div>

              <div className="doc-card p-4" style={{ background: "var(--color-paper)" }}>
                <h3 className="font-display text-sm font-semibold mb-1 text-gray-800">
                  Multiple Application Cycle Support
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  When you activate a new cycle, candidates will see the new exam cycle on their dashboard and can apply afresh. Their previous cycle applications, admit cards, and results are safely stored in their Application History.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal: Create New Exam Cycle */}
      {showNewCycleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-display text-xl">Create New Exam Cycle</h2>
              <button
                onClick={() => setShowNewCycleModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCycle} className="space-y-4 text-sm">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="field-label">Cycle Title</label>
                  <input
                    required
                    className="field-input text-xs"
                    value={newCycleForm.title}
                    onChange={updateNewField("title")}
                    placeholder="e.g. NEET (UG) 2027 Online Examination"
                  />
                </div>
                <div>
                  <label className="field-label">Year</label>
                  <input
                    required
                    className="field-input text-xs"
                    value={newCycleForm.year}
                    onChange={updateNewField("year")}
                    placeholder="2027"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Exam Date</label>
                  <input
                    required
                    type="date"
                    className="field-input text-xs"
                    value={newCycleForm.exam_date}
                    onChange={updateNewField("exam_date")}
                  />
                </div>
                <div>
                  <label className="field-label">Start Time</label>
                  <input
                    required
                    type="time"
                    className="field-input text-xs"
                    value={newCycleForm.start_time}
                    onChange={updateNewField("start_time")}
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Duration (Minutes)</label>
                <input
                  required
                  type="number"
                  min="5"
                  max="600"
                  className="field-input text-xs"
                  value={newCycleForm.duration_minutes}
                  onChange={updateNewField("duration_minutes")}
                  placeholder="180"
                />
              </div>

              <div>
                <label className="field-label">Candidate Instructions</label>
                <textarea
                  rows={3}
                  className="field-input font-mono text-xs"
                  value={newCycleForm.instructions}
                  onChange={updateNewField("instructions")}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewCycleModal(false)}
                  className="btn btn-outline text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn btn-teal text-xs"
                >
                  {creating ? "Creating…" : "Create Exam Cycle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
