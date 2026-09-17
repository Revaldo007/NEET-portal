import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client, { fileUrl } from "../api/client";

export default function AdmitCard() {
  const [card, setCard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    client
      .get("/api/admit-card")
      .then((res) => setCard(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Admit card not available."));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-teal)] mb-1">HALL TICKET</p>
      <h1 className="font-display text-3xl mb-8">Admit Card</h1>

      {error && (
        <div className="doc-card p-6 text-sm" style={{ color: "var(--color-amber)", background: "var(--color-amber-light)" }}>
          {error}
        </div>
      )}

      {card && (
        <div className="doc-card overflow-hidden print:shadow-none" style={{ borderColor: "var(--color-navy)" }}>
          {/* Header */}
          <div className="px-6 py-5 text-white flex items-center justify-between" style={{ background: "var(--color-navy)" }}>
            <div>
              <p className="text-xs tracking-wide text-white/70">NATIONAL ELIGIBILITY CUM ENTRANCE TEST (UG)</p>
              <h2 className="font-display text-xl">Official Admit Card</h2>
            </div>
            <div className="text-right text-xs text-white/70">
              Exam Date<br />
              <span className="text-white font-semibold text-sm">{card.exam_date}</span>
            </div>
          </div>

          {/* Quick Join Banner — only shown when this admit card is for the active exam cycle */}
          {card.is_active_cycle ? (
            <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3.5 flex items-center justify-between flex-wrap gap-2 print:hidden">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-semibold text-emerald-900">
                  Online Remote CBT Examination Portal
                </span>
              </div>
              <Link to="/exam" className="btn btn-primary text-xs !py-1.5 !px-4">
                Enter Online Examination →
              </Link>
            </div>
          ) : (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-3.5 flex items-center gap-2 print:hidden">
              <span className="text-amber-700 text-xs font-semibold">
                ⚠ This admit card is for a future exam cycle. The exam portal will open on the scheduled exam date.
              </span>
            </div>
          )}

          <div className="p-6 grid sm:grid-cols-[1fr_96px] gap-6">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2" style={{ borderColor: "var(--color-line)" }}>
                <dt className="text-gray-500">Candidate name</dt>
                <dd className="font-semibold">{card.name}</dd>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: "var(--color-line)" }}>
                <dt className="text-gray-500">Roll number</dt>
                <dd className="font-semibold">{card.roll_number || "—"}</dd>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: "var(--color-line)" }}>
                <dt className="text-gray-500">Application ID</dt>
                <dd className="font-semibold">{card.application_code || "—"}</dd>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: "var(--color-line)" }}>
                <dt className="text-gray-500">Examination mode</dt>
                <dd className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                  {card.exam_mode || "Online Examination (Remote CBT)"}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: "var(--color-line)" }}>
                <dt className="text-gray-500">Exam date & start time</dt>
                <dd className="font-semibold">{card.exam_date} at {card.start_time}</dd>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: "var(--color-line)" }}>
                <dt className="text-gray-500">Duration</dt>
                <dd className="font-semibold">{card.duration_minutes} minutes ({Math.floor(card.duration_minutes / 60)}h {card.duration_minutes % 60 ? (card.duration_minutes % 60) + "m" : ""})</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Reporting window</dt>
                <dd className="font-semibold text-xs text-gray-700">{card.reporting_time}</dd>
              </div>
            </dl>
            {card.photo_url || card.id_proof_url ? (
              <div className="w-24 h-28 border rounded overflow-hidden shadow-sm bg-white flex flex-col items-center justify-center p-1" style={{ borderColor: "var(--color-line)" }}>
                <img
                  src={fileUrl(card.photo_url || card.id_proof_url)}
                  alt="Candidate Photo"
                  className="w-full h-full object-cover rounded"
                />
              </div>
            ) : (
              <div className="w-24 h-28 border-2 border-dashed flex items-center justify-center text-[10px] text-gray-400 text-center rounded" style={{ borderColor: "var(--color-line)" }}>
                Candidate<br />Photo
              </div>
            )}
          </div>

          {/* Instructions section */}
          <div className="px-6 py-4 border-t text-xs text-gray-600 bg-slate-50 space-y-1.5" style={{ borderColor: "var(--color-line)" }}>
            <p className="font-semibold text-gray-800">Important Instructions for Online CBT Examination:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>No physical exam centre attendance is required. All candidates will appear online.</li>
              <li>Ensure uninterrupted power supply, a webcam-enabled computer, and stable internet.</li>
              <li>The exam link opens 15 minutes before the start time for identity verification.</li>
              <li>Switching tabs or minimizing the test window will result in automatic test termination.</li>
            </ul>
          </div>

          <div className="border-t px-6 py-3 flex items-center justify-between text-xs text-gray-500" style={{ borderColor: "var(--color-line)" }}>
            <span>Digital verification valid for {card.cycle_title || "NEET Examination"}</span>
            <div className="flex items-center gap-3">
              {card.is_active_cycle && (
                <Link to="/exam" className="btn btn-teal !py-1 !px-3 text-xs print:hidden">
                  Join Exam
                </Link>
              )}
              <button onClick={() => window.print()} className="btn btn-outline !py-1 !px-3 text-xs print:hidden">
                Print Admit Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
