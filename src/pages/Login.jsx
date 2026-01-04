import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, updateUserPassword } = useAuth();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Priority 1: Try Logging in with current input
            await login(email, password);
            if (email === 'bryan.m.hudson@gmail.com') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (err) {
            // Priority 2: Auto-Migration for Admin
            // If user typed the DESIRED new password ('H00li@'), but login failed...
            // It might be because the server still has 'cabin8'.
            if (email === 'bryan.m.hudson@gmail.com' && password === 'H00li@') {
                try {
                    console.log("Migration: Attempting legacy login to update password...");
                    await login(email, 'cabin8'); // Try legacy password

                    // If successful, update to the NEW password
                    console.log("Migration: Legacy login success. Updating password...");
                    await updateUserPassword('H00li@');
                    console.log("Migration: Password updated.");

                    navigate('/admin');
                    return;
                } catch (migrationErr) {
                    console.error("Migration failed", migrationErr);
                    // Fall through to original error if migration fails
                }
            }

            console.error(err);
            setError('Failed to sign in. Please check your credentials.');
        }

        setLoading(false);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30">
            <div className="bg-card p-8 rounded-xl shadow-lg border w-full max-w-md">
                <h2 className="text-2xl font-bold text-center mb-6">Shareholder Login</h2>

                {error && (
                    <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Email</label>
                        <input
                            type="email"
                            required
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Password</label>
                        <input
                            type="password"
                            required
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        disabled={loading}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
                        type="submit"
                    >
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>
            </div>

        </div>
    );
}
