import React, { useState, useEffect } from 'react';
import { Caravan, LogOut, LayoutDashboard, User, MessageSquare, Gamepad2 } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { useBookingRealtime } from '../../hooks/useBookingRealtime';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { FeedbackModal } from '../../features/feedback/components/FeedbackModal';
import { ChangePasswordModal } from '../../features/dashboard/components/ChangePasswordModal';
import { formatNameForDisplay } from '../../lib/shareholders';

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '').toLowerCase().split(',').map(e => e.trim()).filter(Boolean);

export function Header() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation(); // Hook to check current path
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [shareholders, setShareholders] = useState([]);

    const isLoginPage = location.pathname === '/login';

    // Fetch shareholders from Firestore (to get email-to-name mapping)
    useEffect(() => {
        async function fetchShareholders() {
            try {
                const snapshot = await getDocs(collection(db, "shareholders"));
                const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setShareholders(data);
            } catch (err) {
                console.error("Header: Failed to fetch shareholders:", err);
            }
        }
        if (currentUser) {
            fetchShareholders();
        }
    }, [currentUser]);

    // Resolve logged in shareholder name from email
    const loggedInShareholder = React.useMemo(() => {
        if (!currentUser?.email) return null;
        const owner = shareholders.find(o => o.email && o.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim());
        if (owner) return formatNameForDisplay(owner.name);
        // Fallback for admin accounts not in shareholders list
        if (ADMIN_EMAILS.includes(currentUser.email.toLowerCase())) return 'Admin';
        return null;
    }, [currentUser, shareholders]);

    // Admin check: Firestore role or env var fallback
    const isAdmin = React.useMemo(() => {
        if (!currentUser?.email) return false;
        const match = shareholders.find(o => o.email && o.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim());
        if (match && (match.role === 'admin' || match.role === 'super_admin')) return true;
        return ADMIN_EMAILS.includes(currentUser.email.toLowerCase());
    }, [currentUser, shareholders]);

    // Fetch Active Picker for Masquerade (Admin Only) using the robust hook
    // Note: This adds a listener to bookings/settings even on non-dashboard pages, 
    // but ensures the link is accurate.
    const { status } = useBookingRealtime();
    const masqueradeTarget = isAdmin ? status?.activePicker : null;

    const viewAsLink = masqueradeTarget
        ? `/?masquerade=${encodeURIComponent(masqueradeTarget)}`
        : '/';

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary hover:opacity-80 transition-opacity">
                        <Caravan className="h-8 w-8" />
                        <span className="hidden md:inline">HHR - Trailer Booking App</span>
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
                                                className={`p-2 md:px-3 md:py-1 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${location.pathname.startsWith('/admin')
                                                    ? 'bg-white text-slate-900 shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-900'
                                                    }`}
                                                title="Admin Dashboard"
                                            >
                                                <LayoutDashboard className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                                <span className="hidden md:inline">Admin</span>
                                            </Link>
                                            <Link
                                                to={viewAsLink}
                                                className={`p-2 md:px-3 md:py-1 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${!location.pathname.startsWith('/admin')
                                                    ? 'bg-white text-slate-900 shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-900'
                                                    }`}
                                                title="View as Shareholder"
                                            >
                                                <User className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                                <span className="hidden md:inline">View as Shareholder</span>
                                            </Link>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 bg-purple-50 p-1 rounded-lg ml-2">
                                        <Link
                                            to="/trivia"
                                            className={`p-2 md:px-3 md:py-1 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${location.pathname === '/trivia'
                                                ? 'bg-white text-purple-700 shadow-sm'
                                                : 'text-purple-600 hover:text-purple-900 hover:bg-purple-100'
                                                }`}
                                            title="Play Trivia"
                                        >
                                            <Gamepad2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                            <span className="hidden md:inline">Trivia</span>
                                        </Link>
                                    </div>
                                </div>
                                <div className="hidden lg:flex items-center gap-2 ml-4">
                                    <button
                                        onClick={() => setIsChangePasswordOpen(true)}
                                        className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                                        title="Change Password"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                        <span className="hidden xl:inline">Change Password</span>
                                    </button>
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
            <ChangePasswordModal
                isOpen={isChangePasswordOpen}
                onClose={() => setIsChangePasswordOpen(false)}
            />
        </>
    );
}
