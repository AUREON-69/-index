"use client";

import { useEffect, useState } from "react";
import { studentsApi, type Student } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ProfilePage() {
  const STUDENT_ID = 1; // later: from auth

  const [student, setStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    studentsApi.getById(STUDENT_ID).then(setStudent);
  }, []);

  if (!student) return <div>Loading...</div>;

  const updateField = (field: keyof Student, value: any) => {
    setStudent({ ...student, [field]: value });
  };

  const saveProfile = async () => {
    setSaving(true);
    await studentsApi.update(student.id, student);
    setSaving(false);
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      {/* Header */}
      <div className="bg-white border-2 border-border rounded-2xl p-8">
        <h1 className="mb-2">Edit Profile</h1>
        <p className="text-muted-foreground font-medium">
          Update your personal and academic details
        </p>
      </div>

      {/* Basic Info */}
      <section className="bg-white border-2 border-border rounded-2xl p-8 space-y-4">
        <h2>Basic Information</h2>

        <Input
          value={student.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Full Name"
        />

        <Input
          value={student.email}
          onChange={(e) => updateField("email", e.target.value)}
          placeholder="Email"
        />

        <Input
          value={student.phone || ""}
          onChange={(e) => updateField("phone", e.target.value)}
          placeholder="Phone"
        />
      </section>

      {/* Skills */}
      <section className="bg-white border-2 border-border rounded-2xl p-8">
        <h2 className="mb-4">Skills</h2>

        <div className="flex flex-wrap gap-2 mb-4">
          {student.skills.map((skill, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-muted rounded-md font-bold cursor-pointer"
              onClick={() =>
                updateField(
                  "skills",
                  student.skills.filter((_, idx) => idx !== i),
                )
              }
            >
              {skill} ✕
            </span>
          ))}
        </div>

        <Input
          placeholder="Add skill & press Enter"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateField("skills", [...student.skills, e.currentTarget.value]);
              e.currentTarget.value = "";
            }
          }}
        />
      </section>

      {/* Projects */}
      {/*<section className="bg-white border-2 border-border rounded-2xl p-8">
        <h2 className="mb-4">Projects</h2>

        {student.projects.map((project, i) => (
          <div
            key={i}
            className="border-2 border-border rounded-xl p-4 mb-4 space-y-2"
          >
            <Input
              value={project.title}
              onChange={(e) => {
                const copy = [...student.projects];
                copy[i].title = e.target.value;
                updateField("projects", copy);
              }}
              placeholder="Project title"
            />

            <Input
              value={project.description}
              onChange={(e) => {
                const copy = [...student.projects];
                copy[i].description = e.target.value;
                updateField("projects", copy);
              }}
              placeholder="Description"
            />
          </div>
        ))}

        <Button
          variant="secondary"
          onClick={() =>
            updateField("projects", [
              ...student.projects,
              { title: "", description: "", link: "" },
            ])
          }
        >
          + Add Project
        </Button>
      </section>*/}
      {/* Projects */}
      <section className="bg-white border-2 border-border rounded-2xl p-8">
        <h2 className="mb-4">Projects</h2>

        {student.projects.map((project, i) => (
          <div
            key={i}
            className="border-2 border-border rounded-xl p-4 mb-4 space-y-3"
          >
            <Input
              value={project.title}
              onChange={(e) => {
                const copy = [...student.projects];
                copy[i].title = e.target.value;
                updateField("projects", copy);
              }}
              placeholder="Project title"
            />

            <Input
              value={project.description}
              onChange={(e) => {
                const copy = [...student.projects];
                copy[i].description = e.target.value;
                updateField("projects", copy);
              }}
              placeholder="Project description"
            />

            <Input
              value={project.link}
              onChange={(e) => {
                const copy = [...student.projects];
                copy[i].link = e.target.value;
                updateField("projects", copy);
              }}
              placeholder="Project link (GitHub / Live URL)"
            />
          </div>
        ))}

        <Button
          variant="secondary"
          onClick={() =>
            updateField("projects", [
              ...student.projects,
              { title: "", description: "", link: "" },
            ])
          }
        >
          + Add Project
        </Button>
      </section>

      {/* Save */}
      <Button
        onClick={saveProfile}
        disabled={saving}
        className="w-full py-6 text-lg font-black"
      >
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </main>
  );
}
