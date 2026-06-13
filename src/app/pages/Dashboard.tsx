import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { getDashboard, type DashboardStats } from "../lib/api";

export function Dashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(() => setData(null))
      .then(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  if (!data) {
    return <div className="p-6">Unable to load dashboard data.</div>;
  }

  const kpis = [
    { label: "Total Firms", value: data.total_firms },
    { label: "Total Live Jobs", value: data.total_live_jobs },
    { label: "New Jobs Today", value: data.new_jobs_today },
    { label: "Updated Jobs Today", value: data.updated_jobs_today },
    { label: "Removed Jobs Today", value: data.removed_jobs_today },
    { label: "Failed Sites", value: data.failed_sites },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Live monitoring summary from backend data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">{kpi.label}</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Jobs by Firm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.jobs_by_firm.map((row) => (
              <div key={row.name} className="flex items-center justify-between text-sm">
                <span>{row.name}</span>
                <span className="font-medium">{row.jobs}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Scrape Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recent_activity.map((item, idx) => (
              <div key={`${item.firm}-${idx}`} className="border rounded-md p-3">
                <div className="text-sm font-medium">{item.firm}</div>
                <div className="text-xs text-gray-500">{item.title}</div>
                <div className="text-xs text-gray-500">jobs: {item.jobs_found} | errors: {item.errors}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
