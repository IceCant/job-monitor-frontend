import {useEffect, useMemo, useState} from "react";
import {Download, X, ExternalLink, RotateCcw, Search} from "lucide-react";
import {toast} from "sonner";

import {Button} from "../components/ui/button";
import {Badge, type BadgeVariant} from "../components/ui/badge";
import {Card, CardContent} from "../components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "../components/ui/pagination";
import {exportJobs, getJob, listFirms, listJobs, type Firm, type Job} from "../lib/api";

function toBadgeVariant(status: string | null | undefined): BadgeVariant {
    switch ((status || "LIVE").toUpperCase()) {
        case "NEW":
            return "new";
        case "UPDATED":
            return "updated";
        case "REMOVED":
            return "removed";
        case "REPOSTED":
            return "reposted";
        case "NEEDS_REVIEW":
            return "needs_review";
        case "FAILED":
            return "failed";
        default:
            return "live";
    }
}

function formatDate(value: string | null | undefined) {
    return value ? new Date(value).toLocaleString() : "-";
}

export function Jobs() {
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [firms, setFirms] = useState<Firm[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [firm, setFirm] = useState("all");
    const [loading, setLoading] = useState(false);
    const [changedOnly, setChangedOnly] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv");
    const [exportSearch, setExportSearch] = useState("");
    const [exportStatus, setExportStatus] = useState("all");
    const [exportFirm, setExportFirm] = useState("all");
    const [exportChangedOnly, setExportChangedOnly] = useState(false);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const hasFilters = Boolean(search) || status !== "all" || firm !== "all" || changedOnly;

    const params = useMemo(() => {
        const q = new URLSearchParams();
        q.set("page", String(page));
        q.set("page_size", String(pageSize));
        if (search) q.set("search", search);
        if (status !== "all") q.set("status", status);
        if (firm !== "all") q.set("firm", firm);
        if (changedOnly) q.set("changed_only", "true");
        return q;
    }, [changedOnly, firm, page, pageSize, search, status]);

    useEffect(() => {
        listFirms().then(setFirms).catch(() => setFirms([]));
    }, []);

    useEffect(() => {
        setLoading(true);
        listJobs(params)
            .then((res) => {
                setJobs(res.items);
                setTotal(res.total);
            })
            .catch(() => toast.error("Failed to load jobs"))
            .then(() => setLoading(false));
    }, [params]);

    function openExportModal() {
        setExportSearch(search);
        setExportStatus(status);
        setExportFirm(firm);
        setExportChangedOnly(changedOnly);
        setExportOpen(true);
    }

    function clearFilters() {
        setPage(1);
        setSearch("");
        setStatus("all");
        setFirm("all");
        setChangedOnly(false);
    }

    function buildExportParams() {
        const q = new URLSearchParams();
        if (exportSearch) q.set("search", exportSearch);
        if (exportStatus !== "all") q.set("status", exportStatus);
        if (exportFirm !== "all") q.set("firm", exportFirm);
        if (exportChangedOnly) q.set("changed_only", "true");
        return q;
    }

    function handleExport() {
        exportJobs(exportFormat, buildExportParams())
            .then((response) => {
                if (!response.ok) {
                    toast.error("Export failed");
                    return;
                }
                return response.blob().then((blob) => {
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = exportFormat === "csv" ? "jobs.csv" : "jobs.xlsx";
                    link.click();
                    window.URL.revokeObjectURL(url);
                    setExportOpen(false);
                });
            })
            .catch(() => toast.error("Export failed"));
    }

    function openJob(job: Job) {
        setSelectedJob(job);
        getJob(job.id)
            .then(setSelectedJob)
            .catch(() => {
                toast.error("Failed to load full job details");
            });
    }

    return (

        <div className="flex h-full">
            <div className={`min-w-0 flex-1 p-6 ${selectedJob ? "lg:mr-96" : ""} transition-all`}>

                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold">Jobs</h1>
                        <p className="text-sm text-gray-500">{total} total results</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={openExportModal}>
                            <Download className="w-4 h-4"/> Export
                        </Button>
                    </div>
                </div>

                <Card className="overflow-hidden">
                    <CardContent className="pt-6 space-y-3">
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1.4fr)_minmax(150px,0.7fr)_minmax(180px,0.9fr)_minmax(190px,0.8fr)_auto]">
                            <div className="relative min-w-0">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    className="w-full rounded-md border py-2 pl-9 pr-3"
                                    placeholder="Search title, firm, location..."
                                    value={search}
                                    onChange={(e) => {
                                        setPage(1);
                                        setSearch(e.target.value);
                                    }}
                                />
                            </div>
                            <select
                                className="border rounded-md px-3 py-2"
                                value={status}
                                onChange={(e) => {
                                    setPage(1);
                                    setStatus(e.target.value);
                                }}
                            >
                                <option value="all">All statuses</option>
                                <option value="NEW">NEW</option>
                                <option value="LIVE">LIVE</option>
                                <option value="UPDATED">UPDATED</option>
                                <option value="REPOSTED">REPOSTED</option>
                                <option value="NEEDS_REVIEW">NEEDS REVIEW</option>
                                <option value="REMOVED">REMOVED</option>
                            </select>
                            <select
                                className="border rounded-md px-3 py-2"
                                value={firm}
                                onChange={(e) => {
                                    setPage(1);
                                    setFirm(e.target.value);
                                }}
                            >
                                <option value="all">All firms</option>
                                {firms.map((f) => (
                                    <option key={f.key} value={f.key}>{f.name}</option>
                                ))}
                            </select>
                            <label className="flex items-center gap-2 border rounded-md px-3 py-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={changedOnly}
                                    onChange={(e) => {
                                        setPage(1);
                                        setChangedOnly(e.target.checked);
                                    }}
                                />
                                Changed / review only
                            </label>
                            <Button variant="outline" onClick={clearFilters} disabled={!hasFilters}>
                                <RotateCcw className="w-4 h-4" />
                                Clear
                            </Button>
                        </div>

                        <Table className="min-w-[920px] table-fixed">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[18%]">Firm</TableHead>
                                    <TableHead className="w-[37%]">Title</TableHead>
                                    <TableHead className="w-[20%]">Location</TableHead>
                                    <TableHead className="w-[12%]">Status</TableHead>
                                    <TableHead className="w-[13%]">Last Seen</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5}>Loading...</TableCell>
                                    </TableRow>
                                ) : jobs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5}>No jobs found.</TableCell>
                                    </TableRow>
                                ) : (
                                    jobs.map((job) => (
                                        <TableRow key={job.id} onClick={() => openJob(job)} className="cursor-pointer">
                                            <TableCell className="max-w-0">
                                                <div className="truncate" title={job.firm || "-"}>
                                                    {job.firm || "-"}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-0">
                                                {job.job_url ? (
                                                    <a href={job.job_url} target="_blank" rel="noreferrer"
                                                       onClick={(event) => event.stopPropagation()}
                                                       className="block truncate text-blue-600 hover:underline"
                                                       title={job.title || "(Untitled)"}>
                                                        {job.title || "(Untitled)"}
                                                    </a>
                                                ) : (
                                                    <div className="truncate" title={job.title || "(Untitled)"}>
                                                        {job.title || "(Untitled)"}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-0">
                                                <div className="truncate" title={job.location || "-"}>
                                                    {job.location || "-"}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={toBadgeVariant(job.status)}>{job.status || "UNKNOWN"}</Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-gray-500">{formatDate(job.last_seen)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        <div className="flex flex-col gap-3 border-t pt-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                <span>Page {page} / {totalPages}</span>
                                <span>{total} results</span>
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

            {selectedJob && (
                <div
                    className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl overflow-y-auto">
                    <div
                        className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900">Job Details</h2>
                        <button
                            onClick={() => setSelectedJob(null)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5"/>
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        <div>
                            <Badge variant={toBadgeVariant(selectedJob.status)}>{selectedJob.status || "UNKNOWN"}</Badge>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold text-gray-900">{selectedJob.title}</h3>
                            <p className="text-gray-500 mt-1">{selectedJob.firm}</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Location</p>
                                <p className="text-gray-900 mt-1">{selectedJob.location}</p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-gray-500">Practice Area</p>
                                <p className="text-gray-900 mt-1">{selectedJob.practice_area}</p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-gray-500">PQE</p>
                                <p className="text-gray-900 mt-1">{selectedJob.pqe_level}</p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-gray-500">First Seen</p>
                                <p className="text-gray-900 mt-1">{formatDate(selectedJob.first_seen)}</p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-gray-500">Last Seen Live</p>
                                <p className="text-gray-900 mt-1">{formatDate(selectedJob.last_seen)}</p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-gray-500">Removed Date</p>
                                <p className="text-gray-900 mt-1">{formatDate(selectedJob.removed_at)}</p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-gray-500">Reference</p>
                                <p className="text-gray-900 mt-1">{selectedJob.source_reference || "-"}</p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-gray-500">Last Checked</p>
                                <p className="text-gray-900 mt-1">{formatDate(selectedJob.last_checked)}</p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-gray-500">Job URL</p>
                                <a
                                    href={selectedJob.job_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 mt-1 inline-flex items-center gap-1"
                                >
                                    View on careers site
                                    <ExternalLink className="w-4 h-4"/>
                                </a>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-medium text-gray-500">Full Description</p>
                            <p className="text-gray-900 mt-1 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md border bg-gray-50 p-3 text-sm leading-6">{selectedJob.full_description || "-"}</p>
                        </div>

                        {selectedJob.change_history?.length > 0 && (
                            <div className="pt-6 border-t border-gray-200">
                                <h4 className="font-medium text-gray-900 mb-4">Change History</h4>
                                <div className="space-y-4">
                                    {selectedJob.change_history.slice().reverse().map((entry, index) => (
                                        <div key={`${entry.timestamp}-${index}`} className="rounded-lg border p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <Badge variant={toBadgeVariant(entry.event)}>{entry.event}</Badge>
                                                <span className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</span>
                                            </div>
                                            {entry.message ? <p className="text-sm text-gray-700 mt-2">{entry.message}</p> : null}
                                            {entry.changed_fields && Object.keys(entry.changed_fields).length > 0 ? (
                                                <pre className="mt-2 text-xs bg-gray-50 rounded p-2 overflow-x-auto">{JSON.stringify(entry.changed_fields, null, 2)}</pre>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedJob.extra_info && Object.keys(selectedJob.extra_info).length > 0 && (
                            <div className="pt-6 border-t border-gray-200">
                                <h4 className="font-medium text-gray-900 mb-4">Extra Information</h4>
                                <div className="space-y-4">
                                    {Object.keys(selectedJob.extra_info).map((key) => (
                                        <div key={key}>
                                            <p className="text-sm font-medium text-gray-500 capitalize">
                                                {key.replace(/([A-Z])/g, ' $1').trim()}
                                            </p>
                                            <p className="text-gray-900 mt-1">{String(selectedJob.extra_info?.[key])}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Export Jobs</DialogTitle>
                        <DialogDescription>
                            Choose export format and filters.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div>
                            <label className="text-sm text-gray-600">Format</label>
                            <select
                                className="mt-1 w-full border rounded-md px-3 py-2"
                                value={exportFormat}
                                onChange={(e) => setExportFormat(e.target.value as "csv" | "xlsx")}
                            >
                                <option value="csv">CSV</option>
                                <option value="xlsx">Excel (.xlsx)</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-sm text-gray-600">Search</label>
                            <input
                                className="mt-1 w-full border rounded-md px-3 py-2"
                                placeholder="Title, firm, location..."
                                value={exportSearch}
                                onChange={(e) => setExportSearch(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm text-gray-600">Status</label>
                                <select
                                    className="mt-1 w-full border rounded-md px-3 py-2"
                                    value={exportStatus}
                                    onChange={(e) => setExportStatus(e.target.value)}
                                >
                                    <option value="all">All statuses</option>
                                    <option value="NEW">NEW</option>
                                    <option value="LIVE">LIVE</option>
                                    <option value="UPDATED">UPDATED</option>
                                    <option value="REPOSTED">REPOSTED</option>
                                    <option value="NEEDS_REVIEW">NEEDS REVIEW</option>
                                    <option value="REMOVED">REMOVED</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm text-gray-600">Firm</label>
                                <select
                                    className="mt-1 w-full border rounded-md px-3 py-2"
                                    value={exportFirm}
                                    onChange={(e) => setExportFirm(e.target.value)}
                                >
                                    <option value="all">All firms</option>
                                    {firms.map((f) => (
                                        <option key={f.key} value={f.key}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={exportChangedOnly}
                                onChange={(e) => setExportChangedOnly(e.target.checked)}
                            />
                            Changed / review only
                        </label>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setExportOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleExport}>
                            Download
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
