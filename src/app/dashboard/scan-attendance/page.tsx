'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Html5Qrcode } from 'html5-qrcode';
import Swal from 'sweetalert2';
import {
  LayoutDashboard, Users, ClipboardList, QrCode, LogOut, Menu, X, UserCheck, Search, Camera, CameraOff
} from 'lucide-react';

// --- Type Definitions (No change) ---
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

// --- Reusable UI Components (No change) ---
const NavLink = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode; }) => {
    const pathname = usePathname();
    const isActive = pathname.startsWith(href);
    return (
        <Link
        href={href}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-800 ${
            isActive
            ? 'bg-gray-100 text-green-600 dark:bg-gray-800 font-semibold'
            : 'text-gray-500 dark:text-gray-400'
        }`}
        >
        <Icon className="h-5 w-5" />
        {children}
        </Link>
    );
};

const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }
> = ({ children, className, variant = 'primary', ...props }) => {
  const base =
    'text-center px-6 py-2.5 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-transform transform hover:scale-105 whitespace-nowrap';
  const styles = {
    primary: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    secondary:
      'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600',
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};


// --- Main Scan Attendance Page Component ---
export default function ScanAttendancePage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);
  
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  
  const [isCameraOn, setCameraOn] = useState(false);
  const [scannedStudents, setScannedStudents] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    setCurrentDateTime(new Date()); 
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const scannerId = 'reader';
    const html5QrCode = new Html5Qrcode(scannerId);
    let isProcessing = false; // Simple lock to prevent re-entry

    const determineAttendanceStatus = (activity: Activity): { status: string, type: 'success'|'warning'|'error' } => {
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
        if (isProcessing) return; // Ayaw i-process kung naa pay ga-dagan
        isProcessing = true; // I-lock para dili mag-double scan

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
                await Swal.fire({ icon: 'warning', title: 'Scan Warning', text: `${studentData.full_name} - ${attendance.status}`, timer: 2500, showConfirmButton: false });
                return;
            }

            const { data: existingRecord, error: checkError } = await supabase.from('attendance_report').select('id').eq('activity_id', selectedActivity!.id).eq('student_id', studentId).eq('status', attendance.status).maybeSingle();
            if (checkError) {
                await Swal.fire({ icon: 'error', title: 'Database Error', text: `Could not verify attendance: ${checkError.message}`, timer: 2500, showConfirmButton: false });
                return;
            }

            if (existingRecord) {
                await Swal.fire({ icon: 'warning', title: 'Already Scanned', text: `${studentData.full_name} has already recorded a "${attendance.status}".`, timer: 2500, showConfirmButton: false });
                return;
            }

            const { error: insertError } = await supabase.from('attendance_report').insert({ activity_id: selectedActivity!.id, student_id: studentData.student_id, status: attendance.status, scanned_at: new Date().toISOString() });
            if (insertError) {
                await Swal.fire({ icon: 'error', title: 'Database Error', text: `Could not save attendance: ${insertError.message}`, timer: 2500, showConfirmButton: false });
                return;
            }

            await Swal.fire({ icon: 'success', title: 'Saved!', text: `${studentData.full_name} - ${attendance.status}`, timer: 2500, showConfirmButton: false });
            const newRecord: AttendanceRecord = { ...studentData, scanTime: new Date().toLocaleTimeString(), status: attendance.status, statusType: attendance.type };
            setScannedStudents(prev => [newRecord, ...prev]);
        } finally {
            // ✅ I-release ang lock human sa timer
            setTimeout(() => {
                isProcessing = false;
            }, 2500);
        }
    };

    if (isCameraOn && selectedActivity) {
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5QrCode.start({ facingMode: "environment" }, config, processScan, (errorMessage) => {})
            .catch(() => {
                Swal.fire({ icon: 'error', title: 'Camera Error', text: 'Cannot start camera. Please grant permissions.' });
                setCameraOn(false);
            });
    }

    return () => {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().catch(() => {});
        }
    };
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

  return (
    <div className={`grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]`}>
      {/* Sidebar */}
      <div className="hidden border-r bg-white md:block dark:bg-gray-900/40 dark:border-gray-800">
        <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                <UserCheck className="h-6 w-6 text-green-600" />
                <span>Student Activity</span>
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
                <LogOut className="h-5 w-5" /> Logout
                </Link>
            </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-white px-4 lg:h-[60px] lg:px-6 dark:bg-gray-900/40 dark:border-gray-800">
          <button className="md:hidden" onClick={() => setSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <h1 className="text-lg font-semibold">Scan Attendance</h1>
        </header>

        <main className={`flex flex-1 flex-col gap-6 p-4 lg:p-6 bg-gray-100/40 dark:bg-gray-800/40`}>
            {/* Top Section */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className='bg-white p-6 rounded-lg shadow-md dark:bg-gray-900'>
                    <label htmlFor="activity-search" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">1. Select Activity</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            id="activity-search"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (selectedActivity) {
                                  setSelectedActivity(null);
                                  setCameraOn(false);
                                }
                            }}
                            placeholder="Search for an activity..."
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                        />
                        {suggestions.length > 0 && (
                            <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {suggestions.map(activity => (
                                    <li key={activity.id} onClick={() => handleSelectActivity(activity)} className="px-4 py-2 cursor-pointer hover:bg-gray-100">{activity.name}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                <div className='bg-white p-6 rounded-lg shadow-md dark:bg-gray-900 text-center'>
                    {currentDateTime ? (
                        <>
                            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">{currentDateTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p className="text-4xl font-bold text-green-600 tracking-wider">{currentDateTime.toLocaleTimeString()}</p>
                        </>
                    ) : (
                        <>
                            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">&nbsp;</p>
                            <p className="text-4xl font-bold text-green-600 tracking-wider">--:--:-- --</p>
                        </>
                    )}
                </div>
            </div>

            {/* Middle Section: Scanner */}
            <div className='bg-white p-6 rounded-lg shadow-md dark:bg-gray-900'>
                <div className="flex justify-between items-center mb-4">
                    <h2 className='text-lg font-semibold'>2. QR Code Scanner</h2>
                    <Button onClick={() => setCameraOn(prev => !prev)} disabled={!selectedActivity} className='w-auto flex items-center gap-2' variant={isCameraOn ? 'secondary' : 'primary'}>
                        {isCameraOn ? <><CameraOff size={18}/> Stop Scanner</> : <><Camera size={18}/> Start Scanner</>}
                    </Button>
                </div>
                <div className='w-full max-w-md mx-auto aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center'>
                    <div id="reader" className="w-full"></div>
                    {!isCameraOn && (
                         <div className='text-center text-gray-500 -mt-10'>
                            <CameraOff size={48} className='mx-auto mb-2'/>
                            <p>{!selectedActivity ? "Please select an activity first." : "Scanner is off."}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Section: Scanned Students Table */}
            <div className="bg-white p-6 rounded-lg shadow-md dark:bg-gray-900">
                <h2 className='text-lg font-semibold mb-4'>3. Scanned Students Log</h2>
                <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3">ID Number</th>
                                <th scope="col" className="px-6 py-3">Full Name</th>
                                <th scope="col" className="px-6 py-3">Course & Year</th>
                                <th scope="col" className="px-6 py-3">Time</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scannedStudents.length > 0 ? (
                                scannedStudents.map((student) => (
                                    <tr key={`${student.student_id}-${student.status}`} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                        <td className="px-6 py-4 font-mono">{student.student_id}</td>
                                        <td className="px-6 py-4 font-medium">{student.full_name}</td>
                                        <td className="px-6 py-4">{student.course} - {student.year_level}</td>
                                        <td className="px-6 py-4">{student.scanTime}</td>
                                        <td className={`px-6 py-4 font-semibold text-green-500`}>{student.status}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center p-6 text-gray-500">No students scanned yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
      </div>
    </div>
  );
}