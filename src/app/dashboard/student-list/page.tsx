'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  LayoutDashboard, Users, ClipboardList, QrCode, LogOut, Menu, X, UserCheck, Download, UserPlus, Edit, Trash2, Search, Archive
} from 'lucide-react';

import { QRCodeCanvas } from 'qrcode.react';
import { toPng } from 'html-to-image';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from 'jszip';

// --- Type Definition ---
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

// --- Reusable UI Components ---
const NavLink = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode; }) => {
  const pathname = usePathname();
  const isActive = pathname === href;
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
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }
> = ({ children, className, variant = 'primary', ...props }) => {
  const base =
    'text-center px-4 py-2 font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-transform transform hover:scale-105 whitespace-nowrap';
  const styles = {
    primary: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    secondary:
      'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props} suppressHydrationWarning>
      {children}
    </button>
  );
};

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({
  label,
  id,
  className,
  ...props
}) => {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${className}`}
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
        className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
      <select
        id={id}
        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-60 backdrop-blur-sm">
      <div
        className={`relative w-full ${sizeClass} p-6 m-4 bg-gray-100 rounded-xl shadow-2xl dark:bg-gray-800`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b pb-3 mb-4 dark:border-gray-700">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
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
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
                <LogOut className="h-5 w-5" /> Logout
            </button>
        </div>
        <div className="container mx-auto text-center px-4"> <p className="text-sm text-gray-600 dark:text-gray-400"> Developed by: <strong>Christian B. Maglangit</strong> </p> </div>
    </div>
);

// --- Main Student List Page Component ---
export default function StudentListPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
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
    setLoading(false);
  }, []);
  
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    const results = students.filter(student =>
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchQuery.toLowerCase())
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
  
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setMessage("Error: You must be logged in to add a student.");
        setLoading(false);
        return;
    }
    const studentDataWithUser = { ...formData, user_id: user.id };
    const { data, error } = await supabase
        .from('students')
        .insert(studentDataWithUser)
        .select()
        .single();
    if (error) {
        setMessage(`Error: ${error.message}`);
    } else if (data) {
        closeModal();
        setModalState({ type: 'qr', student: data as Student });
        fetchStudents();
    }
    setLoading(false);
  };
  
  const handleUpdateStudent = async (e: React.FormEvent) => { e.preventDefault(); if (!modalState.student) return; setLoading(true); const { error } = await supabase.from('students').update(formData).eq('student_id', modalState.student.student_id); if (error) { setMessage(`Error: ${error.message}`); } else { closeModal(); fetchStudents(); } setLoading(false); };
  const handleDeleteStudent = async () => { if (!modalState.student) return; setLoading(true); const { error } = await supabase.from('students').delete().eq('student_id', modalState.student.student_id); if (error) { alert(`Error: ${error.message}`); } else { closeModal(); fetchStudents(); } setLoading(false); };
  const openEditModal = (student: Student) => { setFormData({ student_id: student.student_id, full_name: student.full_name, gender: student.gender, course: student.course, year_level: student.year_level, }); setModalState({ type: 'edit', student }); };
  const openDeleteModal = (student: Student) => setModalState({ type: 'delete', student });
  const openQrModal = (student: Student) => setModalState({ type: 'qr', student });

  const handleDownloadQr = useCallback(() => { if (!qrCodeRef.current || !modalState.student) return; toPng(qrCodeRef.current, { cacheBust: true }).then((dataUrl) => { const link = document.createElement('a'); link.download = `${modalState.student!.full_name}_${modalState.student!.student_id}.png`; link.href = dataUrl; link.click(); }).catch((err) => console.error('Failed to generate image', err)); }, [modalState.student]);
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Student List", 14, 15);
    doc.setFontSize(10);
    doc.text(`Exported on: ${new Date().toLocaleString()}`, 14, 22);
    const tableColumn = ["Student ID", "Full Name", "Course", "Year Level", "Gender"];
    const tableRows = filteredStudents.map((student) => [
        student.student_id,
        student.full_name,
        student.course,
        student.year_level,
        student.gender,
    ]);
    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 28,
    });
    doc.save("students.pdf");
  };
  const handleExportAllQrs = async () => { if (students.length === 0) { alert("No students to export."); return; } setIsExporting(true); const zip = new JSZip(); for (const student of students) { setQrToRender(student); await new Promise(resolve => setTimeout(resolve, 50)); if (hiddenQrRef.current) { try { const dataUrl = await toPng(hiddenQrRef.current, { cacheBust: true }); const blob = await (await fetch(dataUrl)).blob(); const safeFileName = student.full_name.replace(/[^a-z0-9]/gi, '_').toLowerCase(); zip.file(`${safeFileName}_${student.student_id}.png`, blob); } catch (err) { console.error(`Failed to generate QR for ${student.full_name}:`, err); } } } setQrToRender(null); zip.generateAsync({ type: 'blob' }).then((content) => { const link = document.createElement('a'); link.href = URL.createObjectURL(content); link.download = "all_student_qrcodes.zip"; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href); }); setIsExporting(false); };
  
  const isModalActive = modalState.type !== null;

  return (
    <>
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        {qrToRender && (
          <div ref={hiddenQrRef} className="bg-white p-6 rounded-lg text-center items-center">
            <QRCodeCanvas className="mx-auto flex justify-center" value={JSON.stringify({ student_id: qrToRender.student_id })} size={200} />
            <p className="font-bold text-lg mt-4 text-black">{qrToRender.full_name}</p>
            <p className="text-sm text-gray-600">{qrToRender.student_id}</p>
          </div>
        )}
      </div>

      <div className={`grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]`}>
        {/* Sidebar */}
        <div className="hidden border-r bg-white md:block dark:bg-gray-900 dark:border-gray-800">
            <SidebarContent onLogout={handleLogout} />
        </div>
        
        {/* Mobile Sidebar (and backdrop) */}
        <div
            className={`fixed inset-0 z-30 transition-opacity duration-300 md:hidden ${
                isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setSidebarOpen(false)}
        ></div>
        <div
            className={`fixed top-0 left-0 h-full w-[280px] border-r bg-white dark:bg-gray-900 dark:border-gray-800 z-40 transform transition-transform duration-300 ease-in-out md:hidden ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
            <SidebarContent onLogout={handleLogout} />
        </div>

        {/* Main Content */}
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-white px-4 lg:h-[60px] lg:px-6 dark:bg-gray-900/40 dark:border-gray-800">
            <button className="md:hidden" onClick={() => setSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <h1 className="text-lg font-semibold">Student List</h1>
          </header>

          <main className={`flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-gray-100/40 dark:bg-gray-800/40 transition-filter duration-300 ${isModalActive ? 'blur-sm' : ''}`}>
            {/* GI-AYO: Mas compact nga layout para sa Mobile */}
            <div className="flex flex-col gap-3 mb-2">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        id="search-id"
                        type="text"
                        placeholder="Search Name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-full text-sm"
                        suppressHydrationWarning
                    />
                </div>
                <div className="grid grid-cols-3 gap-2 w-full">
                    <Button onClick={handleExportAllQrs} disabled={isExporting} className="flex items-center justify-center gap-1.5 text-xs px-2">
                        <Archive size={16} />
                        <span className="hidden sm:inline">Export QRs</span>
                    </Button>
                    <Button onClick={handleExportPDF} className="flex items-center justify-center gap-1.5 text-xs px-2">
                        <Download size={16} />
                        <span className="hidden sm:inline">Export PDF</span>
                    </Button>
                    <Button variant="primary" className="flex items-center justify-center gap-1.5 text-xs px-2" onClick={() => setModalState({ type: 'add', student: null })}>
                        <UserPlus className="h-4 w-4" />
                        <span>+ Student</span>
                    </Button>
                </div>
            </div>
            
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md dark:bg-gray-900">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th scope="col" className="px-4 py-3">Full Name</th>
                      <th scope="col" className="px-4 py-3 hidden sm:table-cell">ID Number</th>
                      <th scope="col" className="px-4 py-3 hidden md:table-cell">Course</th>
                      <th scope="col" className="px-4 py-3 hidden lg:table-cell">Year</th>
                      <th scope="col" className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? ( <tr><td colSpan={5} className="text-center p-6">Loading...</td></tr>
                    ) : filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => (
                        <tr key={student.student_id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-4 font-medium whitespace-nowrap">
                            {student.full_name}
                            <div className="font-normal text-gray-500 sm:hidden">{student.student_id}</div>
                          </td>
                          <td className="px-4 py-4 hidden sm:table-cell">{student.student_id}</td>
                          <td className="px-4 py-4 hidden md:table-cell">{student.course}</td>
                          <td className="px-4 py-4 hidden lg:table-cell">{student.year_level}</td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex justify-center gap-1">
                              <button onClick={() => openQrModal(student)} className="p-2 text-gray-500 hover:text-black dark:hover:text-white"><QrCode size={16} /></button>
                              <button onClick={() => openEditModal(student)} className="p-2 text-blue-500 hover:text-blue-600"><Edit size={16} /></button>
                              <button onClick={() => openDeleteModal(student)} className="p-2 text-red-500 hover:text-red-600"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : ( <tr><td colSpan={5} className="text-center p-6 text-gray-500">{searchQuery ? 'No students match your search.' : 'No students found.'}</td></tr> )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>

        {/* Modals */}
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
                  <p className="text-sm text-gray-600">{modalState.student.student_id}</p>
                </div>
                <Button onClick={handleDownloadQr} className="w-auto flex items-center gap-2"><Download size={20} /> Download</Button>
              </div>
            </Modal>
            <Modal isOpen={modalState.type === 'delete'} onClose={closeModal} title="Confirm Deletion" size="sm">
              <div className="text-center">
                <p>Are you sure you want to delete <strong className="font-semibold">{modalState.student.full_name}</strong>?</p>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
                <div className="flex gap-4 mt-6">
                  <Button variant="secondary" className="w-full" onClick={closeModal}>Cancel</Button>
                  <Button variant="danger" className="w-full" onClick={handleDeleteStudent} disabled={loading}>{loading ? 'Deleting...' : 'Delete'}</Button>
                </div>
              </div>
            </Modal>
          </>
        )}
      </div>
    </>
  );
}
