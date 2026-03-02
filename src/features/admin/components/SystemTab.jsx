import React, { useState, useEffect } from 'react';
import { Calendar, Shield, Settings, AlertTriangle, Clock, RefreshCw, ChevronDown, ChevronUp, Zap, TestTube, Play, Users, CheckCircle, ArrowRight, Info, Trash2 } from 'lucide-react';
import { collection, onSnapshot, getDocs, getDoc, Timestamp, writeBatch, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { calculateDraftSchedule, getShareholderOrder } from '../../../lib/shareholders';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { useAuth } from '../../auth/AuthContext';
import { getAvailableBackups, restoreBackup, deleteBackup } from '../services/backupService';
import { db } from '../../../lib/firebase';

export function SystemTab({
    isTestMode,
    isSystemFrozen,
    toggleSystemFreeze,
    handleActivateProductionMode,
    handleActivateTestMode,
    IS_SITE_OWNER,
    triggerAlert
}) {
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
                {/* 1. Operation Mode (Two-Mode System) */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Zap className="w-6 h-6 text-indigo-700" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Operation Mode</h3>
                            <p className="text-sm text-slate-500">
                                Current Status:
                                <span className={`ml-2 px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full ${isTestMode ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                    {isTestMode ? 'TEST MODE' : 'PRODUCTION'}
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 transition-all">
                        {/* Production Card */}
                        <div className={`p-6 rounded-xl border-2 transition-all ${!isTestMode ? 'border-green-500 bg-green-50/50' : 'border-slate-100 bg-slate-50 hover:border-green-200'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                    <CheckCircle className={`w-5 h-5 ${!isTestMode ? 'text-green-600' : 'text-slate-400'}`} />
                                    Production Mode
                                </h4>
                            </div>
                            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                                - <strong>Start Date:</strong> April 13, 2026<br />
                                - <strong>Emails:</strong> Sent to REAL SHAREHOLDERS<br />
                                - <strong>Action:</strong> <span className="text-red-600 font-bold">WIPES DB ON ACTIVATION</span>
                            </p>
                            <button
                                onClick={handleActivateProductionMode}
                                className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${!isTestMode ? 'bg-green-600 text-white shadow-lg shadow-green-500/30 hover:bg-green-700' : 'bg-white text-slate-700 border border-slate-200 hover:border-green-500 hover:text-green-700 shadow-sm'}`}
                            >
                                {!isTestMode ? "↻ Reset & Start Production" : "Activate Production (Wipe DB)"}
                            </button>
                        </div>

                        {/* Test Mode Card */}
                        <div className={`p-6 rounded-xl border-2 transition-all ${isTestMode ? 'border-amber-500 bg-amber-50/50' : 'border-slate-100 bg-slate-50 hover:border-amber-200'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                    <TestTube className={`w-5 h-5 ${isTestMode ? 'text-amber-600' : 'text-slate-400'}`} />
                                    Testing Mode
                                </h4>
                            </div>
                            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                                - <strong>Start Date:</strong> Today @ 10:00 AM<br />
                                - <strong>Emails:</strong> Redirected to Admin<br />
                                - <strong>Action:</strong> <span className="text-red-600 font-bold">WIPES DATABASE ON ACTIVATION</span>
                            </p>
                            <button
                                onClick={handleActivateTestMode}
                                disabled={!IS_SITE_OWNER}
                                className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${isTestMode ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 hover:bg-amber-600' : 'bg-white text-slate-700 border border-slate-200 hover:border-amber-500 hover:text-amber-700 shadow-sm'}`}
                            >
                                {isTestMode ? "↻ Reset & Wipe Database" : "Activate & Wipe DB"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Maintenance Mode */}
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

                {/* 3. Data Recovery Zone (New) */}
                <RecoveryZone
                    restoreBackup={restoreBackup}
                    getAvailableBackups={getAvailableBackups}
                    triggerAlert={triggerAlert || console.log}
                />
            </div>
        </div>
    );
}

function RecoveryZone({ restoreBackup, getAvailableBackups, triggerAlert }) {
    const { currentUser, reauthenticateUser } = useAuth();
    const [backups, setBackups] = useState([]);
    const [selectedBackups, setSelectedBackups] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null); // { type: 'restore'|'delete', id, count, isBulk }

    const loadBackups = async () => {
        setIsLoading(true);
        const data = await getAvailableBackups();
        setBackups(data);
        setSelectedBackups([]); // Clear selection on reload
        setIsLoading(false);
    };

    const handleRestore = async (password) => {
        if (!confirmAction) return;
        const { id, count } = confirmAction;

        try {
            if (password) {
                await reauthenticateUser(password);
            } else {
                triggerAlert("Error", "Password is required");
                return;
            }
            await restoreBackup(id);
            triggerAlert("Success", `Restored ${count} bookings from ${id}.`);
            loadBackups(); // Refresh list potentially
        } catch (e) {
            console.error("Restore Error:", e);
            if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
                triggerAlert("Error", "Invalid password. Restore aborted.");
            } else {
                triggerAlert("Error", e.message);
            }
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedBackups(backups.map(b => b.timestampId));
        } else {
            setSelectedBackups([]);
        }
    };

    const handleSelectBackup = (id) => {
        setSelectedBackups(prev => {
            if (prev.includes(id)) {
                return prev.filter(p => p !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleDelete = async () => {
        if (!confirmAction) return;

        try {
            if (confirmAction.isBulk) {
                await Promise.all(selectedBackups.map(id => deleteBackup(id)));
                triggerAlert("Success", `${selectedBackups.length} backups deleted.`);
            } else {
                await deleteBackup(confirmAction.id);
                triggerAlert("Success", `Backup ${confirmAction.id} deleted.`);
            }
            loadBackups();
        } catch (e) {
            triggerAlert("Error", "Delete failed: " + e.message);
        }
        setConfirmAction(null);
    };

    // Load available backups on mount
    useEffect(() => { loadBackups(); }, []);

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Data Recovery Zone</h3>
                    <p className="text-sm text-slate-500">Restore points created automatically before wipes or via weekly schedule.</p>
                </div>
                <button onClick={loadBackups} className="text-indigo-600 text-xs font-bold hover:underline">
                    ↻ Refresh List
                </button>
            </div>

            {/* Bulk Action Bar */}
            {selectedBackups.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 font-bold text-sm">
                            {selectedBackups.length} Selected
                        </div>
                        <p className="text-sm text-indigo-900">
                            Backups selected for deletion.
                        </p>
                    </div>
                    <button
                        onClick={() => setConfirmAction({ type: 'delete', isBulk: true })}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-all shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Selection
                    </button>
                </div>
            )}

            {isLoading ? (
                <p className="text-xs text-slate-400 italic">Loading available backups...</p>
            ) : backups.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-lg text-center border border-dashed border-slate-200">
                    <p className="text-xs text-slate-400">No backup snapshots found.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Select All Checkbox */}
                    <div className="flex items-center gap-2 px-3 py-1">
                        <input
                            type="checkbox"
                            checked={selectedBackups.length === backups.length && backups.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                            id="selectAllBackups"
                        />
                        <label htmlFor="selectAllBackups" className="text-xs font-bold text-slate-500 cursor-pointer">Select All Snapshots</label>
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                        {backups.map((b) => (
                            <div key={b.timestampId} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg transition-colors gap-3 ${selectedBackups.includes(b.timestampId) ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedBackups.includes(b.timestampId)}
                                        onChange={() => handleSelectBackup(b.timestampId)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                                    />
                                    <div>
                                        <p className="font-mono text-xs font-bold text-slate-700">{b.timestampId}</p>
                                        <p className="text-[10px] text-slate-500">
                                            {b.count} bookings • {b.type === 'manual_wipe_safety' ? 'Safety Auto-Archive' : b.type === 'scheduled_weekly' ? 'Weekly Scheduled Backup' : 'Manual'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                    <button
                                        onClick={() => setConfirmAction({ type: 'delete', id: b.timestampId, isBulk: false })}
                                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-400 text-[10px] font-bold uppercase rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        onClick={() => setConfirmAction({ type: 'restore', id: b.timestampId, count: b.count, isBulk: false })}
                                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                                    >
                                        Restore
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Secure Confirmation Modals */}
            <ConfirmationModal
                isOpen={confirmAction?.type === 'restore'}
                onClose={() => setConfirmAction(null)}
                onConfirm={handleRestore}
                title="🔒 Secure Restore"
                message={`You are about to restore backup ${confirmAction?.id}.\n\nThis will DELETE all current live data and replace it with this snapshot.\n\nEnter your Google Account password (${currentUser?.email || 'Admin'}) to proceed.`}
                isDanger={true}
                confirmText="AUTHENTICATE & RESTORE"
                requireInput={true}
                inputType="password"
            />

            <ConfirmationModal
                isOpen={confirmAction?.type === 'delete'}
                onClose={() => setConfirmAction(null)}
                onConfirm={handleDelete}
                title={confirmAction?.isBulk ? "Delete Multiple Backups?" : "Delete Backup Snapshot"}
                message={confirmAction?.isBulk
                    ? `Are you sure you want to permanently delete ${selectedBackups.length} backup snapshots?\n\nThis action cannot be undone.`
                    : `Are you sure you want to permanently delete backup ${confirmAction?.id}?\n\nThis action cannot be undone.`}
                isDanger={true}
                confirmText={confirmAction?.isBulk ? "DELETE ALL" : "DELETE BACKUP"}
                requireTyping="delete"
            />
        </div>
    );
}
