from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr, ConfigDict


# ---------- Auth ----------

class StudentRegister(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str
    date_of_birth: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    is_active: bool


# ---------- Exam Centre ----------

class ExamCentreCreate(BaseModel):
    name: str
    address: Optional[str] = None
    city: str
    capacity: int = 100


class ExamCentreOut(ExamCentreCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Exam Schedule ----------

class ExamScheduleCreate(BaseModel):
    title: str
    year: Optional[str] = None
    exam_date: str
    start_time: str
    duration_minutes: int = 180
    instructions: Optional[str] = None


class ExamScheduleUpdate(BaseModel):
    title: Optional[str] = None
    year: Optional[str] = None
    exam_date: Optional[str] = None
    start_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    instructions: Optional[str] = None
    is_active: Optional[bool] = None


class ExamScheduleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    year: Optional[str] = None
    exam_date: str
    start_time: str
    duration_minutes: int
    instructions: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------- Application ----------

class ApplicationUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    category: Optional[str] = None
    nationality: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    marks_10th: Optional[float] = None
    marks_12th: Optional[float] = None
    school_name: Optional[str] = None
    year_of_passing: Optional[str] = None


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    doc_type: str
    file_path: str
    uploaded_at: datetime


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    application_code: Optional[str]
    exam_schedule_id: Optional[int] = None
    exam_cycle: Optional[ExamScheduleOut] = None
    full_name: Optional[str]
    date_of_birth: Optional[str]
    gender: Optional[str]
    category: Optional[str]
    nationality: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    pincode: Optional[str]
    marks_10th: Optional[float]
    marks_12th: Optional[float]
    school_name: Optional[str]
    year_of_passing: Optional[str]
    roll_number: Optional[str]
    status: str
    document_status: str
    payment_status: str
    documents: List[DocumentOut] = []
    created_at: Optional[datetime] = None


class ApplicationAdminOut(ApplicationOut):
    student: Optional[UserOut] = None


# ---------- Application History (student sees all their cycles) ----------

class ApplicationHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    application_code: Optional[str]
    exam_schedule_id: Optional[int] = None
    cycle_title: Optional[str] = None
    cycle_year: Optional[str] = None
    cycle_exam_date: Optional[str] = None
    roll_number: Optional[str]
    status: str
    payment_status: str
    created_at: Optional[datetime] = None


# ---------- Payment ----------

class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    amount: float
    status: str
    transaction_id: Optional[str]
    paid_at: Optional[datetime]


# ---------- Questions ----------

class QuestionCreate(BaseModel):
    subject: str
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str
    marks: int = 4


class QuestionOut(QuestionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


class QuestionForStudent(BaseModel):
    """Question shown to a student during the exam — no correct answer leaked."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    subject: str
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    selected_option: Optional[str] = None


# ---------- Exam ----------

class AnswerSubmit(BaseModel):
    question_id: int
    selected_option: Optional[str] = None  # A/B/C/D or None


class ExamSubmitRequest(BaseModel):
    answers: List[AnswerSubmit]


class ExamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str
    duration_minutes: int
    started_at: Optional[datetime]
    submitted_at: Optional[datetime]
    remaining_seconds: Optional[int] = None


class ResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    physics_score: int
    chemistry_score: int
    biology_score: int
    total_score: int
    max_score: int
    correct_count: int
    wrong_count: int
    unanswered_count: int
    passed: bool


# ---------- Admin dashboard ----------

class AdminStats(BaseModel):
    students: int
    applications: int
    pending_applications: int
    approved_applications: int
    questions: int
    exams_completed: int


class ApplicationDecision(BaseModel):
    status: str  # approved / rejected
    document_status: Optional[str] = None
    roll_number: Optional[str] = None


class RollNumberUpdate(BaseModel):
    roll_number: str


# ---------- Admit Card ----------

class AdmitCardOut(BaseModel):
    name: str
    roll_number: Optional[str] = None
    application_code: Optional[str] = None
    cycle_title: Optional[str] = None
    exam_date: str
    start_time: str
    duration_minutes: int
    reporting_time: str
    exam_mode: str = "Online Examination (Remote CBT)"
    instructions: Optional[str] = None
    photo_url: Optional[str] = None
    id_proof_url: Optional[str] = None
    # True only when this admit card belongs to the currently active exam cycle.
    # The frontend uses this to show/hide the "Join Exam" / "Enter Examination" buttons.
    is_active_cycle: bool = False
