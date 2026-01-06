"use client";

import { useEffect, useState } from "react";
import { studentsApi, semesterCGPA, type Student, type SemesterCGPA } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ProfilePage() {
  const STUDENT_ID = 1; // later: from auth

  const [student, setStudent] = useState<Student | null>(null);
  const [semesterCgpaList, setSemesterCgpaList] = useState<SemesterCGPA[]>([]);
  const [saving, setSaving] = useState(false);
  const [newSemester, setNewSemester] = useState("");
  const [newCgpa, setNewCgpa] = useState("");
  const [cgpaLoading, setCgpaLoading] = useState(false);

  useEffect(() => {
    studentsApi.getById(STUDENT_ID).then(setStudent);
    // Load existing semester CGPAs
    loadSemesterCgpa();
  }, []);

  const loadSemesterCgpa = async () => {
    try {
      const data = await semesterCGPA.getAll(STUDENT_ID);
      setSemesterCgpaList(data);
    } catch (error) {
      console.error("Failed to load semester CGPAs:", error);
    }
  };

  if (!student) return <div>Loading...</div>;

  const updateField = (field: keyof Student, value: any) => {
    setStudent({ ...student, [field]: value });
  };

  const saveProfile = async () => {
    setSaving(true);
    await studentsApi.update(student.id, student);
    setSaving(false);
  };

  const addSemesterCgpa = async () => {
    if (!newSemester || !newCgpa) return;

    setCgpaLoading(true);
    try {
      await semesterCGPA.add(STUDENT_ID, {
        semester: newSemester,
        cgpa: parseFloat(newCgpa),
      });
      // Reload the CGPA list
      loadSemesterCgpa();
      setNewSemester("");
      setNewCgpa("");
    } catch (error) {
      console.error("Failed to add semester CGPA:", error);
    }
    setCgpaLoading(false);
  };

  const removeSemesterCgpa = async (semester: string) => {
    try {
      await semesterCGPA.delete(STUDENT_ID, semester);
      // Reload the CGPA list
      loadSemesterCgpa();
    } catch (error) {
      console.error("Failed to remove semester CGPA:", error);
    }
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

        {/* Display computed final CGPA */}
        <div className="border-2 border-border rounded-xl p-4 mb-4">
          <h3 className="font-semibold mb-2">Computed Final CGPA</h3>
          <p className="text-2xl font-bold text-center">{student.final_cgpa?.toFixed(2) || "Not calculated"}</p>
        </div>

        {/* Semester CGPA Section */}
        <div className="space-y-4">
          <h3 className="font-semibold">Semester CGPA</h3>
          
          {/* Existing semester CGPAs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {semesterCgpaList.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-md">
                <div>
                  <span className="font-medium">{item.semester}:</span> 
                  <span className="ml-2 font-bold">{item.cgpa.toFixed(2)}</span>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => removeSemesterCgpa(item.semester)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          
          {/* Add new semester CGPA */}
          <div className="flex gap-2 mt-4">
            <Input
              value={newSemester}
              onChange={(e) => setNewSemester(e.target.value)}
              placeholder="Semester (e.g. '1', '2', 'Fall 2023')"
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              max="10"
              value={newCgpa}
              onChange={(e) => setNewCgpa(e.target.value)}
              placeholder="CGPA (0.00 - 10.00)"
            />
            <Button 
              onClick={addSemesterCgpa} 
              disabled={cgpaLoading || !newSemester || !newCgpa}
            >
              {cgpaLoading ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>

        <Input
          value={student.bio || ""}
          onChange={(e) => updateField("bio", e.target.value)}
          placeholder="Short bio about yourself"
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
