'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    LayoutDashboard, Users, ClipboardList, QrCode, LogOut, Menu, X, UserCheck, CalendarPlus, Search, CalendarDays, Pencil, Trash2, FileText, Download, Activity
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

type ActivityType = {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    created_at: string;
    user_id: string;
    activity_schedules: ActivitySchedule[];
};

type ReportRow = {
    student_id: string;
    full_name: string;
    course: string;
    year_level: string;
    'Time In (AM)': string | null;
    'Time Out (AM)': string | null;
    'Time In (PM)': string | null;
    'Time Out (PM)': string | null;
    scans_completed: number;
};


// --- Reusable UI Components (STYLES UPDATED) ---
const NavLink = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode; }) => {
    const pathname = usePathname();
    const isActive = pathname.startsWith(href);
    return (
        <Link href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${ isActive ? 'bg-green-100 text-green-700 dark:bg-slate-800 dark:text-slate-50 font-semibold' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50' }`}>
            <Icon className="h-5 w-5" />
            {children}
        </Link>
    );
};

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }> = ({ children, className, variant = 'primary', ...props }) => {
    const base = 'inline-flex items-center justify-center text-center px-4 py-2 text-sm font-semibold rounded-lg shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-150 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed';
    const styles = {
        primary: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500',
        secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300 focus-visible:ring-slate-400 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
    };
    return (
        <button className={`${base} ${styles[variant]} ${className}`} {...props} suppressHydrationWarning>{children}</button>
    );
};

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <input id={id} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:bg-slate-700 dark:border-slate-600 dark:text-white" {...props} />
    </div>
);

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; title: string; size?: 'sm' | 'md' | 'lg' | 'xl'; }> = ({ isOpen, onClose, children, title, size = 'md' }) => {
    if (!isOpen) return null;
    const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-3xl', xl: 'max-w-6xl' };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className={`relative w-full ${sizeClasses[size]} bg-white rounded-xl shadow-2xl dark:bg-slate-800 max-h-[90vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b p-5 dark:border-slate-700 flex-shrink-0">
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6">{children}</div>
                </div>
            </div>
        </div>
    );
};

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
                    <span className="text-slate-800 dark:text-white">Student Activity</span>
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
                    <LogOut className="h-5 w-5" /> Logout
                </button>
            </div>
            <div className="pb-4 text-center px-4"> <p className="text-xs text-slate-500 dark:text-slate-400"> Developed by: <strong>Christian B. Maglangit</strong> </p> </div>
        </div>
    );
};

const ActivityCardSkeleton = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800 animate-pulse">
        <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700"></div>
            <div className="flex-1 space-y-2">
                <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700"></div>
                <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700"></div>
            </div>
        </div>
        <div className="space-y-3 mt-4 pt-4 border-t dark:border-slate-700">
            <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700"></div>
            <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-700"></div>
        </div>
    </div>
);


export default function ActivityPage() {
    // State and hooks
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [activities, setActivities] = useState<ActivityType[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isReportModalOpen, setReportModalOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
    const [activityName, setActivityName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [schedules, setSchedules] = useState<ActivitySchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportData, setReportData] = useState<ReportRow[]>([]);
    const [message, setMessage] = useState('');

    // Functions
    const fetchActivities = async () => { setLoading(true); const { data, error } = await supabase.from('activities').select(`*, activity_schedules (*)`).order('created_at', { ascending: false }); if (error) { console.error('Error fetching:', error); setMessage(`Error: ${error.message}`); } else { setActivities(data || []); } setTimeout(() => setLoading(false), 500); };
    useEffect(() => { fetchActivities(); }, []);

    // --- FIXED: 'prefer-const' error was here ---
    useEffect(() => { 
        if (startDate && endDate) { 
            const start = new Date(startDate); 
            const end = new Date(endDate); 
            if (start > end) { 
                setSchedules([]); 
                return; 
            } 
            const newSchedules: ActivitySchedule[] = [];
            // Changed `let` and `while` to a `for` loop to fix the linter error
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = new Date(d).toISOString().split('T')[0];
                const existingSchedule = selectedActivity?.activity_schedules.find(s => s.date === dateStr); 
                newSchedules.push({ 
                    date: dateStr, 
                    am_in: existingSchedule?.am_in || '08:00', 
                    am_out: existingSchedule?.am_out || '12:00', 
                    pm_in: existingSchedule?.pm_in || '13:00', 
                    pm_out: existingSchedule?.pm_out || '17:00' 
                }); 
            }
            setSchedules(newSchedules); 
        } else { 
            setSchedules([]); 
        } 
    }, [startDate, endDate, selectedActivity]);

    const handleScheduleChange = (index: number, field: keyof Omit<ActivitySchedule, 'id' | 'activity_id' | 'date'>, value: string) => { const updatedSchedules = [...schedules]; updatedSchedules[index] = { ...updatedSchedules[index], [field]: value }; setSchedules(updatedSchedules); };
    const clearForm = () => { setActivityName(''); setStartDate(''); setEndDate(''); setSchedules([]); setMessage(''); setSelectedActivity(null); };
    const handleAddActivity = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); const { data: { user } } = await supabase.auth.getUser(); if (!user) { setMessage("Error: You must be logged in to create an activity."); setLoading(false); return; } const { data: newActivity, error: activityError } = await supabase.from('activities').insert({ name: activityName, start_date: startDate, end_date: endDate, user_id: user.id }).select().single(); if (activityError) { setMessage(`Error: ${activityError.message}`); setLoading(false); return; } const schedulesWithActivityId = schedules.map(sc => ({ ...sc, activity_id: newActivity.id })); const { error: scheduleError } = await supabase.from('activity_schedules').insert(schedulesWithActivityId); if (scheduleError) { setMessage(`Error saving schedules: ${scheduleError.message}`); await supabase.from('activities').delete().eq('id', newActivity.id); } else { setAddModalOpen(false); fetchActivities(); clearForm(); } setLoading(false); };
    const handleUpdateActivity = async (e: React.FormEvent) => { e.preventDefault(); if (!selectedActivity) return; setLoading(true); const { error: uErr } = await supabase.from('activities').update({ name: activityName, start_date: startDate, end_date: endDate }).eq('id', selectedActivity.id); if (uErr) { setMessage(`Error: ${uErr.message}`); setLoading(false); return; } await supabase.from('activity_schedules').delete().eq('activity_id', selectedActivity.id); const s = schedules.map(sc => ({ ...sc, activity_id: selectedActivity.id })); const { error: iErr } = await supabase.from('activity_schedules').insert(s); if (iErr) { setMessage(`Error: ${iErr.message}`); } else { setEditModalOpen(false); fetchActivities(); clearForm(); } setLoading(false); };
    const handleDeleteActivity = async () => { if (!selectedActivity) return; setLoading(true); const { error } = await supabase.from('activities').delete().eq('id', selectedActivity.id); if (error) { setMessage(`Error: ${error.message}`); } else { setDeleteModalOpen(false); fetchActivities(); clearForm(); } setLoading(false); };
    const openEditModal = (activity: ActivityType) => { setSelectedActivity(activity); setActivityName(activity.name); setStartDate(activity.start_date); setEndDate(activity.end_date); setSchedules(activity.activity_schedules); setEditModalOpen(true); };
    const openDeleteModal = (activity: ActivityType) => { setSelectedActivity(activity); setDeleteModalOpen(true); };
    const handleOpenReportModal = async (activity: ActivityType) => { setSelectedActivity(activity); setReportModalOpen(true); setReportLoading(true); const { data: attendanceData, error: attendanceError } = await supabase.from('attendance_report').select('student_id, scanned_at, status').eq('activity_id', activity.id); if (attendanceError || !attendanceData || attendanceData.length === 0) { console.error("Walay attendance data or naay error:", attendanceError); setReportData([]); setReportLoading(false); return; } const studentIds = [...new Set(attendanceData.map((att) => att.student_id))]; const { data: studentsData, error: studentsError } = await supabase.from('students').select('student_id, full_name, course, year_level').in('student_id', studentIds); if (studentsError) { console.error("Error sa pagkuha sa student details:", studentsError); setReportData([]); setReportLoading(false); return; } const reportMap = new Map<string, ReportRow>(); studentsData.forEach(student => { reportMap.set(student.student_id, { student_id: student.student_id, full_name: student.full_name, course: student.course, year_level: student.year_level, 'Time In (AM)': null, 'Time Out (AM)': null, 'Time In (PM)': null, 'Time Out (PM)': null, scans_completed: 0, }); }); attendanceData.forEach(record => { const studentEntry = reportMap.get(record.student_id); if (studentEntry) { const time = new Date(record.scanned_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); if (record.status === 'Time In (AM)') studentEntry['Time In (AM)'] = time; if (record.status === 'Time Out (AM)') studentEntry['Time Out (AM)'] = time; if (record.status === 'Time In (PM)') studentEntry['Time In (PM)'] = time; if (record.status === 'Time Out (PM)') studentEntry['Time Out (PM)'] = time; } }); const finalData = Array.from(reportMap.values()); finalData.forEach(entry => { let count = 0; if (entry['Time In (AM)']) count++; if (entry['Time Out (AM)']) count++; if (entry['Time In (PM)']) count++; if (entry['Time Out (PM)']) count++; entry.scans_completed = count; }); finalData.sort((a, b) => a.full_name.localeCompare(b.full_name)); setReportData(finalData); setReportLoading(false); };
    const handleExportPDF = () => { if (!selectedActivity || reportData.length === 0) return; const doc = new jsPDF({ orientation: 'landscape' }); const pageWidth = doc.internal.pageSize.getWidth(); doc.setFontSize(14); doc.setTextColor(0); doc.text(`College of Computer Studies`, pageWidth / 2, 20, { align: "center" }); doc.text(`Computer Studies Student Organization`, pageWidth / 2, 28, { align: "center" }); doc.text(`${selectedActivity.name} Attendance`, pageWidth / 2, 36, { align: "center" }); doc.setFontSize(11); doc.setTextColor(100); const formattedStartDate = formatDate(selectedActivity.start_date); const formattedEndDate = formatDate(selectedActivity.end_date); const dateString = formattedStartDate === formattedEndDate ? formattedStartDate : `${formattedStartDate} to ${formattedEndDate}`; doc.text(dateString, pageWidth / 2, 44, { align: "center" }); doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 50, { align: "center" }); const tableHeaders = [["ID Number", "Name", "Course & Year", "AM In", "AM Out", "PM In", "PM Out", "Scans"]]; const tableBody = reportData.map(student => [ student.student_id, student.full_name, `${student.course} - ${student.year_level}`, student['Time In (AM)'] || '--', student['Time Out (AM)'] || '--', student['Time In (PM)'] || '--', student['Time Out (PM)'] || '--', `${student.scans_completed} / 4` ]); autoTable(doc, { head: tableHeaders, body: tableBody, startY: 58, theme: 'striped', headStyles: { fillColor: [21, 128, 61] }, }); 
    const safeFileName = selectedActivity.name.replace(/[^a-z0-9]/gi, '_').toLowerCase(); doc.save(`attendance_report_${safeFileName}.pdf`); };
    const closeModal = () => { setAddModalOpen(false); setEditModalOpen(false); setDeleteModalOpen(false); setReportModalOpen(false); clearForm(); }
    const filteredActivities = useMemo(() => { if (!searchQuery.trim()) return activities; return activities.filter(act => act.name.toLowerCase().includes(searchQuery.toLowerCase())); }, [activities, searchQuery]);
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className={`grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]`}>
            <div className="hidden border-r bg-white md:block dark:bg-slate-900 dark:border-slate-800"><SidebarContent /></div>
            <div className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 md:hidden ${ isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none' }`} onClick={() => setSidebarOpen(false)}></div>
            <div className={`fixed top-0 left-0 h-full w-[280px] border-r bg-white dark:bg-slate-900 dark:border-slate-800 z-40 transform transition-transform duration-300 ease-in-out md:hidden ${ isSidebarOpen ? 'translate-x-0' : '-translate-x-full' }`}><SidebarContent /></div>

            <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
                <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b bg-white/80 backdrop-blur-sm px-4 lg:px-6 dark:bg-slate-900/80 dark:border-slate-800 z-10">
                    <button className="md:hidden" onClick={() => setSidebarOpen(!isSidebarOpen)}>{isSidebarOpen ? <X/> : <Menu/>}</button>
                    <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Activity List</h1>
                </header>

                <main className={`flex-1 overflow-y-auto p-4 lg:p-6`}>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input type="text" placeholder="Search activities..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-transparent border border-slate-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:bg-slate-800 dark:border-slate-700 dark:text-white" suppressHydrationWarning />
                        </div>
                        <Button onClick={() => setAddModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2"><CalendarPlus size={18} /> Add Activity</Button>
                    </div>
                    
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => <ActivityCardSkeleton key={i} />)
                        ) : filteredActivities.length > 0 ? (
                            filteredActivities.map(activity => (
                                <div key={activity.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex flex-col transition-all hover:shadow-lg hover:border-green-400 dark:hover:border-green-600">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-lg"><Activity className="h-6 w-6 text-green-600" /></div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{activity.name}</h3>
                                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                                <CalendarDays size={16} />
                                                <span>{formatDate(activity.start_date)}</span>
                                                {activity.start_date !== activity.end_date && <><span>-</span><span>{formatDate(activity.end_date)}</span></>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-grow space-y-2 max-h-48 overflow-y-auto pr-2 my-4 border-t border-b py-4 dark:border-slate-700">
                                        {activity.activity_schedules.length > 0 ? (
                                            activity.activity_schedules.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 3).map(schedule => (
                                                <div key={schedule.id} className="text-xs p-2 bg-slate-50 dark:bg-slate-800 rounded-md">
                                                    <p className='font-semibold mb-1 text-center text-slate-600 dark:text-slate-300'>{formatDate(schedule.date)}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-slate-400 text-center py-4">No schedules defined.</p>
                                        )}
                                        {activity.activity_schedules.length > 3 && <p className="text-center text-xs text-slate-500 mt-2">...and {activity.activity_schedules.length - 3} more days</p>}
                                    </div>
                                    <div className="flex items-center justify-end gap-2 flex-shrink-0 mt-2">
                                        <button onClick={() => handleOpenReportModal(activity)} className="p-2 rounded-md text-slate-500 hover:text-green-600 hover:bg-green-100 dark:hover:bg-slate-800"><FileText size={18} /></button>
                                        <button onClick={() => openEditModal(activity)} className="p-2 rounded-md text-slate-500 hover:text-green-600 hover:bg-green-100 dark:hover:bg-slate-800"><Pencil size={18} /></button>
                                        <button onClick={() => openDeleteModal(activity)} className="p-2 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-slate-800"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            ))
                        ) : (<div className="col-span-full text-center py-10"><p className="text-slate-500">{searchQuery ? 'No activities match your search.' : 'No activities yet. Click "Add Activity" to create one.'}</p></div>)}
                    </div>
                </main>
            </div>

            <Modal isOpen={isAddModalOpen || isEditModalOpen} onClose={closeModal} title={isEditModalOpen ? 'Edit Activity' : 'Create New Activity'} size="lg">
               <form onSubmit={isEditModalOpen ? handleUpdateActivity : handleAddActivity} className="space-y-6">
                 <Input label="Activity Name" id="activity-name" type="text" required value={activityName} onChange={(e) => setActivityName(e.target.value)} />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <Input label="Start Date" id="start-date" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                   <Input label="End Date" id="end-date" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
                 </div>
                 {schedules.length > 0 && (
                   <div className="space-y-4 border-t pt-4 dark:border-slate-700">
                     <h4 className="font-semibold text-lg text-slate-800 dark:text-slate-100">Set Time Schedules</h4>
                     <div className="max-h-64 overflow-y-auto pr-2 space-y-4">
                       {schedules.map((schedule, index) => (
                         <div key={index} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-700/50 dark:border-slate-600">
                           <p className="font-bold mb-3 text-green-600 dark:text-green-400">{formatDate(schedule.date)}</p>
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <Input label="AM In" id={`am_in_${index}`} type="time" value={schedule.am_in} onChange={(e) => handleScheduleChange(index, 'am_in', e.target.value)} />
                             <Input label="AM Out" id={`am_out_${index}`} type="time" value={schedule.am_out} onChange={(e) => handleScheduleChange(index, 'am_out', e.target.value)} />
                             <Input label="PM In" id={`pm_in_${index}`} type="time" value={schedule.pm_in} onChange={(e) => handleScheduleChange(index, 'pm_in', e.target.value)} />
                             <Input label="PM Out" id={`pm_out_${index}`} type="time" value={schedule.pm_out} onChange={(e) => handleScheduleChange(index, 'pm_out', e.target.value)} />
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
                 {message && <p className={`text-center text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>}
                 <Button type="submit" className="w-full mt-4" disabled={loading}>
                   {loading ? 'Saving...' : (isEditModalOpen ? 'Save Changes' : 'Save Activity')}
                 </Button>
               </form>
            </Modal>

            <Modal isOpen={isDeleteModalOpen} onClose={closeModal} title="Confirm Deletion" size="sm">
                <div className="text-center">
                    <p className="mb-6 text-slate-600 dark:text-slate-300">Are you sure you want to delete <span className="font-bold text-slate-800 dark:text-white">{selectedActivity?.name}</span>?</p>
                    <div className="flex justify-center gap-4">
                        <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                        <Button variant="danger" onClick={handleDeleteActivity} disabled={loading}>{loading ? 'Deleting...' : 'Delete'}</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isReportModalOpen} onClose={closeModal} title={`Attendance for ${selectedActivity?.name}`} size="xl">
                {reportLoading ? (
                    <p className="text-center">Loading report...</p>
                ) : (
                    <>
                        {reportData.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                                        <tr>
                                            <th className="px-6 py-3">ID Number</th>
                                            <th className="px-6 py-3">Name</th>
                                            <th className="px-6 py-3">Course & Year</th>
                                            <th className="px-6 py-3">AM In</th>
                                            <th className="px-6 py-3">AM Out</th>
                                            <th className="px-6 py-3">PM In</th>
                                            <th className="px-6 py-3">PM Out</th>
                                            <th className="px-6 py-3 text-center">Scans</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.map(student => {
                                            const scans = student.scans_completed;
                                            const scanStatusColor = scans === 4 ? 'text-green-500' : scans > 0 ? 'text-yellow-500' : 'text-red-500';
                                            return (
                                                <tr key={student.student_id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
                                                    <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400">{student.student_id}</td>
                                                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{student.full_name}</td>
                                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{student.course} - {student.year_level}</td>
                                                    <td className="px-6 py-4">{student['Time In (AM)'] || '--'}</td>
                                                    <td className="px-6 py-4">{student['Time Out (AM)'] || '--'}</td>
                                                    <td className="px-6 py-4">{student['Time In (PM)'] || '--'}</td>
                                                    <td className="px-6 py-4">{student['Time Out (PM)'] || '--'}</td>
                                                    <td className={`px-6 py-4 font-bold text-center ${scanStatusColor}`}>{scans} / 4</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-center text-slate-500 py-8">No attendance records found for this activity.</p>
                        )}
                        <div className="mt-6 pt-6 border-t dark:border-slate-700 flex justify-end">
                            <Button onClick={handleExportPDF} disabled={reportData.length === 0}>
                                <Download size={18} className="inline mr-2" />
                                Export to PDF
                            </Button>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
}