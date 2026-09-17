"""
One-time database migration to support multiple exam cycles per student.

Run automatically at startup via main.py → run_migrations().
Safe to run multiple times (idempotent).
"""
import logging
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def run_migrations(engine) -> None:
    """Apply schema changes for multi-cycle support."""
    with engine.connect() as conn:
        # 1. Add exam_schedule_id column to applications (if missing)
        try:
            conn.execute(text(
                "ALTER TABLE applications ADD COLUMN exam_schedule_id INTEGER "
                "REFERENCES exam_schedules(id)"
            ))
            conn.commit()
            logger.info("Migration: added exam_schedule_id column to applications")
        except Exception:
            conn.rollback()
            logger.info("Migration: exam_schedule_id column already exists — skipping")

        # 2. Add year column to exam_schedules (if missing)
        try:
            conn.execute(text(
                "ALTER TABLE exam_schedules ADD COLUMN year VARCHAR(10) DEFAULT '2026'"
            ))
            conn.commit()
            logger.info("Migration: added year column to exam_schedules")
        except Exception:
            conn.rollback()
            logger.info("Migration: year column already exists — skipping")

        # 3. Link existing applications (exam_schedule_id IS NULL) → schedule id=1
        try:
            result = conn.execute(text("SELECT id FROM exam_schedules ORDER BY id LIMIT 1"))
            row = result.fetchone()
            if row:
                schedule_id = row[0]
                conn.execute(text(
                    f"UPDATE applications SET exam_schedule_id = {schedule_id} "
                    f"WHERE exam_schedule_id IS NULL"
                ))
                conn.commit()
                logger.info(f"Migration: linked existing applications to schedule id={schedule_id}")
        except Exception as e:
            conn.rollback()
            logger.warning(f"Migration: could not link existing applications: {e}")

        # 4. Drop old unique constraint on student_id (if it still exists)
        # PostgreSQL: find and drop the constraint by introspection
        try:
            result = conn.execute(text("""
                SELECT constraint_name
                FROM information_schema.table_constraints
                WHERE table_name='applications'
                  AND constraint_type='UNIQUE'
                  AND constraint_name NOT IN ('uq_student_cycle', 'applications_application_code_key')
                  AND constraint_name LIKE '%student_id%'
            """))
            rows = result.fetchall()
            for (cname,) in rows:
                conn.execute(text(f"ALTER TABLE applications DROP CONSTRAINT IF EXISTS \"{cname}\""))
                conn.commit()
                logger.info(f"Migration: dropped old unique constraint '{cname}' on student_id")
        except Exception as e:
            conn.rollback()
            logger.warning(f"Migration: could not drop old unique constraint: {e}")

        # 5. Add composite unique constraint (student_id, exam_schedule_id) if missing
        try:
            conn.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.table_constraints
                        WHERE table_name='applications'
                          AND constraint_name='uq_student_cycle'
                    ) THEN
                        ALTER TABLE applications
                        ADD CONSTRAINT uq_student_cycle
                        UNIQUE (student_id, exam_schedule_id);
                    END IF;
                END$$;
            """))
            conn.commit()
            logger.info("Migration: composite unique constraint uq_student_cycle ensured")
        except Exception as e:
            conn.rollback()
            logger.warning(f"Migration: composite unique constraint may already exist: {e}")

        # 6. Ensure student_answers.question_id has ON DELETE CASCADE
        try:
            conn.execute(text("""
                ALTER TABLE student_answers
                DROP CONSTRAINT IF EXISTS student_answers_question_id_fkey;
                ALTER TABLE student_answers
                ADD CONSTRAINT student_answers_question_id_fkey
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;
            """))
            conn.commit()
            logger.info("Migration: student_answers foreign key updated to ON DELETE CASCADE")
        except Exception as e:
            conn.rollback()
            logger.warning(f"Migration: could not update student_answers FK cascade: {e}")

