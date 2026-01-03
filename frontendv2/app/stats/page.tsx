"use client";

import * as React from "react";
import { Navigation } from "@/components/navigation";
import { TrendingUp, Users, Target, Activity } from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { statsApi, type Stats } from "@/lib/api";

export default function StatsPage() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await statsApi.get();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <Navigation
          currentPage="stats"
          userName="Admin User"
          userRole="admin"
        />
        <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gray-200 rounded w-1/3" />
            <div className="grid grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-2xl" />
              ))}
            </div>
            <div className="h-[500px] bg-gray-200 rounded-3xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <Navigation
          currentPage="stats"
          userName="Admin User"
          userRole="admin"
        />
        <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center py-12 border-2 border-red-200 rounded-xl bg-red-50">
            <p className="text-[24px] font-bold text-red-600">
              Error loading statistics
            </p>
            <button
              onClick={fetchStats}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Transform company data for chart
  const chartData = stats.top_companies.slice(0, 5).map((company) => ({
    name: company.name,
    placed: company.count,
    avgPackage: company.avg_package,
  }));

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Navigation currentPage="stats" userName="Admin User" userRole="admin" />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-xl text-muted-foreground">
            Placement trends and performance metrics
          </p>
        </header>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white border-2 border-border rounded-2xl p-8 shadow-sm">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-6">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Total Placed
            </p>
            <p className="text-4xl font-black">{stats.placed_count}</p>
            <p className="mt-4 text-muted-foreground font-medium">
              Out of {stats.total_students} students
            </p>
          </div>

          <div className="bg-white border-2 border-border rounded-2xl p-8 shadow-sm">
            <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center mb-6">
              <Target className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Average Package
            </p>
            <p className="text-4xl font-black">
              ₹{(stats.avg_package / 100000).toFixed(1)}L
            </p>
            <p className="mt-4 text-muted-foreground font-medium">
              Avg CGPA: {stats.avg_cgpa.toFixed(2)}
            </p>
          </div>

          <div className="bg-white border-2 border-border rounded-2xl p-8 shadow-sm">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center mb-6">
              <Activity className="h-6 w-6 text-secondary" />
            </div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Placement Rate
            </p>
            <p className="text-4xl font-black">{stats.placement_rate}%</p>
            <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary transition-all"
                style={{ width: `${stats.placement_rate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Company Chart */}
        <section className="bg-white border-2 border-border rounded-3xl p-10 shadow-sm mb-12">
          <h3 className="text-2xl font-bold mb-8">Top Hiring Companies</h3>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontWeight: 600 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontWeight: 600 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "2px solid #e5e5e5",
                    boxShadow: "none",
                  }}
                  cursor={{ fill: "#FFD608", opacity: 0.1 }}
                  formatter={(value, name) => {
                    if (name === "avgPackage") {
                      return [
                        `₹${(value / 100000).toFixed(1)}L`,
                        "Avg Package",
                      ];
                    }
                    return [value, "Students Placed"];
                  }}
                />
                <Bar dataKey="placed" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index % 2 === 0 ? "#FFD608" : "#0B8A0E"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Top Skills */}
        {Object.keys(stats.skill_demand).length > 0 && (
          <section className="bg-white border-2 border-border rounded-3xl p-10 shadow-sm">
            <h3 className="text-2xl font-bold mb-8">Most In-Demand Skills</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {Object.entries(stats.skill_demand)
                .slice(0, 10)
                .map(([skill, count]) => (
                  <div
                    key={skill}
                    className="text-center p-6 border-2 border-border rounded-xl hover:border-primary transition-all"
                  >
                    <p className="text-3xl font-black mb-2">{count}</p>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                      {skill}
                    </p>
                  </div>
                ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
