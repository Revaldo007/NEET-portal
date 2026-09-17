import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum,
    UniqueConstraint
)
from sqlalchemy.orm import relationship

from app.database import Base


class UserRole(str, enum.Enum):
    student = "student"
    admin = "admin"


class ApplicationStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    approved = "approved"
    rejected = "rejected"


class DocumentStatus(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class PaymentStatus(str, enum.Enum):
    unpaid = "unpaid"
    paid = "paid"


class ExamStatus(str, enum.Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    submitted = "submitted"


class Subject(str, enum.Enum):
    physics = "physics"
    chemistry = "chemistry"
    biology = "biology"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.student, nullable=False)
    date_of_birth = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # One student can have many applications (one per exam cycle)
    applications = relationship("Application", back_populates="student", cascade="all, delete-orphan")


class ExamCentre(Base):
    __tablename__ = "exam_centres"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    address = Column(String(300), nullable=True)
    city = Column(String(100), nullable=False)
    capacity = Column(Integer, default=100)

    applications = relationship("Application", back_populates="exam_centre")


class Application(Base):
    __tablename__ = "applications"
    # Composite unique: one application per student per exam cycle
    __table_args__ = (
        UniqueConstraint("student_id", "exam_schedule_id", name="uq_student_cycle"),
    )

    id = Column(Integer, primary_key=True, index=True)
    application_code = Column(String(30), unique=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    exam_schedule_id = Column(Integer, ForeignKey("exam_schedules.id"), nullable=True)

    # Personal details
    full_name = Column(String(120))
    date_of_birth = Column(String(20))
    gender = Column(String(20))
    category = Column(String(20))
    nationality = Column(String(50), default="Indian")

    # Contact details
    phone = Column(String(20))
    email = Column(String(120))
    address = Column(String(300))
    city = Column(String(100))
    state = Column(String(100))
    pincode = Column(String(10))

    # Academic details
    marks_10th = Column(Float)
    marks_12th = Column(Float)
    school_name = Column(String(200))
    year_of_passing = Column(String(10))

    exam_centre_id = Column(Integer, ForeignKey("exam_centres.id"), nullable=True)
    roll_number = Column(String(30), nullable=True)

    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.draft)
    document_status = Column(Enum(DocumentStatus), default=DocumentStatus.pending)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.unpaid)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("User", back_populates="applications")
    exam_cycle = relationship("ExamSchedule", back_populates="applications")
    exam_centre = relationship("ExamCentre", back_populates="applications")
    documents = relationship("Document", back_populates="application", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="application", uselist=False, cascade="all, delete-orphan")
    exam = relationship("Exam", back_populates="application", uselist=False, cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    doc_type = Column(String(30))  # photograph, signature, id_proof
    file_path = Column(String(300))
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    application = relationship("Application", back_populates="documents")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), unique=True)
    amount = Column(Float, default=1700.0)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.unpaid)
    transaction_id = Column(String(50), nullable=True)
    paid_at = Column(DateTime, nullable=True)

    application = relationship("Application", back_populates="payment")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(Enum(Subject), nullable=False)
    question_text = Column(Text, nullable=False)
    option_a = Column(String(300))
    option_b = Column(String(300))
    option_c = Column(String(300))
    option_d = Column(String(300))
    correct_answer = Column(String(1))  # A/B/C/D
    marks = Column(Integer, default=4)

    answers = relationship("StudentAnswer", back_populates="question", cascade="all, delete-orphan")


class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), unique=True)
    status = Column(Enum(ExamStatus), default=ExamStatus.not_started)
    duration_minutes = Column(Integer, default=180)
    started_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)

    application = relationship("Application", back_populates="exam")
    answers = relationship("StudentAnswer", back_populates="exam", cascade="all, delete-orphan")
    result = relationship("Result", back_populates="exam", uselist=False, cascade="all, delete-orphan")


class StudentAnswer(Base):
    __tablename__ = "student_answers"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"))
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"))
    selected_option = Column(String(1), nullable=True)  # A/B/C/D or null if unanswered

    exam = relationship("Exam", back_populates="answers")
    question = relationship("Question", back_populates="answers")


class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), unique=True)

    physics_score = Column(Integer, default=0)
    chemistry_score = Column(Integer, default=0)
    biology_score = Column(Integer, default=0)
    total_score = Column(Integer, default=0)
    max_score = Column(Integer, default=120)

    correct_count = Column(Integer, default=0)
    wrong_count = Column(Integer, default=0)
    unanswered_count = Column(Integer, default=0)

    passed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    exam = relationship("Exam", back_populates="result")


class ExamSchedule(Base):
    __tablename__ = "exam_schedules"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), default="NEET (UG) 2026 Online Examination")
    year = Column(String(10), default="2026")
    exam_date = Column(String(50), default="2026-06-15")
    start_time = Column(String(50), default="10:00")
    duration_minutes = Column(Integer, default=180)
    instructions = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # All applications for this cycle
    applications = relationship("Application", back_populates="exam_cycle")
