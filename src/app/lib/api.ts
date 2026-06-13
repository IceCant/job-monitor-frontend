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
  started_at: string;
  finished_at: string;
  status: "success" | "failed" | "partial";
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

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
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
  return request<ScrapeRun>("/api/scraper/run", {
    method: "POST",
    body: JSON.stringify({ firm_key: firmKey ?? null }),
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


