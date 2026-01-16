import React, { useState, useEffect } from 'react';
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
    LogOut,
    LogIn,
    Circle
} from 'lucide-react';

const CHECK_IN_ITEMS = [
    {
        id: 'in-power',
        icon: Zap,
        color: 'blue',
        title: 'Power & Water Heater',
        content: (
            <span>
                Turn on the water heater switch in the bathroom to <strong>ELECTRIC</strong>.
                <span className="block text-rose-600 font-bold mt-1 text-xs uppercase tracking-wide">⚠️ Do not use the GAS switch.</span>
            </span>
        )
    },
    {
        id: 'in-fridge',
        icon: ThermometerSnowflake,
        color: 'cyan',
        title: 'Refrigerator',
        content: (
            <span>
                Check that the fridge is set to <strong>ELECTRIC</strong>.
                <span className="block text-rose-600 font-bold mt-1 text-xs uppercase tracking-wide">⚠️ Do not use the GAS switch.</span>
            </span>
        )
    },
    {
        id: 'in-tanks',
        icon: Droplets,
        color: 'purple',
        title: 'Water Tanks (Grey & Black)',
        content: (
            <span className="space-y-1 block">
                <span>Check levels on the monitor panel in the bathroom.</span>
                <span className="block text-xs bg-slate-100 p-2 rounded border border-slate-200 mt-1">
                    <strong>Every 48 Hours:</strong> Drain <strong>Black (Sewer)</strong> first, then <strong>Grey</strong>. Close valves after.
                </span>
            </span>
        )
    },
    {
        id: 'in-stove',
        icon: Flame,
        color: 'amber',
        title: 'Stove & Oven',
        content: 'Both can be lit using the push-button igniter or a match.'
    },
    {
        id: 'in-issues',
        icon: AlertCircle,
        color: 'orange',
        title: 'Report Issues',
        content: 'Report any initial issues or empty propane tanks to a cabin owner immediately.'
    }
];

const CHECK_OUT_ITEMS = [
    {
        id: 'out-off',
        icon: LogOut,
        color: 'slate',
        title: 'Systems Off',
        content: (
            <ul className="list-disc list-inside space-y-0.5">
                <li>Turn <strong>OFF</strong> Water Heater (Electric).</li>
                <li>Ensure Furnace / AC is <strong>OFF</strong>.</li>
                <li>Turn <strong>OFF</strong> lights & Retract awning.</li>
            </ul>
        )
    },
    {
        id: 'out-drain',
        icon: Droplets,
        color: 'purple',
        title: 'Final Tank Drain (Critical)',
        content: (
            <span>
                <strong>1.</strong> Drain Black. <strong>2.</strong> Drain Grey. <strong>3.</strong> Close valves. <strong>4.</strong> Add septic cleaner & flush.
            </span>
        )
    },
    {
        id: 'out-fridge',
        icon: ThermometerSnowflake,
        color: 'cyan',
        title: 'Refrigerator',
        content: (
            <span>
                Turn <strong>OFF</strong>. Clean & wipe out.
                <span className="block text-rose-600 font-bold mt-1 text-xs uppercase tracking-wide">⚠️ Leave doors OPEN to prevent mold.</span>
            </span>
        )
    },
    {
        id: 'out-clean',
        icon: Trash2,
        color: 'emerald',
        title: 'Cleaning',
        content: 'Clean floors, sinks, toilets. Fold sheets. Give used rags to cabin owner.'
    },
    {
        id: 'out-vent',
        icon: Wind,
        color: 'sky',
        title: 'Ventilation (Summer)',
        content: 'Leave windows cracked and bathroom ceiling vent <strong>OPEN</strong>.'
    },
    {
        id: 'out-lock',
        icon: Key,
        color: 'rose',
        title: 'Lock Up',
        content: 'Lock front & back doors. Return key to shed or cabin owner.'
    }
];

export function TrailerGuide() {
    const [activeTab, setActiveTab] = useState('check-in');
    const [checkedItems, setCheckedItems] = useState({});

    // Load state from local storage on mount
    useEffect(() => {
        const saved = localStorage.getItem('hhr_trailer_checklist');
        if (saved) {
            try {
                setCheckedItems(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse checklist state", e);
            }
        }
    }, []);

    const toggleItem = (id) => {
        const newState = { ...checkedItems, [id]: !checkedItems[id] };
        setCheckedItems(newState);
        localStorage.setItem('hhr_trailer_checklist', JSON.stringify(newState));
    };

    const currentItems = activeTab === 'check-in' ? CHECK_IN_ITEMS : CHECK_OUT_ITEMS;
    const completedCount = currentItems.filter(i => checkedItems[i.id]).length;
    const totalCount = currentItems.length;
    const progress = Math.round((completedCount / totalCount) * 100);

    const isComplete = completedCount === totalCount;

    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
            {/* Header / Tabs */}
            <div className="flex border-b">
                <button
                    onClick={() => setActiveTab('check-in')}
                    className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold text-sm md:text-base transition-colors relative ${activeTab === 'check-in'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                >
                    <LogIn className="w-5 h-5" />
                    CHECK IN
                    {activeTab === 'check-in' && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
                    )}
                </button>
                <div className="w-px bg-slate-200"></div>
                <button
                    onClick={() => setActiveTab('check-out')}
                    className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold text-sm md:text-base transition-colors relative ${activeTab === 'check-out'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                >
                    <LogOut className="w-5 h-5" />
                    CHECK OUT
                    {activeTab === 'check-out' && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />
                    )}
                </button>
            </div>

            {/* Progress Bar */}
            <div className="bg-slate-100 h-2 w-full">
                <div
                    className={`h-full transition-all duration-500 ease-out ${activeTab === 'check-in' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="px-4 py-2 bg-slate-50 border-b flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Progress</span>
                <span>{completedCount} / {totalCount} Completed</span>
            </div>

            {/* Checklist Items */}
            <div className="p-4 md:p-6 space-y-3">
                {currentItems.map((item) => {
                    const isChecked = !!checkedItems[item.id];
                    const Icon = item.icon;

                    // Dynamic classes based on checked state
                    const containerClass = isChecked
                        ? `border-${activeTab === 'check-in' ? 'emerald' : 'rose'}-200 bg-${activeTab === 'check-in' ? 'emerald' : 'rose'}-50/50`
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm bg-white';

                    const iconBgClass = isChecked
                        ? `bg-${activeTab === 'check-in' ? 'emerald' : 'rose'}-100 text-${activeTab === 'check-in' ? 'emerald' : 'rose'}-600`
                        : `bg-${item.color}-100 text-${item.color}-600`;

                    return (
                        <button
                            key={item.id}
                            onClick={() => toggleItem(item.id)}
                            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-4 group relative overflow-hidden ${containerClass}`}
                        >
                            <div className={`p-2 rounded-lg shrink-0 transition-colors ${iconBgClass}`}>
                                <Icon className="w-5 h-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className={`font-bold text-base transition-colors ${isChecked ? 'text-slate-600 line-through decoration-slate-400' : 'text-slate-900'}`}>
                                    {item.title}
                                </h4>
                                <div className={`text-sm mt-1 leading-relaxed transition-opacity ${isChecked ? 'opacity-50' : 'text-slate-600'}`}>
                                    {item.content}
                                </div>
                            </div>

                            <div className={`mt-1 shrink-0 transition-all duration-300 ${isChecked
                                ? `text-${activeTab === 'check-in' ? 'emerald' : 'rose'}-600 scale-110`
                                : 'text-slate-300 group-hover:text-slate-400'}`}>
                                {isChecked ? (
                                    <CheckCircle2 className="w-6 h-6 fill-white" />
                                ) : (
                                    <Circle className="w-6 h-6" />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {isComplete && (
                <div className={`mx-4 mb-6 p-4 rounded-xl text-center animate-in zoom-in duration-300 ${activeTab === 'check-in'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                    <p className="font-bold text-lg">🎉 All Set!</p>
                    <p className="text-sm opacity-90">You have completed the {activeTab === 'check-in' ? 'Check-In' : 'Check-Out'} checklist.</p>
                </div>
            )}
        </div>
    );
}
