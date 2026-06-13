import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
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
    toast.info(`Running scrape for ${firmName}...`);
    try {
      await runScrape(firmKey);
      toast.success(`Scrape complete for ${firmName}`);
      loadFirms();
    } catch {
      toast.error(`Scrape failed for ${firmName}`);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Firms</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Plugin</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Last Status</TableHead>
                <TableHead>Total Jobs</TableHead>
                <TableHead>Removed</TableHead>
                <TableHead>Needs Review</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10}>Loading...</TableCell>
                </TableRow>
              ) : (
                firms.map((firm) => (
                  <TableRow key={firm.key}>
                    <TableCell>{firm.name}</TableCell>
                    <TableCell>{firm.plugin}</TableCell>
                    <TableCell>{firm.active ? "Enabled" : "Disabled"}</TableCell>
                    <TableCell>
                      {firm.last_run_at ? new Date(firm.last_run_at).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell>
                      <div>{firm.last_run_status || "-"}</div>
                      {firm.last_error ? <div className="text-xs text-red-600">{firm.last_error}</div> : null}
                    </TableCell>
                    <TableCell>{firm.total_jobs}</TableCell>
                    <TableCell>{firm.removed_jobs}</TableCell>
                    <TableCell>{firm.needs_review_jobs}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => runNow(firm.key, firm.name)}>
                        <Play className="w-4 h-4" /> Run
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
