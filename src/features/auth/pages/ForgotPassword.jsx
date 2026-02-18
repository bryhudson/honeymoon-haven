import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { mapForgotPasswordError } from '../../../lib/authValidation';

export function ForgotPassword() {
    const [email, setEmail] = useState('');
    const { resetPassword } = useAuth();
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            await resetPassword(email);
            setMessage('Check your email for instructions to reset your password.');
        } catch (err) {
            console.error(err);
            setError(mapForgotPasswordError(err.code));
        }

        setLoading(false);
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-muted/5 min-h-screen">
            <div className="w-full max-w-md">
                <div className="bg-card p-8 rounded-2xl shadow-xl border border-border/50">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold tracking-tight text-foreground">Reset Password</h2>
                        <p className="text-muted-foreground mt-2 text-sm">
                            Enter your email to receive reset instructions
                        </p>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-6 text-sm text-center border border-destructive/20 font-medium animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="bg-emerald-500/10 text-emerald-600 p-4 rounded-lg mb-6 text-sm text-center border border-emerald-500/20 font-medium flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <CheckCircle className="w-6 h-6" />
                            {message}
                        </div>
                    )}

                    {!message && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold leading-none text-foreground/70 ml-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                    <input
                                        type="email"
                                        required
                                        placeholder="Enter your email"
                                        className="flex h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                disabled={loading}
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-4 py-2 rounded-xl font-bold transition-all shadow-lg hover:shadow-primary/20 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
                                type="submit"
                            >
                                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                                {loading ? 'Sending...' : 'Reset Password'}
                            </button>
                        </form>
                    )}

                    <div className="mt-8 text-center">
                        <Link to="/login" className="text-sm font-medium text-primary hover:text-primary/80 flex items-center justify-center gap-2 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Sign In
                        </Link>
                    </div>
                </div>

                <p className="text-center mt-8 text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                    &copy; {new Date().getFullYear()} Honeymoon Haven Resort
                </p>
            </div>
        </div>
    );
}
