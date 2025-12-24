// components/StudentCard.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function StudentCard({ student }) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <div className="p-8">
        {/* Top section */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-semibold">{student.name}</h2>
              {student.cgpa && (
                <Badge variant="secondary" className="text-sm">
                  CGPA {student.cgpa}
                </Badge>
              )}
            </div>
            <p className="text-gray-600">{student.email}</p>
          </div>

          {/* Actions (visible on hover) */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Link href={`/students/${student.id}`}>
              <Button size="sm">View Profile →</Button>
            </Link>
          </div>
        </div>

        {/* Skills */}
        {student.skills && student.skills.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {student.skills.slice(0, 6).map((skill) => (
                <Badge key={skill} variant="outline" className="text-sm">
                  {skill}
                </Badge>
              ))}
              {student.skills.length > 6 && (
                <Badge variant="ghost" className="text-sm text-gray-500">
                  +{student.skills.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Internships */}
        {student.internships && student.internships.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              💼 Interned at: {student.internships.join(", ")}
            </p>
          </div>
        )}

        {/* Placement status */}
        {student.placed && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Badge className="bg-green-50 text-green-700 hover:bg-green-50">
              ✓ Placed
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
}
