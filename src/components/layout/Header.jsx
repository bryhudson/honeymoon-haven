import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Caravan, LogOut, LayoutDashboard, User, MessageSquare, Sparkles } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { useBookingRealtime } from '../../hooks/useBookingRealtime';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { formatNameForDisplay } from '../../lib/shareholders';
import { ConfirmationModal } from '../ui/ConfirmationModal';

const FeedbackModal = lazy(() => import('../../features/feedback/components/FeedbackModal').then(m => ({ default: m.FeedbackModal })));
const TriviaModal = lazy(() => import('../../features/trivia/components/TriviaModal').then(m => ({ default: m.TriviaModal })));



export function Header() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isTriviaOpen, setIsTriviaOpen] = useState(false);
    const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);
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
        // Admin name resolved from Firestore role (no env var fallback)
        const adminMatch = shareholders.find(o => o.email && o.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim() && (o.role === 'admin' || o.role === 'super_admin'));
        if (adminMatch) return 'Admin';
        return null;
    }, [currentUser, shareholders]);

    // Admin check: Firestore role or env var fallback
    // Admin check: Firestore role only (no env var fallback)
    const isAdmin = React.useMemo(() => {
        if (!currentUser?.email) return false;
        const match = shareholders.find(o => o.email && o.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim());
        return !!(match && (match.role === 'admin' || match.role === 'super_admin'));
    }, [currentUser, shareholders]);

    // Fetch Active Picker for Masquerade (Admin Only)
    const { status } = useBookingRealtime();
    const masqueradeTarget = isAdmin ? status?.activePicker : null;

    const viewAsLink = masqueradeTarget
        ? `/?masquerade=${encodeURIComponent(masqueradeTarget)}`
        : '/';

    // Sign out handler with confirmation
    const handleSignOut = () => {
        setIsSignOutConfirmOpen(true);
    };

    const confirmSignOut = () => {
        logout().then(() => navigate('/login'));
    };

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    {/* Logo - touch target meets 44px via h-16 row + padding */}
                    <Link to="/" className="flex items-center gap-2 font-bold text-xl md:text-2xl tracking-tight text-slate-900 hover:opacity-80 transition-opacity min-h-[44px]">
                        <Caravan className="h-8 w-8 md:h-9 md:w-9 text-indigo-600 transition-colors duration-300" />
                        <span className="hidden md:inline">HHR - Trailer Booking</span>
                        <span className="md:hidden">HHR Booking</span>
                    </Link>

                    <div className="flex items-center gap-2 md:gap-3 text-sm font-medium">
                        {currentUser && !isLoginPage ? (
                            <>
                                {/* Admin Toggle (Admin/Shareholder view) */}
                                {isAdmin && (
                                    <div className="flex bg-slate-100 p-1 rounded-lg items-center gap-1">
                                        <Link
                                            to="/admin"
                                            className={`min-h-[36px] min-w-[36px] px-2 md:px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${location.pathname.startsWith('/admin')
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-900'
                                                }`}
                                            title="Admin Dashboard"
                                        >
                                            <LayoutDashboard className="w-4 h-4" />
                                            <span className="hidden md:inline">Admin</span>
                                        </Link>
                                        <Link
                                            to={viewAsLink}
                                            className={`min-h-[36px] min-w-[36px] px-2 md:px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${!location.pathname.startsWith('/admin')
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-900'
                                                }`}
                                            title="View as Shareholder"
                                        >
                                            <User className="w-4 h-4" />
                                            <span className="hidden lg:inline">Shareholder</span>
                                        </Link>
                                    </div>
                                )}

                                {/* Trivia Button - standalone, fun feature */}
                                <button
                                    onClick={() => setIsTriviaOpen(true)}
                                    className="group relative min-h-[44px] min-w-[44px] px-2 md:px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 overflow-hidden hover:shadow-md hover:scale-105 active:scale-95 bg-white border border-purple-100"
                                    title="Play HHR Trivia"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span className="relative flex items-center gap-1.5">
                                        <Caravan className="w-4 h-4 text-indigo-500 group-hover:animate-bounce-subtle" />
                                        <span className="hidden md:inline bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Trivia</span>
                                        <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:animate-spin-slow" />
                                    </span>
                                </button>

                                {/* Feedback Button */}
                                <button
                                    onClick={() => setIsFeedbackOpen(true)}
                                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-slate-100 active:bg-slate-200 active:scale-95 transition-all text-slate-500 hover:text-slate-700"
                                    title="Send Feedback"
                                >
                                    <MessageSquare className="w-5 h-5" />
                                </button>

                                {/* Sign Out Button */}
                                <button
                                    onClick={handleSignOut}
                                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-rose-50 active:bg-rose-100 active:scale-95 transition-all text-slate-400 hover:text-rose-600"
                                    title="Sign Out"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </>
                        ) : (
                            <Link to="/login" className="min-h-[44px] flex items-center px-4 hover:text-primary transition-colors font-semibold">
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* Sign Out Confirmation Modal */}
            <ConfirmationModal
                isOpen={isSignOutConfirmOpen}
                onClose={() => setIsSignOutConfirmOpen(false)}
                onConfirm={confirmSignOut}
                title="Sign Out?"
                message="Are you sure you want to sign out of your account?"
                confirmText="Sign Out"
                isDanger={true}
            />

            <Suspense fallback={null}>
                <FeedbackModal
                    isOpen={isFeedbackOpen}
                    onClose={() => setIsFeedbackOpen(false)}
                    shareholderName={loggedInShareholder}
                />
                <TriviaModal
                    isOpen={isTriviaOpen}
                    onClose={() => setIsTriviaOpen(false)}
                />
            </Suspense>
        </>
    );
}
