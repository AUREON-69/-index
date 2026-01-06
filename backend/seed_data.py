import csv
import random

from faker import Faker

fake = Faker()

skills_pool = [
    "Python",
    "SQL",
    "React",
    "ML",
    "DSA",
    "Go",
    "Docker",
    "Node.js",
    "Next.js",
    "Pandas",
    "Java",
    "C++",
    "TypeScript",
    "Flutter",
    "NLP",
    "DL",
    "Rust",
    "HTML",
    "CSS",
    "JavaScript",
    "Spring Boot",
]

internship_pool = [
    "Backend Intern",
    "Frontend Intern",
    "AI Intern",
    "Data Intern",
    "Research Intern",
    "Software Intern",
    "Mobile Intern",
    "Full Stack Intern",
    "SDE Intern",
    "Business Intern",
]


def random_skills():
    return ", ".join(random.sample(skills_pool, random.randint(1, 4)))


def random_internship():
    return random.choice(internship_pool)


def random_cgpa():
    return round(random.uniform(6.0, 10.0), 1)


def random_bool():
    return random.choice(["true", "false"])


with open("students_500.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(
        ["name", "email", "phone", "final_cgpa", "skills", "internships", "placed", "bio"]
    )

    for _ in range(500):
        name = fake.name()
        email = fake.email()
        phone = fake.phone_number().replace(" ", "").replace("-", "")
        final_cgpa = random_cgpa()
        skills = random_skills()
        internship = random_internship()
        placed = random_bool()
        bio = fake.text(max_nb_chars=200)  # Add a short bio

        writer.writerow([name, email, phone, final_cgpa, skills, internship, placed, bio])

print("Generated students_500.csv successfully.")
