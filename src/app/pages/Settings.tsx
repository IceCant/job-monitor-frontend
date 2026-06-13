import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { getSchedule, updateSchedule } from "../lib/api";

export function Settings() {
  const [enabled, setEnabled] = useState(true);
  const [intervalHours, setIntervalHours] = useState(6);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSchedule()
      .then((s) => {
        setEnabled(s.enabled);
        setIntervalHours(s.interval_hours);
      })
      .catch(() => toast.error("Failed to load schedule settings"));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateSchedule({ enabled, interval_hours: Math.max(1, intervalHours) });
      setEnabled(updated.enabled);
      setIntervalHours(updated.interval_hours);
      toast.success("Schedule updated");
    } catch {
      toast.error("Failed to update schedule");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Auto Scrape Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Enable scheduled scraping
          </label>

          <div className="max-w-sm">
            <label className="block text-sm mb-1">Run every N hours</label>
            <input
              type="number"
              min={1}
              className="w-full border rounded-md px-3 py-2"
              value={intervalHours}
              onChange={(e) => setIntervalHours(Number(e.target.value) || 1)}
            />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save schedule"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
