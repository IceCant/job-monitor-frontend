import { createBrowserRouter } from "react-router";

import { RequireAuth } from "./components/auth/RequireAuth";
import { RootLayout } from "./components/layouts/RootLayout";
import { Dashboard } from "./pages/Dashboard";
import { DevPluginTester } from "./pages/DevPluginTester";
import { Firms } from "./pages/Firms";
import { Jobs } from "./pages/Jobs";
import { Login } from "./pages/Login";
import { PluginManager } from "./pages/PluginManager";
import { ScrapeRuns } from "./pages/ScrapeRuns";
import { Settings } from "./pages/Settings";

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  {
    Component: RequireAuth,
    children: [
      {
        path: "/",
        Component: RootLayout,
        children: [
          { index: true, Component: Dashboard },
          { path: "jobs", Component: Jobs },
          { path: "firms", Component: Firms },
          { path: "scrape-runs", Component: ScrapeRuns },
          { path: "plugin-manager", Component: PluginManager },
          ...(import.meta.env.DEV ? [{ path: "dev/plugin-tester", Component: DevPluginTester }] : []),
          { path: "settings", Component: Settings },
        ],
      },
    ],
  },
]);
