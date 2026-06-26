import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, ExternalLink, Play, Search } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Input } from "../components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "../components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { listFirms, runScrape, subscribeScrapeProgress, type Firm, type ScrapeProgress } from "../lib/api";
import {
  clearActiveScrapeRunId,
  getActiveScrapeRunId,
  listenForActiveScrapeRunChange,
  saveActiveScrapeRunId,
} from "../lib/activeScrapeRun";
import { formatApiDateTime } from "../lib/dates";

function isFinalScrapeStatus(status: string | null | undefined) {
  return ["success", "failed", "partial"].includes(status || "");
}

type SortKey = "name" | "plugin" | "active" | "last_run_at" | "last_run_status" | "total_jobs" | "removed_jobs" | "needs_review_jobs";
type SortDirection = "asc" | "desc";

const sortableColumns: Array<{ key: SortKey; label: string; className: string }> = [
  { key: "name", label: "Name", className: "w-[22%]" },
  { key: "plugin", label: "Plugin", className: "w-[12%]" },
  { key: "active", label: "Active", className: "w-[8%]" },
  { key: "last_run_at", label: "Last Run", className: "w-[15%]" },
  { key: "last_run_status", label: "Last Status", className: "w-[15%]" },
  { key: "total_jobs", label: "Jobs", className: "w-[7%]" },
  { key: "removed_jobs", label: "Removed", className: "w-[7%]" },
  { key: "needs_review_jobs", label: "Review", className: "w-[7%]" },
];

function firmSortValue(firm: Firm, key: SortKey) {
  if (key === "active") return firm.active ? 1 : 0;
  if (key === "last_run_at") return firm.last_run_at ? new Date(firm.last_run_at).getTime() : 0;
  if (key === "total_jobs" || key === "removed_jobs" || key === "needs_review_jobs") return firm[key];
  return (firm[key] || "").toString().toLowerCase();
}

function FirmCareersLink({ firm, compact = false }: { firm: Firm; compact?: boolean }) {
  if (!firm.careers_url) {
    return (
      <div className="truncate text-xs text-gray-500" title={firm.plugin || "-"}>
        {firm.plugin || "-"}
      </div>
    );
  }

  return (
    <a
      href={firm.careers_url}
      target="_blank"
      rel="noreferrer"
      title={firm.careers_url}
      className="inline-flex max-w-full items-center gap-1 truncate text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
      onClick={(event) => event.stopPropagation()}
    >
      <span className="truncate">{compact ? "Open job board" : firm.careers_url}</span>
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
}

export function Firms() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingFirm, setStartingFirm] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [scrapeProgress, setScrapeProgress] = useState<ScrapeProgress | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const navigate = useNavigate();

  const statusOptions = useMemo(() => {
    const statuses = new Set(
      firms
        .map((firm) => firm.last_run_status)
        .filter((status): status is string => Boolean(status)),
    );
    return Array.from(statuses).sort((a, b) => a.localeCompare(b));
  }, [firms]);

  const filteredFirms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return firms.filter((firm) => {
      if (activeFilter === "enabled" && !firm.active) return false;
      if (activeFilter === "disabled" && firm.active) return false;
      if (statusFilter !== "all" && (firm.last_run_status || "") !== statusFilter) return false;
      if (!query) return true;

      return [
        firm.name,
        firm.key,
        firm.plugin,
        firm.careers_url,
        firm.last_run_status,
        firm.last_error,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [activeFilter, firms, search, statusFilter]);

  const sortedFirms = useMemo(() => {
    return [...filteredFirms].sort((a, b) => {
      const aValue = firmSortValue(a, sortKey);
      const bValue = firmSortValue(b, sortKey);
      const result = typeof aValue === "number" && typeof bValue === "number"
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: "base" });
      return sortDirection === "asc" ? result : -result;
    });
  }, [filteredFirms, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedFirms.length / pageSize));
  const visibleFirms = sortedFirms.slice((page - 1) * pageSize, page * pageSize);

  async function loadFirms() {
    setLoading(true);
    try {
      setFirms(await listFirms());
    } catch {
      toast.error("Failed to load firms");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFirms();
  }, []);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  useEffect(() => {
    function restoreActiveRun() {
      const storedRunId = getActiveScrapeRunId();
      setActiveRunId(storedRunId);
    }

    restoreActiveRun();
    return listenForActiveScrapeRunChange(restoreActiveRun);
  }, []);

  useEffect(() => {
    if (!activeRunId) return;

    let cancelled = false;
    const unsubscribe = subscribeScrapeProgress(
      activeRunId,
      (progress) => {
        if (cancelled) return;
        setScrapeProgress(progress);
        const done = isFinalScrapeStatus(progress.status);
        if (done) {
          clearActiveScrapeRunId(activeRunId);
          setStartingFirm(null);
          setActiveRunId(null);
          loadFirms();
        }
      },
      () => {
        if (!cancelled) {
          clearActiveScrapeRunId(activeRunId);
          setStartingFirm(null);
          setActiveRunId(null);
          setScrapeProgress(null);
          loadFirms();
        }
      },
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeRunId]);

  async function runNow(firmKey: string, firmName: string) {
    setStartingFirm(firmKey);
    setScrapeProgress(null);
    try {
      const response = await runScrape(firmKey);
      if (response.run_id) {
        saveActiveScrapeRunId(response.run_id);
        setActiveRunId(response.run_id);
      } else {
        setStartingFirm(null);
      }
      toast.success(response.message || `Scrape started for ${firmName}`, {
        description: "You can leave this page while it runs.",
        action: {
          label: "View runs",
          onClick: () => navigate("/scrape-runs"),
        },
      });
    } catch {
      toast.error(`Could not start scrape for ${firmName}`);
      setStartingFirm(null);
    }
  }

  function updateSort(nextKey: SortKey) {
    setPage(1);
    if (nextKey === sortKey) {
      setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "last_run_at" || nextKey.endsWith("_jobs") ? "desc" : "asc");
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400" />;
    return sortDirection === "asc"
      ? <ArrowUp className="h-3.5 w-3.5 text-gray-700" />
      : <ArrowDown className="h-3.5 w-3.5 text-gray-700" />;
  }

  function isFirmRunning(firmKey: string) {
    return startingFirm === firmKey || (Boolean(activeRunId) && scrapeProgress?.firm_key === firmKey && !isFinalScrapeStatus(scrapeProgress.status));
  }

  useEffect(() => {
    if (!isFinalScrapeStatus(scrapeProgress?.status)) return;
    const runId = scrapeProgress?.run_id;
    const timer = window.setTimeout(() => {
      setScrapeProgress((current) => current?.run_id === runId ? null : current);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [scrapeProgress?.run_id, scrapeProgress?.status]);

  return (
    <div className="space-y-4 p-3 md:p-6">
      {scrapeProgress ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">Manual scrape: {scrapeProgress.label}</p>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    scrapeProgress.status === "failed"
                      ? "bg-red-50 text-red-700"
                      : ["success", "partial"].includes(scrapeProgress.status)
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-blue-50 text-blue-700"
                  }`}>
                    {scrapeProgress.status}
                  </span>
                </div>
                <p className="truncate text-sm text-gray-500">
                  {scrapeProgress.message || scrapeProgress.current_firm || "Scrape is running"}
                </p>
              </div>
              <div className="text-sm font-semibold text-gray-700">{scrapeProgress.percent}%</div>
            </div>
            <Progress value={scrapeProgress.percent} className="mt-3 h-2" />
            {scrapeProgress.current_firm ? (
              <div className="mt-3 rounded-md border bg-gray-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{scrapeProgress.current_firm}</p>
                    <p className="text-xs text-gray-500">{scrapeProgress.current_firm_stage || "Working"}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{scrapeProgress.current_firm_percent}%</span>
                </div>
                <Progress value={scrapeProgress.current_firm_percent} className="h-2" />
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
              <span>{scrapeProgress.completed_firms}/{scrapeProgress.total_firms || 1} firms</span>
              <span>{scrapeProgress.jobs_found} jobs found</span>
              <span className={scrapeProgress.errors ? "text-red-600" : ""}>{scrapeProgress.errors} errors</span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Firms</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span>{sortedFirms.length} shown</span>
              {sortedFirms.length !== firms.length ? <span>{firms.length} total</span> : null}
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_160px_170px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Filter firms, plugins, URLs..."
                className="pl-8"
              />
            </div>
            <select
              className="h-9 rounded-md border bg-white px-3 text-sm text-gray-700"
              value={activeFilter}
              onChange={(event) => {
                setPage(1);
                setActiveFilter(event.target.value);
              }}
            >
              <option value="all">All active states</option>
              <option value="enabled">Enabled only</option>
              <option value="disabled">Disabled only</option>
            </select>
            <select
              className="h-9 rounded-md border bg-white px-3 text-sm text-gray-700"
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
            >
              <option value="all">All run statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:hidden">
            {loading ? (
              <div className="text-sm text-gray-500">Loading firms...</div>
            ) : visibleFirms.length === 0 ? (
              <div className="text-sm text-gray-500">No firms found.</div>
            ) : (
              visibleFirms.map((firm) => (
                <div key={firm.key} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-gray-900" title={firm.name}>{firm.name}</div>
                      <FirmCareersLink firm={firm} compact />
                    </div>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${firm.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                      {firm.active ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md bg-gray-50 p-2">
                      <div className="font-semibold text-gray-900">{firm.total_jobs}</div>
                      <div className="text-gray-500">Jobs</div>
                    </div>
                    <div className="rounded-md bg-gray-50 p-2">
                      <div className="font-semibold text-gray-900">{firm.removed_jobs}</div>
                      <div className="text-gray-500">Removed</div>
                    </div>
                    <div className="rounded-md bg-gray-50 p-2">
                      <div className="font-semibold text-gray-900">{firm.needs_review_jobs}</div>
                      <div className="text-gray-500">Review</div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-gray-500">
                    <div>Last run: {formatApiDateTime(firm.last_run_at)}</div>
                    <div className="truncate" title={firm.last_error || firm.last_run_status || "-"}>
                      Status: {firm.last_run_status || "-"}
                      {firm.last_error ? ` · ${firm.last_error}` : ""}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isFirmRunning(firm.key)}
                    onClick={() => runNow(firm.key, firm.name)}
                    className="mt-3 w-full"
                  >
                    <Play className="w-4 h-4" /> {isFirmRunning(firm.key) ? "Running" : "Run"}
                  </Button>
                </div>
              ))
            )}
          </div>

          <Table className="hidden min-w-[1160px] table-fixed md:table">
            <TableHeader>
              <TableRow>
                {sortableColumns.map((column) => (
                  <TableHead key={column.key} className={column.className}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-1 text-left hover:text-gray-900"
                      onClick={() => updateSort(column.key)}
                      aria-sort={sortKey === column.key ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                    >
                      <span>{column.label}</span>
                      <SortIcon column={column.key} />
                    </button>
                  </TableHead>
                ))}
                <TableHead className="w-[7%]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9}>Loading...</TableCell>
                </TableRow>
              ) : (
                visibleFirms.map((firm) => (
                  <TableRow key={firm.key}>
                    <TableCell className="max-w-0">
                      <div className="truncate font-medium" title={firm.name}>{firm.name}</div>
                      <FirmCareersLink firm={firm} />
                    </TableCell>
                    <TableCell className="max-w-0">
                      <div className="truncate" title={firm.plugin}>{firm.plugin}</div>
                    </TableCell>
                    <TableCell>{firm.active ? "Enabled" : "Disabled"}</TableCell>
                    <TableCell className="max-w-0">
                      <div
                        className="truncate text-xs text-gray-600"
                        title={formatApiDateTime(firm.last_run_at)}
                      >
                        {formatApiDateTime(firm.last_run_at)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-0">
                      <div className="truncate" title={firm.last_run_status || "-"}>{firm.last_run_status || "-"}</div>
                      {firm.last_error ? (
                        <div className="truncate text-xs text-red-600" title={firm.last_error}>{firm.last_error}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>{firm.total_jobs}</TableCell>
                    <TableCell>{firm.removed_jobs}</TableCell>
                    <TableCell>{firm.needs_review_jobs}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isFirmRunning(firm.key)}
                        onClick={() => runNow(firm.key, firm.name)}
                      >
                        <Play className="w-4 h-4" /> {isFirmRunning(firm.key) ? "Running" : "Run"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="mt-3 flex flex-col gap-3 border-t pt-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>Page {page} / {totalPages}</span>
              <span>{sortedFirms.length} firms</span>
              <label className="flex items-center gap-2 text-sm">
                Rows
                <select
                  className="rounded-md border px-2 py-1 text-sm text-gray-700"
                  value={pageSize}
                  onChange={(e) => {
                    setPage(1);
                    setPageSize(Number(e.target.value));
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>
            <Pagination className="mx-0 w-auto justify-start md:justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    aria-disabled={page <= 1}
                    className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                    onClick={(event) => {
                      event.preventDefault();
                      setPage((p) => Math.max(1, p - 1));
                    }}
                    href="#"
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    aria-disabled={page >= totalPages}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                    onClick={(event) => {
                      event.preventDefault();
                      setPage((p) => Math.min(totalPages, p + 1));
                    }}
                    href="#"
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
