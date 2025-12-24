// app/stats/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

export default function Stats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/stats")
      .then((res) => res.json())
      .then(setStats);
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-5xl font-bold mb-12">Placement Statistics</h1>

      {/* Big numbers */}
      <div className="grid grid-cols-3 gap-8 mb-16">
        <Card className="p-8">
          <div className="text-6xl font-bold mb-2">{stats.total_students}</div>
          <div className="text-gray-600">Total Students</div>
        </Card>

        <Card className="p-8">
          <div className="text-6xl font-bold text-green-600 mb-2">
            {stats.placed}
          </div>
          <div className="text-gray-600">Placed</div>
        </Card>

        <Card className="p-8">
          <div className="text-6xl font-bold text-blue-600 mb-2">
            {stats.placement_rate}%
          </div>
          <div className="text-gray-600">Placement Rate</div>
        </Card>
      </div>

      {/* Average CGPA */}
      <Card className="p-8">
        <h2 className="text-2xl font-semibold mb-4">Average CGPA</h2>
        <div className="text-5xl font-bold">{stats.avg_cgpa}</div>
      </Card>
    </div>
  );
}
