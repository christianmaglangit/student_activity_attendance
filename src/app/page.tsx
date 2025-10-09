'use client';

import React, { useState } from 'react';
import Link from 'next/link'; // Import Link if you need it elsewhere, though it's not used in the Header anymore
import { UserCheck, X, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// --- UI Components (Button, Input, Modal) ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'secondary';}
const Button: React.FC<ButtonProps> = ({ children, className, variant = 'primary', ...props }) => { const baseStyles = 'w-full text-center px-6 py-2.5 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-transform transform hover:scale-105 whitespace-nowrap'; const variantStyles = { primary: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500', secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600', }; return ( <button className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props} suppressHydrationWarning> {children} </button> ); };
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; }
const Input: React.FC<InputProps> = ({ label, id, ...props }) => { return ( <div> <label htmlFor={id} className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"> {label} </label> <input id={id} className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" {...props} suppressHydrationWarning /> </div> ); };
interface ModalProps { isOpen: boolean; onClose: () => void; children: React.ReactNode; }
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => { if (!isOpen) return null; return ( <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"> <div className="relative w-full max-w-sm p-8 m-4 bg-gray-100 rounded-xl shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}> <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"> <X size={24} /> </button> {children} </div> </div> ); };

// --- Authentication Modals (Login & Sign Up) ---

interface LoginModalProps { isOpen: boolean; onClose: () => void; onSwitchToSignUp: () => void; }
const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSwitchToSignUp }) => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
      setLoading(false);
    } else {
      // GI-AYO: Gamiton ang router.refresh() para i-trigger ang middleware
      onClose(); // Isira ang modal
      router.refresh(); // I-refresh ang page, ang middleware na bahala mo-redirect
    }
  };

  return ( <Modal isOpen={isOpen} onClose={onClose}> <div className="text-center"> <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back!</h2> <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Sign in to continue.</p> </div> <form onSubmit={handleLogin} className="mt-8 space-y-6"> <Input label="Email Address" id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /> <Input label="Password" id="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /> <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</Button> </form> {message && <p className={`mt-4 text-center text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>} <p className="mt-6 text-sm text-center text-gray-600 dark:text-gray-400"> No account?{' '} <button onClick={onSwitchToSignUp} className="font-semibold text-green-600 hover:underline dark:text-green-400">Sign Up</button> </p> </Modal> );
};

interface SignUpModalProps { isOpen: boolean; onClose: () => void; onSwitchToLogin: () => void; }
const SignUpModal: React.FC<SignUpModalProps> = ({ isOpen, onClose, onSwitchToLogin }) => {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [collegeDep, setCollegeDep] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage("Error: Passwords do not match!");
      return;
    }
    setLoading(true);
    setMessage('');

    const { data: { user }, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) {
      setMessage(`Error signing up: ${authError.message}`);
      setLoading(false);
      return;
    }
    if (!user) {
        setMessage('Sign up failed. Please try again.');
        setLoading(false);
        return;
    }

    const { error: insertError } = await supabase.from('users').insert({ id: user.id, name: fullName, email: email, collegedep: collegeDep });

    if (insertError) {
      setMessage(`Account created but failed to save profile: ${insertError.message}`);
      setLoading(false);
    } else {
      // GI-AYO: Gamiton sad ang router.refresh() human maka-sign up ug auto-login
      onClose();
      router.refresh();
    }
  };

  return ( <Modal isOpen={isOpen} onClose={onClose}> <div className="text-center"> <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create an Account</h2> <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Get started by creating your new account.</p> </div> <form onSubmit={handleSignUp} className="mt-8 space-y-6"> <Input label="Full Name" id="signup-name" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} /> <Input label="Email Address" id="signup-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /> <Input label="College/Department" id="signup-collegedep" type="text" value={collegeDep} onChange={(e) => setCollegeDep(e.target.value)} /> <div className="flex flex-col sm:flex-row gap-4"> <Input label="Password" id="signup-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /> <Input label="Confirm Password" id="signup-confirm-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /> </div> <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating Account...' : 'Create Account'}</Button> </form> {message && <p className={`mt-4 text-center text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>} <p className="mt-6 text-sm text-center text-gray-600 dark:text-gray-400"> Have an account?{' '} <button onClick={onSwitchToLogin} className="font-semibold text-green-600 hover:underline dark:text-green-400">Login</button> </p> </Modal> );
};

// --- Layout Components (Header & Footer) ---
interface HeaderProps { onLoginClick: () => void; onSignUpClick: () => void; isMenuOpen: boolean; toggleMenu: () => void; }
const Header: React.FC<HeaderProps> = ({ onLoginClick, onSignUpClick, isMenuOpen, toggleMenu }) => { return ( <header className="sticky top-0 z-20 w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm"> <div className="container mx-auto"> <nav className="flex justify-between items-center p-4"> <div className="flex items-center gap-2 sm:gap-3"> <UserCheck className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" /> <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white"> Student Activity Attendance </h1> </div> <div className="hidden md:flex items-center gap-2 sm:gap-4"> <Button variant="secondary" onClick={onLoginClick} className="w-auto">Login</Button> <Button variant="primary" onClick={onSignUpClick} className="w-auto">Sign Up</Button> </div> <div className="md:hidden"> <button onClick={toggleMenu}> {isMenuOpen ? <X size={28} /> : <Menu size={28} />} </button> </div> </nav> <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'} p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700`}> <div className="flex flex-col gap-4"> <Button variant="secondary" onClick={() => { onLoginClick(); toggleMenu(); }}>Login</Button> <Button variant="primary" onClick={() => { onSignUpClick(); toggleMenu(); }}>Sign Up</Button> </div> </div> </div> </header> ); };
const Footer: React.FC = () => { return ( <footer className="py-6 bg-white dark:bg-gray-800"> <div className="container mx-auto text-center px-4"> <p className="text-sm text-gray-600 dark:text-gray-400"> Developed by: <strong>Christian B. Maglangit</strong> </p> </div> </footer> ); };


// --- Main Page Component ---
export default function HomePage() {
  const [isLoginOpen, setLoginOpen] = useState(false);
  const [isSignUpOpen, setSignUpOpen] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(!isMenuOpen);
  const openLogin = () => { setSignUpOpen(false); setLoginOpen(true); };
  const openSignUp = () => { setLoginOpen(false); setSignUpOpen(true); };

  return ( 
    <div className="bg-gray-200 dark:bg-gray-900 min-h-screen"> 
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${isLoginOpen || isSignUpOpen ? 'blur-sm' : ''}`}> 
        <Header onLoginClick={openLogin} onSignUpClick={openSignUp} isMenuOpen={isMenuOpen} toggleMenu={toggleMenu} /> 
        <main className="flex-grow container mx-auto px-4 text-center flex flex-col items-center justify-center bg-gray-200"> 
          <div className="max-w-3xl py-16"> 
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white"> 
              The Smart Way to Track{' '} <span className="text-green-600 dark:text-green-400"> Student Activity </span> 
            </h2> 
            <p className="mt-6 text-base md:text-lg text-gray-600 dark:text-gray-300"> 
              Simplify attendance tracking, reduce administrative tasks, and gain valuable insights with our seamless, modern platform. 
            </p> 
            <div className="mt-10"> 
              <p className="text-sm text-gray-500"> 
                Click &quot;Sign Up&quot; or &quot;Login&quot; in the header to get started. 
              </p> 
            </div> 
          </div> 
        </main> 
        <Footer /> 
      </div> 
      <LoginModal isOpen={isLoginOpen} onClose={() => setLoginOpen(false)} onSwitchToSignUp={openSignUp} /> 
      <SignUpModal isOpen={isSignUpOpen} onClose={() => setSignUpOpen(false)} onSwitchToLogin={openLogin} /> 
    </div> 
  );
}