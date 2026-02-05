import React from 'react';
import { format } from 'date-fns';
import { Countdown } from './Countdown';
import { Tent } from 'lucide-react';
import { CABIN_OWNERS } from '../../lib/shareholders';

export function StatusCard({ status, children }) {
    const isPreDraft = status.phase === 'PRE_DRAFT';
    const targetDate = isPreDraft ? status.draftStart : status.windowEnds;
    const label = isPreDraft ? "Draft Starts" : "Time Remaining";

    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 overflow-hidden transition-all duration-300">
            {/* Header: Badges & System Status */}
            <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200">
                        <span className={`h-2 w-2 rounded-full ${status.activePicker ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                        {status.phase === 'PRE_DRAFT' ? 'Pre-Draft' : status.phase?.replace('_', ' ')}
                    </span>
                </div>
                {status.officialStart && (
                    <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                        <span>🕒</span>
                        {status.isSeasonStart ? 'Season Starts' : 'Window Starts'}: <span className="text-slate-700 font-bold">{format(status.officialStart, 'MMM d, h:mm a')}</span>
                    </div>
                )}
            </div>

            {/* Hero Content: Active Turn & Timer */}
            <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-8 relative">
                {/* Active Player (Left) */}
                <div className="flex-1 w-full md:w-auto relative z-10">
                    <div className="mb-2 flex items-center gap-2">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Current Turn
                        </h2>
                        {status.activePicker && (
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                            </span>
                        )}
                    </div>

                    {status.activePicker ? (
                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex flex-col items-center justify-center h-14 w-14 rounded-2xl bg-orange-50 border border-orange-100 text-orange-700 shadow-sm">
                                <Tent className="w-6 h-6 mb-0.5" />
                                <span className="text-xs font-bold">#{CABIN_OWNERS.find(o => o.name === status.activePicker)?.cabin || "?"}</span>
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight leading-tight">
                                    {status.activePicker}
                                </h1>
                                <div className="md:hidden inline-flex items-center gap-1 mt-1 text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                                    <Tent className="w-3 h-3" />
                                    Cabin #{CABIN_OWNERS.find(o => o.name === status.activePicker)?.cabin || "?"}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-2xl md:text-3xl font-bold text-slate-300 italic">
                            Waiting for start...
                        </div>
                    )}
                </div>

                {/* Divider (Mobile only) */}
                <div className="w-full h-px bg-slate-100 md:hidden"></div>

                {/* Timer (Right) */}
                {targetDate && !isNaN(new Date(targetDate)) && (
                    <div className="flex-shrink-0 text-center md:text-right bg-slate-50/80 md:bg-transparent p-4 md:p-0 rounded-xl md:rounded-none w-full md:w-auto border md:border-0 border-slate-100 shadow-sm md:shadow-none">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                            {label}
                        </div>
                        <div className="font-variant-numeric tabular-nums text-slate-900">
                            {(() => {
                                const d = new Date(targetDate);
                                if (d.getHours() === 0 && d.getMinutes() === 0) {
                                    return (
                                        <div className="flex flex-col md:items-end">
                                            <span className="text-sm font-bold text-slate-600 mb-1">{format(d, 'MMM d')}, Midnight</span>
                                        </div>
                                    );
                                }
                                return <div className="text-sm font-bold text-slate-600 mb-1">{format(d, 'MMM d, h:mm a')}</div>;
                            })()}
                            <Countdown targetDate={targetDate} key={targetDate instanceof Date ? targetDate.getTime() : targetDate} />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer: Up Next & Actions */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">

                {/* Up Next Helper */}
                <div className="flex items-center gap-2 text-slate-500 w-full md:w-auto justify-center md:justify-start">
                    {status.nextPicker && !isPreDraft ? (
                        <>
                            <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider">Up Next:</span>
                            <span className="font-bold text-slate-700">{status.nextPicker}</span>
                            <span className="text-[10px] text-slate-400 italic">(starts 10am)</span>
                        </>
                    ) : (
                        <span className="text-slate-400 italic text-xs">No upcoming turns scheduled</span>
                    )}
                </div>

                {/* Actions */}
                {children && (
                    <div className="flex gap-2 w-full md:w-auto">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}
