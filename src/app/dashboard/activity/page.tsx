'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  LayoutDashboard, Users, ClipboardList, QrCode, LogOut, Menu, X, UserCheck, CalendarPlus, Clock, CalendarDays, Info
} from 'lucide-react';

// --- Type Definitions ---
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
  created_at: string;
  activity_schedules: ActivitySchedule[];
};

// --- Reusable UI Components (Copy from StudentListPage) ---
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

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({
  label,
  id,
  ...props
}) => {
  return (
    <div>
      <label
        htmlFor={id}
        className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
      <input
        id={id}
        className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        {...props}
      />
    </div>
  );
};

const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  size?: 'md' | 'lg';
}> = ({ isOpen, onClose, children, title, size = 'md' }) => {
  if (!isOpen) return null;
  const sizeClass = size === 'md' ? 'max-w-md' : 'max-w-3xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-40 backdrop-blur-sm p-4">
      {/* Main modal container is now a flex column */}
      <div
        className={`relative w-full ${sizeClass} bg-gray-100 rounded-xl shadow-2xl dark:bg-gray-800 max-h-full flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Static with its own padding */}
        <div className="flex justify-between items-center border-b p-6 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Wrapper: This is now the only scrollable part */}
        <div className="overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};


// --- Main Activity Page Component ---
export default function ActivityPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  
  // Form State
  const [activityName, setActivityName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [schedules, setSchedules] = useState<ActivitySchedule[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Fetch activities and their schedules
  const fetchActivities = async () => {
    setLoading(true);
    const { data, error } = await supabase
  .from('activities')
  .select(`
    *,
    activity_schedules (*) 
  `)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching activities:', error);
      setMessage(`Error: ${error.message}`);
    } else {
      setActivities(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  // Effect to generate schedule fields based on date range
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const newSchedules: ActivitySchedule[] = [];
      
      if (start > end) {
        setSchedules([]);
        return;
      }
      
      let currentDate = new Date(start);
      while (currentDate <= end) {
        newSchedules.push({
          date: currentDate.toISOString().split('T')[0], // Format to YYYY-MM-DD
          am_in: '08:00',
          am_out: '12:00',
          pm_in: '13:00',
          pm_out: '17:00',
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      setSchedules(newSchedules);
    } else {
      setSchedules([]);
    }
  }, [startDate, endDate]);

  const handleScheduleChange = (index: number, field: keyof ActivitySchedule, value: string) => {
    const updatedSchedules = [...schedules];
    updatedSchedules[index] = { ...updatedSchedules[index], [field]: value };
    setSchedules(updatedSchedules);
  };
  
  const clearForm = () => {
    setActivityName('');
    setStartDate('');
    setEndDate('');
    setSchedules([]);
    setMessage('');
  }

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (schedules.length === 0) {
        setMessage("Error: Please select a valid date range.");
        return;
    }
    
    setLoading(true);

    // 1. Insert into activities table
    const { data: activityData, error: activityError } = await supabase
  .from('activities')
  .insert({ name: activityName, start_date: startDate, end_date: endDate })

      .select()
      .single();

    if (activityError) {
      setMessage(`Error: ${activityError.message}`);
      setLoading(false);
      return;
    }

    // 2. Prepare and insert into activity_schedules table
    const schedulesToInsert = schedules.map(schedule => ({
      ...schedule,
      activity_id: activityData.id,
    }));

    const { error: scheduleError } = await supabase
  .from('activity_schedules')
  .insert(schedulesToInsert);

    if (scheduleError) {
      setMessage(`Error adding schedules: ${scheduleError.message}`);
      // Optional: Delete the activity if schedules fail to add
      await supabase.from('activities').delete().eq('id', activityData.id);
    } else {
      setMessage('Activity created successfully!');
      setAddModalOpen(false);
      fetchActivities();
      clearForm();
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  return (
    <div className={`grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]`}>
      {/* --- Sidebar --- */}
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

      {/* --- Main Content --- */}
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-white px-4 lg:h-[60px] lg:px-6 dark:bg-gray-900/40 dark:border-gray-800">
          <button className="md:hidden" onClick={() => setSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <div className="w-full flex-1">
            <h1 className="text-lg font-semibold">Activity List</h1>
          </div>
        </header>

        <main className={`flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-gray-100/40 dark:bg-gray-800/40 transition-filter duration-300 ${isAddModalOpen ? 'blur-sm' : ''}`}>
          <div className="flex justify-end items-center mb-2">
            <Button onClick={() => setAddModalOpen(true)} className="w-auto flex items-center gap-2">
              <CalendarPlus size={18} /> Add Activity
            </Button>
          </div>
          
          {/* Activity Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <p>Loading activities...</p>
            ) : activities.length > 0 ? (
              activities.map(activity => (
                <div key={activity.id} className="bg-white p-6 rounded-lg shadow-md dark:bg-gray-900 flex flex-col">
                  <h3 className="text-xl font-bold mb-2 text-green-600">{activity.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <CalendarDays size={16} />
                    <span>{formatDate(activity.start_date)}</span>
                    {activity.start_date !== activity.end_date && <><span>-</span><span>{formatDate(activity.end_date)}</span></>}
                  </div>
                  
                  <div className="flex-grow space-y-3">
                    {activity.activity_schedules.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(schedule => (
                        <div key={schedule.id} className="text-xs p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                           <p className='font-semibold mb-2 text-center'>{formatDate(schedule.date)}</p>
                           <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <div><span className="font-medium">AM In:</span> {schedule.am_in}</div>
                                <div><span className="font-medium">AM Out:</span> {schedule.am_out}</div>
                                <div><span className="font-medium">PM In:</span> {schedule.pm_in}</div>
                                <div><span className="font-medium">PM Out:</span> {schedule.pm_out}</div>
                           </div>
                        </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t dark:border-gray-700">
                    <p className="text-sm text-center text-gray-600 dark:text-gray-300">
                       <Info size={14} className='inline mr-1'/> Attendance data will be shown here.
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p>No activities found. Add a new one to get started.</p>
            )}
          </div>
        </main>
      </div>

      {/* --- Add Activity Modal --- */}
      <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="Create New Activity" size="lg">
        <form onSubmit={handleAddActivity} className="space-y-6">
          <Input label="Activity Name" id="activity-name" type="text" required value={activityName} onChange={(e) => setActivityName(e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Start Date" id="start-date" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input label="End Date" id="end-date" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
          </div>

          {schedules.length > 0 && (
            <div className="space-y-4 border-t pt-4 dark:border-gray-700">
              <h4 className="font-semibold text-lg">Set Time Schedules</h4>
              {schedules.map((schedule, index) => (
                <div key={index} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                  <p className="font-bold mb-3 text-green-600">{formatDate(schedule.date)}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Input label="Morning Time In" id={`am_in_${index}`} type="time" value={schedule.am_in} onChange={(e) => handleScheduleChange(index, 'am_in', e.target.value)} />
                    <Input label="Morning Time Out" id={`am_out_${index}`} type="time" value={schedule.am_out} onChange={(e) => handleScheduleChange(index, 'am_out', e.target.value)} />
                    <Input label="Afternoon Time In" id={`pm_in_${index}`} type="time" value={schedule.pm_in} onChange={(e) => handleScheduleChange(index, 'pm_in', e.target.value)} />
                    <Input label="Afternoon Time Out" id={`pm_out_${index}`} type="time" value={schedule.pm_out} onChange={(e) => handleScheduleChange(index, 'pm_out', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {message && <p className={`text-center text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>}
          <Button type="submit" className="w-full mt-4" disabled={loading}>
            {loading ? 'Saving...' : 'Save Activity'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}