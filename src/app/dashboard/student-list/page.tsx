'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
    LayoutDashboard, Users, ClipboardList, QrCode, LogOut, X, UserCheck, Download, UserPlus, Edit, Trash2, Search, Archive, AlertTriangle, UserX, MoreHorizontal,
    Activity, RefreshCw, UserMinus, Loader2, CheckCircle, XCircle, MessageSquare, Send, Megaphone
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { toPng } from 'html-to-image';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from 'jszip';
import { PasswordConfirmationModal } from '@/app/components/auth/PasswordConfirmationModal';
import Swal from 'sweetalert2';
import CryptoJS from 'crypto-js';

// --- IMPORT THE SERVER ACTIONS ---
import { createStudentWithAccount, syncAllMissingAccounts, unsyncAllAccounts } from '@/app/actions/studentActions';

// --- SECRET KEY SA PAG-ENCRYPT ---
const QR_SECRET_KEY = process.env.NEXT_PUBLIC_QR_SECRET || 'attendance-system-secure-key-2024';

type Student = {
    student_id: string;
    full_name: string;
    gender: string;
    course: string;
    year_level: string;
    created_at: string;
    user_id: string;
};

type StudentFormData = Omit<Student, 'created_at' | 'user_id'>;

type ChatMessage = {
    id: number;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
};

// --- FULL SCREEN LOADER COMPONENT ---
const FullScreenLoader = ({ message }: { message: string }) => (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm cursor-wait">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300 max-w-sm text-center border border-slate-200 dark:border-slate-700">
            <div className="relative">
                <div className="absolute inset-0 bg-green-500 blur-xl opacity-20 rounded-full"></div>
                <Loader2 className="h-12 w-12 text-green-600 dark:text-green-400 animate-spin relative z-10" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Processing Request</h3>
                <p className="text-base font-medium text-slate-600 dark:text-slate-300">{message}</p>
            </div>
            <p className="text-xs text-slate-400 mt-2 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-full">
                Please do not close or navigate away.
            </p>
        </div>
    </div>
);

const NavLink = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode; }) => {
    const pathname = usePathname();
    const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${isActive
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
    const base = 'inline-flex items-center justify-center text-center px-4 py-2 text-sm font-semibold rounded-lg shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-150 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed';
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
        <div className="relative">
            {label && <label htmlFor={id} className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
            {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />}
            <input id={id} className={`w-full py-2 bg-transparent border border-slate-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${hasIcon ? 'pl-10 pr-4' : 'px-4'} ${className}`} {...props} />
        </div>
    );
};

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: string[] }> = ({ label, id, options, ...props }) => {
    return (
        <div>
            <label htmlFor={id} className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
            <select id={id} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:bg-slate-700 dark:border-slate-600 dark:text-white" {...props}>
                <option value="" disabled>Select {label}</option>
                {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
        </div>
    );
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; title: string; size?: 'md' | 'sm'; }> = ({ isOpen, onClose, children, title, size = 'md' }) => {
    if (!isOpen) return null;
    const sizeClass = size === 'sm' ? 'max-w-sm' : 'max-w-md';
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className={`relative w-full ${sizeClass} p-6 m-4 bg-white rounded-xl shadow-2xl dark:bg-slate-800`} onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b pb-3 mb-4 dark:border-slate-700">
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><X size={24} /></button>
                </div>
                {children}
            </div>
        </div>
    );
};

const SidebarContent = ({ onLogout }: { onLogout: () => Promise<void> }) => (
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
                <NavLink href="/dashboard/fines-report" icon={Activity}>Fines Report</NavLink>
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

const BottomNavLink = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode; }) => {
    const pathname = usePathname();
    const isActive = href === "/dashboard" ? pathname === href : href !== "/" && pathname.startsWith(href);
    return (
        <Link href={href} className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors ${isActive ? 'text-red-600' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>
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
                    <Link href="/dashboard/scan-attendance" className="flex flex-col h-16 w-16 -mt-6 items-center justify-center rounded-full bg-red-600 text-white shadow-lg" aria-label="Scan QR Code">
                        <QrCode className="h-7 w-7" />
                        <span className="text-sm font-medium">Scan</span>
                    </Link>
                </div>
                <BottomNavLink href="/dashboard/activity" icon={ClipboardList}>Activity</BottomNavLink>
                <BottomNavLink href="/dashboard/fines-report" icon={Activity}>Fines</BottomNavLink>
            </div>
            <div className="text-center pb-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">Developed by: <strong>Christian B. Maglangit</strong></p>
            </div>
        </nav>
    );
};

const StudentListItem = ({ student, isOnline, unreadCount, onChat, onQr, onEdit, onDelete, index, isSelected, onToggleSelect }: { student: Student, isOnline: boolean, unreadCount: number, onChat: () => void, onQr: () => void, onEdit: () => void, onDelete: () => void, index: number, isSelected: boolean, onToggleSelect: () => void }) => (
    <tr className={`group bg-white border-b dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isSelected ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
        <td className="px-6 py-4">
            <input 
                type="checkbox" 
                checked={isSelected} 
                onChange={onToggleSelect} 
                className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-700 dark:checked:bg-green-500 cursor-pointer"
            />
        </td>
        <td className="px-6 py-4 font-medium text-slate-500">{index + 1}</td>
        <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">{student.full_name}</td>
        <td className="px-6 py-4 hidden sm:table-cell">{student.student_id}</td>
        <td className="px-6 py-4 hidden md:table-cell">{student.course}</td>
        <td className="px-6 py-4 hidden lg:table-cell">{student.year_level}</td>
        
        <td className="px-6 py-4">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isOnline 
                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' 
                : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            }`}>
                <span className={`relative flex h-2 w-2`}>
                  {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                </span>
                {isOnline ? 'Online' : 'Offline'}
            </div>
        </td>

        <td className="px-6 py-4">
            <div className="flex justify-center items-center gap-1">
                {/* --- CHAT BUTTON WITH UNREAD BADGE --- */}
                <button onClick={onChat} title="Chat with Student" className="relative p-2 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-slate-800">
                    <MessageSquare size={18} />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold leading-none text-red-100 bg-red-600 rounded-full transform translate-x-1/4 -translate-y-1/4">
                            {unreadCount}
                        </span>
                    )}
                </button>
                <button onClick={onQr} title="Generate QR" className="p-2 rounded-md text-slate-500 hover:text-green-600 hover:bg-green-100 dark:hover:bg-slate-800"><QrCode size={18} /></button>
                <button onClick={onEdit} title="Edit Student" className="p-2 rounded-md text-slate-500 hover:text-green-600 hover:bg-green-100 dark:hover:bg-slate-800"><Edit size={18} /></button>
                <button onClick={onDelete} title="Delete Student" className="p-2 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-slate-800"><Trash2 size={18} /></button>
            </div>
            <div className="flex justify-center md:hidden group-hover:opacity-0">
                <MoreHorizontal size={20} className="text-slate-400" />
            </div>
        </td>
    </tr>
);

const ListItemSkeleton = () => (
    <tr className="border-b dark:border-slate-700">
        <td className="px-6 py-4"><div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div></td>
        <td className="px-6 py-4"><div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 animate-pulse"></div></td>
        <td className="px-6 py-4 hidden sm:table-cell"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse"></div></td>
        <td className="px-6 py-4 hidden md:table-cell"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse"></div></td>
        <td className="px-6 py-4 hidden lg:table-cell"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse"></div></td>
        <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div></td>
        <td className="px-6 py-4 text-center"><div className="flex justify-center gap-2"><div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"></div></div></td>
    </tr>
);

// --- MAIN PAGE COMPONENT ---
export default function StudentListPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

    const [modalState, setModalState] = useState<{
        type: 'add' | 'edit' | 'delete' | 'bulk-delete' | 'qr' | null;
        student: Student | null;
    }>({ type: null, student: null });
    
    const [successModal, setSuccessModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'success'
    });

    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

    // CHAT STATE
    const [chatModalOpen, setChatModalOpen] = useState(false);
    const [activeChatStudent, setActiveChatStudent] = useState<Student | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [newChatMessage, setNewChatMessage] = useState('');
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>({});
    
    // BROADCAST STATE
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    // REFS FOR REALTIME SYNC (To avoid dependency stale closures)
    const activeChatStudentRef = useRef<Student | null>(null);
    const chatModalOpenRef = useRef<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const initialFormState: StudentFormData = { student_id: '', full_name: '', gender: '', course: '', year_level: '', };
    const [formData, setFormData] = useState<StudentFormData>(initialFormState);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [message, setMessage] = useState('');
    const qrCodeRef = useRef<HTMLDivElement>(null);
    const hiddenQrRef = useRef<HTMLDivElement>(null);
    const [qrToRender, setQrToRender] = useState<Student | null>(null);
    const router = useRouter();
    
    const genderOptions = ['MALE', 'FEMALE'];
    const yearLevelOptions = ['1ST YEAR', '2ND YEAR', '3RD YEAR', '4TH YEAR'];
    
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [adminId, setAdminId] = useState<string | null>(null); 
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [isUnsyncing, setIsUnsyncing] = useState(false);

    const getEncryptedQrData = (studentId: string) => {
        const dataToEncrypt = JSON.stringify({ student_id: studentId });
        const encrypted = CryptoJS.AES.encrypt(dataToEncrypt, QR_SECRET_KEY).toString();
        return encrypted;
    };

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || null);
                setAdminId(user.id);
            }
        };
        fetchUser();
    }, []);

    // Update Refs for the real-time listener to always have the latest state
    useEffect(() => {
        activeChatStudentRef.current = activeChatStudent;
        chatModalOpenRef.current = chatModalOpen;
    }, [activeChatStudent, chatModalOpen]);

    // --- SINGLE REAL-TIME LISTENER FOR ALL MESSAGES ---
    useEffect(() => {
        if (!adminId) return;

        const globalChatSub = supabase.channel('global_admin_chat')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    
                    // If the sender is the admin, do nothing (we handle it optimistically)
                    if (newMsg.sender_id === adminId) return;

                    const isOpen = chatModalOpenRef.current;
                    const activeStudent = activeChatStudentRef.current;

                    // Check if we are currently chatting with the person who sent this message
                    if (isOpen && activeStudent?.user_id === newMsg.conversation_id) {
                        // We are actively chatting with them, append the message instantly!
                        setChatMessages(prev => [...prev, newMsg]);
                    } else {
                        // We are NOT chatting with them, increment their unread badge!
                        setUnreadMessages(prev => ({
                            ...prev,
                            [newMsg.conversation_id]: (prev[newMsg.conversation_id] || 0) + 1
                        }));
                    }
                }
            ).subscribe();

        return () => {
            supabase.removeChannel(globalChatSub);
        }
    }, [adminId]);


    // Online Presence
    useEffect(() => {
        const channel = supabase.channel('online-users');
        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                const onlineIds = new Set<string>();
                for (const id in newState) {
                    const presenceEntry = newState[id] as any;
                    if (presenceEntry && presenceEntry[0] && presenceEntry[0].user_id) {
                        onlineIds.add(presenceEntry[0].user_id);
                    }
                }
                setOnlineUserIds(onlineIds);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // --- FETCH HISTORY WHEN CHAT OPENS ---
    useEffect(() => {
        if (!chatModalOpen || !activeChatStudent?.user_id) return;

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', activeChatStudent.user_id)
                .order('created_at', { ascending: true });
            
            if (data) setChatMessages(data);
        };

        fetchMessages();
    }, [chatModalOpen, activeChatStudent]);

    // Auto-scroll to the bottom of the chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, chatModalOpen]);

    const handleSecureAction = (action: () => void) => {
        setPendingAction(() => action);
        setIsPasswordModalOpen(true);
        setPasswordError(null);
    };

    const handleConfirmPassword = async (combinedPassword: string) => {
        if (!userEmail) { setPasswordError("Could not find user info. Please log in again."); return; }
        setIsVerifyingPassword(true);
        setPasswordError(null);
        const MASTER_PASSWORD = 'admin20';
        if (!combinedPassword.startsWith(MASTER_PASSWORD)) { setPasswordError("Incorrect security password format."); setIsVerifyingPassword(false); return; }
        const userPasswordPart = combinedPassword.slice(MASTER_PASSWORD.length);
        if (!userPasswordPart) { setPasswordError("Please enter your user password after 'admin20'."); setIsVerifyingPassword(false); return; }
        
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: userEmail, password: userPasswordPart, });
        
        if (signInError) { 
            setPasswordError("Incorrect user password."); 
            setIsVerifyingPassword(false); 
        } else { 
            setIsPasswordModalOpen(false); 
            if (pendingAction) { pendingAction(); } 
            setPendingAction(null); 
            setIsVerifyingPassword(false); 
        }
    };

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('students').select('*').order('full_name', { ascending: true });
        if (error) { setMessage(`Error: ${error.message}`); } else if (data) { setStudents(data as Student[]); }
        setTimeout(() => setLoading(false), 500);
    }, []);

    useEffect(() => { fetchStudents(); }, [fetchStudents]);

    useEffect(() => {
        const lowercasedQuery = searchQuery.toLowerCase();
        const results = students.filter(student =>
            student.full_name.toLowerCase().includes(lowercasedQuery) ||
            student.student_id.toLowerCase().includes(lowercasedQuery) ||
            student.course.toLowerCase().includes(lowercasedQuery) ||
            student.year_level.toLowerCase().includes(lowercasedQuery)
        );
        setFilteredStudents(results);
    }, [searchQuery, students]);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error && error.message !== 'Auth session missing!') { console.error('Error logging out:', error.message); } else { router.push('/'); }
    };

    const closeModal = () => { setModalState({ type: null, student: null }); setFormData(initialFormState); setMessage(''); };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { 
        const { id, value } = e.target; 
        setFormData(prev => ({ ...prev, [id]: value.toUpperCase() })); 
    };

    const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = new Set(filteredStudents.map(s => s.student_id));
            setSelectedStudentIds(allIds);
        } else {
            setSelectedStudentIds(new Set());
        }
    };

    const handleToggleSelectOne = (studentId: string) => {
        const newSet = new Set(selectedStudentIds);
        if (newSet.has(studentId)) {
            newSet.delete(studentId);
        } else {
            newSet.add(studentId);
        }
        setSelectedStudentIds(newSet);
    };

    // --- HANDLE CHAT MODAL TRIGGER ---
    const handleChat = (student: Student) => {
        if (!student.user_id) {
            Swal.fire({ 
                title: 'No Account', 
                text: 'This student does not have an active account yet. Please sync accounts first.', 
                icon: 'warning', 
                confirmButtonColor: '#f59e0b' 
            });
            return;
        }
        
        // Reset unread count for this student when opened
        setUnreadMessages(prev => {
            const updated = { ...prev };
            delete updated[student.user_id];
            return updated;
        });

        setActiveChatStudent(student);
        setChatModalOpen(true);
    };

    // --- SEND MESSAGE FUNCTION ---
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChatMessage.trim() || !activeChatStudent || !adminId) return;

        setIsSendingMessage(true);

        const msgContent = newChatMessage.trim();
        // Optimistic UI Update (Show message instantly before DB confirms)
        const optimisticMsg: ChatMessage = {
            id: Date.now(), // Temporary ID
            conversation_id: activeChatStudent.user_id,
            sender_id: adminId,
            content: msgContent,
            created_at: new Date().toISOString()
        };
        
        setChatMessages(prev => [...prev, optimisticMsg]);
        setNewChatMessage(''); // Clear input instantly

        const { error } = await supabase.from('messages').insert({
            conversation_id: activeChatStudent.user_id,
            sender_id: adminId,
            content: msgContent
        });

        if (error) {
            console.error("Error sending message:", error);
            Swal.fire({ title: 'Error', text: 'Failed to send message.', icon: 'error' });
            // Revert optimistic update on error
            setChatMessages(prev => prev.filter(msg => msg.id !== optimisticMsg.id));
        }

        setIsSendingMessage(false);
    };

    // --- BROADCAST MESSAGE FUNCTION ---
    const handleBroadcastMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!broadcastMessage.trim() || !adminId) return;

        // Target only students CURRENTLY FILTERED in the table who have user_ids
        const targetStudents = filteredStudents.filter(s => s.user_id);

        if (targetStudents.length === 0) {
            Swal.fire('No Accounts', 'None of the students currently listed have synced accounts to receive messages.', 'warning');
            return;
        }

        setIsBroadcasting(true);

        // Prepare the array of inserts
        const inserts = targetStudents.map(student => ({
            conversation_id: student.user_id,
            sender_id: adminId,
            content: broadcastMessage.trim()
        }));

        const { error } = await supabase.from('messages').insert(inserts);

        if (error) {
            console.error("Broadcast error:", error);
            Swal.fire('Error', 'Failed to send broadcast message.', 'error');
        } else {
            Swal.fire('Sent!', `Message successfully broadcasted to ${targetStudents.length} student(s).`, 'success');
            setIsBroadcastModalOpen(false);
            setBroadcastMessage('');
        }
        setIsBroadcasting(false);
    };

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await createStudentWithAccount(formData);
            if (result.success) {
                closeModal();
                setModalState({ type: 'qr', student: result.student as Student });
                fetchStudents();
                Swal.fire({ title: 'Success!', text: 'Student has been added successfully.', icon: 'success', confirmButtonColor: '#16a34a', confirmButtonText: 'Great!' });
            } else {
                Swal.fire({ title: 'Failed', text: result.message, icon: 'error', confirmButtonColor: '#dc2626', confirmButtonText: 'Try Again' });
            }
        } catch (error) {
            console.error(error);
            Swal.fire({ title: 'Error', text: 'An unexpected error occurred.', icon: 'error', confirmButtonColor: '#dc2626' });
        }
        setLoading(false);
    };

    const handleUpdateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalState.student) return;
        setLoading(true);
        const { error } = await supabase.from('students').update(formData).eq('student_id', modalState.student.student_id);
        if (error) { setMessage(`Error: ${error.message}`); } else { closeModal(); fetchStudents(); }
        setLoading(false);
    };

    const handleDeleteStudent = async () => {
        if (!modalState.student) return;
        setLoading(true);
        const { error } = await supabase.from('students').delete().eq('student_id', modalState.student.student_id);
        if (error) {
            setMessage(`Error deleting student: ${error.message}`);
        } else {
            closeModal();
            fetchStudents();
            setMessage("Student deleted successfully.");
        }
        setLoading(false);
    };

    const handleBulkDelete = async () => {
        if (selectedStudentIds.size === 0) return;
        setLoading(true);
        const idsToDelete = Array.from(selectedStudentIds);
        const { error } = await supabase.from('students').delete().in('student_id', idsToDelete);
        
        if (error) {
            setMessage(`Error deleting students: ${error.message}`);
            Swal.fire({ title: 'Error', text: error.message, icon: 'error', confirmButtonColor: '#dc2626' });
        } else {
            closeModal();
            setSelectedStudentIds(new Set());
            fetchStudents();
            Swal.fire({ title: 'Deleted!', text: `${idsToDelete.length} students have been deleted.`, icon: 'success', confirmButtonColor: '#16a34a' });
        }
        setLoading(false);
    };

    const executeSync = async () => {
        setIsSyncing(true);
        setMessage(''); 
        try {
            const result = await syncAllMissingAccounts();
            if (result.success) {
                fetchStudents();
                setSuccessModal({ isOpen: true, title: 'Sync Completed', message: result.message, type: 'success' });
            } else {
                setSuccessModal({ isOpen: true, title: 'Sync Failed', message: result.message, type: 'error' });
            }
        } catch (err) {
            setSuccessModal({ isOpen: true, title: 'Sync Error', message: "An unexpected error occurred during sync.", type: 'error' });
            console.error(err);
        }
        setIsSyncing(false);
    };

    const executeUnsync = async () => {
        setIsUnsyncing(true);
        setMessage('');
        try {
            const result = await unsyncAllAccounts();
            if (result.success) {
                fetchStudents();
                setSuccessModal({ isOpen: true, title: 'Unsync Completed', message: result.message, type: 'success' });
            } else {
                setSuccessModal({ isOpen: true, title: 'Unsync Failed', message: result.message, type: 'error' });
            }
        } catch (err) {
             setSuccessModal({ isOpen: true, title: 'Unsync Error', message: "An unexpected error occurred during unsync.", type: 'error' });
            console.error(err);
        }
        setIsUnsyncing(false);
    };

    const openEditModal = (student: Student) => { setFormData({ student_id: student.student_id, full_name: student.full_name, gender: student.gender, course: student.course, year_level: student.year_level, }); setModalState({ type: 'edit', student }); };
    const openDeleteModal = (student: Student) => setModalState({ type: 'delete', student });
    const openBulkDeleteModal = () => setModalState({ type: 'bulk-delete', student: null });
    const openQrModal = (student: Student) => setModalState({ type: 'qr', student });
    
    const handleDownloadQr = useCallback(() => { if (!qrCodeRef.current || !modalState.student) return; toPng(qrCodeRef.current, { cacheBust: true, pixelRatio: 2 }).then((dataUrl) => { const link = document.createElement('a'); link.download = `${modalState.student!.full_name}_${modalState.student!.student_id}.png`; link.href = dataUrl; link.click(); }).catch((err) => console.error('Failed to generate image', err)); }, [modalState.student]);

    const handleExportPDF = () => { const doc = new jsPDF(); doc.setFontSize(18); doc.text("Student List", 14, 22); doc.setFontSize(10); doc.text(`Exported on: ${new Date().toLocaleString()}`, 14, 30); const tableColumn = ["#", "Student ID", "Full Name", "Course", "Year Level", "Gender", "Status"]; const tableRows = filteredStudents.map((student, index) => [index + 1, student.student_id, student.full_name, student.course, student.year_level, student.gender, onlineUserIds.has(student.user_id) ? 'Online' : 'Offline']); autoTable(doc, { head: [tableColumn], body: tableRows, startY: 35, headStyles: { fillColor: [22, 160, 133] } }); doc.save("students.pdf"); };
    
    const handleExportAllQrs = async () => { if (students.length === 0) { setMessage("No students to export."); return; } setIsExporting(true); const zip = new JSZip(); for (const student of students) { setQrToRender(student); await new Promise(resolve => setTimeout(resolve, 50)); if (hiddenQrRef.current) { try { const dataUrl = await toPng(hiddenQrRef.current, { cacheBust: true, pixelRatio: 2 }); const blob = await (await fetch(dataUrl)).blob(); const safeFileName = student.full_name.replace(/[^a-z0-9]/gi, '_').toLowerCase(); zip.file(`${safeFileName}_${student.student_id}.png`, blob); } catch (err) { console.error(`Failed to generate QR for ${student.full_name}:`, err); } } } setQrToRender(null); zip.generateAsync({ type: 'blob' }).then((content) => { const link = document.createElement('a'); link.href = URL.createObjectURL(content); link.download = "all_student_qrcodes.zip"; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href); }); setIsExporting(false); };
    
    const isModalActive = modalState.type !== null;

    return (
        <>
            {(isSyncing || isUnsyncing || isBroadcasting) && (
                <FullScreenLoader
                    message={
                        isSyncing ? "Syncing accounts... Creating logins for students." 
                        : isUnsyncing ? "Unsyncing accounts... Removing student logins."
                        : "Broadcasting message to students..."
                    }
                />
            )}

            {successModal.isOpen && (
                 <Modal 
                    isOpen={successModal.isOpen} 
                    onClose={() => setSuccessModal({ ...successModal, isOpen: false })} 
                    title={successModal.title}
                    size="sm"
                >
                    <div className="text-center flex flex-col items-center">
                        <div className={`p-3 rounded-full mb-4 ${successModal.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                            {successModal.type === 'success' ? <CheckCircle className="h-10 w-10 text-green-600" /> : <XCircle className="h-10 w-10 text-red-600" />}
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 mb-6 text-sm md:text-base">
                            {successModal.message}
                        </p>
                        <Button 
                            onClick={() => setSuccessModal({ ...successModal, isOpen: false })} 
                            className="w-full"
                        >
                            OK
                        </Button>
                    </div>
                </Modal>
            )}

            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                {qrToRender && (
                    <div ref={hiddenQrRef} className="bg-white p-6 rounded-lg text-center items-center">
                        <QRCodeCanvas 
                            className="mx-auto flex justify-center" 
                            value={getEncryptedQrData(qrToRender.student_id)} 
                            size={256} 
                        />
                        <p className="font-bold text-lg mt-4 text-black">{qrToRender.full_name}</p>
                        <p className="text-xs text-slate-400">Developed by: Christian B. Maglangit</p>
                    </div>
                )}
            </div>

            <div className={`grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]`}>
                <div className="hidden border-r bg-white md:block dark:bg-slate-900 dark:border-slate-800">
                    <SidebarContent onLogout={handleLogout} />
                </div>

                <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
                    <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b bg-white/80 backdrop-blur-sm px-4 lg:px-6 dark:bg-slate-900/80 dark:border-slate-800 z-10">
                        <div className="w-full flex-1 flex items-center justify-between">
                            <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Student Activity Attendance</h1>
                            <button onClick={handleLogout} className="p-2 rounded-full md:hidden text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50" aria-label="Logout">
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </header>

                    <main className={`flex-1 overflow-y-auto p-4 lg:p-6 transition-filter duration-300 ${isModalActive ? 'blur-sm' : ''} pb-20`}>
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 mb-6">
                            <div className="w-full lg:flex-1">
                                <Input id="search-id" type="text" placeholder="Search name, ID, course, or year..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="text-sm" suppressHydrationWarning icon={Search} />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:flex-wrap lg:flex-nowrap">
                                {selectedStudentIds.size > 0 && (
                                    <Button variant="danger" onClick={() => handleSecureAction(openBulkDeleteModal)} className="col-span-2 w-full sm:w-auto animate-in fade-in zoom-in duration-200">
                                        <Trash2 size={16} className="mr-2" />
                                        Delete Selected ({selectedStudentIds.size})
                                    </Button>
                                )}
                                
                                {/* --- BROADCAST BUTTON ADDED HERE --- */}
                                <Button variant="secondary" onClick={() => setIsBroadcastModalOpen(true)} className="w-full sm:w-auto border-indigo-500 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-900">
                                    <Megaphone size={16} className="mr-2" />
                                    <span>Broadcast</span>
                                </Button>

                                <Button variant="secondary" onClick={handleExportAllQrs} disabled={isExporting} className="w-full sm:w-auto">
                                    <Archive size={16} className="mr-2" />
                                    <span>{isExporting ? 'Exporting...' : 'QRs'}</span>
                                </Button>
                                <Button variant="secondary" onClick={handleExportPDF} className="w-full sm:w-auto">
                                    <Download size={16} className="mr-2" />
                                    <span>PDF</span>
                                </Button>
                                <Button variant="secondary" onClick={() => handleSecureAction(executeSync)} disabled={isSyncing || loading} className="w-full sm:w-auto border-yellow-500 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900">
                                    <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                                    <span>Sync</span>
                                </Button>
                                <Button variant="secondary" onClick={() => handleSecureAction(executeUnsync)} disabled={isUnsyncing || isSyncing || loading} className="w-full sm:w-auto border-red-500 text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900">
                                    <UserMinus size={16} className={`mr-2 ${isUnsyncing ? 'animate-pulse' : ''}`} />
                                    <span>Unsync</span>
                                </Button>
                                <Button variant="primary" onClick={() => setModalState({ type: 'add', student: null })} className="col-span-2 w-full sm:w-auto sm:col-span-1">
                                    <UserPlus size={16} className="mr-2" />
                                    Add Student
                                </Button>
                            </div>
                        </div>

                        {message && (
                            <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                {message}
                            </div>
                        )}

                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-400">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 w-12">
                                                <input 
                                                    type="checkbox" 
                                                    checked={filteredStudents.length > 0 && selectedStudentIds.size === filteredStudents.length}
                                                    onChange={handleToggleSelectAll}
                                                    className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-700 dark:checked:bg-green-500 cursor-pointer"
                                                />
                                            </th>
                                            <th scope="col" className="px-6 py-3 w-12">#</th>
                                            <th scope="col" className="px-6 py-3">Full Name</th>
                                            <th scope="col" className="px-6 py-3 hidden sm:table-cell">ID Number</th>
                                            <th scope="col" className="px-6 py-3 hidden md:table-cell">Course</th>
                                            <th scope="col" className="px-6 py-3 hidden lg:table-cell">Year</th>
                                            <th scope="col" className="px-6 py-3">Status</th>
                                            <th scope="col" className="px-6 py-3 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            Array.from({ length: 7 }).map((_, i) => <ListItemSkeleton key={i} />)
                                        ) : filteredStudents.length > 0 ? (
                                            filteredStudents.map((student, index) => (
                                                <StudentListItem
                                                    key={student.student_id}
                                                    student={student}
                                                    index={index}
                                                    isOnline={onlineUserIds.has(student.user_id)}
                                                    isSelected={selectedStudentIds.has(student.student_id)}
                                                    unreadCount={unreadMessages[student.user_id] || 0}
                                                    onToggleSelect={() => handleToggleSelectOne(student.student_id)}
                                                    onChat={() => handleChat(student)}
                                                    onQr={() => openQrModal(student)}
                                                    onEdit={() => handleSecureAction(() => openEditModal(student))}
                                                    onDelete={() => handleSecureAction(() => openDeleteModal(student))}
                                                />
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={8} className="text-center p-10">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                                                            <UserX className="h-10 w-10 text-slate-500" />
                                                        </div>
                                                        <p className="mt-4 font-semibold text-slate-700 dark:text-slate-200">{searchQuery ? 'No Students Match Your Search' : 'No Students Found'}</p>
                                                        <p className="text-slate-500 dark:text-slate-400 text-sm">Add a new student to get started.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </main>

                    <BottomNavBar />
                </div>
            </div>

            {/* --- FORMS & MODALS --- */}
            <Modal isOpen={modalState.type === 'add' || modalState.type === 'edit'} onClose={closeModal} title={modalState.type === 'add' ? 'Add New Student' : 'Edit Student'}>
                <form onSubmit={modalState.type === 'add' ? handleAddStudent : handleUpdateStudent} className="space-y-4">
                    <Input label="Full Name (Format: Lastname, Firstname MI)" id="full_name" type="text" required value={formData.full_name} onChange={handleFormChange} placeholder="E.G. MAGLANGIT, CHRISTIAN B." />
                    <Input label="ID Number" id="student_id" type="text" required value={formData.student_id} onChange={handleFormChange} disabled={modalState.type === 'edit'} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select label="Gender" id="gender" required options={genderOptions} value={formData.gender} onChange={handleFormChange} />
                        <Select label="Year Level" id="year_level" required options={yearLevelOptions} value={formData.year_level} onChange={handleFormChange} />
                    </div>
                    <Input label="Course" id="course" type="text" required value={formData.course} onChange={handleFormChange} />

                    <Button type="submit" className="w-full mt-2" disabled={loading}>
                        {loading ? 'Processing...' : (modalState.type === 'add' ? 'Save & Create Account' : 'Update Student')}
                    </Button>
                </form>
            </Modal>

            {/* SINGLE QR MODAL */}
            {modalState.student && modalState.type === 'qr' && (
                <Modal isOpen={true} onClose={closeModal} title="Student QR Code" size="sm">
                    <div className="flex flex-col items-center gap-4">
                        <div ref={qrCodeRef} className="bg-white p-6 rounded-lg text-center">
                            <QRCodeCanvas 
                                className="mx-auto flex justify-center"
                                value={getEncryptedQrData(modalState.student.student_id)}
                                size={200} 
                            />
                            <p className="font-bold text-lg mt-4 text-black">{modalState.student.full_name}</p>
                            <p className="text-xs text-slate-400">Developed by: Christian B. Maglangit</p>
                        </div>
                        <Button onClick={handleDownloadQr} className="w-auto flex items-center gap-2"><Download size={20} /> Download</Button>
                    </div>
                </Modal>
            )}

            {/* SINGLE DELETE MODAL */}
            {modalState.student && modalState.type === 'delete' && (
                <Modal isOpen={true} onClose={closeModal} title="Confirm Deletion" size="sm">
                    <div className="text-center flex flex-col items-center">
                        <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                        </div>
                        <p>Are you sure you want to delete <strong className="font-semibold text-slate-800 dark:text-white">{modalState.student.full_name}</strong>?</p>
                        <p className="text-sm text-slate-500">This action cannot be undone.</p>
                        <div className="flex gap-4 mt-6 w-full">
                            <Button variant="secondary" className="w-full" onClick={closeModal}>Cancel</Button>
                            <Button variant="danger" className="w-full" onClick={handleDeleteStudent} disabled={loading}>{loading ? 'Deleting...' : 'Delete'}</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* BULK DELETE MODAL */}
            {modalState.type === 'bulk-delete' && (
                <Modal isOpen={true} onClose={closeModal} title="Confirm Bulk Deletion" size="sm">
                    <div className="text-center flex flex-col items-center">
                        <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                        </div>
                        <p>Are you sure you want to delete <strong className="font-semibold text-slate-800 dark:text-white">{selectedStudentIds.size} selected students</strong>?</p>
                        <p className="text-sm text-slate-500">This action cannot be undone.</p>
                        <div className="flex gap-4 mt-6 w-full">
                            <Button variant="secondary" className="w-full" onClick={closeModal}>Cancel</Button>
                            <Button variant="danger" className="w-full" onClick={handleBulkDelete} disabled={loading}>{loading ? 'Deleting...' : 'Delete All'}</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* PASSWORD CONFIRMATION */}
            {isPasswordModalOpen && (
                <PasswordConfirmationModal
                    onConfirm={handleConfirmPassword}
                    onClose={() => setIsPasswordModalOpen(false)}
                    loading={isVerifyingPassword}
                    error={passwordError}
                />
            )}

            {/* --- ADMIN CHAT MODAL --- */}
            {chatModalOpen && activeChatStudent && (
                <Modal 
                    isOpen={true} 
                    onClose={() => { setChatModalOpen(false); setActiveChatStudent(null); setChatMessages([]); }} 
                    title={`Chat: ${activeChatStudent.full_name}`} 
                    size="md"
                >
                    <div className="flex flex-col h-[60vh] max-h-[500px]">
                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 custom-scrollbar">
                            {chatMessages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <MessageSquare size={32} className="mb-2 opacity-50" />
                                    <p className="text-sm text-center">No messages yet.<br/>Send a message to start the conversation.</p>
                                </div>
                            ) : (
                                chatMessages.map(msg => {
                                    const isAdmin = msg.sender_id === adminId;
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                                            <span className="text-[10px] text-slate-400 mb-1 mx-1">
                                                {isAdmin ? 'You (Admin)' : activeChatStudent.full_name}
                                            </span>
                                            <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                                                isAdmin 
                                                ? 'bg-green-600 text-white rounded-br-none' 
                                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-none text-slate-800 dark:text-white'
                                            }`}>
                                                {msg.content}
                                            </div>
                                            <span className="text-[9px] text-slate-400 mt-1 mx-1">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        
                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="mt-4 flex gap-2 shrink-0">
                            <input
                                type="text"
                                value={newChatMessage}
                                onChange={(e) => setNewChatMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-full focus:outline-none focus:border-green-500 focus:bg-white focus:ring-1 focus:ring-green-500 dark:bg-slate-800 dark:border-slate-600 dark:focus:bg-slate-700 dark:text-white transition-colors"
                                disabled={isSendingMessage}
                            />
                            <button 
                                type="submit" 
                                disabled={!newChatMessage.trim() || isSendingMessage} 
                                className="bg-green-600 text-white p-2 w-11 h-11 rounded-full flex items-center justify-center hover:bg-green-700 disabled:opacity-50 transition-all shrink-0"
                            >
                                {isSendingMessage ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
                            </button>
                        </form>
                    </div>
                </Modal>
            )}

            {/* --- BROADCAST MODAL --- */}
            <Modal isOpen={isBroadcastModalOpen} onClose={() => setIsBroadcastModalOpen(false)} title="Broadcast Message" size="md">
                <form onSubmit={handleBroadcastMessage} className="space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                        Send a message to <strong>{filteredStudents.filter(s => s.user_id).length}</strong> synced students in the current view.
                    </p>
                    <textarea
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        placeholder="Type your announcement here..."
                        className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 dark:bg-slate-800 dark:border-slate-600 dark:focus:bg-slate-700 dark:text-white transition-colors"
                        rows={4}
                        required
                        disabled={isBroadcasting}
                    />
                    <div className="flex gap-3 mt-4">
                        <Button variant="secondary" type="button" onClick={() => setIsBroadcastModalOpen(false)} className="flex-1" disabled={isBroadcasting}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" className="flex-1" disabled={!broadcastMessage.trim() || isBroadcasting}>
                            {isBroadcasting ? <><Loader2 size={16} className="animate-spin mr-2"/> Sending...</> : <><Send size={16} className="mr-2"/> Send to All</>}
                        </Button>
                    </div>
                </form>
            </Modal>

        </>
    );
}