import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CABIN_OWNERS, DRAFT_CONFIG, getShareholderOrder, mapOrderToSchedule } from '../lib/shareholders';
import { emailService } from '../services/emailService';
import { db } from '../lib/firebase';
import { collection, getDocs, writeBatch, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, addDoc } from 'firebase/firestore';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { format, differenceInDays, set } from 'date-fns';
import { Trash2, PlayCircle, Clock, Bell, Calendar, Settings, AlertTriangle, CheckCircle, DollarSign, Pencil, XCircle } from 'lucide-react';
import { EditBookingModal } from '../components/EditBookingModal';
import { ReauthenticationModal } from '../components/ReauthenticationModal';

export function AdminDashboard() {
    const [actionLog, setActionLog] = useState("");
    const [allBookings, setAllBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    // Auth Modal State
    const [authModal, setAuthModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: async () => { }
    });

    // Modal State
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
        setConfirmation({ isOpen: true, title, message, onConfirm, isDanger, confirmText, showCancel: true });
    };

    const triggerAlert = (title, message) => {
        setConfirmation({ isOpen: true, title, message, onConfirm: () => { }, isDanger: false, confirmText: "OK", showCancel: false });
    };

    // Helper for safely converting Firestore timestamps/strings to Dates
    const safeDate = (val) => {
        if (!val) return null;
        if (val.toDate) return val.toDate(); // Firestore Timestamp
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    };

    // Simulation State
    const [simStartDate, setSimStartDate] = useState("");
    const [currentSimDate, setCurrentSimDate] = useState(null);

    // Editing State
    const [editingBooking, setEditingBooking] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Fetch Settings & Bookings
    useEffect(() => {
        // 1. Settings
        const unsubSettings = onSnapshot(doc(db, "settings", "general"), (doc) => {
            if (doc.exists() && doc.data().draftStartDate) {
                const d = doc.data().draftStartDate.toDate();
                setCurrentSimDate(d);
                setSimStartDate(format(d, "yyyy-MM-dd'T'HH:mm"));
            } else {
                setCurrentSimDate(null);
                setSimStartDate("");
            }
        });

        // 2. Bookings
        const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const bookings = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    from: safeDate(data.from),
                    to: safeDate(data.to),
                    createdAt: safeDate(data.createdAt)
                };
            });
            setAllBookings(bookings);
            setLoading(false);
        });
        return () => {
            unsubscribe();
            unsubSettings();
        };
    }, []);

    const performWipe = async () => {
        setActionLog("Reseting database...");
        const querySnapshot = await getDocs(collection(db, "bookings"));
        const count = querySnapshot.size;

        if (count === 0) {
            setActionLog("Database is already empty.");
            return 0;
        }

        const batch = writeBatch(db);
        querySnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        // Hard Clean
        localStorage.clear();
        sessionStorage.clear();
        return count;
    };

    // Helper to trigger password check
    const requireAuth = (title, message, action) => {
        setAuthModal({
            isOpen: true,
            title,
            message,
            onConfirm: action
        });
    };

    const handleUpdateStartDate = async () => {
        if (!simStartDate) return triggerAlert("Error", "Please select a date.");

        requireAuth(
            "Protected Action",
            "You are about to override the simulation start date. This requires password verification.",
            async () => {
                try {
                    const date = new Date(simStartDate);
                    const batch = writeBatch(db);
                    const settingsRef = doc(db, "settings", "general");
                    batch.set(settingsRef, { draftStartDate: date }, { merge: true });
                    await batch.commit();

                    triggerAlert("Success", "Simulation Start Date updated.");
                } catch (err) {
                    triggerAlert("Error", err.message);
                }
            }
        );
    };

    const handleResetSimulation = async () => {
        requireAuth(
            "Protected Action",
            "You are about to reset the simulation to default settings. This requires password verification.",
            async () => {
                try {
                    const batch = writeBatch(db);
                    const settingsRef = doc(db, "settings", "general");
                    batch.update(settingsRef, { draftStartDate: null });
                    await batch.commit();
                    triggerAlert("Success", "Simulation reset to default schedule.");
                } catch (err) {
                    try {
                        await updateDoc(doc(db, "settings", "general"), {
                            draftStartDate: null
                        });
                    } catch (e) {
                        // ignore
                    }
                }
            }
        );
    };


    // --- SYSTEM CONTROLS ---

    const handleResetDB = async () => {
        triggerConfirm(
            "⚠️ DANGER: WIPE DATABASE",
            "Are you sure you want to delete ALL bookings? This cannot be undone.",
            () => {
                setTimeout(() => {
                    requireAuth(
                        "Security Check: Wipe Database",
                        "High-risk action detected. Please verify your identity to proceed with database wipe.",
                        async () => {
                            try {
                                const count = await performWipe();
                                triggerAlert("Reset Complete", `✅ Reset Complete.\n\nDeleted ${count} records. Reloading...`);
                                setTimeout(() => window.location.reload(), 2000);
                            } catch (err) {
                                console.error(err);
                                triggerAlert("Error", err.message);
                            }
                        }
                    );
                }, 300);
            },
            true, // Danger
            "Proceed to Auth"
        );
    };

    const handleEditClick = (booking) => {
        setEditingBooking(booking);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async (updatedBooking) => {
        try {
            await updateDoc(doc(db, "bookings", updatedBooking.id), {
                shareholderName: updatedBooking.shareholderName,
                cabinNumber: updatedBooking.cabinNumber,
                from: updatedBooking.from,
                to: updatedBooking.to,
                isFinalized: updatedBooking.isFinalized
            });
            setIsEditModalOpen(false);
            setEditingBooking(null);
            triggerAlert("Success", "Booking updated successfully.");
        } catch (err) {
            triggerAlert("Error", err.message);
        }
    };

    const handleDeleteBooking = (bookingId, details) => {
        triggerConfirm(
            "Delete Booking?",
            `Are you sure you want to delete the booking for ${details}? This cannot be undone.`,
            async () => {
                try {
                    await deleteDoc(doc(db, "bookings", bookingId));
                    triggerAlert("Success", "Booking deleted successfully.");
                } catch (err) {
                    triggerAlert("Error", err.message);
                }
            },
            true,
            "Delete"
        );
    };

    const handleToggleFinalized = async (bookingId, currentStatus) => {
        try {
            await updateDoc(doc(db, "bookings", bookingId), {
                isFinalized: !currentStatus
            });
            triggerAlert("Success", `Booking ${!currentStatus ? 'finalized' : 'reverted to draft'}.`);
        } catch (err) {
            triggerAlert("Error", err.message);
        }
    };

    const handleTogglePaid = async (booking) => {
        if (booking.isPaid) {
            // Un-pay
            triggerConfirm(
                "Mark as Unpaid?",
                `Are you sure you want to revert the payment status for ${booking.shareholderName}?`,
                async () => {
                    try {
                        await updateDoc(doc(db, "bookings", booking.id), { isPaid: false });
                        triggerAlert("Success", "Marked as Unpaid.");
                    } catch (err) {
                        triggerAlert("Error", err.message);
                    }
                },
                false,
                "Mark Unpaid"
            );
        } else {
            // Mark as Paid
            const start = booking.from;
            const end = booking.to;
            const nights = differenceInDays(end, start);
            const amount = nights * 125;

            triggerConfirm(
                "Confirm Payment & Send Email",
                `Mark booking for ${booking.shareholderName} as PAID?\n\nAmount: $${amount}\n\nThis will send a confirmation email to the user.`,
                async () => {
                    try {
                        // 1. Update DB
                        await updateDoc(doc(db, "bookings", booking.id), { isPaid: true });

                        // 2. Send Email
                        // Find email address
                        const owner = CABIN_OWNERS.find(o => o.name === booking.shareholderName);
                        const userEmail = owner ? owner.email : "bryan.m.hudson@gmail.com";

                        await emailService.sendPaymentReceived({
                            name: booking.shareholderName,
                            email: "bryan.m.hudson@gmail.com" // OVERRIDE for safety/demo, could use userEmail
                        }, {
                            name: booking.shareholderName,
                            amount: amount.toLocaleString(),
                            check_in: format(start, 'MMM d, yyyy'),
                            check_out: format(end, 'MMM d, yyyy'),
                            cabin_number: booking.cabinNumber,
                            dashboard_url: window.location.origin
                        });

                        triggerAlert("Success", "Payment recorded and email sent! 💰");
                    } catch (err) {
                        triggerAlert("Error", err.message);
                    }
                },
                false,
                "Confirm & Send"
            );
        }
    };

    const resetOnboarding = () => {
        localStorage.removeItem('hhr_tour_seen');
        triggerAlert("Tour Reset", "The onboarding tour has been reset for your browser. It will appear the next time you visit the dashboard.");
    };

    const handleRunReminders = async () => {
        const currentOrder = getShareholderOrder(2026);
        const schedule = mapOrderToSchedule(currentOrder, allBookings);
        const activeTurn = schedule.find(s => s.status === 'ACTIVE' || s.status === 'GRACE_PERIOD');

        if (!activeTurn) {
            triggerAlert("Status", "No active turn found to remind.");
            return;
        }

        const now = new Date();
        const hoursRemaining = (activeTurn.end - now) / (1000 * 60 * 60);

        triggerConfirm(
            "Send Reminder?",
            `Active User: ${activeTurn.name}\nTime Remaining: ${Math.round(hoursRemaining)} hours\n\nDo you want to send a reminder email to ${activeTurn.name}?`,
            async () => {
                try {
                    const owner = CABIN_OWNERS.find(o => o.name === activeTurn.name);
                    if (owner) {
                        const emailData = {
                            name: activeTurn.name,
                            email: "bryan.m.hudson@gmail.com" // OVERRIDE
                        };
                        const contextData = {
                            name: activeTurn.name,
                            hours_remaining: Math.round(hoursRemaining),
                            deadline_date: format(activeTurn.end, 'PPP'),
                            deadline_time: format(activeTurn.end, 'p'),
                            check_in: "TBD", // Draft data could be fetched if we look up active booking
                            check_out: "TBD",
                            has_draft: false, // Could be improved by checking drafts
                            booking_url: window.location.origin,
                            dashboard_url: window.location.origin
                        };

                        if (hoursRemaining < 6) {
                            await emailService.sendFinalWarning(emailData, contextData);
                            triggerAlert("Sent", "Final Warning email sent.");
                        } else {
                            const type = now.getHours() < 12 ? 'morning' : 'evening';
                            await emailService.sendDailyReminder(emailData, { ...contextData, type });
                            triggerAlert("Sent", `${type === 'morning' ? "Morning" : "Evening"} reminder sent.`);
                        }
                    }
                } catch (err) {
                    console.error(err);
                    triggerAlert("Error", "Failed to send reminder.");
                }
            },
            false,
            "Send Email"
        );
    };

    const handleProcessExpired = async () => {
        setActionLog("Checking for expired turns...");
        const currentOrder = getShareholderOrder(2026); // Hardcoded year for now
        const schedule = mapOrderToSchedule(currentOrder, allBookings);

        // Find skipped turns (implicit passes)
        const expired = schedule.filter(s => s.status === 'SKIPPED');

        if (expired.length === 0) {
            setActionLog("No expired turns found.");
            triggerAlert("Status", "All turns are up to date.");
            return;
        }

        triggerConfirm(
            "Process Expired Turns",
            `Found ${expired.length} expired turns (Shareholders: ${expired.map(e => e.name).join(", ")}).\n\nDo you want to auto-pass them and send notification emails?`,
            async () => {
                let processedCount = 0;

                for (const item of expired) {
                    try {
                        // 1. Create Auto-Pass Record
                        await addDoc(collection(db, "bookings"), {
                            shareholderName: item.name,
                            type: 'auto-pass',
                            createdAt: new Date(), // This will timestamp it NOW, which effectively ends their turn
                            from: item.start, // Preserve original window for record
                            to: item.start
                        });

                        // 2. Email the person who missed their turn
                        const owner = CABIN_OWNERS.find(o => o.name === item.name);
                        if (owner && owner.email) {
                            await emailService.sendAutoPassCurrent({
                                name: item.name,
                                email: "bryan.m.hudson@gmail.com" // OVERRIDE
                            }, {
                                name: item.name,
                                deadline_date: format(item.end, 'PPP'),
                                deadline_time: format(item.end, 'p'),
                                next_shareholder: "Next Shareholder", // Generic or calculate?
                                dashboard_url: window.location.origin
                            });
                        }

                        // 3. Email the NEXT person? 
                        // The loop will eventually process them if they are also expired, 
                        // or if they are now active, we might want to notify them.
                        // However, strictly speaking, just creating the 'auto-pass' record 
                        // will cause the UI to update and show the NEXT person as active.
                        // We should probably rely on the 'Turn Started' logic or a separate 'Notify Active' check.
                        // But for now, let's just process the expiration.

                        // Actually, if we just auto-passed User A, User B is now ON THE CLOCK.
                        // We should notify User B. 
                        // Finding User B is tricky inside this loop without recalculating.
                        // Simplification: Just notify User A that they missed it. 
                        // User B will see it's their turn if they log in. 
                        // (Ideally we notify User B too, but let's stick to the core requirement first).

                        processedCount++;
                    } catch (err) {
                        console.error("Error processing item:", item, err);
                    }
                }

                setActionLog(`Processed ${processedCount} expired turns.`);
                triggerAlert("Complete", `Successfully processed ${processedCount} expired turns.`);
            },
            false,
            "Process ALL"
        );
    };

    // --- UI ---

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <Link
                    to="/"
                    className="px-4 py-2 bg-slate-900 text-white rounded-md font-bold text-sm hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2"
                >
                    View Booking Application ↗
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {/* System Controls */}
                <div className="bg-white border rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800">
                        <Settings className="h-5 w-5 text-slate-500" />
                        System Controls
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Simulation Card */}
                        <div className="col-span-1 md:col-span-2 p-4 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex gap-3">
                                    <div className="mt-1 p-2 bg-white rounded-md border shadow-sm text-slate-500">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900">Draft Simulation</h3>
                                        <p className="text-xs text-slate-500 mt-1 max-w-sm">
                                            Override the official start date ({format(DRAFT_CONFIG.START_DATE, 'MMM d, yyyy')}) to test different draft phases.
                                        </p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <input
                                                type="datetime-local"
                                                value={simStartDate}
                                                onChange={(e) => setSimStartDate(e.target.value)}
                                                className="text-sm border rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                            <button
                                                onClick={handleUpdateStartDate}
                                                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded hover:bg-slate-800 transition-colors"
                                            >
                                                Sets Date
                                            </button>
                                            {currentSimDate && (
                                                <button
                                                    onClick={handleResetSimulation}
                                                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded hover:bg-slate-50 transition-colors"
                                                >
                                                    Reset to Default
                                                </button>
                                            )}
                                        </div>
                                        {currentSimDate && (
                                            <p className="text-xs text-blue-600 font-medium mt-2 flex items-center gap-1">
                                                <CheckCircle className="h-3 w-3" />
                                                Simulation Active: {format(currentSimDate, 'MMM d, h:mm a')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reset DB */}
                        <div className="p-4 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-50 transition-colors group">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-3">
                                    <div className="p-2 bg-white rounded-md border border-red-100 text-red-500 group-hover:text-red-600 shadow-sm">
                                        <Trash2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-red-900">Wipe Database</h3>
                                        <p className="text-xs text-red-600/80 mt-1">
                                            Delete all bookings and reset state.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleResetDB}
                                    className="px-3 py-1.5 bg-white border border-red-200 text-red-700 text-xs font-bold rounded hover:bg-red-100 transition-colors shadow-sm"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        {/* Onboarding */}
                        <div className="p-4 rounded-lg border border-blue-100 bg-blue-50/50 hover:bg-blue-50 transition-colors group">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-3">
                                    <div className="p-2 bg-white rounded-md border border-blue-100 text-blue-500 group-hover:text-blue-600 shadow-sm">
                                        <PlayCircle className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-blue-900">Reset Tour</h3>
                                        <p className="text-xs text-blue-600/80 mt-1">
                                            Show onboarding guide again.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={resetOnboarding}
                                    className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 text-xs font-bold rounded hover:bg-blue-100 transition-colors shadow-sm"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        {/* Expired Turns */}
                        <div className="p-4 rounded-lg border border-amber-100 bg-amber-50/50 hover:bg-amber-50 transition-colors group">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-3">
                                    <div className="p-2 bg-white rounded-md border border-amber-100 text-amber-500 group-hover:text-amber-600 shadow-sm">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-amber-900">Process Turns</h3>
                                        <p className="text-xs text-amber-600/80 mt-1">
                                            Check for missed deadlines.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleProcessExpired}
                                    className="px-3 py-1.5 bg-white border border-amber-200 text-amber-700 text-xs font-bold rounded hover:bg-amber-100 transition-colors shadow-sm"
                                >
                                    Run
                                </button>
                            </div>
                        </div>

                        {/* Reminders */}
                        <div className="p-4 rounded-lg border border-purple-100 bg-purple-50/50 hover:bg-purple-50 transition-colors group">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-3">
                                    <div className="p-2 bg-white rounded-md border border-purple-100 text-purple-500 group-hover:text-purple-600 shadow-sm">
                                        <Bell className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-purple-900">Send Reminders</h3>
                                        <p className="text-xs text-purple-600/80 mt-1">
                                            Notify active shareholder.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleRunReminders}
                                    className="px-3 py-1.5 bg-white border border-purple-200 text-purple-700 text-xs font-bold rounded hover:bg-purple-100 transition-colors shadow-sm"
                                >
                                    Send
                                </button>
                            </div>
                        </div>

                    </div>
                    {actionLog && <p className="mt-4 text-sm font-mono text-muted-foreground p-2 bg-slate-100 rounded">{actionLog}</p>}
                </div>


            </div>



            {/* All Bookings (Selective Updates) */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden mb-12">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold">Manage All Bookings</h2>
                    <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">Live Database</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">Shareholder</th>
                                <th className="px-6 py-4">Dates</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Payment</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-slate-600">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-muted-foreground italic">
                                        Loading bookings...
                                    </td>
                                </tr>
                            ) : allBookings.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-muted-foreground italic">
                                        No bookings found in database.
                                    </td>
                                </tr>
                            ) : (
                                allBookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-muted/10 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="font-semibold text-slate-900 text-base">{booking.shareholderName}</div>
                                            <div className="text-xs text-muted-foreground font-mono mt-0.5">Cabin #{booking.cabinNumber}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900">
                                                    {booking.from && booking.to
                                                        ? `${format(booking.from, 'MMM d')} - ${format(booking.to, 'MMM d, yyyy')}`
                                                        : 'Invalid Dates'
                                                    }
                                                </span>
                                                <span className="text-[11px] text-muted-foreground mt-0.5">
                                                    Created: {booking.createdAt ? format(booking.createdAt, 'MMM d, HH:mm') : 'N/A'}
                                                </span>
                                            </div>
                                        </td>



                                        {/* Status Toggle */}
                                        <td className="px-6 py-5 text-center">
                                            {booking.type === 'pass' || booking.type === 'auto-pass' ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 cursor-default">
                                                    <XCircle className="w-3 h-3 mr-1.5" />
                                                    Passed
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleToggleFinalized(booking.id, booking.isFinalized)}
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border transition-all active:scale-95 ${booking.isFinalized
                                                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                                        }`}
                                                    title={booking.isFinalized ? "Click to Revert to Draft" : "Click to Finalize"}
                                                >
                                                    {booking.isFinalized ? (
                                                        <>
                                                            <CheckCircle className="w-3 h-3 mr-1.5" />
                                                            Finalized
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Clock className="w-3 h-3 mr-1.5" />
                                                            Draft
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </td>

                                        {/* Payment Toggle */}
                                        <td className="px-6 py-5 text-center">
                                            {(booking.type === 'pass' || booking.type === 'auto-pass') ? (
                                                <span className="text-xs text-muted-foreground/30 font-medium select-none">—</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleTogglePaid(booking)}
                                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border transition-all active:scale-95 ${booking.isPaid
                                                        ? 'bg-emerald-600 text-white border-transparent hover:bg-emerald-700 shadow-sm'
                                                        : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-500 hover:text-emerald-600'
                                                        }`}
                                                    title={booking.isPaid ? "Mark as Unpaid" : "Mark as Paid"}
                                                >
                                                    {booking.isPaid ? (
                                                        <>
                                                            <DollarSign className="w-3 h-3 mr-1" />
                                                            PAID
                                                        </>
                                                    ) : (
                                                        "UNPAID"
                                                    )}
                                                </button>
                                            )}
                                        </td>

                                        <td className="px-6 py-5 text-right space-x-2">
                                            <button
                                                onClick={() => handleEditClick(booking)}
                                                className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                title="Edit Details"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteBooking(booking.id, `${booking.shareholderName} (#${booking.cabinNumber})`)}
                                                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                                title="Delete Booking"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div >

            {/* Shareholder List */}
            < div className="bg-card border rounded-xl shadow-sm overflow-hidden" >
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Shareholders (Read Only)</h2>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Source: Code</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">Cabin</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Email(s)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {CABIN_OWNERS.map((owner, i) => (
                                <tr key={i} className="hover:bg-muted/10">
                                    <td className="px-6 py-4 font-mono font-bold text-muted-foreground">#{owner.cabin}</td>
                                    <td className="px-6 py-4 font-medium">{owner.name}</td>
                                    <td className="px-6 py-4 text-muted-foreground max-w-md truncate" title={owner.email}>
                                        {owner.email}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div >

            {/* Modal */}
            < ConfirmationModal
                isOpen={confirmation.isOpen}
                onClose={() => setConfirmation(prev => ({ ...prev, isOpen: false }))
                }
                onConfirm={confirmation.onConfirm}
                title={confirmation.title}
                message={confirmation.message}
                isDanger={confirmation.isDanger}
                confirmText={confirmation.confirmText}
                showCancel={confirmation.showCancel}
            />

            {/* Edit Modal */}
            < EditBookingModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveEdit}
                booking={editingBooking}
                allBookings={allBookings}
            />

            {/* Reauth Modal */}
            <ReauthenticationModal
                isOpen={authModal.isOpen}
                onClose={() => setAuthModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={authModal.onConfirm}
                title={authModal.title}
                message={authModal.message}
            />
        </div >
    );
}
