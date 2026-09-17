import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import StatusPill from "../components/StatusPill";

const emptyForm = {
  full_name: "", date_of_birth: "", gender: "", category: "", nationality: "Indian",
  phone: "", email: "", address: "", city: "", state: "", pincode: "",
  marks_10th: "", marks_12th: "", school_name: "", year_of_passing: "",
};

function Field({ label, children }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

export default function ApplicationForm() {
  const [app, setApp] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await client.get("/api/application");
    setApp(res.data);
    setForm({
      ...emptyForm,
      ...Object.fromEntries(Object.keys(emptyForm).map((k) => [k, res.data[k] ?? emptyForm[k]])),
    });
  };

  useEffect(() => {
    load().catch(() => setMessage({ type: "error", text: "Could not load your application." }));
  }, []);

  const locked = app && (app.status === "submitted" || app.status === "approved");

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        ...form,
        marks_10th: form.marks_10th === "" ? null : Number(form.marks_10th),
        marks_12th: form.marks_12th === "" ? null : Number(form.marks_12th),
      };
      const { data } = await client.put("/api/application", payload);
      setApp(data);
      setMessage({ type: "success", text: "Application details saved." });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Could not save application." });
    } finally {
      setSaving(false);
    }
  };

  const handlePay = async () => {
    setMessage(null);
    try {
      await client.post("/api/payment/pay");
      await load();
      setMessage({ type: "success", text: "Payment successful." });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Payment failed." });
    }
  };

  const handleSubmitApplication = async () => {
    setMessage(null);
    try {
      const { data } = await client.post("/api/application/submit");
      setApp(data);
      setMessage({ type: "success", text: "Application submitted successfully." });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Could not submit application." });
    }
  };

  if (!app) return <div className="max-w-4xl mx-auto px-4 py-10 text-sm text-gray-500">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="text-xs font-semibold tracking-wide text-[var(--color-teal)]">NEET APPLICATION FORM</p>
            {app.exam_cycle && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-800">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
                Applying for: {app.exam_cycle.title} {app.exam_cycle.year ? `(${app.exam_cycle.year})` : ""}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl">
            {app.application_code ? `Application ${app.application_code}` : "Complete your application"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/my-applications" className="text-xs text-[var(--color-teal)] hover:underline">
            All Applications →
          </Link>
          <StatusPill status={app.status} />
        </div>
      </div>

      {message && (
        <div
          className="mb-6 text-sm px-3 py-2 rounded"
          style={{
            background: message.type === "error" ? "var(--color-red-light)" : "var(--color-green-light)",
            color: message.type === "error" ? "var(--color-red)" : "var(--color-green)",
          }}
        >
          {message.text}
        </div>
      )}

      {locked && (
        <div className="mb-6 text-sm px-3 py-2 rounded" style={{ background: "var(--color-amber-light)", color: "var(--color-amber)" }}>
          Your application has been submitted and can no longer be edited.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        <section className="doc-card p-6">
          <h2 className="font-display text-lg mb-4">Personal details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name">
              <input disabled={locked} required className="field-input" value={form.full_name} onChange={update("full_name")} />
            </Field>
            <Field label="Date of birth">
              <input disabled={locked} type="date" required className="field-input" value={form.date_of_birth} onChange={update("date_of_birth")} />
            </Field>
            <Field label="Gender">
              <select disabled={locked} required className="field-input" value={form.gender} onChange={update("gender")}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Category">
              <select disabled={locked} className="field-input" value={form.category} onChange={update("category")}>
                <option value="">Select</option>
                <option>General</option>
                <option>OBC</option>
                <option>SC</option>
                <option>ST</option>
                <option>EWS</option>
              </select>
            </Field>
            <Field label="Nationality">
              <input disabled={locked} className="field-input" value={form.nationality} onChange={update("nationality")} />
            </Field>
          </div>
        </section>

        <section className="doc-card p-6">
          <h2 className="font-display text-lg mb-4">Contact details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Phone">
              <input disabled={locked} required className="field-input" value={form.phone} onChange={update("phone")} />
            </Field>
            <Field label="Email">
              <input disabled={locked} type="email" required className="field-input" value={form.email} onChange={update("email")} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Address">
                <input disabled={locked} className="field-input" value={form.address} onChange={update("address")} />
              </Field>
            </div>
            <Field label="City">
              <input disabled={locked} required className="field-input" value={form.city} onChange={update("city")} />
            </Field>
            <Field label="State">
              <input disabled={locked} required className="field-input" value={form.state} onChange={update("state")} />
            </Field>
            <Field label="Pincode">
              <input disabled={locked} className="field-input" value={form.pincode} onChange={update("pincode")} />
            </Field>
          </div>
        </section>

        <section className="doc-card p-6">
          <h2 className="font-display text-lg mb-4">Academic details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="10th marks (%)">
              <input disabled={locked} type="number" step="0.01" className="field-input" value={form.marks_10th} onChange={update("marks_10th")} />
            </Field>
            <Field label="12th marks (%)">
              <input disabled={locked} type="number" step="0.01" className="field-input" value={form.marks_12th} onChange={update("marks_12th")} />
            </Field>
            <Field label="School name">
              <input disabled={locked} className="field-input" value={form.school_name} onChange={update("school_name")} />
            </Field>
            <Field label="Year of passing">
              <input disabled={locked} className="field-input" value={form.year_of_passing} onChange={update("year_of_passing")} />
            </Field>
          </div>
        </section>

        <section className="doc-card p-6">
          <h2 className="font-display text-lg mb-2">Examination Mode</h2>
          <div className="p-4 rounded border bg-emerald-50 border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              Online Examination (Remote CBT / Web-based)
            </div>
            <p className="text-xs text-emerald-700 leading-relaxed">
              The NEET examination is conducted 100% online through this candidate portal. No physical examination centre visit is required. Candidates will take the test remotely with active web camera and microphone proctoring.
            </p>
          </div>
        </section>

        {!locked && (
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? "Saving…" : "Save application"}
          </button>
        )}
      </form>

      <section className="doc-card p-6 mt-8">
        <h2 className="font-display text-lg mb-4">Application fee</h2>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-gray-600">Application fee: <span className="font-semibold text-[var(--color-ink)]">₹1,700</span></p>
            <div className="mt-1"><StatusPill status={app.payment_status} /></div>
          </div>
          {app.payment_status !== "paid" && !locked && (
            <button onClick={handlePay} className="btn btn-teal">Pay now</button>
          )}
        </div>
      </section>

      {!locked && (
        <div className="mt-8 doc-card p-6" style={{ borderLeftColor: "var(--color-amber)" }}>
          <h2 className="font-display text-lg mb-2">Ready to submit?</h2>
          <p className="text-sm text-gray-600 mb-4">
            Make sure you've saved your details, uploaded your documents, and completed payment before submitting.
            Submitted applications cannot be edited.
          </p>
          <button onClick={handleSubmitApplication} className="btn btn-primary">Submit application</button>
        </div>
      )}
    </div>
  );
}
