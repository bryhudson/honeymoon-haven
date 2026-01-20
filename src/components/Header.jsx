import React, { useState } from 'react';
import { Tent, LogOut, LayoutDashboard, User, MessageSquare } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CABIN_OWNERS } from '../lib/shareholders';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { FeedbackModal } from './FeedbackModal';

export function Header() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation(); // Hook to check current path
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    const isLoginPage = location.pathname === '/login';

    // Resolve logged in share holder name from email
    const loggedInShareholder = React.useMemo(() => {
        if (!currentUser?.email) return null;
        if (currentUser.email === 'bryan.m.hudson@gmail.com') return 'Bryan';
        if (currentUser.email === 'honeymoonhavenresort.lc@gmail.com') return 'HHR Admin';
        const owner = CABIN_OWNERS.find(o => o.email && o.email.includes(currentUser.email));
        return owner ? owner.name : null;
    }, [currentUser]);

    // Hardcoded Admin Check (for now)
    const isAdmin = currentUser?.email === 'bryan.m.hudson@gmail.com' || currentUser?.email === 'honeymoonhavenresort.lc@gmail.com';

    // Fetch Active Picker for Masquerade (Admin Only)
    const [masqueradeTarget, setMasqueradeTarget] = useState(null);

    React.useEffect(() => {
        if (!isAdmin) return;

        // Listen to draft status to find active picker
        const unsub = onSnapshot(doc(db, "status", "draftStatus"), (doc) => {
            if (doc.exists() && doc.data().activePicker) {
                setMasqueradeTarget(doc.data().activePicker);
            } else {
                setMasqueradeTarget(null);
            }
        });
        return () => unsub();
    }, [isAdmin]);

    const viewAsLink = masqueradeTarget
        ? `/?masquerade=${encodeURIComponent(masqueradeTarget)}`
        : '/';

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary hover:opacity-80 transition-opacity">
                        <Tent className="h-8 w-8" />
                        <span className="hidden md:inline">Honeymoon Haven Resort - Trailer Booking App</span>
                        <span className="md:hidden">HHR Booking</span>
                    </Link>

                    <div className="flex items-center gap-4 text-sm font-medium">
                        {/* Hide "Welcome" and "Sign Out" if on Login page or not logged in */}
                        {currentUser && !isLoginPage ? (
                            <>
                                <div className="flex flex-col items-end md:flex-row md:items-center md:gap-4">
                                    <span className="text-muted-foreground hidden sm:inline">
                                        {loggedInShareholder ? `Hi, ${loggedInShareholder}` : currentUser.email}
                                    </span>

                                    {isAdmin && (
                                        <div className="flex bg-slate-100 p-1 rounded-lg items-center gap-1">
                                            <Link
                                                to="/admin"
                                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${location.pathname.startsWith('/admin')
                                                    ? 'bg-white text-slate-900 shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-900'
                                                    }`}
                                            >
                                                <LayoutDashboard className="w-3.5 h-3.5" />
                                                Admin
                                            </Link>
                                            <Link
                                                to={viewAsLink}
                                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${!location.pathname.startsWith('/admin')
                                                    ? 'bg-white text-slate-900 shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-900'
                                                    }`}
                                            >
                                                <User className="w-3.5 h-3.5" />
                                                View as Shareholder
                                            </Link>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsFeedbackOpen(true)}
                                    className="flex items-center gap-2 hover:text-primary transition-colors ml-4 text-muted-foreground hover:text-blue-600"
                                    title="Report Bug / Send Feedback"
                                >
                                    <MessageSquare className="h-4 w-4" />
                                    <span className="hidden lg:inline">Feedback</span>
                                </button>
                                <button
                                    onClick={() => logout().then(() => navigate('/login'))}
                                    className="flex items-center gap-2 hover:text-primary transition-colors ml-2"
                                    title="Sign Out"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span className="hidden md:inline">Sign Out</span>
                                </button>
                            </>
                        ) : (
                            <Link to="/login" className="hover:text-primary transition-colors">
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            </header>
            <FeedbackModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
                shareholderName={loggedInShareholder}
            />
        </>
    );
}
