import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { listScrapeRuns, type ScrapeRun } from "../lib/api";

export function ScrapeRuns() {
  const [runs, setRuns] = useState<ScrapeRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<ScrapeRun | null>(null);

  useEffect(() => {
    listScrapeRuns().then((res) => setRuns(res.items)).catch(() => setRuns([]));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Scrape Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Firm</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Finished</TableHead>
                <TableHead>Jobs</TableHead>
                <TableHead>Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id} onClick={() => setSelectedRun(run)}>
                  <TableCell>{run.id}</TableCell>
                  <TableCell>{run.firm}</TableCell>
                  <TableCell>{run.status}</TableCell>
                  <TableCell>{new Date(run.started_at).toLocaleString()}</TableCell>
                  <TableCell>{new Date(run.finished_at).toLocaleString()}</TableCell>
                  <TableCell>{run.jobs_found}</TableCell>
                  <TableCell>{run.errors}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedRun && (
        <Card>
          <CardHeader>
            <CardTitle>Run #{selectedRun.id} Logs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 font-mono text-xs bg-gray-900 text-gray-100 rounded-b-xl">
            {(selectedRun.logs || []).map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
