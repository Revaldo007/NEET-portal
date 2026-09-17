<!-- # NEET Examination Portal

A full-stack mini project implementing a NEET application + mock exam system.

**Stack:** FastAPI (Python) · PostgreSQL · SQLAlchemy · React (Vite) · Tailwind CSS

---

## Features

**Student**
- Register / log in (JWT auth)
- Fill and save a multi-section NEET application (personal, contact, academic, exam centre)
- Upload photograph, signature, and ID proof
- Dummy payment flow (₹1,700 application fee)
- Submit the application (locked after submission)
- View application / document / payment status on a dashboard
- View and print an admit card once the admin approves the application
- Take a 30-question timed NEET mock exam (Physics / Chemistry / Biology), with
  auto-submit when the timer runs out
- Automatic evaluation (+4 correct, −1 wrong, 0 unanswered) and a result breakdown

**Admin**
- Dashboard with live counts (students, applications, pending/approved, questions, exams)
- View, search, and delete students
- Review submitted applications, view uploaded documents, and approve/reject
  (approval assigns a roll number and unlocks the admit card + mock exam for that student)
- Manage exam centres (add/edit/delete)
- Manage the question bank per subject (add/edit/delete)

A default admin account and a starter question bank (10 questions per subject) and three
sample exam centres are seeded automatically the first time the backend starts.

---

## Project structure

```
neet-portal/
├── backend/           FastAPI app
│   ├── app/
│   │   ├── main.py        entrypoint
│   │   ├── models.py       SQLAlchemy models
│   │   ├── schemas.py      Pydantic schemas
│   │   ├── auth.py         JWT + password hashing
│   │   ├── seed.py         default admin / centres / questions
│   │   └── routers/        auth, application, exam, admin
│   ├── requirements.txt
│   └── .env.example
└── frontend/           React + Vite + Tailwind app
    ├── src/
    │   ├── pages/           student pages
    │   ├── pages/admin/     admin pages
    │   ├── components/
    │   ├── context/         auth context
    │   └── api/              axios client
    └── .env.example
```

---

## 1. Database setup (PostgreSQL)

Create a database and a user for the app (run in `psql` or any Postgres client):

```sql
CREATE DATABASE neet_portal;
CREATE USER neet_user WITH PASSWORD 'neet_pass';
GRANT ALL PRIVILEGES ON DATABASE neet_portal TO neet_user;
```

(Feel free to use different names — just update `DATABASE_URL` in the backend `.env` to match.)

## 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env if your Postgres credentials/db name differ from the defaults

uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`. Tables are created automatically on first run,
and a default admin account, sample exam centres, and a starter question bank are seeded.

Default admin login (change `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` before first run
if you want different credentials):

```
Email:    admin@neetportal.com
Password: Admin@123
```

Interactive API docs: `http://localhost:8000/docs`

## 3. Frontend setup

```bash
cd frontend
npm install

cp .env.example .env
# defaults to http://localhost:8000 — update VITE_API_URL if your backend runs elsewhere

npm run dev
```

The app runs at `http://localhost:5173`.

## 4. Try it out

1. Open `http://localhost:5173/register` and create a student account.
2. Fill in the application form, upload the three documents, and pay the dummy fee.
3. Submit the application.
4. Log in as the admin (credentials above) at `/login`, open **Applications**, review the
   student's submission, and click **Approve**.
5. Log back in as the student — the admit card and mock exam are now unlocked.
6. Take the mock exam; it auto-evaluates and shows the result immediately after submission.

---

## Notes for a mini-project demo

- Payments are simulated — no real payment gateway is integrated (`POST /api/payment/pay`
  just marks the application as paid).
- The mock exam randomly selects up to 10 questions per subject from the question bank
  each time a student starts the exam, so add more questions via the admin **Questions**
  page for more variety.
- Uploaded documents are stored on disk under `backend/app/uploads/` and served at
  `/uploads/<filename>`. For production use, swap this for cloud storage (S3, etc.).
- `SECRET_KEY` in the backend `.env` should be replaced with a long random value before
  any real deployment. -->




  this is the right one so <------
