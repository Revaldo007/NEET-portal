import { useEffect, useState } from "react";
import client from "../../api/client";

const TILES = [
  { key: "students", label: "Students" },
  { key: "applications", label: "Applications" },
  { key: "pending_applications", label: "Pending Applications" },
  { key: "approved_applications", label: "Approved Applications" },
  { key: "questions", label: "Questions" },
  { key: "exams_completed", label: "Exams Completed" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    client.get("/api/admin/stats").then((res) => setStats(res.data));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-teal)] mb-1">ADMIN</p>
      <h1 className="font-display text-3xl mb-8">Admin dashboard</h1>

      {!stats ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TILES.map((tile) => (
            <div key={tile.key} className="doc-card doc-card-accent p-5">
              <p className="text-xs text-gray-500 mb-2">{tile.label}</p>
              <p className="font-display text-3xl">{stats[tile.key]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
