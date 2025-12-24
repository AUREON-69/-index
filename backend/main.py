import email
import io
import json
import logging
import sqlite3
import time
from calendar import c
from cmath import e
from datetime import datetime
from os.path import curdir, pardir
from sys import intern
from typing import List, Optional

import pandas as pd
from fastapi import Body, FastAPI, File, HTTPException, Request, UploadFile, logger
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB = "students.db"


def init_db():
    conn = sqlite3.connect(DB)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY,
                   name TEXT,
                   email TEXT UNIQUE,
                   phone TEXT,
                   cgpa REAL,
                   skills TEXT,
                   internships TEXT,
                   projects TEXT,
                   placed TEXT,
                   created TEXT
        )
    """)
    conn.commit()
    conn.close()


init_db()


## a custom logging fucntion to keep things organized or if we wanted to write custom logs


class Project(BaseModel):
    title: str
    link: str
    description: str


class Student(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    cgpa: Optional[float] = None
    skills: Optional[List[str]] = []
    internships: Optional[List[str]] = []
    placed: Optional[bool] = None
    projects: Optional[List[Project]] = []
    resume: Optional[str] = None


##reponse time logger
@app.middleware("http")
async def response_time_logger(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    # Color code by speed
    if duration > 1.0:
        logger.warning(f"🐌 SLOW {request.method} {request.url.path}: {duration:.3f}s")
    elif duration > 0.5:
        logger.info(f"⚠️  {request.method} {request.url.path}: {duration:.3f}s")
    else:
        logger.info(f"⚡ {request.method} {request.url.path}: {duration:.3f}s")

    return response


# API
@app.get("/")
def root():
    return {"status": "live", "version": "0.1"}


@app.get("/students")
def get_students(search: Optional[str] = None, min_cgpa: Optional[float] = None):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row

    query = "SELECT * FROM students"
    if search:
        query += f" WHERE name LIKE '%{search}%'"
    if min_cgpa:
        query += f" WHERE cgpa >= {min_cgpa}"
    if search and min_cgpa:
        query += f" AND cgpa >= {min_cgpa}"

    rows = conn.execute(query).fetchall()
    conn.close()

    students = []
    for row in rows:
        s = dict(row)
        s["skills"] = json.loads(s["skills"] or "[]")
        s["internships"] = json.loads(s["internships"] or "[]")
        s["projects"] = json.loads(s["projects"] or "[]")
        students.append(s)
    return students


@app.get("/students/{student_id}")
def get_student_by_id(student_id: int):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM STUDENTS WHERE id=?", (student_id,)).fetchone()

    if row:
        student = dict(row)
        student["skills"] = json.loads(student["skills"] or "[]")
        student["internships"] = json.loads(student["internships"] or "[]")
        student["projects"] = json.loads(student["projects"] or "[]")
        return student
    else:
        raise HTTPException(status_code=404, detail="Student not found")


@app.post("/students")
def add_student(data: Student = Body(...)):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    ## get the student data
    # check if student already exists by email
    cursor.execute("SELECT * FROM STUDENTS WHERE email=?", (data.email,))
    does_exist = cursor.fetchone()
    if does_exist:
        raise HTTPException(
            status_code=400, detail="Student with this email already exists"
        )

    # converting projects to json since pythons inbuilt json module cant srealize python objects
    projects_json = json.dumps([p.dict() for p in (data.projects or [])])
    # if student doesnt exist lets add them to our db
    cursor.execute(
        "INSERT INTO STUDENTS (name, email, skills, internships, projects) VALUES (?, ?, ?, ?, ?)",
        (
            data.name,
            data.email,
            json.dumps(data.skills),
            json.dumps(data.internships),
            projects_json,
        ),
    )

    conn.commit()
    cursor.close()
    conn.close()
    return


@app.put("/students/{student_id}")
def update_student(student_id: int, data: Student = Body(...)):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # check if student exists
    cursor.execute("SELECT * FROM STUDENTS WHERE id=?", (student_id,))
    student = cursor.fetchone()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # update student data
    cursor.execute(
        "UPDATE STUDENTS SET name=?, cgpa=?, email=?, phone=?, skills=?, internships=?, projects=? WHERE id=?",
        (
            data.name,
            data.cgpa,
            data.email,
            data.phone,
            json.dumps(data.skills),
            json.dumps(data.internships),
            json.dumps([p.dict() for p in (data.projects or [])]),
            student_id,
        ),
    )

    conn.commit()
    cursor.close()
    conn.close()
    return


@app.delete("/students/{student_id}")
def delete_student(student_id: int):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # check if student exists
    cursor.execute("SELECT * FROM STUDENTS WHERE id=?", (student_id,))
    student = cursor.fetchone()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # delete student
    cursor.execute("DELETE FROM STUDENTS WHERE id=?", (student_id,))

    conn.commit()
    cursor.close()
    conn.close()
    return


def parse_row(row: pd.Series) -> dict:
    name = str(row.get("name", "")).strip()
    pemail = str(row.get("email", "")).strip()
    phone = str(row.get("phone", "")).strip() if pd.notna(row.get("phone")) else None
    skills = str(row.get("skills", "")).strip()
    internships = str(row.get("internships", "")).strip()
    parsed_projects = str(row.get("projects", "")).strip()
    resume = str(row.get("resume", "")).strip()

    if not name:
        raise ValueError("Missing name")

    if not pemail or "@" not in pemail:
        print("❌ BAD EMAIL ROW:", row.to_dict() if hasattr(row, "to_dict") else row)
        raise ValueError("Invalid email")

    cgpa_valid: Optional[float] = None
    cgpa_raw = row.get("cgpa")
    if pd.notna(cgpa_raw) and cgpa_raw != "":
        try:
            cgpa_valid = float(cgpa_raw)
        except ValueError:
            raise ValueError("Invalid CGPA")

    placed_raw = row.get("placed")
    placed: Optional[bool] = None
    if pd.notna(placed_raw) and placed_raw != "":
        val = str(placed_raw).strip().lower()
        if val in ("true", "1", "yes"):
            placed = True
        elif val in ("false", "0", "no"):
            placed = False
        else:
            raise ValueError("Invalid placed value")

    project_list = parsed_projects.split(",")
    skill_list = skills.split(",")
    internship_list = internships.split(",")

    if len(project_list) <= 1:
        project_list = []

    return {
        "name": name,
        "email": pemail,
        "cgpa": cgpa_valid,
        "phone": phone,
        "skills": skill_list,
        "internships": internship_list,
        # project parsing fromm csv is hard not for us but for teachers who are inputting it so lets ditch it and let studetns update it
        "projects": [],
        "placed": placed,
        "resume": resume,
    }


def row_to_student(row: pd.Series) -> Student:
    raw = parse_row(row)
    return Student(**raw)


##upload the csv and stuff only for admin users currently
@app.post("/admin/upload")
async def bulk_upload_csv(file: UploadFile = File(...)):
    # Implement bulk upload logic here
    REQUIRED_COLUMNS = [
        "name",
        "cgpa",
        "email",
        "phone",
        "skills",
        "internships",
        "projects",
    ]
    OPTIONAL_COLUMNS = ["linkedin", "github", "resume"]

    content = file.file.read()
    try:
        decoded = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file format")

    # parse csv
    try:
        df = pd.read_csv(io.StringIO(decoded))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing CSV: {str(e)}")

    # TOOD:
    # parse the csv iterate over all the columuns and store take it into a list
    # validate
    # bulk save to db and use WHERE clause for conflict updates so we dont write the same data to db again and again
    #
    # validated = []
    # for idx, row in df.iterrows():
    #     try:
    #         cleaned = parse_row(row)
    #         validated.append(cleaned)
    #     except ValueError as e:
    #         raise HTTPException(
    #             status_code=400, detail=f"Invalid row at index {idx}: {str(e)}"
    #         )

    validated_students_list: list[Student] = []
    errors: list[dict] = []
    for idx, row in df.iterrows():
        try:
            cleaned = row_to_student(row)

            validated_students_list.append(cleaned)
        except (ValidationError, ValueError) as e:
            print(f"❌ INVALID ROW {idx}: {e} | email={row.get('email')!r}")
            errors.append({"row": int(idx), "errors": e})

    params: list[tuple] = []
    for s in validated_students_list:
        skills_json = json.dumps(s.skills or [])
        internships_json = json.dumps(s.internships or [])
        projects_json = json.dumps(s.projects or [])
        placed_text = None if s.placed is None else ("true" if s.placed else "false")

        params.append(
            (
                s.name,
                s.email,
                s.phone,
                s.cgpa,
                skills_json,
                internships_json,
                projects_json,
                placed_text,
                datetime.utcnow().isoformat(),
            )
        )

    sql = """
            INSERT INTO students
                (name, email, phone, cgpa, skills, internships, projects, placed, created)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
                name        = excluded.name,
                phone       = excluded.phone,
                cgpa        = excluded.cgpa,
                skills      = excluded.skills,
                internships = excluded.internships,
                projects    = excluded.projects,
                placed      = excluded.placed,
                created     = excluded.created
            -- only actually update if something changed
            WHERE
                students.name        IS NOT excluded.name OR
                students.phone       IS NOT excluded.phone OR
                students.cgpa        IS NOT excluded.cgpa OR
                students.skills      IS NOT excluded.skills OR
                students.internships IS NOT excluded.internships OR
                students.projects    IS NOT excluded.projects OR
                students.placed      IS NOT excluded.placed
        """

    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.executemany(sql, params)
    conn.commit()
    conn.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
