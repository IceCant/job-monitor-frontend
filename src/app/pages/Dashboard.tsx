import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Briefcase,
  Building2,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Search,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge, type BadgeVariant } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { getDashboard, type DashboardStats } from "../lib/api";
import { formatApiDateTime } from "../lib/dates";

type ActivityFilter = "all" | "success" | "partial" | "failed";
type FirmSort = "jobs_desc" | "jobs_asc" | "name_asc";

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat().format(value || 0);
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
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

function statusTone(status: string | null | undefined) {
  switch ((status || "").toLowerCase()) {
    case "failed":
      return "text-red-600";
    case "partial":
      return "text-amber-600";
    case "success":
      return "text-emerald-600";
    default:
      return "text-gray-500";
  }
}

export function Dashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [firmSearch, setFirmSearch] = useState("");
  const [firmSort, setFirmSort] = useState<FirmSort>("jobs_desc");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [firmLimit, setFirmLimit] = useState(10);

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

  const derived = useMemo(() => {
    if (!data) return null;

    const movementTotal = data.new_jobs_today + data.updated_jobs_today + data.removed_jobs_today;
    const scrapeTotal = data.recent_activity.length;
    const failedRuns = data.recent_activity.filter((item) => item.type === "failed").length;
    const partialRuns = data.recent_activity.filter((item) => item.type === "partial").length;
    const successRuns = data.recent_activity.filter((item) => item.type === "success").length;
    const recentJobsFound = data.recent_activity.reduce((sum, item) => sum + (item.jobs_found || 0), 0);
    const recentErrors = data.recent_activity.reduce((sum, item) => sum + (item.errors || 0), 0);
    const healthScore = Math.max(0, Math.round(100 - percent(data.failed_sites, Math.max(data.total_firms, 1)) - partialRuns * 4));
    const totalStatus = data.status_distribution.reduce((sum, row) => sum + row.value, 0);
    const maxFirmJobs = Math.max(...data.jobs_by_firm.map((row) => row.jobs), 1);

    const filteredFirms = data.jobs_by_firm
      .filter((row) => row.name.toLowerCase().includes(firmSearch.trim().toLowerCase()))
      .sort((a, b) => {
        if (firmSort === "jobs_asc") return a.jobs - b.jobs;
        if (firmSort === "name_asc") return a.name.localeCompare(b.name);
        return b.jobs - a.jobs;
      })
      .slice(0, firmLimit);

    const filteredActivity = data.recent_activity.filter((item) => {
      if (activityFilter === "all") return true;
      return item.type === activityFilter;
    });

    return {
      movementTotal,
      scrapeTotal,
      failedRuns,
      partialRuns,
      successRuns,
      recentJobsFound,
      recentErrors,
      healthScore,
      totalStatus,
      maxFirmJobs,
      filteredFirms,
      filteredActivity,
    };
  }, [activityFilter, data, firmLimit, firmSearch, firmSort]);

  if (!data || !derived) {
    return (
      <div className="p-3 md:p-6">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
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

  const kpis = [
    { label: "Firms", value: data.total_firms, helper: "tracked sources", icon: Building2, tone: "text-sky-700", bg: "bg-sky-50" },
    { label: "Live Jobs", value: data.total_live_jobs, helper: "currently visible", icon: Briefcase, tone: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "New Today", value: data.new_jobs_today, helper: `${formatNumber(derived.movementTotal)} total changes`, icon: TrendingUp, tone: "text-blue-700", bg: "bg-blue-50" },
    { label: "Updated Today", value: data.updated_jobs_today, helper: "updated/reposted/review", icon: RotateCcw, tone: "text-amber-700", bg: "bg-amber-50" },
    { label: "Removed Today", value: data.removed_jobs_today, helper: "newly removed", icon: XCircle, tone: "text-rose-700", bg: "bg-rose-50" },
    { label: "Failed Sites", value: data.failed_sites, helper: "latest firm status", icon: AlertTriangle, tone: "text-red-700", bg: "bg-red-50" },
  ];

  return (
    <div className="space-y-5 p-3 md:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Scrape health, job movement, source coverage, and recent activity.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={derived.healthScore >= 90 ? "reposted" : derived.healthScore >= 70 ? "needs_review" : "failed"}>
            Health {derived.healthScore}%
          </Badge>
          <Button variant="outline" onClick={() => loadDashboard(true)} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-500">{kpi.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">{formatNumber(kpi.value)}</p>
                  <p className="mt-1 truncate text-xs text-gray-500">{kpi.helper}</p>
                </div>
                <div className={`rounded-md p-2 ${kpi.bg}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.tone}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Scrape Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-gray-600">Operational score</span>
                <span className="font-semibold text-gray-900">{derived.healthScore}%</span>
              </div>
              <Progress value={derived.healthScore} className="h-2 bg-gray-100" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-md bg-emerald-50 p-3">
                <div className="font-semibold text-emerald-700">{derived.successRuns}</div>
                <div className="text-xs text-emerald-700">Success</div>
              </div>
              <div className="rounded-md bg-amber-50 p-3">
                <div className="font-semibold text-amber-700">{derived.partialRuns}</div>
                <div className="text-xs text-amber-700">Partial</div>
              </div>
              <div className="rounded-md bg-red-50 p-3">
                <div className="font-semibold text-red-700">{derived.failedRuns}</div>
                <div className="text-xs text-red-700">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Yield</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm text-gray-500">Jobs found</p>
                <p className="text-2xl font-semibold text-gray-900">{formatNumber(derived.recentJobsFound)}</p>
              </div>
              <Briefcase className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm text-gray-500">Run errors</p>
                <p className={`text-2xl font-semibold ${derived.recentErrors ? "text-red-700" : "text-gray-900"}`}>
                  {formatNumber(derived.recentErrors)}
                </p>
              </div>
              <AlertTriangle className={`h-5 w-5 ${derived.recentErrors ? "text-red-600" : "text-gray-400"}`} />
            </div>
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
                  <span className="font-medium text-gray-900">{formatNumber(row.value)} · {percent(row.value, derived.totalStatus)}%</span>
                </div>
                <Progress value={percent(row.value, derived.totalStatus)} className="h-2 bg-gray-100" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>Firm Coverage</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    className="w-full rounded-md border py-2 pl-9 pr-3 text-sm sm:w-56"
                    placeholder="Search firms..."
                    value={firmSearch}
                    onChange={(event) => setFirmSearch(event.target.value)}
                  />
                </div>
                <select
                  className="rounded-md border px-3 py-2 text-sm text-gray-700"
                  value={firmSort}
                  onChange={(event) => setFirmSort(event.target.value as FirmSort)}
                >
                  <option value="jobs_desc">Most jobs</option>
                  <option value="jobs_asc">Fewest jobs</option>
                  <option value="name_asc">Name A-Z</option>
                </select>
                <select
                  className="rounded-md border px-3 py-2 text-sm text-gray-700"
                  value={firmLimit}
                  onChange={(event) => setFirmLimit(Number(event.target.value))}
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={20}>Top 20</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {derived.filteredFirms.length === 0 ? (
              <p className="text-sm text-gray-500">No firms match that filter.</p>
            ) : derived.filteredFirms.map((row, index) => (
              <div key={row.name} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <span className="mr-2 text-xs text-gray-400">#{index + 1}</span>
                    <span className="truncate font-medium text-gray-800" title={row.name}>{row.name}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{formatNumber(row.jobs)}</span>
                </div>
                <Progress value={(row.jobs / derived.maxFirmJobs) * 100} className="h-2 bg-gray-100" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <div className="flex rounded-md border p-1">
                {(["all", "success", "partial", "failed"] as ActivityFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActivityFilter(filter)}
                    className={`rounded px-2.5 py-1 text-xs font-medium capitalize ${
                      activityFilter === filter ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {derived.filteredActivity.length === 0 ? (
              <p className="text-sm text-gray-500">No activity matches this filter.</p>
            ) : derived.filteredActivity.map((item, idx) => (
              <div key={`${item.firm}-${idx}`} className="rounded-md border p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
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
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <span>{formatApiDateTime(item.time)}</span>
                  <span className={`text-right ${statusTone(item.type)}`}>
                    {formatNumber(item.jobs_found)} jobs / {formatNumber(item.errors)} errors
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
