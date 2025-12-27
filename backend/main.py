import asyncio
import email
import io
import json
import logging
import os
import sqlite3
import time
from calendar import c
from cmath import e
from datetime import datetime
from mimetypes import inited
from os.path import curdir, pardir
from sys import intern
from typing import List, Optional

import asyncpg
import pandas as pd
from dotenv import load_dotenv
from fastapi import (
    Body,
    FastAPI,
    File,
    HTTPException,
    Query,
    Request,
    UploadFile,
    logger,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
from tomllib import load

load_dotenv()

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


pool: Optional[asyncpg.Pool] = None


@app.on_event("startup")
async def startup():
    global pool
    pool = await asyncpg.create_pool(
        dsn=os.getenv("DB_URL"),
    )
    if pool is None:
        logger.error("Failed to create connection pool.")
        return
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS students (
            id SERIAL PRIMARY KEY,
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

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS placements (
                id SERIAL PRIMARY KEY,
                student_id INTEGER REFERENCES students(id) on DELETE CASCADE,
                company TEXT NOT NULL,
                role TEXT,
                package INTEGER,
                description TEXT,
                placed_date TIMESTAMP DEFAULT NOW()
            )
        """)


init_db()


@app.on_event("shutdown")
async def shutdown():
    await pool.close()


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


class Placement(BaseModel):
    student_id: int
    company: str
    role: str
    package: int


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
async def get_students(
    search: Optional[str] = None,
    min_cgpa: Optional[float] = None,
    limit: int = Query(10, le=100),
    cursor: int = 0,
    skill: Optional[str] = None,
):
    query = f"SELECT * FROM students WHERE id > {cursor}"
    params = []
    param_count = 1

    if search:
        query += f"AND name ILIKE ${param_count}"
        params.append(f"%{search}%")
        param_count += 1

    if min_cgpa:
        query += f"AND cgpa >= {param_count}"
        params.append(f"%{min_cgpa}%")
        param_count += 1

    if skill:
        query += f"AND skills LIKE ${param_count}"
        params.append(f"%{skill}%")
        param_count += 1

    query += f"  ORDER BY id LIMIT {limit} "
    print(query)
    print(query)
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    return [dict(row) for row in rows]


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
async def update_student(student_id: int, data: Student = Body(...)):
    async with pool.acquire as conn: 

        # check if student exists
        student = await conn.fetchrow(
            "SELECT * FROM STUDENTS WHERE id=$1", student_id
        )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # update student data
    await conn.execute(
        "UPDATE STUDENTS SET name=$1, cgpa=$2, email=$3, phone=$4, skills=$5, internships=$6, projects=$7 WHERE id=$8",
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

    return 


@app.delete("/students/{student_id}")
async def delete_student(student_id: int):
    async with pool.accuire() as conn:

        # check if student exists
        student = await conn.fetchrow(
            ("SELECT * FROM STUDENTS WHERE id=$1", student_id)
        )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # delete student
    await conn.execute("DELETE FROM STUDENTS WHERE id=$1", student_id)

    return


#Placement endpoints

@app.get("/placements")
async def get_placements(
    limit: int = Query(10, le=100),
    cursor: int = 0
):
    query = "SELECT * FROM PLACEMENTS WHERE id > $1 ORDER BY id LIMIT $2" 
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, cursor, limit)
    #converts to dictionaries
    return [dict(row) for row in rows]

@app.post("/placements")
async def add_placements(data: Placement = Body(...)):
    query = "INSERT INTO placements (student_id, company, role, package) VALUES ($1, $2, $3, $4) RETURNING id"
    async with pool.acquire() as conn:
        placement_id = await conn.fetchval(
            query,
            data.student_id,
            data.company,
            data.role,
            data.package
        )
    return {"message": "Placement created", "id": placement_id}

@app.put("/placements/{placement_id}")
async def update_placement(placement_id: int, data: Placement = Body(...)):
    async with pool.acquire() as conn:

        exists = await conn.fetchval(
            "SELECT id FROM PLACEMENTS WHERE id=$1", placement_id
        )
        if not exists:
            raise HTTPException(status_code=404, detail="Placement not found")
        
        #Update
        await conn.execute(
            "UPDATE PLACEMENTS SET student_id=$1, company=$2, role=$3, package=$4 WHERE id=$5",
            
                data.student_id,
                data.company,
                data.role,
                data.package,
                placement_id,
            
        )
    return {"message": "Placement updated"}

@app.delete("/placements/{placement_id}")
async def delete_placement(placement_id: int):
    async with pool.acquire() as conn:
        exist = await conn.fetchval("SELECT id FROM PLACEMENTS WHERE id=$1", placement_id)
        if not exist:
            raise HTTPException(status_code=404, detail="Placement not found")
        
        #Delete
        await conn.execute("DELETE FROM PLACEMENTS WHERE id=$1", placement_id)

    return {"status": "deleted"}

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

    query = """
            INSERT INTO students
                (name, email, phone, cgpa, skills, internships, projects, placed, created)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
                students.name        IS DISTINCT FROM excluded.name OR
                students.phone       IS DISTINCT FROM  excluded.phone OR
                students.cgpa        IS DISTINCT FROM  excluded.cgpa OR
                students.skills      IS DISTINCT FROM  excluded.skills OR
                students.internships IS DISTINCT FROM  excluded.internships OR
                students.projects    IS DISTINCT FROM  excluded.projects OR
                students.placed      IS DISTINCT FROM  excluded.placed
        """

    async with pool.acquire() as conn:
        await conn.executemany(query, params)

    await pool.close()

    return json.dumps({"message": "Students updated successfully"})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
