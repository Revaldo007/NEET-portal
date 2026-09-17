import { useEffect, useState } from "react";
import client from "../../api/client";

const emptyForm = {
  subject: "physics", question_text: "", option_a: "", option_b: "", option_c: "", option_d: "",
  correct_answer: "A", marks: 4,
};

export default function AdminQuestions() {
  const [questions, setQuestions] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState(null);

  const load = () => client.get("/api/admin/questions", { params: { subject: subjectFilter } }).then((res) => setQuestions(res.data));

  useEffect(() => {
    load();
  }, [subjectFilter]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    const payload = { ...form, marks: Number(form.marks) };
    try {
      if (editingId) {
        await client.put(`/api/admin/questions/${editingId}`, payload);
        setMessage({ type: "success", text: "Question updated successfully." });
      } else {
        await client.post("/api/admin/questions", payload);
        setMessage({ type: "success", text: "Question added successfully." });
      }
      resetForm();
      load();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Could not save question." });
    }
  };

  const handleEdit = (q) => {
    setForm({
      subject: q.subject, question_text: q.question_text,
      option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
      correct_answer: q.correct_answer, marks: q.marks,
    });
    setEditingId(q.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    setDeletingId(id);
    setMessage(null);
    try {
      await client.delete(`/api/admin/questions/${id}`);
      setMessage({ type: "success", text: "Question deleted successfully." });
      await load();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "Could not delete question.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-teal)] mb-1">ADMIN</p>
      <h1 className="font-display text-3xl mb-6">Question bank</h1>

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

      <form onSubmit={handleSubmit} className="doc-card p-6 mb-8 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Subject</label>
            <select className="field-input" value={form.subject} onChange={update("subject")}>
              <option value="physics">Physics</option>
              <option value="chemistry">Chemistry</option>
              <option value="biology">Biology</option>
            </select>
          </div>
          <div>
            <label className="field-label">Marks</label>
            <input type="number" className="field-input" value={form.marks} onChange={update("marks")} />
          </div>
        </div>
        <div>
          <label className="field-label">Question</label>
          <textarea required rows={2} className="field-input" value={form.question_text} onChange={update("question_text")} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Option A</label>
            <input required className="field-input" value={form.option_a} onChange={update("option_a")} />
          </div>
          <div>
            <label className="field-label">Option B</label>
            <input required className="field-input" value={form.option_b} onChange={update("option_b")} />
          </div>
          <div>
            <label className="field-label">Option C</label>
            <input required className="field-input" value={form.option_c} onChange={update("option_c")} />
          </div>
          <div>
            <label className="field-label">Option D</label>
            <input required className="field-input" value={form.option_d} onChange={update("option_d")} />
          </div>
        </div>
        <div>
          <label className="field-label">Correct answer</label>
          <select className="field-input max-w-[120px]" value={form.correct_answer} onChange={update("correct_answer")}>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary">{editingId ? "Update question" : "Add question"}</button>
          {editingId && <button type="button" onClick={resetForm} className="btn btn-outline">Cancel</button>}
        </div>
      </form>

      <div className="flex gap-2 mb-4">
        {["", "physics", "chemistry", "biology"].map((s) => (
          <button
            key={s}
            onClick={() => setSubjectFilter(s)}
            className="btn text-xs !py-1.5 !px-3"
            style={{
              background: subjectFilter === s ? "var(--color-navy)" : "white",
              color: subjectFilter === s ? "white" : "var(--color-ink)",
              border: "1px solid var(--color-line)",
            }}
          >
            {s === "" ? "All" : s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {questions.map((q) => (
          <div key={q.id} className="doc-card p-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500 capitalize mb-1">{q.subject} · {q.marks} marks · Correct: {q.correct_answer}</p>
              <p className="text-sm font-medium">{q.question_text}</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <button onClick={() => handleEdit(q)} className="text-xs font-semibold" style={{ color: "var(--color-teal)" }}>Edit</button>
              <button
                onClick={() => handleDelete(q.id)}
                disabled={deletingId === q.id}
                className="text-xs font-semibold disabled:opacity-50"
                style={{ color: "var(--color-red)" }}
              >
                {deletingId === q.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ))}
        {questions.length === 0 && <p className="text-sm text-gray-400">No questions found.</p>}
      </div>
    </div>
  );
}
