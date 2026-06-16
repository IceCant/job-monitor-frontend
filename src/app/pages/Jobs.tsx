import {useEffect, useMemo, useState} from "react";
import {Download, ExternalLink, RotateCcw, Search, X} from "lucide-react";
import {toast} from "sonner";
import {
    Box,
    Button,
    Card,
    Checkbox,
    Chip,
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
    Link,
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
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";

import {exportJobs, getJob, listFirms, listJobs, type Firm, type Job} from "../lib/api";

const statusOptions = ["NEW", "LIVE", "UPDATED", "REPOSTED", "NEEDS_REVIEW", "REMOVED"];

function formatDate(value: string | null | undefined) {
    return value ? new Date(value).toLocaleString() : "-";
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
    const [exportOpen, setExportOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv");
    const [exportSearch, setExportSearch] = useState("");
    const [exportStatus, setExportStatus] = useState("all");
    const [exportFirm, setExportFirm] = useState("all");
    const [exportChangedOnly, setExportChangedOnly] = useState(false);

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
            .finally(() => setLoading(false));
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

    return (
        <Box sx={{p: 3, minWidth: 0}}>
            <Stack direction={{xs: "column", sm: "row"}} justifyContent="space-between" spacing={2} sx={{mb: 3}}>
                <Box>
                    <Typography variant="h5" sx={{fontWeight: 700}}>Jobs</Typography>
                    <Typography variant="body2" color="text.secondary">{total} total results</Typography>
                </Box>
                <Button variant="outlined" startIcon={<Download size={16}/>} onClick={openExportModal}>
                    Export
                </Button>
            </Stack>

            <Card variant="outlined" sx={{borderRadius: 2, overflow: "hidden"}}>
                <Box sx={{p: 2.5, borderBottom: 1, borderColor: "divider"}}>
                    <Box
                        sx={{
                            display: "grid",
                            gap: 1.5,
                            gridTemplateColumns: {
                                xs: "1fr",
                                lg: "minmax(260px, 1.4fr) minmax(150px, .7fr) minmax(180px, .9fr) minmax(190px, .8fr) auto",
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
                        <Button variant="outlined" startIcon={<RotateCcw size={16}/>} disabled={!hasFilters} onClick={clearFilters}>
                            Clear
                        </Button>
                    </Box>
                </Box>

                <TableContainer sx={{maxHeight: "calc(100vh - 300px)", minHeight: 360}}>
                    <Table stickyHeader size="small" sx={{tableLayout: "fixed", minWidth: 980}}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{width: "18%", fontWeight: 700}}>Firm</TableCell>
                                <TableCell sx={{width: "37%", fontWeight: 700}}>Title</TableCell>
                                <TableCell sx={{width: "20%", fontWeight: 700}}>Location</TableCell>
                                <TableCell sx={{width: "12%", fontWeight: 700}}>Status</TableCell>
                                <TableCell sx={{width: "13%", fontWeight: 700}}>Last Seen</TableCell>
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
                                            <Typography variant="body2" noWrap>{job.firm || "-"}</Typography>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{minWidth: 0}}>
                                            <Tooltip title={job.title || "(Untitled)"} placement="top-start">
                                                <Typography variant="body2" noWrap sx={{fontWeight: 600, minWidth: 0}}>
                                                    {job.title || "(Untitled)"}
                                                </Typography>
                                            </Tooltip>
                                            {job.job_url ? (
                                                <Tooltip title="Open careers site">
                                                    <IconButton
                                                        size="small"
                                                        component="a"
                                                        href={job.job_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(event) => event.stopPropagation()}
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
                                            {formatDate(job.last_seen)}
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

                                <Stack spacing={2}>
                                    <DetailField label="Location" value={selectedJob.location}/>
                                    <DetailField label="Practice Area" value={selectedJob.practice_area}/>
                                    <DetailField label="PQE" value={selectedJob.pqe_level}/>
                                    <DetailField label="First Seen" value={formatDate(selectedJob.first_seen)}/>
                                    <DetailField label="Last Seen Live" value={formatDate(selectedJob.last_seen)}/>
                                    <DetailField label="Removed Date" value={formatDate(selectedJob.removed_at)}/>
                                    <DetailField label="Reference" value={selectedJob.source_reference}/>
                                    <DetailField label="Last Checked" value={formatDate(selectedJob.last_checked)}/>
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
                                                        <Typography variant="caption" color="text.secondary">{formatDate(entry.timestamp)}</Typography>
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

            <Dialog open={exportOpen} onClose={() => setExportOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Export Jobs</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{mb: 2}}>
                        Choose export format and filters.
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
                                    label="Status"
                                    value={exportStatus}
                                    onChange={(event) => setExportStatus(event.target.value)}
                                >
                                    <MenuItem value="all">All statuses</MenuItem>
                                    {statusOptions.map((item) => (
                                        <MenuItem key={item} value={item}>{item.replace("_", " ")}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Firm</InputLabel>
                                <Select
                                    label="Firm"
                                    value={exportFirm}
                                    onChange={(event) => setExportFirm(event.target.value)}
                                >
                                    <MenuItem value="all">All firms</MenuItem>
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
