import React, { useState, useEffect } from 'react';
import { Calendar, Shield, Settings, AlertTriangle, Clock, RefreshCw, ChevronDown, ChevronUp, Zap, TestTube, Play, Users, CheckCircle, ArrowRight } from 'lucide-react';
import { collection, onSnapshot, getDocs, getDoc, Timestamp } from 'firebase/firestore';
import { calculateDraftSchedule, getShareholderOrder } from '../../lib/shareholders';

export function SystemTab({
    simStartDate,
    setSimStartDate,
    fastTestingMode,
    setFastTestingMode,
    isTestMode,
    isSystemFrozen,
    toggleTestMode,
    toggleSystemFreeze,
    toggleFastTestingMode,
    handleWipeDatabase,
    requireAuth,
    triggerAlert,
    performWipe,
    IS_SITE_OWNER,
    db,
    doc,
    setDoc,
    format
}) {

    const [lastSyncTime, setLastSyncTime] = useState('Never');
    const [monitorData, setMonitorData] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [showTimeTravel, setShowTimeTravel] = useState(false); // Toggle for advanced date picker

    // Calculate if we're before Feb 15, 2026
    const now = new Date();
    const feb15 = new Date(2026, 1, 15);
    const isBeforeFeb15 = now < feb15;

    // Real-time listener for bookings to update the monitor
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "bookings"), (snapshot) => {
            const loadedBookings = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                from: d.data().from?.toDate(),
                to: d.data().to?.toDate(),
                createdAt: d.data().createdAt?.toDate()
            }));
            setBookings(loadedBookings);
        });

        return () => unsubscribe();
    }, [db]);

    // Recalculate monitor status whenever bookings or settings change
    useEffect(() => {
        const runCalculation = async () => {
            // Get current settings for calculation
            // In a real app we might want to listen to settings too, but for UI smooth updates we'll use props/state
            // Assuming simStartDate and fastTestingMode reflect current DB state roughly or are the inputs

            const schedule = calculateDraftSchedule(
                getShareholderOrder(2026), // shareholders
                bookings, // bookings
                new Date(), // now
                simStartDate ? new Date(simStartDate) : undefined, // startDateOverride
                fastTestingMode, // fastTestingMode
                !!simStartDate // bypassTenAM (if custom date set, assume true to allow mid-day start)
            );
            setMonitorData(schedule);
            // Update sync time to show liveliness
            setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        };
        runCalculation();
        const interval = setInterval(runCalculation, 60000); // Update every minute for timers
        return () => clearInterval(interval);
    }, [bookings, simStartDate, fastTestingMode]);


    // Sync Draft Status Function
    const handleSyncDraftStatus = async () => {
        try {
            // We re-fetch to ensure we have the absolute latest BEFORE writing
            const bookingsSnapshot = await getDocs(collection(db, "bookings"));
            const currentBookings = bookingsSnapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                from: d.data().from?.toDate(),
                to: d.data().to?.toDate()
            }));

            const settingsDoc = await getDoc(doc(db, "settings", "general"));
            const settings = settingsDoc.data() || {};

            const calculatedStatus = calculateDraftSchedule(
                getShareholderOrder(2026), // shareholders
                currentBookings,
                new Date(), // now
                settings.draftStartDate?.toDate(),
                settings.fastTestingMode,
                settings.bypassTenAM
            );

            await setDoc(doc(db, "status", "draftStatus"), {
                activePicker: calculatedStatus.activePicker,
                nextPicker: calculatedStatus.nextPicker,
                phase: calculatedStatus.phase,
                round: calculatedStatus.round,
                windowStarts: calculatedStatus.windowStarts ? Timestamp.fromDate(calculatedStatus.windowStarts) : null,
                windowEnds: calculatedStatus.windowEnds ? Timestamp.fromDate(calculatedStatus.windowEnds) : null,
                lastSynced: Timestamp.now()
            });

            setLastSyncTime('Just now');
            const message = calculatedStatus.activePicker
                ? `Schedule started! ${calculatedStatus.activePicker} is now active.`
                : "Schedule synced - no active picker yet.";

            triggerAlert("Success", message);
        } catch (error) {
            console.error("Sync failed:", error);
            triggerAlert("Error", `Failed to sync: ${error.message}`);
        }
    };

    // Send transactional test email
    const sendTestTransaction = async (type) => {
        try {
            const { httpsCallable } = await import('firebase/functions');
            const { functions } = await import('../../lib/firebase');
            const sendTestEmailFn = httpsCallable(functions, 'sendTestEmail');

            // Map UI types to backend types
            const typeMap = {
                'turnStarted': 'turnStarted',
                'turnPassed': 'turnPassedNext', // Testing the "Next Person" notification
                'bookingConfirmed': 'bookingConfirmed',
                'paymentReceived': 'paymentReceived',
                'bookingCancelled': 'bookingCancelled',
                'paymentReminder': 'paymentReminder'
            };

            const backendType = typeMap[type] || type;
            await sendTestEmailFn({ emailType: backendType });

            triggerAlert('Success', `Test email (${type}) sent to your Gmail!`);
        } catch (error) {
            console.error(error);
            triggerAlert('Error', `Failed: ${error.message}`);
        }
    };

    // Send test reminder function
    const sendTestReminder = async (type) => {
        try {
            const { httpsCallable } = await import('firebase/functions');
            const { functions } = await import('../../lib/firebase');
            const sendTestReminderFn = httpsCallable(functions, 'sendTestReminder');
            await sendTestReminderFn({ reminderType: type });

            const typeNames = {
                evening: 'Evening Check-In',
                day2: 'Day 2 Reminder',
                final: 'Final Day Warning',
                urgent: 'Urgent Alert'
            };
            triggerAlert('Success', `${typeNames[type]} email sent to your Gmail!`);
        } catch (error) {
            triggerAlert('Error', `Failed: ${error.message}`);
        }
    };

    // Start full test (Fast Mode + Sync)
    // REMOVED: Legacy 10-minute test logic removed in v2.69.19 favor of production-mirror testing.



    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Settings className="w-8 h-8 text-slate-800" />
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Booking System Control</h2>
                        <p className="text-sm text-slate-500">Manage testing, schedule, and system status</p>
                    </div>
                </div>
                {/* Redundant Badge Removed */}
            </div>

            <div className="space-y-8">
                {/* 1. Maintenance & Troubleshooting Zone */}
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Troubleshooting Zone
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Maintenance Mode */}
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={toggleSystemFreeze}
                                className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-xl font-medium transition-all text-sm ${isSystemFrozen ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                            >
                                <AlertTriangle className="w-4 h-4" />
                                {isSystemFrozen ? 'Maintenance ON' : 'Maintenance Mode'}
                            </button>
                            <span className="text-[10px] text-center text-slate-400">Blocks all users from making changes</span>
                        </div>

                        {/* Reset Schedule State */}
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={handleSyncDraftStatus}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all text-sm"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reset Schedule State
                            </button>
                            <span className="text-[10px] text-center text-slate-400">Fixes "stuck" states by recalculating schedule</span>
                        </div>

                        {/* Wipe Data (Owner Only) */}
                        {IS_SITE_OWNER && (
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={handleWipeDatabase}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium hover:bg-red-100 transition-all text-sm"
                                >
                                    <Users className="w-4 h-4" />
                                    Wipe Data
                                </button>
                                <span className="text-[10px] text-center text-red-400/60">⚠️ Delete all bookings & reset</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Schedule Settings (Top Priority) */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden p-6">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5" />
                        Schedule Settings & Mode
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Production Mde Card */}
                        <div
                            onClick={() => {
                                if (simStartDate === '') return; // Already in prod
                                requireAuth(
                                    "Switch to Production",
                                    "Reset to March 1, 2026? This clears all test data.",
                                    async () => {
                                        const productionDate = new Date(2026, 2, 1, 10, 0, 0);
                                        await performWipe(productionDate);
                                        setSimStartDate('');
                                        await setDoc(doc(db, "settings", "general"), {
                                            draftStartDate: productionDate,
                                            bypassTenAM: false,
                                            fastTestingMode: false,
                                            isTestMode: false // Live Emails!
                                        }, { merge: true });
                                        await handleSyncDraftStatus();
                                    }
                                );
                            }}
                            className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${simStartDate === ''
                                ? 'border-green-500 bg-green-50 ring-1 ring-green-500'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    <Shield className={`w-5 h-5 ${simStartDate === '' ? 'text-green-600' : 'text-slate-400'}`} />
                                </div>
                                {simStartDate === '' && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Active</span>}
                            </div>
                            <h4 className={`font-bold text-lg ${simStartDate === '' ? 'text-green-900' : 'text-slate-700'}`}>Production Mode</h4>
                            <p className="text-sm text-slate-500 mt-1">
                                Start: March 1, 2026 @ 10:00 AM<br />
                                <span className="text-slate-400 text-xs">Real emails sent to shareholders.</span>
                            </p>
                        </div>

                        {/* Test Simulation Card */}
                        <div
                            onClick={() => {
                                const today = new Date();
                                today.setHours(10, 0, 0, 0); // Default to today 10am
                                const dateStr = format(today, "yyyy-MM-dd'T'HH:mm");

                                requireAuth(
                                    "Start Test Simulation",
                                    "Start simulation from Today @ 10am? Safe Mode (Emails -> You).",
                                    async () => {
                                        await performWipe(today);
                                        setSimStartDate(dateStr);
                                        await setDoc(doc(db, "settings", "general"), {
                                            draftStartDate: today,
                                            bypassTenAM: true,
                                            fastTestingMode: false,
                                            isTestMode: true // Safe Mode
                                        }, { merge: true });
                                        await handleSyncDraftStatus();
                                    }
                                );
                            }}
                            className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${simStartDate !== ''
                                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    <TestTube className={`w-5 h-5 ${simStartDate !== '' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                </div>
                                {simStartDate !== '' && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Active</span>}
                            </div>
                            <h4 className={`font-bold text-lg ${simStartDate !== '' ? 'text-indigo-900' : 'text-slate-700'}`}>Test Simulation</h4>
                            <div className="text-sm text-slate-500 mt-1 mb-3">
                                Start: Today @ 10:00 AM<br />
                                <span className="text-indigo-600 font-medium text-xs">Safe Mode On (Emails -&gt; Admin only)</span>
                            </div>

                            {/* Time Travel Toggle & Picker */}
                            {simStartDate !== '' && (
                                <div onClick={(e) => e.stopPropagation()} className="mt-3 pt-3 border-t border-indigo-100">
                                    {!showTimeTravel ? (
                                        <button
                                            onClick={() => setShowTimeTravel(true)}
                                            className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider hover:text-indigo-600 flex items-center gap-1"
                                        >
                                            <Clock className="w-3 h-3" /> Show Time Travel Controls
                                        </button>
                                    ) : (
                                        <div className="animate-in fade-in slide-in-from-top-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Custom Start Date</label>
                                                <button
                                                    onClick={() => setShowTimeTravel(false)}
                                                    className="text-[10px] text-slate-400 hover:text-slate-600"
                                                >
                                                    Hide
                                                </button>
                                            </div>
                                            <input
                                                type="datetime-local"
                                                value={simStartDate}
                                                onChange={(e) => {
                                                    setSimStartDate(e.target.value);
                                                    // Auto-update on change (debounce in real app, here simple)
                                                    const newDate = new Date(e.target.value);
                                                    performWipe(newDate).then(() => {
                                                        setDoc(doc(db, "settings", "general"), {
                                                            draftStartDate: newDate,
                                                            bypassTenAM: true
                                                        }, { merge: true }).then(() => handleSyncDraftStatus());
                                                    });
                                                }}
                                                className="w-full px-2 py-1.5 border border-indigo-200 rounded text-xs text-indigo-700 bg-white"
                                            />
                                            <p className="text-[10px] text-indigo-400 mt-1 italic">
                                                Fast-forward time to test deadlines & expiration logic.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Email System Visibility (Always On) */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <TestTube className="w-5 h-5 text-indigo-700" />
                            <span className="text-indigo-900">Email System Overview</span>
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* LEFT: Timed Reminders (Testable) */}
                        <div className="space-y-6">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-amber-100 rounded-lg">
                                    <Clock className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">Timed Reminders (48h Window)</h4>
                                    <p className="text-xs text-slate-500 mt-1">
                                        These run automatically on a set schedule relative to the turn start.
                                    </p>
                                </div>
                            </div>

                            {/* Timeline Visualization */}
                            <div className="relative pl-4 space-y-6 border-l-2 border-slate-100 ml-2">
                                {/* Evening */}
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-200 border-2 border-white"></div>
                                    <div className="flex items-center justify-between group">
                                        <div>
                                            <div className="text-[10px] font-bold text-blue-600 mb-0.5">Subject: Evening Reminder: Your Honeymoon Haven Booking Awaits</div>
                                            <div className="text-xs font-bold text-slate-700">Day 1 @ 7:00 PM</div>
                                            <div className="text-[10px] text-slate-400">Evening Check-in</div>
                                        </div>
                                        <button
                                            onClick={() => sendTestReminder('evening')}
                                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-medium hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-all flex items-center gap-1"
                                        >
                                            <Zap className="w-3 h-3" /> Test
                                        </button>
                                    </div>
                                </div>

                                {/* Day 2 */}
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-200 border-2 border-white"></div>
                                    <div className="flex items-center justify-between group">
                                        <div>
                                            <div className="text-[10px] font-bold text-blue-600 mb-0.5">Subject: Morning Reminder: Complete Your Booking</div>
                                            <div className="text-xs font-bold text-slate-700">Day 2 @ 9:00 AM</div>
                                            <div className="text-[10px] text-slate-400">Mid-point Reminder</div>
                                        </div>
                                        <button
                                            onClick={() => sendTestReminder('day2')}
                                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-medium hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-all flex items-center gap-1"
                                        >
                                            <Zap className="w-3 h-3" /> Test
                                        </button>
                                    </div>
                                </div>

                                {/* Day 3 / Final */}
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-200 border-2 border-white"></div>
                                    <div className="flex items-center justify-between group">
                                        <div>
                                            <div className="text-[10px] font-bold text-blue-600 mb-0.5">Subject: Morning Reminder: Complete Your Booking</div>
                                            <div className="text-xs font-bold text-slate-700">Day 3 @ 9:00 AM</div>
                                            <div className="text-[10px] text-slate-400">Final Morning Warning</div>
                                        </div>
                                        <button
                                            onClick={() => sendTestReminder('final')}
                                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-medium hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-all flex items-center gap-1"
                                        >
                                            <Zap className="w-3 h-3" /> Test
                                        </button>
                                    </div>
                                </div>

                                {/* Urgent */}
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white animate-pulse"></div>
                                    <div className="flex items-center justify-between group">
                                        <div>
                                            <div className="text-[10px] font-bold text-amber-600 mb-0.5">Subject: URGENT: 6 Hours Left to Complete Your Booking</div>
                                            <div className="text-xs font-bold text-slate-700">2 Hours Before End</div>
                                            <div className="text-[10px] text-slate-400">Urgent Deadline Alert</div>
                                        </div>
                                        <button
                                            onClick={() => sendTestReminder('urgent')}
                                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-medium hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-all flex items-center gap-1"
                                        >
                                            <Zap className="w-3 h-3" /> Test
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Transactional Events (Testable) */}
                        <div className="space-y-6">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <Zap className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">Transactional Events</h4>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Triggered by <span className="font-semibold text-slate-700">Actions</span>. Sent instantly when users interact.
                                        <br />Click to simulate and send a test to yourself.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {[
                                    { id: "turnStarted", name: "Turn Started", desc: "When active status begins", subject: "It's YOUR Turn! 🎉" },
                                    { id: "turnPassed", name: "Turn Passed (Next)", desc: "Notify next user", subject: "It's Your Turn! (Passed)" },
                                    { id: "bookingConfirmed", name: "Booking Confirmed", desc: "User finalizes dates", subject: "Booking Confirmed" },
                                    { id: "paymentReminder", name: "Payment Reminder", desc: "Manually triggered / Auto", subject: "E-Transfer Due" },
                                    { id: "paymentReceived", name: "Payment Received", desc: "Admin marks as Paid", subject: "Payment Received" },
                                    { id: "bookingCancelled", name: "Booking Cancelled", desc: "Admin cancels booking", subject: "Booking Cancelled" }
                                ].map((event) => (
                                    <div key={event.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg group hover:border-indigo-200 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-slate-50 rounded-md text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                                <Zap className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-700">{event.name}</div>
                                                <div className="text-[10px] text-slate-400">"{event.subject}"</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => sendTestTransaction(event.id)}
                                            className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold hover:bg-indigo-100 transition-all"
                                        >
                                            Test
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>


            </div>
        </div>

    );
}
