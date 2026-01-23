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
    const [showQuickTest, setShowQuickTest] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState('Never');
    const [monitorData, setMonitorData] = useState(null);
    const [bookings, setBookings] = useState([]);

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
    const startFullTest = async () => {
        try {
            // Enable fast mode
            await toggleFastTestingMode();
            // Wait a bit then sync
            setTimeout(async () => {
                await handleSyncDraftStatus();
                triggerAlert('Success', '10-minute test started! Watch your Gmail for 4 reminder emails.');
            }, 500);
        } catch (error) {
            triggerAlert('Error', `Failed to start test: ${error.message}`);
        }
    };



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
                {monitorData?.activePicker && (
                    <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full border border-green-200">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-sm font-bold text-green-800">
                            Active: {monitorData.activePicker} (Round {monitorData.round})
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Left Column: Controls */}
                <div className="space-y-6">

                    {/* Status Banner */}
                    {isBeforeFeb15 && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-blue-100 rounded-xl">
                                    <Shield className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-blue-900 text-lg mb-1">🧪 Testing Mode Active</h3>
                                    <p className="text-blue-700 text-sm leading-relaxed">
                                        All emails redirect to <strong>bryan.m.hudson@gmail.com</strong>.
                                        <br />Switches to production automatically <strong>Feb 15, 2026</strong>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mode Selection */}
                    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden p-6">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                            <Calendar className="w-5 h-5" />
                            Schedule Settings & Mode
                        </h3>

                        <div className="space-y-3">
                            <label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${simStartDate === '' ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                <input
                                    type="radio"
                                    name="draftMode"
                                    checked={simStartDate === ''}
                                    onChange={() => {
                                        setSimStartDate('');
                                        requireAuth(
                                            "Set to Production",
                                            "Reset to March 1, 2026?",
                                            async () => {
                                                const productionDate = new Date(2026, 2, 1, 10, 0, 0);
                                                await performWipe(productionDate);
                                                await setDoc(doc(db, "settings", "general"), {
                                                    draftStartDate: productionDate,
                                                    bypassTenAM: false,
                                                    fastTestingMode: false
                                                }, { merge: true });
                                                await handleSyncDraftStatus();
                                            }
                                        );
                                    }}
                                    className="mt-1"
                                />
                                <div>
                                    <div className="font-semibold text-slate-900">Production Mode</div>
                                    <div className="text-sm text-slate-600">Start: March 1, 2026 @ 10:00 AM</div>
                                    <div className="text-xs text-slate-400 mt-1">Standard 48h windows. Real emails sent to shareholders.</div>
                                </div>
                            </label>

                            <label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${simStartDate !== '' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                <input
                                    type="radio"
                                    name="draftMode"
                                    checked={simStartDate !== ''}
                                    onChange={() => { }}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="font-semibold text-slate-900">Testing Mode (Custom Date)</div>
                                    <div className="text-sm text-slate-600 mb-1">Simulate draft start date</div>
                                    <div className="text-xs text-slate-400 mb-2">Redirects all emails to you. Allows time travel.</div>
                                    <input
                                        type="datetime-local"
                                        value={simStartDate || format(new Date(2026, 0, 22, 6, 0), "yyyy-MM-dd'T'HH:mm")}
                                        onChange={(e) => {
                                            setSimStartDate(e.target.value);
                                            requireAuth(
                                                "Update Draft Start",
                                                `Set draft start to ${e.target.value}?`,
                                                async () => {
                                                    const newDate = new Date(e.target.value);
                                                    await performWipe(newDate);
                                                    await setDoc(doc(db, "settings", "general"), {
                                                        draftStartDate: newDate,
                                                        bypassTenAM: true
                                                    }, { merge: true });
                                                    await handleSyncDraftStatus();
                                                }
                                            );
                                        }}
                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-full max-w-xs bg-white"
                                    />
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Communication & Simulation */}
                    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <TestTube className="w-5 h-5 text-indigo-700" />
                                <span className="text-indigo-900">Communication & Simulation</span>
                            </h3>
                            <button
                                onClick={() => setShowQuickTest(!showQuickTest)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                            >
                                {showQuickTest ? 'Hide Controls' : 'Show Controls'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={startFullTest}
                                className="flex flex-col items-center justify-center p-6 border-2 border-indigo-100 bg-indigo-50 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all group text-center"
                            >
                                <Play className="w-8 h-8 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-indigo-900">Start 10-Minute Test</span>
                                <span className="text-xs text-indigo-700 mt-1">Runs compressed schedule (2min intervals)</span>
                            </button>

                            {showQuickTest ? (
                                <div className="flex flex-col gap-2 animate-in slide-in-from-top-2 fade-in duration-300">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Manual Email Triggers</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['evening', 'day2', 'final', 'urgent'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => sendTestReminder(type)}
                                                className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 hover:border-indigo-200 transition-colors flex items-center justify-center gap-1"
                                            >
                                                <Zap className="w-3 h-3 text-slate-400" />
                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 text-center">
                                        Sends template immediately to {isTestMode ? 'admin (you)' : 'shareholder'}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-100 rounded-xl text-center">
                                    <p className="text-sm text-slate-400 italic">Manual triggers hidden</p>
                                    <button
                                        onClick={() => setShowQuickTest(true)}
                                        className="text-xs text-indigo-500 hover:text-indigo-700 font-medium mt-1"
                                    >
                                        Show Controls
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Advanced Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={handleSyncDraftStatus}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all text-sm"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Force Sync Status
                            </button>
                            <span className="text-[10px] text-center text-slate-400">Fixes "stuck" states by recalculating schedule</span>
                        </div>

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
            </div>
        </div>

    );
}
