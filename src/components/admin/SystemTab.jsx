import React, { useState, useEffect } from 'react';
import { Calendar, Shield, Settings, AlertTriangle, Clock, RefreshCw, ChevronDown, ChevronUp, Zap, TestTube, Play, Users, CheckCircle, ArrowRight, Info } from 'lucide-react';
import { collection, onSnapshot, getDocs, getDoc, Timestamp } from 'firebase/firestore';
import { calculateDraftSchedule, getShareholderOrder } from '../../lib/shareholders';
import { ConfirmationModal } from '../ConfirmationModal';
import { useAuth } from '../../contexts/AuthContext';

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
    const { currentUser } = useAuth();

    const [lastSyncTime, setLastSyncTime] = useState('Never');
    const [monitorData, setMonitorData] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [showTimeTravel, setShowTimeTravel] = useState(false); // Toggle for advanced date picker
    const [confirmMaintenance, setConfirmMaintenance] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);

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
            </div>

            <div className="space-y-8">
                {/* 1. Maintenance & Troubleshooting Zone */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Settings className="w-4 h-4 text-slate-400" />
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Troubleshooting Zone
                        </h3>
                    </div>

                    <div className="space-y-4">
                        {/* Maintenance Mode */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <AlertTriangle className={`w-5 h-5 ${isSystemFrozen ? 'text-red-600' : 'text-slate-600'}`} />
                                    <h4 className="font-bold text-slate-900">Maintenance Mode</h4>
                                </div>
                                <p className="text-sm text-slate-500 leading-relaxed mb-2">
                                    Instantly locks the platform. Users see an "Under Maintenance" screen.
                                    Use during critical updates.
                                </p>
                                <div className="flex items-center gap-2 text-xs font-medium">
                                    <span className="text-slate-400">Production Impact:</span>
                                    <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded">🔴 High - Blocks Access</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setConfirmMaintenance(true)}
                                className={`shrink-0 w-full md:w-48 justify-center px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm flex items-center gap-2 ${isSystemFrozen
                                    ? 'bg-red-600 text-white hover:bg-red-700 border border-transparent'
                                    : 'bg-slate-900 text-white hover:bg-slate-800 border border-transparent'
                                    }`}
                            >
                                {isSystemFrozen ? 'Deactivate Mode' : 'Activate Mode'}
                            </button>
                        </div>

                        {/* Reset Schedule State */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <RefreshCw className="w-5 h-5 text-slate-600" />
                                    <h4 className="font-bold text-slate-900">Reset Schedule State</h4>
                                </div>
                                <p className="text-sm text-slate-500 leading-relaxed mb-2">
                                    Forces a re-calculation of the draft schedule based on current bookings.
                                    Use if the dashboard is "stuck" or showing the wrong active picker.
                                </p>
                                <div className="flex items-center gap-2 text-xs font-medium">
                                    <span className="text-slate-400">Production Impact:</span>
                                    <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded">🟢 None - Safe</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setConfirmReset(true)}
                                className="shrink-0 w-full md:w-48 justify-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all shadow-sm border border-transparent flex items-center gap-2 pt-2.5"
                            >
                                Recalculate State
                            </button>
                        </div>

                        {/* Wipe Data (Owner Only) */}
                        {IS_SITE_OWNER && (
                            <div className="bg-red-50/50 rounded-xl border border-red-100 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Users className="w-5 h-5 text-red-600" />
                                        <h4 className="font-bold text-red-900">Wipe Database</h4>
                                    </div>
                                    <p className="text-sm text-red-800/70 leading-relaxed mb-2">
                                        Permanently deletes ALL bookings and logs. Resets simulation to Day 1.
                                        Only use when starting a fresh season.
                                    </p>
                                    <div className="flex items-center gap-2 text-xs font-medium">
                                        <span className="text-red-400/80">Production Impact:</span>
                                        <span className="text-red-700 bg-red-100 px-2 py-0.5 rounded">⚠️ Catastrophic</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleWipeDatabase}
                                    className="shrink-0 w-full md:w-48 justify-center px-5 py-2.5 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-all shadow-sm border border-transparent flex items-center gap-2"
                                >
                                    Nuke & Reset
                                </button>
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
                            className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${!isTestMode
                                ? 'border-green-500 bg-green-50 ring-1 ring-green-500'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    <Shield className={`w-5 h-5 ${!isTestMode ? 'text-green-600' : 'text-slate-400'}`} />
                                </div>
                                {!isTestMode && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Active</span>}
                            </div>
                            <h4 className={`font-bold text-lg ${!isTestMode ? 'text-green-900' : 'text-slate-700'}`}>Production Mode</h4>
                            <p className="text-sm text-slate-500 mt-1">
                                System Live: Feb 20, 2026<br />
                                Official Start: March 1, 2026 @ 10am PST<br />
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
                            className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${isTestMode
                                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    <TestTube className={`w-5 h-5 ${isTestMode ? 'text-indigo-600' : 'text-slate-400'}`} />
                                </div>
                                {isTestMode && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Active</span>}
                            </div>
                            <h4 className={`font-bold text-lg ${isTestMode ? 'text-indigo-900' : 'text-slate-700'}`}>Test Simulation</h4>
                            <div className="text-sm text-slate-500 mt-1 mb-3">
                                Start: Today @ 10:00 AM<br />
                                <span className="text-indigo-600 font-medium text-xs">Safe Mode On (Emails -&gt; Admin only)</span>
                            </div>

                            {/* Time Travel Removed per User Request (Simplification) */}
                            {simStartDate !== '' && (
                                <div className="mt-3 pt-3 border-t border-indigo-100">
                                    <p className="text-[10px] text-indigo-400 italic">
                                        Simulation running. Check Live Turn Monitor for status.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ConfirmationModal
                isOpen={confirmMaintenance}
                onClose={() => setConfirmMaintenance(false)}
                onConfirm={toggleSystemFreeze}
                title={isSystemFrozen ? "Disable Maintenance Mode?" : "Enable Maintenance Mode?"}
                message={isSystemFrozen
                    ? "Users will regain access immediately."
                    : "This will LOCK the platform. No one will be able to log in or book.\nUse this before deployment or critical updates."}
                isDanger={!isSystemFrozen}
                confirmText={isSystemFrozen ? "Deactivate Maintenance" : "Activate Maintenance"}
                requireTyping="maintenance"
            />

            <ConfirmationModal
                isOpen={confirmReset}
                onClose={() => setConfirmReset(false)}
                onConfirm={handleSyncDraftStatus}
                title="Reset Schedule State?"
                message="This will force the system to re-read all bookings and re-calculate who should be active.\n\nType 'reset' to confirm."
                isDanger={false}
                confirmText="Reset State"
                requireTyping="reset"
            />
        </div>
    );
}
