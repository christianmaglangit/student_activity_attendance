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
  BarChart3,
  CheckCircle,
  Activity
} from 'lucide-react';

// --- Reusable Sub-Components ---

const NavLink = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode; }) => {
  const pathname = usePathname();
  // Changed to startsWith for better active state detection on nested routes
  const isActive = pathname.startsWith(href);

  return (
    <Link href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-800 ${isActive ? 'bg-gray-100 text-green-600 dark:bg-gray-800 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
      <Icon className="h-5 w-5" />
      {children}
    </Link>
  );
};

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType; }) => (
  <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow dark:bg-gray-900">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <p className="text-3xl font-bold mt-2">{value}</p>
      </div>
      <div className="bg-green-100 p-3 rounded-full dark:bg-green-900/50">
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
    router.push('/'); // I-redirect sa home page
    router.refresh(); // I-refresh para ma-clear tanan
  };

  return (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <UserCheck className="h-6 w-6 text-green-600" />
          <span className="">Student Activity</span>
        </Link>
      </div>
      <div className="flex-1">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          <NavLink href="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
          <NavLink href="/dashboard/student-list" icon={Users}>Student List</NavLink>
          <NavLink href="/dashboard/activity" icon={ClipboardList}>Activity</NavLink>
          <NavLink href="/dashboard/scan-attendance" icon={QrCode}>Scan Attendance</NavLink>
        </nav>
      </div>
      <div className="mt-auto p-4">
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
};


// --- Main Dashboard Page Component ---

export default function DashboardPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  // States for stats
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeActivities: 0,
    scansToday: 0
  });

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoadingStats(true);

      // 1. Get Total Students
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      // 2. Get Active Activities (end date is today or in the future)
      const today = new Date().toISOString().split('T')[0];
      const { count: activityCount } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .gte('end_date', today);
        
      // 3. Get Scans Today
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
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      
      {/* Sidebar (Desktop) */}
      <div className="hidden border-r bg-white md:block dark:bg-gray-900 dark:border-gray-800">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar (Slide-out) */}
      <div className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 md:hidden ${ isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none' }`} onClick={() => setSidebarOpen(false)}></div>
      <div className={`fixed top-0 left-0 h-full w-[280px] border-r bg-white dark:bg-gray-900 dark:border-gray-800 z-40 transform transition-transform duration-300 ease-in-out md:hidden ${ isSidebarOpen ? 'translate-x-0' : '-translate-x-full' }`}>
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-white px-4 lg:h-[60px] lg:px-6 dark:bg-gray-900/40 dark:border-gray-800">
          <button
            className="md:hidden"
            onClick={() => setSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <div className="w-full flex-1">
            <h1 className="text-lg font-semibold">Dashboard</h1>
          </div>
        </header>
        
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-gray-100/40 dark:bg-gray-800/40">
            <div>
              <h1 className="text-2xl font-bold tracking-tight mb-6">Dashboard Overview</h1>
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

              <div className="mt-8 bg-white p-6 rounded-lg shadow-md dark:bg-gray-900">
                <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                <p className="text-gray-500">Placeholder for recent student attendance logs or a chart...</p>
              </div>
            </div>
        </main>
      </div>
    </div>
  );
}