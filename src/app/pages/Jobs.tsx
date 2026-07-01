import {useEffect, useMemo, useState} from "react";
import type {MouseEvent} from "react";
import {AlertTriangle, CheckCircle, Download, ExternalLink, Filter, Plus, RotateCcw, Search, Trash2, X} from "lucide-react";
import {toast} from "sonner";
import {
    Box,
    Button,
    Card,
    Checkbox,
    Chip,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    Drawer,
    FormControl,
    FormControlLabel,
    IconButton,
    InputAdornment,
    InputLabel,
    Link as MuiLink,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TableSortLabel,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";

import {exportJobs, getJob, listFirms, listJobs, markJobReviewed, type Firm, type Job} from "../lib/api";
import {formatApiDateTime} from "../lib/dates";

const statusOptions = ["NEW", "LIVE", "UPDATED", "REPOSTED", "NEEDS_REVIEW", "REMOVED"];
type SortKey = "firm" | "title" | "location" | "status" | "last_seen";
type SortDirection = "asc" | "desc";
type DatePreset = "all" | "found_today" | "found_morning" | "checked_today" | "checked_morning" | "removed_today" | "removed_morning";
type ExportConditionOperator =
    | "contains"
    | "not_contains"
    | "equals"
    | "not_equals"
    | "starts_with"
    | "ends_with"
    | "is_empty"
    | "is_not_empty"
    | "before"
    | "after"
    | "on_or_before"
    | "on_or_after";
type ExportFieldType = "text" | "date";
type ExportFieldFilter = {
    id: string;
    field: string;
    operator: ExportConditionOperator;
    value: string;
};

const jobColumns: Array<{ key: SortKey; label: string; width: string }> = [
    {key: "firm", label: "Firm", width: "18%"},
    {key: "title", label: "Title", width: "37%"},
    {key: "location", label: "Location", width: "20%"},
    {key: "status", label: "Status", width: "12%"},
    {key: "last_seen", label: "Last Seen", width: "13%"},
];

const datePresetOptions: Array<{ value: DatePreset; label: string }> = [
    {value: "all", label: "All dates"},
    {value: "found_today", label: "New/found today"},
    {value: "found_morning", label: "New/found this morning"},
    {value: "checked_today", label: "Scraped/checked today"},
    {value: "checked_morning", label: "Scraped/checked this morning"},
    {value: "removed_today", label: "Removed today"},
    {value: "removed_morning", label: "Removed this morning"},
];

const exportFields: Array<{ key: string; label: string; type: ExportFieldType }> = [
    {key: "firm", label: "Firm", type: "text"},
    {key: "title", label: "Title", type: "text"},
    {key: "location", label: "Location", type: "text"},
    {key: "practice_area", label: "Practice Area", type: "text"},
    {key: "pqe_level", label: "PQE", type: "text"},
    {key: "status", label: "Status", type: "text"},
    {key: "source_reference", label: "Reference", type: "text"},
    {key: "job_url", label: "URL", type: "text"},
    {key: "full_description", label: "Description", type: "text"},
    {key: "first_seen", label: "First Seen", type: "date"},
    {key: "last_seen", label: "Last Seen", type: "date"},
    {key: "last_checked", label: "Last Checked", type: "date"},
    {key: "removed_at", label: "Removed Date", type: "date"},
];

const textConditionOptions: Array<{ value: ExportConditionOperator; label: string; needsValue: boolean }> = [
    {value: "contains", label: "contains", needsValue: true},
    {value: "not_contains", label: "does not contain", needsValue: true},
    {value: "equals", label: "equals", needsValue: true},
    {value: "not_equals", label: "does not equal", needsValue: true},
    {value: "starts_with", label: "starts with", needsValue: true},
    {value: "ends_with", label: "ends with", needsValue: true},
    {value: "is_empty", label: "is empty", needsValue: false},
    {value: "is_not_empty", label: "is not empty", needsValue: false},
];

const dateConditionOptions: Array<{ value: ExportConditionOperator; label: string; needsValue: boolean }> = [
    {value: "equals", label: "is on", needsValue: true},
    {value: "not_equals", label: "is not on", needsValue: true},
    {value: "before", label: "is before", needsValue: true},
    {value: "after", label: "is after", needsValue: true},
    {value: "on_or_before", label: "is on/before", needsValue: true},
    {value: "on_or_after", label: "is on/after", needsValue: true},
    {value: "is_empty", label: "is empty", needsValue: false},
    {value: "is_not_empty", label: "is not empty", needsValue: false},
];

function exportFieldType(field: string): ExportFieldType {
    return exportFields.find((item) => item.key === field)?.type || "text";
}

function exportConditionOptions(field: string) {
    return exportFieldType(field) === "date" ? dateConditionOptions : textConditionOptions;
}

function exportConditionNeedsValue(field: string, operator: ExportConditionOperator) {
    return exportConditionOptions(field).find((item) => item.value === operator)?.needsValue ?? true;
}

function newExportFieldFilter(): ExportFieldFilter {
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        field: "title",
        operator: "contains",
        value: "",
    };
}

function toDatetimeLocalValue(date: Date) {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function todayRange(hourTo = 24) {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setHours(hourTo, 0, 0, 0);
    return {
        from: toDatetimeLocalValue(from),
        to: toDatetimeLocalValue(to),
    };
}

function statusChipSx(status: string | null | undefined) {
    switch ((status || "LIVE").toUpperCase()) {
        case "NEW":
            return {bgcolor: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe"};
        case "UPDATED":
            return {bgcolor: "#fef3c7", color: "#92400e", borderColor: "#fde68a"};
        case "REMOVED":
            return {bgcolor: "#fee2e2", color: "#991b1b", borderColor: "#fecaca"};
        case "REPOSTED":
            return {bgcolor: "#dcfce7", color: "#166534", borderColor: "#bbf7d0"};
        case "NEEDS_REVIEW":
            return {bgcolor: "#fff7ed", color: "#9a3412", borderColor: "#fed7aa"};
        case "FAILED":
            return {bgcolor: "#fee2e2", color: "#991b1b", borderColor: "#fecaca"};
        default:
            return {bgcolor: "#f1f5f9", color: "#334155", borderColor: "#e2e8f0"};
    }
}

function DetailField({label, value}: { label: string; value: string | null | undefined }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary" sx={{fontWeight: 600}}>
                {label}
            </Typography>
            <Typography variant="body2" color="text.primary" sx={{mt: 0.25, overflowWrap: "anywhere"}}>
                {value || "-"}
            </Typography>
        </Box>
    );
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
    const [datePreset, setDatePreset] = useState<DatePreset>("all");
    const [firstSeenFrom, setFirstSeenFrom] = useState("");
    const [firstSeenTo, setFirstSeenTo] = useState("");
    const [checkedFrom, setCheckedFrom] = useState("");
    const [checkedTo, setCheckedTo] = useState("");
    const [removedFrom, setRemovedFrom] = useState("");
    const [removedTo, setRemovedTo] = useState("");
    const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
    const [sortBy, setSortBy] = useState<SortKey>("last_seen");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [exportOpen, setExportOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv");
    const [exportSearch, setExportSearch] = useState("");
    const [exportStatuses, setExportStatuses] = useState<string[]>([]);
    const [exportFirms, setExportFirms] = useState<string[]>([]);
    const [exportChangedOnly, setExportChangedOnly] = useState(false);
    const [exportFieldFilters, setExportFieldFilters] = useState<ExportFieldFilter[]>([]);
    const [reviewingJob, setReviewingJob] = useState(false);

    const hasDateFilters = Boolean(firstSeenFrom || firstSeenTo || checkedFrom || checkedTo || removedFrom || removedTo);
    const hasFilters = Boolean(search) || status !== "all" || firm !== "all" || changedOnly || hasDateFilters;
    const firmCareersUrlByKey = useMemo(() => {
        const lookup = new Map<string, string>();
        firms.forEach((item) => {
            if (item.careers_url) lookup.set(item.key, item.careers_url);
        });
        return lookup;
    }, [firms]);
    const firmCareersUrlByName = useMemo(() => {
        const lookup = new Map<string, string>();
        firms.forEach((item) => {
            if (item.name && item.careers_url) lookup.set(item.name.toLowerCase(), item.careers_url);
        });
        return lookup;
    }, [firms]);
    const needsReviewTotal = useMemo(
        () => firms.reduce((sum, item) => sum + (item.needs_review_jobs || 0), 0),
        [firms],
    );

    const params = useMemo(() => {
        const q = new URLSearchParams();
        q.set("page", String(page));
        q.set("page_size", String(pageSize));
        if (search) q.set("search", search);
        if (status !== "all") q.set("status", status);
        if (firm !== "all") q.set("firm", firm);
        if (changedOnly) q.set("changed_only", "true");
        if (firstSeenFrom) q.set("first_seen_from", firstSeenFrom);
        if (firstSeenTo) q.set("first_seen_to", firstSeenTo);
        if (checkedFrom) q.set("checked_from", checkedFrom);
        if (checkedTo) q.set("checked_to", checkedTo);
        if (removedFrom) q.set("removed_from", removedFrom);
        if (removedTo) q.set("removed_to", removedTo);
        q.set("sort_by", sortBy);
        q.set("sort_direction", sortDirection);
        return q;
    }, [changedOnly, checkedFrom, checkedTo, firm, firstSeenFrom, firstSeenTo, page, pageSize, removedFrom, removedTo, search, sortBy, sortDirection, status]);

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
            .finally(() => setLoading(false));
    }, [params]);

    function openExportModal() {
        setExportSearch(search);
        setExportStatuses(status === "all" ? [] : [status]);
        setExportFirms(firm === "all" ? [] : [firm]);
        setExportChangedOnly(changedOnly);
        setExportOpen(true);
    }

    function clearFilters() {
        setPage(1);
        setSearch("");
        setStatus("all");
        setFirm("all");
        setChangedOnly(false);
        setDatePreset("all");
        setFirstSeenFrom("");
        setFirstSeenTo("");
        setCheckedFrom("");
        setCheckedTo("");
        setRemovedFrom("");
        setRemovedTo("");
    }

    function buildExportParams() {
        const q = new URLSearchParams();
        if (exportSearch) q.set("search", exportSearch);
        exportStatuses.forEach((item) => q.append("status", item));
        exportFirms.forEach((item) => q.append("firm", item));
        if (exportChangedOnly) q.set("changed_only", "true");
        if (firstSeenFrom) q.set("first_seen_from", firstSeenFrom);
        if (firstSeenTo) q.set("first_seen_to", firstSeenTo);
        if (checkedFrom) q.set("checked_from", checkedFrom);
        if (checkedTo) q.set("checked_to", checkedTo);
        if (removedFrom) q.set("removed_from", removedFrom);
        if (removedTo) q.set("removed_to", removedTo);
        const cleanFieldFilters = exportFieldFilters
            .filter((item) => item.field && item.operator)
            .filter((item) => !exportConditionNeedsValue(item.field, item.operator) || item.value.trim())
            .map((item) => ({
                field: item.field,
                operator: item.operator,
                value: item.value.trim(),
            }));
        if (cleanFieldFilters.length > 0) {
            q.set("field_filters", JSON.stringify(cleanFieldFilters));
        }
        q.set("sort_by", sortBy);
        q.set("sort_direction", sortDirection);
        return q;
    }

    function applyDatePreset(nextPreset: DatePreset) {
        setPage(1);
        setDatePreset(nextPreset);
        setFirstSeenFrom("");
        setFirstSeenTo("");
        setCheckedFrom("");
        setCheckedTo("");
        setRemovedFrom("");
        setRemovedTo("");

        if (nextPreset === "all") return;

        const range = todayRange(nextPreset.endsWith("_morning") ? 12 : 24);
        if (nextPreset.startsWith("found_")) {
            setFirstSeenFrom(range.from);
            setFirstSeenTo(range.to);
            return;
        }
        if (nextPreset.startsWith("checked_")) {
            setCheckedFrom(range.from);
            setCheckedTo(range.to);
            return;
        }
        if (nextPreset.startsWith("removed_")) {
            setRemovedFrom(range.from);
            setRemovedTo(range.to);
        }
    }

    function clearDateFilters() {
        setPage(1);
        setDatePreset("all");
        setFirstSeenFrom("");
        setFirstSeenTo("");
        setCheckedFrom("");
        setCheckedTo("");
        setRemovedFrom("");
        setRemovedTo("");
    }

    function updateExportFieldFilter(id: string, updates: Partial<ExportFieldFilter>) {
        setExportFieldFilters((filters) => filters.map((item) => {
            if (item.id !== id) return item;
            const next = {...item, ...updates};
            if (updates.field) {
                next.operator = exportFieldType(updates.field) === "date" ? "equals" : "contains";
                next.value = "";
            }
            if (updates.operator && !exportConditionNeedsValue(next.field, updates.operator)) {
                next.value = "";
            }
            return next;
        }));
    }

    function updateSort(nextSortBy: SortKey) {
        setPage(1);
        if (nextSortBy === sortBy) {
            setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
            return;
        }

        setSortBy(nextSortBy);
        setSortDirection(nextSortBy === "last_seen" ? "desc" : "asc");
    }

    async function handleExport() {
        try {
            const response = await exportJobs(exportFormat, buildExportParams());
            if (!response.ok) {
                toast.error("Export failed");
                return;
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = exportFormat === "csv" ? "jobs.csv" : "jobs.xlsx";
            link.click();
            window.URL.revokeObjectURL(url);
            setExportOpen(false);
        } catch {
            toast.error("Export failed");
        }
    }

    function openJob(job: Job) {
        setSelectedJob(job);
        getJob(job.id)
            .then(setSelectedJob)
            .catch(() => toast.error("Failed to load full job details"));
    }

    async function handleMarkReviewed() {
        if (!selectedJob || selectedJob.status !== "NEEDS_REVIEW") return;

        setReviewingJob(true);
        try {
            const reviewed = await markJobReviewed(selectedJob.id);
            setSelectedJob(reviewed);
            const refreshed = await listJobs(params);
            setJobs(refreshed.items);
            setTotal(refreshed.total);
            toast.success("Job marked as reviewed");
        } catch {
            toast.error("Failed to mark job as reviewed");
        } finally {
            setReviewingJob(false);
        }
    }

    function firmCareersUrl(job: Job) {
        if (job.firm_key) {
            const byKey = firmCareersUrlByKey.get(job.firm_key);
            if (byKey) return byKey;
        }
        if (job.firm) {
            return firmCareersUrlByName.get(job.firm.toLowerCase()) || null;
        }
        return null;
    }

    function stopRowClick(event: MouseEvent) {
        event.stopPropagation();
    }

    function renderFirmLink(job: Job, noWrap = true) {
        const url = firmCareersUrl(job);
        const label = job.firm || "-";
        if (!url || label === "-") {
            return <Typography variant="body2" noWrap={noWrap}>{label}</Typography>;
        }

        return (
            <MuiLink
                href={url}
                target="_blank"
                rel="noreferrer"
                underline="hover"
                variant="body2"
                noWrap={noWrap}
                onClick={stopRowClick}
                sx={{display: "block", fontWeight: 600, overflowWrap: noWrap ? undefined : "anywhere"}}
            >
                {label}
            </MuiLink>
        );
    }

    function renderJobTitle(job: Job, noWrap = true) {
        const label = job.title || "(Untitled)";
        return (
            <Typography
                variant="body2"
                noWrap={noWrap}
                sx={{fontWeight: 700, minWidth: 0, overflowWrap: noWrap ? undefined : "anywhere"}}
            >
                {label}
            </Typography>
        );
    }

    return (
        <Box sx={{p: {xs: 1.5, md: 3}, minWidth: 0}}>
            <Stack direction={{xs: "column", sm: "row"}} justifyContent="space-between" spacing={2} sx={{mb: 3}}>
                <Box>
                    <Typography variant="h5" sx={{fontWeight: 700}}>Jobs</Typography>
                    <Typography variant="body2" color="text.secondary">{total} total results</Typography>
                </Box>
                <Stack direction={{xs: "column", sm: "row"}} spacing={1}>
                    <Button
                        variant={status === "NEEDS_REVIEW" ? "contained" : "outlined"}
                        color="warning"
                        startIcon={<AlertTriangle size={16}/>}
                        onClick={() => {
                            setPage(1);
                            setStatus("NEEDS_REVIEW");
                            setChangedOnly(false);
                        }}
                    >
                        Needs Review{needsReviewTotal ? ` (${needsReviewTotal})` : ""}
                    </Button>
                    <Button variant="outlined" startIcon={<Download size={16}/>} onClick={openExportModal}>
                        Export
                    </Button>
                </Stack>
            </Stack>

            <Card variant="outlined" sx={{borderRadius: 2, overflow: "hidden"}}>
                <Box sx={{p: 2.5, borderBottom: 1, borderColor: "divider"}}>
                    <Box
                        sx={{
                            display: "grid",
                            gap: 1.5,
                            gridTemplateColumns: {
                                xs: "1fr",
                                lg: "minmax(260px, 1.4fr) minmax(150px, .7fr) minmax(180px, .9fr) minmax(190px, .8fr) auto auto",
                            },
                            alignItems: "center",
                        }}
                    >
                        <TextField
                            size="small"
                            placeholder="Search title, firm, location..."
                            value={search}
                            onChange={(event) => {
                                setPage(1);
                                setSearch(event.target.value);
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search size={17}/>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <FormControl size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                label="Status"
                                value={status}
                                onChange={(event) => {
                                    setPage(1);
                                    setStatus(event.target.value);
                                }}
                            >
                                <MenuItem value="all">All statuses</MenuItem>
                                {statusOptions.map((item) => (
                                    <MenuItem key={item} value={item}>{item.replace("_", " ")}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small">
                            <InputLabel>Firm</InputLabel>
                            <Select
                                label="Firm"
                                value={firm}
                                onChange={(event) => {
                                    setPage(1);
                                    setFirm(event.target.value);
                                }}
                            >
                                <MenuItem value="all">All firms</MenuItem>
                                {firms.map((item) => (
                                    <MenuItem key={item.key} value={item.key}>{item.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={changedOnly}
                                    onChange={(event) => {
                                        setPage(1);
                                        setChangedOnly(event.target.checked);
                                    }}
                                />
                            }
                            label="Changed / review only"
                            sx={{
                                m: 0,
                                minHeight: 40,
                                border: 1,
                                borderColor: "divider",
                                borderRadius: 1,
                                px: 1,
                                ".MuiFormControlLabel-label": {fontSize: 14},
                            }}
                        />
                        <Button
                            variant={advancedFiltersOpen || hasDateFilters ? "contained" : "outlined"}
                            startIcon={<Filter size={16}/>}
                            onClick={() => setAdvancedFiltersOpen((open) => !open)}
                        >
                            Advanced{hasDateFilters ? " active" : ""}
                        </Button>
                        <Button variant="outlined" startIcon={<RotateCcw size={16}/>} disabled={!hasFilters} onClick={clearFilters}>
                            Clear
                        </Button>
                    </Box>
                    <Collapse in={advancedFiltersOpen} timeout="auto" unmountOnExit>
                        <Box sx={{mt: 1.5, borderRadius: 1, border: 1, borderColor: "divider", bgcolor: "#f8fafc", p: 1.5}}>
                            <Stack direction={{xs: "column", sm: "row"}} justifyContent="space-between" alignItems={{xs: "stretch", sm: "center"}} spacing={1.5} sx={{mb: 1.5}}>
                                <Box>
                                    <Typography variant="subtitle2" sx={{fontWeight: 700}}>Advanced date filters</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Filter jobs by first found date, last scrape/check date, or removed date.
                                    </Typography>
                                </Box>
                                <Button variant="outlined" size="small" disabled={!hasDateFilters} onClick={clearDateFilters}>
                                    Clear dates
                                </Button>
                            </Stack>
                            <Stack spacing={1.5}>
                                <FormControl size="small" sx={{maxWidth: {sm: 320}}}>
                                    <InputLabel>Quick preset</InputLabel>
                                    <Select
                                        label="Quick preset"
                                        value={datePreset}
                                        onChange={(event) => applyDatePreset(event.target.value as DatePreset)}
                                    >
                                        {datePresetOptions.map((item) => (
                                            <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Box
                                    sx={{
                                        display: "grid",
                                        gap: 1.25,
                                        gridTemplateColumns: {xs: "1fr", md: "150px minmax(180px, 1fr) minmax(180px, 1fr)"},
                                        alignItems: "center",
                                    }}
                                >
                                    <Box>
                                        <Typography variant="body2" sx={{fontWeight: 700}}>Found / new</Typography>
                                        <Typography variant="caption" color="text.secondary">First seen date</Typography>
                                    </Box>
                                    <TextField
                                        size="small"
                                        label="From"
                                        type="datetime-local"
                                        value={firstSeenFrom}
                                        InputLabelProps={{shrink: true}}
                                        onChange={(event) => {
                                            setPage(1);
                                            setDatePreset("all");
                                            setFirstSeenFrom(event.target.value);
                                        }}
                                    />
                                    <TextField
                                        size="small"
                                        label="To"
                                        type="datetime-local"
                                        value={firstSeenTo}
                                        InputLabelProps={{shrink: true}}
                                        onChange={(event) => {
                                            setPage(1);
                                            setDatePreset("all");
                                            setFirstSeenTo(event.target.value);
                                        }}
                                    />
                                    <Box>
                                        <Typography variant="body2" sx={{fontWeight: 700}}>Scraped</Typography>
                                        <Typography variant="caption" color="text.secondary">Last checked date</Typography>
                                    </Box>
                                    <TextField
                                        size="small"
                                        label="From"
                                        type="datetime-local"
                                        value={checkedFrom}
                                        InputLabelProps={{shrink: true}}
                                        onChange={(event) => {
                                            setPage(1);
                                            setDatePreset("all");
                                            setCheckedFrom(event.target.value);
                                        }}
                                    />
                                    <TextField
                                        size="small"
                                        label="To"
                                        type="datetime-local"
                                        value={checkedTo}
                                        InputLabelProps={{shrink: true}}
                                        onChange={(event) => {
                                            setPage(1);
                                            setDatePreset("all");
                                            setCheckedTo(event.target.value);
                                        }}
                                    />
                                    <Box>
                                        <Typography variant="body2" sx={{fontWeight: 700}}>Removed</Typography>
                                        <Typography variant="caption" color="text.secondary">Removed date</Typography>
                                    </Box>
                                    <TextField
                                        size="small"
                                        label="From"
                                        type="datetime-local"
                                        value={removedFrom}
                                        InputLabelProps={{shrink: true}}
                                        onChange={(event) => {
                                            setPage(1);
                                            setDatePreset("all");
                                            setRemovedFrom(event.target.value);
                                        }}
                                    />
                                    <TextField
                                        size="small"
                                        label="To"
                                        type="datetime-local"
                                        value={removedTo}
                                        InputLabelProps={{shrink: true}}
                                        onChange={(event) => {
                                            setPage(1);
                                            setDatePreset("all");
                                            setRemovedTo(event.target.value);
                                        }}
                                    />
                                </Box>
                            </Stack>
                        </Box>
                    </Collapse>
                </Box>

                <Box sx={{display: {xs: "block", md: "none"}, p: 1.5}}>
                    {loading ? (
                        <Typography variant="body2" color="text.secondary">Loading jobs...</Typography>
                    ) : jobs.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No jobs found.</Typography>
                    ) : (
                        <Stack spacing={1.25}>
                            {jobs.map((job) => (
                                <Paper
                                    key={job.id}
                                    variant="outlined"
                                    onClick={() => openJob(job)}
                                    sx={{p: 1.5, borderRadius: 2, cursor: "pointer"}}
                                >
                                    <Stack spacing={1}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                            <Box sx={{minWidth: 0}}>
                                                {renderJobTitle(job, false)}
                                                {renderFirmLink(job, false)}
                                            </Box>
                                            <Chip
                                                size="small"
                                                label={job.status || "UNKNOWN"}
                                                variant="outlined"
                                                sx={{fontWeight: 700, flexShrink: 0, ...statusChipSx(job.status)}}
                                            />
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary">
                                            {job.location || "-"}
                                        </Typography>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                            <Typography variant="caption" color="text.secondary">
                                                Last seen {formatApiDateTime(job.last_seen)}
                                            </Typography>
                                            {job.job_url ? (
                                                <IconButton
                                                    size="small"
                                                    component="a"
                                                    href={job.job_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    onClick={stopRowClick}
                                                >
                                                    <ExternalLink size={15}/>
                                                </IconButton>
                                            ) : null}
                                        </Stack>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </Box>

                <TableContainer sx={{display: {xs: "none", md: "block"}, maxHeight: "calc(100vh - 300px)", minHeight: 360}}>
                    <Table stickyHeader size="small" sx={{tableLayout: "fixed", minWidth: 980}}>
                        <TableHead>
                            <TableRow>
                                {jobColumns.map((column) => (
                                    <TableCell
                                        key={column.key}
                                        sortDirection={sortBy === column.key ? sortDirection : false}
                                        sx={{width: column.width, fontWeight: 700}}
                                    >
                                        <TableSortLabel
                                            active={sortBy === column.key}
                                            direction={sortBy === column.key ? sortDirection : "asc"}
                                            onClick={() => updateSort(column.key)}
                                        >
                                            {column.label}
                                        </TableSortLabel>
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5}>Loading jobs...</TableCell>
                                </TableRow>
                            ) : jobs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5}>No jobs found.</TableCell>
                                </TableRow>
                            ) : jobs.map((job) => (
                                <TableRow
                                    key={job.id}
                                    hover
                                    onClick={() => openJob(job)}
                                    sx={{cursor: "pointer"}}
                                >
                                    <TableCell>
                                        <Tooltip title={job.firm || "-"} placement="top-start">
                                            {renderFirmLink(job)}
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{minWidth: 0}}>
                                            <Tooltip title={job.title || "(Untitled)"} placement="top-start">
                                                {renderJobTitle(job)}
                                            </Tooltip>
                                            {job.job_url ? (
                                                <Tooltip title="Open job posting">
                                                    <IconButton
                                                        size="small"
                                                        component="a"
                                                        href={job.job_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={stopRowClick}
                                                    >
                                                        <ExternalLink size={15}/>
                                                    </IconButton>
                                                </Tooltip>
                                            ) : null}
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip title={job.location || "-"} placement="top-start">
                                            <Typography variant="body2" noWrap>{job.location || "-"}</Typography>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={job.status || "UNKNOWN"}
                                            variant="outlined"
                                            sx={{fontWeight: 700, ...statusChipSx(job.status)}}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" color="text.secondary" noWrap component="div">
                                            {formatApiDateTime(job.last_seen)}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={total}
                    page={page - 1}
                    rowsPerPage={pageSize}
                    onPageChange={(_, nextPage) => setPage(nextPage + 1)}
                    onRowsPerPageChange={(event) => {
                        setPage(1);
                        setPageSize(Number(event.target.value));
                    }}
                    rowsPerPageOptions={[10, 20, 50, 100]}
                />
            </Card>

            <Drawer
                anchor="right"
                open={Boolean(selectedJob)}
                onClose={() => setSelectedJob(null)}
                PaperProps={{
                    sx: {
                        width: {xs: "100%", sm: 460, md: 520},
                        maxWidth: "100%",
                    },
                }}
            >
                {selectedJob ? (
                    <Box sx={{height: "100%", display: "flex", flexDirection: "column"}}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{p: 2.5, borderBottom: 1, borderColor: "divider"}}>
                            <Box>
                                <Typography variant="h6" sx={{fontWeight: 700}}>Job Details</Typography>
                                <Typography variant="caption" color="text.secondary">{selectedJob.firm || "Unknown firm"}</Typography>
                            </Box>
                            <IconButton onClick={() => setSelectedJob(null)} aria-label="Close job details">
                                <X size={18}/>
                            </IconButton>
                        </Stack>

                        <Box sx={{p: 2.5, overflowY: "auto"}}>
                            <Stack spacing={2.5}>
                                <Box>
                                    <Chip
                                        size="small"
                                        label={selectedJob.status || "UNKNOWN"}
                                        variant="outlined"
                                        sx={{fontWeight: 700, mb: 1.5, ...statusChipSx(selectedJob.status)}}
                                    />
                                    <Typography variant="h6" sx={{fontWeight: 700, lineHeight: 1.25}}>
                                        {selectedJob.title || "(Untitled)"}
                                    </Typography>
                                </Box>

                                {selectedJob.status === "NEEDS_REVIEW" ? (
                                    <Paper variant="outlined" sx={{p: 1.5, borderColor: "#f59e0b", bgcolor: "#fffbeb"}}>
                                        <Stack spacing={1.25}>
                                            <Typography variant="body2" sx={{fontWeight: 700, color: "#92400e"}}>
                                                This job needs manual review
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                It will stay in Needs Review after future scrapes until it is marked reviewed.
                                            </Typography>
                                            <Button
                                                size="small"
                                                variant="contained"
                                                startIcon={<CheckCircle size={16}/>}
                                                onClick={handleMarkReviewed}
                                                disabled={reviewingJob}
                                                sx={{alignSelf: "flex-start", bgcolor: "#111827", "&:hover": {bgcolor: "#1f2937"}}}
                                            >
                                                {reviewingJob ? "Marking..." : "Mark as reviewed"}
                                            </Button>
                                        </Stack>
                                    </Paper>
                                ) : null}

                                <Stack spacing={2}>
                                    <DetailField label="Location" value={selectedJob.location}/>
                                    <DetailField label="Practice Area" value={selectedJob.practice_area}/>
                                    <DetailField label="PQE" value={selectedJob.pqe_level}/>
                                    <DetailField label="First Seen" value={formatApiDateTime(selectedJob.first_seen)}/>
                                    <DetailField label="Last Seen Live" value={formatApiDateTime(selectedJob.last_seen)}/>
                                    <DetailField label="Removed Date" value={formatApiDateTime(selectedJob.removed_at)}/>
                                    <DetailField label="Reference" value={selectedJob.source_reference}/>
                                    <DetailField label="Last Checked" value={formatApiDateTime(selectedJob.last_checked)}/>
                                </Stack>

                                {selectedJob.job_url ? (
                                    <Button
                                        variant="outlined"
                                        component="a"
                                        href={selectedJob.job_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        endIcon={<ExternalLink size={16}/>}
                                    >
                                        View on careers site
                                    </Button>
                                ) : null}

                                <Divider/>

                                <Box>
                                    <Typography variant="subtitle2" sx={{fontWeight: 700, mb: 1}}>Full Description</Typography>
                                    <Paper variant="outlined" sx={{p: 1.5, maxHeight: 320, overflow: "auto", bgcolor: "#f8fafc"}}>
                                        <Typography variant="body2" sx={{whiteSpace: "pre-wrap", lineHeight: 1.65}}>
                                            {selectedJob.full_description || "-"}
                                        </Typography>
                                    </Paper>
                                </Box>

                                {selectedJob.change_history?.length > 0 ? (
                                    <Box>
                                        <Typography variant="subtitle2" sx={{fontWeight: 700, mb: 1}}>Change History</Typography>
                                        <Stack spacing={1}>
                                            {selectedJob.change_history.slice().reverse().map((entry, index) => (
                                                <Paper key={`${entry.timestamp}-${index}`} variant="outlined" sx={{p: 1.5}}>
                                                    <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
                                                        <Chip size="small" label={entry.event} variant="outlined" sx={{fontWeight: 700, ...statusChipSx(entry.event)}}/>
                                                        <Typography variant="caption" color="text.secondary">{formatApiDateTime(entry.timestamp)}</Typography>
                                                    </Stack>
                                                    {entry.message ? (
                                                        <Typography variant="body2" sx={{mt: 1}}>{entry.message}</Typography>
                                                    ) : null}
                                                    {entry.changed_fields && Object.keys(entry.changed_fields).length > 0 ? (
                                                        <Box component="pre" sx={{mt: 1, p: 1, bgcolor: "#f8fafc", overflow: "auto", fontSize: 12, borderRadius: 1}}>
                                                            {JSON.stringify(entry.changed_fields, null, 2)}
                                                        </Box>
                                                    ) : null}
                                                </Paper>
                                            ))}
                                        </Stack>
                                    </Box>
                                ) : null}

                                {selectedJob.extra_info && Object.keys(selectedJob.extra_info).length > 0 ? (
                                    <Box>
                                        <Typography variant="subtitle2" sx={{fontWeight: 700, mb: 1}}>Extra Information</Typography>
                                        <Stack spacing={1.5}>
                                            {Object.keys(selectedJob.extra_info).map((key) => (
                                                <DetailField
                                                    key={key}
                                                    label={key.replace(/([A-Z])/g, " $1").trim()}
                                                    value={String(selectedJob.extra_info?.[key])}
                                                />
                                            ))}
                                        </Stack>
                                    </Box>
                                ) : null}
                            </Stack>
                        </Box>
                    </Box>
                ) : null}
            </Drawer>

            <Dialog open={exportOpen} onClose={() => setExportOpen(false)} fullWidth maxWidth="md">
                <DialogTitle>Export Jobs</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{mb: 2}}>
                        Choose export format and filters. Leave firms or statuses empty to include all.
                    </DialogContentText>
                    <Stack spacing={2}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Format</InputLabel>
                            <Select
                                label="Format"
                                value={exportFormat}
                                onChange={(event) => setExportFormat(event.target.value as "csv" | "xlsx")}
                            >
                                <MenuItem value="csv">CSV</MenuItem>
                                <MenuItem value="xlsx">Excel (.xlsx)</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            size="small"
                            label="Search"
                            placeholder="Title, firm, location..."
                            value={exportSearch}
                            onChange={(event) => setExportSearch(event.target.value)}
                        />
                        <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    multiple
                                    label="Status"
                                    value={exportStatuses}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        setExportStatuses(typeof value === "string" ? value.split(",") : value);
                                    }}
                                    renderValue={(selected) => (
                                        <Box sx={{display: "flex", flexWrap: "wrap", gap: 0.5}}>
                                            {selected.map((item) => (
                                                <Chip key={item} size="small" label={item.replace("_", " ")}/>
                                            ))}
                                        </Box>
                                    )}
                                >
                                    {statusOptions.map((item) => (
                                        <MenuItem key={item} value={item}>{item.replace("_", " ")}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Firm</InputLabel>
                                <Select
                                    multiple
                                    label="Firm"
                                    value={exportFirms}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        setExportFirms(typeof value === "string" ? value.split(",") : value);
                                    }}
                                    renderValue={(selected) => (
                                        <Box sx={{display: "flex", flexWrap: "wrap", gap: 0.5}}>
                                            {selected.map((item) => (
                                                <Chip
                                                    key={item}
                                                    size="small"
                                                    label={firms.find((firmItem) => firmItem.key === item)?.name || item}
                                                />
                                            ))}
                                        </Box>
                                    )}
                                >
                                    {firms.map((item) => (
                                        <MenuItem key={item.key} value={item.key}>{item.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>
                        <FormControlLabel
                            control={<Checkbox checked={exportChangedOnly} onChange={(event) => setExportChangedOnly(event.target.checked)}/>}
                            label="Changed / review only"
                        />

                        <Divider/>

                        <Stack spacing={1.5}>
                            <Stack direction={{xs: "column", sm: "row"}} justifyContent="space-between" alignItems={{xs: "stretch", sm: "center"}} spacing={1}>
                                <Box>
                                    <Typography variant="subtitle2" sx={{fontWeight: 700}}>Field conditions</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        All added conditions must match for a row to export.
                                    </Typography>
                                </Box>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<Plus size={16}/>}
                                    onClick={() => setExportFieldFilters((filters) => [...filters, newExportFieldFilter()])}
                                >
                                    Add condition
                                </Button>
                            </Stack>

                            {exportFieldFilters.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                    No field conditions added.
                                </Typography>
                            ) : (
                                <Stack spacing={1}>
                                    {exportFieldFilters.map((filter) => {
                                        const needsValue = exportConditionNeedsValue(filter.field, filter.operator);
                                        return (
                                            <Box
                                                key={filter.id}
                                                sx={{
                                                    display: "grid",
                                                    gap: 1,
                                                    gridTemplateColumns: {xs: "1fr", md: "1.1fr 1.1fr minmax(180px, 1fr) auto"},
                                                    alignItems: "center",
                                                }}
                                            >
                                                <FormControl size="small" fullWidth>
                                                    <InputLabel>Field</InputLabel>
                                                    <Select
                                                        label="Field"
                                                        value={filter.field}
                                                        onChange={(event) => updateExportFieldFilter(filter.id, {field: event.target.value})}
                                                    >
                                                        {exportFields.map((fieldItem) => (
                                                            <MenuItem key={fieldItem.key} value={fieldItem.key}>{fieldItem.label}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                                <FormControl size="small" fullWidth>
                                                    <InputLabel>Condition</InputLabel>
                                                    <Select
                                                        label="Condition"
                                                        value={filter.operator}
                                                        onChange={(event) => updateExportFieldFilter(filter.id, {operator: event.target.value as ExportConditionOperator})}
                                                    >
                                                        {exportConditionOptions(filter.field).map((option) => (
                                                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                                <TextField
                                                    size="small"
                                                    label="Value"
                                                    type={exportFieldType(filter.field) === "date" ? "date" : "text"}
                                                    value={filter.value}
                                                    disabled={!needsValue}
                                                    placeholder={needsValue ? "Value" : "No value needed"}
                                                    InputLabelProps={exportFieldType(filter.field) === "date" ? {shrink: true} : undefined}
                                                    onChange={(event) => updateExportFieldFilter(filter.id, {value: event.target.value})}
                                                />
                                                <IconButton
                                                    aria-label="Remove condition"
                                                    onClick={() => setExportFieldFilters((filters) => filters.filter((item) => item.id !== filter.id))}
                                                >
                                                    <Trash2 size={17}/>
                                                </IconButton>
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            )}
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setExportOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleExport}>Download</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
