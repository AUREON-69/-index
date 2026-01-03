"use client";

import * as React from "react";
import { Navigation } from "@/components/navigation";
import {
  BarChart3,
  Users,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  Award,
} from "lucide-react";
import { statsApi, placementsApi, type Stats, type Placement } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [recentPlacements, setRecentPlacements] = React.useState<Placement[]>(
    [],
  );
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsData, placementsData] = await Promise.all([
        statsApi.get(),
        placementsApi.getAll({ status: "joined" }),
      ]);

      setStats(statsData);
      setRecentPlacements(placementsData.slice(0, 5)); // Latest 5
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation
          currentPage="stats"
          userName="Admin User"
          userRole="admin"
        />
        <main className="max-w-7xl mx-auto px-10 py-16">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gray-200 rounded w-1/3" />
            <div className="grid grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-white">
      <Navigation currentPage="stats" userName="Admin User" userRole="admin" />

      <main className="max-w-7xl mx-auto px-10 py-16">
        <header className="mb-12">
          <h1 className="mb-2">Admin Dashboard</h1>
          <p className="text-[18px] text-muted-foreground">
            Overview of placement statistics and student performance
          </p>
        </header>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard
            icon={Users}
            label="Total Students"
            value={stats.total_students.toString()}
            sublabel={`${stats.placed_count} placed`}
          />
          <StatCard
            icon={CheckCircle2}
            label="Placement Rate"
            value={`${stats.placement_rate.toFixed(1)}%`}
            sublabel={`${stats.placed_count} out of ${stats.total_students}`}
            color="success"
          />
          <StatCard
            icon={Award}
            label="Average CGPA"
            value={stats.avg_cgpa.toFixed(2)}
            sublabel="Across all students"
          />
          <StatCard
            icon={Briefcase}
            label="Avg Package"
            value={`₹${(stats.avg_package / 100000).toFixed(1)}L`}
            sublabel="For placed students"
            color="warning"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Recent Placements */}
          <section className="border border-border rounded-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-[24px] font-bold">Recent Placements</h2>
                <p className="text-sm text-muted-foreground">
                  Latest student success stories
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {recentPlacements.map((placement) => (
                <div
                  key={placement.id}
                  className="flex justify-between items-start p-4 border border-border rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-[16px]">
                      Student #{placement.student_id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {placement.company}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">
                      ₹{(placement.package / 100000).toFixed(1)}L
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(placement.placed_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Top Companies */}
          <section className="border border-border rounded-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-[24px] font-bold">Top Companies</h2>
                <p className="text-sm text-muted-foreground">
                  Hiring most students
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {stats.top_companies.map((company, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-semibold">{company.name}</p>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">
                        ₹{(company.avg_package / 100000).toFixed(1)}L
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {company.count} students
                      </p>
                    </div>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${(company.count / stats.placed_count) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sublabel: string;
  color?: "default" | "success" | "warning";
}) {
  const colorClasses = {
    default: "bg-primary/10 text-primary",
    success: "bg-[#D1FAE5] text-[#065F46]",
    warning: "bg-[#FEF3C7] text-[#92400E]",
  };

  return (
    <div className="border border-border rounded-xl p-6">
      <div
        className={cn(
          "h-12 w-12 rounded-lg flex items-center justify-center mb-4",
          colorClasses[color],
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-[32px] font-bold mb-1">{value}</p>
      <p className="text-sm text-muted-foreground">{sublabel}</p>
    </div>
  );
}
