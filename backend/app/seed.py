from sqlalchemy.orm import Session

from app import models, auth
from app.config import settings

SAMPLE_CENTRES = [
    {"name": "ABC College", "address": "MG Road", "city": "Thiruvananthapuram", "capacity": 500},
    {"name": "Government Science College", "address": "Race Course Road", "city": "Coimbatore", "capacity": 350},
    {"name": "St. Xavier's Higher Secondary", "address": "Anna Salai", "city": "Chennai", "capacity": 400},
]

PHYSICS_QUESTIONS = [
    ("The SI unit of electric current is", "Volt", "Ampere", "Ohm", "Watt", "B"),
    ("Which law states that force equals mass times acceleration?", "Newton's First Law", "Newton's Second Law", "Newton's Third Law", "Law of Gravitation", "B"),
    ("The speed of light in vacuum is approximately", "3 x 10^5 m/s", "3 x 10^6 m/s", "3 x 10^8 m/s", "3 x 10^10 m/s", "C"),
    ("Which quantity is measured in joules?", "Power", "Force", "Energy", "Momentum", "C"),
    ("The phenomenon of bending of light around obstacles is called", "Reflection", "Refraction", "Diffraction", "Dispersion", "C"),
    ("The unit of resistance is", "Ampere", "Volt", "Ohm", "Farad", "C"),
    ("Acceleration due to gravity on Earth is approximately", "8.8 m/s^2", "9.8 m/s^2", "10.8 m/s^2", "11.8 m/s^2", "B"),
    ("Which device converts mechanical energy into electrical energy?", "Motor", "Generator", "Transformer", "Battery", "B"),
    ("The working principle of a transformer is based on", "Self induction", "Mutual induction", "Electrostatics", "Thermionic emission", "B"),
    ("The escape velocity of Earth is approximately", "7.9 km/s", "9.8 km/s", "11.2 km/s", "15.0 km/s", "C"),
]

CHEMISTRY_QUESTIONS = [
    ("The atomic number of Carbon is", "6", "8", "12", "14", "A"),
    ("Which gas is released during photosynthesis?", "Carbon dioxide", "Oxygen", "Nitrogen", "Hydrogen", "B"),
    ("The pH of a neutral solution at 25°C is", "0", "7", "10", "14", "B"),
    ("Which of the following is a noble gas?", "Chlorine", "Nitrogen", "Argon", "Sulfur", "C"),
    ("The chemical formula of table salt is", "NaCl", "KCl", "CaCl2", "NaOH", "A"),
    ("Which particle has a negative charge?", "Proton", "Neutron", "Electron", "Positron", "C"),
    ("The process of converting a liquid into vapor is called", "Condensation", "Evaporation", "Sublimation", "Fusion", "B"),
    ("Which element is essential for the formation of hemoglobin?", "Calcium", "Iron", "Zinc", "Magnesium", "B"),
    ("The bond formed by sharing of electrons is called", "Ionic bond", "Covalent bond", "Metallic bond", "Hydrogen bond", "B"),
    ("Which of the following is an alkali metal?", "Magnesium", "Sodium", "Aluminium", "Calcium", "B"),
]

BIOLOGY_QUESTIONS = [
    ("What is the powerhouse of the cell?", "Nucleus", "Ribosome", "Mitochondria", "Golgi body", "C"),
    ("Which blood cells help in clotting?", "Red blood cells", "White blood cells", "Platelets", "Plasma cells", "C"),
    ("Photosynthesis mainly occurs in which part of a plant?", "Root", "Stem", "Leaf", "Flower", "C"),
    ("The basic structural and functional unit of life is the", "Tissue", "Cell", "Organ", "Organelle", "B"),
    ("Which organ in the human body produces insulin?", "Liver", "Pancreas", "Kidney", "Spleen", "B"),
    ("DNA stands for", "Deoxyribonucleic acid", "Diribonucleic acid", "Deoxyribose nuclear acid", "Dinucleic acid", "A"),
    ("Which part of the brain controls balance and coordination?", "Cerebrum", "Cerebellum", "Medulla", "Hypothalamus", "B"),
    ("The process by which plants lose water vapor is called", "Respiration", "Transpiration", "Photosynthesis", "Osmosis", "B"),
    ("Human beings have how many pairs of chromosomes?", "21", "22", "23", "24", "C"),
    ("Which vitamin is produced when skin is exposed to sunlight?", "Vitamin A", "Vitamin C", "Vitamin D", "Vitamin K", "C"),
]


def _seed_questions(db: Session, subject: models.Subject, rows):
    for text, a, b, c, d, correct in rows:
        exists = db.query(models.Question).filter(
            models.Question.subject == subject, models.Question.question_text == text
        ).first()
        if exists:
            continue
        db.add(models.Question(
            subject=subject, question_text=text,
            option_a=a, option_b=b, option_c=c, option_d=d,
            correct_answer=correct, marks=4,
        ))


def run_seed(db: Session):
    # Default admin account
    admin = db.query(models.User).filter(models.User.email == settings.admin_email).first()
    if not admin:
        admin = models.User(
            name="Portal Administrator",
            email=settings.admin_email,
            phone="9999999999",
            password_hash=auth.hash_password(settings.admin_password),
            role=models.UserRole.admin,
        )
        db.add(admin)

    # Sample exam centres
    if db.query(models.ExamCentre).count() == 0:
        for centre in SAMPLE_CENTRES:
            db.add(models.ExamCentre(**centre))

    # Sample question bank
    _seed_questions(db, models.Subject.physics, PHYSICS_QUESTIONS)
    _seed_questions(db, models.Subject.chemistry, CHEMISTRY_QUESTIONS)
    _seed_questions(db, models.Subject.biology, BIOLOGY_QUESTIONS)

    # Default Exam Schedule
    if db.query(models.ExamSchedule).count() == 0:
        db.add(models.ExamSchedule(
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
        ))

    db.commit()

