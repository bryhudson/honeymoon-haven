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
    const [showGuide, setShowGuide] = useState(false); // Toggle for Admin Guide
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
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Troubleshooting Zone
                        </h3>
                        <button
                            onClick={() => setShowGuide(!showGuide)}
                            className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-wider hover:text-indigo-600 transition-colors"
                        >
                            <Info className="w-3 h-3" />
                            {showGuide ? "Hide Guide" : "What do these buttons do?"}
                        </button>
                    </div>

                    {showGuide && (
                        <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-slate-500" />
                                    Maintenance Mode
                                </div>
                                <p className="text-slate-600 mt-1">
                                    <strong>What it does:</strong> Instantly locks the entire platform. Users will see a "Under Maintenance" screen and cannot log in or make bookings.<br />
                                    <strong>When to use:</strong> During critical updates, if a major bug is found, or between seasons.<br />
                                    <strong>Production Impact:</strong> 🔴 <strong>HIGH.</strong> Blocks all public access.
                                </p>
                            </div>
                            <div className="border-t border-slate-200 pt-3">
                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4 text-slate-500" />
                                    Reset Schedule State
                                </div>
                                <p className="text-slate-600 mt-1">
                                    <strong>What it does:</strong> Forces the system to re-read all bookings and re-calculate the draft schedule. It does NOT delete any data.<br />
                                    <strong>When to use:</strong> If the dashboard says "Waiting..." but it should be someone's turn, or if the "Active Picker" looks wrong.<br />
                                    <strong>Production Impact:</strong> 🟢 <strong>NONE.</strong> Safe to use anytime. It just refreshes the logic.
                                </p>
                            </div>
                            <div className="border-t border-slate-200 pt-3">
                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-red-500" />
                                    Wipe Data
                                </div>
                                <p className="text-slate-600 mt-1">
                                    <strong>What it does:</strong> ⚠️ <strong>PERMANENT DELETION.</strong> Deletes all bookings, clears all notification logs, and resets the simulation to Day 1.<br />
                                    <strong>When to use:</strong> Only when preparing for a brand new season or restarting a test simulation from scratch.<br />
                                    <strong>Production Impact:</strong> 🔴 <strong>CATASTROPHIC.</strong> Do not use during a live season.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Maintenance Mode */}
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={() => setConfirmMaintenance(true)}
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
                                onClick={() => setConfirmReset(true)}
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
