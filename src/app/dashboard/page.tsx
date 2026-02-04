'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; 
import { supabase } from '@/lib/supabaseClient';
import {
    LayoutDashboard,
    Users,
    ClipboardList,
    QrCode,
    LogOut,
    UserCheck,
    CheckCircle,
    Activity,
    Wifi,
    Clock,
    User
} from 'lucide-react';

// --- TYPE DEFINITION FOR RECENT LOGS ---
type RecentLog = {
    id: number;
    student_id: string;
    status: string; // e.g., "Time In (AM)"
    scanned_at: string;
    students: {
        full_name: string;
    } | null; // Join with students table
    activities: {
        name: string;
    } | null; // Join with activities table
};

// ... (NavLink, StatCard, SidebarContent, BottomNavLink, BottomNavBar remain the same) ...
// Copy lang to nimo ang mga components sa taas (NavLink etc.) kay wala ra na gi-usab.
// Focus ta sa DashboardPage component sa ubos.

const NavLink = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode; }) => {
    const pathname = usePathname();
    const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href);

    return (
        <Link
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                isActive
                    ? 'bg-green-100 text-green-700 dark:bg-slate-800 dark:text-slate-50 font-semibold'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50'
            }`}
        >
            <Icon className="h-5 w-5" />
            {children}
        </Link>
    );
};

const StatCard = ({ title, value, icon: Icon, isLoading, subtext }: { title: string; value: string | number; icon: React.ElementType; isLoading: boolean; subtext?: string }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
                {isLoading ? (
                    <div className="mt-2 h-9 w-16 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"></div>
                ) : (
                    <div className="mt-2">
                        <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
                        {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
                    </div>
                )}
            </div>
            <div className={`p-3 rounded-lg ${title.includes("Online") ? 'bg-green-100 text-green-600 animate-pulse' : 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400'}`}>
                <Icon className="h-6 w-6" />
            </div>
        </div>
    </div>
);

const SidebarContent = () => {
    const router = useRouter();
    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };
    return (
        <div className="flex h-full max-h-screen flex-col">
            <div className="flex h-16 shrink-0 items-center border-b px-4 lg:px-6 dark:border-slate-800">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
                    <UserCheck className="h-6 w-6 text-green-600" />
                    <span className="text-slate-800 dark:text-white">Attendance Portal</span>
                </Link>
            </div>
            <div className="flex-1 py-4">
                <nav className="grid items-start gap-1 px-2 text-sm font-medium lg:px-4">
                    <NavLink href="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
                    <NavLink href="/dashboard/student-list" icon={Users}>Student List</NavLink>
                    <NavLink href="/dashboard/activity" icon={ClipboardList}>Activity</NavLink>
                    <NavLink href="/dashboard/scan-attendance" icon={QrCode}>Scan Attendance</NavLink>
                    <NavLink href="/dashboard/fines-report" icon={Activity}>Fines Report</NavLink>
                </nav>
            </div>
            <div className="mt-auto flex flex-col gap-2 p-4 border-t dark:border-slate-800">
                <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                    <LogOut className="h-5 w-5" /> Logout
                </button>
                <div className="pt-2 text-center"> <p className="text-xs text-slate-500 dark:text-slate-400"> Developed by: <strong>Christian B. Maglangit</strong> </p> </div>
            </div>
        </div>
    );
};

const BottomNavLink = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode; }) => {
    const pathname = usePathname();
    const isActive = href === "/dashboard" ? pathname === href : href !== "/" && pathname.startsWith(href);
    return (
        <Link href={href} className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors ${isActive ? 'text-red-600' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>
            <Icon className="h-6 w-6" /> <span className="text-xs font-medium">{children}</span>
        </Link>
    );
};

const BottomNavBar = () => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-20 h-20 border-t bg-white shadow-[0_-2px_6px_rgba(0,0,0,0.06)] md:hidden dark:bg-slate-900 dark:border-slate-800">
            <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-2">
                <BottomNavLink href="/dashboard" icon={LayoutDashboard}>Home</BottomNavLink>
                <BottomNavLink href="/dashboard/student-list" icon={Users}>Students</BottomNavLink>
                <div className="flex justify-center">
                    <Link href="/dashboard/scan-attendance" className="flex flex-col h-16 w-16 -mt-6 items-center justify-center rounded-full bg-red-600 text-white shadow-lg" aria-label="Scan QR Code">
                        <QrCode className="h-7 w-7" /> <span className="text-sm font-medium">Scan</span>
                    </Link>
                </div>
                <BottomNavLink href="/dashboard/activity" icon={ClipboardList}>Activity</BottomNavLink>
                <BottomNavLink href="/dashboard/fines-report" icon={Activity}>Fines</BottomNavLink>
            </div>
            <div className="text-center pb-1"> <p className="text-xs text-slate-500 dark:text-slate-400"> Developed by: <strong>Christian B. Maglangit</strong> </p> </div>
        </nav>
    );
};

// --- HELPER FUNCTION FOR TIME FORMAT ---
const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// --- HELPER FOR STATUS COLOR ---
const getStatusColor = (status: string) => {
    if (status.includes('In')) return 'bg-green-100 text-green-700 border-green-200';
    if (status.includes('Out')) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
};

export default function DashboardPage() {
    const [loadingStats, setLoadingStats] = useState(true);
    const [stats, setStats] = useState({
        totalStudents: 0,
        activeActivities: 0,
        scansToday: 0
    });
    const [onlineCount, setOnlineCount] = useState(0);
    
    // --- NEW STATE PARA SA RECENT LOGS ---
    const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(true);

    const router = useRouter();
    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    // --- 1. Fetch Stats & Recent Logs ---
    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoadingStats(true);
            setLoadingLogs(true);
            try {
                const today = new Date().toISOString().slice(0, 10);
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const tomorrowStart = new Date(todayStart);
                tomorrowStart.setDate(tomorrowStart.getDate() + 1);

                // Fetch Counts
                const [
                    { count: studentCount },
                    { count: activityCount },
                    { count: scanCount }
                ] = await Promise.all([
                    supabase.from('students').select('*', { count: 'exact', head: true }),
                    supabase.from('activities').select('*', { count: 'exact', head: true }).gte('end_date', today),
                    supabase.from('attendance_report').select('*', { count: 'exact', head: true })
                        .gte('scanned_at', todayStart.toISOString())
                        .lt('scanned_at', tomorrowStart.toISOString())
                ]);

                setStats({
                    totalStudents: studentCount ?? 0,
                    activeActivities: activityCount ?? 0,
                    scansToday: scanCount ?? 0
                });

                // --- FETCH RECENT LOGS (TODAY ONLY) ---
                const { data: logsData, error: logsError } = await supabase
                    .from('attendance_report')
                    .select(`
                        id,
                        student_id,
                        status,
                        scanned_at,
                        students ( full_name ),
                        activities ( name )
                    `)
                    .gte('scanned_at', todayStart.toISOString())
                    .lt('scanned_at', tomorrowStart.toISOString())
                    .order('scanned_at', { ascending: false }) // Latest first
                    .limit(10); // Show only last 10 scans

                if (!logsError && logsData) {
                    // Type assertion to make TypeScript happy with the joins
                    setRecentLogs(logsData as unknown as RecentLog[]);
                }

            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoadingStats(false);
                setLoadingLogs(false);
            }
        };

        fetchDashboardData();
    }, []);

    // --- 2. Realtime Online User Tracking ---
    useEffect(() => {
        const channel = supabase.channel('online-users');

        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                const uniqueUsers = new Set();
                for (const id in newState) {
                    const presenceEntry = newState[id] as any;
                    if (presenceEntry && presenceEntry[0] && presenceEntry[0].user_id) {
                        uniqueUsers.add(presenceEntry[0].user_id);
                    }
                }
                setOnlineCount(uniqueUsers.size);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <div className="grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">

            {/* Desktop Sidebar */}
            <aside className="hidden border-r bg-white md:block dark:bg-slate-900 dark:border-slate-800">
                <SidebarContent />
            </aside>

            <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
                
                {/* Header */}
                <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-white/80 backdrop-blur-sm px-4 lg:px-6 dark:bg-slate-900/80 dark:border-slate-800 z-10">
                    <div className="w-full flex-1 flex items-center justify-between">
                        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
                            Attendance Portal
                        </h1>
                        <button onClick={handleLogout} className="p-2 rounded-full md:hidden text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50" aria-label="Logout">
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20">
                    {/* --- STAT CARDS --- */}
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard 
                            title="Online Students" 
                            value={`${onlineCount} / ${stats.totalStudents}`}
                            icon={Wifi} 
                            isLoading={loadingStats}
                            subtext="Currently Active"
                        />
                        <StatCard title="Total Students" value={stats.totalStudents} icon={Users} isLoading={loadingStats} />
                        <StatCard title="Active Activities" value={stats.activeActivities} icon={Activity} isLoading={loadingStats} />
                        <StatCard title="Scans Today" value={stats.scansToday} icon={CheckCircle} isLoading={loadingStats} />
                    </div>

                    {/* --- RECENT ACTIVITY TABLE (UPDATED) --- */}
                    <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Recent Activity (Today)</h2>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-400">
                                    <tr>
                                        <th className="px-6 py-3">Student Name</th>
                                        <th className="px-6 py-3">Activity</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingLogs ? (
                                        // Loading Skeleton Row
                                        [1, 2, 3].map((i) => (
                                            <tr key={i} className="border-b dark:border-slate-700">
                                                <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-32 animate-pulse"></div></td>
                                                <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24 animate-pulse"></div></td>
                                                <td className="px-6 py-4"><div className="h-6 bg-slate-200 rounded w-16 animate-pulse"></div></td>
                                                <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-12 ml-auto animate-pulse"></div></td>
                                            </tr>
                                        ))
                                    ) : recentLogs.length > 0 ? (
                                        // Actual Data Rows
                                        recentLogs.map((log) => (
                                            <tr key={log.id} className="bg-white border-b dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                        <User size={16} />
                                                    </div>
                                                    {log.students?.full_name || "Unknown Student"}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                                    {log.activities?.name || "N/A"}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(log.status)}`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400 font-mono">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Clock size={14} />
                                                        {formatTime(log.scanned_at)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        // Empty State
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <ClipboardList className="h-8 w-8 opacity-20" />
                                                    <p>No scans recorded yet today.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>

                <BottomNavBar />
            </div>
        </div>
    );
}