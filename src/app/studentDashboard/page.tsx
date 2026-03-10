'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { LogOut, User, GraduationCap, Hash, ShieldCheck, KeyRound, UserCheck, X, Coins, CalendarCheck, AlertCircle, Loader2, QrCode, Download, AlertTriangle, Clock, MessageSquare, Send } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react'; 
import { toPng } from 'html-to-image';
import CryptoJS from 'crypto-js'; 

// --- SECRET KEY ---
const QR_SECRET_KEY = process.env.NEXT_PUBLIC_QR_SECRET || 'attendance-system-secure-key-2024';

// --- SHARED COMPONENTS ---
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }> = ({ children, className, variant = 'primary', ...props }) => {
    const base = 'inline-flex items-center justify-center text-center px-4 py-2 text-sm font-semibold rounded-lg shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-150 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed';
    const styles = {
        primary: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500',
        secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300 focus-visible:ring-slate-400 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
    };
    return (
        <button className={`${base} ${styles[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};

const Modal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
}> = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="relative w-full max-w-sm p-6 m-4 bg-white rounded-xl shadow-2xl dark:bg-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center border-b pb-3 mb-4 dark:border-slate-700">
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                        <X size={24} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

// --- TYPES ---
type FineBreakdown = {
    activityName: string;
    type: string;
    statusString: string; 
    fineAmount: number;
    attended: number;
    totalSlots: number;
    activityStatus: 'Upcoming' | 'Ongoing' | 'Completed';
    isFinished: boolean;
    date?: string;
};

type ChatMessage = {
    id: number;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
};

// --- MAIN PAGE ---
export default function StudentDashboard() {
    const router = useRouter();
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // Fines Data
    const [totalFines, setTotalFines] = useState(0);
    const [eventsJoined, setEventsJoined] = useState(0);
    const [fineBreakdown, setFineBreakdown] = useState<FineBreakdown[]>([]);

    // Password Modal
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Logout Confirmation Modal State
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // QR Code Modal & Logic
    const [showQrModal, setShowQrModal] = useState(false);
    const qrCodeRef = useRef<HTMLDivElement>(null);

    // --- CHAT STATE ---
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isChatOpen) {
            scrollToBottom();
            setUnreadCount(0); // Reset unread when opened
        }
    }, [messages, isChatOpen]);

    const getEncryptedQrData = (studentId: string) => {
        if (!studentId) return "";
        const dataToEncrypt = JSON.stringify({ student_id: studentId });
        const encrypted = CryptoJS.AES.encrypt(dataToEncrypt, QR_SECRET_KEY).toString();
        return encrypted;
    };

    // --- CHAT: FETCH MESSAGES & SUBSCRIBE TO REAL-TIME ---
    useEffect(() => {
        if (!student || !student.user_id) return;

        // 1. Fetch initial messages
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', student.user_id)
                .order('created_at', { ascending: true });

            if (!error && data) {
                setMessages(data);
            }
        };

        fetchMessages();

        // 2. Subscribe to new incoming messages
        const messageSubscription = supabase
            .channel('custom-all-channel')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${student.user_id}` },
                (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    setMessages((prev) => [...prev, newMsg]);
                    
                    // Add unread badge if chat is closed and it's NOT from the student themselves
                    if (!isChatOpen && newMsg.sender_id !== student.user_id) {
                        setUnreadCount((prev) => prev + 1);
                    }
                }
            )
            .subscribe();

        // 3. Presence Broadcaster
        const presenceChannel = supabase.channel('online-users');
        presenceChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({
                    user_id: student.user_id,
                    online_at: new Date().toISOString(),
                });
            }
        });

        return () => {
            supabase.removeChannel(messageSubscription);
            supabase.removeChannel(presenceChannel);
        };
    }, [student, isChatOpen]);

    // --- FETCH & CALCULATE ---
    useEffect(() => {
        const fetchAndCalculate = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/');
                    return;
                }

                const { data: studentData, error: stError } = await supabase
                    .from('students')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (stError || !studentData) {
                    console.error("Student not found");
                    return;
                }
                setStudent(studentData);

                const { data: activities } = await supabase.from('activities').select('*').order('start_date', { ascending: true });
                const { data: schedules } = await supabase.from('activity_schedules').select('*');
                const { data: attendance } = await supabase
                    .from('attendance_report')
                    .select('*')
                    .eq('student_id', studentData.student_id); 

                let calcTotalFines = 0;
                let calcEventsJoined = 0;
                const breakdownList: FineBreakdown[] = [];
                
                const validStatuses = new Set(['Time In (AM)', 'Time Out (AM)', 'Time In (PM)', 'Time Out (PM)']);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (activities && schedules && attendance) {
                    activities.forEach(act => {
                        const actScheds = schedules.filter(s => s.activity_id === act.id);
                        
                        let totalSlots = 0;
                        actScheds.forEach(s => {
                            if (s.am_in && s.am_in !== "") totalSlots++;
                            if (s.am_out && s.am_out !== "") totalSlots++;
                            if (s.pm_in && s.pm_in !== "") totalSlots++;
                            if (s.pm_out && s.pm_out !== "") totalSlots++;
                        });

                        const targetId = studentData.student_id.trim().toUpperCase();
                        const myLogs = attendance.filter(log => {
                            const logId = log.student_id ? log.student_id.trim().toUpperCase() : '';
                            return Number(log.activity_id) === act.id && 
                                   logId === targetId && 
                                   validStatuses.has(log.status);
                        });

                        const uniqueScans = new Set(myLogs.map(log => log.status));
                        const attendedCount = uniqueScans.size;

                        const activityStartDate = new Date(act.start_date);
                        activityStartDate.setHours(0, 0, 0, 0);
                        
                        const activityEndDate = new Date(act.end_date);
                        activityEndDate.setHours(0, 0, 0, 0);

                        let status: 'Upcoming' | 'Ongoing' | 'Completed' = 'Completed';
                        
                        if (today < activityStartDate) {
                            status = 'Upcoming';
                        } else if (today >= activityStartDate && today <= activityEndDate) {
                            status = 'Ongoing';
                        } else {
                            status = 'Completed';
                        }

                        const absences = Math.max(0, totalSlots - attendedCount);
                        let fineAmount = 0;
                        
                        if (status === 'Completed') {
                            fineAmount = absences * 50;
                        }

                        calcTotalFines += fineAmount;
                        if (attendedCount > 0) calcEventsJoined++;

                        breakdownList.push({
                            activityName: act.name,
                            type: act.activity_type,
                            statusString: `${attendedCount}/${totalSlots}`,
                            fineAmount: fineAmount,
                            attended: attendedCount,
                            totalSlots: totalSlots,
                            activityStatus: status,
                            isFinished: status === 'Completed',
                            date: act.start_date
                        });
                    });
                }

                setTotalFines(calcTotalFines);
                setEventsJoined(calcEventsJoined);
                setFineBreakdown(breakdownList);

            } catch (err) {
                console.error("Error loading dashboard:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAndCalculate();
    }, [router]);

    // --- SEND MESSAGE HANDLER ---
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !student) return;

        setIsSending(true);
        const { error } = await supabase.from('messages').insert({
            conversation_id: student.user_id, // Grouping chat by the student's ID
            sender_id: student.user_id,       // The student is sending it
            content: newMessage.trim(),
        });

        if (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message.");
        } else {
            setNewMessage('');
        }
        setIsSending(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const handleChangePassword = async () => {
        if (newPassword.length < 6) return alert("Password must be at least 6 characters");
        setPasswordLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        
        if (error) {
            alert(error.message);
        } else {
            alert("Password updated successfully!");
            setShowPasswordModal(false);
            setNewPassword('');
        }
        setPasswordLoading(false);
    };

    const handleDownloadQr = () => {
        if (qrCodeRef.current === null) {
            return;
        }
        toPng(qrCodeRef.current, { cacheBust: true, pixelRatio: 2 })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `${student.full_name}_QR.png`;
                link.href = dataUrl;
                link.click();
            })
            .catch((err) => {
                console.error('Could not download QR', err);
            });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Upcoming':
                return <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-blue-200 w-fit">UPCOMING</span>;
            case 'Ongoing':
                return <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-green-200 w-fit animate-pulse">ONGOING</span>;
            case 'Completed':
                return <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-slate-200 w-fit">COMPLETED</span>;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-4">
                <Loader2 className="h-10 w-10 text-green-600 animate-spin" />
                <p className="text-slate-500 font-medium">Loading...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
            
            {/* --- HEADER --- */}
            <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b bg-white/80 backdrop-blur-sm px-4 lg:px-6 dark:bg-slate-900/80 dark:border-slate-800 z-10">
                <div className="w-full flex-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <UserCheck className="h-6 w-6 text-green-600" />
                        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
                            Attendance Portal
                        </h1>
                    </div>
                    
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="flex items-center gap-2 text-sm font-medium text-red-700 hover:text-red-500 transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </header>

            {/* --- MAIN CONTENT (SCROLLABLE) --- */}
            <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                <div className="max-w-6xl mx-auto flex flex-col gap-6 relative">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* LEFT COLUMN: Profile */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                                <div className="flex flex-col items-center text-center">
                                    <div className="h-24 w-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-700">
                                        <User className="h-12 w-12 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{student?.full_name}</h3>
                                    <span className="px-3 py-1 mt-2 rounded-full bg-green-100 text-green-800 text-xs font-bold uppercase tracking-wider">
                                        Active Student
                                    </span>
                                    
                                    <div className="mt-6 w-full space-y-3">
                                        <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <Hash className="h-5 w-5 text-blue-500" />
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">ID Number</span>
                                            </div>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{student?.student_id}</span>
                                        </div>

                                        <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <GraduationCap className="h-5 w-5 text-purple-500" />
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Course</span>
                                            </div>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{student?.course}</span>
                                        </div>

                                        <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <ShieldCheck className="h-5 w-5 text-green-500" />
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Year Level</span>
                                            </div>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{student?.year_level}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Stats & Fines Table */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* --- QR CODE CARD --- */}
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="p-4 rounded-full bg-purple-50 text-purple-600">
                                        <QrCode size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">My QR Code</p>
                                        <Button 
                                            variant="secondary" 
                                            onClick={() => setShowQrModal(true)} 
                                            className="mt-1 w-full sm:w-auto text-xs py-1 px-2 h-8"
                                        >
                                            View & Download
                                        </Button>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className={`p-4 rounded-full ${totalFines > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                        <Coins size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Fines</p>
                                        <p className={`text-2xl font-bold ${totalFines > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            ₱{totalFines.toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="p-4 rounded-full bg-blue-50 text-blue-600">
                                        <CalendarCheck size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Events Joined</p>
                                        <p className="text-2xl font-bold text-slate-800 dark:text-white">
                                            {eventsJoined}
                                        </p>
                                    </div>
                                </div>

                                {/* CONTRIBUTION CARD */}
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="p-4 rounded-full bg-orange-50 text-orange-600">
                                        <Coins size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Contribution</p>
                                        <p className="text-2xl font-bold text-slate-400 dark:text-slate-500">
                                            Coming Soon
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Fine Breakdown Table */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden">
                                <div className="bg-white dark:bg-slate-900 p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-4">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                            Activity Log & Fines
                                        </h3>
                                    </div>
                                    <span className="text-xs text-slate-500 italic bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded w-fit">
                                        ₱50.00 per missed attendance
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-400">
                                            <tr>
                                                <th className="px-6 py-3 min-w-[300px]">Activity Details</th>
                                                <th className="px-6 py-3 text-center">Attendance</th>
                                                <th className="px-6 py-3 text-right">Fine Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {fineBreakdown.length > 0 ? (
                                                fineBreakdown.map((item, index) => {
                                                    const isComplete = item.attended === item.totalSlots && item.totalSlots > 0;
                                                    
                                                    return (
                                                        <tr key={index} className="bg-white border-b dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800">
                                                            <td className="px-6 py-4 align-top">
                                                                <div className="flex flex-col gap-1 items-start">
                                                                    <span className="font-medium text-slate-900 dark:text-white uppercase text-base">
                                                                        {item.activityName}
                                                                    </span>
                                                                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                                         <Clock size={12} />
                                                                         {item.date 
                                                                             ? new Date(item.date).toLocaleDateString('en-US', {
                                                                                 year: 'numeric', month: 'long', day: 'numeric'
                                                                             }) : ''}
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">
                                                                        {item.type.replace('_', ' ')}
                                                                    </span>
                                                                    <div className="mt-1">
                                                                         {getStatusBadge(item.activityStatus)}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center align-middle">
                                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                                    isComplete 
                                                                    ? 'bg-green-100 text-green-700' 
                                                                    : 'bg-yellow-100 text-yellow-700'
                                                                }`}>
                                                                    {item.statusString}
                                                                </span>
                                                            </td>
                                                            <td className={`px-6 py-4 text-right align-middle font-bold ${item.fineAmount > 0 ? 'text-red-600' : 'text-slate-300'}`}>
                                                                {item.activityStatus === 'Completed' 
                                                                    ? (item.fineAmount > 0 ? `₱${item.fineAmount}` : '₱0') 
                                                                    : '--'
                                                                }
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400">
                                                        No activity records found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {fineBreakdown.length > 0 && (
                                            <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold">
                                                <tr>
                                                    <td colSpan={2} className="px-6 py-4 text-right text-slate-800 dark:text-white">TOTAL PAYABLE:</td>
                                                    <td className={`px-6 py-4 text-right text-lg ${totalFines > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        ₱{totalFines.toFixed(2)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* --- FLOATING CHAT WIDGET --- */}
            <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
                {/* Chat Panel */}
                {isChatOpen && (
                    <div className="w-80 h-96 sm:w-96 sm:h-[28rem] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 mb-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
                        {/* Header */}
                        <div className="bg-green-600 p-4 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-2">
                                <MessageSquare size={20} />
                                <div>
                                    <h3 className="font-bold text-sm">Admin Support</h3>
                                    <p className="text-[10px] text-green-100">Send a message to the CSSO Officers</p>
                                </div>
                            </div>
                            <button onClick={() => setIsChatOpen(false)} className="text-green-100 hover:text-white rounded-full p-1 hover:bg-green-700 transition">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex flex-col gap-3">
                            {messages.length === 0 ? (
                                <div className="m-auto text-center text-slate-400 text-sm flex flex-col items-center">
                                    <MessageSquare size={32} className="mb-2 opacity-50" />
                                    <p>No messages yet.</p>
                                    <p>Send a message to start chatting.</p>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isMe = msg.sender_id === student?.user_id;
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <span className="text-[10px] text-slate-400 mb-1 mx-1">
                                                {isMe ? 'You' : 'Admin'}
                                            </span>
                                            <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${
                                                isMe 
                                                ? 'bg-green-600 text-white rounded-br-none' 
                                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-bl-none shadow-sm'
                                            }`}>
                                                {msg.content}
                                            </div>
                                            <span className="text-[9px] text-slate-400 mt-1 mx-1">
                                                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                            <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                                <input 
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="w-full bg-slate-100 dark:bg-slate-800 border-transparent focus:border-green-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-0 rounded-full pl-4 pr-12 py-2.5 text-sm dark:text-white transition-all"
                                    disabled={isSending}
                                />
                                <button 
                                    type="submit" 
                                    disabled={!newMessage.trim() || isSending}
                                    className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square flex items-center justify-center bg-green-600 hover:bg-green-700 text-white rounded-full disabled:opacity-50 transition-all"
                                >
                                    {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} className="ml-0.5" />}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Floating Button */}
                <button 
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className={`h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ${
                        isChatOpen ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                >
                    {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
                    
                    {/* Unread Badge */}
                    {!isChatOpen && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 border-2 border-slate-50 rounded-full flex items-center justify-center text-[10px] font-bold">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
            </div>

            {/* --- FIXED BOTTOM FOOTER --- */}
            <footer className="shrink-0 py-3 text-center border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 relative">
                <p className="text-xs text-slate-500 dark:text-slate-400"> 
                    Developed by: <strong>Christian B. Maglangit</strong> 
                </p>
            </footer>

            {/* --- Password Modal --- */}
            <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password">
                <div className="space-y-4">
                    <div>
                        <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                            <input 
                                type="password" 
                                placeholder="Min. 6 characters"
                                className="w-full py-2 pl-10 pr-4 bg-transparent border border-slate-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    <Button 
                        onClick={handleChangePassword} 
                        className="w-full" 
                        disabled={passwordLoading}
                    >
                        {passwordLoading ? 'Updating...' : 'Update Password'}
                    </Button>
                </div>
            </Modal>

            {/* --- LOGOUT CONFIRMATION MODAL --- */}
            <Modal isOpen={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} title="Confirm Logout">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-slate-600 dark:text-slate-300">
                            Are you sure you want to log out of your account?
                        </p>
                    </div>
                    <div className="flex gap-3 w-full mt-2">
                        <Button 
                            variant="secondary" 
                            onClick={() => setShowLogoutConfirm(false)} 
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="danger" 
                            onClick={handleLogout} 
                            className="flex-1"
                        >
                            Yes, Logout
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* --- QR CODE MODAL --- */}
            <Modal isOpen={showQrModal} onClose={() => setShowQrModal(false)} title="My QR Code">
                <div className="flex flex-col items-center gap-6">
                    <div className="text-center">
                        <p className="text-sm text-slate-500 mb-2">Scan this code to record attendance</p>
                        <div ref={qrCodeRef} className="bg-white p-6 rounded-lg text-center flex flex-col items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700">
                            <QRCodeCanvas 
                                value={getEncryptedQrData(student?.student_id)} 
                                size={200} 
                                level={"H"}
                            />
                            <p className="font-bold text-lg mt-4 text-slate-800">{student?.full_name}</p>
                            <p className="text-xs text-slate-400">Developed by: Christian B. Maglangit</p>
                        </div>
                    </div>
                    
                    <Button onClick={handleDownloadQr} className="w-full flex items-center justify-center gap-2">
                        <Download size={18} /> Download Image
                    </Button>
                </div>
            </Modal>

        </div>
    );
}