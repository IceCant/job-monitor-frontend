import {Outlet, NavLink} from "react-router";
import {
    LayoutDashboard,
    Briefcase,
    Building2,
    Clock,
    Puzzle,
    Settings as SettingsIcon,
    Bell,
    Search,
    Play,
    LogOut,
} from "lucide-react";
import {useState} from "react";
import {toast} from "sonner";

import {useAuth} from "../../context/AuthContext";
import {runScrape} from "../../lib/api";

export function RootLayout() {
    const [showNotifications, setShowNotifications] = useState(false);
    const [running, setRunning] = useState(false);
    const {user, logout} = useAuth();

    const navItems = [
        // { path: "/", label: "Dashboard", icon: LayoutDashboard },
        {path: "/jobs", label: "Jobs", icon: Briefcase},
        {path: "/firms", label: "Firms", icon: Building2},
        {path: "/scrape-runs", label: "Scrape Runs", icon: Clock},
        // {path: "/plugin-manager", label: "Plugin Manager", icon: Puzzle},
        {path: "/settings", label: "Settings", icon: SettingsIcon},
    ];

    const handleRunAll = async () => {
        setRunning(true);
        try {
            await runScrape();
            toast.success("Scrape completed");
        } catch (error) {
            toast.error("Scrape failed");
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
                    <button
                        onClick={handleRunAll}
                        disabled={running}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                    >
                        <Play className="w-4 h-4"/>
                        {running ? "Running..." : "Run All Sites"}
                    </button>
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                        <LogOut className="w-4 h-4"/>
                        Logout
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-end justify-between">
                        <div className="flex items-center justify-end gap-4 flex-1 ml-6">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <Bell className="w-5 h-5"/>
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                            </button>

                            <div className="text-sm text-gray-600">{user?.username}</div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto">
                    <Outlet/>
                </main>
            </div>

            {showNotifications && (
                <div
                    className="fixed top-16 right-6 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
                    <h3 className="font-semibold text-gray-900 mb-3">Notifications</h3>
                    <div className="space-y-2">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-gray-900">Use "Run All Sites" for manual scrape.</p>
                        </div>
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-gray-900">Schedule can be configured in Settings.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
