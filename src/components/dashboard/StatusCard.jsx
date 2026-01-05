import React from 'react';
import { format } from 'date-fns';
import { Countdown } from './Countdown';

export function StatusCard({ status, children }) {
    return (
        <div className="bg-card p-4 md:p-6 rounded-xl shadow-md border-l-4 border-l-primary flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex-1 w-full">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    📅 Current Booking Status
                </h2>

                <div className="mt-4 mb-6">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-bold mb-1">Current Turn</p>
                    <p className="text-3xl md:text-4xl font-extrabold text-primary tracking-tight">{status.activePicker || "None"}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                        <p className="text-sm text-muted-foreground">
                            Phase: <span className="font-medium text-foreground">{status.phase === 'PRE_DRAFT' ? 'Pending Start' : status.phase?.replace('_', ' ')}</span>
                        </p>
                        {status.isGracePeriod && status.officialStart && (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20 uppercase tracking-tighter">
                                ✨ Early Access (Starts {format(status.officialStart, 'MMM d, h:mm a')})
                            </span>
                        )}
                    </div>
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
