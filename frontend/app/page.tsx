// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import StudentCard from "@/components/StudentCard";

export default function Home() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, [search]);

  const fetchStudents = async () => {
    const res = await fetch(`http://localhost:8000/students?search=${search}`);
    const data = await res.json();
    setStudents(data);
    setLoading(false);
  };

  return (
    <div>
      {/* Hero section with big text */}
      <div className="mb-12">
        <h1 className="text-5xl font-bold mb-4">Find your next hire</h1>
        <p className="text-xl text-gray-600">
          {students.length} talented students ready for opportunities
        </p>
      </div>

      {/* Search with lots of space */}
      <div className="mb-12">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search by name, email, or skills..."
            className="pl-12 h-14 text-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <p className="mt-3 text-sm text-gray-500">
          Try: "Python developer" or "8+ CGPA"
        </p>
      </div>

      {/* Student list with generous spacing */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-500 mb-2">No students found</p>
            <p className="text-sm text-gray-400">Try a different search term</p>
          </div>
        ) : (
          students.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))
        )}
      </div>
    </div>
  );
}
