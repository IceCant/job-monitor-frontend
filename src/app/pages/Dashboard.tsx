import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Briefcase,
  Building2,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge, type BadgeVariant } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { getDashboard, type DashboardStats } from "../lib/api";

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat().format(value || 0);
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "-";
}

function statusVariant(status: string | null | undefined): BadgeVariant {
  switch ((status || "").toLowerCase()) {
    case "failed":
      return "failed";
    case "partial":
      return "needs_review";
    case "success":
      return "reposted";
    default:
      return "live";
  }
}

export function Dashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadDashboard(showToast = false) {
    setLoading(true);
    try {
      setData(await getDashboard());
      if (showToast) toast.success("Dashboard refreshed");
    } catch {
      setData(null);
      if (showToast) toast.error("Unable to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (!data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500">Unable to load dashboard data.</p>
            </div>
            <Button variant="outline" onClick={() => loadDashboard(true)} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const maxFirmJobs = Math.max(...data.jobs_by_firm.map((row) => row.jobs), 1);
  const totalStatus = data.status_distribution.reduce((sum, row) => sum + row.value, 0);

  const kpis = [
    { label: "Firms", value: data.total_firms, icon: Building2, tone: "text-sky-700", bg: "bg-sky-50" },
    { label: "Live Jobs", value: data.total_live_jobs, icon: Briefcase, tone: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "New Today", value: data.new_jobs_today, icon: TrendingUp, tone: "text-blue-700", bg: "bg-blue-50" },
    { label: "Updated Today", value: data.updated_jobs_today, icon: RotateCcw, tone: "text-amber-700", bg: "bg-amber-50" },
    { label: "Removed Today", value: data.removed_jobs_today, icon: XCircle, tone: "text-rose-700", bg: "bg-rose-50" },
    { label: "Failed Sites", value: data.failed_sites, icon: AlertTriangle, tone: "text-red-700", bg: "bg-red-50" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Live scrape health, job movement, and firm coverage.</p>
        </div>
        <Button variant="outline" onClick={() => loadDashboard(true)} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">{kpi.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">{formatNumber(kpi.value)}</p>
                </div>
                <div className={`rounded-md p-2 ${kpi.bg}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.tone}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Jobs by Firm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.jobs_by_firm.length === 0 ? (
              <p className="text-sm text-gray-500">No live jobs found yet.</p>
            ) : data.jobs_by_firm.map((row) => (
              <div key={row.name} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-gray-700" title={row.name}>{row.name}</span>
                  <span className="font-medium text-gray-900">{formatNumber(row.jobs)}</span>
                </div>
                <Progress value={(row.jobs / maxFirmJobs) * 100} className="h-2 bg-gray-100" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Mix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.status_distribution.length === 0 ? (
              <p className="text-sm text-gray-500">No status data yet.</p>
            ) : data.status_distribution.map((row) => (
              <div key={row.name} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-gray-700">{row.name}</span>
                  <span className="font-medium text-gray-900">{formatNumber(row.value)}</span>
                </div>
                <Progress value={totalStatus ? (row.value / totalStatus) * 100 : 0} className="h-2 bg-gray-100" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Scrape Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.recent_activity.length === 0 ? (
            <p className="text-sm text-gray-500">No scrape activity yet.</p>
          ) : data.recent_activity.map((item, idx) => (
            <div key={`${item.firm}-${idx}`} className="grid grid-cols-1 gap-3 rounded-md border p-3 text-sm md:grid-cols-[1fr_auto_auto_auto] md:items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {item.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : item.type === "failed" ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                  <span className="truncate font-medium text-gray-900" title={item.firm}>{item.firm || "Unknown"}</span>
                </div>
                <div className="mt-1 truncate text-xs text-gray-500" title={item.title}>{item.title}</div>
              </div>
              <Badge variant={statusVariant(item.type)}>{item.type || "unknown"}</Badge>
              <div className="text-xs text-gray-500">{formatDate(item.time)}</div>
              <div className="text-xs text-gray-600">
                {formatNumber(item.jobs_found)} jobs / {formatNumber(item.errors)} errors
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
