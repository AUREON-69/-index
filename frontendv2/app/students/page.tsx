"use client";

import * as React from "react";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { StudentCard } from "@/components/student-card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { studentsApi, type Student } from "@/lib/api";

export default function StudentsPage() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<
    "all" | "placed" | "top" | "available"
  >("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const studentsPerPage = 10;

  // Fetch students with debounce
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchStudents();
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [search, filter]);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        search: search || undefined,
        limit: 100, // Get more for client-side filtering
      };

      // Add filter-specific params
      if (filter === "top") {
        params.min_cgpa = 8.5;
      }

      const data = await studentsApi.getAll(params);

      // Client-side filtering for placed/available
      let filtered = data;
      if (filter === "placed") {
        filtered = data.filter((s) => s.placed);
      } else if (filter === "available") {
        filtered = data.filter((s) => !s.placed);
      }

      setStudents(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(students.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const endIndex = startIndex + studentsPerPage;
  const currentStudents = students.slice(startIndex, endIndex);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, filter]);

  return (
    <div className="min-h-screen bg-white">
      <Navigation
        currentPage="students"
        userName="Admin User"
        userRole="admin"
      />

      <main className="max-w-7xl mx-auto px-10 py-16">
        <header className="mb-12">
          <h1 className="mb-2">Students</h1>
          <p className="text-[18px] text-muted-foreground">
            {students.length} students in database
          </p>
        </header>

        <section className="space-y-8">
          {/* Search Bar */}
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or skills..."
              className="h-[60px] pl-16 pr-12 text-[18px] rounded-xl border-border focus:border-primary focus:border-2 transition-all shadow-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-6 top-1/2 -translate-y-1/2"
              >
                <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-4">
            <FilterChip
              label="All"
              isActive={filter === "all"}
              onClick={() => setFilter("all")}
            />
            <FilterChip
              label="Placed"
              isActive={filter === "placed"}
              onClick={() => setFilter("placed")}
            />
            <FilterChip
              label="8.5+ CGPA"
              isActive={filter === "top"}
              onClick={() => setFilter("top")}
            />
            <FilterChip
              label="Available"
              isActive={filter === "available"}
              onClick={() => setFilter("available")}
            />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-xl p-8 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                  <div className="flex gap-2">
                    <div className="h-8 bg-gray-200 rounded w-20" />
                    <div className="h-8 bg-gray-200 rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="py-12 text-center border-2 border-red-200 rounded-xl bg-red-50">
              <p className="text-[24px] font-bold text-red-600">
                Error loading students
              </p>
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={fetchStudents}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Student List */}
          {!loading && !error && (
            <>
              <div className="grid gap-6">
                {currentStudents.map((student) => (
                  <StudentCard key={student.id} student={student} />
                ))}

                {students.length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed border-border rounded-xl">
                    <p className="text-[24px] font-bold text-muted-foreground">
                      No students found
                    </p>
                    <p className="text-muted-foreground">
                      Try adjusting your search or filters
                    </p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {students.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between pt-8 border-t border-border">
                  <p className="text-muted-foreground">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(endIndex, students.length)} of {students.length}{" "}
                    students
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={cn(
                        "h-10 w-10 flex items-center justify-center rounded-lg border transition-all",
                        currentPage === 1
                          ? "border-border text-muted-foreground cursor-not-allowed"
                          : "border-border hover:border-primary hover:text-primary",
                      )}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(totalPages, 5) },
                        (_, i) => i + 1,
                      ).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "h-10 w-10 flex items-center justify-center rounded-lg text-sm font-semibold transition-all",
                            currentPage === page
                              ? "bg-primary text-white"
                              : "text-muted-foreground hover:text-primary hover:bg-secondary",
                          )}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className={cn(
                        "h-10 w-10 flex items-center justify-center rounded-lg border transition-all",
                        currentPage === totalPages
                          ? "border-border text-muted-foreground cursor-not-allowed"
                          : "border-border hover:border-primary hover:text-primary",
                      )}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function FilterChip({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-[44px] px-8 rounded-lg text-[16px] font-semibold transition-all border",
        isActive
          ? "bg-primary text-white border-primary"
          : "bg-white text-muted-foreground border-border hover:border-primary hover:text-primary",
      )}
    >
      {label}
    </button>
  );
}
