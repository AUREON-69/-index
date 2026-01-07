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
from sqlite3.dbapi2 import paramstyle
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
from pydantic import BaseModel, ValidationError, validator
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
        # Check if table exists and migrate if needed
        table_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'students'
            )
        """)

        if not table_exists:
            await conn.execute("""
                       CREATE TABLE students (
                           id SERIAL PRIMARY KEY,
                           name TEXT NOT NULL,
                           email TEXT UNIQUE NOT NULL,
                           phone TEXT,
                           final_cgpa REAL,
                           skills TEXT,
                           internships TEXT,
                           projects TEXT,
                           placed BOOLEAN DEFAULT FALSE,
                           bio TEXT,
                           created TIMESTAMPTZ DEFAULT NOW()
                       )
                   """)
        else:
            # Check if final_cgpa column exists, if not, add it
            final_cgpa_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'students' AND column_name = 'final_cgpa'
                )
            """)

            if not final_cgpa_exists:
                await conn.execute("ALTER TABLE students ADD COLUMN final_cgpa REAL")

            # Check if bio column exists, if not, add it
            bio_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'students' AND column_name = 'bio'
                )
            """)

            if not bio_exists:
                await conn.execute("ALTER TABLE students ADD COLUMN bio TEXT")

        # Create semester_cgpa table if it doesn't exist
        semester_cgpa_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'semester_cgpa'
            )
        """)

        if not semester_cgpa_exists:
            await conn.execute("""
                       CREATE TABLE semester_cgpa (
                           id SERIAL PRIMARY KEY,
                           student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                           semester TEXT NOT NULL,
                           cgpa REAL NOT NULL
                       )
                   """)

        # Create placement_drives table if it doesn't exist
        placement_drives_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'placement_drives'
            )
        """)

        if not placement_drives_exists:
            await conn.execute("""
                    CREATE TABLE placement_drives (
                           id SERIAL PRIMARY KEY,
                           company TEXT NOT NULL,
                           status TEXT CHECK (status IN ('ongoing', 'completed', 'starting_soon')) DEFAULT 'starting_soon',
                           start_date TIMESTAMPTZ,
                           end_date TIMESTAMPTZ,
                           package INTEGER,
                           description TEXT
                       )
                """)

        # Semester CGPA table
        await conn.execute("""
                   CREATE TABLE IF NOT EXISTS semester_cgpa (
                       id SERIAL PRIMARY KEY,
                       student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                       semester TEXT NOT NULL,
                       cgpa REAL NOT NULL,
                       UNIQUE (student_id, semester)
                   )
               """)

        # Placement drives table
        await conn.execute("""
                CREATE TABLE IF NOT EXISTS placement_drives (
                       id SERIAL PRIMARY KEY,
                       company TEXT NOT NULL,
                       status TEXT CHECK (status IN ('ongoing', 'completed', 'starting_soon')) DEFAULT 'starting_soon',
                       start_date TIMESTAMPTZ,
                       end_date TIMESTAMPTZ,
                       package INTEGER,
                       description TEXT
                   )
            """)

        # Create a function to update final_cgpa based on semester CGPAs
        await conn.execute("""
            CREATE OR REPLACE FUNCTION update_student_final_cgpa(student_id_param INTEGER)
            RETURNS VOID AS $$
            DECLARE
                avg_cgpa REAL;
            BEGIN
                SELECT AVG(cgpa) INTO avg_cgpa
                FROM semester_cgpa
                WHERE student_id = student_id_param;

                UPDATE students
                SET final_cgpa = avg_cgpa
                WHERE id = student_id_param;
            END;
            $$ LANGUAGE plpgsql;
        """)


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
    skills: Optional[List[str]] = []
    internships: Optional[List[str]] = []
    placed: Optional[bool] = None
    projects: Optional[List[Project]] = []
    resume: Optional[str] = None
    bio: Optional[str] = None


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
    # Limit limit parameter to prevent abuse
    limit = min(limit, 100)

    query = "SELECT * FROM students WHERE id > $1"
    params = [cursor]

    if search:
        query += " AND name ILIKE $" + str(len(params) + 1)
        params.append(f"%{search}%")
    if min_cgpa is not None:
        query += " AND final_cgpa >= $" + str(len(params) + 1)
        params.append(float(min_cgpa))
    if skill:
        query += " AND skills LIKE $" + str(len(params) + 1)
        params.append(f"%{skill}%")

    query += " ORDER BY id LIMIT $" + str(len(params) + 1)
    params.append(limit)

    # Execute query with connection retry mechanism
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(query, *params)
        except asyncpg.exceptions.InvalidCachedStatementError:
            # Clear the statement cache and retry
            await conn.execute("DEALLOCATE ALL")
            rows = await conn.fetch(query, *params)

    students = []
    for row in rows:
        student = dict(row)
        student["skills"] = json.loads(student["skills"] or "[]")
        student["internships"] = json.loads(student["internships"] or "[]")
        student["projects"] = json.loads(student["projects"] or "[]")
        student["placed"] = student["placed"] == "true"  # Convert to boolean
        students.append(student)

    return students


@app.get("/students/{student_id}")
async def get_student_by_id(student_id: int):
    query = "SELECT * FROM students WHERE id=$1"

    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(query, student_id)
        except asyncpg.exceptions.InvalidCachedStatementError:
            # Clear the statement cache and retry
            await conn.execute("DEALLOCATE ALL")
            row = await conn.fetchrow(query, student_id)

    if row:
        student = dict(row)
        student["skills"] = json.loads(student["skills"] or "[]")
        student["internships"] = json.loads(student["internships"] or "[]")
        student["projects"] = json.loads(student["projects"] or "[]")
        return student
    else:
        raise HTTPException(status_code=404, detail="Student not found")


@app.put("/students/{student_id}")
async def update_student(student_id: int, data: Student = Body(...)):
    async with pool.acquire() as conn:
        try:
            student = await conn.fetchrow(
                "SELECT id FROM students WHERE id=$1",
                student_id,
            )
        except asyncpg.exceptions.InvalidCachedStatementError:
            # Clear the statement cache and retry
            await conn.execute("DEALLOCATE ALL")
            student = await conn.fetchrow(
                "SELECT id FROM students WHERE id=$1",
                student_id,
            )

        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        await conn.execute(
            """
            UPDATE students SET
                name = $1,
                email = $2,
                phone = $3,
                skills = $4,
                internships = $5,
                projects = $6,
                placed = $7,
                bio = $8
            WHERE id = $9
            """,
            data.name,
            data.email,
            data.phone,
            json.dumps(data.skills or []),
            json.dumps(data.internships or []),
            json.dumps([p.dict() for p in (data.projects or [])]),
            data.placed,
            data.bio,
            student_id,
        )

    return {"status": "updated"}


@app.post("/students")
async def add_student(data: Student = Body(...)):
    async with pool.acquire() as conn:
        try:
            # check if student already exists by email
            student = await conn.fetchrow(
                "SELECT * FROM students WHERE email=$1", data.email
            )
        except asyncpg.exceptions.InvalidCachedStatementError:
            # Clear the statement cache and retry
            await conn.execute("DEALLOCATE ALL")
            student = await conn.fetchrow(
                "SELECT * FROM students WHERE email=$1", data.email
            )

        if student:
            raise HTTPException(
                status_code=400, detail="Student with this email already exists"
            )

        # converting projects to json since pythons inbuilt json module cant srealize python objects
        projects_json = json.dumps([p.dict() for p in (data.projects or [])])
        # if student doesnt exist lets add them to our db
        await conn.execute(
            "INSERT INTO students (name, email, phone, skills, internships, projects, bio) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            (
                data.name,
                data.email,
                data.phone,
                json.dumps(data.skills or []),
                json.dumps(data.internships or []),
                projects_json,
                data.bio,
            ),
        )

    return {"status": "created"}


# This endpoint is duplicate, will be removed as there's already a PUT endpoint above
# Keeping only the first one with proper implementation


@app.delete("/students/{student_id}")
async def delete_student(student_id: int):
    async with pool.acquire() as conn:
        try:
            # check if student exists
            student = await conn.fetchrow(
                "SELECT * FROM students WHERE id=$1", student_id
            )
        except asyncpg.exceptions.InvalidCachedStatementError:
            # Clear the statement cache and retry
            await conn.execute("DEALLOCATE ALL")
            student = await conn.fetchrow(
                "SELECT * FROM students WHERE id=$1", student_id
            )

        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        # delete student
        await conn.execute("DELETE FROM students WHERE id=$1", student_id)

    return {"status": "deleted"}


# Placement Drives API
from typing import Union

from pydantic import Field


class PlacementDrive(BaseModel):
    company: str
    status: str  # 'ongoing', 'completed', 'starting_soon'
    start_date: Optional[Union[datetime, str]] = None
    end_date: Optional[Union[datetime, str]] = None
    package: Optional[int] = None
    description: Optional[str] = None

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat() if v else None}

    @validator("start_date", "end_date", pre=True)
    def parse_datetime(cls, v):
        if v is None:
            return None
        if isinstance(v, datetime):
            return v
        if isinstance(v, str):
            try:
                # Try to parse the datetime string
                return datetime.fromisoformat(v.replace("Z", "+00:00"))
            except ValueError:
                try:
                    # Try parsing with common formats
                    return datetime.strptime(v, "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    return datetime.strptime(v, "%Y-%m-%d")
        return v


from pydantic import validator


@app.get("/placements")
async def get_placements(
    status: Optional[str] = None,
    limit: int = Query(10, le=100),
    cursor: int = 0,
):
    # Limit limit parameter to prevent abuse
    limit = min(limit, 100)

    query = "SELECT * FROM placement_drives WHERE id > $1"
    params = [cursor]

    if status:
        query += " AND status = $" + str(len(params) + 1)
        params.append(status)

    query += " ORDER BY id LIMIT $" + str(len(params) + 1)
    params.append(limit)

    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(query, *params)
        except asyncpg.exceptions.InvalidCachedStatementError:
            # Clear the statement cache and retry
            await conn.execute("DEALLOCATE ALL")
            rows = await conn.fetch(query, *params)

    placements = []
    for row in rows:
        placement = dict(row)
        placements.append(placement)

    return placements


@app.get("/placements/{placement_id}")
async def get_placement_by_id(placement_id: int):
    query = "SELECT * FROM placement_drives WHERE id=$1"

    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(query, placement_id)
        except asyncpg.exceptions.InvalidCachedStatementError:
            # Clear the statement cache and retry
            await conn.execute("DEALLOCATE ALL")
            row = await conn.fetchrow(query, placement_id)

    if row:
        return dict(row)
    else:
        raise HTTPException(status_code=404, detail="Placement drive not found")


@app.post("/placements")
async def create_placement(data: PlacementDrive = Body(...)):
    async with pool.acquire() as conn:
        try:
            result = await conn.fetchrow(
                """
                INSERT INTO placement_drives (company, status, start_date, end_date, package, description)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
                """,
                data.company,
                data.status,
                data.start_date,
                data.end_date,
                data.package,
                data.description,
            )
        except asyncpg.exceptions.InvalidCachedStatementError:
            # Clear the statement cache and retry
            await conn.execute("DEALLOCATE ALL")
            result = await conn.fetchrow(
                """
                INSERT INTO placement_drives (company, status, start_date, end_date, package, description)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
                """,
                data.company,
                data.status,
                data.start_date,
                data.end_date,
                data.package,
                data.description,
            )

    return {"id": result["id"], "status": "created"}


@app.put("/placements/{placement_id}")
async def update_placement(placement_id: int, data: PlacementDrive = Body(...)):
    async with pool.acquire() as conn:
        try:
            placement = await conn.fetchrow(
                "SELECT id FROM placement_drives WHERE id=$1", placement_id
            )
        except asyncpg.exceptions.InvalidCachedStatementError:
            # Clear the statement cache and retry
            await conn.execute("DEALLOCATE ALL")
            placement = await conn.fetchrow(
                "SELECT id FROM placement_drives WHERE id=$1", placement_id
            )

        if not placement:
            raise HTTPException(status_code=404, detail="Placement drive not found")

        await conn.execute(
            """
            UPDATE placement_drives SET
                company = $1,
                status = $2,
                start_date = $3,
                end_date = $4,
                package = $5,
                description = $6
            WHERE id = $7
            """,
            data.company,
            data.status,
            data.start_date,
            data.end_date,
            data.package,
            data.description,
            placement_id,
        )

    return {"status": "updated"}


@app.delete("/placements/{placement_id}")
async def delete_placement(placement_id: int):
    async with pool.acquire() as conn:
        try:
            placement = await conn.fetchrow(
                "SELECT * FROM placement_drives WHERE id=$1", placement_id
            )
        except asyncpg.exceptions.InvalidCachedStatementError:
            # Clear the statement cache and retry
            await conn.execute("DEALLOCATE ALL")
            placement = await conn.fetchrow(
                "SELECT * FROM placement_drives WHERE id=$1", placement_id
            )

        if not placement:
            raise HTTPException(status_code=404, detail="Placement drive not found")

        await conn.execute("DELETE FROM placement_drives WHERE id=$1", placement_id)

    return {"status": "deleted"}


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
    bio = str(row.get("bio", "")).strip()

    if not name:
        raise ValueError("Missing name")

    if not pemail or "@" not in pemail:
        print("❌ BAD EMAIL ROW:", row.to_dict() if hasattr(row, "to_dict") else row)
        raise ValueError("Invalid email")

    final_cgpa_valid: Optional[float] = None
    final_cgpa_raw = row.get("final_cgpa") or row.get(
        "cgpa"
    )  # Support both old and new column names
    if pd.notna(final_cgpa_raw) and final_cgpa_raw != "":
        try:
            final_cgpa_valid = float(final_cgpa_raw)
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
        "final_cgpa": final_cgpa_valid,
        "phone": phone,
        "skills": skill_list,
        "internships": internship_list,
        # project parsing fromm csv is hard not for us but for teachers who are inputting it so lets ditch it and let studetns update it
        "projects": [],
        "placed": placed,
        "resume": resume,
        "bio": bio,
    }


def row_to_student(row: pd.Series) -> Student:
    raw = parse_row(row)
    # Remove final_cgpa from the raw data since it's no longer part of Student model
    raw_without_cgpa = {k: v for k, v in raw.items() if k != "final_cgpa"}
    return Student(**raw_without_cgpa)


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
        placed_text = s.placed

        params.append(
            (
                s.name,
                s.email,
                s.phone,
                skills_json,
                internships_json,
                projects_json,
                placed_text,
            )
        )

    query = """
            INSERT INTO students
                (name, email, phone, skills, internships, projects, placed)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT(email) DO UPDATE SET
                name        = excluded.name,
                phone       = excluded.phone,
                skills      = excluded.skills,
                internships = excluded.internships,
                projects    = excluded.projects,
                placed      = excluded.placed
            -- only actually update if something changed
            WHERE
                students.name        IS DISTINCT FROM excluded.name OR
                students.phone       IS DISTINCT FROM  excluded.phone OR
                students.skills      IS DISTINCT FROM  excluded.skills OR
                students.internships IS DISTINCT FROM  excluded.internships OR
                students.projects    IS DISTINCT FROM  excluded.projects OR
                students.placed      IS DISTINCT FROM  excluded.placed
        """

    async with pool.acquire() as conn:
        await conn.executemany(query, params)

        # Handle CGPA data if available in the dataframe
        for idx, row in df.iterrows():
            try:
                # Get student ID by email to link to semester CGPA
                email = str(row.get("email", "")).strip()
                if email:
                    student_id = await conn.fetchval(
                        "SELECT id FROM students WHERE email = $1", email
                    )
                    if student_id:
                        # Handle both 'cgpa' and 'final_cgpa' column names from the CSV
                        csv_cgpa = row.get("cgpa") or row.get("final_cgpa")
                        if pd.notna(csv_cgpa) and csv_cgpa != "":
                            try:
                                cgpa_value = float(csv_cgpa)
                                # Insert as semester CGPA (using 'Overall' or 'Final' as the semester name)
                                await conn.execute(
                                    "INSERT INTO semester_cgpa (student_id, semester, cgpa) VALUES ($1, $2, $3) "
                                    "ON CONFLICT (student_id, semester) DO UPDATE SET cgpa = $3",
                                    student_id,
                                    "Overall",
                                    cgpa_value,
                                )
                            except ValueError:
                                print(
                                    f"Invalid CGPA value {csv_cgpa} for student {email}"
                                )
            except Exception as e:
                print(f"Error processing CGPA for row {idx}: {e}")

    await pool.close()

    return json.dumps({"message": "Students updated successfully"})


@app.get("/stats")
async def get_stats():
    async with pool.acquire() as conn:
        # Basic stats
        total_students = await conn.fetchval("SELECT COUNT(*) FROM students")
        placed_count = await conn.fetchval(
            "SELECT COUNT(*) FROM students WHERE placed = TRUE"
        )
        avg_cgpa = await conn.fetchval(
            "SELECT AVG(final_cgpa) FROM students WHERE final_cgpa IS NOT NULL"
        )

        # Placement stats (updated to use placement_drives table)
        avg_package = await conn.fetchval("""
            SELECT AVG(package)
            FROM placement_drives
            WHERE status = 'completed' AND package IS NOT NULL
        """)

        # Top companies
        top_companies = await conn.fetch("""
            SELECT
                company as name,
                COUNT(*) as count,
                AVG(package) as avg_package
            FROM placement_drives
            WHERE status = 'completed'
            GROUP BY company
            ORDER BY count DESC
            LIMIT 10
        """)

        # Skill demand (count students with each skill)
        # Note: Since skills is TEXT (JSON string), we need to parse it
        skill_rows = await conn.fetch("""
            SELECT skills FROM students WHERE skills IS NOT NULL
        """)

        skill_demand = {}
        for row in skill_rows:
            skills = json.loads(row["skills"] or "[]")
            for skill in skills:
                skill = skill.strip()
                if skill:
                    skill_demand[skill] = skill_demand.get(skill, 0) + 1

        # Sort by count and take top 10
        top_skills = dict(
            sorted(skill_demand.items(), key=lambda x: x[1], reverse=True)[:10]
        )

    return {
        "total_students": total_students,
        "placed_count": placed_count,
        "placement_rate": round(placed_count / total_students * 100, 1)
        if total_students > 0
        else 0,
        "avg_cgpa": round(avg_cgpa, 2) if avg_cgpa else 0,
        "avg_package": int(avg_package) if avg_package else 0,
        "top_companies": [
            {
                "name": row["name"],
                "count": row["count"],
                "avg_package": int(row["avg_package"]) if row["avg_package"] else 0,
            }
            for row in top_companies
        ],
        "skill_demand": top_skills,
    }


# Semester CGPA API
class SemesterCGPA(BaseModel):
    semester: str
    cgpa: float


@app.get("/students/{student_id}/cgpa")
async def get_student_cgpa(student_id: int):
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch(
                "SELECT semester, cgpa FROM semester_cgpa WHERE student_id = $1 ORDER BY semester",
                student_id,
            )
        except asyncpg.exceptions.InvalidCachedStatementError:
            # Clear the statement cache and retry
            await conn.execute("DEALLOCATE ALL")
            rows = await conn.fetch(
                "SELECT semester, cgpa FROM semester_cgpa WHERE student_id = $1 ORDER BY semester",
                student_id,
            )

    semester_cgpas = [
        {"semester": row["semester"], "cgpa": row["cgpa"]} for row in rows
    ]
    return semester_cgpas


@app.post("/students/{student_id}/cgpa")
async def add_student_cgpa(student_id: int, data: SemesterCGPA = Body(...)):
    async with pool.acquire() as conn:
        try:
            # Check if student exists
            student = await conn.fetchrow(
                "SELECT id FROM students WHERE id = $1", student_id
            )
            if not student:
                raise HTTPException(status_code=404, detail="Student not found")

            # Insert or update semester CGPA
            await conn.execute(
                """
                INSERT INTO semester_cgpa (student_id, semester, cgpa)
                VALUES ($1, $2, $3)
                ON CONFLICT (student_id, semester) DO UPDATE SET
                    cgpa = $3
                """,
                student_id,
                data.semester,
                data.cgpa,
            )

            # Update the final_cgpa by calling the PostgreSQL function
            await conn.execute("SELECT update_student_final_cgpa($1)", student_id)
        except asyncpg.exceptions.InvalidCachedStatementError:
            # Clear the statement cache and retry
            await conn.execute("DEALLOCATE ALL")
            # Check if student exists
            student = await conn.fetchrow(
                "SELECT id FROM students WHERE id = $1", student_id
            )
            if not student:
                raise HTTPException(status_code=404, detail="Student not found")

            # Insert or update semester CGPA
            await conn.execute(
                """
                INSERT INTO semester_cgpa (student_id, semester, cgpa)
                VALUES ($1, $2, $3)
                ON CONFLICT (student_id, semester) DO UPDATE SET
                    cgpa = $3
                """,
                student_id,
                data.semester,
                data.cgpa,
            )

            # Update the final_cgpa by calling the PostgreSQL function
            await conn.execute("SELECT update_student_final_cgpa($1)", student_id)

    return {
        "status": "updated",
        "student_id": student_id,
        "semester": data.semester,
        "cgpa": data.cgpa,
    }


@app.delete("/students/{student_id}/cgpa/{semester}")
async def delete_student_cgpa(student_id: int, semester: str):
    async with pool.acquire() as conn:
        try:
            result = await conn.fetchrow(
                "DELETE FROM semester_cgpa WHERE student_id = $1 AND semester = $2 RETURNING id",
                student_id,
                semester,
            )
            if not result:
                raise HTTPException(
                    status_code=404, detail="Semester CGPA record not found"
                )

            # Update the final_cgpa by calling the PostgreSQL function
            await conn.execute("SELECT update_student_final_cgpa($1)", student_id)
        except asyncpg.exceptions.InvalidCachedStatementError:
            # Clear the statement cache and retry
            await conn.execute("DEALLOCATE ALL")
            result = await conn.fetchrow(
                "DELETE FROM semester_cgpa WHERE student_id = $1 AND semester = $2 RETURNING id",
                student_id,
                semester,
            )
            if not result:
                raise HTTPException(
                    status_code=404, detail="Semester CGPA record not found"
                )

            # Update the final_cgpa by calling the PostgreSQL function
            await conn.execute("SELECT update_student_final_cgpa($1)", student_id)

    return {"status": "deleted", "student_id": student_id, "semester": semester}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
