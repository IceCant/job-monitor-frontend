import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
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
import { listFirms, runScrape, type Firm } from "../lib/api";

export function Firms() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingFirm, setStartingFirm] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const navigate = useNavigate();

  const totalPages = Math.max(1, Math.ceil(firms.length / pageSize));
  const visibleFirms = firms.slice((page - 1) * pageSize, page * pageSize);

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

  async function runNow(firmKey: string, firmName: string) {
    setStartingFirm(firmKey);
    try {
      const response = await runScrape(firmKey);
      toast.success(response.message || `Scrape started for ${firmName}`, {
        description: "You can leave this page while it runs.",
        action: {
          label: "View runs",
          onClick: () => navigate("/scrape-runs"),
        },
      });
    } catch {
      toast.error(`Could not start scrape for ${firmName}`);
    } finally {
      setStartingFirm(null);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Firms</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[1160px] table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[22%]">Name</TableHead>
                <TableHead className="w-[12%]">Plugin</TableHead>
                <TableHead className="w-[8%]">Active</TableHead>
                <TableHead className="w-[15%]">Last Run</TableHead>
                <TableHead className="w-[15%]">Last Status</TableHead>
                <TableHead className="w-[7%]">Jobs</TableHead>
                <TableHead className="w-[7%]">Removed</TableHead>
                <TableHead className="w-[7%]">Review</TableHead>
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
                      {firm.careers_url ? (
                        <div className="truncate text-xs text-gray-500" title={firm.careers_url}>{firm.careers_url}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-0">
                      <div className="truncate" title={firm.plugin}>{firm.plugin}</div>
                    </TableCell>
                    <TableCell>{firm.active ? "Enabled" : "Disabled"}</TableCell>
                    <TableCell className="max-w-0">
                      <div
                        className="truncate text-xs text-gray-600"
                        title={firm.last_run_at ? new Date(firm.last_run_at).toLocaleString() : "-"}
                      >
                        {firm.last_run_at ? new Date(firm.last_run_at).toLocaleString() : "-"}
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
                        disabled={startingFirm === firm.key}
                        onClick={() => runNow(firm.key, firm.name)}
                      >
                        <Play className="w-4 h-4" /> {startingFirm === firm.key ? "Starting" : "Run"}
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
              <span>{firms.length} firms</span>
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
