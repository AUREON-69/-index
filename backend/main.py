import json
import sqlite3
from datetime import datetime
from typing import List, Optional

from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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


# API
@app.get("/")
def root():
    return {"status": "live", "version": "0.1"}


@app.get("/hi")
def hi():
    return {"message": "Hello, World!"}


@app.get("/students")
def get_students(search: Optional[str] = None, min_cgpa: Optional[float] = None):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row

    query = "SELECT * FROM students"
    if search:
        query += f" WHERE name LIKE '%{search}%'"
    if min_cgpa:
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
    print(projects_json)
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
        "UPDATE STUDENTS SET name=?, email=?, skills=?, internships=?, projects=? WHERE id=?",
        (
            data.name,
            data.email,
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
