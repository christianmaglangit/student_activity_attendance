'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, Eye, EyeOff } from 'lucide-react';


const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
    <button className="w-full text-center px-6 py-2.5 font-semibold rounded-lg shadow-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50" {...props}>
        {children}
    </button>
);


interface PasswordConfirmationModalProps {
    onConfirm: (password: string) => Promise<void>;
    onClose: () => void;
    loading: boolean;
    error: string | null;
}

export const PasswordConfirmationModal: React.FC<PasswordConfirmationModalProps> = ({ onConfirm, onClose, loading, error }) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); 
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password) {
            onConfirm(password);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-sm bg-gray-100 rounded-xl shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X size={24} />
                </button>
                
                <div className="p-8 text-center">
                    <ShieldCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Verification Required</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        To access this page, please enter your security password.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
                    <div className="relative">
                        <input
                            id="password-confirm"
                            type={showPassword ? 'text' : 'password'} 
                            placeholder="Enter your password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2.5 pr-10 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                        />
                        <button
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <Button type="submit" disabled={loading || !password}>
                        {loading ? 'Verifying...' : 'Confirm'}
                    </Button>
                </form>
            </div>
        </div>
    );
};