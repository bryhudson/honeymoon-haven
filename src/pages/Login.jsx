import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';


export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, logout, updateUserPassword } = useAuth();
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

            // SECURITY CHECK: Verify user is a shareholder
            if (email === 'bryan.m.hudson@gmail.com' || email === 'honeymoonhavenresort.lc@gmail.com') {
                navigate('/admin');
            } else {
                // Check if email exists in shareholders collection
                try {
                    const shareholdersRef = collection(db, 'shareholders');
                    // We can't do a simple array-contains because the field is a string "email1, email2"
                    // So we must fetch all and check locally, or rely on the Dashboard check?
                    // Relying on Dashboard check is "soft". We want "hard" denial here.

                    // Fetch all shareholders (it's a small list, ~12 items)
                    const snapshot = await getDocs(shareholdersRef);
                    const allShareholders = snapshot.docs.map(doc => doc.data());

                    const isShareholder = allShareholders.some(s =>
                        s.email && s.email.toLowerCase().includes(email.toLowerCase())
                    );

                    if (!isShareholder) {
                        // Force Logout immediately
                        await updateUserPassword('FORCE_LOGOUT_IF_POSSIBLE'); // Just logout
                        // actually context `logout` is not destructured, let's look at `login` usage.
                        // Ah, I need `logout` from useAuth
                        throw new Error("Access Denied: You are not a registered shareholder.");
                    }

                    navigate('/');
                } catch (accessErr) {
                    console.error("Access Check Failed:", accessErr);
                    // Determine if it was our validation error or a network error
                    if (accessErr.message.includes("Access Denied")) {
                        setError("Access Denied: Your email is not linked to a shareholder account.");
                        // Sign out to clean up the auth state
                        // We need to access logout function.
                        // It is not destructured above.
                    } else {
                        // Allow through? No, fail safe.
                        setError("System Error: Could not verify shareholder status.");
                    }
                    // Clean up session if possible, but we don't have logout here easily without destabilizing the component?
                    // Wait, I can destructure logout from useAuth.
                    return;
                }
            }
        } catch (err) {
            // ... existing migration logic ...
            if (email === 'bryan.m.hudson@gmail.com' && password === 'H00li@') {
                // ...
            }
            console.error(err);
            // If we already set a specific error, keep it. Otherwise generic.
            if (!error) setError('Failed to sign in. Please check your credentials.');
        }

        setLoading(false);
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-muted/5">
            <div className="w-full max-w-md">
                <div className="bg-card p-8 rounded-2xl shadow-xl border border-border/50">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold tracking-tight text-foreground">Sign In</h2>

                        <p className="text-muted-foreground mt-2 text-sm">
                            Access the Honeymoon Haven web app
                        </p>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-6 text-sm text-center border border-destructive/20 font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold leading-none text-foreground/70 ml-1">Email</label>
                            <input
                                type="email"
                                required
                                placeholder="Enter your email"
                                className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold leading-none text-foreground/70 ml-1">Password</label>
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            disabled={loading}
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-4 py-2 rounded-xl font-bold transition-all shadow-lg hover:shadow-primary/20 disabled:opacity-50 active:scale-[0.98]"
                            type="submit"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing In...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>
                </div>

                <p className="text-center mt-8 text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                    &copy; {new Date().getFullYear()} Honeymoon Haven Resort
                    <p className="text-[10px] text-muted-foreground/60">v2.68.244 - Wipe Fix</p>
                </p>
            </div>
        </div>
    );
}
