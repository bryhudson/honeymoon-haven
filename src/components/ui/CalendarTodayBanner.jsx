import React, { useState, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';

// Live "today" readout for the season calendars. Date and current time are
// always shown in Pacific (America/Los_Angeles) to match the app's core
// timezone rule, and refresh every second so the clock never drifts. Rendered
// identically in the admin Calendar View and the shareholder Season Calendar so
// the two stay consistent.
export function CalendarTodayBanner() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const longDate = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }).format(now);

    const shortDate = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        weekday: 'short', month: 'short', day: 'numeric'
    }).format(now);

    // To the minute (per design decision), with the zone label (PDT/PST auto).
    const timeLabel = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    }).format(now);

    return (
        <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-white border border-slate-200 rounded-xl shadow-sm px-3.5 py-2">
            <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <CalendarDays className="w-5 h-5" />
                </div>
                <div className="leading-tight">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today</div>
                    <div className="text-sm font-semibold text-slate-800">
                        <span className="sm:hidden">{shortDate}</span>
                        <span className="hidden sm:inline">{longDate}</span>
                    </div>
                </div>
            </div>

            <div className="hidden sm:block w-px h-7 bg-slate-200" />

            <div className="flex items-center gap-2 pl-11 sm:pl-0">
                <span className="relative flex w-2 h-2" aria-hidden="true">
                    <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                    <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-sm font-semibold text-slate-800 tabular-nums">{timeLabel}</span>
            </div>
        </div>
    );
}
