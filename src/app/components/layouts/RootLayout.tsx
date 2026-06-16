import {Outlet, NavLink, useNavigate} from "react-router";
import {
    LayoutDashboard,
    AlertTriangle,
    Briefcase,
    Building2,
    Clock,
    Settings as SettingsIcon,
    Bell,
    CheckCircle2,
    Play,
    LogOut,
    CalendarClock,
    TrendingUp,
} from "lucide-react";
import {useEffect, useState} from "react";
import {toast} from "sonner";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../ui/alert-dialog";
import {Button} from "../ui/button";
import {useAuth} from "../../context/AuthContext";
import {getDashboard, getSchedule, runScrape, type DashboardStats, type ScheduleSettings} from "../../lib/api";

function formatDate(value: Date | null) {
    return value ? value.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}) : "Not refreshed yet";
}

export function RootLayout() {
    const [showNotifications, setShowNotifications] = useState(false);
    const [running, setRunning] = useState(false);
    const [logoutOpen, setLogoutOpen] = useState(false);
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
    const [schedule, setSchedule] = useState<ScheduleSettings | null>(null);
    const [notificationsLoadedAt, setNotificationsLoadedAt] = useState<Date | null>(null);
    const {user, logout} = useAuth();
    const navigate = useNavigate();

    const navItems = [
        {path: "/", label: "Dashboard", icon: LayoutDashboard},
        {path: "/jobs", label: "Jobs", icon: Briefcase},
        {path: "/firms", label: "Firms", icon: Building2},
        {path: "/scrape-runs", label: "Scrape Runs", icon: Clock},
        // {path: "/plugin-manager", label: "Plugin Manager", icon: Puzzle},
        {path: "/settings", label: "Settings", icon: SettingsIcon},
    ];

    const unreadNotifications = dashboardStats
        ? dashboardStats.failed_sites + dashboardStats.new_jobs_today + dashboardStats.updated_jobs_today + dashboardStats.removed_jobs_today
        : 0;

    const notificationItems = dashboardStats
        ? [
            {
                key: "failed",
                icon: AlertTriangle,
                title: dashboardStats.failed_sites > 0 ? `${dashboardStats.failed_sites} failed site${dashboardStats.failed_sites === 1 ? "" : "s"}` : "No failed sites",
                body: dashboardStats.failed_sites > 0 ? "Check scrape runs for errors that need attention." : "Recent scraper health looks good.",
                tone: dashboardStats.failed_sites > 0 ? "text-red-700 bg-red-50 border-red-200" : "text-emerald-700 bg-emerald-50 border-emerald-200",
                action: "/scrape-runs",
            },
            {
                key: "new",
                icon: TrendingUp,
                title: `${dashboardStats.new_jobs_today} new job${dashboardStats.new_jobs_today === 1 ? "" : "s"} today`,
                body: `${dashboardStats.updated_jobs_today} updated, ${dashboardStats.removed_jobs_today} removed today.`,
                tone: "text-blue-700 bg-blue-50 border-blue-200",
                action: "/jobs",
            },
            {
                key: "schedule",
                icon: CalendarClock,
                title: schedule?.enabled ? `Scheduled every ${schedule.interval_hours}h` : "Scheduled scraping is off",
                body: schedule?.enabled ? "Automatic scraping is enabled." : "Turn it on from Settings when you want automatic checks.",
                tone: schedule?.enabled ? "text-gray-700 bg-gray-50 border-gray-200" : "text-amber-700 bg-amber-50 border-amber-200",
                action: "/settings",
            },
        ]
        : [];

    async function loadNotificationSummary() {
        try {
            const [dashboard, scheduleSettings] = await Promise.all([
                getDashboard(),
                getSchedule(),
            ]);
            setDashboardStats(dashboard);
            setSchedule(scheduleSettings);
            setNotificationsLoadedAt(new Date());
        } catch {
            setDashboardStats(null);
            setSchedule(null);
        }
    }

    useEffect(() => {
        loadNotificationSummary();
        const timer = window.setInterval(loadNotificationSummary, 60000);
        return () => window.clearInterval(timer);
    }, []);

    const handleRunAll = async () => {
        setRunning(true);
        try {
            const response = await runScrape();
            toast.success(response.message, {
                description: "You can keep working while results are collected.",
                action: {
                    label: "View runs",
                    onClick: () => navigate("/scrape-runs"),
                },
            });
            loadNotificationSummary();
        } catch (error) {
            toast.error("Could not start scrape");
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-6 border-b border-gray-200">
                    <h1 className="text-xl font-semibold text-gray-900">Job Monitor</h1>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === "/"}
                            className={({isActive}) =>
                                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                                    isActive
                                        ? "bg-blue-50 text-blue-600"
                                        : "text-gray-700 hover:bg-gray-50"
                                }`
                            }
                        >
                            <item.icon className="w-5 h-5"/>
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-200 space-y-2">
                    <Button
                        onClick={handleRunAll}
                        disabled={running}
                        className="w-full"
                    >
                        <Play className="w-4 h-4"/>
                        {running ? "Starting..." : "Run All Sites"}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setLogoutOpen(true)}
                        className="w-full"
                    >
                        <LogOut className="w-4 h-4"/>
                        Logout
                    </Button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-end justify-between">
                        <div className="flex items-center justify-end gap-4 flex-1 ml-6">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                aria-label="Open notifications"
                            >
                                <Bell className="w-5 h-5"/>
                                {unreadNotifications > 0 ? (
                                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                                        {unreadNotifications > 9 ? "9+" : unreadNotifications}
                                    </span>
                                ) : (
                                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500"></span>
                                )}
                            </button>

                            <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                                    {(user?.username || "U").slice(0, 1).toUpperCase()}
                                </div>
                                <div className="text-sm text-gray-700">{user?.username}</div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto">
                    <Outlet/>
                </main>
            </div>

            {showNotifications && (
                <div
                    className="fixed right-6 top-16 z-50 w-[360px] rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                    <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                            <h3 className="font-semibold text-gray-900">Notifications</h3>
                            <p className="text-xs text-gray-500">Updated {formatDate(notificationsLoadedAt)}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={loadNotificationSummary}>
                            Refresh
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {notificationItems.length > 0 ? (
                            notificationItems.map((item) => (
                                <button
                                    key={item.key}
                                    onClick={() => {
                                        setShowNotifications(false);
                                        navigate(item.action);
                                    }}
                                    className={`w-full rounded-md border p-3 text-left transition-colors hover:bg-white ${item.tone}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <item.icon className="mt-0.5 h-4 w-4 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium">{item.title}</p>
                                            <p className="mt-1 text-xs opacity-80">{item.body}</p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="rounded-md border bg-gray-50 p-3 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    Notification summary is unavailable.
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="mt-3 border-t pt-3">
                        <button
                            onClick={() => {
                                setShowNotifications(false);
                                navigate("/scrape-runs");
                            }}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                            View scrape history
                        </button>
                    </div>
                </div>
            )}

            <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Log out?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You will need to sign in again before viewing jobs, firms, and scrape history.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Stay signed in</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                logout();
                                navigate("/login");
                            }}
                        >
                            Log out
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
