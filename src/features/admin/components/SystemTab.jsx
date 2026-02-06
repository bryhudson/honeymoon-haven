import React, { useState, useEffect } from 'react';
import { Calendar, Shield, Settings, AlertTriangle, Clock, RefreshCw, ChevronDown, ChevronUp, Zap, TestTube, Play, Users, CheckCircle, ArrowRight, Info } from 'lucide-react';
import { collection, onSnapshot, getDocs, getDoc, Timestamp, writeBatch, updateDoc, deleteDoc } from 'firebase/firestore';
import { calculateDraftSchedule, getShareholderOrder } from '../../../lib/shareholders';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { useAuth } from '../../auth/AuthContext';

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
    format,
    shareholders = []
}) {
    const { currentUser } = useAuth();
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
                from: d.data().from?.toDate ? d.data().from.toDate() : new Date(d.data().from),
                to: d.data().to?.toDate ? d.data().to.toDate() : new Date(d.data().to),
                createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(d.data().createdAt)
            }));
            setBookings(loadedBookings);
        });
        return () => unsubscribe();
    }, [db]);

    // Recalculate monitor status whenever bookings or settings change
    useEffect(() => {
        const runCalculation = async () => {
            const schedule = calculateDraftSchedule(
                getShareholderOrder(2026),
                bookings,
                new Date(),
                simStartDate ? new Date(simStartDate) : undefined,
                fastTestingMode,
                !!simStartDate
            );
            setMonitorData(schedule);
            setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        };
        runCalculation();
        const interval = setInterval(runCalculation, 60000);
        return () => clearInterval(interval);
    }, [bookings, simStartDate, fastTestingMode]);

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
                {/* 1. Simulation & Testing Box (Restored) */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TestTube className="w-24 h-24 text-slate-900" />
                    </div>

                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <TestTube className="w-6 h-6 text-indigo-700" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Simulation & Testing</h3>
                            <p className="text-sm text-slate-500">Manage time travel and test modes</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        {/* A) Test Mode Toggle */}
                        <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-slate-700 text-sm">Operation Mode</span>
                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${isTestMode ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                    {isTestMode ? 'TEST MODE' : 'PRODUCTION'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mb-4 h-8">
                                {isTestMode ? "Emails redirected to Admin (Bryan)." : "Emails sent to REAL SHAREHOLDERS."}
                            </p>
                            <button
                                onClick={toggleTestMode}
                                className={`w-full py-2 rounded-lg font-bold text-xs transition-all ${isTestMode ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                            >
                                Switch to {isTestMode ? 'Production' : 'Test Mode'}
                            </button>
                        </div>

                        {/* B) Start Date Picker */}
                        <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-slate-700 text-sm">Draft Start Date</span>
                                <Clock className="w-4 h-4 text-slate-400" />
                            </div>
                            <p className="text-xs text-slate-500 mb-4 h-8">
                                Determines the "Day 0" for the draft schedule.
                            </p>
                            <input
                                type="datetime-local"
                                value={simStartDate}
                                onChange={(e) => {
                                    setSimStartDate(e.target.value);
                                    // Debounce or confirm? For now let's confirm to save interactions.
                                    // Actually, let's just save it on blur or have a save button?
                                    // User wants "Production Mode" to set date to April 12.
                                }}
                                onBlur={async (e) => {
                                    if (!e.target.value) return;
                                    try {
                                        const d = new Date(e.target.value);
                                        await updateDoc(doc(db, "settings", "general"), {
                                            draftStartDate: Timestamp.fromDate(d)
                                        });
                                        triggerAlert("Success", "Start date updated.");
                                    } catch (err) {
                                        triggerAlert("Error", "Failed to update date.");
                                    }
                                }}
                                className="w-full text-xs p-2 border rounded font-mono bg-white mb-2"
                            />
                        </div>

                        {/* C) Fast Testing Mode */}
                        <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-slate-700 text-sm">Fast Testing (1m = 1h)</span>
                                <Zap className={`w-4 h-4 ${fastTestingMode ? 'text-amber-500' : 'text-slate-300'}`} />
                            </div>
                            <button
                                onClick={() => {
                                    requireAuth("Toggle Fast Mode", "Enable rapid time simulation?", async () => {
                                        await updateDoc(doc(db, "settings", "general"), { fastTestingMode: !fastTestingMode });
                                        if (setFastTestingMode) setFastTestingMode(!fastTestingMode);
                                    });
                                }}
                                className={`w-full py-2 rounded-lg font-bold text-xs transition-all ${fastTestingMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-200 text-slate-500'}`}
                            >
                                {fastTestingMode ? "Active" : "Disabled"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Maintenance Mode</h3>
                            <p className="text-sm text-slate-500 mb-4">Toggle system-wide booking freeze.</p>
                        </div>
                        <button
                            onClick={toggleSystemFreeze}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${isSystemFrozen ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}
                        >
                            {isSystemFrozen ? "Disable Maintenance" : "Enable Maintenance"}
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-red-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-red-700 border-b border-red-50 pb-2 mb-4">Nuke Data</h3>
                            <p className="text-sm text-slate-500 mb-4">Permanently wipe all bookings and reset draft status.</p>
                        </div>
                        <button
                            onClick={handleWipeDatabase}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-bold text-sm hover:bg-red-200 transition-all"
                        >
                            Wipe Database
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
