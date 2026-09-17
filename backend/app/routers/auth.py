from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.Token)
def register(payload: schemas.StudentRegister, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user = models.User(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        password_hash=auth.hash_password(payload.password),
        role=models.UserRole.student,
        date_of_birth=payload.date_of_birth,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Link to the active exam cycle
    schedule = db.query(models.ExamSchedule).filter(models.ExamSchedule.is_active == True).first()
    if not schedule:
        schedule = db.query(models.ExamSchedule).order_by(models.ExamSchedule.id.desc()).first()

    # Create an empty application shell for the student right away
    application = models.Application(
        student_id=user.id,
        exam_schedule_id=schedule.id if schedule else None,
        full_name=user.name,
        email=user.email,
        phone=user.phone,
        date_of_birth=user.date_of_birth,
    )
    db.add(application)
    db.commit()

    token = auth.create_access_token({"sub": str(user.id), "role": user.role.value})
    return schemas.Token(access_token=token, role=user.role.value, name=user.name)


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    token = auth.create_access_token({"sub": str(user.id), "role": user.role.value})
    return schemas.Token(access_token=token, role=user.role.value, name=user.name)


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(auth.get_current_user)):
    return user
