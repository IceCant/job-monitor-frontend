const API_BASE = import.meta.env.VITE_API_BASE_URL;

export type LoginResponse = {
  access_token: string;
  token_type: string;
  user: { id: number; username: string; role: string };
};

export type DashboardStats = {
  total_firms: number;
  total_live_jobs: number;
  new_jobs_today: number;
  updated_jobs_today: number;
  removed_jobs_today: number;
  failed_sites: number;
  jobs_by_firm: Array<{ name: string; jobs: number }>;
  status_distribution: Array<{ name: string; value: number }>;
  recent_activity: Array<{
    type: string;
    firm: string;
    title: string;
    time: string;
    jobs_found: number;
    errors: number;
  }>;
};

export type Job = {
  id: number;
  firm_key: string | null;
  firm: string | null;
  title: string | null;
  location: string | null;
  practice_area: string | null;
  pqe_level: string | null;
  status: string | null;
  job_url: string | null;
  source_reference: string | null;
  first_seen: string | null;
  last_seen: string | null;
  last_checked: string | null;
  removed_at: string | null;
  full_description: string | null;
  change_history: Array<{
    timestamp: string;
    event: string;
    message: string | null;
    changed_fields: Record<string, unknown> | null;
    snapshot: Record<string, unknown> | null;
  }>;
  extra_info: Record<string, unknown> | null;
};

export type JobList = {
  items: Job[];
  total: number;
  page: number;
  page_size: number;
};

export type Firm = {
  key: string;
  name: string;
  careers_url: string | null;
  plugin: string;
  plugin_config: Record<string, unknown>;
  active: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  last_error: string | null;
  total_jobs: number;
  removed_jobs: number;
  needs_review_jobs: number;
};

export type ScrapeRun = {
  id: number;
  firm_key: string | null;
  firm: string;
  started_at: string | null;
  finished_at: string | null;
  status: "success" | "failed" | "partial" | string | null;
  jobs_found: number;
  errors: number;
  error_message: string | null;
  logs: string[];
};

export type ScrapeRunList = {
  items: ScrapeRun[];
  total: number;
  page: number;
  page_size: number;
};

export type ScheduleSettings = {
  enabled: boolean;
  interval_hours: number;
};

export type ScrapeStart = {
  accepted: boolean;
  message: string;
  run_id: string | null;
  firm_key: string | null;
};

export type ScrapeProgress = {
  run_id: string;
  status: string;
  label: string;
  firm_key: string | null;
  current_firm: string | null;
  current_firm_percent: number;
  current_firm_stage: string | null;
  total_firms: number;
  completed_firms: number;
  percent: number;
  jobs_found: number;
  errors: number;
  message: string | null;
  logs: string[];
  started_at: string;
  updated_at: string;
  finished_at: string | null;
};

export type PluginInfo = {
  key: string;
  name: string;
  class_name: string;
  enabled: boolean;
  careers_url: string | null;
  description: string;
  required_config: string[];
  default_config: Record<string, unknown>;
};

export type PluginTestResult = {
  plugin_key: string;
  firm_name: string;
  count: number;
  elapsed_ms: number;
  items: Array<Record<string, unknown>>;
  raw_json: string;
};

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  return fetch(`${API_BASE}${path}`, { ...init, headers }).then((response) => {
    if (!response.ok) {
      return response.text().then((body) => {
        throw new Error(body || `Request failed (${response.status})`);
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  });
}

export function login(username: string, password: string) {
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function me() {
  return request<LoginResponse["user"]>("/api/auth/me");
}

export function getDashboard() {
  return request<DashboardStats>("/api/dashboard");
}

export function listJobs(params: URLSearchParams) {
  return request<JobList>(`/api/jobs?${params.toString()}`);
}

export function listFirms() {
  return request<Firm[]>("/api/firms");
}

export function runScrape(firmKey?: string) {
  return request<ScrapeStart>("/api/scraper/run", {
    method: "POST",
    body: JSON.stringify({ firm_key: firmKey ?? null }),
  });
}

export function getScrapeProgress(runId: string) {
  return request<ScrapeProgress>(`/api/scraper/progress/${runId}`);
}

export function subscribeScrapeProgress(
  runId: string,
  onProgress: (progress: ScrapeProgress) => void,
  onError?: (error: unknown) => void,
) {
  const controller = new AbortController();
  let closed = false;
  let fallbackTimer: number | null = null;
  let terminalReceived = false;

  function close() {
    closed = true;
    controller.abort();
    if (fallbackTimer !== null) {
      window.clearInterval(fallbackTimer);
      fallbackTimer = null;
    }
  }

  function startFallback() {
    if (closed || fallbackTimer !== null) return;

    const load = async () => {
      try {
        const progress = await getScrapeProgress(runId);
        if (closed) return;
        onProgress(progress);
        if (["success", "failed", "partial"].includes(progress.status)) {
          terminalReceived = true;
          close();
        }
      } catch (error) {
        onError?.(error);
        close();
      }
    };

    load();
    fallbackTimer = window.setInterval(load, 5000);
  }

  async function stream() {
    try {
      const headers = new Headers();
      if (authToken) {
        headers.set("Authorization", `Bearer ${authToken}`);
      }

      const response = await fetch(`${API_BASE}/api/scraper/progress/${runId}/stream`, {
        headers,
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Progress stream failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!closed) {
        const {done, value} = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, {stream: true});
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const data = event
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");
          if (!data) continue;

          const progress = JSON.parse(data) as ScrapeProgress;
          onProgress(progress);
          if (["success", "failed", "partial"].includes(progress.status)) {
            terminalReceived = true;
            close();
            return;
          }
        }
      }

      if (!closed && !terminalReceived) {
        startFallback();
      }
    } catch (error) {
      if (closed) return;
      startFallback();
    }
  }

  stream();
  return close;
}

export function listPlugins() {
  return request<PluginInfo[]>("/api/scraper/plugins");
}

export function testPlugin(payload: {
  plugin_key: string;
  config: Record<string, unknown>;
  firm_name?: string | null;
  limit: number;
}) {
  return request<PluginTestResult>("/api/scraper/dev/test-plugin", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export const getJob = (jobId: number) => request<Job>(`/api/jobs/${jobId}`);

export function listScrapeRuns(page = 1, pageSize = 20) {
  return request<ScrapeRunList>(`/api/scraper/runs?page=${page}&page_size=${pageSize}`);
}

export function getSchedule() {
  return request<ScheduleSettings>("/api/scraper/schedule");
}

export function updateSchedule(payload: ScheduleSettings) {
  return request<ScheduleSettings>("/api/scraper/schedule", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function exportJobs(format: "csv" | "xlsx", filters: URLSearchParams) {
  const params = new URLSearchParams(filters);
  params.set("format", format);
  const url = `${API_BASE}/api/jobs/export?${params.toString()}`;

  const headers = new Headers();
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  return fetch(url, { headers });
}
