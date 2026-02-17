import React, { useState } from 'react';
import { BaseModal } from '../../../components/ui/BaseModal';
import { User, Mail, Lock, Shield, Loader2 } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../lib/firebase';

export function CreateUserModal({ isOpen, onClose, onSuccess, initialRole = 'shareholder' }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState(initialRole);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setRole(initialRole);
        }
    }, [isOpen, initialRole]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const createAccount = httpsCallable(functions, 'createAccount');
            await createAccount({ email, password, name, role });
            onSuccess();
            onClose();
            setEmail('');
            setPassword('');
            setName('');
            setRole('shareholder');
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to create user.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New User"
            description="Provision a new system account"
            maxSize="max-w-md"
            showClose={!loading}
        >
            <div className="space-y-6">
                {error && (
                    <div className="p-4 bg-rose-50 text-rose-600 text-xs font-bold rounded-2xl border border-rose-100 animate-in fade-in slide-in-from-top-2 duration-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-4">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                <User className="w-3 h-3" /> Full Name
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                placeholder="John Doe"
                                disabled={loading}
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                <Mail className="w-3 h-3" /> Email Address
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                placeholder="john@example.com"
                                disabled={loading}
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                <Lock className="w-3 h-3" /> Password
                            </label>
                            <input
                                type="text"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                placeholder="Temporary Password"
                                disabled={loading}
                            />
                        </div>

                        {/* Role Selection */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                <Shield className="w-3 h-3" /> System Role
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setRole('shareholder')}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${role === 'shareholder'
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                        }`}
                                >
                                    Shareholder
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('admin')}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${role === 'admin'
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                        }`}
                                >
                                    Admin
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-700 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3.5 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create User"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </BaseModal>
    );
}
