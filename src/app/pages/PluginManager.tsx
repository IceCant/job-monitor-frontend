import { Puzzle, CheckCircle, AlertCircle, Download } from "lucide-react";
import { Card, CardHeader, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { toast } from "sonner";

interface Plugin {
  id: string;
  name: string;
  version: string;
  status: "active" | "inactive" | "error";
  lastUpdated: string;
  description: string;
  firmCount: number;
}

export function PluginManager() {
  const mockPlugins: Plugin[] = [
    {
      id: "1",
      name: "Workday",
      version: "2.4.1",
      status: "active",
      lastUpdated: "2026-05-15",
      description: "Scraper for Workday-based career sites",
      firmCount: 18
    },
    {
      id: "2",
      name: "Oracle Taleo",
      version: "1.9.3",
      status: "active",
      lastUpdated: "2026-04-22",
      description: "Oracle Taleo recruitment platform integration",
      firmCount: 12
    },
    {
      id: "3",
      name: "iCIMS",
      version: "3.1.0",
      status: "active",
      lastUpdated: "2026-06-01",
      description: "iCIMS applicant tracking system scraper",
      firmCount: 8
    },
    {
      id: "4",
      name: "CVMail",
      version: "1.2.5",
      status: "active",
      lastUpdated: "2026-03-10",
      description: "CVMail job board integration",
      firmCount: 5
    },
    {
      id: "5",
      name: "Custom Scraper",
      version: "4.0.2",
      status: "active",
      lastUpdated: "2026-06-05",
      description: "Flexible scraper for custom career sites",
      firmCount: 2
    }
  ];

  const handleUpdate = (pluginName: string) => {
    toast.info(`Checking for updates for ${pluginName}...`);
    setTimeout(() => {
      toast.success(`${pluginName} is up to date`);
    }, 1500);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Plugin Manager</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage scraper plugins for different recruitment platforms
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Plugins</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{mockPlugins.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <Puzzle className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Plugins</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">
                {mockPlugins.filter(p => p.status === "active").length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Firms Using Plugins</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">
                {mockPlugins.reduce((acc, p) => acc + p.firmCount, 0)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
              <Download className="w-6 h-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Installed Plugins"
          description="Scraper modules for different recruitment platforms"
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plugin Name</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Firms Using</TableHead>
              <TableHead sortable>Last Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockPlugins.map((plugin) => (
              <TableRow key={plugin.id}>
                <TableCell>
                  <div>
                    <div className="font-medium text-gray-900">{plugin.name}</div>
                    <div className="text-sm text-gray-500">{plugin.description}</div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{plugin.version}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      plugin.status === "active"
                        ? "success"
                        : plugin.status === "error"
                        ? "failed"
                        : "default"
                    }
                  >
                    {plugin.status.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>{plugin.firmCount}</TableCell>
                <TableCell className="text-gray-500">{plugin.lastUpdated}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdate(plugin.name)}
                  >
                    Check Updates
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <CardHeader title="Plugin Architecture" />
        <CardContent>
          <div className="prose max-w-none">
            <p className="text-gray-600">
              The Legal Recruitment Monitor uses a modular plugin architecture that allows each
              recruitment platform to have its own specialized scraper module.
            </p>

            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Workday Plugin</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Handles Workday-based career sites with specialized API integration and
                    dynamic content loading support.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Oracle Taleo Plugin</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Integrates with Oracle Taleo platforms, parsing structured job data and
                    handling pagination.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Custom Scraper Plugin</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Flexible scraper for bespoke career sites that don't use standard platforms.
                    Supports custom selectors and parsing rules.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
