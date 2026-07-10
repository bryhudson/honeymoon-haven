import React, { useState, useEffect } from 'react';
import { Calendar, List, Download } from 'lucide-react';

// One swatch in the borderless legend. Solid colour by default; a diagonal
// split for turnover days.
function LegendSwatch({ item }) {
    const style = item.split
        ? { background: `linear-gradient(135deg, ${item.split[0]} 0 47%, #ffffff 47% 53%, ${item.split[1]} 53% 100%)` }
        : { background: item.color };
    return <span className="w-3 h-3 rounded-[3px] shrink-0 border border-black/5" style={style} />;
}

// Shared, consistent header for the Bookings calendar in both the shareholder
// and admin views. Design intent: one title, a quiet live Pacific "today" line,
// and the ONLY button-styled controls being the Calendar/List toggle and an
// optional Export. The legend is quiet, borderless info shown in calendar mode
// only. Keeping this in one component is what keeps the two views consistent.
export function CalendarHeader({ title, viewMode, onViewModeChange, onExport, legendItems = [] }) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const dateLabel = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }).format(now);
    const timeLabel = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    }).format(now);

    const toggleBtn = (mode, Icon, label) => (
        <button
            onClick={() => onViewModeChange(mode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                viewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Title + quiet live "today" line (Pacific) */}
                <div className="flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-slate-800 shrink-0" />
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 leading-tight">{title}</h2>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            <span className="relative flex w-2 h-2 shrink-0" aria-hidden="true">
                                <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                                <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                            </span>
                            <span className="tabular-nums">{dateLabel} &middot; {timeLabel}</span>
                        </div>
                    </div>
                </div>

                {/* Controls: the only button-styled elements in the header */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    {onExport && (
                        <button
                            onClick={onExport}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                            title="Download CSV"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                    )}
                    <div className="bg-slate-100 p-1 rounded-lg flex items-center shadow-inner">
                        {toggleBtn('calendar', Calendar, 'Calendar')}
                        {toggleBtn('list', List, 'List')}
                    </div>
                </div>
            </div>

            {/* Quiet borderless legend, calendar mode only */}
            {viewMode === 'calendar' && legendItems.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-500">
                    {legendItems.map((item) => (
                        <span key={item.label} className="inline-flex items-center gap-2">
                            <LegendSwatch item={item} />
                            {item.label}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
