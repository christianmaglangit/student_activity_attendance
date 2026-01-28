'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    LayoutDashboard, Users, ClipboardList, QrCode, LogOut, UserCheck, Activity as ActivityIcon,
    Search, Download, Loader2
} from 'lucide-react';

// --- TYPES ---
type Collection = { id: number; title: string; default_amount: number; };

type Student = { 
    student_id: string; 
    full_name: string; 
    year_level: string; 
    course: string; 
};

type Activity = {
    id: number;
    name: string;
    activity_type: string;
    collection_id: number | null;
    collections?: Collection;
};

type ActivitySchedule = {
    id: number;
    activity_id: number;
    am_in: string | null;
    am_out: string | null;
    pm_in: string | null;
    pm_out: string | null;
};

type AttendanceReport = {
    id: number;
    activity_id: number;
    student_id: string;
    status: string; // e.g., "Time In (AM)"
    scanned_at: string;
};

type StudentActivitySummary = {
    student_id: string;
    full_name: string;
    activities: Map<number, {
        statusString: string;
        attended: number;
        totalSlots: number;
        fines: number;
    }>;
    total_fines: number;
};

// --- HELPER COMPONENTS ---
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

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = ({ children, className, variant = 'primary', ...props }) => {
    const base = 'inline-flex items-center justify-center text-center px-4 h-10 text-sm font-semibold rounded-lg shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-150 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed';
    const styles = {
        primary: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500',
        secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300 focus-visible:ring-slate-400 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
        ghost: 'bg-transparent text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 shadow-none',
    };
    return (
        <button className={`${base} ${styles[variant]} ${className}`} {...props} suppressHydrationWarning>
            {children}
        </button>
    );
};

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string, icon?: React.ElementType }> = ({ label, id, className, icon: Icon, ...props }) => {
    const hasIcon = !!Icon;
    return (
        <div className="relative w-full">
            {label && (
                <label htmlFor={id} className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </label>
            )}
            <div className="relative flex items-center">
                {Icon && <Icon className="absolute left-3 h-5 w-5 text-slate-400 pointer-events-none" />}
                <input
                    id={id}
                    className={`uppercase w-full h-10 bg-transparent border border-slate-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${hasIcon ? 'pl-10 pr-4' : 'px-4'} ${className}`} 
                    {...props}
                />
            </div>
        </div>
    );
};

// --- LAYOUT COMPONENTS ---
const SidebarContent = ({ onLogout }: { onLogout: () => void }) => {
    return (
        <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-16 items-center border-b px-4 lg:px-6 dark:border-slate-800">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
                    <UserCheck className="h-6 w-6 text-green-600" />
                    <span className="text-slate-800 dark:text-white">Attendance Portal</span>
                </Link>
            </div>
            <div className="flex-1 py-2">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                    <NavLink href="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
                    <NavLink href="/dashboard/student-list" icon={Users}>Student List</NavLink>
                    <NavLink href="/dashboard/activity" icon={ClipboardList}>Activity</NavLink>
                    <NavLink href="/dashboard/scan-attendance" icon={QrCode}>Scan Attendance</NavLink>
                    <NavLink href="/dashboard/fines-report" icon={ActivityIcon}>Fines Report</NavLink>
                </nav>
            </div>
            <div className="mt-auto p-4 border-t dark:border-slate-800">
                <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                    <LogOut className="h-5 w-5" /> Logout
                </button>
            </div>
            <div className="pb-4 text-center px-4">
                <p className="text-xs text-slate-500 dark:text-slate-400"> Developed by: <strong>Christian B. Maglangit</strong> </p>
            </div>
        </div>
    );
};

const BottomNavBar = () => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-20 h-20 border-t bg-white shadow-[0_-2px_6px_rgba(0,0,0,0.06)] md:hidden dark:bg-slate-900 dark:border-slate-800">
            <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-2">
                <BottomNavLink href="/dashboard" icon={LayoutDashboard}>Home</BottomNavLink>
                <BottomNavLink href="/dashboard/student-list" icon={Users}>Students</BottomNavLink>
                <div className="flex justify-center">
                    <Link href="/dashboard/scan-attendance" className="flex flex-col h-16 w-16 -mt-6 items-center justify-center rounded-full bg-red-600 text-white shadow-lg" aria-label="Scan QR Code" >
                        <QrCode className="h-7 w-7" /> <span className="text-sm font-medium">Scan</span>
                    </Link>
                </div>
                <BottomNavLink href="/dashboard/activity" icon={ClipboardList}>Activity</BottomNavLink>
                <BottomNavLink href="/dashboard/fines-report" icon={ActivityIcon}>Fines</BottomNavLink>
            </div>
            <div className="text-center pb-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Developed by: <strong>Christian B. Maglangit</strong>
                </p>
            </div>
        </nav>
    );
};

const BottomNavLink = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode; }) => {
    const pathname = usePathname();
    const isActive = href === "/dashboard" ? pathname === href : href !== "/" && pathname.startsWith(href);
    return (
        <Link href={href} className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors ${ isActive ? 'text-red-600' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200' }`} >
            <Icon className="h-6 w-6" /> <span className="text-xs font-medium">{children}</span>
        </Link>
    );
};

// --- MAIN PAGE COMPONENT ---
export default function ActivityReportPage() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [schedules, setSchedules] = useState<ActivitySchedule[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceReport[]>([]);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    const router = useRouter();
    const handleLogout = async () => { await supabase.auth.signOut(); router.push('/'); router.refresh(); };

    const loadInitialData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Activities
            const { data: actData, error: actError } = await supabase
                .from('activities')
                .select('*, collections(*)')
                .order('start_date', { ascending: true });
            if (actError) throw actError;

            // 2. Fetch Students
            const { data: studData, error: studError } = await supabase
                .from('students')
                .select('*')
                .order('full_name', { ascending: true });
            if (studError) throw studError;

            // 3. Fetch Schedules
            const { data: schedData, error: schedError } = await supabase
                .from('activity_schedules')
                .select('*');
            if (schedError) throw schedError;

            // 4. Fetch Attendance (LOOPING PARA MAKUHA TANAN)
            let allAttendance: AttendanceReport[] = [];
            let page = 0;
            const pageSize = 1000; // Kwaon nato tag 1,000 per batch
            let fetchMore = true;

            while (fetchMore) {
                const { data: batchData, error: batchError } = await supabase
                    .from('attendance_report')
                    .select('*')
                    .range(page * pageSize, (page + 1) * pageSize - 1);

                if (batchError) throw batchError;

                if (batchData && batchData.length > 0) {
                    // I-combine ang bag-ong batch sa existing data
                    allAttendance = [...allAttendance, ...batchData as AttendanceReport[]];
                    
                    // Kung ang nakuha gamay ra sa 1000, meaning mao na to ang last batch
                    if (batchData.length < pageSize) {
                        fetchMore = false;
                    } else {
                        page++; // Move to next page
                    }
                } else {
                    fetchMore = false; // Wala nay data
                }
            }

            // Set state using the complete accumulated data
            setActivities(actData as Activity[]);
            setStudents(studData as Student[]);
            setSchedules(schedData as ActivitySchedule[]);
            setAttendanceLogs(allAttendance); // Kani ang complete nga walay limit

        } catch (error: unknown) { 
            if (error instanceof Error) console.error('Error loading data:', error.message); 
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadInitialData(); }, [loadInitialData]);

    // --- DATA PROCESSING LOGIC (FIXED) ---
    const studentActivitySummaries = useMemo((): StudentActivitySummary[] => {
        const lowerSearch = searchQuery.toLowerCase();

        // 1. Calculate Total Slots per Activity based on schedule
        const activityTotalSlots = new Map<number, number>();
        activities.forEach(act => {
            const actScheds = schedules.filter(s => s.activity_id === act.id);
            let total = 0;
            actScheds.forEach(sched => {
                // Check for null or empty string explicitly
                if (sched.am_in && sched.am_in !== "") total++;
                if (sched.am_out && sched.am_out !== "") total++;
                if (sched.pm_in && sched.pm_in !== "") total++;
                if (sched.pm_out && sched.pm_out !== "") total++;
            });
            activityTotalSlots.set(act.id, total);
        });

        // 2. Map Attendance (STRICT MATCHING)
        const studentAttendanceMap = new Map<string, Map<number, Set<string>>>();
        
        // Only count these specific statuses to match scanning page logic
        const validStatuses = new Set(['Time In (AM)', 'Time Out (AM)', 'Time In (PM)', 'Time Out (PM)']);

        attendanceLogs.forEach(log => {
            if (!log.student_id) return;
            if (!validStatuses.has(log.status)) return; // Ignore invalid statuses

            // NORMALIZE ID: Remove spaces and uppercase to ensure matching matches Student List
            const sId = log.student_id.trim().toUpperCase();
            
            // Normalize Activity ID to number
            const aId = Number(log.activity_id);
            
            const status = log.status; 

            if (!studentAttendanceMap.has(sId)) {
                studentAttendanceMap.set(sId, new Map());
            }

            const activitiesMap = studentAttendanceMap.get(sId)!;
            
            if (!activitiesMap.has(aId)) {
                activitiesMap.set(aId, new Set());
            }

            // Using Set automatically handles duplicates (e.g. 2x AM In counts as 1)
            activitiesMap.get(aId)!.add(status); 
        });

        // 3. Filter Students
        const filteredStudents = students.filter(s => 
            s.full_name.toLowerCase().includes(lowerSearch) || 
            s.student_id.toLowerCase().includes(lowerSearch)
        );

        // 4. Build Summary
        return filteredStudents.map(student => {
            const activityMap = new Map();
            let totalFines = 0;
            const normalizedStudentId = student.student_id.trim().toUpperCase();

            activities.forEach(act => {
                const totalSlots = activityTotalSlots.get(act.id) || 0;
                
                // Get the unique set of scans for this student & activity
                const uniqueScans = studentAttendanceMap.get(normalizedStudentId)?.get(act.id);
                
                // The size of the Set is the actual number of unique valid scans
                const attended = uniqueScans ? uniqueScans.size : 0;
                
                const statusString = `${attended}/${totalSlots}`;

                // --- FINE CALCULATION ---
                const absences = Math.max(0, totalSlots - attended);
                const finePerAbsence = 50; 
                const activityFine = absences * finePerAbsence;

                totalFines += activityFine;

                activityMap.set(act.id, {
                    statusString,
                    attended,
                    totalSlots,
                    fines: activityFine
                });
            });

            return {
                student_id: student.student_id,
                full_name: student.full_name,
                activities: activityMap,
                total_fines: totalFines
            };
        });

    }, [students, activities, schedules, attendanceLogs, searchQuery]);


    const handleGeneratePDF = () => {
    setIsGeneratingReport(true);
    try {
        const doc = new jsPDF({ orientation: 'landscape' });
        const pageWidth = doc.internal.pageSize.getWidth();
        
        doc.setFontSize(16); doc.text("Attendance Activity Report", pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(10); doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });

        // Define Headers
        const headRow1 = [
            { 
                content: 'ID Number', 
                rowSpan: 2, 
                // FIX: Use 'as const' instead of 'as "middle"'
                styles: { valign: 'middle' as const, halign: 'center' as const } 
            },
            { 
                content: 'Name', 
                rowSpan: 2, 
                // FIX: Use 'as const'
                styles: { valign: 'middle' as const, halign: 'center' as const } 
            },
            ...activities.map(act => ({ 
                content: `${act.name}\n(${act.activity_type.toUpperCase().replace('_', ' ')})`, 
                colSpan: 1, 
                // FIX: Use 'as const'
                styles: { halign: 'center' as const } 
            })),
            { 
                content: 'Total Fines', 
                rowSpan: 2, 
                // FIX: Use 'as const'
                styles: { valign: 'middle' as const, halign: 'center' as const } 
            }
        ];

        const headRow2 = activities.map(() => ({ 
            content: 'STATUS', 
            // FIX: Use 'as const'
            styles: { halign: 'center' as const, fontSize: 8 } 
        }));

        const bodyData = studentActivitySummaries.map(student => {
            const row: (string | number)[] = [
                student.student_id,
                student.full_name,
            ];
            activities.forEach(act => {
                const data = student.activities.get(act.id);
                row.push(data?.statusString || "0/0");
            });
            row.push(`P ${student.total_fines}`);
            return row;
        });

        autoTable(doc, {
            head: [headRow1, headRow2],
            body: bodyData,
            startY: 35,
            theme: 'grid',
            headStyles: { fillColor: [22, 160, 133], textColor: 255, lineColor: 200, lineWidth: 0.1 },
            styles: { lineColor: 200, lineWidth: 0.1 }, 
        });

        doc.save('Activity_Report.pdf');
    } catch (e) {
        console.error(e);
        alert("Error generating PDF");
    } finally {
        setIsGeneratingReport(false);
    }
};

    return (
        <div className={`grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]`}>
            <div className="hidden border-r bg-white md:block dark:bg-slate-900 dark:border-slate-800">
                <SidebarContent onLogout={handleLogout} />
            </div>

            <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
                <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b bg-white/80 backdrop-blur-sm px-4 lg:px-6 dark:bg-slate-900/80 dark:border-slate-800 z-10">
                    <div className="w-full flex-1 flex items-center justify-between">
                        <h1 className="text-xl font-semibold text-slate-800 dark:text-white"> Activity Report </h1>
                        <button onClick={handleLogout} className="p-2 rounded-full md:hidden text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50" aria-label="Logout">
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                <main className={`flex-1 overflow-y-auto p-4 lg:p-6 pb-20`}>
                    <div className="flex flex-col md:flex-row gap-4 mb-6 md:items-end">
                         <div className="flex-1">
                             <Input id="search-student" placeholder="Search name or ID..." icon={Search} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} label="Search Student" className="uppercase" />
                         </div>
                        <div className="flex gap-2 flex-shrink-0 w-full md:w-auto">
                            <Button variant="primary" onClick={handleGeneratePDF} disabled={isGeneratingReport || loading} className="flex-1 md:flex-auto">
                                {isGeneratingReport ? <Loader2 size={16} className="animate-spin mr-2"/> : <Download size={16} className="mr-2" />} 
                                Download Report
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-center text-slate-500 dark:text-slate-400 table-fixed min-w-[1000px] border-collapse">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-800 dark:text-slate-400">
                                    {/* ROW 1: Main Headers */}
                                    <tr>
                                        <th scope="col" rowSpan={2} className="px-6 py-3 w-32 border border-slate-300 dark:border-slate-700">ID number</th>
                                        <th scope="col" rowSpan={2} className="px-6 py-3 w-48 border border-slate-300 dark:border-slate-700">Name</th>
                                        
                                        {/* Dynamic Activity Headers */}
                                        {activities.map(act => (
                                            <th key={act.id} scope="col" className="px-4 py-2 border border-slate-300 dark:border-slate-700 font-bold bg-slate-200 dark:bg-slate-700 w-48">
                                                <div className="flex flex-col">
                                                    <span>{act.name}</span>
                                                    <span className="text-[10px] text-slate-500 font-normal">
                                                        ({act.activity_type === 'whole_day' ? 'WHOLE DAY' : 'HALF DAY'})
                                                    </span>
                                                </div>
                                            </th>
                                        ))}

                                        <th scope="col" rowSpan={2} className="px-6 py-3 w-32 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
                                            TOTAL FINES
                                        </th>
                                    </tr>
                                    {/* ROW 2: Sub-headers (STATUS) */}
                                    <tr>
                                        {activities.map(act => (
                                            <th key={`sub-${act.id}`} className="px-2 py-1 border border-slate-300 dark:border-slate-700 text-[10px] font-bold tracking-wider">
                                                STATUS
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                     {loading ? (
                                      <tr><td colSpan={3 + activities.length} className="text-center p-6 border border-slate-300 dark:border-slate-700">Loading data...</td></tr>
                                     ) : studentActivitySummaries.length > 0 ? (
                                      studentActivitySummaries.map((student) => (
                                          <tr key={student.student_id} className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800">
                                              <td className="px-6 py-4 font-medium text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700">
                                                  {student.student_id}
                                              </td>
                                              <td className="px-6 py-4 text-left border border-slate-300 dark:border-slate-700 uppercase">
                                                  {student.full_name}
                                              </td>
                                              
                                              {/* Activity Status Cells */}
                                              {activities.map(act => {
                                                  const data = student.activities.get(act.id);
                                                  return (
                                                      <td key={act.id} className="px-4 py-4 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium">
                                                          {data?.statusString || "0/0"}
                                                      </td>
                                                  );
                                              })}

                                              {/* Total Fines */}
                                              <td className="px-6 py-4 font-bold text-red-600 border border-slate-300 dark:border-slate-700">
                                                  {student.total_fines > 0 ? `₱${student.total_fines}` : '-'}
                                              </td>
                                          </tr>
                                       ))
                                     ) : (
                                       <tr><td colSpan={3 + activities.length} className="text-center p-6 border border-slate-300 dark:border-slate-700">No students found.</td></tr>
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