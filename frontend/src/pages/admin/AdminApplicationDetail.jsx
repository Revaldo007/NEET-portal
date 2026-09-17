import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import client, { fileUrl } from "../../api/client";
import StatusPill from "../../components/StatusPill";

export default function AdminApplicationDetail() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [customRoll, setCustomRoll] = useState("");
  const [savingRoll, setSavingRoll] = useState(false);
  const [message, setMessage] = useState(null);

  const load = () =>
    client.get(`/api/admin/applications/${id}`).then((res) => {
      setApp(res.data);
      if (res.data.roll_number) {
        setCustomRoll(res.data.roll_number);
      } else {
        // Pre-fill suggested standard roll number if none exists yet
        const yearSuffix = res.data.exam_cycle?.year ? res.data.exam_cycle.year.slice(-2) : "26";
        setCustomRoll(`NEET${yearSuffix}${String(res.data.id).padStart(4, "0")}`);
      }
    });

  useEffect(() => {
    load();
  }, [id]);

  const generateSuggestedRoll = () => {
    if (!app) return;
    const yearSuffix = app.exam_cycle?.year ? app.exam_cycle.year.slice(-2) : "26";
    setCustomRoll(`NEET${yearSuffix}${String(app.id).padStart(4, "0")}`);
  };

  const handleSaveRollNumber = async () => {
    if (!customRoll.trim()) {
      setMessage({ type: "error", text: "Please enter a valid roll number." });
      return;
    }
    setSavingRoll(true);
    setMessage(null);
    try {
      const { data } = await client.put(`/api/admin/applications/${id}/roll-number`, {
        roll_number: customRoll.trim(),
      });
      setApp(data);
      setCustomRoll(data.roll_number || customRoll.trim());
      setMessage({ type: "success", text: `Roll number updated to "${data.roll_number}".` });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Could not save roll number." });
    } finally {
      setSavingRoll(false);
    }
  };

  const decide = async (status) => {
    setMessage(null);
    try {
      const payload = { status };
      if (status === "approved" && customRoll.trim()) {
        payload.roll_number = customRoll.trim();
      }
      const { data } = await client.post(`/api/admin/applications/${id}/decision`, payload);
      setApp(data);
      if (data.roll_number) setCustomRoll(data.roll_number);
      setMessage({ type: "success", text: `Application ${status} successfully.` });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Could not update application." });
    }
  };

  if (!app) return <div className="max-w-3xl mx-auto px-4 py-10 text-sm text-gray-500">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/admin/applications" className="text-xs font-semibold" style={{ color: "var(--color-teal)" }}>
        ← Back to applications
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-3 mt-4 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[var(--color-teal)] mb-1">APPLICATION REVIEW</p>
          <h1 className="font-display text-3xl">{app.application_code || `Application #${app.id}`}</h1>
        </div>
        <StatusPill status={app.status} />
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

      {/* Candidate Roll Number Admin Creation & Management Card */}
      <div className="doc-card p-6 mb-6" style={{ borderLeft: "4px solid var(--color-teal)" }}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h2 className="font-display text-lg">Candidate Roll Number</h2>
          {app.roll_number ? (
            <span className="text-xs px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
              Current: {app.roll_number}
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded bg-amber-100 text-amber-800 font-medium">
              Not Assigned Yet
            </span>
          )}
        </div>
        <p className="text-xs text-gray-600 mb-4 leading-relaxed">
          Admin can assign or customize the candidate's Roll Number below. This roll number is automatically printed on the candidate's Admit Card and Scorecard.
        </p>
        <div className="flex items-center gap-2.5 flex-wrap">
          <input
            type="text"
            className="field-input font-mono font-bold text-sm max-w-xs uppercase bg-white"
            placeholder="e.g. NEET260002"
            value={customRoll}
            onChange={(e) => setCustomRoll(e.target.value.toUpperCase())}
          />
          <button
            type="button"
            onClick={generateSuggestedRoll}
            className="btn btn-outline text-xs !py-2 !px-3"
            title="Auto-fill standard roll number"
          >
            ↺ Reset Standard
          </button>
          <button
            type="button"
            onClick={handleSaveRollNumber}
            disabled={savingRoll || !customRoll.trim()}
            className="btn btn-teal text-xs !py-2 !px-4 font-semibold"
          >
            {savingRoll ? "Saving…" : "Save Roll Number"}
          </button>
        </div>
      </div>

      {/* Candidate Details */}
      <div className="doc-card p-6 mb-6">
        <h2 className="font-display text-lg mb-4">Candidate details</h2>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {[
            ["Name", app.full_name],
            ["Date of birth", app.date_of_birth],
            ["Gender", app.gender],
            ["Category", app.category],
            ["Phone", app.phone],
            ["Email", app.email],
            ["City", app.city],
            ["State", app.state],
            ["10th marks", app.marks_10th ? `${app.marks_10th}%` : "—"],
            ["12th marks", app.marks_12th ? `${app.marks_12th}%` : "—"],
            ["School", app.school_name],
            ["Exam cycle", app.exam_cycle ? `${app.exam_cycle.title} (${app.exam_cycle.year || "2026"})` : "—"],
            ["Exam mode", "Online Examination (Remote CBT)"],
            ["Roll number", app.roll_number || "Not assigned yet"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between border-b pb-2" style={{ borderColor: "var(--color-line)" }}>
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-medium text-right font-mono text-xs">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Documents */}
      <div className="doc-card p-6 mb-6">
        <h2 className="font-display text-lg mb-4">Uploaded Documents & ID Proof</h2>
        <div className="flex gap-6 flex-wrap">
          {app.documents.length === 0 && <p className="text-sm text-gray-400">No documents uploaded.</p>}
          {app.documents.map((doc) => (
            <div key={doc.id} className="text-center p-3 rounded border bg-gray-50/50" style={{ borderColor: "var(--color-line)" }}>
              <img
                src={fileUrl(doc.file_path)}
                alt={doc.doc_type}
                className="w-28 h-28 object-cover rounded border bg-white shadow-sm"
                style={{ borderColor: "var(--color-line)" }}
              />
              <p className="text-xs font-semibold text-gray-700 mt-2 capitalize">
                {doc.doc_type.replace("_", " ")}
              </p>
              {doc.doc_type === "id_proof" && (
                <span className="inline-block mt-1 text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-medium">
                  ★ Used on Admit Card
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Statuses */}
      <div className="doc-card p-6 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-gray-600">Payment status</p>
          <StatusPill status={app.payment_status} />
        </div>
        <div>
          <p className="text-sm text-gray-600">Document status</p>
          <StatusPill status={app.document_status} />
        </div>
      </div>

      {/* Actions */}
      {app.status === "submitted" && (
        <div className="flex gap-3">
          <button onClick={() => decide("approved")} className="btn btn-teal">
            Approve application {customRoll ? `(Assign ${customRoll})` : ""}
          </button>
          <button onClick={() => decide("rejected")} className="btn btn-danger">
            Reject application
          </button>
        </div>
      )}

      {app.status === "approved" && (
        <div className="p-4 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-emerald-800">
            <strong>Application Approved:</strong> Candidate can now view their Admit Card with Roll No.{" "}
            <span className="font-mono font-bold">{app.roll_number}</span> and access the Online CBT Examination.
          </div>
          <button onClick={() => decide("rejected")} className="btn btn-danger text-xs !py-1 !px-3">
            Revoke / Reject
          </button>
        </div>
      )}
    </div>
  );
}
