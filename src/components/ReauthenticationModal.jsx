import React, { useState } from 'react';
import { getAuth, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { AlertTriangle, Lock } from 'lucide-react';

export function ReauthenticationModal({ isOpen, onClose, onConfirm, title, message }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const auth = getAuth();
        const user = auth.currentUser;

        if (!user || user.email !== "bryan.m.hudson@gmail.com") {
            setError("Unauthorized user.");
            setIsLoading(false);
            return;
        }

        const credential = EmailAuthProvider.credential(user.email, password);

        try {
            await reauthenticateWithCredential(user, credential);
            await onConfirm(); // Execute the protected action
            onClose(); // Close modal on success
            setPassword(''); // Clear password
        } catch (err) {
            console.error("Reauth Error:", err);
            if (err.code === 'auth/wrong-password') {
                setError("Incorrect password.");
            } else if (err.code === 'auth/user-mismatch' || err.code === 'auth/user-token-expired') {
                setError("Session expired. Please log out and back in.");
            } else {
                setError(`Authentication failed (${err.code}). Please try again.`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                        <Lock className="w-5 h-5 text-slate-500" />
                        {title || "Security Check"}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex gap-4">
                        <div className="p-3 bg-amber-50 rounded-full h-fit">
                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="space-y-2 flex-1">
                            <p className="text-sm text-slate-600 leading-relaxed">
                                {message || "Please enter your password to confirm this action."}
                            </p>

                            <div className="pt-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    placeholder="Enter password..."
                                    autoFocus
                                    required
                                />
                                {error && (
                                    <p className="text-xs text-red-600 mt-2 font-medium animate-in slide-in-from-top-1">
                                        {error}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !password}
                            className="px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading ? "Verifying..." : "Confirm Action"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
