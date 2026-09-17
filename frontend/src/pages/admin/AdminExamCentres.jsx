import { useEffect, useState } from "react";
import client from "../../api/client";

const emptyForm = { name: "", address: "", city: "", capacity: 100 };

export default function AdminExamCentres() {
  const [centres, setCentres] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState(null);

  const load = () => client.get("/api/admin/exam-centres").then((res) => setCentres(res.data));

  useEffect(() => {
    load();
  }, []);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    const payload = { ...form, capacity: Number(form.capacity) };
    try {
      if (editingId) {
        await client.put(`/api/admin/exam-centres/${editingId}`, payload);
        setMessage({ type: "success", text: "Exam centre updated successfully." });
      } else {
        await client.post("/api/admin/exam-centres", payload);
        setMessage({ type: "success", text: "Exam centre added successfully." });
      }
      resetForm();
      load();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Could not save exam centre." });
    }
  };

  const handleEdit = (centre) => {
    setForm({ name: centre.name, address: centre.address || "", city: centre.city, capacity: centre.capacity });
    setEditingId(centre.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this exam centre?")) return;
    setDeletingId(id);
    setMessage(null);
    try {
      await client.delete(`/api/admin/exam-centres/${id}`);
      setMessage({ type: "success", text: "Exam centre deleted successfully." });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Could not delete exam centre." });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-teal)] mb-1">ADMIN</p>
      <h1 className="font-display text-3xl mb-6">Exam centres</h1>

      {message && (
        <div
          className={`text-sm px-4 py-3 rounded-lg mb-6 flex items-center justify-between ${
            (typeof message === "object" ? message.type : "") === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
          }`}
        >
          <span>{typeof message === "object" ? message.text : message}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs font-semibold underline ml-4 hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="doc-card p-6 mb-8 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label">Centre name</label>
          <input required className="field-input" value={form.name} onChange={update("name")} />
        </div>
        <div>
          <label className="field-label">City</label>
          <input required className="field-input" value={form.city} onChange={update("city")} />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Address</label>
          <input className="field-input" value={form.address} onChange={update("address")} />
        </div>
        <div>
          <label className="field-label">Capacity</label>
          <input type="number" min="1" className="field-input" value={form.capacity} onChange={update("capacity")} />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn btn-primary">{editingId ? "Update centre" : "Add centre"}</button>
          {editingId && <button type="button" onClick={resetForm} className="btn btn-outline">Cancel</button>}
        </div>
      </form>

      <div className="doc-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ background: "var(--color-paper)" }}>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">City</th>
              <th className="px-4 py-3 font-semibold">Capacity</th>
              <th className="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {centres.map((c) => (
              <tr key={c.id} className="border-t" style={{ borderColor: "var(--color-line)" }}>
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3">{c.city}</td>
                <td className="px-4 py-3">{c.capacity}</td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button onClick={() => handleEdit(c)} className="text-xs font-semibold" style={{ color: "var(--color-teal)" }}>Edit</button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="text-xs font-semibold disabled:opacity-50"
                    style={{ color: "var(--color-red)" }}
                  >
                    {deletingId === c.id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
