"use client"
import { Navigation } from "@/components/navigation"
import { Building2, Briefcase, Calendar } from "lucide-react"

const placements = [
  { company: "Google", role: "Software Engineer", date: "24 Oct, 2023", package: "42 LPA", status: "Ongoing" },
  { company: "Microsoft", role: "SDE-1", date: "15 Oct, 2023", package: "35 LPA", status: "Completed" },
  { company: "Amazon", role: "Cloud Developer", date: "02 Oct, 2023", package: "28 LPA", status: "Upcoming" },
  { company: "Goldman Sachs", role: "Analyst", date: "28 Sep, 2023", package: "22 LPA", status: "Completed" },
]

export default function PlacementsPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Navigation currentPage="placements" userName="Admin User" userRole="admin" />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Company Placements</h1>
            <p className="text-xl text-muted-foreground">Manage active drives and upcoming companies</p>
          </div>
          <button className="px-8 py-4 bg-secondary text-white font-bold rounded-xl border-2 border-border shadow-sm hover:scale-[1.02] transition-transform">
            New Placement Drive
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {placements.map((p, idx) => (
            <div
              key={idx}
              className="bg-white border-2 border-border rounded-2xl p-8 hover:border-primary transition-all group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-4">
                  <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center border-2 border-border group-hover:bg-primary transition-colors">
                    <Building2 className="h-7 w-7 text-muted-foreground group-hover:text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-1">{p.company}</h3>
                    <p className="text-muted-foreground font-medium">{p.role}</p>
                  </div>
                </div>
                <span
                  className={`px-4 py-2 rounded-lg font-bold text-sm border-2 ${
                    p.status === "Ongoing"
                      ? "bg-primary text-foreground border-border"
                      : p.status === "Completed"
                        ? "bg-secondary text-white border-border"
                        : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {p.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                  <Calendar className="h-5 w-5" />
                  <span>{p.date}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                  <Briefcase className="h-5 w-5" />
                  <span>{p.package}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
