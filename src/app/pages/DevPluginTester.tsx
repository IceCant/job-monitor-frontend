import {useEffect, useMemo, useState} from "react";
import {Bug, Copy, ExternalLink, Play, RotateCcw} from "lucide-react";
import {toast} from "sonner";
import {
    Alert,
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from "@mui/material";

import {listPlugins, testPlugin, type PluginInfo, type PluginTestResult} from "../lib/api";

function stringifyConfig(value: Record<string, unknown>) {
    return JSON.stringify(value || {}, null, 2);
}

function previewText(value: unknown, fallback = "-") {
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value === "string") return value;
    return JSON.stringify(value);
}

export function DevPluginTester() {
    const [plugins, setPlugins] = useState<PluginInfo[]>([]);
    const [pluginKey, setPluginKey] = useState("");
    const [firmName, setFirmName] = useState("");
    const [configText, setConfigText] = useState("{}");
    const [limit, setLimit] = useState(10);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PluginTestResult | null>(null);
    const [tab, setTab] = useState(0);

    const selectedPlugin = useMemo(
        () => plugins.find((plugin) => plugin.key === pluginKey) || null,
        [pluginKey, plugins],
    );

    useEffect(() => {
        listPlugins()
            .then((items) => {
                setPlugins(items);
                const first = items[0];
                if (first) {
                    setPluginKey(first.key);
                    setFirmName(first.name);
                    setConfigText(stringifyConfig(first.default_config));
                }
            })
            .catch(() => toast.error("Failed to load plugins"));
    }, []);

    function applyPlugin(plugin: PluginInfo) {
        setPluginKey(plugin.key);
        setFirmName(plugin.name);
        setConfigText(stringifyConfig(plugin.default_config));
        setResult(null);
    }

    function resetConfig() {
        if (!selectedPlugin) return;
        setFirmName(selectedPlugin.name);
        setConfigText(stringifyConfig(selectedPlugin.default_config));
    }

    async function runTest() {
        let config: Record<string, unknown>;
        try {
            config = JSON.parse(configText || "{}");
            if (!config || typeof config !== "object" || Array.isArray(config)) {
                throw new Error("Config must be a JSON object");
            }
        } catch (error) {
            toast.error("Config JSON is not valid");
            return;
        }

        setLoading(true);
        setResult(null);
        try {
            const response = await testPlugin({
                plugin_key: pluginKey,
                firm_name: firmName || null,
                config,
                limit,
            });
            setResult(response);
            setTab(0);
            toast.success(`Plugin returned ${response.count} jobs`);
        } catch (error) {
            toast.error("Plugin test failed", {
                description: error instanceof Error ? error.message : undefined,
            });
        } finally {
            setLoading(false);
        }
    }

    async function copyRawJson() {
        if (!result) return;
        await navigator.clipboard.writeText(result.raw_json);
        toast.success("Raw JSON copied");
    }

    return (
        <Box sx={{p: {xs: 1.5, md: 3}, minWidth: 0}}>
            <Stack direction={{xs: "column", md: "row"}} justifyContent="space-between" spacing={2} sx={{mb: 3}}>
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Bug size={22}/>
                        <Typography variant="h5" sx={{fontWeight: 700}}>Plugin Tester</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        Dev-only runner for checking plugin output before saving anything to the database.
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={loading ? <CircularProgress size={16} color="inherit"/> : <Play size={16}/>} disabled={loading || !pluginKey} onClick={runTest}>
                    {loading ? "Running..." : "Run Test"}
                </Button>
            </Stack>

            <Box sx={{display: "grid", gap: 2, gridTemplateColumns: {xs: "1fr", lg: "360px minmax(0, 1fr)"}}}>
                <Card variant="outlined" sx={{borderRadius: 2, p: 2}}>
                    <Stack spacing={2}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Plugin</InputLabel>
                            <Select
                                label="Plugin"
                                value={pluginKey}
                                onChange={(event) => {
                                    const plugin = plugins.find((item) => item.key === event.target.value);
                                    if (plugin) applyPlugin(plugin);
                                }}
                            >
                                {plugins.map((plugin) => (
                                    <MenuItem key={plugin.key} value={plugin.key}>
                                        {plugin.name} ({plugin.key})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {selectedPlugin ? (
                            <Paper variant="outlined" sx={{p: 1.5, bgcolor: "#f8fafc"}}>
                                <Stack spacing={1}>
                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                        <Chip size="small" label={selectedPlugin.enabled ? "Enabled" : "Disabled"} color={selectedPlugin.enabled ? "success" : "default"} variant="outlined"/>
                                        <Chip size="small" label={selectedPlugin.class_name} variant="outlined"/>
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary">{selectedPlugin.description || "No description"}</Typography>
                                    {selectedPlugin.careers_url ? (
                                        <Button
                                            size="small"
                                            component="a"
                                            href={selectedPlugin.careers_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            endIcon={<ExternalLink size={14}/>}
                                            sx={{alignSelf: "flex-start"}}
                                        >
                                            Careers site
                                        </Button>
                                    ) : null}
                                </Stack>
                            </Paper>
                        ) : null}

                        <TextField
                            size="small"
                            label="Firm name override"
                            value={firmName}
                            onChange={(event) => setFirmName(event.target.value)}
                        />
                        <TextField
                            size="small"
                            type="number"
                            label="Preview limit"
                            value={limit}
                            inputProps={{min: 1, max: 100}}
                            onChange={(event) => setLimit(Math.max(1, Math.min(100, Number(event.target.value) || 1)))}
                        />
                        <TextField
                            label="Config JSON"
                            value={configText}
                            onChange={(event) => setConfigText(event.target.value)}
                            minRows={12}
                            multiline
                            fullWidth
                            InputProps={{
                                sx: {fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13},
                            }}
                        />
                        <Button variant="outlined" startIcon={<RotateCcw size={16}/>} onClick={resetConfig}>
                            Reset Config
                        </Button>
                    </Stack>
                </Card>

                <Card variant="outlined" sx={{borderRadius: 2, overflow: "hidden", minWidth: 0}}>
                    <Box sx={{p: 2, borderBottom: 1, borderColor: "divider"}}>
                        <Stack direction={{xs: "column", sm: "row"}} justifyContent="space-between" spacing={1.5}>
                            <Box>
                                <Typography variant="subtitle1" sx={{fontWeight: 700}}>Output Preview</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {result ? `${result.count} total jobs in ${result.elapsed_ms}ms` : "Run a plugin to inspect parsed jobs."}
                                </Typography>
                            </Box>
                            {result ? (
                                <Button variant="outlined" startIcon={<Copy size={16}/>} onClick={copyRawJson}>
                                    Copy JSON
                                </Button>
                            ) : null}
                        </Stack>
                    </Box>

                    {result ? (
                        <>
                            <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{px: 2}}>
                                <Tab label="Readable"/>
                                <Tab label="Raw JSON"/>
                            </Tabs>
                            <Divider/>
                            {tab === 0 ? (
                                <Stack spacing={1.5} sx={{p: 2}}>
                                    {result.items.map((item, index) => (
                                        <Paper key={`${previewText(item.source_reference)}-${index}`} variant="outlined" sx={{p: 1.5}}>
                                            <Stack spacing={1.25}>
                                                <Box>
                                                    <Typography variant="subtitle2" sx={{fontWeight: 700}}>
                                                        {previewText(item.title, "(Untitled)")}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {previewText(item.firm_name)} · {previewText(item.office_location)}
                                                    </Typography>
                                                </Box>
                                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                                    <Chip size="small" label={previewText(item.status)} variant="outlined"/>
                                                    <Chip size="small" label={`Ref: ${previewText(item.source_reference)}`} variant="outlined"/>
                                                    <Chip size="small" label={`Description: ${previewText(item.description).length} chars`} variant="outlined"/>
                                                </Stack>
                                                <Paper variant="outlined" sx={{p: 1.25, bgcolor: "#f8fafc", maxHeight: 180, overflow: "auto"}}>
                                                    <Typography variant="body2" sx={{whiteSpace: "pre-wrap", lineHeight: 1.6}}>
                                                        {previewText(item.description)}
                                                    </Typography>
                                                </Paper>
                                                {item.job_url ? (
                                                    <Button
                                                        size="small"
                                                        component="a"
                                                        href={String(item.job_url)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        endIcon={<ExternalLink size={14}/>}
                                                        sx={{alignSelf: "flex-start"}}
                                                    >
                                                        Open job
                                                    </Button>
                                                ) : null}
                                            </Stack>
                                        </Paper>
                                    ))}
                                </Stack>
                            ) : (
                                <Box component="pre" sx={{m: 0, p: 2, overflow: "auto", fontSize: 12, bgcolor: "#0f172a", color: "#e2e8f0", minHeight: 420}}>
                                    {result.raw_json}
                                </Box>
                            )}
                        </>
                    ) : (
                        <Box sx={{p: 2}}>
                            <Alert severity="info">
                                For Workday plugins, try setting <strong>max_pages</strong> to <strong>1</strong> while testing so the run finishes quickly.
                            </Alert>
                        </Box>
                    )}
                </Card>
            </Box>
        </Box>
    );
}
