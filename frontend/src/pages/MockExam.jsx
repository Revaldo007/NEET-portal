import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import client from "../api/client";

const SUBJECT_LABEL = { physics: "Physics", chemistry: "Chemistry", biology: "Biology" };

function formatTime(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function parseUtcDate(isoString) {
  if (!isoString) return Date.now();
  const utcStr = isoString.endsWith("Z") || isoString.includes("+") ? isoString : isoString + "Z";
  const parsed = new Date(utcStr).getTime();
  return isNaN(parsed) ? Date.now() : parsed;
}

function getScheduledStartTime(schedule) {
  if (!schedule || !schedule.exam_date) return null;
  const timeStr = (schedule.start_time || "10:00").trim();
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  let hours = 10;
  let mins = 0;
  if (match) {
    hours = parseInt(match[1], 10);
    mins = parseInt(match[2], 10);
    if (/pm/i.test(timeStr) && hours < 12) hours += 12;
    if (/am/i.test(timeStr) && hours === 12) hours = 0;
  }
  const parts = schedule.exam_date.split("-").map(Number);
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    return new Date(yyyy, mm - 1, dd, hours, mins, 0, 0).getTime();
  }
  return null;
}

export default function MockExam() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("loading"); // loading | countdown | intro | active | completed | blocked
  const [blockedReason, setBlockedReason] = useState("");
  const [schedule, setSchedule] = useState(null);
  const [admitCard, setAdmitCard] = useState(null);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const submittedRef = useRef(false);

  // Keep now updated every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      // 1. Fetch dashboard and schedule
      const [dashRes, schedRes] = await Promise.all([
        client.get("/api/dashboard"),
        client.get("/api/exam/schedule").catch(() => ({ data: null })),
      ]);

      const data = dashRes.data;
      const sched = schedRes.data || null;
      if (sched) setSchedule(sched);

      if (!data.admit_card_available) {
        setBlockedReason("Your NEET application must be approved by the administrator before you can enter the examination.");
        setPhase("blocked");
        return;
      }

      // Fetch candidate card details
      try {
        const cardRes = await client.get("/api/admit-card");
        setAdmitCard(cardRes.data);
      } catch {
        // non-blocking
      }

      if (data.exam_status === "submitted") {
        setPhase("completed");
        return;
      }

      // Time gate: exam must not be in the future before allowing any access
      if (sched) {
        const scheduledMs = getScheduledStartTime(sched);
        if (scheduledMs && scheduledMs > Date.now()) {
          // Exam is scheduled in the future — show countdown regardless of exam_status
          // (prevents resuming a stale in_progress session from a previous cycle)
          setPhase("countdown");
          return;
        }
      }

      if (data.exam_status === "in_progress") {
        await loadExamSession(true);
        return;
      }

      // Not started yet: show countdown / open gate
      setPhase("countdown");
    } catch {
      setBlockedReason("Could not check your examination status right now.");
      setPhase("blocked");
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const loadExamSession = async (isResuming = false) => {
    try {
      const { data: examData } = await client.post("/api/exam/start");
      const { data: qData } = await client.get("/api/exam/questions");
      setExam(examData);
      setQuestions(qData);

      // Restore previously saved answers if any
      const savedAnswers = {};
      qData.forEach((item) => {
        if (item.selected_option) {
          savedAnswers[item.id] = item.selected_option;
        }
      });
      setAnswers(savedAnswers);

      let remaining = examData.remaining_seconds;
      if (remaining === undefined || remaining === null) {
        const startedAt = parseUtcDate(examData.started_at);
        const deadline = startedAt + (examData.duration_minutes || 180) * 60 * 1000;
        remaining = Math.round((deadline - Date.now()) / 1000);
      }

      if (remaining <= 0 && isResuming) {
        // Time expired while candidate was away
        setSecondsLeft(0);
        await submitDirect(qData, savedAnswers);
        return;
      }

      setSecondsLeft(Math.max(1, remaining));
      setPhase("active");
    } catch (err) {
      console.error("Error loading exam session:", err);
      setBlockedReason("Could not start or resume the examination.");
      setPhase("blocked");
    }
  };

  const startExam = () => {
    if (!isExamOpen) {
      alert("The examination gate is locked. You can only enter once the countdown reaches zero.");
      return;
    }
    loadExamSession(false);
  };

  const resetAndRetake = async () => {
    if (!window.confirm("Are you sure you want to reset your examination session?")) return;
    setResetting(true);
    try {
      await client.post("/api/exam/reset");
      setExam(null);
      setQuestions([]);
      setAnswers({});
      setCurrent(0);
      setSecondsLeft(0);
      submittedRef.current = false;
      setResetting(false);
      await checkStatus();
    } catch {
      setResetting(false);
      alert("Failed to reset examination. Please try again.");
    }
  };

  const submitDirect = async (qs, currentAnswers) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    const payload = {
      answers: qs.map((q) => ({ question_id: q.id, selected_option: currentAnswers[q.id] || null })),
    };
    try {
      await client.post("/api/exam/submit", payload);
      navigate("/result");
    } catch {
      setSubmitting(false);
      submittedRef.current = false;
    }
  };

  const doSubmit = async () => {
    if (!window.confirm("Are you sure you want to submit your NEET Examination? You cannot change your answers after submission.")) return;
    await submitDirect(questions, answers);
  };

  const handleSelectOption = (questionId, opt) => {
    setAnswers((prev) => ({ ...prev, [questionId]: opt }));
    client.post("/api/exam/answer", { question_id: questionId, selected_option: opt }).catch(() => {});
  };

  useEffect(() => {
    if (phase !== "active") return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          submitDirect(questions, answers);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, questions, answers]);

  const answeredCount = Object.keys(answers).length;
  const q = questions[current];

  const bySubject = useMemo(() => {
    const groups = {};
    questions.forEach((question, idx) => {
      groups[question.subject] = groups[question.subject] || [];
      groups[question.subject].push(idx);
    });
    return groups;
  }, [questions]);

  // Compute countdown to scheduled start
  const scheduledTime = schedule ? getScheduledStartTime(schedule) : null;
  const diffMs = scheduledTime ? Math.max(0, scheduledTime - now) : 0;
  const isExamOpen = scheduledTime ? scheduledTime <= now : true;

  const countdownDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const countdownHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const countdownMins = Math.floor((diffMs / (1000 * 60)) % 60);
  const countdownSecs = Math.floor((diffMs / 1000) % 60);

  if (phase === "loading") {
    return <div className="max-w-3xl mx-auto px-4 py-10 text-sm text-gray-500">Connecting to Examination Portal…</div>;
  }

  if (phase === "blocked") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-teal)] mb-1">ONLINE EXAMINATION</p>
        <h1 className="font-display text-3xl mb-6">Portal Access Notice</h1>
        <div className="doc-card p-6 text-sm" style={{ background: "var(--color-amber-light)", color: "var(--color-amber)" }}>
          {blockedReason}
        </div>
        <div className="mt-6">
          <Link to="/dashboard" className="btn btn-outline text-sm">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (phase === "completed") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-teal)] mb-1">OFFICIAL EXAMINATION</p>
        <h1 className="font-display text-3xl mb-6">Examination Completed</h1>
        <div className="doc-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <p className="text-base font-semibold text-gray-800">
              Your NEET Online Examination has been successfully submitted.
            </p>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Your responses have been recorded and evaluated against official answer keys. You can view your detailed scorecard, subject-wise marks distribution, and qualification status.
          </p>
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <button onClick={() => navigate("/result")} className="btn btn-teal text-sm">
              View Official Result
            </button>
            <button onClick={resetAndRetake} disabled={resetting} className="btn btn-outline text-sm">
              {resetting ? "Resetting…" : "Practice Retake"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Phase: Countdown & Candidate Gate
  if (phase === "countdown") {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-8">
          <p className="text-xs font-bold tracking-widest text-[var(--color-teal)] uppercase mb-1">
            NATIONAL ELIGIBILITY CUM ENTRANCE TEST (UG)
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-gray-900">
            {schedule?.title || "NEET Online Examination"}
          </h1>
          <p className="text-sm text-gray-600 mt-2 max-w-xl mx-auto">
            Official Computer-Based Online Examination. Remote proctored environment.
          </p>
        </div>

        {/* Live Countdown Clock Card */}
        <div className="doc-card overflow-hidden mb-8 shadow-sm" style={{ borderColor: "var(--color-navy)" }}>
          <div className="px-6 py-4 text-white flex items-center justify-between" style={{ background: "var(--color-navy)" }}>
            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full ${isExamOpen ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`}></span>
              <span className="text-xs uppercase font-semibold tracking-wider text-white/90">
                {isExamOpen ? "Examination Portal is Live Now" : "Exam Countdown to Start Time"}
              </span>
            </div>
            <span className="text-xs font-mono text-white/80">
              {schedule?.exam_date} · {schedule?.start_time}
            </span>
          </div>

          <div className="p-8 text-center bg-gradient-to-b from-slate-50 to-white">
            {!isExamOpen ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-5">
                  Time Remaining Until Exam Opens
                </p>
                <div className="grid grid-cols-4 gap-3 sm:gap-6 max-w-lg mx-auto mb-6">
                  {[
                    { label: "DAYS", value: countdownDays },
                    { label: "HOURS", value: countdownHours },
                    { label: "MINUTES", value: countdownMins },
                    { label: "SECONDS", value: countdownSecs },
                  ].map((unit) => (
                    <div
                      key={unit.label}
                      className="doc-card p-3 sm:p-4 text-center rounded-lg shadow-sm"
                      style={{ background: "white", borderColor: "var(--color-line)" }}
                    >
                      <div className="font-mono text-2xl sm:text-4xl font-bold text-gray-900">
                        {String(unit.value).padStart(2, "0")}
                      </div>
                      <div className="text-[10px] sm:text-xs font-bold text-gray-400 tracking-wider mt-1">
                        {unit.label}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                  <span>⏳ Exam gate opens automatically at scheduled time</span>
                </div>
              </div>
            ) : (
              <div className="py-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl animate-bounce">
                  ✓
                </div>
                <h3 className="font-display text-2xl font-bold text-gray-900 mb-1">
                  Examination Hall is Open!
                </h3>
                <p className="text-sm text-gray-600 max-w-md mx-auto">
                  The scheduled exam time has arrived. Please review the rules below and enter the examination hall.
                </p>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-6 border-t bg-white flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: "var(--color-line)" }}>
            <div className="text-xs text-gray-500">
              Allocated Duration: <span className="font-semibold text-gray-800">{schedule?.duration_minutes || 180} minutes</span>
              {!isExamOpen ? (
                <span className="block text-[11px] text-amber-700 font-medium mt-1">
                  ⏳ Examination gate is locked. Unlocks automatically when countdown reaches 00:00:00.
                </span>
              ) : (
                <span className="block text-[11px] text-emerald-700 font-semibold mt-1">
                  ✓ Examination gate is OPEN. You may enter now.
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={startExam}
                disabled={!isExamOpen}
                className={`w-full sm:w-auto !py-2.5 !px-6 text-sm font-semibold rounded transition-all flex items-center justify-center gap-2 ${
                  isExamOpen
                    ? "btn btn-primary cursor-pointer shadow-md hover:shadow-lg"
                    : "bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed opacity-75"
                }`}
                title={!isExamOpen ? "Gate is locked until countdown reaches 00:00:00" : "Enter Examination Hall"}
              >
                {isExamOpen ? (
                  <>
                    <span>Enter Examination Hall</span>
                    <span>→</span>
                  </>
                ) : (
                  <>
                    <span>🔒 Exam Locked (Opens at 00:00:00)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Candidate & Verification Info */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="doc-card p-5">
            <h3 className="text-xs font-bold tracking-wide uppercase text-[var(--color-teal)] mb-3">
              Candidate Verification
            </h3>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between border-b pb-1.5" style={{ borderColor: "var(--color-line)" }}>
                <dt className="text-gray-500">Candidate Name</dt>
                <dd className="font-semibold">{admitCard?.name || "Verified Student"}</dd>
              </div>
              <div className="flex justify-between border-b pb-1.5" style={{ borderColor: "var(--color-line)" }}>
                <dt className="text-gray-500">Roll Number</dt>
                <dd className="font-mono font-semibold">{admitCard?.roll_number || "NEET260001"}</dd>
              </div>
              <div className="flex justify-between border-b pb-1.5" style={{ borderColor: "var(--color-line)" }}>
                <dt className="text-gray-500">Mode</dt>
                <dd className="font-semibold text-emerald-700">Online CBT (Remote)</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Total Questions</dt>
                <dd className="font-semibold">30 Questions (Physics, Chem, Bio)</dd>
              </div>
            </dl>
          </div>

          <div className="doc-card p-5">
            <h3 className="text-xs font-bold tracking-wide uppercase text-[var(--color-teal)] mb-3">
              System Checklist
            </h3>
            <ul className="space-y-2 text-xs text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>Web Browser Compatibility: Chrome / Edge / Firefox</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>Camera & Audio Proctoring: Ready</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>High-Speed Internet Connection: Connected</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>Admit Card Digital Authorization: Approved</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Instructions */}
        <div className="doc-card p-6 text-xs text-gray-700 space-y-2">
          <h3 className="font-bold text-sm text-gray-900 mb-2">Examination Instructions:</h3>
          <p>• The test consists of 30 multiple-choice questions across Physics, Chemistry, and Biology.</p>
          <p>• Marking scheme: <strong>+4 marks</strong> for every correct response, <strong>−1 mark</strong> for every incorrect response, and <strong>0</strong> for unanswered questions.</p>
          <p>• Your answers are saved automatically as you select them.</p>
          <p>• The timer starts immediately upon entering the examination hall and will auto-submit when time runs out.</p>
          <p>• Tab switching, screen sharing, or minimizing the window will be flagged as malpractice.</p>
        </div>
      </div>
    );
  }

  // Phase: Active Examination
  if (!q) {
    return <div className="max-w-3xl mx-auto px-4 py-10 text-sm text-gray-500">Preparing examination question paper…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Examination Bar */}
      <div className="doc-card mb-4 px-4 py-3 flex items-center justify-between shadow-sm" style={{ borderColor: "var(--color-navy)" }}>
        <div className="flex items-center gap-3">
          <span className="font-display text-lg tracking-tight">NEET Online Examination</span>
          <span className="hidden sm:inline text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
            LIVE CBT
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden sm:inline">Time Remaining:</span>
          <span
            className="font-mono text-lg font-bold px-3 py-1 rounded"
            style={{
              background: secondsLeft < 300 ? "var(--color-red-light)" : "var(--color-teal-light)",
              color: secondsLeft < 300 ? "var(--color-red)" : "var(--color-teal)",
            }}
          >
            {formatTime(secondsLeft)}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_260px] gap-4">
        {/* Question Area */}
        <div className="doc-card p-6">
          <div className="flex items-center justify-between mb-4 border-b pb-3" style={{ borderColor: "var(--color-line)" }}>
            <span className="text-xs font-bold tracking-wide uppercase text-[var(--color-teal)]">
              {SUBJECT_LABEL[q.subject]} · Question {current + 1} of {questions.length}
            </span>
            <span className="text-xs text-gray-500">Marking: +4 / −1</span>
          </div>

          <p className="text-base font-medium mb-6 text-gray-900 leading-relaxed">{q.question_text}</p>

          <div className="space-y-2.5">
            {["A", "B", "C", "D"].map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-3 border rounded px-4 py-3 cursor-pointer text-sm transition-all"
                style={{
                  borderColor: answers[q.id] === opt ? "var(--color-teal)" : "var(--color-line)",
                  background: answers[q.id] === opt ? "var(--color-teal-light)" : "white",
                  boxShadow: answers[q.id] === opt ? "0 0 0 1px var(--color-teal)" : "none",
                }}
              >
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  className="w-4 h-4 text-[var(--color-teal)]"
                  checked={answers[q.id] === opt}
                  onChange={() => handleSelectOption(q.id, opt)}
                />
                <span className="font-bold w-5 text-gray-700">{opt}.</span>
                <span className="text-gray-900">{q[`option_${opt.toLowerCase()}`]}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between mt-8 pt-4 border-t" style={{ borderColor: "var(--color-line)" }}>
            <button
              className="btn btn-outline text-sm"
              disabled={current === 0}
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            >
              ← Previous
            </button>
            <div className="flex items-center gap-2">
              {current < questions.length - 1 ? (
                <button
                  className="btn btn-primary text-sm"
                  onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                >
                  Next Question →
                </button>
              ) : (
                <button
                  className="btn btn-primary text-sm"
                  disabled={submitting}
                  onClick={doSubmit}
                >
                  {submitting ? "Submitting…" : "Submit Final Exam"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question Palette Sidebar */}
        <div className="doc-card p-4 h-fit">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-700">Question Palette</span>
            <span className="text-xs font-mono font-semibold" style={{ color: "var(--color-teal)" }}>
              {answeredCount}/{questions.length} Answered
            </span>
          </div>

          {Object.entries(bySubject).map(([subject, indices]) => (
            <div key={subject} className="mb-4">
              <p className="text-xs font-bold uppercase text-gray-500 mb-1.5">{SUBJECT_LABEL[subject]}</p>
              <div className="grid grid-cols-5 gap-1.5">
                {indices.map((idx) => {
                  const question = questions[idx];
                  const isAnswered = Boolean(answers[question.id]);
                  const isCurrent = idx === current;
                  return (
                    <button
                      key={question.id}
                      onClick={() => setCurrent(idx)}
                      className="text-xs h-8 rounded border font-semibold transition-colors"
                      style={{
                        borderColor: isCurrent ? "var(--color-navy)" : "var(--color-line)",
                        background: isAnswered ? "var(--color-green-light)" : "white",
                        color: isAnswered ? "var(--color-green)" : "var(--color-ink)",
                        borderWidth: isCurrent ? "2px" : "1px",
                      }}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            onClick={doSubmit}
            disabled={submitting}
            className="btn btn-danger w-full text-sm mt-3"
          >
            {submitting ? "Submitting…" : "Submit & Finish Exam"}
          </button>
        </div>
      </div>
    </div>
  );
}
