import { useEffect, useState } from "react";
import client from "../../api/client";

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const load = () => client.get("/api/admin/students", { params: { search } }).then((res) => setStudents(res.data));

  useEffect(() => {
    load();
  }, [search]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this student and their application data? This cannot be undone.")) return;
    try {
      await client.delete(`/api/admin/students/${id}`);
      setMessage("Student deleted.");
      load();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Could not delete student.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-teal)] mb-1">ADMIN</p>
      <h1 className="font-display text-3xl mb-6">Students</h1>

      <input
        className="field-input max-w-xs mb-4"
        placeholder="Search by name or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {message && <p className="text-sm mb-4" style={{ color: "var(--color-teal)" }}>{message}</p>}

      <div className="doc-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ background: "var(--color-paper)" }}>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t" style={{ borderColor: "var(--color-line)" }}>
                <td className="px-4 py-3">{s.id}</td>
                <td className="px-4 py-3">{s.name}</td>
                <td className="px-4 py-3">{s.email}</td>
                <td className="px-4 py-3">{s.is_active ? "Active" : "Inactive"}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(s.id)} className="text-xs font-semibold" style={{ color: "var(--color-red)" }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No students found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
