'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    LayoutDashboard, Users, ClipboardList, QrCode, LogOut, X, UserCheck, Activity,
    CalendarPlus, Search, CalendarDays, Pencil, Trash2, FileText, Download, Loader2
} from 'lucide-react';
import { PasswordConfirmationModal } from '@/app/components/auth/PasswordConfirmationModal';

// --- TYPES ---
type ActivitySchedule = {
    id?: number;
    activity_id?: number;
    date: string;
    am_in: string | null;  // Allow null
    am_out: string | null; // Allow null
    pm_in: string | null;  // Allow null
    pm_out: string | null; // Allow null
};

type ActivityType = {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    created_at: string;
    user_id: string;
    activity_schedules: ActivitySchedule[];
    activity_type: 'whole_day' | 'half_day_am' | 'half_day_pm';
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

type UserProfile = {
    name: string;
    collegedep: string | null;
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

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }> = ({ children, className, variant = 'primary', ...props }) => {
    const base = 'inline-flex items-center justify-center text-center px-6 h-10 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-transform transform hover:scale-105 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed'; // Consistent height
    const styles = {
        primary: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };
    return (
        <button className={`${base} ${styles[variant]} ${className}`} {...props} suppressHydrationWarning>{children}</button>   );
};

// Input component now correctly handles potential null values for time inputs
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, value, ...props }) => (
    <div>
        <label htmlFor={id} className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <input
            id={id}
            className="uppercase w-full px-4 h-10 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={value ?? ''} // Display empty string if value is null
            {...props}
        /> {/* Consistent height */}
    </div>
);


const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; title: string; size?: 'sm' | 'md' | 'lg' | 'xl'; }> = ({ isOpen, onClose, children, title, size = 'md' }) => {
    if (!isOpen) return null;
    const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-3xl', xl: 'max-w-5xl' };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className={`relative w-full ${sizeClasses[size]} bg-gray-100 rounded-xl shadow-2xl dark:bg-gray-800 max-h-[90vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b p-6 dark:border-gray-700 flex-shrink-0">
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6">{children}</div>
                </div>
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
                    <span className="text-slate-800 dark:text-white">Student Activity Attendance</span>
                </Link>
            </div>
            <div className="flex-1 py-2">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                    <NavLink href="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
                    <NavLink href="/dashboard/student-list" icon={Users}>Student List</NavLink>
                    <NavLink href="/dashboard/activity" icon={ClipboardList}>Activity</NavLink>
                    <NavLink href="/dashboard/scan-attendance" icon={QrCode}>Scan Attendance</NavLink>
                    <NavLink href="/dashboard/collection" icon={Activity}>Collection</NavLink>
                </nav>
            </div>
            <div className="mt-auto p-4 border-t dark:border-slate-800">
                <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                    <LogOut className="h-5 w-5" />
                    Logout
                </button>
            </div>
            <div className="pb-4 text-center px-4"> <p className="text-xs text-slate-500 dark:text-slate-400"> Developed by: <strong>Christian B. Maglangit</strong> </p> </div>
        </div>
    );
};

const BottomNavLink = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode; }) => {
    const pathname = usePathname();
    const isActive = href === "/dashboard"
        ? pathname === href
        : href !== "/" && pathname.startsWith(href);

    return (
        <Link
            href={href}
            className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors ${
                isActive ? 'text-red-600' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
        >
            <Icon className="h-6 w-6" />
            <span className="text-xs font-medium">{children}</span>
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
                    <Link
                        href="/dashboard/scan-attendance"
                        className="flex flex-col h-16 w-16 -mt-6 items-center justify-center rounded-full bg-red-600 text-white shadow-lg"
                        aria-label="Scan QR Code"
                    >
                        <QrCode className="h-7 w-7" />
                        <span className="text-sm font-medium">Scan</span>
                    </Link>
                </div>

                <BottomNavLink href="/dashboard/activity" icon={ClipboardList}>Activity</BottomNavLink>
                <BottomNavLink href="/dashboard/collection" icon={Activity}>Collection</BottomNavLink>
            </div>

            <div className="text-center pb-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Developed by: <strong>Christian B. Maglangit</strong>
                </p>
            </div>
        </nav>
    );
};


// --- MAIN PAGE COMPONENT ---
export default function ActivityPage() {
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
    const [loading, setLoading] = useState(true); // Loading for main list/save
    const [reportLoading, setReportLoading] = useState(false); // Loading for report generation
    const [reportData, setReportData] = useState<ReportRow[]>([]);
    const [message, setMessage] = useState('');
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [reportSearchQuery, setReportSearchQuery] = useState('');
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [activityType, setActivityType] = useState<'whole_day' | 'half_day_am' | 'half_day_pm'>('whole_day');

    const router = useRouter();
    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserEmail(user.email || null);
        };
        fetchUser();
    }, []);

    const handleSecureAction = (action: () => void) => {
        setPendingAction(() => action);
        setIsPasswordModalOpen(true);
        setPasswordError(null);
    };

    const handleConfirmPassword = async (combinedPassword: string) => {
        if (!userEmail) {
            setPasswordError("Could not find user info. Please log in again.");
            return;
        }
        setIsVerifyingPassword(true);
        setPasswordError(null);
        const MASTER_PASSWORD = 'admin20'; // Keep your master password secure
        if (!combinedPassword.startsWith(MASTER_PASSWORD)) {
            setPasswordError("Incorrect security password format.");
            setIsVerifyingPassword(false);
            return;
        }
        const userPasswordPart = combinedPassword.slice(MASTER_PASSWORD.length);
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password: userPasswordPart,
        });
        if (signInError) {
            setPasswordError("Incorrect user password.");
            setIsVerifyingPassword(false);
        } else {
            setIsPasswordModalOpen(false);
            if (pendingAction) {
                pendingAction();
            }
            setPendingAction(null);
            setIsVerifyingPassword(false);
        }
    };

    const fetchActivities = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('activities')
            .select(`*, activity_schedules (*)`)
            .order('start_date', { ascending: false });
        if (error) {
            console.error('Error fetching activities:', error);
            setMessage(`Error fetching activities: ${error.message}`);
        } else {
            // Ensure schedule times are strings or null, default to null if undefined
            const processedData = (data || []).map(activity => ({
                ...activity,
                // Add the type annotation here: (schedule: ActivitySchedule)
                activity_schedules: (activity.activity_schedules || []).map((schedule: ActivitySchedule) => ({
                    ...schedule,
                    am_in: schedule.am_in ?? null,
                    am_out: schedule.am_out ?? null,
                    pm_in: schedule.pm_in ?? null,
                    pm_out: schedule.pm_out ?? null,
                }))
            }));
            setActivities(processedData);
        }
        setLoading(false);
    }, []);


    useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);

    // Effect to generate schedules based on dates and activity type
    useEffect(() => {
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            // Adjust start/end date timezone if necessary, e.g., use UTC
            // const start = new Date(Date.UTC(parseInt(startDate.substring(0,4)), parseInt(startDate.substring(5,7))-1, parseInt(startDate.substring(8,10))));
            // const end = new Date(Date.UTC(parseInt(endDate.substring(0,4)), parseInt(endDate.substring(5,7))-1, parseInt(endDate.substring(8,10))));

            if (start > end) {
                setSchedules([]);
                return;
            }
            const newSchedules: ActivitySchedule[] = [];
            let currentDate = new Date(start);

            while (currentDate <= end) {
                 // Ensure we are using the date part only, consistent with how dates are stored/compared
                const dateStr = currentDate.toISOString().split('T')[0];
                const existingSchedule = selectedActivity?.activity_schedules?.find(s => s.date === dateStr);

                newSchedules.push({
                    date: dateStr,
                    // Use existing time if available, otherwise default or null based on type
                    am_in: (activityType === 'whole_day' || activityType === 'half_day_am') ? (existingSchedule?.am_in ?? '08:00') : null,
                    am_out: (activityType === 'whole_day' || activityType === 'half_day_am') ? (existingSchedule?.am_out ?? '12:00') : null,
                    pm_in: (activityType === 'whole_day' || activityType === 'half_day_pm') ? (existingSchedule?.pm_in ?? '13:00') : null,
                    pm_out: (activityType === 'whole_day' || activityType === 'half_day_pm') ? (existingSchedule?.pm_out ?? '17:00') : null
                });

                // Move to the next day
                currentDate.setDate(currentDate.getDate() + 1);
            }
            setSchedules(newSchedules);
        } else {
            setSchedules([]);
        }
    }, [startDate, endDate, selectedActivity, activityType]);


    const handleScheduleChange = (index: number, field: keyof Omit<ActivitySchedule, 'id' | 'activity_id' | 'date'>, value: string) => {
        const updatedSchedules = [...schedules];
        updatedSchedules[index] = { ...updatedSchedules[index], [field]: value === "" ? null : value }; // Store null if empty
        setSchedules(updatedSchedules);
    };

    const clearForm = () => {
        setActivityName('');
        setStartDate('');
        setEndDate('');
        setSchedules([]);
        setMessage('');
        setSelectedActivity(null);
        setActivityType('whole_day'); // Reset to default
    };

    const handleAddActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setMessage("Error: You must be logged in to create an activity.");
            setLoading(false);
            return;
        }
        const { data: newActivity, error: activityError } = await supabase
            .from('activities')
            .insert({
                name: activityName,
                start_date: startDate,
                end_date: endDate,
                user_id: user.id,
                activity_type: activityType
            })
            .select()
            .single();

        if (activityError) {
            setMessage(`Error creating activity: ${activityError.message}`);
            setLoading(false);
            return;
        }

        if (!newActivity || !newActivity.id) {
             setMessage(`Error: Failed to retrieve the new activity ID after creation. Please check database permissions or try again.`);
             setLoading(false);
             return;
        }

        // Prepare schedules ensuring unused slots are null and used empty slots are null
        const schedulesWithActivityId = schedules.map(sc => ({
            activity_id: newActivity.id,
            date: sc.date,
            am_in: (activityType === 'whole_day' || activityType === 'half_day_am') ? (sc.am_in === "" ? null : sc.am_in) : null,
            am_out: (activityType === 'whole_day' || activityType === 'half_day_am') ? (sc.am_out === "" ? null : sc.am_out) : null,
            pm_in: (activityType === 'whole_day' || activityType === 'half_day_pm') ? (sc.pm_in === "" ? null : sc.pm_in) : null,
            pm_out: (activityType === 'whole_day' || activityType === 'half_day_pm') ? (sc.pm_out === "" ? null : sc.pm_out) : null,
        }));

        if (schedulesWithActivityId.length > 0) {
            const { error: scheduleError } = await supabase
                .from('activity_schedules')
                .insert(schedulesWithActivityId);
            if (scheduleError) {
                await supabase.from('activities').delete().eq('id', newActivity.id); // Rollback activity
                setMessage(`Error saving schedules: ${scheduleError.message}. Activity creation rolled back.`);
            } else {
                setMessage('Activity and schedules saved successfully!');
                setAddModalOpen(false);
                fetchActivities();
                clearForm();
            }
        } else {
             setMessage('Activity saved successfully! (No schedules)');
             setAddModalOpen(false);
             fetchActivities();
             clearForm();
        }

        setLoading(false);
    };


    const fetchUserProfile = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data, error } = await supabase
                .from('users')
                .select('name, collegedep')
                .eq('id', user.id)
                .single();
            if (error) {
                console.error('Error fetching user profile:', error);
            } else if (data) {
                setUserProfile(data);
            }
        }
    }, []);

    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);

    // *** UPDATED handleUpdateActivity ***
    const handleUpdateActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedActivity) return;
        setLoading(true);
        setMessage('');

        // 1. Update Activity Details
        const { error: uErr } = await supabase
            .from('activities')
            .update({
                name: activityName,
                start_date: startDate,
                end_date: endDate,
                activity_type: activityType
            })
            .eq('id', selectedActivity.id);

        if (uErr) {
            setMessage(`Error updating activity details: ${uErr.message}`);
            setLoading(false);
            return;
        }

        // 2. Delete existing schedules
        const { error: delErr } = await supabase
            .from('activity_schedules')
            .delete()
            .eq('activity_id', selectedActivity.id);

        if (delErr) {
            setMessage(`Warning: Error clearing old schedules: ${delErr.message}. Attempting to insert new ones.`);
            // Continue execution to insert new schedules
        }

        // 3. Prepare and Insert new schedules (if any)
        if (schedules.length > 0) {
            // *** THIS IS THE CORRECTED PART ***
            const updatedSchedules = schedules.map(sc => {
                // Determine final values, converting "" to null only if the slot is relevant
                const finalAmIn = (activityType === 'whole_day' || activityType === 'half_day_am')
                                  ? (sc.am_in === "" ? null : sc.am_in) // Convert "" to null if relevant
                                  : null; // Nullify if not relevant
                const finalAmOut = (activityType === 'whole_day' || activityType === 'half_day_am')
                                   ? (sc.am_out === "" ? null : sc.am_out) // Convert "" to null if relevant
                                   : null; // Nullify if not relevant
                const finalPmIn = (activityType === 'whole_day' || activityType === 'half_day_pm')
                                  ? (sc.pm_in === "" ? null : sc.pm_in) // Convert "" to null if relevant
                                  : null; // Nullify if not relevant
                const finalPmOut = (activityType === 'whole_day' || activityType === 'half_day_pm')
                                   ? (sc.pm_out === "" ? null : sc.pm_out) // Convert "" to null if relevant
                                   : null; // Nullify if not relevant

                return {
                    activity_id: selectedActivity.id,
                    date: sc.date,
                    am_in: finalAmIn,
                    am_out: finalAmOut,
                    pm_in: finalPmIn,
                    pm_out: finalPmOut,
                };
            });
            // *** END OF CORRECTION ***

            const { error: iErr } = await supabase
                .from('activity_schedules')
                .insert(updatedSchedules);

            if (iErr) {
                setMessage(`Error inserting new schedules: ${iErr.message}. Activity details updated, but schedules failed to save.`);
            } else {
                 setMessage('Activity updated successfully!');
                 setEditModalOpen(false);
                 fetchActivities();
                 clearForm();
            }
        } else {
             setMessage('Activity details updated successfully! (No schedules)');
             setEditModalOpen(false);
             fetchActivities();
             clearForm();
        }

        setLoading(false);
    };


    const handleDeleteActivity = async () => {
        if (!selectedActivity) return;
        setLoading(true);
        setMessage('');
        const { error } = await supabase.from('activities').delete().eq('id', selectedActivity.id);
        if (error) {
            setMessage(`Error deleting activity: ${error.message}`);
        } else {
            setMessage('Activity deleted successfully!');
            setDeleteModalOpen(false);
            fetchActivities();
            clearForm();
        }
        setLoading(false);
    };

    const openEditModal = (activity: ActivityType) => {
        setSelectedActivity(activity);
        setActivityName(activity.name);
        setStartDate(activity.start_date);
        setEndDate(activity.end_date);
        // Ensure schedules have null for potentially missing time values from DB
        const processedSchedules = (activity.activity_schedules || []).map(s => ({
            ...s,
            am_in: s.am_in ?? null,
            am_out: s.am_out ?? null,
            pm_in: s.pm_in ?? null,
            pm_out: s.pm_out ?? null,
        }));
        setSchedules(processedSchedules);
        setActivityType(activity.activity_type || 'whole_day');
        setEditModalOpen(true);
        setMessage('');
    };


    const openDeleteModal = (activity: ActivityType) => {
        setSelectedActivity(activity);
        setDeleteModalOpen(true);
        setMessage('');
    };

    const handleOpenReportModal = async (activity: ActivityType) => {
        setSelectedActivity(activity);
        setReportModalOpen(true);
        setReportLoading(true);
        setReportData([]);
        setMessage('');

        const { data: attendanceData, error: attendanceError } = await supabase
            .from('attendance_report')
            .select('student_id, scanned_at, status')
            .eq('activity_id', activity.id);

        if (attendanceError) {
            console.error("Error fetching attendance:", attendanceError);
            setMessage(`Error fetching report data: ${attendanceError.message}`);
            setReportLoading(false);
            return;
        }
        if (!attendanceData || attendanceData.length === 0) {
            setMessage("No attendance records found for this activity.");
            setReportLoading(false);
            return;
        }

        const studentIds = [...new Set(attendanceData.map((att) => att.student_id))];

        const { data: studentsData, error: studentsError } = await supabase
            .from('students')
            .select('student_id, full_name, course, year_level')
            .in('student_id', studentIds);

        if (studentsError) {
            console.error("Error fetching student details:", studentsError);
            setMessage(`Error fetching student details: ${studentsError.message}`);
            setReportLoading(false);
            return;
        }

        const reportMap = new Map<string, ReportRow>();
        (studentsData || []).forEach(student => {
            reportMap.set(student.student_id, {
                student_id: student.student_id,
                full_name: student.full_name,
                course: student.course,
                year_level: student.year_level,
                'Time In (AM)': null, 'Time Out (AM)': null, 'Time In (PM)': null, 'Time Out (PM)': null,
                scans_completed: 0,
            });
        });

        attendanceData.forEach(record => {
            const studentEntry = reportMap.get(record.student_id);
            if (studentEntry) {
                const time = new Date(record.scanned_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                if ((activity.activity_type === 'whole_day' || activity.activity_type === 'half_day_am')) {
                    if (record.status === 'Time In (AM)') studentEntry['Time In (AM)'] = time;
                    if (record.status === 'Time Out (AM)') studentEntry['Time Out (AM)'] = time;
                }
                 if ((activity.activity_type === 'whole_day' || activity.activity_type === 'half_day_pm')) {
                    if (record.status === 'Time In (PM)') studentEntry['Time In (PM)'] = time;
                    if (record.status === 'Time Out (PM)') studentEntry['Time Out (PM)'] = time;
                }
            }
        });

        const finalData = Array.from(reportMap.values());
        finalData.forEach(entry => {
            let count = 0;
            if ((activity.activity_type === 'whole_day' || activity.activity_type === 'half_day_am')) {
                if (entry['Time In (AM)']) count++;
                if (entry['Time Out (AM)']) count++;
            }
            if ((activity.activity_type === 'whole_day' || activity.activity_type === 'half_day_pm')) {
                 if (entry['Time In (PM)']) count++;
                 if (entry['Time Out (PM)']) count++;
            }
            entry.scans_completed = count;
        });
        finalData.sort((a, b) => a.full_name.localeCompare(b.full_name));

        setReportData(finalData);
        setReportLoading(false);
    };

    const handleExportPDF = () => {
        if (!selectedActivity || reportData.length === 0 || !userProfile) return;
        const doc = new jsPDF({ orientation: 'landscape' });
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setFontSize(16); doc.setTextColor(0); doc.text(userProfile.name, pageWidth / 2, 20, { align: "center" });
        doc.setFontSize(14); doc.setTextColor(0); doc.text(userProfile.collegedep || '', pageWidth / 2, 28, { align: "center" });
        doc.setFontSize(12); doc.setTextColor(0); doc.text(`${selectedActivity.name} ATTENDANCE `, pageWidth / 2, 36, { align: "center" });
        doc.setFontSize(11); doc.setTextColor(100);
        const formattedStartDate = formatDate(selectedActivity.start_date); const formattedEndDate = formatDate(selectedActivity.end_date);
        const dateString = formattedStartDate === formattedEndDate ? formattedStartDate : `${formattedStartDate} to ${formattedEndDate}`;
        doc.text(dateString, pageWidth / 2, 44, { align: "center" });
        doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 50, { align: "center" });

        const headers = ["#", "ID Number", "Name", "Course & Year"];
        const showAm = selectedActivity.activity_type === 'whole_day' || selectedActivity.activity_type === 'half_day_am';
        const showPm = selectedActivity.activity_type === 'whole_day' || selectedActivity.activity_type === 'half_day_pm';
        if (showAm) headers.push("AM In", "AM Out");
        if (showPm) headers.push("PM In", "PM Out");
        headers.push("Scans");
        const tableHeaders = [headers];

        const tableBody = reportData.map((student, index) => {
            const row = [ index + 1, student.student_id, student.full_name, `${student.course} - ${student.year_level}` ];
            if (showAm) row.push(student['Time In (AM)'] || '--', student['Time Out (AM)'] || '--');
            if (showPm) row.push(student['Time In (PM)'] || '--', student['Time Out (PM)'] || '--');
            row.push(`${student.scans_completed} / ${selectedActivity.activity_type === 'whole_day' ? 4 : 2}`);
            return row;
        });

        autoTable(doc, { head: tableHeaders, body: tableBody, startY: 58, theme: 'striped', headStyles: { fillColor: [22, 160, 133] } });
        const safeFileName = selectedActivity.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        doc.save(`attendance_report_${safeFileName}.pdf`);
    };

    const closeModal = () => { setAddModalOpen(false); setEditModalOpen(false); setDeleteModalOpen(false); setReportModalOpen(false); clearForm(); setReportSearchQuery(''); };

    const filteredActivities = useMemo(() => { if (!searchQuery.trim()) return activities; return activities.filter(act => act.name.toLowerCase().includes(searchQuery.toLowerCase())); }, [activities, searchQuery]);

    const filteredReportData = useMemo(() => {
        const query = reportSearchQuery.trim().toLowerCase();
        if (!query) return reportData;
        return reportData.filter(student => student.student_id.toLowerCase().includes(query) || student.year_level.toString().toLowerCase().includes(query));
    }, [reportData, reportSearchQuery]);

     const formatDate = (dateString: string | null): string => { // Allow null input
        try {
            if (!dateString) return 'N/A'; // Handle null date
            // Check if dateString is valid before formatting
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
             // Adjust for potential timezone offset if dates appear off by one day
             const utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
            return utcDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return 'Invalid Date';
        }
     };


    return (
        <div className={`grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]`}>
            {/* Sidebar */}
            <div className="hidden border-r bg-white md:block dark:bg-gray-900 dark:border-gray-800">
                <SidebarContent onLogout={handleLogout} />
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col h-screen overflow-hidden bg-gray-100/40 dark:bg-gray-800/40">
                {/* Header */}
                <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-white/80 backdrop-blur-sm px-4 lg:px-6 dark:bg-slate-900/80 dark:border-slate-800 z-10">
                    <div className="w-full flex-1 flex items-center justify-between">
                        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
                            Student Activity Attendance
                        </h1>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-full md:hidden text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                            aria-label="Logout"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className={`flex-1 overflow-y-auto p-4 lg:p-6 pb-20`}> {/* Added pb-20 for bottom nav */}
                    {/* Search and Add Button */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                        <div className="relative w-full sm:flex-grow sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search activities..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="uppercase w-full pl-10 pr-4 h-10 border-2 bg-white border-gray-200 rounded-lg focus:outline-none focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" // Consistent height
                                suppressHydrationWarning
                             />
                        </div>
                        <Button
                            onClick={() => { setActivityType('whole_day'); clearForm(); setAddModalOpen(true); }} // Reset type on add
                            className="w-full sm:w-auto flex items-center justify-center gap-2" // Ensure button text is centered on mobile
                        >
                           <CalendarPlus size={18} /> Add Activity
                        </Button>
                    </div>

                    {/* Activity Cards Grid */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                        {loading ? (
                            <div className="col-span-full text-center py-10"><Loader2 className="animate-spin inline mr-2" /> Loading Activities...</div>
                         ) : filteredActivities.length > 0 ? (
                            [...filteredActivities] // Create a copy before sorting
                                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // Sort by creation date descending
                                .map(activity => (
                                    <div key={activity.id} className="bg-white p-6 rounded-lg shadow-md dark:bg-gray-900 flex flex-col">
                                        {/* Card Header */}
                                        <div className="flex flex-col sm:flex-row justify-center items-center text-center sm:text-left gap-2 mb-2">
                                            <h3 className="text-xl font-bold text-green-600">{activity.name}</h3>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                activity.activity_type === 'half_day_am' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                                : activity.activity_type === 'half_day_pm' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                            }`}>
                                                {activity.activity_type === 'half_day_am' ? 'HD (AM)'
                                                : activity.activity_type === 'half_day_pm' ? 'HD (PM)'
                                                : 'WD'}
                                            </span>
                                        </div>
                                        {/* Date Range */}
                                        <div className="flex items-center gap-2 justify-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                                            <CalendarDays size={16} />
                                            <span>{formatDate(activity.start_date)}</span>
                                            {activity.start_date !== activity.end_date && <><span>-</span><span>{formatDate(activity.end_date)}</span></>}
                                        </div>
                                        {/* Schedules Preview */}
                                        <div className="flex-grow space-y-3 max-h-60 overflow-y-auto pr-2 mb-4"> {/* Added mb-4 */}
                                            {(activity.activity_schedules || []).length > 0 ? (
                                                (activity.activity_schedules || []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 3).map(schedule => (
                                                    <div key={schedule.id || schedule.date} className="text-xs p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                                                        <p className='font-semibold mb-2 text-center'>{formatDate(schedule.date)}</p>
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-center">
                                                            {(activity.activity_type === 'whole_day' || activity.activity_type === 'half_day_am') ? (
                                                                <>
                                                                    <div><span className="font-medium">AM In:</span> {schedule.am_in || '--'}</div>
                                                                    <div><span className="font-medium">AM Out:</span> {schedule.am_out || '--'}</div>
                                                                </>
                                                             ) : (
                                                                 <>
                                                                     <div><span className="font-medium">AM:</span> N/A</div>
                                                                     <div><span className="font-medium">AM:</span> N/A</div>
                                                                 </>
                                                             )}
                                                             {(activity.activity_type === 'whole_day' || activity.activity_type === 'half_day_pm') ? (
                                                                 <>
                                                                    <div><span className="font-medium">PM In:</span> {schedule.pm_in || '--'}</div>
                                                                    <div><span className="font-medium">PM Out:</span> {schedule.pm_out || '--'}</div>
                                                                 </>
                                                             ) : (
                                                                 <>
                                                                     <div><span className="font-medium">PM:</span> N/A</div>
                                                                     <div><span className="font-medium">PM:</span> N/A</div>
                                                                 </>
                                                             )}
                                                        </div>
                                                    </div>
                                                ))
                                             ) : (
                                                <p className="text-center text-xs text-gray-400 italic">No specific schedules set.</p>
                                             )}
                                            {(activity.activity_schedules || []).length > 3 && <p className="text-center text-xs text-gray-500 mt-2">...and {(activity.activity_schedules || []).length - 3} more days</p>}
                                        </div>
                                        {/* Action Buttons */}
                                        <div className="flex items-center justify-center gap-3 flex-shrink-0 mt-auto"> {/* Use mt-auto to push buttons down */}
                                            <button onClick={() => handleOpenReportModal(activity)} className="p-1 rounded-full text-green-500 hover:bg-green-100 dark:hover:bg-gray-700" aria-label="View Report"><FileText size={18} /></button>
                                            <button onClick={() => handleSecureAction(() => openEditModal(activity))} className="p-1 rounded-full text-gray-500 hover:bg-blue-100 dark:hover:bg-gray-700 dark:hover:text-blue-400 hover:text-blue-600" aria-label="Edit Activity"><Pencil size={18} /></button>
                                            <button onClick={() => handleSecureAction(() => openDeleteModal(activity))} className="p-1 rounded-full text-gray-500 hover:bg-red-100 dark:hover:bg-gray-700 dark:hover:text-red-400 hover:text-red-600" aria-label="Delete Activity"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                ))
                        ) : (
                            <div className="col-span-full text-center py-10">
                                <p className="text-gray-500 dark:text-gray-400">{searchQuery ? 'No activities match your search.' : 'No activities created yet.'}</p>
                            </div>
                        )}
                    </div>
                </main>

                {/* Bottom Navigation Bar for Mobile */}
                <BottomNavBar />
            </div>

            {/* --- Modals --- */}

             {/* Add/Edit Modal */}
            <Modal isOpen={isAddModalOpen || isEditModalOpen} onClose={closeModal} title={isEditModalOpen ? 'Edit Activity' : 'Create New Activity'} size="lg">
                 <form onSubmit={isEditModalOpen ? handleUpdateActivity : handleAddActivity} className="space-y-6">
                     <Input label="Activity Name" id="activity-name" type="text" required value={activityName} onChange={(e) => setActivityName(e.target.value)} />

                     {/* Activity Type Radio Buttons */}
                     <div>
                         <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Activity Type</label>
                         <div className="flex flex-col sm:flex-row gap-4">
                             <label className="flex items-center gap-2 p-3 border-2 rounded-lg has-[:checked]:border-green-500 has-[:checked]:bg-green-50 dark:has-[:checked]:bg-gray-700 dark:border-gray-600 flex-1 cursor-pointer">
                                 <input type="radio" name="activityType" value="whole_day" checked={activityType === 'whole_day'} onChange={() => setActivityType('whole_day')} className="form-radio text-green-600 focus:ring-green-500" />
                                 <span>Whole Day (AM & PM)</span>
                             </label>
                             <label className="flex items-center gap-2 p-3 border-2 rounded-lg has-[:checked]:border-green-500 has-[:checked]:bg-green-50 dark:has-[:checked]:bg-gray-700 dark:border-gray-600 flex-1 cursor-pointer">
                                 <input type="radio" name="activityType" value="half_day_am" checked={activityType === 'half_day_am'} onChange={() => setActivityType('half_day_am')} className="form-radio text-green-600 focus:ring-green-500" />
                                 <span>Half Day (AM Only)</span>
                             </label>
                             <label className="flex items-center gap-2 p-3 border-2 rounded-lg has-[:checked]:border-green-500 has-[:checked]:bg-green-50 dark:has-[:checked]:bg-gray-700 dark:border-gray-600 flex-1 cursor-pointer">
                                 <input type="radio" name="activityType" value="half_day_pm" checked={activityType === 'half_day_pm'} onChange={() => setActivityType('half_day_pm')} className="form-radio text-green-600 focus:ring-green-500" />
                                 <span>Half Day (PM Only)</span>
                             </label>
                         </div>
                     </div>

                     {/* Date Inputs */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <Input label="Start Date" id="start-date" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                         <Input label="End Date" id="end-date" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
                     </div>

                     {/* Schedule Inputs */}
                     {schedules.length > 0 && (
                         <div className="space-y-4 border-t pt-4 dark:border-gray-700">
                             <h4 className="font-semibold text-lg">Set Time Schedules (Optional - uses defaults if left blank)</h4>
                             <div className="max-h-64 overflow-y-auto pr-2 space-y-4">
                                 {schedules.map((schedule, index) => {
                                     const showAmInputs = activityType === 'whole_day' || activityType === 'half_day_am';
                                     const showPmInputs = activityType === 'whole_day' || activityType === 'half_day_pm';
                                     return (
                                         <div key={index} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                                             <p className="font-bold mb-3 text-green-600">{formatDate(schedule.date)}</p>
                                             <div className={`grid grid-cols-2 ${activityType === 'whole_day' ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-4`}>
                                                 {showAmInputs && (
                                                    <>
                                                        <Input label="AM In" id={`am_in_${index}`} type="time" required={showAmInputs} value={schedule.am_in ?? ''} onChange={(e) => handleScheduleChange(index, 'am_in', e.target.value)} />
                                                        <Input label="AM Out" id={`am_out_${index}`} type="time" required={showAmInputs} value={schedule.am_out ?? ''} onChange={(e) => handleScheduleChange(index, 'am_out', e.target.value)} />
                                                    </>
                                                )}
                                                {showPmInputs && (
                                                    <>
                                                        <Input label="PM In" id={`pm_in_${index}`} type="time" required={showPmInputs} value={schedule.pm_in ?? ''} onChange={(e) => handleScheduleChange(index, 'pm_in', e.target.value)} />
                                                        <Input label="PM Out" id={`pm_out_${index}`} type="time" required={showPmInputs} value={schedule.pm_out ?? ''} onChange={(e) => handleScheduleChange(index, 'pm_out', e.target.value)} />
                                                    </>
                                                )}
                                             </div>
                                         </div>
                                     )
                                 })}
                             </div>
                         </div>
                     )}

                     {/* Message Area */}
                     {message && <p className={`text-center text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>}

                     {/* Submit Button */}
                     <Button type="submit" className="w-full mt-4" disabled={loading || !startDate || !endDate}>
                         {loading ? <><Loader2 className="animate-spin inline mr-2" /> Saving...</> : (isEditModalOpen ? 'Save Changes' : 'Save Activity')}
                     </Button>
                 </form>
             </Modal>


            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={closeModal} title="Confirm Deletion" size="sm">
                <div className="text-center">
                    <p className="mb-6">Are you sure you want to delete <span className="font-bold">{selectedActivity?.name}</span>? This action cannot be undone.</p>
                    {message && <p className="text-red-500 text-sm mb-4">{message}</p>}
                    <div className="flex justify-center gap-4">
                        <Button variant="secondary" onClick={closeModal} disabled={loading}>Cancel</Button>
                        <Button variant="danger" onClick={handleDeleteActivity} disabled={loading}>
                            {loading ? <><Loader2 className="animate-spin inline mr-2" /> Deleting...</> : 'Delete'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Report Modal */}
            <Modal isOpen={isReportModalOpen} onClose={closeModal} title={`Attendance Report: ${selectedActivity?.name}`} size="xl">
                {reportLoading ? (
                     <div className="text-center py-10"><Loader2 className="animate-spin inline mr-2" /> Loading Report...</div>
                ) : (
                    <>
                        {/* Report Controls: Search and Export */}
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                            <div className="relative flex-grow w-full sm:max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by ID or Year Level..."
                                    value={reportSearchQuery}
                                    onChange={(e) => setReportSearchQuery(e.target.value)}
                                    className="uppercase w-full pl-10 pr-4 h-10 border-2 bg-white border-gray-200 rounded-lg focus:outline-none focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    suppressHydrationWarning
                                />
                            </div>
                            <Button onClick={handleExportPDF} disabled={reportData.length === 0} className="w-full sm:w-auto flex items-center justify-center gap-2"> {/* Ensure centered text on mobile */}
                                <Download size={18} className="inline" /> Export PDF
                            </Button>
                        </div>
                        {message && <p className="text-center text-sm text-yellow-600 dark:text-yellow-400 mb-4">{message}</p>}

                        {/* Report Table */}
                        {filteredReportData.length > 0 ? (
                            <div className="overflow-x-auto relative shadow-md sm:rounded-lg max-h-[60vh]"> {/* Added max-h for scroll */}
                                <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10"> {/* Sticky header */}
                                        <tr>
                                            <th scope="col" className="px-6 py-3">#</th>
                                            <th scope="col" className="px-6 py-3">Student ID</th>
                                            <th scope="col" className="px-6 py-3">Full Name</th>
                                            <th scope="col" className="px-6 py-3">Course & Year</th>
                                            {(selectedActivity?.activity_type === 'whole_day' || selectedActivity?.activity_type === 'half_day_am') && (
                                                <>
                                                    <th scope="col" className="px-6 py-3">Time In (AM)</th>
                                                    <th scope="col" className="px-6 py-3">Time Out (AM)</th>
                                                </>
                                            )}
                                            {(selectedActivity?.activity_type === 'whole_day' || selectedActivity?.activity_type === 'half_day_pm') && (
                                                <>
                                                    <th scope="col" className="px-6 py-3">Time In (PM)</th>
                                                    <th scope="col" className="px-6 py-3">Time Out (PM)</th>
                                                </>
                                            )}
                                            <th scope="col" className="px-6 py-3 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {filteredReportData.map((student, index) => {
                                            const totalScans = selectedActivity?.activity_type === 'whole_day' ? 4 : 2;
                                            const scans = student.scans_completed;
                                            const scanStatusColor = scans === totalScans ? 'text-green-500' : scans > 0 ? 'text-yellow-500' : 'text-red-500';
                                            return (
                                                <tr key={student.student_id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-600">
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{index + 1}</td>
                                                    <td className="px-6 py-4 font-mono text-gray-900 dark:text-white">{student.student_id}</td>
                                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{student.full_name}</td>
                                                    <td className="px-6 py-4">{student.course} - {student.year_level}</td>
                                                    {(selectedActivity?.activity_type === 'whole_day' || selectedActivity?.activity_type === 'half_day_am') && (
                                                        <>
                                                            <td className="px-6 py-4">{student['Time In (AM)'] || '--'}</td>
                                                            <td className="px-6 py-4">{student['Time Out (AM)'] || '--'}</td>
                                                        </>
                                                    )}
                                                    {(selectedActivity?.activity_type === 'whole_day' || selectedActivity?.activity_type === 'half_day_pm') && (
                                                        <>
                                                            <td className="px-6 py-4">{student['Time In (PM)'] || '--'}</td>
                                                            <td className="px-6 py-4">{student['Time Out (PM)'] || '--'}</td>
                                                        </>
                                                    )}
                                                    <td className={`px-6 py-4 font-bold text-center ${scanStatusColor}`}>
                                                        {scans} / {totalScans}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-gray-500 dark:text-gray-400">{reportSearchQuery ? 'No students match the search.' : 'No attendance data available for this activity yet.'}</p>
                            </div>
                        )}

                    </>
                )}
            </Modal>

            {/* Password Confirmation Modal */}
            {isPasswordModalOpen && (
                <PasswordConfirmationModal
                    onConfirm={handleConfirmPassword}
                    onClose={() => setIsPasswordModalOpen(false)}
                    loading={isVerifyingPassword}
                    error={passwordError}
                />
            )}

        </div>
    );
}