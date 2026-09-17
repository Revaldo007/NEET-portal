import os
import shutil
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api", tags=["application"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _get_active_schedule(db: Session) -> models.ExamSchedule:
    """Return the currently active exam cycle, or the latest one."""
    schedule = db.query(models.ExamSchedule).filter(
        models.ExamSchedule.is_active == True
    ).first()
    if not schedule:
        schedule = db.query(models.ExamSchedule).order_by(
            models.ExamSchedule.id.desc()
        ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="No exam cycle configured. Contact admin.")
    return schedule


def _get_or_create_active_application(
    db: Session, user: models.User
) -> tuple[models.Application, models.ExamSchedule]:
    """
    Return the student's application for the active exam cycle.
    Auto-creates a new draft if the student has not yet applied for this cycle.
    """
    schedule = _get_active_schedule(db)

    application = db.query(models.Application).filter(
        models.Application.student_id == user.id,
        models.Application.exam_schedule_id == schedule.id,
    ).first()

    if not application:
        # Auto-create a new draft for this cycle (pre-fill with user profile data)
        application = models.Application(
            student_id=user.id,
            exam_schedule_id=schedule.id,
            full_name=user.name,
            email=user.email,
            phone=user.phone,
            date_of_birth=user.date_of_birth,
        )
        db.add(application)
        db.commit()
        db.refresh(application)

    return application, schedule


def _require_active_application(db: Session, user: models.User) -> models.Application:
    """Return active cycle application — raise 404 if not found."""
    schedule = _get_active_schedule(db)
    application = db.query(models.Application).filter(
        models.Application.student_id == user.id,
        models.Application.exam_schedule_id == schedule.id,
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found for current exam cycle")
    return application


# ──────────────────────────────────────────────
# Student endpoints
# ──────────────────────────────────────────────

@router.get("/dashboard")
def student_dashboard(
    user: models.User = Depends(auth.require_student),
    db: Session = Depends(get_db),
):
    schedule = _get_active_schedule(db)
    application = db.query(models.Application).filter(
        models.Application.student_id == user.id,
        models.Application.exam_schedule_id == schedule.id,
    ).first()

    # Count all applications across cycles
    total_applications = db.query(models.Application).filter(
        models.Application.student_id == user.id
    ).count()

    # Check if there is a result for this student across any cycle (for result card link)
    has_any_result = (
        db.query(models.Result)
        .join(models.Exam, models.Result.exam_id == models.Exam.id)
        .join(models.Application, models.Exam.application_id == models.Application.id)
        .filter(models.Application.student_id == user.id)
        .first()
        is not None
    )

    # admit_card_available is TRUE only when the student's ACTIVE CYCLE application is approved.
    # Cross-cycle approved apps do NOT grant exam access for the current cycle.
    active_cycle_approved = (
        application is not None
        and application.status == models.ApplicationStatus.approved
    )

    if not application:
        return {
            "student_name": user.name,
            "active_cycle_title": schedule.title,
            "active_cycle_year": schedule.year,
            "application_status": "not_started",
            "document_status": "pending",
            "payment_status": "unpaid",
            "admit_card_available": False,  # No active-cycle app → no exam access
            "exam_status": "not_started",
            "result_available": has_any_result,
            "total_applications": total_applications,
        }

    exam = db.query(models.Exam).filter(
        models.Exam.application_id == application.id
    ).first()
    result_available = bool((exam and exam.result) or has_any_result)

    return {
        "student_name": user.name,
        "active_cycle_title": schedule.title,
        "active_cycle_year": schedule.year,
        "application_status": application.status.value,
        "document_status": application.document_status.value,
        "payment_status": application.payment_status.value,
        # Only grant exam portal access when the ACTIVE CYCLE application is approved
        "admit_card_available": active_cycle_approved,
        # Exam status reflects ONLY the active-cycle exam session
        "exam_status": exam.status.value if exam else "not_started",
        "result_available": result_available,
        "total_applications": total_applications,
    }


@router.get("/application", response_model=schemas.ApplicationOut)
def get_application(
    user: models.User = Depends(auth.require_student),
    db: Session = Depends(get_db),
):
    application, _ = _get_or_create_active_application(db, user)
    return application


@router.put("/application", response_model=schemas.ApplicationOut)
def update_application(
    payload: schemas.ApplicationUpdate,
    user: models.User = Depends(auth.require_student),
    db: Session = Depends(get_db),
):
    application = _require_active_application(db, user)
    if application.status in (
        models.ApplicationStatus.submitted,
        models.ApplicationStatus.approved,
    ):
        raise HTTPException(
            status_code=400,
            detail="Application already submitted and cannot be edited",
        )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(application, field, value)
    application.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(application)
    return application


@router.post("/application/submit", response_model=schemas.ApplicationOut)
def submit_application(
    user: models.User = Depends(auth.require_student),
    db: Session = Depends(get_db),
):
    application = _require_active_application(db, user)

    required_fields = [
        application.full_name, application.date_of_birth, application.gender,
        application.phone, application.email, application.city, application.state,
    ]
    if any(f in (None, "") for f in required_fields):
        raise HTTPException(
            status_code=400,
            detail="Please complete all required fields before submitting",
        )

    if application.payment_status != models.PaymentStatus.paid:
        raise HTTPException(
            status_code=400,
            detail="Please complete payment before submitting the application",
        )

    if len(application.documents) < 3:
        raise HTTPException(
            status_code=400,
            detail="Please upload photograph, signature and ID proof before submitting",
        )

    application.status = models.ApplicationStatus.submitted
    application.application_code = f"NEET{datetime.utcnow().year}{application.id:04d}"
    db.commit()
    db.refresh(application)
    return application


@router.get("/applications/history", response_model=list[schemas.ApplicationHistoryItem])
def get_application_history(
    user: models.User = Depends(auth.require_student),
    db: Session = Depends(get_db),
):
    """Return all of this student's applications across every exam cycle."""
    applications = (
        db.query(models.Application)
        .filter(models.Application.student_id == user.id)
        .order_by(models.Application.id.desc())
        .all()
    )
    result = []
    for app in applications:
        schedule = app.exam_cycle
        result.append(schemas.ApplicationHistoryItem(
            id=app.id,
            application_code=app.application_code,
            exam_schedule_id=app.exam_schedule_id,
            cycle_title=schedule.title if schedule else None,
            cycle_year=schedule.year if schedule else None,
            cycle_exam_date=schedule.exam_date if schedule else None,
            roll_number=app.roll_number,
            status=app.status.value,
            payment_status=app.payment_status.value,
            created_at=app.created_at,
        ))
    return result


@router.get("/exam-centres", response_model=list[schemas.ExamCentreOut])
def list_exam_centres(db: Session = Depends(get_db)):
    return db.query(models.ExamCentre).all()


@router.post("/documents/upload", response_model=schemas.DocumentOut)
def upload_document(
    doc_type: str,
    file: UploadFile = File(...),
    user: models.User = Depends(auth.require_student),
    db: Session = Depends(get_db),
):
    if doc_type not in ("photograph", "signature", "id_proof"):
        raise HTTPException(status_code=400, detail="Invalid document type")

    application = _require_active_application(db, user)

    ext = os.path.splitext(file.filename)[1]
    stored_name = f"{application.id}_{doc_type}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, stored_name)
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Replace existing document of the same type, if any
    existing = next((d for d in application.documents if d.doc_type == doc_type), None)
    if existing:
        db.delete(existing)
        db.flush()

    document = models.Document(
        application_id=application.id,
        doc_type=doc_type,
        file_path=stored_name,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.post("/payment/pay", response_model=schemas.PaymentOut)
def pay_application_fee(
    user: models.User = Depends(auth.require_student),
    db: Session = Depends(get_db),
):
    """Dummy payment flow — no real payment gateway integration."""
    application = _require_active_application(db, user)
    payment = db.query(models.Payment).filter(
        models.Payment.application_id == application.id
    ).first()
    if not payment:
        payment = models.Payment(application_id=application.id)
        db.add(payment)

    payment.status = models.PaymentStatus.paid
    payment.transaction_id = f"TXN{uuid.uuid4().hex[:10].upper()}"
    payment.paid_at = datetime.utcnow()
    application.payment_status = models.PaymentStatus.paid
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/admit-card", response_model=schemas.AdmitCardOut)
def get_admit_card(
    schedule_id: int = 0,
    user: models.User = Depends(auth.require_student),
    db: Session = Depends(get_db),
):
    application = None
    schedule = None

    if schedule_id:
        application = db.query(models.Application).filter(
            models.Application.student_id == user.id,
            models.Application.exam_schedule_id == schedule_id,
        ).first()
        schedule = db.query(models.ExamSchedule).filter(models.ExamSchedule.id == schedule_id).first()
    else:
        # First try active cycle application
        active_sched = _get_active_schedule(db)
        app_in_active = db.query(models.Application).filter(
            models.Application.student_id == user.id,
            models.Application.exam_schedule_id == active_sched.id,
        ).first()

        if app_in_active and app_in_active.status == models.ApplicationStatus.approved:
            application = app_in_active
            schedule = active_sched
        else:
            # Fallback to the student's latest approved application from any cycle
            approved_app = (
                db.query(models.Application)
                .filter(
                    models.Application.student_id == user.id,
                    models.Application.status == models.ApplicationStatus.approved,
                )
                .order_by(models.Application.id.desc())
                .first()
            )
            if approved_app:
                application = approved_app
                schedule = approved_app.exam_cycle
            else:
                application = app_in_active
                schedule = active_sched

    if not application or application.status != models.ApplicationStatus.approved:
        raise HTTPException(
            status_code=400,
            detail="Admit card is not available yet — waiting for admin approval",
        )

    if not schedule:
        schedule = _get_active_schedule(db)

    # Determine if this admit card is for the currently active exam cycle
    active_sched_for_check = _get_active_schedule(db)
    is_active_cycle = (schedule.id == active_sched_for_check.id) if (schedule and active_sched_for_check) else False

    id_proof_doc = next((d for d in application.documents if d.doc_type == "id_proof"), None)
    photo_doc = next((d for d in application.documents if d.doc_type == "photograph"), None)
    # Prefer ID proof as candidate requested, falling back to photograph
    admit_photo = id_proof_doc.file_path if id_proof_doc else (photo_doc.file_path if photo_doc else None)

    return schemas.AdmitCardOut(
        name=application.full_name or user.name,
        roll_number=application.roll_number,
        application_code=application.application_code,
        cycle_title=schedule.title if schedule else "NEET Examination",
        exam_date=schedule.exam_date if schedule else "2026-06-15",
        start_time=schedule.start_time if schedule else "10:00",
        duration_minutes=schedule.duration_minutes if schedule else 180,
        reporting_time=f"{schedule.start_time if schedule else '10:00'} (Login window opens 15 mins prior)",
        exam_mode="Online Examination (Remote CBT)",
        instructions=schedule.instructions if schedule else None,
        photo_url=admit_photo,
        id_proof_url=id_proof_doc.file_path if id_proof_doc else None,
        is_active_cycle=is_active_cycle,
    )

