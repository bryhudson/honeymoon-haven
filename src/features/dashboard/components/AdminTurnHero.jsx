import React from 'react';
import { Calendar, Clock, CheckCircle, Info, AlertTriangle, PlayCircle, XCircle, Mail, DollarSign, Bell } from 'lucide-react';
import { format, intervalToDuration } from 'date-fns';

export function AdminTurnHero({
    activeTurn,
    drafts,
    isTestMode = false,
    isSystemFrozen = false
}) {
    const [now, setNow] = React.useState(new Date());

    // Update timer every minute to keep countdown alive
    React.useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);
    // 1. System Maintenance Overlay (Highest Priority)
    if (isSystemFrozen) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left relative z-10">
                    <div className="p-4 bg-amber-100 rounded-full text-amber-600 shrink-0">
                        <AlertTriangle className="w-10 h-10" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-amber-900 mb-2">System Maintenance Active</h2>
                        <p className="text-amber-800/80 text-lg">
                            The booking system is currently frozen. Users cannot make new bookings or pass their turn.
                            <br />
                            <span className="text-sm font-bold mt-1 block text-amber-900/60">
                                Use "End Maintenance" in System Config to resume.
                            </span>
                        </p>
                    </div>
                </div>
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-200 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
            </div>
        );
    }

    if (!activeTurn) return null;


    return (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-xl relative overflow-hidden text-white">
            {/* Background Flair - distinct from Shareholder (Purple/Indigo theme) */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-indigo-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="space-y-4 text-center lg:text-left max-w-2xl">
                    <div className="flex gap-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/50 text-indigo-200 text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
                            <Clock className="w-3 h-3" />
                            System Status: Active Turn
                        </div>
                        {isTestMode ? (
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/50 text-blue-200 text-xs font-bold uppercase tracking-wider border border-blue-500/30">
                                <AlertTriangle className="w-3 h-3" />
                                Test Mode
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/50 text-emerald-200 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
                                <CheckCircle className="w-3 h-3" />
                                Production Mode
                            </div>
                        )}
                    </div>

                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                        {activeTurn.name}
                    </h1>

                    <div className="text-lg text-slate-300 leading-relaxed">
                        <p>Current active shareholder. Waiting for selection.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-4">

                    {/* DEADLINE TIMER CARD */}
                    {activeTurn.end && (
                        <div className="bg-indigo-500/20 border border-indigo-400/30 rounded-xl p-4 min-w-[300px] text-center lg:text-left">
                            <div className="flex flex-col md:flex-row items-center justify-center lg:justify-start gap-4">
                                <div className="p-2 bg-indigo-500/30 rounded-lg shrink-0">
                                    <Clock className="w-5 h-5 text-indigo-200" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-1">
                                        Complete Selection By
                                    </div>
                                    <div className="text-xl font-bold text-white tabular-nums tracking-tight">
                                        {format(new Date(activeTurn.end), 'MMM d, h:mm a')}
                                    </div>
                                    <div className="flex items-center justify-center lg:justify-start mt-2">
                                        <span className="inline-flex items-center px-3 py-1 bg-indigo-500/20 text-indigo-200 border-indigo-400/30 text-xs font-bold rounded-lg border">
                                            Ends in {(() => {
                                                const end = new Date(activeTurn.end);
                                                if (end <= now) return 'Ended';
                                                const diff = intervalToDuration({ start: now, end });
                                                const parts = [];
                                                if (diff.days > 0) parts.push(`${diff.days}d`);
                                                if (diff.hours > 0) parts.push(`${diff.hours}h`);
                                                if (diff.minutes > 0) parts.push(`${diff.minutes}m`);
                                                return parts.join(' ') || '< 1m';
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
