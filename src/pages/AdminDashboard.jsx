import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CABIN_OWNERS, DRAFT_CONFIG } from '../lib/shareholders';
import { db } from '../lib/firebase';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { ConfirmationModal } from '../components/ConfirmationModal';

export function AdminDashboard() {
    const [actionLog, setActionLog] = useState("");

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

    const toggleTestMode = () => {
        const current = localStorage.getItem('DRAFT_MODE');
        const newMode = current === 'TEST' ? 'PROD' : 'TEST';
        localStorage.setItem('DRAFT_MODE', newMode);
        window.location.reload();
    };

    const resetOnboarding = () => {
        localStorage.removeItem('hhr_tour_seen');
        triggerAlert("Tour Reset", "The onboarding tour has been reset for your browser. It will appear the next time you visit the dashboard.");
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
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                            <div>
                                <h3 className="font-semibold">Draft Environment</h3>
                                <p className="text-xs text-muted-foreground">
                                    Current: <span className="font-mono font-bold">{DRAFT_CONFIG.IS_TEST_MODE ? 'STAGING (Test)' : 'PRODUCTION'}</span>
                                </p>
                            </div>
                            <button
                                onClick={toggleTestMode}
                                className={`px-4 py-2 rounded-md text-sm font-bold shadow-sm transition-colors ${DRAFT_CONFIG.IS_TEST_MODE
                                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                    : 'bg-slate-800 text-white hover:bg-slate-700'
                                    }`}
                            >
                                {DRAFT_CONFIG.IS_TEST_MODE ? 'Switch to Production' : 'Switch to Staging'}
                            </button>
                        </div>

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
                    </div>
                    {actionLog && <p className="mt-4 text-sm font-mono text-muted-foreground">{actionLog}</p>}
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
