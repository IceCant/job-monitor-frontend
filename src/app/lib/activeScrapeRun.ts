const ACTIVE_SCRAPE_RUN_ID = "jobmonitor.activeScrapeRunId";
const ACTIVE_SCRAPE_RUN_CHANGED = "jobmonitor.activeScrapeRunChanged";

export function getActiveScrapeRunId() {
  return window.localStorage.getItem(ACTIVE_SCRAPE_RUN_ID);
}

export function saveActiveScrapeRunId(runId: string) {
  window.localStorage.setItem(ACTIVE_SCRAPE_RUN_ID, runId);
  window.dispatchEvent(new Event(ACTIVE_SCRAPE_RUN_CHANGED));
}

export function clearActiveScrapeRunId(runId?: string | null) {
  const current = getActiveScrapeRunId();
  if (!runId || current === runId) {
    window.localStorage.removeItem(ACTIVE_SCRAPE_RUN_ID);
    window.dispatchEvent(new Event(ACTIVE_SCRAPE_RUN_CHANGED));
  }
}

export function listenForActiveScrapeRunChange(callback: () => void) {
  window.addEventListener(ACTIVE_SCRAPE_RUN_CHANGED, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ACTIVE_SCRAPE_RUN_CHANGED, callback);
    window.removeEventListener("storage", callback);
  };
}
