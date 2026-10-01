export default function DeveloperBadge() {
  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 bg-[#071322]/95 backdrop-blur-md border border-[#1b3450] rounded-2xl px-5 py-4 shadow-2xl shadow-cyan-950/50 text-right transition-all duration-200 hover:scale-[1.02] pointer-events-auto max-w-[calc(100vw-2rem)] sm:max-w-sm">
      {/* Developed By Section */}
      <div>
        <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-wider uppercase">
          DEVELOPED BY
        </div>
        <div className="text-sm sm:text-base font-bold text-white tracking-wide mt-0.5">
          Aliya
        </div>
        <div className="text-xs sm:text-[13px] font-medium text-[#2dd4bf] mt-0.5">
          II M.Sc Computer Science
        </div>
      </div>

      {/* Guidance Section */}
      <div className="mt-3.5">
        <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-wider uppercase">
          UNDER THE GUIDANCE OF
        </div>
        <div className="text-sm sm:text-base font-bold text-white tracking-wide mt-0.5">
          Dr. R. Kavitha Jaba Malar
        </div>
        <div className="text-xs sm:text-[13px] text-slate-300 font-normal mt-0.5">
          Associate Professor & Head
        </div>
        <div className="text-xs sm:text-[13px] text-slate-300 font-normal mt-0.5">
          Postgraduate & Research Dept. of Computer Science
        </div>
        <div className="text-xs sm:text-[13px] font-medium text-[#2dd4bf] mt-0.5">
          Muslim Arts College, Thiruvithancode
        </div>
      </div>
    </div>
  );
}
