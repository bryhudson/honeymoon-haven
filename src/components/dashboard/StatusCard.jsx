import React from 'react';
import { format } from 'date-fns';
import { Countdown } from './Countdown';
import { CABIN_OWNERS } from '../../lib/shareholders';

export function StatusCard({ status, children }) {
    return (
        <div className={`bg-card p-4 md:p-6 rounded-xl shadow-md border-l-4 flex flex-col md:flex-row justify-between items-center gap-4 transition-colors duration-500 ${status.isGracePeriod ? 'border-l-amber-400 bg-amber-50/10' : 'border-l-primary'}`}>
            <div className="flex-1 w-full relative">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        📅 Current Booking Status
                    </h2>
                    {status.activePicker && (
                        <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                        </span>
                    )}
                </div>

                <div className="mt-4 mb-6 relative">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-black mb-1 opacity-70">Current Turn</p>
                    <p className="text-3xl md:text-5xl font-black text-primary tracking-tighter drop-shadow-sm">
                        {status.activePicker || "None"}
                        {status.activePicker && (
                            <span className="text-lg md:text-2xl font-medium text-muted-foreground ml-3 opacity-60">
                                Cabin #{CABIN_OWNERS.find(o => o.name === status.activePicker)?.cabin || "?"}
                            </span>
                        )}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 uppercase tracking-wide border border-slate-200">
                            Phase: {status.phase === 'PRE_DRAFT' ? 'Pending' : status.phase?.replace('_', ' ')}
                        </span>

                        {status.isGracePeriod && status.officialStart && !status.isSeasonStart && (
                            <span className="inline-flex items-center rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200 uppercase tracking-wide animate-in fade-in zoom-in duration-500">
                                ✨ Early Access
                            </span>
                        )}
                        {status.isSeasonStart && (
                            <span className="inline-flex items-center rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200 uppercase tracking-wide animate-in fade-in zoom-in duration-500">
                                🚀 Season Start
                            </span>
                        )}
                    </div>

                    {status.isGracePeriod && status.officialStart && (
                        <p className={`text-[11px] font-bold mt-2 flex items-center gap-1.5 p-2 rounded-lg border w-fit ${status.isSeasonStart ? 'bg-blue-50/50 border-blue-100/50 text-blue-700' : 'bg-amber-50/50 border-amber-100/50 text-amber-700'}`}>
                            <span>🕒</span>
                            {status.isSeasonStart ? (
                                <>Trailer Bookings for {status.officialStart.getFullYear()} Starts <strong>{format(status.officialStart, 'MMM d, h:mm a')}</strong></>
                            ) : (
                                <>Official 48-hour window starts <strong>{format(status.officialStart, 'MMM d, h:mm a')}</strong></>
                            )}
                        </p>
                    )}
                </div>

                {/* Action Buttons Zone */}
                {children && (
                    <div className="flex gap-3 mt-4">
                        {children}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-8 bg-muted/30 p-4 rounded-lg w-full md:w-auto justify-center md:justify-start">
                {(() => {
                    const isPreDraft = status.phase === 'PRE_DRAFT';
                    const targetDate = isPreDraft ? status.draftStart : status.windowEnds;
                    const label = isPreDraft ? "Draft Starts" : "Time Remaining";

                    if (!targetDate || isNaN(new Date(targetDate))) return null;

                    return (
                        <div className="text-center border-t md:border-t-0 pt-4 md:pt-0 md:border-l md:pl-8">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{label}</p>
                            <p className="text-sm font-medium text-foreground mb-1">
                                {format(targetDate, 'MMM d, h:mm a')}
                            </p>
                            <Countdown targetDate={targetDate} key={targetDate instanceof Date ? targetDate.getTime() : targetDate} />
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
