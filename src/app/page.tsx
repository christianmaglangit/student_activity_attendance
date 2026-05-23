'use client';

import React, { useState, useEffect } from 'react';
import { UserCheck, X, Menu, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'; 
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// --- BUTTON COMPONENT ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ children, className, variant = 'primary', ...props }) => {
  const baseStyles = 'w-full text-center px-6 py-2.5 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-transform transform hover:scale-105 whitespace-nowrap';
  const variantStyles = {
    primary: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600',
  };
  return (
    <button className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props} suppressHydrationWarning>
      {children}
    </button>
  );
};

// --- INPUT COMPONENT ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const Input: React.FC<InputProps> = ({ label, id, type, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div>
      <label htmlFor={id} className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          className={`w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${isPassword ? 'pr-10' : ''}`}
          {...props}
          suppressHydrationWarning
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
    </div>
  );
};

// --- MODAL COMPONENT ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm p-8 m-4 bg-gray-100 rounded-xl shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X size={24} />
        </button>
        {children}
      </div>
    </div>
  );
};

// --- SECURE LOGIN MODAL ---
interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage("Invalid login credentials."); // Vague error prevents email enumeration
        setLoading(false);
        return;
      }

      if (user) {
        // 1. CHECK USERS (ADMIN) TABLE FIRST
        const { data: adminData } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (adminData) {
          onClose();
          router.replace('/dashboard');
          return;
        }

        // 2. CHECK STUDENTS TABLE
        const { data: studentData } = await supabase
          .from('students')
          .select('student_id') 
          .eq('user_id', user.id)
          .maybeSingle(); 

        if (studentData) {
          onClose();
          router.replace('/studentDashboard'); 
          return;
        }

        // 3. FALLBACK: Force logout if no profile
        await supabase.auth.signOut();
        setMessage("Access Denied: Unregistered account.");
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      setMessage('System error. Please try again later.');
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Secure Login</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Authorized personnel only.</p>
      </div>
      <form onSubmit={handleLogin} className="mt-8 space-y-6">
        <Input label="Email Address" id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" id="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Authenticating...' : 'Login'}
        </Button>
      </form>
      {message && (
        <div className="mt-4 flex items-center justify-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm font-medium">
            <AlertCircle size={16} />
            {message}
        </div>
      )}
    </Modal>
  );
};

// --- HEADER ---
interface HeaderProps {
  onLoginClick: () => void;
  isMenuOpen: boolean;
  toggleMenu: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLoginClick, isMenuOpen, toggleMenu }) => {
  return (
    <header className="sticky top-0 z-20 w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="container mx-auto">
        <nav className="flex justify-between items-center p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <UserCheck className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" />
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">
              Attendance Portal
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-2 sm:gap-4">
            <Button variant="secondary" onClick={onLoginClick} className="w-auto">Login</Button>
          </div>
          <div className="md:hidden">
            <button onClick={toggleMenu} aria-label="Toggle menu">
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </nav>
        {isMenuOpen && (
          <div className="md:hidden p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col gap-4">
              <Button variant="secondary" onClick={() => { onLoginClick(); toggleMenu(); }}>Login</Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

// --- FOOTER ---
const Footer: React.FC = () => {
  return (
    <footer className="py-6 bg-white dark:bg-gray-800">
      <div className="container mx-auto text-center px-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Developed by: <strong>Christian B. Maglangit</strong>
        </p>
      </div>
    </footer>
  );
};

// --- HOME PAGE MAIN ---
export default function HomePage() {
  const [isLoginOpen, setLoginOpen] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  
  // SESSION CHECK STATE
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const router = useRouter();

  const toggleMenu = () => setMenuOpen(!isMenuOpen);
  const openLogin = () => setLoginOpen(true);
  const closeModals = () => setLoginOpen(false);

  // --- STRICT WATERFALL SESSION CHECK ---
  useEffect(() => {
    const checkSession = async () => {
        setIsCheckingSession(true);
        
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Check Admin first
            const { data: adminData } = await supabase
                .from('users')
                .select('id')
                .eq('id', user.id)
                .maybeSingle();

            if (adminData) {
                router.replace('/dashboard');
                return;
            }

            // Check Students
            const { data: studentData } = await supabase
                .from('students')
                .select('student_id')
                .eq('user_id', user.id)
                .maybeSingle(); 

            if (studentData) {
                router.replace('/studentDashboard');
                return;
            }

            // Fallback: User logged in but has no profile
            await supabase.auth.signOut();
            setIsCheckingSession(false);

        } else {
            setIsCheckingSession(false);
        }
    };

    checkSession();
  }, [router]);

  // If checking, show a loader
  if (isCheckingSession) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-gray-200 dark:bg-gray-900">
              <Loader2 className="h-10 w-10 text-green-600 animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-300 font-medium">Verifying Secure Session...</p>
          </div>
      );
  }

  return (
    <div className="bg-gray-200 dark:bg-gray-900 min-h-screen">
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${isLoginOpen ? 'blur-sm' : ''}`}>
        <Header
          onLoginClick={openLogin}
          isMenuOpen={isMenuOpen}
          toggleMenu={toggleMenu}
        />
        <main className="flex-grow container mx-auto px-4 text-center flex flex-col items-center justify-center bg-gray-200 dark:bg-gray-400">
          <div className="max-w-3xl py-16">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-black">
              The Smart Way to Track{' '}
              <span className="text-green-600 dark:text-green-400">Activity Attendance</span>
            </h2>
            <p className="mt-6 text-base md:text-lg text-gray-600 dark:text-gray-800">
              Simplify attendance tracking, reduce administrative tasks, and gain valuable insights with our seamless, modern platform.
            </p>
            <div className="mt-10">
              <p className="text-sm text-gray-500 font-semibold">
                Authorized Personnel Only. Click "Login" to access the portal.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>

      <LoginModal isOpen={isLoginOpen} onClose={closeModals} />
    </div>
  );
}