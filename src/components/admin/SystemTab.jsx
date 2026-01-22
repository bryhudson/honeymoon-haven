import React from 'react';
import { Calendar, Shield, Settings, AlertTriangle, Clock } from 'lucide-react';

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
    // Calculate if we're before Feb 15, 2026
    const now = new Date();
    const feb15 = new Date(2026, 1, 15);
    const isBeforeFeb15 = now < feb15;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Settings className="w-8 h-8 text-slate-800" />
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">System Configuration</h2>
                    <p className="text-sm text-slate-500">Manage testing modes and system settings</p>
                </div>
            </div>

            {/* Mode Status Banner */}
            {isBeforeFeb15 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-blue-900 text-lg mb-1">Testing Mode Active Until Feb 15, 2026</h3>
                            <p className="text-blue-700 text-sm leading-relaxed">
                                The system is configured for testing. All emails redirect to bryan.m.hudson@gmail.com for safety.
                                After Feb 15, the system automatically switches to production mode.
                            </p>
                            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-blue-600">
                                <Clock className="w-4 h-4" />
                                Current default: Normal Testing (Today @ 6 AM, 48h windows)
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!isBeforeFeb15 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-green-100 rounded-xl">
                            <Shield className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-green-900 text-lg mb-1">Production Mode</h3>
                            <p className="text-green-700 text-sm">
                                System is live! Draft starts March 1, 2026 at 10:00 AM. Emails sent to real shareholders.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Testing Modes */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                        <h3 className="font-bold text-slate-900">Draft Start Mode</h3>
                        <p className="text-xs text-slate-500 mt-1">Choose when the draft system begins</p>
                    </div>

                    <div className="p-6 space-y-3">
                        <button
                            onClick={() => {
                                requireAuth(
                                    "Set to Production",
                                    "Reset system to March 1, 2026 (production start date)?",
                                    async () => {
                                        const productionDate = new Date(2026, 2, 1, 10, 0, 0);
                                        setSimStartDate(format(productionDate, "yyyy-MM-dd'T'HH:mm"));
                                        const count = await performWipe(productionDate);
                                        await setDoc(doc(db, "settings", "general"), {
                                            draftStartDate: productionDate,
                                            bypassTenAM: false,
                                            fastTestingMode: false
                                        }, { merge: true });
                                        setFastTestingMode(false);
                                        triggerAlert("Production Mode", `Reset to March 1, 2026. Database wiped (${count} records).`);
                                    }
                                );
                            }}
                            className="w-full p-4 text-left rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-slate-900 group-hover:text-slate-700">Production</div>
                                    <div className="text-sm text-slate-500">March 1, 2026 at 10:00 AM</div>
                                </div>
                                <div className="text-2xl">🏖️</div>
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                requireAuth(
                                    "Set to Testing Mode",
                                    "Reset system to Today @ 6:00 AM for testing?",
                                    async () => {
                                        const today = new Date();
                                        today.setHours(6, 0, 0, 0);
                                        setSimStartDate(format(today, "yyyy-MM-dd'T'HH:mm"));
                                        const count = await performWipe(today);
                                        await setDoc(doc(db, "settings", "general"), {
                                            draftStartDate: today,
                                            bypassTenAM: false,
                                            fastTestingMode: false
                                        }, { merge: true });
                                        setFastTestingMode(false);
                                        triggerAlert("Testing Mode", `Reset to Today @ 6 AM. 48h windows. DB wiped (${count} records).`);
                                    }
                                );
                            }}
                            className="w-full p-4 text-left rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-all group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-blue-900">Normal Testing (Default)</div>
                                    <div className="text-sm text-blue-600">Today @ 6 AM • 48-hour windows</div>
                                </div>
                                <div className="text-2xl">🧪</div>
                            </div>
                        </button>

                        <button
                            onClick={toggleFastTestingMode}
                            className={`w-full p-4 text-left rounded-xl border-2 transition-all group ${fastTestingMode
                                    ? 'border-orange-200 bg-orange-50'
                                    : 'border-slate-200 hover:border-orange-200 hover:bg-orange-50'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className={`font-bold ${fastTestingMode ? 'text-orange-900' : 'text-slate-900 group-hover:text-orange-900'}`}>
                                        Fast Testing {fastTestingMode && '(Active)'}
                                    </div>
                                    <div className={`text-sm ${fastTestingMode ? 'text-orange-600' : 'text-slate-500 group-hover:text-orange-600'}`}>
                                        10-minute turn windows
                                    </div>
                                </div>
                                <div className="text-2xl">⚡</div>
                            </div>
                        </button>

                        <div className="pt-3 border-t">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-1">Current Setting</div>
                            <div className="text-sm font-mono bg-slate-50 px-3 py-2 rounded border text-slate-600">
                                {simStartDate || 'Default (March 1, 2026)'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Settings */}
                <div className="space-y-6">
                    {/* Email Test Mode */}
                    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                            <h3 className="font-bold text-slate-900">Email Settings</h3>
                            <p className="text-xs text-slate-500 mt-1">Control email recipients</p>
                        </div>

                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-slate-900 flex items-center gap-2">
                                        Test Mode
                                        {isTestMode && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] uppercase font-bold">ON</span>}
                                    </div>
                                    <div className="text-sm text-slate-600 mt-1">
                                        {isTestMode
                                            ? "All emails → bryan.m.hudson@gmail.com"
                                            : "Emails sent to real shareholders"}
                                    </div>
                                    {isBeforeFeb15 && isTestMode && (
                                        <div className="mt-2 text-xs text-blue-600 font-medium">
                                            ✓ Auto-enabled for safety until Feb 15, 2026
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={toggleTestMode}
                                    className={`px-5 py-2.5 rounded-lg font-bold text-xs transition-all ${isTestMode
                                            ? 'bg-green-600 text-white hover:bg-green-700'
                                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                        }`}
                                >
                                    {isTestMode ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Maintenance Mode */}
                    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                            <h3 className="font-bold text-slate-900">Maintenance</h3>
                            <p className="text-xs text-slate-500 mt-1">Block shareholder access</p>
                        </div>

                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-slate-900">Maintenance Mode</div>
                                    <div className="text-sm text-slate-600 mt-1">
                                        {isSystemFrozen ? "Shareholders blocked" : "System accessible"}
                                    </div>
                                </div>
                                <button
                                    onClick={toggleSystemFreeze}
                                    className={`px-5 py-2.5 rounded-lg font-bold text-xs transition-all ${isSystemFrozen
                                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                        }`}
                                >
                                    {isSystemFrozen ? 'ACTIVE' : 'OFF'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    {IS_SITE_OWNER && (
                        <div className="bg-red-50 rounded-2xl border-2 border-red-200 shadow-sm overflow-hidden">
                            <div className="bg-red-100 px-6 py-4 border-b border-red-200 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                                <h3 className="font-bold text-red-900">Danger Zone</h3>
                            </div>

                            <div className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-red-900">Wipe Database</div>
                                        <div className="text-sm text-red-700 mt-1">Delete all bookings & reset</div>
                                    </div>
                                    <button
                                        onClick={handleWipeDatabase}
                                        className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition-all"
                                    >
                                        WIPE
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
