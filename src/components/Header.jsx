import React from 'react';
import { Tent, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CABIN_OWNERS } from '../lib/shareholders';

export function Header() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    // Resolve logged in share holder name from email
    const loggedInShareholder = React.useMemo(() => {
        if (!currentUser?.email) return null;
        const owner = CABIN_OWNERS.find(o => o.email && o.email.includes(currentUser.email));
        return owner ? owner.name : null;
    }, [currentUser]);

    const isSuperAdmin = currentUser?.email === 'bryan.m.hudson@gmail.com';

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary hover:opacity-80 transition-opacity">
                    <Tent className="h-6 w-6" />
                    <span className="hidden md:inline">Honeymoon Haven Resort</span>
                    <span className="md:hidden">HHR</span>
                </Link>

                <div className="flex items-center gap-4 text-sm font-medium">
                    {currentUser ? (
                        <>
                            <div className="flex flex-col items-end md:flex-row md:items-center md:gap-2">
                                <span className="text-muted-foreground">
                                    {loggedInShareholder ? `Welcome, ${loggedInShareholder}` : currentUser.email}
                                </span>
                                {isSuperAdmin && (
                                    <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-bold">
                                        ADMIN
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => logout().then(() => navigate('/login'))}
                                className="flex items-center gap-2 hover:text-primary transition-colors"
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
