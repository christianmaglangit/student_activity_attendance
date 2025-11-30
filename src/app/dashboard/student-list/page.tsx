'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
    LayoutDashboard, Users, ClipboardList, QrCode, LogOut, X, UserCheck, Download, UserPlus, Edit, Trash2, Search, Archive, AlertTriangle, UserX, MoreHorizontal,
    Activity // Gidugang ang Activity icon
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { toPng } from 'html-to-image';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from 'jszip';
import { PasswordConfirmationModal } from '@/app/components/auth/PasswordConfirmationModal';

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

// --- GI-UPDATE ANG DESKTOP NAVLINK LOGIC ---
const NavLink = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode; }) => {
    const pathname = usePathname();
    // Gi-ayo ang logic para mo-handle og prefix matching (e.g., /dashboard/student-list/edit)
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

const Button: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }
> = ({ children, className, variant = 'primary', ...props }) => {
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

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string, icon?: React.ElementType }> = ({
    label,
    id,
    className,
    icon: Icon,
    ...props
}) => {
    const hasIcon = !!Icon;
    return (
        <div className="relative">
            {label && (
                <label
                    htmlFor={id}
                    className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                    {label}
                </label>
            )}
            {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />}
            <input
                id={id}
                className={`w-full py-2 bg-transparent border border-slate-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${hasIcon ? 'pl-10 pr-4' : 'px-4'} ${className}`}
                {...props}
            />
        </div>
    );
};

const Select: React.FC<
    React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: string[] }
> = ({ label, id, options, ...props }) => {
    return (
        <div>
            <label
                htmlFor={id}
                className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
                {label}
            </label>
            <select
                id={id}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                {...props}
            >
                <option value="" disabled>
                    Select {label}
                </option>
                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </div>
    );
};

const Modal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
    size?: 'md' | 'sm';
}> = ({ isOpen, onClose, children, title, size = 'md' }) => {
    if (!isOpen) return null;
    const sizeClass = size === 'sm' ? 'max-w-sm' : 'max-w-md';
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className={`relative w-full ${sizeClass} p-6 m-4 bg-white rounded-xl shadow-2xl dark:bg-slate-800`}
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
            <button
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            >
                <LogOut className="h-5 w-5" /> Logout
            </button>
        </div>
        <div className="pb-4 text-center px-4"> <p className="text-xs text-slate-500 dark:text-slate-400"> Developed by: <strong>Christian B. Maglangit</strong> </p> </div>
    </div>
);

// --- GIDUGANG NGA COMPONENT ---
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

// --- GIDUGANG NGA COMPONENT ---
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
                <BottomNavLink href="/dashboard/fines-report" icon={Activity}>Fines</BottomNavLink>
            </div>

            <div className="text-center pb-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Developed by: <strong>Christian B. Maglangit</strong>
                </p>
            </div>
        </nav>
    );
};


const StudentListItem = ({ student, onQr, onEdit, onDelete, index }: { student: Student, onQr: () => void, onEdit: () => void, onDelete: () => void, index: number }) => (
    <tr className="group bg-white border-b dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <td className="px-6 py-4 font-medium text-slate-500">{index + 1}</td>
        <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">
            {student.full_name}
        </td>
        <td className="px-6 py-4 hidden sm:table-cell">{student.student_id}</td>
        <td className="px-6 py-4 hidden md:table-cell">{student.course}</td>
        <td className="px-6 py-4 hidden lg:table-cell">{student.year_level}</td>
        <td className="px-6 py-4">
            <div className="flex justify-center items-center gap-1">
                <button onClick={onQr} className="p-2 rounded-md text-slate-500 hover:text-green-600 hover:bg-green-100 dark:hover:bg-slate-800"><QrCode size={18} /></button>
                <button onClick={onEdit} className="p-2 rounded-md text-slate-500 hover:text-green-600 hover:bg-green-100 dark:hover:bg-slate-800"><Edit size={18} /></button>
                <button onClick={onDelete} className="p-2 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-slate-800"><Trash2 size={18} /></button>
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
        <td className="px-6 py-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 animate-pulse"></div>
        </td>
        <td className="px-6 py-4 hidden sm:table-cell">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse"></div>
        </td>
        <td className="px-6 py-4 hidden md:table-cell">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse"></div>
        </td>
        <td className="px-6 py-4 hidden lg:table-cell">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse"></div>
        </td>
        <td className="px-6 py-4 text-center">
            <div className="flex justify-center gap-2">
                <div className="h-6 w-6 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse"></div>
            </div>
        </td>
    </tr>
);


export default function StudentListPage() {
    // --- GIKUHA ANG 'isSidebarOpen' STATE ---
    const [students, setStudents] = useState<Student[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [modalState, setModalState] = useState<{
        type: 'add' | 'edit' | 'delete' | 'qr' | null;
        student: Student | null;
    }>({ type: null, student: null });
    const initialFormState: StudentFormData = { student_id: '', full_name: '', gender: '', course: '', year_level: '', };
    const [formData, setFormData] = useState<StudentFormData>(initialFormState);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [message, setMessage] = useState('');
    const qrCodeRef = useRef<HTMLDivElement>(null);
    const hiddenQrRef = useRef<HTMLDivElement>(null);
    const [qrToRender, setQrToRender] = useState<Student | null>(null);
    const router = useRouter();
    const genderOptions = ['Male', 'Female'];
    const yearLevelOptions = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
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
        const MASTER_PASSWORD = 'admin20';

        if (!combinedPassword.startsWith(MASTER_PASSWORD)) {
            setPasswordError("Incorrect security password format.");
            setIsVerifyingPassword(false);
            return;
        }

        const userPasswordPart = combinedPassword.slice(MASTER_PASSWORD.length);
        
        if (!userPasswordPart) {
            setPasswordError("Please enter your user password after 'admin2000'.");
            setIsVerifyingPassword(false);
            return;
        }

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
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .order('full_name', { ascending: true }); 
        if (error) {
            setMessage(`Error: ${error.message}`);
        } else if (data) {
            setStudents(data as Student[]);
        }
        setTimeout(() => setLoading(false), 500);
    }, []);
    
    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

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
        if (error && error.message !== 'Auth session missing!') {
            console.error('Error logging out:', error.message);
        } else {
            router.push('/');
        }
    };

    const closeModal = () => { setModalState({ type: null, student: null }); setFormData(initialFormState); setMessage(''); };
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { const { id, value } = e.target; setFormData(prev => ({ ...prev, [id]: value })); };
    const handleAddStudent = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); const { data: { user } } = await supabase.auth.getUser(); if (!user) { setMessage("Error: You must be logged in to add a student."); setLoading(false); return; } const studentDataWithUser = { ...formData, user_id: user.id }; const { data, error } = await supabase.from('students').insert(studentDataWithUser).select().single(); if (error) { setMessage(`Error: ${error.message}`); } else if (data) { closeModal(); setModalState({ type: 'qr', student: data as Student }); fetchStudents(); } setLoading(false); };
    const handleUpdateStudent = async (e: React.FormEvent) => { e.preventDefault(); if (!modalState.student) return; setLoading(true); const { error } = await supabase.from('students').update(formData).eq('student_id', modalState.student.student_id); if (error) { setMessage(`Error: ${error.message}`); } else { closeModal(); fetchStudents(); } setLoading(false); };
    const handleDeleteStudent = async () => { if (!modalState.student) return; setLoading(true); const { error } = await supabase.from('students').delete().eq('student_id', modalState.student.student_id); if (error) { alert(`Error: ${error.message}`); } else { closeModal(); fetchStudents(); } setLoading(false); };
    const openEditModal = (student: Student) => { setFormData({ student_id: student.student_id, full_name: student.full_name, gender: student.gender, course: student.course, year_level: student.year_level, }); setModalState({ type: 'edit', student }); };
    const openDeleteModal = (student: Student) => setModalState({ type: 'delete', student });
    const openQrModal = (student: Student) => setModalState({ type: 'qr', student });
    const handleDownloadQr = useCallback(() => { if (!qrCodeRef.current || !modalState.student) return; toPng(qrCodeRef.current, { cacheBust: true, pixelRatio: 2 }).then((dataUrl) => { const link = document.createElement('a'); link.download = `${modalState.student!.full_name}_${modalState.student!.student_id}.png`; link.href = dataUrl; link.click(); }).catch((err) => console.error('Failed to generate image', err)); }, [modalState.student]);
    
    const handleExportPDF = () => { 
        const doc = new jsPDF(); 
        doc.setFontSize(18); 
        doc.text("Student List", 14, 22); 
        doc.setFontSize(10); 
        doc.text(`Exported on: ${new Date().toLocaleString()}`, 14, 30); 
        const tableColumn = ["#", "Student ID", "Full Name", "Course", "Year Level", "Gender"]; 
        const tableRows = filteredStudents.map((student, index) => [ index + 1, student.student_id, student.full_name, student.course, student.year_level, student.gender ]); 
        autoTable(doc, { 
            head: [tableColumn], 
            body: tableRows, 
            startY: 35,
            headStyles: { fillColor: [22, 160, 133] }
        }); 
        doc.save("students.pdf"); 
    };

    const handleExportAllQrs = async () => { if (students.length === 0) { alert("No students to export."); return; } setIsExporting(true); const zip = new JSZip(); for (const student of students) { setQrToRender(student); await new Promise(resolve => setTimeout(resolve, 50)); if (hiddenQrRef.current) { try { const dataUrl = await toPng(hiddenQrRef.current, { cacheBust: true, pixelRatio: 2 }); const blob = await (await fetch(dataUrl)).blob(); const safeFileName = student.full_name.replace(/[^a-z0-9]/gi, '_').toLowerCase(); zip.file(`${safeFileName}_${student.student_id}.png`, blob); } catch (err) { console.error(`Failed to generate QR for ${student.full_name}:`, err); } } } setQrToRender(null); zip.generateAsync({ type: 'blob' }).then((content) => { const link = document.createElement('a'); link.href = URL.createObjectURL(content); link.download = "all_student_qrcodes.zip"; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href); }); setIsExporting(false); };
    const isModalActive = modalState.type !== null;

    return (

        <>
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                {qrToRender && (
                    <div ref={hiddenQrRef} className="bg-white p-6 rounded-lg text-center items-center">
                        <QRCodeCanvas className="mx-auto flex justify-center" value={JSON.stringify({ student_id: qrToRender.student_id })} size={256} />
                        <p className="font-bold text-lg mt-4 text-black">{qrToRender.full_name}</p>
                        <p className="text-sm text-slate-600">{qrToRender.student_id}</p>
                    </div>
                )}
            </div>
            <div className={`grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]`}>
                <div className="hidden border-r bg-white md:block dark:bg-slate-900 dark:border-slate-800">
                    <SidebarContent onLogout={handleLogout} />
                </div>
                
                {/* --- GIKUHA ANG MOBILE SIDEBAR/DRAWER NGA CODE --- */}

                <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
                    
                    {/* --- GI-UPDATE ANG HEADER --- */}
                    <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b bg-white/80 backdrop-blur-sm px-4 lg:px-6 dark:bg-slate-900/80 dark:border-slate-800 z-10">
                        {/* Gikuha ang Hamburger Button */}
                        <div className="w-full flex-1 flex items-center justify-between">
                            <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
                                Student Activity Attendance
                            </h1>
                            {/* Gidugang ang Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="p-2 rounded-full md:hidden text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                                aria-label="Logout"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </header>
                    
                    {/* --- GI-UPDATE ANG MAIN (gidugang ang pb-20) --- */}
                    <main className={`flex-1 overflow-y-auto p-4 lg:p-6 transition-filter duration-300 ${isModalActive ? 'blur-sm' : ''} pb-20`}>
                        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                            <div className="w-full sm:w-auto sm:flex-1">
                                <Input
                                    id="search-id"
                                    type="text"
                                    placeholder="Search name, ID, course, or year..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="text-sm"
                                    suppressHydrationWarning
                                    icon={Search}
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button variant="secondary" onClick={handleExportAllQrs} disabled={isExporting}>
                                    <Archive size={16} className="mr-2" />
                                    <span>{isExporting ? 'Exporting...' : 'QRs'}</span>
                                </Button>
                                <Button variant="secondary" onClick={handleExportPDF}>
                                    <Download size={16} className="mr-2" />
                                    <span>PDF</span>
                                </Button>
                                <Button variant="primary" onClick={() => setModalState({ type: 'add', student: null })}>
                                    <UserPlus size={16} className="mr-2" />
                                    Add Student
                                </Button>
                            </div>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-400">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 w-12">#</th>
                                            <th scope="col" className="px-6 py-3">Full Name</th>
                                            <th scope="col" className="px-6 py-3 hidden sm:table-cell">ID Number</th>
                                            <th scope="col" className="px-6 py-3 hidden md:table-cell">Course</th>
                                            <th scope="col" className="px-6 py-3 hidden lg:table-cell">Year</th>
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
                                                onQr={() => openQrModal(student)}

                                                onEdit={() => handleSecureAction(() => openEditModal(student))}
                                                onDelete={() => handleSecureAction(() => openDeleteModal(student))}
                                            />
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="text-center p-10">
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

                    {/* --- GIDUGANG ANG BOTTOM NAV BAR --- */}
                    <BottomNavBar />
                </div>
            </div>

            <Modal isOpen={modalState.type === 'add' || modalState.type === 'edit'} onClose={closeModal} title={modalState.type === 'add' ? 'Add New Student' : 'Edit Student'}>
                <form onSubmit={modalState.type === 'add' ? handleAddStudent : handleUpdateStudent} className="space-y-4">
                    <Input label="Full Name" id="full_name" type="text" required value={formData.full_name} onChange={handleFormChange} />
                    <Input label="ID Number" id="student_id" type="text" required value={formData.student_id} onChange={handleFormChange} disabled={modalState.type === 'edit'} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select label="Gender" id="gender" required options={genderOptions} value={formData.gender} onChange={handleFormChange} />
                        <Select label="Year Level" id="year_level" required options={yearLevelOptions} value={formData.year_level} onChange={handleFormChange} />
                    </div>
                    <Input label="Course" id="course" type="text" required value={formData.course} onChange={handleFormChange} />
                    {message && <p className={`text-center text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>}
                    <Button type="submit" className="w-full mt-2" disabled={loading}>{loading ? 'Saving...' : (modalState.type === 'add' ? 'Save Student' : 'Update Student')}</Button>
                </form>
            </Modal>

            {modalState.student && (
                <>
                    <Modal isOpen={modalState.type === 'qr'} onClose={closeModal} title="Student QR Code" size="sm">
                        <div className="flex flex-col items-center gap-4">
                            <div ref={qrCodeRef} className="bg-white p-6 rounded-lg text-center">
                                <QRCodeCanvas value={JSON.stringify({ student_id: modalState.student.student_id })} size={200} className="mx-auto flex justify-center" />
                                <p className="font-bold text-lg mt-4 text-black">{modalState.student.full_name}</p>
                                <p className="text-sm text-slate-600">{modalState.student.student_id}</p>
                            </div>
                            <Button onClick={handleDownloadQr} className="w-auto flex items-center gap-2"><Download size={20} /> Download</Button>
                        </div>
                    </Modal>
                    <Modal isOpen={modalState.type === 'delete'} onClose={closeModal} title="Confirm Deletion" size="sm">
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
                </>
            )}
            {isPasswordModalOpen && (
                <PasswordConfirmationModal
                    onConfirm={handleConfirmPassword}
                    onClose={() => setIsPasswordModalOpen(false)}
                    loading={isVerifyingPassword}
                    error={passwordError}
                />
            )}
        </>
    );
}