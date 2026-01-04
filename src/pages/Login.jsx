import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useBookingRealtime } from '../hooks/useBookingRealtime';
import { StatusCard } from '../components/dashboard/StatusCard';
import { RecentBookings } from '../components/dashboard/RecentBookings';
import { SeasonSchedule } from '../components/dashboard/SeasonSchedule';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, updateUserPassword } = useAuth();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Public View Hook
    const { allDraftRecords, loading: dataLoading, status, currentOrder } = useBookingRealtime();

    function handleSubmit(e) {
        // ... (existing submit logic) ...
        e.preventDefault();
        setError('');
        setLoading(true);

        // Wrap async logic in IIFE or just call it, but here we just need to keep original logic
        // For brevity in replacement, I will invoke the original async logic here inline or similar. 
        // Wait, replace_file_content requires me to provide the FULL content for the matched block.
        // I will re-implement the handleSubmit logic exactly as it was, but inside the new layout.

        const performLogin = async () => {
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
                if (email === 'bryan.m.hudson@gmail.com' && password === 'H00li@') {
                    try {
                        console.log("Migration: Attempting legacy login to update password...");
                        await login(email, 'cabin8');

                        console.log("Migration: Legacy login success. Updating password...");
                        await updateUserPassword('H00li@');
                        console.log("Migration: Password updated.");

                        navigate('/admin');
                        return;
                    } catch (migrationErr) {
                        console.error("Migration failed", migrationErr);
                    }
                }

                console.error(err);
                setError('Failed to sign in. Please check your credentials.');
            }
            setLoading(false);
        };
        performLogin();
    }


    return (
        <div className="min-h-screen bg-muted/30">
            <div className="container mx-auto px-4 py-8">

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Login Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-card p-8 rounded-xl shadow-lg border w-full sticky top-8">
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

                            <div className="mt-6 text-center text-sm text-muted-foreground">
                                <p>Sign in to book your turn or pass.</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Public Status Board */}
                    <div className="lg:col-span-2 space-y-8 opacity-90">
                        <div className="flex items-center justify-between">
                            <h1 className="text-3xl font-bold tracking-tight">Status Board</h1>
                            <span className="text-sm text-muted-foreground bg-background px-3 py-1 rounded-full border shadow-sm">
                                Live View (Read Only)
                            </span>
                        </div>

                        <StatusCard status={status}>
                            {/* No Actions for Public View */}
                        </StatusCard>

                        <RecentBookings bookings={allDraftRecords} />

                        <SeasonSchedule currentOrder={currentOrder} allDraftRecords={allDraftRecords} status={status} />
                    </div>
                </div>
            </div>
        </div>
    );
}
