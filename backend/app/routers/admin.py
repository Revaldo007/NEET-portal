import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats", response_model=schemas.AdminStats)
def stats(admin: models.User = Depends(auth.require_admin), db: Session = Depends(get_db)):
    students = db.query(models.User).filter(models.User.role == models.UserRole.student).count()
    applications = db.query(models.Application).filter(models.Application.status != models.ApplicationStatus.draft).count()
    pending = db.query(models.Application).filter(models.Application.status == models.ApplicationStatus.submitted).count()
    approved = db.query(models.Application).filter(models.Application.status == models.ApplicationStatus.approved).count()
    questions = db.query(models.Question).count()
    exams_completed = db.query(models.Exam).filter(models.Exam.status == models.ExamStatus.submitted).count()
    return schemas.AdminStats(
        students=students,
        applications=applications,
        pending_applications=pending,
        approved_applications=approved,
        questions=questions,
        exams_completed=exams_completed,
    )


# ---------- Students ----------

@router.get("/students", response_model=list[schemas.UserOut])
def list_students(search: str = "", admin: models.User = Depends(auth.require_admin), db: Session = Depends(get_db)):
    query = db.query(models.User).filter(models.User.role == models.UserRole.student)
    if search:
        like = f"%{search}%"
        query = query.filter((models.User.name.ilike(like)) | (models.User.email.ilike(like)))
    return query.order_by(models.User.id.desc()).all()


@router.get("/students/{student_id}", response_model=schemas.ApplicationAdminOut)
def student_detail(student_id: int, admin: models.User = Depends(auth.require_admin), db: Session = Depends(get_db)):
    application = db.query(models.Application).filter(models.Application.student_id == student_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Student not found")
    return application


@router.delete("/students/{student_id}")
def delete_student(student_id: int, admin: models.User = Depends(auth.require_admin), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == student_id, models.User.role == models.UserRole.student).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(user)
    db.commit()
    return {"detail": "Student deleted"}


# ---------- Applications ----------

@router.get("/applications", response_model=list[schemas.ApplicationAdminOut])
def list_applications(
    status: str = "",
    schedule_id: int = 0,
    admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(models.Application).filter(models.Application.status != models.ApplicationStatus.draft)
    if status:
        query = query.filter(models.Application.status == status)
    if schedule_id:
        query = query.filter(models.Application.exam_schedule_id == schedule_id)
    return query.order_by(models.Application.id.desc()).all()


@router.get("/applications/{application_id}", response_model=schemas.ApplicationAdminOut)
def get_application_detail(application_id: int, admin: models.User = Depends(auth.require_admin), db: Session = Depends(get_db)):
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


@router.post("/applications/{application_id}/decision", response_model=schemas.ApplicationAdminOut)
def decide_application(
    application_id: int,
    payload: schemas.ApplicationDecision,
    admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if payload.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    application.status = models.ApplicationStatus(payload.status)
    if payload.document_status:
        application.document_status = models.DocumentStatus(payload.document_status)
    elif payload.status == "approved":
        application.document_status = models.DocumentStatus.verified

    # Admin custom roll number or auto-generated
    if payload.roll_number and payload.roll_number.strip():
        application.roll_number = payload.roll_number.strip()
    elif payload.status == "approved" and not application.roll_number:
        year_suffix = "26"
        if application.exam_cycle and application.exam_cycle.year:
            year_suffix = application.exam_cycle.year[-2:]
        application.roll_number = f"NEET{year_suffix}{application.id:04d}"

    application.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(application)
    return application


@router.put("/applications/{application_id}/roll-number", response_model=schemas.ApplicationAdminOut)
def update_application_roll_number(
    application_id: int,
    payload: schemas.RollNumberUpdate,
    admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    """Allow admin to set or update any candidate's roll number."""
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    roll = payload.roll_number.strip()
    if not roll:
        raise HTTPException(status_code=400, detail="Roll number cannot be empty")

    application.roll_number = roll
    application.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(application)
    return application


# ---------- Exam Schedules (Cycles) ----------

@router.get("/exam-schedules", response_model=list[schemas.ExamScheduleOut])
def list_exam_schedules(
    admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    """List all exam cycles ordered newest first."""
    return db.query(models.ExamSchedule).order_by(models.ExamSchedule.id.desc()).all()


@router.post("/exam-schedules", response_model=schemas.ExamScheduleOut)
def create_exam_schedule(
    payload: schemas.ExamScheduleCreate,
    admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    """Create a new exam cycle. Does NOT auto-activate it."""
    data = payload.model_dump()
    if not data.get("year"):
        # Derive year from exam_date if not provided
        data["year"] = data.get("exam_date", "")[:4] or "2026"
    schedule = models.ExamSchedule(**data, is_active=False)
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.get("/exam-schedule", response_model=schemas.ExamScheduleOut)
def get_active_exam_schedule(
    admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    """Return the currently active schedule."""
    schedule = db.query(models.ExamSchedule).filter(
        models.ExamSchedule.is_active == True
    ).first() or db.query(models.ExamSchedule).order_by(models.ExamSchedule.id.desc()).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="No exam schedule configured")
    return schedule


@router.put("/exam-schedules/{schedule_id}", response_model=schemas.ExamScheduleOut)
def update_exam_schedule(
    schedule_id: int,
    payload: schemas.ExamScheduleUpdate,
    admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    """Update fields of any exam cycle."""
    schedule = db.query(models.ExamSchedule).filter(models.ExamSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Exam schedule not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(schedule, field, value)

    schedule.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(schedule)
    return schedule


@router.put("/exam-schedule", response_model=schemas.ExamScheduleOut)
def update_active_exam_schedule(
    payload: schemas.ExamScheduleUpdate,
    admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    """Update the currently active exam schedule (legacy single-schedule endpoint)."""
    schedule = db.query(models.ExamSchedule).filter(
        models.ExamSchedule.is_active == True
    ).first() or db.query(models.ExamSchedule).first()
    if not schedule:
        schedule = models.ExamSchedule()
        db.add(schedule)

    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(schedule, field, value)

    schedule.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(schedule)
    return schedule


@router.post("/exam-schedules/{schedule_id}/activate", response_model=schemas.ExamScheduleOut)
def activate_exam_schedule(
    schedule_id: int,
    admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    """Set a schedule as the active cycle; deactivates all others."""
    schedule = db.query(models.ExamSchedule).filter(models.ExamSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Exam schedule not found")

    # Deactivate all
    db.query(models.ExamSchedule).update({models.ExamSchedule.is_active: False})
    # Activate the selected one
    schedule.is_active = True
    schedule.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(schedule)
    return schedule


@router.delete("/exam-schedules/{schedule_id}")
def delete_exam_schedule(
    schedule_id: int,
    admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    """Delete an exam cycle (only if it has no applications)."""
    schedule = db.query(models.ExamSchedule).filter(models.ExamSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Exam schedule not found")
    app_count = db.query(models.Application).filter(
        models.Application.exam_schedule_id == schedule_id
    ).count()
    if app_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete: {app_count} applications are linked to this cycle",
        )
    db.delete(schedule)
    db.commit()
    return {"detail": "Exam schedule deleted"}


# ---------- Exam Centres ----------

@router.get("/exam-centres", response_model=list[schemas.ExamCentreOut])
def list_exam_centres(admin: models.User = Depends(auth.require_admin), db: Session = Depends(get_db)):
    return db.query(models.ExamCentre).all()


@router.post("/exam-centres", response_model=schemas.ExamCentreOut)
def create_exam_centre(payload: schemas.ExamCentreCreate, admin: models.User = Depends(auth.require_admin), db: Session = Depends(get_db)):
    centre = models.ExamCentre(**payload.model_dump())
    db.add(centre)
    db.commit()
    db.refresh(centre)
    return centre


@router.put("/exam-centres/{centre_id}", response_model=schemas.ExamCentreOut)
def update_exam_centre(centre_id: int, payload: schemas.ExamCentreCreate, admin: models.User = Depends(auth.require_admin), db: Session = Depends(get_db)):
    centre = db.query(models.ExamCentre).filter(models.ExamCentre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Exam centre not found")
    for field, value in payload.model_dump().items():
        setattr(centre, field, value)
    db.commit()
    db.refresh(centre)
    return centre


@router.delete("/exam-centres/{centre_id}")
def delete_exam_centre(centre_id: int, admin: models.User = Depends(auth.require_admin), db: Session = Depends(get_db)):
    centre = db.query(models.ExamCentre).filter(models.ExamCentre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Exam centre not found")
    try:
        # Unlink applications referencing this centre before deleting
        db.query(models.Application).filter(models.Application.exam_centre_id == centre_id).update({models.Application.exam_centre_id: None})
        db.delete(centre)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not delete exam centre: {str(e)}")
    return {"detail": "Exam centre deleted"}


# ---------- Questions ----------

@router.get("/questions", response_model=list[schemas.QuestionOut])
def list_questions(subject: str = "", admin: models.User = Depends(auth.require_admin), db: Session = Depends(get_db)):
    query = db.query(models.Question)
    if subject:
        query = query.filter(models.Question.subject == subject)
    return query.order_by(models.Question.id.desc()).all()


@router.post("/questions", response_model=schemas.QuestionOut)
def create_question(payload: schemas.QuestionCreate, admin: models.User = Depends(auth.require_admin), db: Session = Depends(get_db)):
    question = models.Question(**payload.model_dump())
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.put("/questions/{question_id}", response_model=schemas.QuestionOut)
def update_question(question_id: int, payload: schemas.QuestionCreate, admin: models.User = Depends(auth.require_admin), db: Session = Depends(get_db)):
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    for field, value in payload.model_dump().items():
        setattr(question, field, value)
    db.commit()
    db.refresh(question)
    return question


@router.delete("/questions/{question_id}")
def delete_question(question_id: int, admin: models.User = Depends(auth.require_admin), db: Session = Depends(get_db)):
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    try:
        # Clean up any student answers referencing this question first
        db.query(models.StudentAnswer).filter(models.StudentAnswer.question_id == question_id).delete(synchronize_session=False)
        db.delete(question)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not delete question: {str(e)}")
    return {"detail": "Question deleted"}

