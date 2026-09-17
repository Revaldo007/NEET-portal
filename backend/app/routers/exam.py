import random
import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/exam", tags=["exam"])

QUESTIONS_PER_SUBJECT = 10
MARKS_CORRECT = 4
MARKS_WRONG = -1


def _get_active_schedule(db: Session) -> models.ExamSchedule:
    """Return the currently active exam cycle, or the latest one."""
    schedule = (
        db.query(models.ExamSchedule)
        .filter(models.ExamSchedule.is_active == True)
        .first()
    )
    if not schedule:
        schedule = (
            db.query(models.ExamSchedule)
            .order_by(models.ExamSchedule.id.desc())
            .first()
        )
    if not schedule:
        # Fallback: create default schedule
        schedule = models.ExamSchedule(
            title="NEET (UG) 2026 Online Examination",
            year="2026",
            exam_date="2026-06-15",
            start_time="10:00",
            duration_minutes=180,
            instructions=(
                "1. Ensure a high-speed, stable internet connection.\n"
                "2. Keep your web camera and microphone active throughout the examination.\n"
                "3. Do not switch tabs, minimize the browser, or open unauthorized applications.\n"
                "4. All responses are saved automatically in real-time.\n"
                "5. The exam will automatically submit once the time expires."
            ),
            is_active=True,
        )
        db.add(schedule)
        db.commit()
        db.refresh(schedule)
    return schedule


def _get_application(db: Session, user: models.User, allow_any_approved: bool = False) -> models.Application:
    """Get the student's approved application for the currently active exam cycle only.

    A student may only participate in the exam they have an approved application for
    in the current active cycle. Cross-cycle access is intentionally NOT allowed —
    e.g. a student approved for NEET 2027 cannot enter the NEET 2026 exam.
    """
    schedule = _get_active_schedule(db)
    active_app = db.query(models.Application).filter(
        models.Application.student_id == user.id,
        models.Application.exam_schedule_id == schedule.id,
    ).first()

    # 1. If active cycle application is approved, allow access
    if active_app and active_app.status == models.ApplicationStatus.approved:
        return active_app

    # 2. If there is an application for the active cycle that isn't approved yet, tell them
    if active_app:
        raise HTTPException(
            status_code=403,
            detail=f"Your application for the current exam cycle has status '{active_app.status.value}'. "
                   f"It must be approved before you can access the examination.",
        )

    # 3. Check if student has an approved application in a DIFFERENT (non-active) cycle
    other_approved = (
        db.query(models.Application)
        .filter(
            models.Application.student_id == user.id,
            models.Application.status == models.ApplicationStatus.approved,
            models.Application.exam_schedule_id != schedule.id,
        )
        .order_by(models.Application.id.desc())
        .first()
    )
    if other_approved:
        other_schedule = other_approved.exam_cycle
        cycle_label = other_schedule.year if other_schedule else "another cycle"
        raise HTTPException(
            status_code=403,
            detail=(
                f"You are approved for NEET {cycle_label}, not the current exam cycle ({schedule.year}). "
                f"You cannot enter the {schedule.year} examination with a {cycle_label} admit card."
            ),
        )

    # 4. Check if student has any application at all
    any_app = (
        db.query(models.Application)
        .filter(models.Application.student_id == user.id)
        .order_by(models.Application.id.desc())
        .first()
    )
    if any_app:
        raise HTTPException(
            status_code=403,
            detail=f"Your application status is '{any_app.status.value}'. It must be approved before you can access the examination.",
        )

    raise HTTPException(
        status_code=404,
        detail="Application not found for the examination. Please register and submit an application first.",
    )




def _calculate_remaining_seconds(exam: models.Exam) -> int:
    if exam.status == models.ExamStatus.submitted:
        return 0
    if exam.status == models.ExamStatus.not_started or not exam.started_at:
        return exam.duration_minutes * 60
    started = exam.started_at
    if started.tzinfo is not None:
        now = datetime.now(started.tzinfo)
    else:
        now = datetime.utcnow()
    elapsed = (now - started).total_seconds()
    return max(0, int(exam.duration_minutes * 60 - elapsed))


def _build_exam_out(exam: models.Exam) -> schemas.ExamOut:
    return schemas.ExamOut(
        id=exam.id,
        status=exam.status.value if hasattr(exam.status, "value") else str(exam.status),
        duration_minutes=exam.duration_minutes,
        started_at=exam.started_at,
        submitted_at=exam.submitted_at,
        remaining_seconds=_calculate_remaining_seconds(exam),
    )


@router.get("/schedule", response_model=schemas.ExamScheduleOut)
def get_exam_schedule(db: Session = Depends(get_db)):
    return _get_active_schedule(db)


@router.get("/status", response_model=schemas.ExamOut)
def get_exam_status(user: models.User = Depends(auth.require_student), db: Session = Depends(get_db)):
    application = _get_application(db, user)
    exam = db.query(models.Exam).filter(models.Exam.application_id == application.id).first()
    if not exam:
        schedule = _get_active_schedule(db)
        duration = schedule.duration_minutes or 180
        return schemas.ExamOut(
            id=0,
            status="not_started",
            duration_minutes=duration,
            started_at=None,
            submitted_at=None,
            remaining_seconds=duration * 60,
        )
    return _build_exam_out(exam)


@router.post("/start", response_model=schemas.ExamOut)
def start_exam(user: models.User = Depends(auth.require_student), db: Session = Depends(get_db)):
    application = _get_application(db, user)
    exam = db.query(models.Exam).filter(models.Exam.application_id == application.id).first()

    if exam and exam.status == models.ExamStatus.submitted:
        raise HTTPException(status_code=400, detail="You have already completed the examination")

    # Enforce scheduled start time: candidate can only enter after countdown reaches zero
    if not exam or exam.status == models.ExamStatus.not_started:
        schedule = _get_active_schedule(db) or application.exam_cycle
        if schedule and schedule.exam_date and schedule.start_time:
            try:
                time_str = schedule.start_time.strip()
                match = re.match(r"^(\d{1,2}):(\d{2})", time_str)
                if match:
                    hh = int(match.group(1))
                    mm = int(match.group(2))
                    if "pm" in time_str.lower() and hh < 12:
                        hh += 12
                    if "am" in time_str.lower() and hh == 12:
                        hh = 0
                    date_parts = [int(p) for p in schedule.exam_date.split("-")]
                    scheduled_dt = datetime(date_parts[0], date_parts[1], date_parts[2], hh, mm)
                    if datetime.now() < scheduled_dt:
                        diff = scheduled_dt - datetime.now()
                        days = diff.days
                        hours = diff.seconds // 3600
                        mins = (diff.seconds % 3600) // 60
                        time_left = f"{days}d {hours}h {mins}m" if days > 0 else f"{hours}h {mins}m"
                        raise HTTPException(
                            status_code=400,
                            detail=f"The examination gate is locked. Countdown is active ({time_left} remaining). You can only enter once the countdown reaches zero.",
                        )
            except HTTPException:
                raise
            except Exception:
                pass

    if not exam:
        schedule = _get_active_schedule(db)
        exam = models.Exam(application_id=application.id, duration_minutes=schedule.duration_minutes or 180)
        db.add(exam)
        db.flush()

    if exam.status == models.ExamStatus.not_started:
        exam.status = models.ExamStatus.in_progress
        exam.started_at = datetime.utcnow()

        # Randomly pick up to QUESTIONS_PER_SUBJECT questions per subject
        for subject in (models.Subject.physics, models.Subject.chemistry, models.Subject.biology):
            pool = db.query(models.Question).filter(models.Question.subject == subject).all()
            chosen = random.sample(pool, min(QUESTIONS_PER_SUBJECT, len(pool)))
            for q in chosen:
                db.add(models.StudentAnswer(exam_id=exam.id, question_id=q.id, selected_option=None))

    db.commit()
    db.refresh(exam)
    return _build_exam_out(exam)



@router.post("/reset")
def reset_exam(user: models.User = Depends(auth.require_student), db: Session = Depends(get_db)):
    application = _get_application(db, user)
    exam = db.query(models.Exam).filter(models.Exam.application_id == application.id).first()
    if exam:
        db.delete(exam)
        db.commit()
    return {"status": "ok", "detail": "Exam reset successfully"}


@router.post("/answer")
def save_answer(
    payload: schemas.AnswerSubmit,
    user: models.User = Depends(auth.require_student),
    db: Session = Depends(get_db),
):
    application = _get_application(db, user)
    exam = db.query(models.Exam).filter(models.Exam.application_id == application.id).first()
    if not exam or exam.status != models.ExamStatus.in_progress:
        raise HTTPException(status_code=400, detail="Exam is not currently in progress")
    record = db.query(models.StudentAnswer).filter(
        models.StudentAnswer.exam_id == exam.id,
        models.StudentAnswer.question_id == payload.question_id,
    ).first()
    if record:
        record.selected_option = payload.selected_option
        db.commit()
    return {"status": "ok"}


@router.get("/questions", response_model=list[schemas.QuestionForStudent])
def get_exam_questions(user: models.User = Depends(auth.require_student), db: Session = Depends(get_db)):
    application = _get_application(db, user)
    exam = db.query(models.Exam).filter(models.Exam.application_id == application.id).first()
    if not exam:
        raise HTTPException(status_code=400, detail="Exam has not been started yet")

    answers = (
        db.query(models.StudentAnswer)
        .filter(models.StudentAnswer.exam_id == exam.id)
        .order_by(models.StudentAnswer.id.asc())
        .all()
    )

    results = []
    for a in answers:
        q = a.question
        results.append(schemas.QuestionForStudent(
            id=q.id,
            subject=q.subject.value if hasattr(q.subject, "value") else str(q.subject),
            question_text=q.question_text,
            option_a=q.option_a,
            option_b=q.option_b,
            option_c=q.option_c,
            option_d=q.option_d,
            selected_option=a.selected_option,
        ))
    return results


@router.post("/submit", response_model=schemas.ResultOut)
def submit_exam(
    payload: schemas.ExamSubmitRequest,
    user: models.User = Depends(auth.require_student),
    db: Session = Depends(get_db),
):
    application = _get_application(db, user)
    exam = db.query(models.Exam).filter(models.Exam.application_id == application.id).first()
    if not exam or exam.status == models.ExamStatus.not_started:
        raise HTTPException(status_code=400, detail="Exam has not been started yet")
    if exam.status == models.ExamStatus.submitted:
        if exam.result:
            return exam.result
        raise HTTPException(status_code=400, detail="Exam has already been submitted")

    # Record the student's selected answers
    answer_map = {a.question_id: a for a in exam.answers}
    for ans in payload.answers:
        record = answer_map.get(ans.question_id)
        if record:
            record.selected_option = ans.selected_option

    exam.status = models.ExamStatus.submitted
    exam.submitted_at = datetime.utcnow()

    # Auto evaluation: +4 correct, -1 wrong, 0 unanswered
    scores = {"physics": 0, "chemistry": 0, "biology": 0}
    correct = wrong = unanswered = 0

    for record in exam.answers:
        question = record.question
        if not record.selected_option:
            unanswered += 1
            continue
        if record.selected_option.upper() == question.correct_answer.upper():
            correct += 1
            scores[question.subject.value] += question.marks
        else:
            wrong += 1
            scores[question.subject.value] -= 1

    total_score = scores["physics"] + scores["chemistry"] + scores["biology"]
    max_score = len(exam.answers) * MARKS_CORRECT
    passed = max_score > 0 and (total_score / max_score) >= 0.33

    result = models.Result(
        exam_id=exam.id,
        physics_score=scores["physics"],
        chemistry_score=scores["chemistry"],
        biology_score=scores["biology"],
        total_score=total_score,
        max_score=max_score,
        correct_count=correct,
        wrong_count=wrong,
        unanswered_count=unanswered,
        passed=passed,
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


@router.get("/result", response_model=schemas.ResultOut)
def get_result(user: models.User = Depends(auth.require_student), db: Session = Depends(get_db)):
    """Return the student's most recent exam result.

    Result lookup is intentionally cross-cycle: a student can always view their
    result from a previously completed exam even after the active cycle changes.
    """
    # 1. Find the most recent submitted exam that has a result
    exam = (
        db.query(models.Exam)
        .join(models.Application, models.Exam.application_id == models.Application.id)
        .filter(
            models.Application.student_id == user.id,
            models.Exam.status == models.ExamStatus.submitted,
        )
        .order_by(models.Exam.id.desc())
        .first()
    )
    if exam and exam.result:
        return exam.result

    # 2. Fallback: any exam with a result record regardless of status flag
    any_exam = (
        db.query(models.Exam)
        .join(models.Application, models.Exam.application_id == models.Application.id)
        .filter(models.Application.student_id == user.id)
        .order_by(models.Exam.id.desc())
        .first()
    )
    if any_exam and any_exam.result:
        return any_exam.result

    # 3. No result found — student has not completed an exam yet
    raise HTTPException(
        status_code=404,
        detail="Result not available yet. Please complete the online examination first.",
    )
