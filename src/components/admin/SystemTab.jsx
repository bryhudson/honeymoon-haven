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
                bookings,
                simStartDate ? new Date(simStartDate) : undefined,
                false, // bypassTenAM - usually false unless explicitly set
                fastTestingMode
            );
            setMonitorData(schedule);
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
                currentBookings,
                settings.draftStartDate?.toDate(),
                settings.bypassTenAM,
                settings.fastTestingMode
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

    // Helper to render shareholder list
    const renderShareholderList = () => {
        const shareholders = getShareholderOrder(2026);
        const fullOrder = [...shareholders, ...[...shareholders].reverse()];

        return (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {fullOrder.map((name, index) => {
                    const isRound2 = index >= 12;
                    const round = isRound2 ? 2 : 1;
                    const isActive = monitorData?.activePicker === name && monitorData?.round === round;

                    // Determine status based on monitorData (approximated for UI)
                    // In a real implementation we'd map this perfectly from the schedule
                    const isCompleted = bookings.some(b => b.shareholderName === name && b.round === round);

                    let statusColor = "bg-slate-50 border-slate-200 text-slate-500"; // Future
                    let icon = <div className="w-5 h-5 rounded-full bg-slate-200 text-xs flex items-center justify-center font-mono">{index + 1}</div>;

                    if (isActive) {
                        statusColor = "bg-green-50 border-green-300 text-green-900 shadow-sm ring-1 ring-green-200";
                        icon = <div className="w-5 h-5 relative flex items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </div>;
                    } else if (isCompleted) {
                        statusColor = "bg-blue-50 border-blue-200 text-blue-700 opacity-70";
                        icon = <CheckCircle className="w-5 h-5 text-blue-500" />;
                    }

                    return (
                        <div key={`${name}-${round}`} className={`flex items-center justify-between p-3 rounded-lg border ${statusColor} transition-all`}>
                            <div className="flex items-center gap-3">
                                {icon}
                                <div>
                                    <div className="font-semibold text-sm">{name}</div>
                                    <div className="text-xs opacity-75">Round {round}</div>
                                </div>
                            </div>
                            {isActive && <div className="text-xs font-bold bg-green-200 text-green-800 px-2 py-1 rounded">ACTIVE</div>}
                        </div>
                    );
                })}
            </div>
        );
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Controls */}
                <div className="lg:col-span-2 space-y-6">

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
                                    <div className="text-sm text-slate-600 mb-2">Simulate draft start date</div>
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

                    {/* Simulation Tools */}
                    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden p-6">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4 text-indigo-700">
                            <TestTube className="w-5 h-5" />
                            Simulation Tools
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={startFullTest}
                                className="flex flex-col items-center justify-center p-6 border-2 border-indigo-100 bg-indigo-50 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all group text-center"
                            >
                                <Play className="w-8 h-8 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-indigo-900">Start 10-Minute Test</span>
                                <span className="text-xs text-indigo-700 mt-1">Runs compressed schedule (2min intervals)</span>
                            </button>

                            <button
                                onClick={() => setShowQuickTest(!showQuickTest)}
                                className="flex flex-col items-center justify-center p-6 border-2 border-purple-100 bg-purple-50 rounded-xl hover:border-purple-300 hover:shadow-md transition-all group text-center"
                            >
                                <Zap className="w-8 h-8 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-purple-900">Quick Email Test</span>
                                <span className="text-xs text-purple-700 mt-1">{showQuickTest ? 'Hide Buttons' : 'Show Manual Triggers'}</span>
                            </button>
                        </div>

                        {showQuickTest && (
                            <div className="mt-4 grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                                {['evening', 'day2', 'final', 'urgent'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => sendTestReminder(type)}
                                        className="px-3 py-2 bg-white border border-purple-200 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors"
                                    >
                                        Send {type} email
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Advanced Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            onClick={handleSyncDraftStatus}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all text-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh Schedule
                        </button>

                        <button
                            onClick={toggleSystemFreeze}
                            className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-xl font-medium transition-all text-sm ${isSystemFrozen ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                        >
                            <AlertTriangle className="w-4 h-4" />
                            {isSystemFrozen ? 'Maintenance ON' : 'Maintenance Mode'}
                        </button>

                        {IS_SITE_OWNER && (
                            <button
                                onClick={handleWipeDatabase}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium hover:bg-red-100 transition-all text-sm"
                            >
                                <Users className="w-4 h-4" />
                                Wipe Data
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Column: Schedule Monitor */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xl overflow-hidden flex flex-col h-[700px]">
                    <div className="bg-slate-900 p-4 border-b border-slate-800 flex items-center justify-between">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-green-400" />
                            Schedule Monitor
                        </h3>
                        {monitorData && (
                            <div className="text-xs font-mono text-slate-400">
                                {monitorData.phase}
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-slate-100 border-b border-slate-200">
                        <div className="flex justify-between items-center text-xs text-slate-500 uppercase tracking-wider font-semibold">
                            <span>Shareholder</span>
                            <span>Status</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden bg-slate-50 p-4">
                        {renderShareholderList()}
                    </div>

                    <div className="p-4 bg-white border-t border-slate-200 text-xs text-center text-slate-500">
                        Shows calculated state based on live bookings. <br />
                        Last synced: {lastSyncTime}
                    </div>
                </div>
            </div>
        </div>
    );
}
