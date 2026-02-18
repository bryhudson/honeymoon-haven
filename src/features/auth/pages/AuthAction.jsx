import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { auth } from '../../../lib/firebase';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { Loader2, CheckCircle, AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { validatePasswordReset, validateAuthActionParams } from '../../../lib/authValidation';

export function AuthAction() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const mode = searchParams.get('mode');
    const actionCode = searchParams.get('oobCode');

    // State
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Status
    const [isVerifying, setIsVerifying] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Initial Verification
    useEffect(() => {
        const paramError = validateAuthActionParams(mode, actionCode);
        if (paramError) {
            setError(paramError);
            setIsVerifying(false);
            return;
        }

        if (mode === 'resetPassword') {
            verifyPasswordResetCode(auth, actionCode)
                .then((email) => {
                    setEmail(email);
                    setIsVerifying(false);
                })
                .catch((err) => {
                    console.error("Action Code Error", err);
                    setError('This link has expired or has already been used.');
                    setIsVerifying(false);
                });
        } else {
            setError('Unsupported action mode.');
            setIsVerifying(false);
        }
    }, [actionCode, mode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationError = validatePasswordReset(newPassword, confirmPassword);
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await confirmPasswordReset(auth, actionCode, newPassword);
            setSuccess(true);
        } catch (err) {
            console.error("Reset Error", err);
            setError('Failed to reset password. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render: Loading / Verifying
    if (isVerifying) {
        return (
            <div className="min-h-screen bg-muted/5 flex items-center justify-center p-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                    <h2 className="text-xl font-bold text-slate-900">Verifying Link...</h2>
                </div>
            </div>
        );
    }

    // Render: Error State
    if (error) {
        return (
            <div className="min-h-screen bg-muted/5 flex items-center justify-center p-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Link Expired or Invalid</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center w-full py-3.5 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg text-xs"
                    >
                        Return to Login
                    </Link>
                </div>
            </div>
        );
    }

    // Render: Success State
    if (success) {
        return (
            <div className="min-h-screen bg-muted/5 flex items-center justify-center p-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Password Reset Complete</h2>
                    <p className="text-slate-600 mb-6">
                        Your password has been successfully updated. You can now sign in with your new credentials.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center w-full py-3.5 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg text-xs"
                    >
                        Sign In Now
                    </Link>
                </div>
            </div>
        );
    }

    // Render: Reset Form
    return (
        <div className="min-h-screen bg-muted/5 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Reset Password</h2>
                        <p className="text-slate-500 mt-2 text-sm">
                            Create a new password for <strong>{email}</strong>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    placeholder="••••••••"
                                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    placeholder="••••••••"
                                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 text-xs flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Set New Password'
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center mt-8 text-xs text-slate-400 uppercase tracking-widest font-semibold">
                    &copy; {new Date().getFullYear()} Honeymoon Haven Resort
                </p>
            </div>
        </div>
    );
}
