import { LogOut, Calendar, Home, Clock, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
// import emailjs from '@emailjs/browser'; // REMOVED
import { emailService } from '../services/emailService';
import { addHours } from 'date-fns';
import { db, functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, updateDoc, deleteDoc, doc, } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useBookingRealtime } from '../hooks/useBookingRealtime';
import { StatusCard } from '../components/dashboard/StatusCard';
import { RecentBookings } from '../components/dashboard/RecentBookings';
import { SeasonSchedule } from '../components/dashboard/SeasonSchedule';
import { BookingDetailsModal } from '../components/dashboard/BookingDetailsModal';
import { TrailerGuide } from '../components/dashboard/TrailerGuide';
import { CABIN_OWNERS } from '../lib/shareholders';
import { OnboardingTour } from '../components/OnboardingTour';
import { BookingSection } from '../components/BookingSection';

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
    const [isPassing, setIsPassing] = useState(false);
    const [showPreDraftModal, setShowPreDraftModal] = useState(false);
    const [passData, setPassData] = useState({ name: '' });

    // Quick Book State
    const [quickStart, setQuickStart] = useState('');
    const [quickEnd, setQuickEnd] = useState('');
    const [editingBooking, setEditingBooking] = useState(null);
    const [viewingBooking, setViewingBooking] = useState(null);
    const [showBookingForm, setShowBookingForm] = useState(false);

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
        showCancel: true
    });

    const triggerConfirm = (title, message, onConfirm, isDanger = false, confirmText = "Confirm") => {
        setConfirmation({
            isOpen: true,
            title,
            message,
            onConfirm,
            isDanger,
            confirmText,
            showCancel: true
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

                            await emailService.sendTurnStarted({
                                name: nextOwner.name,
                                email: "bryan.m.hudson@gmail.com" // OVERRIDE
                            }, {
                                name: nextOwner.name,
                                deadline_date: format(deadline, 'PPP'),
                                deadline_time: format(deadline, 'p'),
                                booking_url: "https://hhr-trailer-booking.web.app/",
                                dashboard_url: "https://hhr-trailer-booking.web.app/",
                                pass_turn_url: "https://hhr-trailer-booking.web.app/"
                            });
                            console.log("Notification sent to", nextOwner.name);
                        } catch (e) {
                            console.error("Next user email failed", e);
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

        try {
            // Check for existing draft to delete (replacing Draft with Pass)
            const draft = allDraftRecords.find(b => b.shareholderName === passData.name && b.isFinalized === false);
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
            setIsPassing(false);
            setPassData({ name: '' });
        } catch (err) {
            console.error(err);
            triggerAlert("Error", "Error passing turn: " + err.message);
        }
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
            `Are you sure you want to CANCEL your booking for ${format(booking.from?.toDate ? booking.from.toDate() : new Date(booking.from), 'MMM d')}? This will free up the dates for others.`,
            async () => {
                try {
                    // 1. Update Database (Priority)
                    await updateDoc(doc(db, "bookings", booking.id), {
                        type: 'cancelled',
                        cancelledAt: new Date(),
                        isFinalized: true, // Keep finalized so it's not a draft
                        isPaid: false
                    });

                    // 2. Send "Booking Cancelled" Email (Non-Blocking)
                    try {
                        const owner = shareholders.find(o => o.name === booking.shareholderName);
                        // If self-cancelled, email the user AND maybe admin? 
                        // Requirement says "Booking Cancelled (notification to user)".
                        const emailTo = owner?.email || "bryan.m.hudson@gmail.com";

                        // Helper for safe date formatting
                        const safeFormat = (dateObj) => {
                            try {
                                if (!dateObj) return "N/A";
                                if (dateObj.toDate) return format(dateObj.toDate(), 'MMM d, yyyy');
                                const d = new Date(dateObj);
                                return isNaN(d.getTime()) ? "N/A" : format(d, 'MMM d, yyyy');
                            } catch (e) {
                                return "N/A";
                            }
                        };

                        await emailService.sendBookingCancelled(emailTo, {
                            name: booking.shareholderName,
                            check_in: safeFormat(booking.from),
                            check_out: safeFormat(booking.to),
                            cabin_number: booking.cabinNumber,
                            cancelled_date: format(new Date(), 'PPP'),
                            dashboard_url: window.location.origin
                        });

                        triggerAlert("Success", "Booking cancelled. The status has been updated.");
                        setViewingBooking(null); // Close modal
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
            true, // Danger color
            "Cancel Booking"
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

            <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl md:text-4xl font-bold tracking-tight">Trailer Booking Dashboard</h1>
                {isSuperAdmin && (
                    <a href="#/admin" className="text-xs md:text-sm font-bold text-blue-600 hover:text-blue-800 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-md transition-colors">
                        Admin Dashboard
                    </a>
                )}
            </div>

            <div id="tour-status">
                <StatusCard status={status}>
                    {/* Only show controls if IT IS YOUR TURN OR ADMIN OR OPEN SEASON */}
                    <div id="tour-actions">
                        {(isSystemFrozen && !isSuperAdmin) ? (
                            <div className="text-sm text-amber-700 font-bold py-3 px-4 bg-amber-50 rounded-md text-center border border-amber-200">
                                ️ Maintenance in Progress
                            </div>
                        ) : (status.phase === 'OPEN_SEASON') ? (
                            <div className="flex flex-col gap-4 animate-in fade-in duration-700">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                                    <div className="p-2 bg-green-100 text-green-700 rounded-full">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-green-900">Open Season is Live!</h4>
                                        <p className="text-sm text-green-700 leading-tight">
                                            Booking is now first-come, first-served for all shareholders.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setIsBooking(true)}
                                        className="w-full md:w-auto inline-flex items-center justify-center rounded-md text-sm font-bold bg-green-600 text-white hover:bg-green-700 h-12 md:h-10 px-6 py-2 shadow-sm transition-all"
                                    >
                                        Book Dates
                                    </button>
                                </div>
                            </div>
                        ) : (loggedInShareholder !== status.activePicker && !isSuperAdmin) ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col gap-2 animate-in fade-in duration-700">
                                <div className="flex items-center gap-2 text-blue-800 font-bold">
                                    <Info className="w-5 h-5 text-blue-600" />
                                    Hi, {loggedInShareholder}
                                </div>
                                <p className="text-sm text-blue-700/80 leading-relaxed ml-7">
                                    {(() => {
                                        // 1. Determine Current Round Target
                                        let roundTarget = 1;
                                        if (status.phase === 'ROUND_2') roundTarget = 2;
                                        if (status.phase === 'OPEN_SEASON') roundTarget = 99;

                                        // 2. Count My Actions (Bookings or Passes)
                                        const myActions = allDraftRecords.filter(b =>
                                            b.shareholderName === loggedInShareholder &&
                                            (b.isFinalized || b.type === 'pass') &&
                                            b.type !== 'cancelled'
                                        );

                                        const myCount = myActions.length;
                                        const lastAction = myActions[myActions.length - 1];
                                        const isDoneForRound = myCount >= roundTarget;

                                        // 3. Render Message
                                        if (isDoneForRound) {
                                            if (lastAction?.type === 'pass') {
                                                return (
                                                    <span>
                                                        You have <span className="font-bold text-amber-600">passed</span> your turn for this round.
                                                        Sit tight!
                                                    </span>
                                                );
                                            }
                                            return (
                                                <span>
                                                    You have <span className="font-bold text-green-600">confirmed</span> your booking for this round.
                                                    Relax and enjoy!
                                                </span>
                                            );
                                        }

                                        // Default: Waiting
                                        return (
                                            <span>
                                                It is currently <span className="font-bold text-blue-900">{status.activePicker}'s</span> turn.
                                                We will send you an email notification as soon as it is your turn to pick.
                                            </span>
                                        );
                                    })()}
                                </p>
                            </div>
                        ) : activeUserDraft ? (
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => handleFinalize(activeUserDraft.id, status.activePicker)}
                                    className="inline-flex items-center justify-center rounded-md text-sm font-bold bg-green-600 text-white hover:bg-green-700 h-12 md:h-10 px-6 py-2 shadow-sm transition-all animate-pulse"
                                >
                                    Finalize Booking
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingBooking(activeUserDraft);
                                        setIsBooking(true);
                                    }}
                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-12 md:h-10 px-6 py-2 shadow-sm transition-all"
                                >
                                    Edit Booking
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => setIsBooking(true)}
                                    className="inline-flex items-center justify-center rounded-md text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-12 md:h-10 px-6 py-2 shadow-sm transition-all"
                                >
                                    Choose Your Dates
                                </button>
                                <button
                                    onClick={() => status.phase === 'PRE_DRAFT'
                                        ? setShowPreDraftModal(true)
                                        : (() => {
                                            setPassData({ name: status.activePicker });
                                            setIsPassing(true);
                                        })()
                                    }
                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-12 md:h-10 px-6 py-2 shadow-sm transition-all"
                                >
                                    Pass Turn
                                </button>
                            </div>
                        )}
                    </div>
                </StatusCard>
            </div>

            <div id="tour-recent">
                <RecentBookings
                    bookings={allDraftRecords}
                    onViewDetails={(booking) => setViewingBooking(booking)}
                    currentShareholder={loggedInShareholder}
                    isAdmin={isSuperAdmin}
                />
            </div>

            <div id="tour-schedule">
                <SeasonSchedule currentOrder={currentOrder} allDraftRecords={allDraftRecords} status={status} startDateOverride={startDateOverride} />
            </div>

            <div id="tour-guide" className="mt-8">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    🚐 Trailer Checklist and Guest Rules
                </h3>
                <TrailerGuide />
            </div>

            {/* Edit / Booking Modal Overlay */}
            {
                isBooking && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto pt-2 pb-2 md:pt-4 md:pb-4">
                        <div className="bg-background w-full max-w-5xl rounded-lg shadow-2xl overflow-hidden my-auto relative">
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
                                    onCancel={() => { setIsBooking(false); setEditingBooking(null); }}
                                    initialBooking={editingBooking}
                                    activePicker={status.phase === 'OPEN_SEASON' ? loggedInShareholder : status.activePicker}
                                    onPass={() => {
                                        setIsBooking(false);
                                        setPassData({ name: status.activePicker });
                                        setIsPassing(true);
                                    }}
                                    onDiscard={handleDiscard}
                                    onShowAlert={triggerAlert}
                                    onFinalize={async (id, name) => {
                                        await handleFinalize(id, name, true);
                                    }}
                                    startDateOverride={startDateOverride}
                                />
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Pass Turn Modal Overlay */}
            {
                isPassing && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-background border rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
                            <h2 className="text-2xl font-bold mb-2 text-destructive">Pass Your Turn</h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Are you sure you want to skip your turn in this round?
                                <br />
                                This will <strong>immediately</strong> open the booking window for the next shareholder.
                            </p>

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
                                        onClick={() => setIsPassing(false)}
                                        className="flex-1 h-10 px-4 py-2 bg-muted text-muted-foreground hover:bg-muted/80 rounded-md text-sm font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 h-10 px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md text-sm font-medium transition-colors"
                                    >
                                        Confirm Pass
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
                            setIsPassing(true);
                        }}
                        onEdit={() => {
                            setViewingBooking(null);
                            setEditingBooking(viewingBooking);
                            setIsBooking(true);
                        }}
                        onFinalize={() => {
                            handleFinalize(viewingBooking.id, viewingBooking.shareholderName);
                            setViewingBooking(null);
                        }}
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
                <p className="text-[10px] text-muted-foreground/60">v2.68.91 - Guest Rules UI</p>


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

