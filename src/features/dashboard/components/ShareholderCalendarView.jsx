import React from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, startOfDay } from 'date-fns';
import { getHolidayForDate, getEventsForDate } from '../../../lib/seasonEvents';
import { getDayOccupancy } from '../../../lib/availability';
import { getSeasonMonths, getCurrentSeasonYear } from '../../../lib/shareholders';

// Diagonal split (top-left = departing, bottom-right = arriving) for turnover days.
const splitBg = (depart, arrive) =>
    `linear-gradient(135deg, ${depart} 0 calc(50% - 0.5px), #ffffff calc(50% - 0.5px) calc(50% + 0.5px), ${arrive} calc(50% + 0.5px) 100%)`;

export function ShareholderCalendarView({ bookings }) {
    // Bookable season months (May - September), auto-rolling each year.
    const seasonYear = getCurrentSeasonYear();
    const months = getSeasonMonths(seasonYear);

    const renderMonth = (monthDate) => {
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);
        const days = eachDayOfInterval({ start, end });

        const startDay = start.getDay();
        const blanks = Array(startDay).fill(null);

        return (
            <div key={monthDate.toString()} className="bg-white rounded-xl border shadow-sm flex flex-col h-full relative hover:z-50">
                <div className="bg-slate-50 p-3 border-b text-center rounded-t-xl">
                    <h3 className="font-bold text-slate-800">{format(monthDate, 'MMMM yyyy')}</h3>
                </div>
                <div className="p-2 grid grid-cols-7 gap-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                        <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase">{d}</div>
                    ))}

                    {blanks.map((_, i) => <div key={`blank-${i}`} />)}

                    {days.map(day => {
                        const { occupant, departing } = getDayOccupancy(day, bookings);
                        const isTurnover = !!occupant && !!departing;
                        const isLoneCheckout = !!departing && !occupant;
                        const holiday = getHolidayForDate(day);
                        const events = getEventsForDate(day);
                        const hasEvent = events.length > 0;
                        const hasInfo = occupant || departing || holiday || hasEvent;
                        const isPast = startOfDay(day) < startOfDay(new Date());

                        // Priority: past > turnover > occupied night > holiday > event > default
                        let bgClass = "bg-white hover:bg-slate-50 text-slate-700";
                        let cellStyle;
                        if (isPast) {
                            bgClass = (occupant || isTurnover)
                                ? "bg-slate-200 text-slate-500"
                                : "bg-slate-50 text-slate-400";
                        } else if (isTurnover) {
                            bgClass = "text-white hover:opacity-90";
                            cellStyle = { background: splitBg('#4ade80', '#16a34a') };
                        } else if (occupant) {
                            bgClass = "bg-green-500 text-white hover:bg-green-600";
                        } else if (holiday && hasEvent) {
                            bgClass = "bg-red-50 text-red-700 hover:bg-red-100 ring-1 ring-red-200";
                        } else if (holiday) {
                            bgClass = "bg-red-50 text-red-700 hover:bg-red-100 ring-1 ring-red-200";
                        } else if (hasEvent) {
                            bgClass = "bg-purple-50 text-purple-700 hover:bg-purple-100 ring-1 ring-purple-200";
                        }

                        return (
                            <div
                                key={day.toString()}
                                style={cellStyle}
                                className={`
                                    aspect-square rounded-md flex items-center justify-center text-xs font-medium cursor-default transition-colors relative group
                                    ${bgClass}
                                `}
                            >
                                <span style={isTurnover ? { textShadow: '0 1px 2px rgba(0,0,0,0.55)' } : undefined}>
                                    {format(day, 'd')}
                                </span>

                                {/* Lone check-out: the night is free, flag the morning departure */}
                                {isLoneCheckout && !isPast && (
                                    <span
                                        className="absolute top-0 left-0 w-0 h-0"
                                        style={{ borderTop: '9px solid #4ade80', borderRight: '9px solid transparent' }}
                                    />
                                )}

                                {/* Dot indicators - stacked top-right */}
                                <span className={`absolute top-0 right-0 flex gap-px p-px ${isPast ? 'opacity-40' : ''}`}>
                                    {holiday && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                                    {hasEvent && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                                </span>

                                {/* Unified hover tooltip - renders all applicable layers */}
                                {hasInfo && (
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 w-max max-w-[200px] bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-lg pointer-events-none text-center space-y-0">
                                        {/* Layer 1: Occupancy (turnover shows both out + in) */}
                                        {isTurnover ? (
                                            <>
                                                <div>
                                                    <div className="font-bold text-amber-300">⬆ Out: {departing.shareholderName}</div>
                                                    <div className="opacity-75">Cabin #{departing.cabinNumber}</div>
                                                </div>
                                                <div className="border-t border-white/20 mt-1 pt-1">
                                                    <div className="font-bold text-green-300">⬇ In: {occupant.shareholderName}</div>
                                                    <div className="opacity-75">Cabin #{occupant.cabinNumber}</div>
                                                </div>
                                            </>
                                        ) : occupant ? (
                                            <div>
                                                <div className="font-bold">{occupant.shareholderName}</div>
                                                <div className="opacity-75">Cabin #{occupant.cabinNumber}</div>
                                            </div>
                                        ) : departing ? (
                                            <div>
                                                <div className="font-bold text-amber-300">⬆ Checks out today</div>
                                                <div className="opacity-75">{departing.shareholderName} · Cabin #{departing.cabinNumber}</div>
                                            </div>
                                        ) : null}

                                        {/* Layer 2: Holiday (with separator if occupancy info exists) */}
                                        {holiday && (
                                            <div className={(occupant || departing) ? "border-t border-white/20 mt-1 pt-1" : ""}>
                                                <div className="font-semibold text-red-300">{holiday.name}</div>
                                                <div className="opacity-60 text-[9px]">Canadian Holiday</div>
                                            </div>
                                        )}

                                        {/* Layer 3: Events (with separator if any above exists) */}
                                        {events.map((evt, i) => (
                                            <div key={i} className={(occupant || departing || holiday) ? "border-t border-white/20 mt-1 pt-1" : (i > 0 ? "border-t border-white/20 mt-1 pt-1" : "")}>
                                                <div className="font-semibold text-purple-300">{evt.name}</div>
                                                {evt.subtitle && <div className="text-amber-300 text-[9px]">{evt.subtitle}</div>}
                                                <div className="opacity-60 text-[9px]">{evt.location}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{seasonYear} Season Calendar</h2>
                    <p className="text-sm text-muted-foreground">Visual snapshot of any claimed dates for the season.</p>
                </div>
                <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-600 bg-white p-2 rounded-lg border shadow-sm h-fit">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-green-500"></div>
                        <span>Confirmed Booking</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ background: splitBg('#4ade80', '#16a34a') }}></div>
                        <span>Turnover (out / in)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-red-50 ring-1 ring-red-200 relative">
                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
                        </div>
                        <span>Holiday</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-purple-50 ring-1 ring-purple-200 relative">
                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-purple-500" />
                        </div>
                        <span>Festival / Event</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {months.map(m => renderMonth(m))}
            </div>
        </div>
    );
}
