"use client"

import * as React from "react"
import { ArrowRight, Briefcase, CheckCircle2 } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface Student {
  id: number
  name: string
  email: string
  cgpa?: number
  skills: string[]
  internships: string[]
  placed: boolean
}

interface StudentCardProps {
  student: Student
  onClick?: (id: number) => void
}

export function StudentCard({ student, onClick }: StudentCardProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  return (
    <Link href={`/student/${student.id}`}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={() => onClick?.(student.id)}
        className={cn(
          "group bg-white border rounded-xl p-8 cursor-pointer transition-all duration-200",
          isHovered ? "border-primary border-2 -m-[1px]" : "border-border border-1",
        )}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-[24px] font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
              {student.name}
            </h3>
            <p className="text-[16px] text-muted-foreground">{student.email}</p>
          </div>
          <div className="flex items-center gap-4">
            {student.cgpa && (
              <div className="bg-secondary px-3 py-1 rounded-full text-sm font-semibold border border-border">
                {student.cgpa.toFixed(2)} CGPA
              </div>
            )}
            <ArrowRight
              className={cn(
                "h-6 w-6 text-primary transition-all duration-200",
                isHovered ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
              )}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {student.skills.slice(0, 6).map((skill) => (
            <span
              key={skill}
              className="h-8 px-4 flex items-center justify-center bg-secondary rounded-full text-sm font-medium border border-border"
            >
              {skill.trim().replace(/^"|"$/g, "")}
            </span>
          ))}
          {student.skills.length > 6 && (
            <span className="text-sm text-muted-foreground flex items-center pl-2">
              +{student.skills.length - 6} more
            </span>
          )}
        </div>

        <div className="pt-6 border-t border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Briefcase className="h-5 w-5" />
            <span className="text-[16px]">
              {student.internships.length > 0 && student.internships[0] !== "nan"
                ? student.internships[0].replace(/^"|"$/g, "")
                : "No internship yet"}
            </span>
          </div>

          {student.placed && (
            <div className="flex items-center gap-2 bg-[#D1FAE5] text-[#065F46] px-4 py-2 rounded-full font-bold text-[14px]">
              <CheckCircle2 className="h-4 w-4" />
              Placed
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  )
}
