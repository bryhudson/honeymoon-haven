import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CABIN_OWNERS, DRAFT_CONFIG, getShareholderOrder, mapOrderToSchedule } from '../lib/shareholders';
import { emailService } from '../services/emailService';
import { db } from '../lib/firebase';
import { collection, getDocs, writeBatch, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { format } from 'date-fns';

export function AdminDashboard() {
    const [actionLog, setActionLog] = useState("");
    const [allBookings, setAllBookings] = useState([]);
    const [loading, setLoading] = useState(true);

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

    // Fetch all bookings
    useEffect(() => {
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
        return unsubscribe;
    }, []);


    // --- SYSTEM CONTROLS ---

    const handleResetDB = async () => {
        triggerConfirm(
            "⚠️ DANGER: WIPE DATABASE",
            "Are you sure you want to delete ALL bookings? This cannot be undone.",
            async () => {
                try {
                    setActionLog("Reseting database...");
                    const querySnapshot = await getDocs(collection(db, "bookings"));
                    const count = querySnapshot.size;

                    if (count === 0) {
                        triggerAlert("Database Empty", "Database is already empty.");
                        setActionLog("Database is already empty.");
                        return;
                    }

                    const batch = writeBatch(db);
                    querySnapshot.docs.forEach((doc) => {
                        batch.delete(doc.ref);
                    });

                    await batch.commit();

                    // Hard Clean
                    localStorage.clear();
                    sessionStorage.clear();

                    triggerAlert("Reset Complete", `✅ Reset Complete.\n\nDeleted ${count} records. Reloading...`);
                    setTimeout(() => window.location.reload(), 2000);
                } catch (err) {
                    console.error(err);
                    triggerAlert("Error", err.message);
                }
            },
            true, // Danger
            "Wipe Database"
        );
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
                <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        ⚙️ System Controls
                    </h2>

                    <div className="space-y-4">

                        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-lg">
                            <div>
                                <h3 className="font-semibold text-red-900">Reset Simulation</h3>
                                <p className="text-xs text-red-700">
                                    Wipe all bookings and restart.
                                </p>
                            </div>
                            <button
                                onClick={handleResetDB}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-md hover:bg-red-700 shadow-sm"
                            >
                                Wipe Database
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-lg">
                            <div>
                                <h3 className="font-semibold text-blue-900">Onboarding Tour</h3>
                                <p className="text-xs text-blue-700">
                                    Show the guided tour again for testing.
                                </p>
                            </div>
                            <button
                                onClick={resetOnboarding}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-md hover:bg-blue-700 shadow-sm"
                            >
                                Reset Tour
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-lg">
                            <div>
                                <h3 className="font-semibold text-amber-900">Process Expired Turns</h3>
                                <p className="text-xs text-amber-700">
                                    Check for missed deadlines and auto-pass.
                                </p>
                            </div>
                            <button
                                onClick={handleProcessExpired}
                                className="px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-md hover:bg-amber-700 shadow-sm"
                            >
                                Run Checks
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-100 rounded-lg">
                            <div>
                                <h3 className="font-semibold text-purple-900">Active Turn Reminders</h3>
                                <p className="text-xs text-purple-700">
                                    Send daily reminder or final warning to active user.
                                </p>
                            </div>
                            <button
                                onClick={handleRunReminders}
                                className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-md hover:bg-purple-700 shadow-sm"
                            >
                                Send Reminders
                            </button>
                        </div>
                    </div>
                    {actionLog && <p className="mt-4 text-sm font-mono text-muted-foreground">{actionLog}</p>}
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
                                <th className="px-6 py-4">Cabin</th>
                                <th className="px-6 py-4">Dates</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
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
                                        <td className="px-6 py-4 font-semibold text-slate-900">{booking.shareholderName}</td>
                                        <td className="px-6 py-4 text-muted-foreground">#{booking.cabinNumber}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium">
                                                    {booking.from && booking.to
                                                        ? `${format(booking.from, 'MMM d')} - ${format(booking.to, 'MMM d, yyyy')}`
                                                        : 'Invalid Dates'
                                                    }
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Created: {booking.createdAt ? format(booking.createdAt, 'MMM d, HH:mm') : 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {booking.isFinalized ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                    Finalized
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                                    Draft
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleToggleFinalized(booking.id, booking.isFinalized)}
                                                className={`text-xs font-bold px-3 py-1 rounded transition-colors ${booking.isFinalized
                                                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    }`}
                                            >
                                                {booking.isFinalized ? 'Revert to Draft' : 'Finalize'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteBooking(booking.id, `${booking.shareholderName} (#${booking.cabinNumber})`)}
                                                className="text-xs font-bold px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Shareholder List */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
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
            </div>

            {/* Modal */}
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
        </div>
    );
}
