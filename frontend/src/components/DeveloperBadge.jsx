import { useState } from "react";

export default function DeveloperBadge() {
  const [open, setOpen] = useState(false);

  return (
    <aside className="fixed bottom-4 right-4 z-30 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-[#14213d] text-white shadow-2xl shadow-slate-900/30 ring-1 ring-white/15">
      {/* Always visible: who built it */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="developer-details"
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-300"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-300 font-display text-lg font-bold text-slate-900">
          A
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-xs text-white/55">Developed by</span>
          <span className="block truncate text-base font-semibold">Aliya</span>
          <span className="block truncate text-xs text-teal-300">II M.Sc Computer Science</span>
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-white/60 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      {/* Expands on click: the guide and college */}
      <div
        id="developer-details"
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/10 px-4 py-3">
            <p className="text-xs text-white/55">Under the guidance of</p>
            <p className="mt-0.5 font-semibold">Dr. R. Kavitha Jaba Malar</p>
            <p className="mt-1 text-xs leading-relaxed text-white/70">
              Associate Professor &amp; Head
              <br />
              Postgraduate &amp; Research Dept. of Computer Science
            </p>
            <p className="mt-1 text-xs font-medium text-teal-300">Muslim Arts College, Thiruvithancode</p>
          </div>
        </div>
      </div>
    </aside>
  );
}