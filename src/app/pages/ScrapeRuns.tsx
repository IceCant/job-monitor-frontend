import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "../components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { listScrapeRuns, type ScrapeRun } from "../lib/api";
import { formatApiDateTime } from "../lib/dates";

export function ScrapeRuns() {
  const [runs, setRuns] = useState<ScrapeRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<ScrapeRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function loadRuns(showToast = false) {
    setLoading(true);
    try {
      const response = await listScrapeRuns(page, pageSize);
      setRuns(response.items);
      setTotal(response.total);
      if (showToast) toast.success("Scrape runs refreshed");
    } catch {
      if (showToast) toast.error("Failed to load scrape runs");
      setRuns([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRuns();
    const timer = window.setInterval(() => loadRuns(), 15000);
    return () => window.clearInterval(timer);
  }, [page, pageSize]);

  return (
    <div className="space-y-4 p-3 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Scrape Runs</h1>
          <p className="text-sm text-gray-500">Manual scrapes run in the background; completed runs refresh here.</p>
        </div>
        <Button variant="outline" onClick={() => loadRuns(true)} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:hidden">
            {loading && runs.length === 0 ? (
              <div className="text-sm text-gray-500">Loading scrape runs...</div>
            ) : runs.length === 0 ? (
              <div className="text-sm text-gray-500">No scrape runs yet.</div>
            ) : (
              runs.map((run) => (
                <button
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  className="w-full rounded-md border p-3 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900">Run #{run.id}</div>
                      <div className="truncate text-sm text-gray-500" title={run.firm || "-"}>{run.firm || "-"}</div>
                    </div>
                    <Badge variant={run.status === "failed" ? "failed" : run.status === "partial" ? "needs_review" : "live"}>
                      {run.status || "unknown"}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div>Started: {formatApiDateTime(run.started_at)}</div>
                    <div>Finished: {formatApiDateTime(run.finished_at)}</div>
                    <div>{run.jobs_found} jobs</div>
                    <div className={run.errors > 0 ? "text-red-600" : ""}>{run.errors} errors</div>
                  </div>
                </button>
              ))
            )}
          </div>

          <Table className="hidden min-w-[880px] table-fixed md:table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[8%]">ID</TableHead>
                <TableHead className="w-[28%]">Firm</TableHead>
                <TableHead className="w-[12%]">Status</TableHead>
                <TableHead className="w-[18%]">Started</TableHead>
                <TableHead className="w-[18%]">Finished</TableHead>
                <TableHead className="w-[8%]">Jobs</TableHead>
                <TableHead className="w-[8%]">Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && runs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>Loading scrape runs...</TableCell>
                </TableRow>
              ) : runs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>No scrape runs yet.</TableCell>
                </TableRow>
              ) : (
                runs.map((run) => (
                  <TableRow key={run.id} onClick={() => setSelectedRun(run)} className="cursor-pointer">
                    <TableCell>#{run.id}</TableCell>
                    <TableCell className="max-w-0">
                      <div className="truncate" title={run.firm || "-"}>{run.firm || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={run.status === "failed" ? "failed" : run.status === "partial" ? "needs_review" : "live"}>
                        {run.status || "unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">{formatApiDateTime(run.started_at)}</TableCell>
                    <TableCell className="text-xs text-gray-500">{formatApiDateTime(run.finished_at)}</TableCell>
                    <TableCell>{run.jobs_found}</TableCell>
                    <TableCell className={run.errors > 0 ? "text-red-600" : ""}>{run.errors}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="mt-3 flex flex-col gap-3 border-t pt-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>Page {page} / {totalPages}</span>
              <span>{total} runs</span>
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

      {selectedRun && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Run #{selectedRun.id} Logs</CardTitle>
          </CardHeader>
          <CardContent className="max-h-80 space-y-1 overflow-auto rounded-b-xl bg-gray-900 p-4 font-mono text-xs text-gray-100">
            {(selectedRun.logs || []).length > 0 ? (
              selectedRun.logs.map((log, idx) => (
                <div key={idx} className="whitespace-pre-wrap break-words">{log}</div>
              ))
            ) : (
              <div>No logs captured for this run.</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
