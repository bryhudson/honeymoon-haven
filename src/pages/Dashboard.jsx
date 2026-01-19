import { LogOut, Calendar, Home, Clock, AlertTriangle, CheckCircle, XCircle, Info, BookOpen, User } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
// import emailjs from '@emailjs/browser'; // REMOVED
import { emailService } from '../services/emailService';
import { addHours } from 'date-fns';
import { db, functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useBookingRealtime } from '../hooks/useBookingRealtime';
import { StatusCard } from '../components/dashboard/StatusCard';
import { RecentBookings } from '../components/dashboard/RecentBookings';
import { SeasonSchedule } from '../components/dashboard/SeasonSchedule';
import { CABIN_OWNERS } from '../lib/shareholders';
import { BookingDetailsModal } from '../components/dashboard/BookingDetailsModal';
import { TrailerGuide } from '../components/dashboard/TrailerGuide';
import { ShareholderHero } from '../components/dashboard/ShareholderHero';
import { BookingSection } from '../components/BookingSection';
import { OnboardingTour } from '../components/OnboardingTour';
import { EmailGuestModal } from '../components/dashboard/EmailGuestModal';
import { ShareholderCalendarView } from '../components/dashboard/ShareholderCalendarView';

// Basic Error Boundary
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong.</h1>
                    <p className="font-mono text-sm bg-gray-100 p-4 rounded text-left overflow-auto">
                        {this.state.error && this.state.error.toString()}
                    </p>
                    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

// Status Cards and Countdowns moved to components

// Status Cards and Countdowns moved to components

export function Dashboard() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const [shareholders, setShareholders] = useState(CABIN_OWNERS);

    // Fetch dynamic shareholders
    useEffect(() => {
        const fetchShareholders = async () => {
            try {
                const snapshot = await getDocs(collection(db, "shareholders"));
                if (!snapshot.empty) {
                    const list = snapshot.docs.map(d => d.data());
                    setShareholders(list);
                }
            } catch (err) {
                console.error("Failed to fetch shareholders:", err);
            }
        };
        fetchShareholders();
    }, []);

    // Resolve logged in share holder name from email
    // Handle multiple emails in one string (comma separated)
    const loggedInShareholder = React.useMemo(() => {
        if (!currentUser?.email) return null;
        if (currentUser.email === 'bryan.m.hudson@gmail.com') return 'Bryan';
        // Use dynamic list
        const owner = shareholders.find(o => o.email && o.email.includes(currentUser.email));
        return owner ? owner.name : null;
    }, [currentUser, shareholders]);

    const isSuperAdmin = currentUser?.email === 'bryan.m.hudson@gmail.com';

    // Using Custom Hook for Realtime Data
    const { allDraftRecords, loading, status, currentOrder, startDateOverride, isSystemFrozen } = useBookingRealtime();

    const [isBooking, setIsBooking] = useState(false);
    const [passStep, setPassStep] = useState(0); // 0=Closed, 1=Init, 2=Warn
    const [showPreDraftModal, setShowPreDraftModal] = useState(false);
    const [passData, setPassData] = useState({ name: '' });

    // Quick Book State
    const [quickStart, setQuickStart] = useState('');
    const [quickEnd, setQuickEnd] = useState('');
    const [editingBooking, setEditingBooking] = useState(null);
    const [viewingBooking, setViewingBooking] = useState(null);
    const [emailingBooking, setEmailingBooking] = useState(null);
    const [showBookingForm, setShowBookingForm] = useState(false);

    // UI Layout State
    const [activeTab, setActiveTab] = useState('bookings'); // bookings, schedule, guide

    // SYSTEM SAFETY: Build v2.30
    // Force Regular Users to Production Mode always
    useEffect(() => {
        if (!loading && currentUser && !isSuperAdmin) {
            const currentMode = localStorage.getItem('DRAFT_MODE');
            if (currentMode === 'TEST') {
                console.log("Security: Forcing Production Mode for non-admin");
                localStorage.removeItem('DRAFT_MODE');
                window.location.reload();
            }
        }
    }, [currentUser, isSuperAdmin, loading]);

    // Reset Booking Form visibility when turn changes
    useEffect(() => {
        setShowBookingForm(false);
    }, [status.activePicker]);

    // Global Confirmation State
    const [confirmation, setConfirmation] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { },
        isDanger: false,
        confirmText: "Confirm",
        showCancel: true,
        requireTyping: null,
        closeOnConfirm: true
    });

    const triggerConfirm = (title, message, onConfirm, isDanger = false, confirmText = "Confirm", requireTyping = null, closeOnConfirm = true) => {
        setConfirmation({
            isOpen: true,
            title,
            message,
            onConfirm,
            isDanger,
            confirmText,
            showCancel: true,
            requireTyping,
            closeOnConfirm
        });
    };

    const triggerAlert = (title, message) => {
        setConfirmation({
            isOpen: true,
            title,
            message,
            onConfirm: () => { }, // No-op
            isDanger: false,
            confirmText: "OK",
            showCancel: false
        });
    };


    const handleDiscard = async (bookingId) => {
        triggerConfirm(
            "Cancel Booking?",
            "Are you sure you want to delete this draft? This action cannot be undone and you will need to re-select your dates if you change your mind.",
            async () => {
                // Send Cancellation Email
                try {
                    const bookingData = allDraftRecords.find(b => b.id === bookingId);
                    if (bookingData) {
                        const shareholderName = bookingData.shareholderName || "Unknown";
                        // Notify Admin? Or User? The original code notified Admin (to_name: Admin). 
                        // The user requirements say "Booking Cancelled Notification (Current)".
                        // We will notify the USER.
                        await emailService.sendBookingCancelled({
                            name: shareholderName,
                            email: "bryan.m.hudson@gmail.com" // OVERRIDE
                        }, {
                            name: shareholderName,
                            check_in: format(bookingData.from, 'MMM d'),
                            check_out: format(bookingData.to, 'MMM d'),
                            cabin_number: bookingData.cabinNumber || "?",
                            cancelled_date: format(new Date(), 'PPP'),
                            within_turn_window: false, // Assuming draft discard is manual
                            dashboard_url: "https://hhr-trailer-booking.web.app/"
                        });
                    }
                } catch (e) {
                    console.error("Cancellation email failed", e);
                }

                await deleteDoc(doc(db, "bookings", bookingId));
                setEditingBooking(null);
                setIsBooking(false);
            },
            true, // Danger
            "Delete Draft"
        );
    };

    // ...

    const handleFinalize = async (bookingId, name, skipConfirm = false) => {
        const executeFinalize = async () => {
            try {
                await updateDoc(doc(db, "bookings", bookingId), {
                    isFinalized: true,
                    createdAt: new Date() // Reset clock to now
                });

                // 1. Notify CURRENT user (Confirmation) - HANDLED IN BookingSection.jsx NOW.
                // Removing duplicate email call.

                // Notify NEXT shareholder
                if (status.nextPicker) {
                    const nextOwner = shareholders.find(o => o.name === status.nextPicker);
                    if (nextOwner && nextOwner.email) {
                        try {
                            // Logic: Next Day 10 AM + 48 Hours
                            const tomorrow10am = new Date();
                            tomorrow10am.setDate(tomorrow10am.getDate() + 1);
                            tomorrow10am.setHours(10, 0, 0, 0);

                            const deadline = addHours(tomorrow10am, 48);

                            // NON-BLOCKING EMAIL
                            emailService.sendTurnStarted({
                                name: nextOwner.name,
                                email: "bryan.m.hudson@gmail.com" // OVERRIDE
                            }, {
                                name: nextOwner.name,
                                deadline_date: format(deadline, 'PPP'),
                                deadline_time: format(deadline, 'p'),
                                booking_url: "https://hhr-trailer-booking.web.app/",
                                dashboard_url: "https://hhr-trailer-booking.web.app/",
                                pass_turn_url: "https://hhr-trailer-booking.web.app/"
                            }).then(() => console.log("Notification sent to", nextOwner.name))
                                .catch(e => console.error("Next user email failed", e));

                        } catch (e) {
                            console.error("Next user email setup failed", e);
                        }
                    }
                }

                if (!skipConfirm) {
                    triggerAlert("Booking Finalized", "Thank you! Your turn is complete and the next shareholder has been notified.");
                }
            } catch (err) {
                console.error(err);
                if (!skipConfirm) {
                    triggerAlert("Error", "Error finalizing turn: " + err.message);
                } else {
                    throw err; // Re-throw for BookingSection to handle if needed
                }
            }
        };

        if (skipConfirm) {
            await executeFinalize();
        } else {
            triggerConfirm(
                "Finalize Booking",
                `Click 'Finalize Booking' to finalize your booking. This will lock in your dates and officially move the turn to the next shareholder.\n\nNote: To complete your booking, please send an e-transfer to honeymoonhavenresort.lc@gmail.com within 48 hours.`,
                executeFinalize,
                false,
                "Finalize Booking"
            );
        }
    };

    const handlePassSubmit = async (e) => {
        e.preventDefault();
        if (!passData.name) return triggerAlert("Selection Missing", "Please select your name.");

        // Step 1 -> Step 2
        if (passStep === 1) {
            setPassStep(2);
            return;
        }

        // Step 2 -> Step 3 (Global Final Confirm)
        triggerConfirm(
            "Final Confirmation: Pass Turn",
            `Are you absolutely sure you want to pass your turn?\n\nThis action is irreversible and the schedule will immediately move to the next shareholder. You cannot undo this.`,
            async () => {
                // IMMEDIATE UX FIX: Close the underlying "Are You Sure" modal so it doesn't reappear
                setPassStep(0);

                try {
                    // Check for existing draft to delete (replacing Draft with Pass)
                    const draft = bookings.find(b => b.shareholderName === passData.name && b.isFinalized === false);
                    if (draft) {
                        await deleteDoc(doc(db, "bookings", draft.id));
                    }

                    const owner = shareholders.find(o => o.name === passData.name);
                    await addDoc(collection(db, "bookings"), {
                        shareholderName: passData.name,
                        cabinNumber: owner ? owner.cabin : "?",
                        type: 'pass', // This is important
                        createdAt: new Date(),
                        from: new Date(),
                        to: new Date()
                    });

                    // 1. Notify CURRENT user (Pass Confirmation)
                    try {
                        const owner = shareholders.find(o => o.name === passData.name);
                        await emailService.sendTurnPassedCurrent({
                            name: passData.name,
                            email: "bryan.m.hudson@gmail.com" // OVERRIDE
                        }, {
                            name: passData.name,
                            dashboard_url: "https://hhr-trailer-booking.web.app/"
                        });
                    } catch (e) {
                        console.error("Pass email failed", e);
                    }

                    // Notify NEXT shareholder
                    if (status.nextPicker) {
                        const nextOwner = shareholders.find(o => o.name === status.nextPicker);
                        if (nextOwner && nextOwner.email) {
                            try {
                                // Logic: Next Day 10 AM + 48 Hours
                                // "Account for the 10 next day early access start period"
                                const tomorrow10am = new Date();
                                tomorrow10am.setDate(tomorrow10am.getDate() + 1);
                                tomorrow10am.setHours(10, 0, 0, 0);

                                const deadline = addHours(tomorrow10am, 48);

                                await emailService.sendTurnPassedNext({
                                    name: nextOwner.name,
                                    email: "bryan.m.hudson@gmail.com" // OVERRIDE
                                }, {
                                    name: nextOwner.name,
                                    previous_shareholder: passData.name,
                                    deadline_date: format(deadline, 'PPP'),
                                    deadline_time: format(deadline, 'p'),
                                    booking_url: "https://hhr-trailer-booking.web.app/",
                                    dashboard_url: "https://hhr-trailer-booking.web.app/"
                                });
                                console.log("Notification sent to", nextOwner.name);
                            } catch (e) {
                                console.error("Next user email failed", e);
                            }
                        }
                    }

                    triggerAlert("Turn Passed", "You have successfully passed your turn. The booking window is now open for the next shareholder.");
                    setPassData({ name: '' });
                } catch (err) {
                    console.error(err);
                    triggerAlert("Error", "Error passing turn: " + err.message);
                }
            },
            true, // Danger
            "Confirm Pass (Cannot Undo)",
            "pass" // Require typing
        );
    };

    const handleQuickBook = async () => {
        if (!quickStart || !quickEnd) return triggerAlert("Missing Information", "Please select both a start date and an end date for your booking.");

        const start = new Date(quickStart);
        const end = new Date(quickEnd);

        // Basic Validation
        if (end <= start) return triggerAlert("Date Range Issue", "The end date must be after the start date. Please check your selection.");

        // Duration Check (7 days max)
        const days = (end - start) / (1000 * 60 * 60 * 24);
        if (days > 7) return triggerAlert("Booking Limit Exceeded", "To ensure everyone has a fair chance, bookings are limited to a maximum of 7 days during the draft.");

        // Overlap Check
        const isOverlap = allDraftRecords.some(b => {
            if (b.type === 'pass') return false;
            const bStart = b.from?.toDate ? b.from.toDate() : new Date(b.from);
            const bEnd = b.to?.toDate ? b.to.toDate() : new Date(b.to);
            return (start < bEnd && end > bStart);
        });

        if (isOverlap) return triggerAlert("Date Conflict", "The dates you've selected overlap with an existing booking. Please choose a different range.");

        triggerConfirm(
            "Confirm Selection",
            `Create draft for ${format(start, 'MMM d')} - ${format(end, 'MMM d')}?\n\nYou will be able to review and finalize this selection on the next screen.`,
            async () => {
                try {
                    const owner = shareholders.find(o => o.name === status.activePicker);
                    await addDoc(collection(db, "bookings"), {
                        shareholderName: status.activePicker,
                        cabinNumber: owner ? owner.cabin : "?",
                        from: start,
                        to: end,
                        guests: 1, // Default
                        email: owner ? owner.email : "",
                        partyName: status.activePicker,
                        createdAt: new Date(),
                        isFinalized: false // Creating as Draft
                    });

                    // Email Removed for Quick Draft

                    triggerAlert("Draft Saved", "Your selection has been saved as a draft. To complete your turn, please click the green 'Finalize Booking' button on the dashboard.");
                    setQuickStart('');
                    setQuickEnd('');
                } catch (err) {
                    console.error(err);
                    triggerAlert("Error", "Error creating booking: " + err.message);
                }
            },
            false,
            "Create Draft"
        );
    };


    // --- EMAIL GUEST LOGIC ---
    const handleEmailGuest = (booking) => {
        setViewingBooking(null); // Close Details Modal
        setEmailingBooking(booking); // Open Email Modal
    };

    // Auto-populate Pass Form Removed - Handled in Button Click to prevent glitch
    // useEffect(() => { ... }, [isPassing, status.activePicker]);

    const activeUserDraft = allDraftRecords.find(b =>
        b.shareholderName === status.activePicker &&
        b.isFinalized === false &&
        b.type !== 'cancelled' // Fix: Ignore cancelled bookings
    );

    const handleCancelConfirmedBooking = (booking) => {
        triggerConfirm(
            "Cancel Booking?",
            `Are you sure you want to CANCEL your booking for ${format(booking.from?.toDate ? booking.from.toDate() : new Date(booking.from), 'MMM d')}?`,
            async () => {
                // Double Confirmation
                triggerConfirm(
                    "Final Confirmation: Cancel Booking",
                    "This is your final confirmation. Cancelling this booking will open these dates to other shareholders and cannot be undone via this dashboard.\n\nProceed?",
                    async () => {
                        try {
                            // 1. Update Database (Priority)
                            await updateDoc(doc(db, "bookings", booking.id), {
                                type: 'cancelled',
                                cancelledAt: new Date(),
                                isFinalized: true, // Keep finalized so it's not a draft
                                isPaid: false
                            });

                            // 2. Send "Booking Cancelled" Email
                            try {
                                const owner = shareholders.find(o => o.name === booking.shareholderName);
                                const emailTo = owner?.email || "bryan.m.hudson@gmail.com";
                                const isTargetingAdminFallback = !owner?.email;

                                console.log(`Sending cancellation email to: ${emailTo} (Shareholder: ${booking.shareholderName})`);

                                // Safe helper for dates
                                const safeFormat = (dateObj) => {
                                    try {
                                        if (!dateObj) return "N/A";
                                        if (dateObj.toDate) return format(dateObj.toDate(), 'MMM d, yyyy');
                                        const d = new Date(dateObj);
                                        return isNaN(d.getTime()) ? "N/A" : format(d, 'MMM d, yyyy');
                                    } catch (e) { return "N/A"; }
                                };

                                // Determine if this cancellation affects the active turn
                                const isActiveTurn = status?.activePicker === booking.shareholderName;

                                await emailService.sendBookingCancelled(emailTo, {
                                    name: booking.shareholderName,
                                    check_in: safeFormat(booking.from),
                                    check_out: safeFormat(booking.to),
                                    cabin_number: booking.cabinNumber || "?",
                                    cancelled_date: format(new Date(), 'PPP'),
                                    dashboard_url: window.location.origin,
                                    within_turn_window: isActiveTurn,
                                    next_shareholder: status?.nextPicker || "the next shareholder"
                                });

                                // If we fell back to admin (because owner email missing), log warning
                                if (isTargetingAdminFallback) {
                                    console.warn(`WARNING: Could not find email for shareholder '${booking.shareholderName}'. Defaulted to Admin.`);
                                }

                                triggerAlert("Success", "Booking cancelled. A confirmation email has been sent.");
                                setViewingBooking(null);
                            } catch (emailErr) {
                                console.error("Email failed:", emailErr);
                                triggerAlert("Warning", "Booking cancelled, but failed to send email notification.");
                                setViewingBooking(null);
                            }
                        } catch (err) {
                            console.error("Cancellation Critical Error:", err);
                            triggerAlert("Error", "Failed to cancel booking: " + err.message);
                        }
                    },

                    true, // isDanger
                    "Cancel Booking" // confirmText
                );
            },
            true, // Danger color
            "Cancel Booking",
            "cancel", // Require typing
            false // Do NOT auto-close (wait for second confirmation)
        );
    };

    return (
        <div className="flex flex-col gap-5 py-4 md:py-6 container mx-auto px-4 relative">
            {/* Tour Guide */}
            <OnboardingTour currentUser={currentUser} />

            {isSystemFrozen && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r shadow-sm animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-amber-900 text-lg">Maintenance Mode</h3>
                            <p className="text-sm text-amber-800/80 font-medium">
                                We are currently performing system updates. Booking actions are temporarily paused.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- NEW HEADER: Shareholder Hero --- */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-sm font-bold tracking-tight text-slate-400 uppercase">Shareholder Dashboard</h1>
                {isSuperAdmin && (
                    <a href="#/admin" className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-md transition-colors">
                        Switch to Admin
                    </a>
                )}
            </div>

            <ShareholderHero
                currentUser={currentUser}
                status={status}
                shareholderName={loggedInShareholder}
                drafts={allDraftRecords}
                onOpenBooking={() => setIsBooking(true)}
                onFinalize={handleFinalize}
                onPass={() => {
                    if (status.phase === 'PRE_DRAFT') {
                        setShowPreDraftModal(true);
                    } else {
                        setPassData({ name: status.activePicker });
                        setPassStep(1);
                    }
                }}
                isSystemFrozen={isSystemFrozen}
                isSuperAdmin={isSuperAdmin}
                onViewDetails={setViewingBooking}
                currentOrder={currentOrder}
                onEmail={(booking) => setEmailingBooking(booking)}
                onViewSchedule={() => setActiveTab('schedule')}
            />

            {/* --- TAB NAVIGATION --- */}
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border mt-6">
                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'bookings' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        <User className="w-4 h-4" />
                        Recent Bookings
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'calendar' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        <Calendar className="w-4 h-4" />
                        Calendar View
                    </button>
                    <button
                        onClick={() => setActiveTab('schedule')}
                        className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'schedule' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        <Clock className="w-4 h-4" />
                        2026 Season Schedule
                    </button>
                    <button
                        onClick={() => setActiveTab('guide')}
                        className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'guide' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        <BookOpen className="w-4 h-4" />
                        Trailer Guide & Rules
                    </button>
                </div>
            </div>

            {/* --- TAB CONTENT --- */}
            <div className="min-h-[400px] mt-6">

                {/* 1. MY BOOKINGS */}
                {activeTab === 'bookings' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <RecentBookings
                            bookings={allDraftRecords}
                            onViewDetails={(booking) => setViewingBooking(booking)}
                            currentShareholder={loggedInShareholder}
                            isAdmin={isSuperAdmin}
                            activePicker={status.activePicker}
                        />
                        {/* Fallback for empty state logic inside RecentBookings? If not, we could add here */}
                    </div>
                )}

                {/* 2. SEASON SCHEDULE */}
                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <ShareholderCalendarView bookings={allDraftRecords} />
                    </div>
                )}

                {/* 3. SEASON SCHEDULE (Renumbered) */}
                {activeTab === 'schedule' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <SeasonSchedule
                            currentOrder={currentOrder}
                            allDraftRecords={allDraftRecords}
                            status={status}
                            startDateOverride={startDateOverride}
                        />
                    </div>
                )}

                {/* 3. TRAILER GUIDE */}
                {activeTab === 'guide' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <TrailerGuide
                            shareholderName={loggedInShareholder}
                            booking={(() => {
                                if (!loggedInShareholder || !allDraftRecords) return null;
                                const now = new Date();
                                const myBookings = allDraftRecords
                                    .filter(b =>
                                        b.shareholderName === loggedInShareholder &&
                                        b.isFinalized &&
                                        b.type !== 'cancelled' &&
                                        (b.from?.toDate ? b.from.toDate() : new Date(b.from)) >= now
                                    )
                                    .sort((a, b) => {
                                        const dateA = a.from?.toDate ? a.from.toDate() : new Date(a.from);
                                        const dateB = b.from?.toDate ? b.from.toDate() : new Date(b.from);
                                        return dateA - dateB;
                                    });
                                return myBookings[0] || null;
                            })()}
                        />
                    </div>
                )}

            </div>

            {/* Edit / Booking Modal Overlay */}
            {
                isBooking && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto pt-2 pb-2 md:pt-4 md:pb-4">
                        <div className="bg-background w-full max-w-lg rounded-lg shadow-2xl overflow-hidden my-auto relative">
                            <div className="p-3 border-b flex justify-between items-center bg-muted/20">
                                <h2 className="text-base font-semibold">
                                    {editingBooking ? "Edit Booking" : "New Booking"}
                                </h2>
                                <button
                                    onClick={() => { setIsBooking(false); setEditingBooking(null); }}
                                    className="text-muted-foreground hover:text-foreground p-2 text-sm"
                                >
                                    ✕ Close
                                </button>
                            </div>
                            <div className="p-2 md:p-4 max-h-[90vh] overflow-y-auto">
                                <BookingSection
                                    key={editingBooking ? editingBooking.id : 'new'}
                                    onCancel={() => { setIsBooking(false); setEditingBooking(null); }}
                                    initialBooking={editingBooking}
                                    activePicker={status.phase === 'OPEN_SEASON' ? loggedInShareholder : status.activePicker}
                                    onPass={() => {
                                        setIsBooking(false);
                                        setPassData({ name: status.activePicker });
                                        setPassStep(1);
                                    }}
                                    onDiscard={handleDiscard}
                                    onShowAlert={triggerAlert}
                                    onFinalize={async (id, name) => {
                                        await handleFinalize(id, name, true);
                                    }}
                                    bookings={allDraftRecords}
                                    startDateOverride={startDateOverride}
                                />
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Pass Turn Modal Overlay */}
            {
                passStep > 0 && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-background border rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
                            <h2 className={`text-2xl font-bold mb-2 ${passStep === 2 ? 'text-destructive' : 'text-foreground'}`}>
                                {passStep === 1 ? "Pass Your Turn?" : "Are You Sure?"}
                            </h2>
                            <div className="text-sm text-muted-foreground mb-6">
                                {passStep === 1 ? (
                                    <p>Do you want to skip your turn in this round? You can choose to pass now if you're not ready.</p>
                                ) : (
                                    <p className="font-medium text-destructive/80">
                                        Warning: This will <strong>immediately end your turn</strong> and notify the next shareholder.
                                        <br /><br />
                                        You cannot undo this action.
                                    </p>
                                )}
                            </div>

                            <form onSubmit={handlePassSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Shareholder Passing Turn</label>
                                    <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm font-semibold text-foreground items-center">
                                        {passData.name || "Loading..."}
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPassStep(0)}
                                        className="flex-1 h-10 px-4 py-2 bg-muted text-muted-foreground hover:bg-muted/80 rounded-md text-sm font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={`flex-1 h-10 px-4 py-2 rounded-md text-sm font-medium transition-colors ${passStep === 2
                                            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                                            }`}
                                    >
                                        {passStep === 1 ? "Continue" : "Proceed to Final Confirm"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }


            {/* Booking Details Modal Overlay */}
            {
                viewingBooking && (
                    <BookingDetailsModal
                        booking={viewingBooking}
                        onClose={() => setViewingBooking(null)}
                        currentUser={loggedInShareholder}
                        isAdmin={isSuperAdmin}
                        onCancel={() => handleCancelConfirmedBooking(viewingBooking)}
                        onPass={() => {
                            setViewingBooking(null);
                            setPassData({ name: viewingBooking.shareholderName });
                            setPassStep(1);
                        }}
                        onEdit={() => {
                            setViewingBooking(null);
                            setEditingBooking(viewingBooking);
                            setIsBooking(true);
                        }}
                        onFinalize={() => {
                            handleFinalize(viewingBooking.id, viewingBooking.shareholderName);
                        }}
                        onEmail={() => handleEmailGuest(viewingBooking)}

                    />
                )
            }

            {/* Email Guest Modal */}
            {
                emailingBooking && (
                    <EmailGuestModal
                        booking={emailingBooking}
                        currentUser={loggedInShareholder}
                        onClose={() => setEmailingBooking(null)}
                    />
                )
            }

            {/* Global Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmation.isOpen}
                onClose={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmation.onConfirm}
                title={confirmation.title}
                message={confirmation.message}
                isDanger={confirmation.isDanger}
                confirmText={confirmation.confirmText}
                showCancel={confirmation.showCancel}
                requireTyping={confirmation.requireTyping}
                closeOnConfirm={confirmation.closeOnConfirm}
            />

            {/* Pre-Draft Modal */}
            {
                showPreDraftModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-background border rounded-lg shadow-lg max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
                            <div className="flex items-center gap-3 text-amber-600">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <h3 className="font-bold text-lg">Booking Not Started</h3>
                            </div>
                            <p className="text-muted-foreground">
                                Booking and passing actions are disabled until the schedule officially begins.
                            </p>
                            <div className="bg-muted p-3 rounded-md text-sm font-medium text-center">
                                Opens: {format(status.draftStart, 'PPP p')}
                            </div>
                            <button
                                onClick={() => setShowPreDraftModal(false)}
                                className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                            >
                                Understood
                            </button>
                        </div>
                    </div>
                )
            }

            <div className="mt-12 pt-8 border-t text-center space-y-2">
                <p className="text-xs text-muted-foreground mb-1">&copy; 2026 Honeymoon Haven Resort</p>
                <p className="text-[10px] text-muted-foreground/60">v2.68.172 - Wipe Fix</p>


            </div>
        </div >
    );
}

export default function DashboardWrapper() {
    return (
        <ErrorBoundary>
            <Dashboard />
        </ErrorBoundary>
    );
}

