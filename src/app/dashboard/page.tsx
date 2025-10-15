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

const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string; value: number; icon: React.ElementType; isLoading: boolean; }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
                {isLoading ? (
                    <div className="mt-2 h-9 w-16 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"></div>
                ) : (
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-2">{value}</p>
                )}
            </div>
            <div className="bg-green-100 p-3 rounded-lg dark:bg-green-900/50">
                <Icon className="h-6 w-6 text-green-600 dark:text-green-400" />
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
                    <span className="text-slate-800 dark:text-white">Student Activity Attendance</span>
                </Link>
            </div>
            <div className="flex-1 py-4">
                <nav className="grid items-start gap-1 px-2 text-sm font-medium lg:px-4">
                    <NavLink href="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
                    <NavLink href="/dashboard/student-list" icon={Users}>Student List</NavLink>
                    <NavLink href="/dashboard/activity" icon={ClipboardList}>Activity</NavLink>
                    <NavLink href="/dashboard/scan-attendance" icon={QrCode}>Scan Attendance</NavLink>
                </nav>
            </div>
            <div className="mt-auto flex flex-col gap-2 p-4 border-t dark:border-slate-800">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                >
                    <LogOut className="h-5 w-5" />
                    Logout
                </button>
                 <div className="pt-2 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Developed by: <strong>Christian B. Maglangit</strong>
                    </p>
                </div>
            </div>
        </div>
    );
};


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
            try {
                const today = new Date().toISOString().slice(0, 10);
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const tomorrowStart = new Date(todayStart);
                tomorrowStart.setDate(tomorrowStart.getDate() + 1);

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

            } catch (error) {
                console.error("Failed to fetch dashboard stats:", error);
            } finally {
                setLoadingStats(false);
            }
        };

        fetchDashboardStats();
    }, []);

    return (
        <div className="grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">

            <aside className="hidden border-r bg-white md:block dark:bg-slate-900 dark:border-slate-800">
                <SidebarContent />
            </aside>

            <div
                className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 md:hidden ${
                    isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setSidebarOpen(false)}
            />
            <div
                className={`fixed top-0 left-0 h-full w-[280px] border-r bg-white dark:bg-slate-900 dark:border-slate-800 z-40 transform transition-transform duration-300 ease-in-out md:hidden ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <SidebarContent />
            </div>

            <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
                <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-white/80 backdrop-blur-sm px-4 lg:px-6 dark:bg-slate-900/80 dark:border-slate-800 z-10">
                    <button
                        className="md:hidden p-2 -ml-2"
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                    >
                        {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                    <div className="w-full flex-1">
                        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Dashboard</h1>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                    <h1 className="text-2xl font-bold tracking-tight mb-6 text-slate-800 dark:text-white">
                        Dashboard Overview
                    </h1>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <StatCard title="Total Students" value={stats.totalStudents} icon={Users} isLoading={loadingStats} />
                        <StatCard title="Active Activities" value={stats.activeActivities} icon={Activity} isLoading={loadingStats} />
                        <StatCard title="Scans Today" value={stats.scansToday} icon={CheckCircle} isLoading={loadingStats} />
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