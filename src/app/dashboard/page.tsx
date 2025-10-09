// Ibutang sa taas para mugana ang state ug hooks
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  CheckCircle
} from 'lucide-react';

// --- Reusable Sub-Components ---

// Component para sa Sidebar Navigation Link
const NavLink = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode; }) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-800 ${isActive ? 'bg-gray-100 text-green-600 dark:bg-gray-800' : 'text-gray-500 dark:text-gray-400'}`}>
      <Icon className="h-5 w-5" />
      {children}
    </Link>
  );
};

// Component para sa Stat Card
const StatCard = ({ title, value, icon: Icon, description }: { title: string; value: string; icon: React.ElementType; description: string; }) => (
  <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow dark:bg-gray-900">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <p className="text-3xl font-bold mt-2">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      </div>
      <div className="bg-green-100 p-3 rounded-full dark:bg-green-900/50">
        <Icon className="h-6 w-6 text-green-600 dark:text-green-400" />
      </div>
    </div>
  </div>
);

// --- Main Dashboard Page Component ---

export default function DashboardPage() {
  // GIBALIK ANG STATE PARA SA HAMBURGER MENU
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    // GIBALIK ANG LAYOUT NGA SINGLE-COLUMN SA MOBILE
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      
      {/* Sidebar (Desktop - Tago sa mobile) */}
      <div className="hidden border-r bg-white md:block dark:bg-gray-900/40 dark:border-gray-800">
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
             <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
                <LogOut className="h-5 w-5" />
                Logout
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col">
        {/* Header (nga naay Hamburger Menu Button) */}
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
        
        {/* Mobile Sidebar (Mugawas ra kung i-click ang hamburger) */}
        {isSidebarOpen && (
             <div className="md:hidden border-b bg-white dark:bg-gray-900/40 dark:border-gray-800">
                 <nav className="grid gap-2 p-4 text-lg font-medium">
                    <NavLink href="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
                    <NavLink href="/dashboard/student-list" icon={Users}>Student List</NavLink>
                    <NavLink href="/dashboard/activity" icon={ClipboardList}>Activity</NavLink>
                    <NavLink href="/dashboard/scan-attendance" icon={QrCode}>Scan Attendance</NavLink>
                    <hr className="my-2" />
                     <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
                        <LogOut className="h-5 w-5" />
                        Logout
                    </Link>
                </nav>
            </div>
        )}

        {/* Main Content Area */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-gray-100/40 dark:bg-gray-800/40">
           <div>
              <h1 className="text-2xl font-bold tracking-tight mb-6">Dashboard Overview</h1>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                  title="Total Students"
                  value="1,250"
                  icon={Users}
                  description="+20.1% from last month"
                />
                <StatCard 
                  title="Active Activities"
                  value="32"
                  icon={ClipboardList}
                  description="5 upcoming this week"
                />
                <StatCard 
                  title="Attendance Rate"
                  value="92.3%"
                  icon={BarChart3}
                  description="Trending upwards"
                />
                 <StatCard 
                  title="Events Today"
                  value="4"
                  icon={CheckCircle}
                  description="Check the activity list"
                />
              </div>

              <div className="mt-8 bg-white p-6 rounded-lg shadow-md dark:bg-gray-900">
                <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                <p className="text-gray-500">Placeholder for recent student attendance logs or activity updates...</p>
              </div>
            </div>
        </main>
      </div>
    </div>
  );
}
