import asyncio
import io
import json
import logging
import os
import time
from datetime import datetime, timedelta
from typing import List, Optional

import asyncpg
import pandas as pd
from dotenv import load_dotenv
from fastapi import (
    Body,
    Depends,
    FastAPI,
    File,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, ValidationError, validator

load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

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

pool: Optional[asyncpg.Pool] = None


@app.on_event("startup")
async def startup():
    global pool
    pool = await asyncpg.create_pool(dsn=os.getenv("DB_URL"))
    if pool is None:
        logger.error("Failed to create connection pool.")
        return

    async with pool.acquire() as conn:
        # Create users table first
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        # Create students table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
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

        # Create semester_cgpa table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS semester_cgpa (
                id SERIAL PRIMARY KEY,
                student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                semester TEXT NOT NULL,
                cgpa REAL NOT NULL,
                UNIQUE (student_id, semester)
            )
        """)

        # Create placement_drives table
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

        # Create function to update final_cgpa
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
    if pool:
        await pool.close()


# Models
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


class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    student_id: Optional[int] = None


class PlacementDrive(BaseModel):
    company: str
    status: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    package: Optional[int] = None
    description: Optional[str] = None


class SemesterCGPA(BaseModel):
    semester: str
    cgpa: float


# Auth utilities
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        payload = jwt.decode(
            credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM]
        )
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, email, role FROM users WHERE email = $1", email
        )
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")

        # Get student_id if exists
        student = await conn.fetchrow(
            "SELECT id FROM students WHERE user_id = $1", user["id"]
        )

        return {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "student_id": student["id"] if student else None,
        }


async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# Response time logger
@app.middleware("http")
async def response_time_logger(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    if duration > 1.0:
        logger.warning(f"🐌 SLOW {request.method} {request.url.path}: {duration:.3f}s")
    elif duration > 0.5:
        logger.info(f"⚠️  {request.method} {request.url.path}: {duration:.3f}s")
    else:
        logger.info(f"⚡ {request.method} {request.url.path}: {duration:.3f}s")

    return response


# Auth routes
@app.post("/auth/register", response_model=Token)
async def register(user: UserCreate):
    async with pool.acquire() as conn:
        # Check if user exists
        existing = await conn.fetchrow(
            "SELECT id FROM users WHERE email = $1", user.email
        )
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Create user
        password_hash = get_password_hash(user.password)
        new_user = await conn.fetchrow(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
            user.email,
            password_hash,
        )

        # Create student profile linked to user
        await conn.execute(
            """INSERT INTO students (user_id, name, email, phone, skills, internships, projects)
               VALUES ($1, $2, $3, $4, $5, $6, $7)""",
            new_user["id"],
            user.name,
            user.email,
            user.phone,
            json.dumps([]),
            json.dumps([]),
            json.dumps([]),
        )

        # Create token
        access_token = create_access_token(
            data={"sub": new_user["email"]},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        return {"access_token": access_token, "token_type": "bearer"}


@app.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, email, password_hash FROM users WHERE email = $1",
            credentials.email,
        )

        if not user or not verify_password(credentials.password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="Invalid credentials")

        access_token = create_access_token(
            data={"sub": user["email"]},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user


@app.post("/auth/logout")
async def logout():
    return {"message": "Logged out successfully"}


# Admin routes
@app.post("/admin/make-admin")
async def make_admin(
    email: str = Body(..., embed=True), _: dict = Depends(require_admin)
):
    async with pool.acquire() as conn:
        result = await conn.fetchrow(
            "UPDATE users SET role='admin' WHERE email=$1 RETURNING id, email, role",
            email,
        )
        if not result:
            raise HTTPException(status_code=404, detail="User not found")

    return {"message": f"User {email} is now an admin", "user": dict(result)}


@app.post("/admin/remove-admin")
async def remove_admin(
    email: str = Body(..., embed=True), _: dict = Depends(require_admin)
):
    async with pool.acquire() as conn:
        result = await conn.fetchrow(
            "UPDATE users SET role='user' WHERE email=$1 RETURNING id, email, role",
            email,
        )
        if not result:
            raise HTTPException(status_code=404, detail="User not found")

    return {"message": f"Admin removed from {email}", "user": dict(result)}


# Student routes
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
    limit = min(limit, 100)
    query = "SELECT * FROM students WHERE id > $1"
    params = [cursor]

    if search:
        query += f" AND name ILIKE ${len(params) + 1}"
        params.append(f"%{search}%")
    if min_cgpa is not None:
        query += f" AND final_cgpa >= ${len(params) + 1}"
        params.append(float(min_cgpa))
    if skill:
        query += f" AND skills LIKE ${len(params) + 1}"
        params.append(f"%{skill}%")

    query += f" ORDER BY id LIMIT ${len(params) + 1}"
    params.append(limit)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    students = []
    for row in rows:
        student = dict(row)
        student["skills"] = json.loads(student["skills"] or "[]")
        student["internships"] = json.loads(student["internships"] or "[]")
        student["projects"] = json.loads(student["projects"] or "[]")
        students.append(student)

    return students


@app.get("/students/{student_id}")
async def get_student_by_id(student_id: int):
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM students WHERE id=$1", student_id)

    if row:
        student = dict(row)
        student["skills"] = json.loads(student["skills"] or "[]")
        student["internships"] = json.loads(student["internships"] or "[]")
        student["projects"] = json.loads(student["projects"] or "[]")
        return student
    else:
        raise HTTPException(status_code=404, detail="Student not found")


@app.put("/students/{student_id}")
async def update_student(
    student_id: int,
    data: Student = Body(...),
    current_user: dict = Depends(get_current_user),
):
    async with pool.acquire() as conn:
        student = await conn.fetchrow(
            "SELECT user_id FROM students WHERE id=$1", student_id
        )

        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        # Only allow user to update their own profile or admin to update any
        if student["user_id"] != current_user["id"] and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")

        await conn.execute(
            """UPDATE students SET name=$1, email=$2, phone=$3, skills=$4,
               internships=$5, projects=$6, placed=$7, bio=$8 WHERE id=$9""",
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


@app.delete("/students/{student_id}")
async def delete_student(student_id: int, _: dict = Depends(require_admin)):
    async with pool.acquire() as conn:
        student = await conn.fetchrow("SELECT * FROM students WHERE id=$1", student_id)
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        await conn.execute("DELETE FROM students WHERE id=$1", student_id)

    return {"status": "deleted"}


# Placement routes (admin only for CUD operations)
@app.get("/placements")
async def get_placements(
    status: Optional[str] = None,
    limit: int = Query(10, le=100),
    cursor: int = 0,
):
    limit = min(limit, 100)
    query = "SELECT * FROM placement_drives WHERE id > $1"
    params = [cursor]

    if status:
        query += f" AND status = ${len(params) + 1}"
        params.append(status)

    query += f" ORDER BY id LIMIT ${len(params) + 1}"
    params.append(limit)

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)

    return [dict(row) for row in rows]


@app.get("/placements/{placement_id}")
async def get_placement_by_id(placement_id: int):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM placement_drives WHERE id=$1", placement_id
        )

    if row:
        return dict(row)
    else:
        raise HTTPException(status_code=404, detail="Placement drive not found")


@app.post("/placements")
async def create_placement(
    data: PlacementDrive = Body(...), _: dict = Depends(require_admin)
):
    async with pool.acquire() as conn:
        result = await conn.fetchrow(
            """INSERT INTO placement_drives (company, status, start_date, end_date, package, description)
               VALUES ($1, $2, $3, $4, $5, $6) RETURNING id""",
            data.company,
            data.status,
            data.start_date,
            data.end_date,
            data.package,
            data.description,
        )

    return {"id": result["id"], "status": "created"}


@app.put("/placements/{placement_id}")
async def update_placement(
    placement_id: int,
    data: PlacementDrive = Body(...),
    _: dict = Depends(require_admin),
):
    async with pool.acquire() as conn:
        placement = await conn.fetchrow(
            "SELECT id FROM placement_drives WHERE id=$1", placement_id
        )
        if not placement:
            raise HTTPException(status_code=404, detail="Placement drive not found")

        await conn.execute(
            """UPDATE placement_drives SET company=$1, status=$2, start_date=$3,
               end_date=$4, package=$5, description=$6 WHERE id=$7""",
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
async def delete_placement(placement_id: int, _: dict = Depends(require_admin)):
    async with pool.acquire() as conn:
        placement = await conn.fetchrow(
            "SELECT * FROM placement_drives WHERE id=$1", placement_id
        )
        if not placement:
            raise HTTPException(status_code=404, detail="Placement drive not found")

        await conn.execute("DELETE FROM placement_drives WHERE id=$1", placement_id)

    return {"status": "deleted"}


# CGPA routes
@app.get("/students/{student_id}/cgpa")
async def get_student_cgpa(student_id: int):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT semester, cgpa FROM semester_cgpa WHERE student_id=$1 ORDER BY semester",
            student_id,
        )

    return [{"semester": row["semester"], "cgpa": row["cgpa"]} for row in rows]


@app.post("/students/{student_id}/cgpa")
async def add_student_cgpa(
    student_id: int,
    data: SemesterCGPA = Body(...),
    current_user: dict = Depends(get_current_user),
):
    async with pool.acquire() as conn:
        student = await conn.fetchrow(
            "SELECT user_id FROM students WHERE id=$1", student_id
        )
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        # Only allow user to update their own CGPA or admin
        if student["user_id"] != current_user["id"] and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")

        await conn.execute(
            """INSERT INTO semester_cgpa (student_id, semester, cgpa)
               VALUES ($1, $2, $3)
               ON CONFLICT (student_id, semester) DO UPDATE SET cgpa=$3""",
            student_id,
            data.semester,
            data.cgpa,
        )

        await conn.execute("SELECT update_student_final_cgpa($1)", student_id)

    return {
        "status": "updated",
        "student_id": student_id,
        "semester": data.semester,
        "cgpa": data.cgpa,
    }


@app.delete("/students/{student_id}/cgpa/{semester}")
async def delete_student_cgpa(
    student_id: int, semester: str, current_user: dict = Depends(get_current_user)
):
    async with pool.acquire() as conn:
        student = await conn.fetchrow(
            "SELECT user_id FROM students WHERE id=$1", student_id
        )
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        if student["user_id"] != current_user["id"] and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")

        result = await conn.fetchrow(
            "DELETE FROM semester_cgpa WHERE student_id=$1 AND semester=$2 RETURNING id",
            student_id,
            semester,
        )
        if not result:
            raise HTTPException(
                status_code=404, detail="Semester CGPA record not found"
            )

        await conn.execute("SELECT update_student_final_cgpa($1)", student_id)

    return {"status": "deleted", "student_id": student_id, "semester": semester}


# Stats route
@app.get("/stats")
async def get_stats():
    async with pool.acquire() as conn:
        total_students = await conn.fetchval("SELECT COUNT(*) FROM students")
        placed_count = await conn.fetchval(
            "SELECT COUNT(*) FROM students WHERE placed=TRUE"
        )
        avg_cgpa = await conn.fetchval(
            "SELECT AVG(final_cgpa) FROM students WHERE final_cgpa IS NOT NULL"
        )
        avg_package = await conn.fetchval(
            "SELECT AVG(package) FROM placement_drives WHERE status='completed' AND package IS NOT NULL"
        )

        top_companies = await conn.fetch("""
            SELECT company as name, COUNT(*) as count, AVG(package) as avg_package
            FROM placement_drives WHERE status='completed'
            GROUP BY company ORDER BY count DESC LIMIT 10
        """)

        skill_rows = await conn.fetch(
            "SELECT skills FROM students WHERE skills IS NOT NULL"
        )

        skill_demand = {}
        for row in skill_rows:
            skills = json.loads(row["skills"] or "[]")
            for skill in skills:
                skill = skill.strip()
                if skill:
                    skill_demand[skill] = skill_demand.get(skill, 0) + 1

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
                "name": r["name"],
                "count": r["count"],
                "avg_package": int(r["avg_package"]) if r["avg_package"] else 0,
            }
            for r in top_companies
        ],
        "skill_demand": top_skills,
    }


# Bulk upload (admin only)
@app.post("/admin/upload")
async def bulk_upload_csv(
    file: UploadFile = File(...), _: dict = Depends(require_admin)
):
    content = await file.read()
    try:
        decoded = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file format")

    try:
        df = pd.read_csv(io.StringIO(decoded))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing CSV: {str(e)}")

    params = []
    for idx, row in df.iterrows():
        try:
            name = str(row.get("name", "")).strip()
            email = str(row.get("email", "")).strip()
            phone = (
                str(row.get("phone", "")).strip()
                if pd.notna(row.get("phone"))
                else None
            )
            skills = str(row.get("skills", "")).strip().split(",")
            internships = str(row.get("internships", "")).strip().split(",")

            if not name or not email or "@" not in email:
                continue

            params.append(
                (
                    name,
                    email,
                    phone,
                    json.dumps(skills),
                    json.dumps(internships),
                    json.dumps([]),
                    False,
                )
            )
        except Exception as e:
            logger.error(f"Error processing row {idx}: {e}")

    query = """
        INSERT INTO students (name, email, phone, skills, internships, projects, placed)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT(email) DO UPDATE SET
            name=excluded.name, phone=excluded.phone, skills=excluded.skills,
            internships=excluded.internships, projects=excluded.projects, placed=excluded.placed
        WHERE students.name IS DISTINCT FROM excluded.name
           OR students.phone IS DISTINCT FROM excluded.phone
           OR students.skills IS DISTINCT FROM excluded.skills
           OR students.internships IS DISTINCT FROM excluded.internships
           OR students.projects IS DISTINCT FROM excluded.projects
           OR students.placed IS DISTINCT FROM excluded.placed
    """

    async with pool.acquire() as conn:
        await conn.executemany(query, params)

        # Handle CGPA data
        for idx, row in df.iterrows():
            try:
                email = str(row.get("email", "")).strip()
                if email:
                    student_id = await conn.fetchval(
                        "SELECT id FROM students WHERE email=$1", email
                    )
                    if student_id:
                        csv_cgpa = row.get("cgpa") or row.get("final_cgpa")
                        if pd.notna(csv_cgpa) and csv_cgpa != "":
                            try:
                                cgpa_value = float(csv_cgpa)
                                await conn.execute(
                                    """INSERT INTO semester_cgpa (student_id, semester, cgpa)
                                       VALUES ($1, $2, $3)
                                       ON CONFLICT (student_id, semester) DO UPDATE SET cgpa=$3""",
                                    student_id,
                                    "Overall",
                                    cgpa_value,
                                )
                            except ValueError:
                                pass
            except Exception as e:
                logger.error(f"Error processing CGPA for row {idx}: {e}")

    return {"message": "Students updated successfully"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
