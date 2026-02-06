import React, { useState, useEffect } from 'react';
import { Calendar, Shield, Settings, AlertTriangle, Clock, RefreshCw, ChevronDown, ChevronUp, Zap, TestTube, Play, Users, CheckCircle, ArrowRight, Info } from 'lucide-react';
import { collection, onSnapshot, getDocs, getDoc, Timestamp, writeBatch, updateDoc, deleteDoc } from 'firebase/firestore';
import { calculateDraftSchedule, getShareholderOrder } from '../../../lib/shareholders';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { useAuth } from '../../auth/AuthContext';

export function SystemTab({
    isTestMode,
    isSystemFrozen,
    toggleSystemFreeze,
    handleActivateProductionMode,
    handleActivateTestMode,
    IS_SITE_OWNER
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
                                - <strong>Data:</strong> Persistent (No Wipes)
                            </p>
                            <button
                                onClick={handleActivateProductionMode}
                                disabled={!isTestMode}
                                className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${!isTestMode ? 'bg-green-600 text-white shadow-lg shadow-green-500/30 cursor-default' : 'bg-white text-slate-700 border border-slate-200 hover:border-green-500 hover:text-green-700 shadow-sm'}`}
                            >
                                {!isTestMode ? "✓ Active" : "Activate Production"}
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
            </div>
        </div>
    );
}
