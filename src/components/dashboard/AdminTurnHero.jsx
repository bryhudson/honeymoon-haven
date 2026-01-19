import React from 'react';
import { Calendar, Clock, CheckCircle, Info, AlertTriangle, PlayCircle, XCircle, Mail, DollarSign, Bell } from 'lucide-react';
import { format } from 'date-fns';

export function AdminTurnHero({
    activeTurn,
    drafts,

}) {
    if (!activeTurn) return null;

    // Find any active draft for this user
    const activeDraft = drafts.find(b => b.shareholderName === activeTurn.name && !b.isFinalized && b.type !== 'cancelled');

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-xl relative overflow-hidden text-white">
            {/* Background Flair - distinct from Shareholder (Purple/Indigo theme) */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-indigo-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="space-y-4 text-center lg:text-left max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/50 text-indigo-200 text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
                        <Clock className="w-3 h-3" />
                        System Status: Active Turn
                    </div>

                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                        {activeTurn.name}
                    </h1>

                    <div className="text-lg text-slate-300 leading-relaxed">
                        {activeDraft ? (
                            <div className="flex items-center justify-center lg:justify-start gap-2 text-indigo-300 font-medium">
                                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
                                Draft in progress ({activeDraft.cabinNumber}, {format(activeDraft.from.toDate(), 'MMM d')} - {format(activeDraft.to.toDate(), 'MMM d')})
                            </div>
                        ) : (
                            <p>Current active shareholder. Waiting for selection.</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-4">
                    {/* No manual remind button - automated emails handled by system */}
                </div>
            </div>
        </div>
    );
}
