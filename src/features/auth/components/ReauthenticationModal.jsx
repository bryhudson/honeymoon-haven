import React, { useState } from 'react';
import { BaseModal } from '../../../components/ui/BaseModal';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Lock, AlertTriangle } from 'lucide-react';

export function ReauthenticationModal({ isOpen, onClose, onConfirm, title, message }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
            setError("Not authenticated. Please sign in again.");
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
                setError(err.message || `Authentication failed (${err.code}).`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={title || "Security Check"}
            showClose={!isLoading}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex gap-4">
                    <div className="p-3 bg-indigo-50 rounded-full h-fit">
                        <Lock className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="space-y-2 flex-1">
                        <p className="text-sm text-slate-600 leading-relaxed">
                            {message || "Please enter your password to confirm this action."}
                        </p>

                        <div className="pt-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                Current Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                                placeholder="••••••••"
                                autoFocus
                                required
                            />
                            {error && (
                                <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded-md flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                    <p className="text-xs text-red-600 font-medium">
                                        {error}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 transition-colors disabled:opacity-50 text-xs"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || !password}
                        className="flex-1 py-3.5 rounded-2xl font-black uppercase tracking-widest text-white shadow-lg transition-all bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
                    >
                        {isLoading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Verifying...
                            </>
                        ) : "Confirm Action"}
                    </button>
                </div>
            </form>
        </BaseModal>
    );
}
