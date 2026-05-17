"""
SQLite-backed API + static file server for patient-doctor-portal.

Run (from this directory):
  pip install -r requirements-api.txt
  python server.py

Open http://127.0.0.1:8000
"""
from __future__ import annotations

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
import sys

sys.path.insert(0, str(BASE_DIR))

import json
import secrets
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field
from werkzeug.security import check_password_hash, generate_password_hash

from summary_backend import build_patient_summary

DB_PATH = BASE_DIR / "data" / "portal.sqlite3"

app = FastAPI(title="Portal API (demo)")
security = HTTPBearer(auto_error=False)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def slug_email(email: str) -> str:
    return (email or "").strip().lower()


@contextmanager
def get_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('patient', 'doctor')),
                display_name TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS doctor_patient_links (
                doctor_user_id INTEGER NOT NULL,
                patient_user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (doctor_user_id, patient_user_id),
                FOREIGN KEY (doctor_user_id) REFERENCES users(id),
                FOREIGN KEY (patient_user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS submissions (
                id TEXT PRIMARY KEY,
                patient_user_id INTEGER NOT NULL,
                submitted_at TEXT NOT NULL,
                answers_json TEXT NOT NULL,
                summary_model_json TEXT NOT NULL,
                summary_plain TEXT NOT NULL,
                FOREIGN KEY (patient_user_id) REFERENCES users(id)
            );
            """
        )


class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4, max_length=128)
    display_name: str = Field(min_length=1, max_length=120)
    role: str = Field(pattern="^(patient|doctor)$")


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class AnswersBody(BaseModel):
    answers: dict[str, str]


class LinkBody(BaseModel):
    patient_email: EmailStr


def row_user(r: sqlite3.Row) -> dict:
    return {
        "id": r["id"],
        "email": r["email"],
        "role": r["role"],
        "display_name": r["display_name"],
    }


def get_token(creds: HTTPAuthorizationCredentials | None = Depends(security)) -> str:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return creds.credentials


def get_current_user(token: str = Depends(get_token)) -> sqlite3.Row:
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT u.* FROM users u
            JOIN sessions s ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > ?
            """,
            (token, utcnow().isoformat()),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return row


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "db": str(DB_PATH)}


@app.post("/api/register")
def register(body: RegisterBody) -> JSONResponse:
    email = slug_email(str(body.email))
    pw_hash = generate_password_hash(body.password)
    created = utcnow().isoformat()
    try:
        with get_db() as conn:
            cur = conn.execute(
                """
                INSERT INTO users (email, password_hash, role, display_name, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (email, pw_hash, body.role, body.display_name.strip(), created),
            )
            uid = cur.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Email already registered")
    return JSONResponse({"ok": True, "user_id": uid}, status_code=201)


@app.post("/api/login")
def login(body: LoginBody) -> dict:
    email = slug_email(str(body.email))
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if row is None or not check_password_hash(row["password_hash"], body.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = secrets.token_urlsafe(32)
    expires = (utcnow() + timedelta(days=7)).isoformat()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
            (token, row["id"], expires),
        )
    return {"token": token, "user": row_user(row)}


@app.post("/api/logout")
def logout(token: str = Depends(get_token)) -> dict:
    with get_db() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
    return {"ok": True}


@app.get("/api/me")
def me(user: sqlite3.Row = Depends(get_current_user)) -> dict:
    return {"user": row_user(user)}


@app.post("/api/submissions")
def create_submission(body: AnswersBody, user: sqlite3.Row = Depends(get_current_user)) -> dict:
    if user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Only patients can submit check-ins")
    sm = build_patient_summary(body.answers)
    sid = str(uuid.uuid4())
    submitted = utcnow().isoformat()
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO submissions (id, patient_user_id, submitted_at, answers_json, summary_model_json, summary_plain)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                sid,
                user["id"],
                submitted,
                json.dumps(body.answers, ensure_ascii=False),
                json.dumps(sm, ensure_ascii=False),
                sm["plainText"],
            ),
        )
    return {
        "id": sid,
        "submittedAt": submitted,
        "answers": body.answers,
        "summaryModel": sm,
        "summary": sm["plainText"],
    }


@app.get("/api/submissions/mine")
def list_mine(user: sqlite3.Row = Depends(get_current_user)) -> list[dict]:
    if user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Patients only")
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT id, submitted_at, answers_json, summary_model_json, summary_plain
            FROM submissions WHERE patient_user_id = ? ORDER BY submitted_at DESC
            """,
            (user["id"],),
        ).fetchall()
    return [_submission_from_row(r) for r in rows]


@app.post("/api/links")
def link_patient(body: LinkBody, user: sqlite3.Row = Depends(get_current_user)) -> dict:
    if user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can link patients")
    p_email = slug_email(str(body.patient_email))
    with get_db() as conn:
        prow = conn.execute(
            "SELECT id, role FROM users WHERE email = ?", (p_email,)
        ).fetchone()
        if prow is None:
            raise HTTPException(status_code=404, detail="Patient email not found")
        if prow["role"] != "patient":
            raise HTTPException(status_code=400, detail="Target user is not a patient account")
        conn.execute(
            """
            INSERT OR IGNORE INTO doctor_patient_links (doctor_user_id, patient_user_id, created_at)
            VALUES (?, ?, ?)
            """,
            (user["id"], prow["id"], utcnow().isoformat()),
        )
    return {"ok": True, "patient_email": p_email, "patient_user_id": prow["id"]}


@app.get("/api/doctor/patients")
def doctor_patients(user: sqlite3.Row = Depends(get_current_user)) -> list[dict]:
    if user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Doctors only")
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT u.id AS patient_id, u.email AS patient_email
            FROM doctor_patient_links l
            JOIN users u ON u.id = l.patient_user_id
            WHERE l.doctor_user_id = ?
            ORDER BY u.email
            """,
            (user["id"],),
        ).fetchall()
    return [{"patient_id": r["patient_id"], "patient_email": r["patient_email"]} for r in rows]


@app.get("/api/doctor/patients/{patient_email}/submissions")
def doctor_patient_submissions(patient_email: str, user: sqlite3.Row = Depends(get_current_user)) -> list[dict]:
    if user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Doctors only")
    email = slug_email(patient_email)
    with get_db() as conn:
        link = conn.execute(
            """
            SELECT l.patient_user_id FROM doctor_patient_links l
            JOIN users u ON u.id = l.patient_user_id
            WHERE l.doctor_user_id = ? AND u.email = ?
            """,
            (user["id"], email),
        ).fetchone()
        if link is None:
            raise HTTPException(status_code=404, detail="Patient not linked")
        pid = link["patient_user_id"]
        rows = conn.execute(
            """
            SELECT id, submitted_at, answers_json, summary_model_json, summary_plain
            FROM submissions WHERE patient_user_id = ? ORDER BY submitted_at DESC
            """,
            (pid,),
        ).fetchall()
    return [_submission_from_row(r) for r in rows]


def _submission_from_row(r: sqlite3.Row) -> dict:
    answers = json.loads(r["answers_json"])
    summary_model = json.loads(r["summary_model_json"])
    return {
        "id": r["id"],
        "submittedAt": r["submitted_at"],
        "answers": answers,
        "summaryModel": summary_model,
        "summary": r["summary_plain"],
    }


app.mount("/", StaticFiles(directory=str(BASE_DIR), html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=False)
