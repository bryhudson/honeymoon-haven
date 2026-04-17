import React, { useState, useEffect } from 'react';
import { Settings, Trash2, Zap, Mail } from 'lucide-react';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { useAuth } from '../../auth/AuthContext';
import { getAvailableBackups, restoreBackup, deleteBackup } from '../services/backupService';
import { IS_PROD, IS_DEV_ENV, PROJECT_ID } from '../../../lib/env';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export function SystemTab({
    isSystemFrozen,
    toggleSystemFreeze,
    handleResetDraft,
    triggerAlert
}) {
    const [devEmailEnabled, setDevEmailEnabled] = useState(false);
    useEffect(() => {
        if (!IS_DEV_ENV) return;
        const unsub = onSnapshot(doc(db, 'settings/general'), (snap) => {
            setDevEmailEnabled(snap.exists() && snap.data()?.devEmailEnabled === true);
        });
        return () => unsub();
    }, []);

    const toggleDevEmail = async () => {
        try {
            await setDoc(doc(db, 'settings/general'), { devEmailEnabled: !devEmailEnabled }, { merge: true });
            triggerAlert?.('Success', !devEmailEnabled ? 'Dev emails ENABLED — all sends will redirect to the super admin inbox.' : 'Dev emails DISABLED — sends will be skipped.');
        } catch (e) {
            triggerAlert?.('Error', e.message);
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
                        <p className="text-sm text-slate-500">Manage schedule and system status</p>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {/* 1. Environment Banner */}
                <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Zap className="w-6 h-6 text-indigo-700" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Environment</h3>
                            <p className="text-sm text-slate-500">
                                Project:
                                <span className={`ml-2 px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full ${IS_PROD ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {IS_PROD ? 'PRODUCTION' : `DEV (${PROJECT_ID})`}
                                </span>
                            </p>
                            {IS_DEV_ENV && (
                                <p className="text-xs text-slate-500 mt-1">
                                    {devEmailEnabled
                                        ? 'Dev emails ENABLED — sends redirect to the super admin inbox.'
                                        : 'Dev emails DISABLED — all sends are skipped.'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Dev-only: Email Redirect Toggle */}
                {IS_DEV_ENV && (
                    <div className="bg-white p-4 sm:p-6 rounded-xl border border-amber-200 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                                    <Mail className="w-5 h-5 text-amber-700" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">Dev Email Redirect</h3>
                                    <p className="text-sm text-slate-500 mt-1">When enabled, all outgoing emails redirect to the super admin inbox for testing. Disabled = sends are skipped entirely.</p>
                                </div>
                            </div>
                            <button
                                onClick={toggleDevEmail}
                                className={`shrink-0 px-4 py-2 rounded-lg font-bold text-sm transition-all ${devEmailEnabled ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            >
                                {devEmailEnabled ? 'Enabled' : 'Disabled'}
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. Dev-only: Reset Draft */}
                {IS_DEV_ENV && (
                    <div className="bg-white p-4 sm:p-6 rounded-xl border border-amber-200 shadow-sm">
                        <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Reset Draft (Dev Only)</h3>
                        <p className="text-sm text-slate-500 mb-4">Wipes bookings/logs and resets the clock to today @ 10am. Creates a backup first.</p>
                        <button
                            onClick={handleResetDraft}
                            className="px-4 py-2 bg-amber-500 text-white rounded-lg font-bold text-sm hover:bg-amber-600 shadow-sm"
                        >
                            ↻ Wipe & Reset Draft
                        </button>
                    </div>
                )}

                {/* 2. Maintenance Mode */}
                <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
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
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
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
