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
    Menu,
    X,
    UserCheck,
    CheckCircle,
    Activity
} from 'lucide-react';

// --- Reusable Sub-Components ---

const NavLink = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode; }) => {
    const pathname = usePathname();
    // Use exact match for dashboard, and startsWith for others
    const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href);

    return (
        <Link href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${isActive ? 'bg-green-100 text-green-700 dark:bg-slate-800 dark:text-slate-50 font-semibold' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50'}`}>
            <Icon className="h-5 w-5" />
            {children}
        </Link>
    );
};

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType; }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
                {typeof value === 'number' ? (
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-2">{value}</p>
                ) : (
                    <div className="mt-4 h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"></div>
                )}
            </div>
            <div className="bg-green-100 p-3 rounded-lg dark:bg-green-900/50">
                <Icon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
        </div>
    </div>
);

// Reusable Sidebar Content with Logout Logic
const SidebarContent = () => {
    const router = useRouter();
    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    return (
        <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-16 items-center border-b px-4 lg:px-6 dark:border-slate-800">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
                    <UserCheck className="h-6 w-6 text-green-600" />
                    <span className="text-slate-800 dark:text-white">Student Activity Attendance</span>
                </Link>
            </div>
            <div className="flex-1 py-2">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                    <NavLink href="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
                    <NavLink href="/dashboard/student-list" icon={Users}>Student List</NavLink>
                    <NavLink href="/dashboard/activity" icon={ClipboardList}>Activity</NavLink>
                    <NavLink href="/dashboard/scan-attendance" icon={QrCode}>Scan Attendance</NavLink>
                </nav>
            </div>
            <div className="mt-auto p-4 border-t dark:border-slate-800">
                <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                    <LogOut className="h-5 w-5" />
                    Logout
                </button>
            </div>
            <div className="pb-4 text-center px-4"> <p className="text-xs text-slate-500 dark:text-slate-400"> Developed by: <strong>Christian B. Maglangit</strong> </p> </div>
        </div>
    );
};


// --- Main Dashboard Page Component ---

export default function DashboardPage() {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    
    const [loadingStats, setLoadingStats] = useState(true);
    const [stats, setStats] = useState({
        totalStudents: 0,
        activeActivities: 0,
        scansToday: 0
    });

    useEffect(() => {
        const fetchDashboardStats = async () => {
            setLoadingStats(true);

            const { count: studentCount } = await supabase
                .from('students')
                .select('*', { count: 'exact', head: true });

            const today = new Date().toISOString().split('T')[0];
            const { count: activityCount } = await supabase
                .from('activities')
                .select('*', { count: 'exact', head: true })
                .gte('end_date', today);
                
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const tomorrowStart = new Date(todayStart);
            tomorrowStart.setDate(tomorrowStart.getDate() + 1);

            const { count: scanCount } = await supabase
                .from('attendance_report')
                .select('*', { count: 'exact', head: true })
                .gte('scanned_at', todayStart.toISOString())
                .lt('scanned_at', tomorrowStart.toISOString());
            
            setStats({
                totalStudents: studentCount || 0,
                activeActivities: activityCount || 0,
                scansToday: scanCount || 0
            });

            setLoadingStats(false);
        };

        fetchDashboardStats();
    }, []);

    return (
        <div className="grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            
            {/* Sidebar (Desktop) */}
            <div className="hidden border-r bg-white md:block dark:bg-slate-900 dark:border-slate-800">
                <SidebarContent />
            </div>

            {/* Mobile Sidebar (Slide-out) */}
            <div className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 md:hidden ${ isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none' }`} onClick={() => setSidebarOpen(false)}></div>
            <div className={`fixed top-0 left-0 h-full w-[280px] border-r bg-white dark:bg-slate-900 dark:border-slate-800 z-40 transform transition-transform duration-300 ease-in-out md:hidden ${ isSidebarOpen ? 'translate-x-0' : '-translate-x-full' }`}>
                <SidebarContent />
            </div>

            {/* Main Content */}
            <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
                <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b bg-white/80 backdrop-blur-sm px-4 lg:px-6 dark:bg-slate-900/80 dark:border-slate-800 z-10">
                    <button
                        className="md:hidden"
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                    >
                        {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                    <div className="w-full flex-1">
                        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Dashboard</h1>
                    </div>
                </header>
                
                <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                    <h1 className="text-2xl font-bold tracking-tight mb-6 text-slate-800 dark:text-white">Dashboard Overview</h1>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <StatCard 
                            title="Total Students"
                            value={loadingStats ? '...' : stats.totalStudents}
                            icon={Users}
                        />
                        <StatCard 
                            title="Active Activities"
                            value={loadingStats ? '...' : stats.activeActivities}
                            icon={Activity}
                        />
                        <StatCard 
                            title="Scans Today"
                            value={loadingStats ? '...' : stats.scansToday}
                            icon={CheckCircle}
                        />
                    </div>

                    <div className="mt-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                        <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">Recent Activity</h2>
                        <div className="flex items-center justify-center h-48 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                           <p className="text-slate-500">Placeholder for recent student attendance logs...</p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}