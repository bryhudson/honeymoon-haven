import React, { useState } from 'react';
import {
    Droplets,
    Zap,
    ThermometerSnowflake,
    Flame,
    AlertCircle,
    CheckCircle2,
    DoorOpen,
    Trash2,
    Wind,
    Key,
    ListChecks,
    BookOpen,
    LifeBuoy,
    Trees,
    Car,
    Moon,
    Wine,
    Waves
} from 'lucide-react';

export function TrailerGuide() {
    const [activeTab, setActiveTab] = useState('check-in');

    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Header / Tabs */}
            <div className="flex border-b">
                <button
                    onClick={() => setActiveTab('check-in')}
                    className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold text-xs md:text-sm uppercase tracking-wider transition-colors ${activeTab === 'check-in'
                        ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                >
                    <LogIn className="w-4 h-4" />
                    Check In
                </button>
                <div className="w-px bg-slate-200"></div>
                <button
                    onClick={() => setActiveTab('resort-rules')}
                    className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold text-xs md:text-sm uppercase tracking-wider transition-colors ${activeTab === 'resort-rules'
                        ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                >
                    <BookOpen className="w-4 h-4" />
                    Guest Rules
                </button>
                <div className="w-px bg-slate-200"></div>
                <button
                    onClick={() => setActiveTab('check-out')}
                    className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold text-xs md:text-sm uppercase tracking-wider transition-colors ${activeTab === 'check-out'
                        ? 'bg-rose-50 text-rose-700 border-b-2 border-rose-500'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                >
                    <LogOut className="w-4 h-4" />
                    Check Out
                </button>
            </div>

            <div className="p-4 md:p-8">
                {activeTab === 'check-in' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0 mt-1">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">Power & Water Heater</h4>
                                <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                    Turn on the water heater switch in the bathroom to <strong>ELECTRIC</strong>.
                                    <span className="block text-rose-600 font-semibold mt-1 text-xs uppercase tracking-wide">⚠️ Do not use the GAS switch.</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg shrink-0 mt-1">
                                <ThermometerSnowflake className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">Refrigerator</h4>
                                <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                    Check that the fridge is set to <strong>ELECTRIC</strong>.
                                    <span className="block text-rose-600 font-semibold mt-1 text-xs uppercase tracking-wide">⚠️ Do not use the GAS switch.</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg shrink-0 mt-1">
                                <Droplets className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">Water Tanks (Grey & Black)</h4>
                                <div className="text-slate-600 text-sm mt-1 space-y-2 leading-relaxed">
                                    <p>Check levels on the monitor panel in the bathroom. <span className="italic text-slate-400">(Note: Sensors may read half-full incorrectly).</span></p>
                                    <p><strong>Every 48 Hours:</strong> Empty both tanks into the septic. Always drain <strong>Black (Sewer)</strong> first, followed by <strong>Grey (Sink/Bath)</strong>.</p>
                                    <p className="font-medium text-slate-800">Close drain lines when finished to prevent smells.</p>
                                    <p className="text-xs bg-slate-100 p-2 rounded border border-slate-200">
                                        Note: Grey water fills fast! If tanks are full upon arrival, please notify a cabin owner.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0 mt-1">
                                <Flame className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">Stove & Oven</h4>
                                <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                    Both can be lit using the push-button igniter or a match.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg shrink-0 mt-1">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">Issues?</h4>
                                <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                    If propane tanks are empty (check front of trailer), consult your cabin owner for replacement/reimbursement.
                                    <br />
                                    Please report any initial issues immediately to a cabin owner.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'resort-rules' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        {/* Access Codes */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                                <div className="p-2 bg-white border border-slate-100 shadow-sm rounded-lg">
                                    <Key className="w-5 h-5 text-slate-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gate Code</p>
                                    <p className="text-lg font-black text-slate-900 tracking-widest font-mono">9816</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                                <div className="p-2 bg-white border border-slate-100 shadow-sm rounded-lg">
                                    <DoorOpen className="w-5 h-5 text-slate-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shed Code</p>
                                    <p className="text-lg font-black text-slate-900 tracking-widest font-mono">store</p>
                                </div>
                            </div>
                        </div>

                        {/* Rules Grid */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-sky-100 text-sky-600 rounded-lg shrink-0 mt-0.5">
                                    <Waves className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm">Hot Tub & Safety</h4>
                                    <ul className="text-xs text-slate-600 mt-1 space-y-1">
                                        <li>• Age <strong>5+</strong> only. Supervise kids.</li>
                                        <li>• <span className="text-rose-600 font-bold">No food or drink</span> (water/alcohol ok).</li>
                                        <li>• Always <strong>replace the lid</strong> after use.</li>
                                        <li>• No lifeguards on duty at beach/dock.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg shrink-0 mt-0.5">
                                    <Trash2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm">Waste & Septic</h4>
                                    <ul className="text-xs text-slate-600 mt-1 space-y-1">
                                        <li>• <strong>Septic Sensitive:</strong> 1-ply paper only.</li>
                                        <li>• <span className="text-rose-600 font-bold">NO FLUSHABLE WIPES</span> or products.</li>
                                        <li>• Sort Garbage vs. Recycling bins.</li>
                                        <li>• Returnables (cans/bottles) in small bins.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0 mt-0.5">
                                    <Trees className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm">Firewood & Outdoors</h4>
                                    <ul className="text-xs text-slate-600 mt-1 space-y-1">
                                        <li>• Split wood as you use it.</li>
                                        <li>• Respect provincial fire bans.</li>
                                        <li>• Do <strong>not</strong> use fences as drying racks.</li>
                                        <li>• Clean up beach/fire pit areas after use.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                                    <Moon className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm">Community</h4>
                                    <ul className="text-xs text-slate-600 mt-1 space-y-1">
                                        <li>• <strong>Quiet Time:</strong> 11:00 PM — 8:00 AM.</li>
                                        <li>• Speed Limit: <strong>10 km/h</strong> max.</li>
                                        <li>• Park in assigned spots only.</li>
                                        <li>• Be considerate of neighbors!</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'check-out' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0 mt-1">
                                <LogOut className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">Systems Off</h4>
                                <ul className="text-slate-600 text-sm mt-1 space-y-1 list-disc list-inside">
                                    <li>Turn <strong>OFF</strong> Water Heater switch (Electric).</li>
                                    <li>Ensure Furnace / Air Conditioning is <strong>OFF</strong>.</li>
                                    <li>Turn <strong>OFF</strong> all inside/outside lights.</li>
                                    <li>Retract awning.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg shrink-0 mt-1">
                                <Droplets className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">Final Tank Drain (Critical)</h4>
                                <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                    <strong>1.</strong> Drain Black Water (Sewer).<br />
                                    <strong>2.</strong> Drain Grey Water (Sink/Bath).<br />
                                    <strong>3.</strong> Close valves.<br />
                                    <strong>4.</strong> Add septic cleaner to toilet and flush once.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg shrink-0 mt-1">
                                <ThermometerSnowflake className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">Refrigerator</h4>
                                <ul className="text-slate-600 text-sm mt-1 space-y-1">
                                    <li>Turn <strong>OFF</strong> (unless new renter arrives tomorrow).</li>
                                    <li>Clean and wipe out fridge & microwave.</li>
                                    <li className="font-bold text-rose-600">⚠️ Leave fridge doors OPEN if turned off to prevent mold.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg shrink-0 mt-1">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">Cleaning</h4>
                                <ul className="text-slate-600 text-sm mt-1 space-y-1 list-disc list-inside">
                                    <li>Clean floors, carpets, sinks, toilet counters.</li>
                                    <li>Fold sheets and clean all surfaces.</li>
                                    <li>Give used rags/towels to your cabin owner.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-sky-100 text-sky-600 rounded-lg shrink-0 mt-1">
                                <Wind className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">Ventilation (Summer)</h4>
                                <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                    Leave several windows cracked and ensure the bathroom ceiling vent is left <strong>open</strong>.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg shrink-0 mt-1">
                                <Key className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">Lock Up</h4>
                                <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                    Ensure front and back doors are locked. Return key to shed workbench or cabin owner.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
