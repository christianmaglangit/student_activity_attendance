'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Html5Qrcode } from 'html5-qrcode';
import Swal from 'sweetalert2';
import {
    LayoutDashboard, Users, ClipboardList, QrCode, LogOut, Menu, X, UserCheck, Search, Camera, CameraOff,
    CheckCircle, AlertTriangle as WarningIcon, XCircle, Clock
} from 'lucide-react';

// --- Type Definitions (No Changes) ---
type ActivitySchedule = {
    id?: number;
    activity_id?: number;
    date: string;
    am_in: string;
    am_out: string;
    pm_in: string;
    pm_out: string;
};

type Activity = {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    activity_schedules: ActivitySchedule[];
};

type Student = {
    student_id: string;
    full_name: string;
    gender: string;
    course: string;
    year_level: string;
};

type AttendanceRecord = Student & {
    scanTime: string;
    status: string;
    statusType: 'success' | 'error' | 'warning';
};

// --- Reusable UI Components (STYLES UPDATED) ---
const NavLink = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode; }) => {
    const pathname = usePathname();
    const isActive = pathname.startsWith(href);
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

const Button: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }
> = ({ children, className, variant = 'primary', ...props }) => {
    const base = 'inline-flex items-center justify-center text-center px-4 py-2 text-sm font-semibold rounded-lg shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-150 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed';
    const styles = {
        primary: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500',
        secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300 focus-visible:ring-slate-400 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
    };
    return (
        <button className={`${base} ${styles[variant]} ${className}`} {...props} suppressHydrationWarning>
            {children}
        </button>
    );
};

// --- Sidebar Content Component (STYLES UPDATED) ---
const SidebarContent = ({ onLogout }: { onLogout: () => void }) => (
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
            <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                <LogOut className="h-5 w-5" /> Logout
            </button>
        </div>
        <div className="pb-4 text-center px-4"> <p className="text-xs text-slate-500 dark:text-slate-400"> Developed by: <strong>Christian B. Maglangit</strong> </p> </div>
    </div>
);

// --- Attendance Log Item Component (No Changes) ---
const AttendanceLogItem = ({ record }: { record: AttendanceRecord }) => {
    const statusInfo = {
        success: { icon: CheckCircle, color: 'text-green-500' },
        warning: { icon: WarningIcon, color: 'text-yellow-500' },
        error: { icon: XCircle, color: 'text-red-500' },
    };
    const StatusIcon = statusInfo[record.statusType].icon;

    return (
        <div className="flex items-start gap-4 p-4 border-b border-slate-200 dark:border-slate-800">
            <StatusIcon className={`w-6 h-6 flex-shrink-0 mt-1 ${statusInfo[record.statusType].color}`} />
            <div className="flex-1">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{record.full_name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{record.student_id}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 dark:text-slate-500">
                    <Clock size={14} />
                    <span>{record.scanTime} - {record.status}</span>
                </div>
            </div>
        </div>
    );
};

// --- Main Scan Attendance Page Component ---
export default function ScanAttendancePage() {
    // State and Hooks (No Changes)
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);
    const [allActivities, setAllActivities] = useState<Activity[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Activity[]>([]);
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
    const [isCameraOn, setCameraOn] = useState(false);
    const [scannedStudents, setScannedStudents] = useState<AttendanceRecord[]>([]);
    const router = useRouter();

    // All Functions (No Changes)
    useEffect(() => {
        setCurrentDateTime(new Date());
        const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // --- MODIFIED USEEFFECT FOR CAMERA ---
    useEffect(() => {
        // Only run this effect if the camera is intended to be on.
        if (isCameraOn && selectedActivity) {
            const scannerId = 'reader';
            // Create a new scanner instance only when needed.
            const html5QrCode = new Html5Qrcode(scannerId);
            let isProcessing = false;

            const determineAttendanceStatus = (activity: Activity): { status: string, type: 'success' | 'warning' | 'error' } => {
                const now = new Date();
                const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                const todaySchedule = activity.activity_schedules.find(s => s.date === todayStr);
                if (!todaySchedule) return { status: "No schedule for today", type: 'error' };
                const parseTime = (timeStr: string) => {
                    const [hours, minutes] = timeStr.split(':').map(Number);
                    const date = new Date(now);
                    date.setHours(hours, minutes, 0, 0);
                    return date;
                };
                const gracePeriod = 120 * 60000;
                const amIn = parseTime(todaySchedule.am_in);
                const amOut = parseTime(todaySchedule.am_out);
                const pmIn = parseTime(todaySchedule.pm_in);
                const pmOut = parseTime(todaySchedule.pm_out);
                if (now >= amIn && now < new Date(amIn.getTime() + gracePeriod)) return { status: 'Time In (AM)', type: 'success' };
                if (now >= amOut && now < new Date(amOut.getTime() + gracePeriod)) return { status: 'Time Out (AM)', type: 'success' };
                if (now >= pmIn && now < new Date(pmIn.getTime() + gracePeriod)) return { status: 'Time In (PM)', type: 'success' };
                if (now >= pmOut && now < new Date(pmOut.getTime() + gracePeriod)) return { status: 'Time Out (PM)', type: 'success' };
                return { status: 'Out of schedule bounds', type: 'warning' };
            };

            const processScan = async (decodedText: string) => {
                if (isProcessing) return;
                isProcessing = true;
                try {
                    let studentId: string;
                    try {
                        const qrData = JSON.parse(decodedText);
                        studentId = qrData.student_id;
                    } catch (e) {
                        studentId = decodedText;
                    }
                    if (!studentId) {
                        await Swal.fire({ icon: 'error', title: 'Invalid QR', text: 'The QR Code format is invalid.', timer: 2500, showConfirmButton: false });
                        return;
                    }
                    const { data: studentData, error: studentError } = await supabase.from('students').select('student_id, full_name, gender, course, year_level').eq('student_id', studentId).single();
                    if (studentError || !studentData) {
                        await Swal.fire({ icon: 'error', title: 'Not Found', text: `Student ID "${studentId}" not found.`, timer: 2500, showConfirmButton: false });
                        return;
                    }
                    const attendance = determineAttendanceStatus(selectedActivity!);
                    if (attendance.type === 'error' || attendance.type === 'warning') {
                        const newRecord: AttendanceRecord = { ...studentData, scanTime: new Date().toLocaleTimeString(), status: attendance.status, statusType: attendance.type };
                        setScannedStudents(prev => [newRecord, ...prev]);
                        await Swal.fire({ icon: 'warning', title: 'Scan Warning', text: `${studentData.full_name} - ${attendance.status}`, timer: 2500, showConfirmButton: false });
                        return;
                    }
                    const { data: existingRecord } = await supabase.from('attendance_report').select('id').eq('activity_id', selectedActivity!.id).eq('student_id', studentId).eq('status', attendance.status).maybeSingle();
                    if (existingRecord) {
                        await Swal.fire({ icon: 'warning', title: 'Already Scanned', text: `${studentData.full_name} has already recorded a "${attendance.status}".`, timer: 2500, showConfirmButton: false });
                        return;
                    }
                    await supabase.from('attendance_report').insert({ activity_id: selectedActivity!.id, student_id: studentData.student_id, status: attendance.status, scanned_at: new Date().toISOString() });
                    const newRecord: AttendanceRecord = { ...studentData, scanTime: new Date().toLocaleTimeString(), status: attendance.status, statusType: attendance.type };
                    setScannedStudents(prev => [newRecord, ...prev]);
                } finally {
                    setTimeout(() => { isProcessing = false; }, 2000);
                }
            };

            const config = {
                fps: 10,
                qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    const size = Math.max(250, Math.floor(minEdge * 0.8));
                    return { width: size, height: size, };
                },
            };
            
            html5QrCode.start({ facingMode: "environment" }, config, processScan, () => {}).catch(() => {
                Swal.fire({ icon: 'error', title: 'Camera Error', text: 'Cannot start camera. Please grant permissions.' });
                setCameraOn(false);
            });

            // This is the cleanup function that runs when the component unmounts or dependencies change.
            return () => {
                const stopScanner = async () => {
                    if (html5QrCode && html5QrCode.isScanning) {
                        try {
                            await html5QrCode.stop();
                        } catch (err) {
                            // This can happen if the scanner is already stopped. It's safe to ignore.
                            console.error("Failed to stop the scanner cleanly, but this is often okay.", err);
                        }
                    }
                };
                stopScanner();
            };
        }
    }, [isCameraOn, selectedActivity]);
    
    useEffect(() => {
        const fetchActivities = async () => {
            const { data } = await supabase.from('activities').select('*, activity_schedules(*)');
            if (data) setAllActivities(data);
        };
        fetchActivities();
    }, []);

    useEffect(() => {
        if (searchQuery && !selectedActivity) {
            const filtered = allActivities.filter(activity =>
                activity.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setSuggestions(filtered);
        } else {
            setSuggestions([]);
        }
    }, [searchQuery, allActivities, selectedActivity]);

    const handleSelectActivity = (activity: Activity) => {
        setSelectedActivity(activity);
        setSearchQuery(activity.name);
        setSuggestions([]);
        setScannedStudents([]);
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error && error.message !== 'Auth session missing!') {
            console.error('Error logging out:', error.message);
        } else {
            router.push('/');
        }
    };

    return (
        <div className={`grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]`}>
            <style>
                {`
                  #reader video {
                    transform: scaleX(-1);
                    -webkit-transform: scaleX(-1);
                  }
                `}
            </style>
            <div className="hidden border-r bg-white md:block dark:bg-slate-900 dark:border-slate-800">
                <SidebarContent onLogout={handleLogout} />
            </div>

            <div className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 md:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)}></div>
            <div className={`fixed top-0 left-0 h-full w-[280px] border-r bg-white dark:bg-slate-900 dark:border-slate-800 z-40 transform transition-transform duration-300 ease-in-out md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <SidebarContent onLogout={handleLogout} />
            </div>

            <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
                <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b bg-white/80 backdrop-blur-sm px-4 lg:px-6 dark:bg-slate-900/80 dark:border-slate-800 z-10">
                    <button className="md:hidden" onClick={() => setSidebarOpen(!isSidebarOpen)}>
                        {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                    <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Scan Attendance</h1>
                </header>

                <main className={`flex-1 overflow-y-auto p-4 lg:p-6`}>
                    <div className="grid lg:grid-cols-3 gap-6 items-start">
                        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4 lg:col-span-2">
                             <div className="flex justify-between items-center gap-4">
                                <div className="relative flex-grow">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <input
                                        id="activity-search"
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => { setSearchQuery(e.target.value); if (selectedActivity) { setSelectedActivity(null); setCameraOn(false); } }}
                                        placeholder="Search for an activity..."
                                        className="w-full pl-10 pr-4 py-2 bg-transparent border border-slate-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                    />
                                    {suggestions.length > 0 && (
                                        <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto dark:bg-slate-800 dark:border-slate-600">
                                            {suggestions.map(activity => (
                                                <li key={activity.id} onClick={() => handleSelectActivity(activity)} className="px-4 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">{activity.name}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                {currentDateTime && (
                                     <p className="text-sm font-medium text-green-600 dark:text-green-400 flex-shrink-0">{currentDateTime.toLocaleTimeString()}</p>
                                )}
                            </div>
                            
                            <div className="w-full aspect-square lg:h-[500px] bg-slate-100 dark:bg-slate-800/50 rounded-lg overflow-hidden relative flex items-center justify-center">
                                <div id="reader" className="w-full h-full"></div>
                                {!isCameraOn && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-4">
                                        <CameraOff size={48} className="mb-2" />
                                        <p className='text-center text-sm'>
                                            {!selectedActivity ? "Please select an activity first." : "Scanner is off."}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <Button onClick={() => setCameraOn(prev => !prev)} disabled={!selectedActivity} className='w-full flex items-center justify-center gap-2' variant={isCameraOn ? 'danger' : 'primary'}>
                                {isCameraOn ? <><CameraOff size={18}/> Stop Scanner</> : <><Camera size={18}/> Start Scanner</>}
                            </Button>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 h-full flex flex-col max-h-[720px] lg:max-h-[724px]">
                           <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Live Attendance Feed</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Showing {scannedStudents.length} record(s)</p>
                           </div>
                           <div className="flex-1 overflow-y-auto">
                               {scannedStudents.length > 0 ? (
                                   scannedStudents.map((student, index) => (
                                       <AttendanceLogItem key={`${student.student_id}-${index}`} record={student} />
                                   ))
                               ) : (
                                   <div className="flex flex-col items-center justify-center text-center p-10 h-full">
                                        <QrCode className="h-12 w-12 text-slate-400 mb-4" />
                                        <p className="font-semibold text-slate-600 dark:text-slate-300">Waiting for scans...</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Scanned students will appear here in real-time.</p>
                                   </div>
                               )}
                           </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}