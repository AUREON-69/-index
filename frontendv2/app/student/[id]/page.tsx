"use client";

import * as React from "react";
import { Navigation } from "@/components/navigation";
import {
  Mail,
  Phone,
  Award,
  Briefcase,
  Code,
  ArrowLeft,
  Building2,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import {
  studentsApi,
  placementsApi,
  type Student,
  type Placement,
} from "@/lib/api";

export default function StudentProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = React.use(params);
  const [student, setStudent] = React.useState<Student | null>(null);
  const [placements, setPlacements] = React.useState<Placement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchStudentData();
  }, [resolvedParams.id]);

  const fetchStudentData = async () => {
    setLoading(true);
    setError(null);

    try {
      const studentId = parseInt(resolvedParams.id);
      const [studentData, placementsData] = await Promise.all([
        studentsApi.getById(studentId),
        placementsApi.getByStudent(studentId).catch(() => []), // Placements optional
      ]);

      setStudent(studentData);
      setPlacements(placementsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load student");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation
          currentPage="students"
          userName="Admin User"
          userRole="admin"
        />
        <main className="max-w-5xl mx-auto px-6 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-32" />
            <div className="h-48 bg-gray-200 rounded-2xl" />
            <div className="grid grid-cols-3 gap-8">
              <div className="col-span-2 h-64 bg-gray-200 rounded-2xl" />
              <div className="h-64 bg-gray-200 rounded-2xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation
          currentPage="students"
          userName="Admin User"
          userRole="admin"
        />
        <main className="max-w-5xl mx-auto px-6 py-12">
          <div className="text-center py-12 border-2 border-red-200 rounded-xl bg-red-50">
            <p className="text-[24px] font-bold text-red-600">
              Error loading student
            </p>
            <p className="text-red-500 mb-4">{error}</p>
            <Link
              href="/students"
              className="inline-block px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Back to Students
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Get the latest placement
  const latestPlacement = placements.find((p) => p.status === "joined");

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        currentPage="students"
        userName="Admin User"
        userRole="admin"
      />

      <main className="max-w-5xl mx-auto px-6 py-12">
        <Link
          href="/students"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-secondary mb-8 transition-colors font-bold uppercase tracking-wider text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to list
        </Link>

        {/* Profile Header Card */}
        <div className="bg-white border-2 border-border rounded-2xl p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="flex gap-6 items-center">
              <div className="h-24 w-24 rounded-2xl bg-primary flex items-center justify-center text-4xl font-black border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {student.name[0]}
              </div>
              <div>
                <h1 className="mb-2">{student.name}</h1>
                <div className="flex flex-wrap gap-4 text-muted-foreground font-medium">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{student.email}</span>
                  </div>
                  {student.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{student.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {student.placed && latestPlacement && (
              <div className="bg-secondary text-secondary-foreground px-6 py-5 rounded-xl border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="h-5 w-5" />
                  <span className="font-black text-lg uppercase tracking-tight">
                    Placed
                  </span>
                </div>
                <p className="font-bold">
                  {latestPlacement.company} • ₹
                  {(latestPlacement.package / 100000).toFixed(1)}L
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Placements Section */}
            {placements.length > 0 && (
              <section className="bg-white border-2 border-border rounded-2xl p-8">
                <h2 className="mb-6 flex items-center gap-3">
                  <Briefcase className="h-8 w-8 text-secondary" />
                  Placements
                </h2>
                <div className="space-y-4">
                  {placements.map((placement) => (
                    <div
                      key={placement.id}
                      className="flex justify-between items-start p-4 rounded-xl bg-muted/50 border border-border"
                    >
                      <div className="flex gap-4">
                        <Building2 className="h-6 w-6 text-muted-foreground mt-1" />
                        <div>
                          <h4 className="font-black text-xl">
                            {placement.company}
                          </h4>
                          <p className="text-muted-foreground font-bold">
                            {placement.role || "Software Engineer"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(
                              placement.placed_date,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary text-lg">
                          ₹{(placement.package / 100000).toFixed(1)}L
                        </p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            placement.status === "joined"
                              ? "bg-green-100 text-green-700"
                              : placement.status === "offered"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {placement.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Internships Section */}
            {student.internships && student.internships.length > 0 && (
              <section className="bg-white border-2 border-border rounded-2xl p-8">
                <h2 className="mb-6 flex items-center gap-3">
                  <Briefcase className="h-8 w-8 text-secondary" />
                  Experience
                </h2>
                <div className="space-y-6">
                  {student.internships.map((exp, i) => (
                    <div
                      key={i}
                      className="flex gap-4 p-4 rounded-xl bg-muted/50 border border-border"
                    >
                      <Building2 className="h-6 w-6 text-muted-foreground mt-1" />
                      <div>
                        <h4 className="font-black text-xl">{exp}</h4>
                        <p className="text-muted-foreground font-bold">
                          2023 - Present
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Projects Section */}
            {student.projects && student.projects.length > 0 && (
              <section className="bg-white border-2 border-border rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Code className="h-6 w-6 text-secondary" />
                  Technical Projects
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {student.projects.map((project, i) => (
                    <div
                      key={i}
                      className="p-4 border-2 border-border rounded-xl hover:border-primary transition-colors cursor-pointer"
                    >
                      <h4 className="font-bold mb-1">
                        {project.title || `Project ${i + 1}`}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {project.description || "Full Stack Development"}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-8">
            {/* CGPA Section */}
            {student.cgpa && (
              <section className="bg-white border-2 border-border rounded-2xl p-8">
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap className="h-5 w-5 text-secondary" />
                  <h3 className="uppercase tracking-widest text-sm text-muted-foreground">
                    Academic Score
                  </h3>
                </div>
                <div className="p-8 bg-primary rounded-xl border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
                  <p className="text-6xl font-black">
                    {student.cgpa.toFixed(2)}
                  </p>
                  <p className="font-bold mt-2 uppercase tracking-tighter">
                    Current CGPA
                  </p>
                </div>
              </section>
            )}

            {/* Skills Section */}
            {student.skills && student.skills.length > 0 && (
              <section className="bg-white border-2 border-border rounded-2xl p-8">
                <h3 className="text-xl font-bold mb-4">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {student.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-muted rounded-md text-sm font-bold border border-border"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
