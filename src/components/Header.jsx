import React from 'react';
import { Tent, LogOut } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CABIN_OWNERS } from '../lib/shareholders';

export function Header() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation(); // Hook to check current path

    const isLoginPage = location.pathname === '/login';

    // Resolve logged in share holder name from email
    const loggedInShareholder = React.useMemo(() => {
        if (!currentUser?.email) return null;
        if (currentUser.email === 'bryan.m.hudson@gmail.com') return 'Bryan';
        const owner = CABIN_OWNERS.find(o => o.email && o.email.includes(currentUser.email));
        return owner ? owner.name : null;
    }, [currentUser]);

    // Hardcoded Admin Check (for now)
    const isAdmin = currentUser?.email === 'bryan.m.hudson@gmail.com' || currentUser?.email === 'honeymoonhavenresort.lc@gmail.com';

    return (
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
                                    {loggedInShareholder ? `Welcome, ${loggedInShareholder}` : currentUser.email}
                                </span>

                                {isAdmin && (
                                    <Link
                                        to="/admin"
                                        className="bg-slate-900 text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1"
                                    >
                                        Admin Dashboard
                                    </Link>
                                )}
                            </div>
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
    );
}
