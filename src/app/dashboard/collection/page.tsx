'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    LayoutDashboard, Users, ClipboardList, QrCode, LogOut, X, UserCheck, Activity,
    Search, Plus, Filter, Download, Loader2, Save, Edit3,
    Pencil, Trash2 // Added Edit and Delete icons
} from 'lucide-react';
// Make sure this path is correct for your project structure
import { PasswordConfirmationModal } from '@/app/components/auth/PasswordConfirmationModal';

// --- TYPES ---
type Collection = { id: number; title: string; default_amount: number; };
type Student = { student_id: string; full_name: string; year_level: string; course: string; };
type StudentCollection = { id: number; student_id: string; collection_id: number; amount_paid: number; paid_at: string; students?: { student_id: string; full_name: string; year_level: string; course: string; }; collections?: { id: number; title: string; default_amount: number; }; };
type PaymentDetailsInMap = { payment_id: number | null; amount_paid: number; status: 'Paid' | 'Unpaid' | 'Partial'; amount_due: number; };
type StudentPaymentSummary = { student_id: string; full_name: string; year_level: string; paymentsByCollectionId: Map<number, PaymentDetailsInMap>; total_balance: number; };

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
    const base = 'inline-flex items-center justify-center text-center px-4 h-10 text-sm font-semibold rounded-lg shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-150 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed'; // Fixed height
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
                    className={`uppercase w-full h-10 bg-transparent border border-slate-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:bg-slate-700 dark:border-slate-600 dark:text-white ${hasIcon ? 'pl-10 pr-4' : 'px-4'} ${className}`} // Added uppercase and fixed height
                    {...props}
                />
            </div>
        </div>
    );
};

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: React.ReactNode; }> = ({ label, id, children, ...props }) => {
    return (
        <div className="w-full">
            <label htmlFor={id} className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                {label}
            </label>
            <select
                id={id}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:bg-slate-700 dark:border-slate-600 dark:text-white" // Standard select height usually matches h-10 input with padding
                {...props}
            >
                {children}
            </select>
        </div>
    );
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; title: string; size?: 'md' | 'sm' | 'lg'; }> = ({ isOpen, onClose, children, title, size = 'md' }) => {
    if (!isOpen) return null;
    const sizeClass = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-3xl' : 'max-w-md';
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className={`relative w-full ${sizeClass} bg-white rounded-xl shadow-2xl dark:bg-slate-800 max-h-[90vh] flex flex-col`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center border-b p-6 dark:border-slate-700 flex-shrink-0">
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                        <X size={24} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
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
                    <span className="text-slate-800 dark:text-white">Attendance Portal</span>
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
                    <LogOut className="h-5 w-5" /> Logout
                </button>
            </div>
            <div className="pb-4 text-center px-4">
                <p className="text-xs text-slate-500 dark:text-slate-400"> Developed by: <strong>Christian B. Maglangit</strong> </p>
            </div>
        </div>
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
                <BottomNavLink href="/dashboard/collection" icon={Activity}>Collection</BottomNavLink>
            </div>
            <div className="text-center pb-1">
                <p className="text-xs text-slate-500 dark:text-slate-400"> Developed by: <strong>Christian B. Maglangit</strong> </p>
            </div>
        </nav>
    );
};

// --- MAIN PAGE COMPONENT ---
export default function CollectionPage() {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [payments, setPayments] = useState<StudentCollection[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalState, setModalState] = useState<'add' | 'report' | 'edit' | 'editCollection' | 'deleteCollectionConfirm' | null>(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    const [newCollectionData, setNewCollectionData] = useState<{ title: string; default_amount: string }>({ title: '', default_amount: '' });
    const [editPaymentData, setEditPaymentData] = useState<{ studentId: string; studentName: string; collectionId: number; collectionTitle: string; amountDue: number; amountPaid: string; paymentId: number | null } | null>(null);
    const [reportFilters, setReportFilters] = useState({ year: 'all', collection: 'all', month: 'all' });

    // --- Add Password Protection States ---
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // --- Add Collection Edit/Delete States ---
    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
    const [editCollectionData, setEditCollectionData] = useState<{ title: string; default_amount: string }>({ title: '', default_amount: '' });

    const router = useRouter();
    const handleLogout = async () => { await supabase.auth.signOut(); router.push('/'); router.refresh(); };

    // --- Fetch User Email for Password Check ---
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserEmail(user.email || null);
        };
        fetchUser();
    }, []);

    // --- Password Protection Functions ---
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

        const MASTER_PASSWORD = 'admin20'; // Replace with your actual master password
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
    // --- End Password Protection Functions ---


    const loadInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [collectionsRes, studentsRes, paymentsRes] = await Promise.all([
                supabase.from('collections').select('*').order('title', { ascending: true }),
                supabase.from('students').select('student_id, full_name, year_level, course').order('full_name', { ascending: true }),
                supabase.from('student_collections').select('*')
            ]);
            if (collectionsRes.error) throw collectionsRes.error;
            if (studentsRes.error) throw studentsRes.error;
            if (paymentsRes.error) throw paymentsRes.error;
            setCollections(collectionsRes.data as Collection[]);
            setStudents(studentsRes.data as Student[]);
            setPayments(paymentsRes.data as StudentCollection[]);
        } catch (error: unknown) { 
        if (error instanceof Error) {
            console.error('Error loading initial data:', error.message); 
        } else {
            console.error('An unknown error occurred:', error);
        }
        }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadInitialData(); }, [loadInitialData]);

    const studentPaymentSummaries = useMemo((): StudentPaymentSummary[] => {
        const lowerSearchQuery = searchQuery.toLowerCase();
        const paymentMap = new Map<string, Map<number, StudentCollection>>();
        payments.forEach(p => { if (!paymentMap.has(p.student_id)) { paymentMap.set(p.student_id, new Map()); } paymentMap.get(p.student_id)!.set(p.collection_id, p); });

        const filteredStudents = students.filter(student =>
            student.full_name.toLowerCase().includes(lowerSearchQuery) ||
            student.student_id.toLowerCase().includes(lowerSearchQuery)
        );

        const tableRows = filteredStudents.map(student => {
            const studentPayments = new Map<number, PaymentDetailsInMap>();
            const studentPaymentRecords = paymentMap.get(student.student_id);
            let totalBalance = 0;

            collections.forEach(collection => {
                const payment = studentPaymentRecords?.get(collection.id);
                const amountDue = collection.default_amount;
                const amountPaid = payment?.amount_paid ?? 0;
                const balance = amountDue - amountPaid;

                if (balance > 0) {
                    totalBalance += balance;
                }

                let status: 'Paid' | 'Unpaid' | 'Partial' = 'Unpaid';
                if (amountPaid >= amountDue) { status = 'Paid'; }
                else if (amountPaid > 0) { status = 'Partial'; }
                studentPayments.set(collection.id, {
                    payment_id: payment?.id ?? null,
                    amount_paid: amountPaid,
                    status: status,
                    amount_due: amountDue
                });
            });
            return {
                student_id: student.student_id,
                full_name: student.full_name,
                year_level: student.year_level,
                paymentsByCollectionId: studentPayments,
                total_balance: totalBalance
            };
        });
        tableRows.sort((a, b) => a.full_name.localeCompare(b.full_name));
        return tableRows;
    }, [students, collections, payments, searchQuery]);

    const handleSaveCollection = async (e: React.FormEvent) => {
        e.preventDefault();
        const { title, default_amount } = newCollectionData;
        if (!title || !default_amount || parseFloat(default_amount) < 0) {
             alert("Please provide a valid title and non-negative amount.");
             return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { alert("You must be logged in."); return; }
        setActionLoading(true);
        const { error } = await supabase.from('collections').insert({ title: title, default_amount: parseFloat(default_amount) });
        if (error) { alert(error.message); }
        else { setModalState(null); setNewCollectionData({ title: '', default_amount: '' }); await loadInitialData(); }
        setActionLoading(false);
    };

    const handleOpenEditModal = ( student: StudentPaymentSummary, collection: Collection, paymentInfo: PaymentDetailsInMap | undefined ) => {
        setEditPaymentData({
             studentId: student.student_id,
             studentName: student.full_name,
             collectionId: collection.id,
             collectionTitle: collection.title,
             amountDue: paymentInfo?.amount_due ?? collection.default_amount,
             amountPaid: (paymentInfo?.amount_paid ?? 0).toString(),
             paymentId: paymentInfo?.payment_id ?? null
        });
        setModalState('edit');
    };

    const handleSavePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editPaymentData) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { alert("You must be logged in."); return; }

        const { studentId, paymentId, amountPaid, collectionId } = editPaymentData;
        const paidAmount = parseFloat(amountPaid) || 0;
        if (paidAmount < 0) { alert("Amount paid cannot be negative."); return; }

        setActionLoading(true);
        const upsertData: Partial<StudentCollection> & { student_id: string; collection_id: number; amount_paid: number; user_id: string; } = {
            student_id: studentId, collection_id: collectionId, amount_paid: paidAmount, user_id: user.id, paid_at: new Date().toISOString()
        };

        let response;
        if (paymentId) {
             response = await supabase.from('student_collections')
                 .update({ amount_paid: paidAmount, paid_at: upsertData.paid_at, user_id: user.id })
                 .eq('id', paymentId)
                 .select()
                 .single();
        } else {
             if (paidAmount > 0) {
                 response = await supabase.from('student_collections')
                     .insert(upsertData)
                     .select()
                     .single();
             } else {
                 setModalState(null);
                 setActionLoading(false);
                 return;
             }
        }

        if (response?.error) { alert(response.error.message); }
        else {
            const updatedPayment = response?.data as StudentCollection;
            if (paymentId) {
                 setPayments(payments.map(p => p.id === paymentId ? updatedPayment : p));
            } else if (updatedPayment) {
                 setPayments([...payments, updatedPayment]);
            }
            setModalState(null);
        }
         setActionLoading(false);
    };

    const handleGenerateReport = async () => {
        setIsGeneratingReport(true);
        try {
            let paymentQuery = supabase
                .from('student_collections')
                .select(`*, students ( student_id, full_name, year_level, course ), collections ( id, title, default_amount )`);

            if (reportFilters.collection !== 'all') {
                paymentQuery = paymentQuery.eq('collection_id', parseInt(reportFilters.collection));
            }
            if (reportFilters.month !== 'all') {
                const year = new Date().getFullYear();
                const monthIndex = parseInt(reportFilters.month) - 1;
                const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
                const endDate = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));
                paymentQuery = paymentQuery
                    .gte('paid_at', startDate.toISOString())
                    .lt('paid_at', endDate.toISOString());
            }

            const { data: paymentData, error: paymentError } = await paymentQuery;
            if (paymentError) throw paymentError;
            if (!paymentData || paymentData.length === 0) {
                alert("No payment data found for the selected filters.");
                setIsGeneratingReport(false);
                return;
            }

            let filteredData = paymentData as StudentCollection[];
            if (reportFilters.year !== 'all') {
                filteredData = filteredData.filter(p => p.students?.year_level === reportFilters.year);
            }

            filteredData = filteredData.filter(p => p.students && p.collections);
            if (filteredData.length === 0) {
                alert("No payment data found for the selected filters.");
                setIsGeneratingReport(false);
                return;
            }

            filteredData.sort((a, b) => a.students!.full_name.localeCompare(b.students!.full_name));

            const doc = new jsPDF({ orientation: 'landscape' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            doc.setFontSize(16); doc.text("Collection Payment Report", pageWidth / 2, 20, { align: 'center' });
            doc.setFontSize(10);
            const collectionTitle = collections.find(c => c.id.toString() === reportFilters.collection)?.title || 'N/A';
            const monthName = reportFilters.month === 'all' ? 'All' : new Date(0, parseInt(reportFilters.month) - 1).toLocaleString('default', { month: 'long' });
            const filterText = `Filters: Year=${reportFilters.year}, Collection=${reportFilters.collection === 'all' ? 'All' : collectionTitle}, Month=${monthName}`;
            doc.text(filterText, pageWidth / 2, 28, { align: 'center' });
            doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 34, { align: 'center' });

            const tableHeaders = [["#", "Student ID", "Name", "Year Level", "Collection", "Amount Paid", "Date Paid"]];
            const tableBody = filteredData.map((payment, index) => [
                index + 1, payment.students!.student_id, payment.students!.full_name, payment.students!.year_level,
                payment.collections!.title, `₱${payment.amount_paid.toFixed(2)}`, new Date(payment.paid_at).toLocaleDateString()
            ]);

            autoTable(doc, {
                head: tableHeaders, body: tableBody, startY: 40, theme: 'striped', headStyles: { fillColor: [22, 160, 133] },
                didDrawPage: (data) => {
                     doc.setFontSize(8); doc.setTextColor(150);
                     doc.text(`Page ${data.pageNumber}`, data.settings.margin.left, pageHeight - 10);
                     doc.text(`Generated by: Attendance Portal`, pageWidth - data.settings.margin.right, pageHeight - 10, { align: 'right' });
                }
            });

            doc.save(`collection_report_${new Date().toISOString().split('T')[0]}.pdf`);
            setModalState(null);

        } catch (error: unknown) {
            if (error instanceof Error)
            console.error("Error generating report:", error.message);
            if (error instanceof Error)
            alert(`Failed to generate report: ${error.message}`);
        } finally {
            setIsGeneratingReport(false);
        }
    };

    // --- Collection Edit/Delete Functions ---
    const openEditCollectionModal = (collection: Collection) => {
        setSelectedCollection(collection);
        setEditCollectionData({ title: collection.title, default_amount: collection.default_amount.toString() });
        handleSecureAction(() => {
            setModalState('editCollection');
        });
    };

    const handleUpdateCollection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCollection) return;

        const { title, default_amount } = editCollectionData;
        const amount = parseFloat(default_amount);

        if (!title || isNaN(amount) || amount < 0) {
            alert("Please provide a valid title and non-negative amount.");
            return;
        }
        setActionLoading(true);
        const { error } = await supabase
            .from('collections')
            .update({ title: title, default_amount: amount })
            .eq('id', selectedCollection.id);

        if (error) {
            alert(`Error updating collection: ${error.message}`);
        } else {
            setModalState(null);
            await loadInitialData();
        }
        setActionLoading(false);
    };

    const openDeleteCollectionConfirmModal = (collection: Collection) => {
        setSelectedCollection(collection);
         handleSecureAction(() => {
             setModalState('deleteCollectionConfirm');
         });
    };

    const handleDeleteCollection = async () => {
        if (!selectedCollection) return;

        setActionLoading(true);
        const { data: payments, error: checkError } = await supabase
            .from('student_collections')
            .select('id')
            .eq('collection_id', selectedCollection.id)
            .limit(1);

        if (checkError) {
             alert(`Error checking for payments: ${checkError.message}`);
             setActionLoading(false);
             return;
        }

        if (payments && payments.length > 0) {
             alert(`Cannot delete collection "${selectedCollection.title}" because it has existing payment records. Please remove associated payments first.`);
             setActionLoading(false);
              setModalState(null);
             return;
        }

        const { error: deleteError } = await supabase
            .from('collections')
            .delete()
            .eq('id', selectedCollection.id);

        if (deleteError) {
            alert(`Error deleting collection: ${deleteError.message}`);
        } else {
            setModalState(null);
            await loadInitialData();
        }
        setActionLoading(false);
    };
    // --- End Collection Edit/Delete Functions ---

    return (
        <div className={`grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]`}>
            <div className="hidden border-r bg-white md:block dark:bg-slate-900 dark:border-slate-800">
                <SidebarContent onLogout={handleLogout} />
            </div>

            <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
                <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b bg-white/80 backdrop-blur-sm px-4 lg:px-6 dark:bg-slate-900/80 dark:border-slate-800 z-10">
                    <div className="w-full flex-1 flex items-center justify-between">
                        <h1 className="text-xl font-semibold text-slate-800 dark:text-white"> Attendance Portal </h1>
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
                            <Button variant="primary" onClick={() => setModalState('add')} className="flex-1 md:flex-auto">
                                <Plus size={16} className="mr-2" /> Add Collection
                            </Button>
                            <Button variant="secondary" onClick={() => setModalState('report')} className="flex-1 md:flex-auto">
                                <Filter size={16} className="mr-2" /> Report
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400 table-fixed min-w-[1150px]">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-400">
                                    <tr>
                                        {/* Sticky Headers */}
                                        <th scope="col" className="px-6 py-3 w-32 left-0 bg-slate-50 dark:bg-slate-800 z-10">Student ID</th>
                                        {/* Name - Sticky only on md+ */}
                                        <th scope="col" className="px-6 py-3 w-48 md:left-32 bg-slate-50 dark:bg-slate-800 z-10">Name</th>
                                        {/* Year - Sticky only on md+ */}
                                        <th scope="col" className="px-6 py-3 w-24 md:left-80 bg-slate-50 dark:bg-slate-800 z-10">Year</th>


                                        {/* Dynamic Collection Headers with Subheader & Edit/Delete Icons */}
                                        {collections.map(collection => (
                                            <th key={collection.id} scope="col" className="px-2 py-3 border-l dark:border-slate-700 w-48 text-center relative group">
                                                <div className="flex items-center justify-center gap-1">
                                                     {/* Edit Icon */}
                                                    <button
                                                        onClick={() => openEditCollectionModal(collection)}
                                                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 dark:hover:text-blue-300"
                                                        aria-label={`Edit ${collection.title}`} title={`Edit ${collection.title}`}
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                    {/* Title */}
                                                    <div className="truncate flex-1">{collection.title}</div>
                                                     {/* Delete Icon */}
                                                    <button
                                                        onClick={() => openDeleteCollectionConfirmModal(collection)}
                                                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 dark:hover:text-red-400 "
                                                         aria-label={`Delete ${collection.title}`} title={`Delete ${collection.title}`}
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                                <div className="text-xs font-normal text-slate-500">(Collection: ₱{collection.default_amount.toFixed(2)})</div>
                                                <div className="mt-1 grid grid-cols-3 gap-1 text-xs font-medium border-t border-slate-200 dark:border-slate-700 pt-1">
                                                     <span className="text-right pr-1">Paid</span>
                                                     <span className="text-left pl-1">Balance</span>
                                                     <span className="">Action</span>
                                                </div>
                                            </th>
                                        ))}
                                        {/* Total Balance Header */}
                                        <th scope="col" className="px-6 py-3 w-32 sticky right-0 bg-slate-50 dark:bg-slate-800 z-10 border-l dark:border-slate-700 text-center">
                                            Total Balance
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                     {loading ? (
                                         <tr><td colSpan={4 + collections.length} className="text-center p-6">Loading data...</td></tr>
                                     ) : studentPaymentSummaries.length > 0 ? (
                                        studentPaymentSummaries.map(student => (
                                            <tr key={student.student_id} className="bg-white border-b dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                {/* Sticky Cell */}
                                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white truncate left-0 bg-white dark:bg-slate-900 z-10">{student.student_id}</td>
                                                {/* Name - Sticky only on md+ */}
                                                <td className="px-6 py-4 truncate md:left-32 bg-white dark:bg-slate-900 z-10">{student.full_name}</td>
                                                {/* Year - Sticky only on md+ */}
                                                <td className="px-6 py-4 truncate md:left-80 bg-white dark:bg-slate-900 z-10">{student.year_level}</td>


                                                {/* Dynamic Payment Cells */}
                                                {collections.map(collection => {
                                                    const paymentInfo = student.paymentsByCollectionId.get(collection.id);
                                                    const amountPaid = paymentInfo?.amount_paid ?? 0;
                                                    const amountDue = paymentInfo?.amount_due ?? collection.default_amount;
                                                    const balance = amountDue - amountPaid;
                                                    const status = paymentInfo?.status ?? 'Unpaid';

                                                    return (
                                                        <td key={collection.id} className="px-2 py-4 border-l dark:border-slate-700 align-middle">
                                                             <div className="grid grid-cols-3 gap-1 items-center text-xs">
                                                                <span className={`font-semibold truncate text-right pr-1 ${status === 'Paid' ? 'text-green-600' : status === 'Partial' ? 'text-yellow-600' : 'text-slate-400'}`}>
                                                                     ₱{amountPaid.toFixed(2)}
                                                                </span>
                                                                <span className={`truncate text-left pl-1 ${balance <= 0 ? 'text-slate-400' : 'text-red-500 font-medium'}`}>
                                                                     ({balance > 0 ? `₱${balance.toFixed(2)}` : '₱0.00'})
                                                                </span>
                                                                 <div className="flex justify-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleOpenEditModal(student, collection, paymentInfo)}
                                                                        aria-label={`Edit payment for ${collection.title}`}
                                                                        className="p-1 h-7 w-7 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-blue-400 transition-colors"
                                                                    >
                                                                        <Edit3 size={14} />
                                                                    </button>
                                                                </div>
                                                             </div>
                                                        </td>
                                                    );
                                                })}
                                                {/* Total Balance Cell */}
                                                <td className="px-6 py-4 font-semibold text-center sticky right-0 bg-white dark:bg-slate-900 z-10 border-l dark:border-slate-800">
                                                    <span className={student.total_balance > 0 ? 'text-red-600' : 'text-slate-500'}>
                                                        ₱{student.total_balance.toFixed(2)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                     ) : (
                                         <tr><td colSpan={4 + collections.length} className="text-center p-6">No matching students found.</td></tr>
                                     )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>

                <BottomNavBar />
            </div>

             {/* Add Collection Modal */}
             <Modal isOpen={modalState === 'add'} onClose={() => setModalState(null)} title="Add New Collection">
                 <form onSubmit={handleSaveCollection} className="space-y-4">
                     <Input
                         label="Collection Title"
                         id="collection-title"
                         type="text"
                         required
                         value={newCollectionData.title}
                         onChange={(e) => setNewCollectionData({ ...newCollectionData, title: e.target.value })}
                         className="uppercase"
                     />
                     <Input
                         label="Default Amount (₱)"
                         id="collection-amount"
                         type="number"
                         step="0.01"
                         min="0"
                         required
                         value={newCollectionData.default_amount}
                         onChange={(e) => setNewCollectionData({ ...newCollectionData, default_amount: e.target.value })}
                     />
                     <Button type="submit" className="w-full mt-2" disabled={actionLoading}>
                        {actionLoading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving...</> : <><Save size={16} className="mr-2" /> Save Collection</>}
                     </Button>
                 </form>
             </Modal>

            {/* Edit Payment Modal */}
            <Modal isOpen={modalState === 'edit'} onClose={() => setModalState(null)} title="Edit Payment">
                {editPaymentData && (
                    <form onSubmit={handleSavePayment} className="space-y-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">Student</label>
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">{editPaymentData.studentName}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{editPaymentData.studentId}</p>
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">Collection</label>
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">{editPaymentData.collectionTitle}</p>
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">Amount Due</label>
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">₱{editPaymentData.amountDue.toFixed(2)}</p>
                        </div>
                        <Input
                            label="Amount Paid (₱)"
                            id="amount-paid"
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={editPaymentData.amountPaid}
                            onChange={(e) => setEditPaymentData({ ...editPaymentData, amountPaid: e.target.value })}
                        />
                        <Button type="submit" className="w-full mt-2" disabled={actionLoading}>
                            {actionLoading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving...</> : <><Save size={16} className="mr-2" /> Save Payment</>}
                        </Button>
                    </form>
                )}
            </Modal>

            {/* Report Modal */}
            <Modal isOpen={modalState === 'report'} onClose={() => setModalState(null)} title="Generate Collection Report" size="lg">
                <div className="space-y-4">
                    <Select
                        label="Filter by Year Level"
                        id="report-year" value={reportFilters.year}
                        onChange={e => setReportFilters({...reportFilters, year: e.target.value})}
                    >
                        <option value="all">All Year Levels</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                    </Select>
                    <Select
                        label="Filter by Collection"
                        id="report-collection"
                        value={reportFilters.collection}
                        onChange={e => setReportFilters({...reportFilters, collection: e.target.value})}
                    >
                        <option value="all">All Collections</option>
                        {collections.map(col => (
                            <option key={col.id} value={col.id}>{col.title}</option>
                        ))}
                    </Select>
                    <Select
                        label="Filter by Month Paid"
                        id="report-month"
                        value={reportFilters.month}
                        onChange={e => setReportFilters({...reportFilters, month: e.target.value})}
                    >
                        <option value="all">All Months</option>
                        {[ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ]
                            .map((month, index) => (
                                <option key={index + 1} value={index + 1}>{month}</option>
                            ))
                        }
                    </Select>
                    <Button
                        onClick={handleGenerateReport}
                        className="w-full mt-2"
                        disabled={isGeneratingReport}
                    >
                        {isGeneratingReport ? (
                            <><Loader2 size={16} className="mr-2 animate-spin" /> Generating...</>
                        ) : (
                            <><Download size={16} className="mr-2" /> Generate Report</>
                        )}
                    </Button>
                </div>
            </Modal>

            {/* Edit Collection Modal */}
            <Modal isOpen={modalState === 'editCollection'} onClose={() => setModalState(null)} title="Edit Collection">
                 {selectedCollection && (
                    <form onSubmit={handleUpdateCollection} className="space-y-4">
                        <Input
                            label="Collection Title"
                            id="edit-collection-title"
                            type="text"
                            required
                            value={editCollectionData.title}
                            onChange={(e) => setEditCollectionData({ ...editCollectionData, title: e.target.value })}
                             className="uppercase"
                        />
                        <Input
                            label="Default Amount (₱)"
                            id="edit-collection-amount"
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={editCollectionData.default_amount}
                            onChange={(e) => setEditCollectionData({ ...editCollectionData, default_amount: e.target.value })}
                        />
                        <Button type="submit" className="w-full mt-2" disabled={actionLoading}>
                             {actionLoading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving...</> : <><Save size={16} className="mr-2" /> Save Changes</>}
                        </Button>
                    </form>
                 )}
            </Modal>

             {/* Delete Collection Confirmation Modal */}
             <Modal isOpen={modalState === 'deleteCollectionConfirm'} onClose={() => setModalState(null)} title="Confirm Deletion" size="sm">
                 <div className="text-center">
                    <p className="mb-6">Are you sure you want to delete the collection <span className="font-bold">{selectedCollection?.title}</span>? This action cannot be undone if there are no associated payments.</p>
                    <div className="flex justify-center gap-4">
                        <Button variant="secondary" onClick={() => setModalState(null)} disabled={actionLoading}>Cancel</Button>
                        <Button variant="danger" onClick={handleDeleteCollection} disabled={actionLoading}>
                            {actionLoading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Deleting...</> : 'Delete'}
                        </Button>
                    </div>
                 </div>
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

        </div> // Closing div for the main component return
    );
}