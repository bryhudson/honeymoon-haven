import React from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, startOfDay, isWithinInterval, isSameDay } from 'date-fns';

// 2026 Canadian Statutory Holidays (BC) within the March-October season
const CANADIAN_HOLIDAYS_2026 = [
    { date: new Date(2026, 2, 30), name: 'Good Friday' },
    { date: new Date(2026, 4, 18), name: 'Victoria Day' },
    { date: new Date(2026, 6, 1),  name: 'Canada Day 🇨🇦' },
    { date: new Date(2026, 7, 3),  name: 'BC Day' },
    { date: new Date(2026, 8, 7),  name: 'Labour Day' },
    { date: new Date(2026, 8, 30), name: 'National Day for Truth & Reconciliation' },
    { date: new Date(2026, 9, 12), name: 'Thanksgiving' },
];

// 2026 Summer Festivals & Events in the Cowichan Valley
const SUMMER_EVENTS_2026 = [
    {
        name: 'Cowichan Valley Bluegrass Festival',
        subtitle: '25th Anniversary!',
        from: new Date(2026, 5, 19), // June 19
        to: new Date(2026, 5, 21),   // June 21
        location: 'Laketown Ranch',
        color: 'purple',
    },
    {
        name: 'Sunfest Country Music Festival',
        from: new Date(2026, 6, 30), // July 30
        to: new Date(2026, 7, 2),    // August 2
        location: 'Laketown Ranch',
        color: 'purple',
    },

];

export function ShareholderCalendarView({ bookings }) {
    // 2026 Season: March - October
    const months = [
        new Date(2026, 2, 1), // March
        new Date(2026, 3, 1), // April
        new Date(2026, 4, 1), // May
        new Date(2026, 5, 1), // June
        new Date(2026, 6, 1), // July
        new Date(2026, 7, 1), // Aug
        new Date(2026, 8, 1), // Sept
        new Date(2026, 9, 1), // Oct
    ];

    // Helper to find booking for a specific date
    const getBookingForDate = (date) => {
        return bookings.find(b => {
            if (b.type === 'pass' || b.type === 'auto-pass' || b.type === 'cancelled') return false;
            if (!b.from || !b.to) return false;
            const start = b.from instanceof Date ? b.from : b.from.toDate ? b.from.toDate() : new Date(b.from);
            const end = b.to instanceof Date ? b.to : b.to.toDate ? b.to.toDate() : new Date(b.to);
            return isWithinInterval(startOfDay(date), { start: startOfDay(start), end: startOfDay(end) });
        });
    };

    // Helper to find holiday for a specific date
    const getHolidayForDate = (date) => {
        return CANADIAN_HOLIDAYS_2026.find(h => isSameDay(h.date, date));
    };

    // Helper to find events overlapping a specific date
    const getEventsForDate = (date) => {
        return SUMMER_EVENTS_2026.filter(e =>
            isWithinInterval(startOfDay(date), { start: startOfDay(e.from), end: startOfDay(e.to) })
        );
    };

    const renderMonth = (monthDate) => {
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);
        const days = eachDayOfInterval({ start, end });

        const startDay = start.getDay();
        const blanks = Array(startDay).fill(null);

        return (
            <div key={monthDate.toString()} className="bg-white rounded-xl border shadow-sm flex flex-col h-full relative">
                <div className="bg-slate-50 p-3 border-b text-center rounded-t-xl">
                    <h3 className="font-bold text-slate-800">{format(monthDate, 'MMMM yyyy')}</h3>
                </div>
                <div className="p-2 grid grid-cols-7 gap-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                        <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase">{d}</div>
                    ))}

                    {blanks.map((_, i) => <div key={`blank-${i}`} />)}

                    {days.map(day => {
                        const booking = getBookingForDate(day);
                        const holiday = getHolidayForDate(day);
                        const events = getEventsForDate(day);
                        const hasEvent = events.length > 0;
                        const hasInfo = booking || holiday || hasEvent;

                        // Priority: booking > holiday > event > default
                        let bgClass = "bg-white hover:bg-slate-50 text-slate-700";
                        if (booking) {
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
                                className={`
                                    aspect-square rounded-md flex items-center justify-center text-xs font-medium cursor-default transition-colors relative group
                                    ${bgClass}
                                `}
                            >
                                {format(day, 'd')}

                                {/* Dot indicators - stacked top-right */}
                                <span className="absolute top-0 right-0 flex gap-px p-px">
                                    {holiday && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                                    {hasEvent && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                                </span>

                                {/* Unified hover tooltip - renders all applicable layers */}
                                {hasInfo && (
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 w-max max-w-[200px] bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-lg pointer-events-none text-center space-y-0">
                                        {/* Layer 1: Booking */}
                                        {booking && (
                                            <div>
                                                <div className="font-bold">{booking.shareholderName}</div>
                                                <div className="opacity-75">Cabin #{booking.cabinNumber}</div>
                                            </div>
                                        )}

                                        {/* Layer 2: Holiday (with separator if booking exists) */}
                                        {holiday && (
                                            <div className={booking ? "border-t border-white/20 mt-1 pt-1" : ""}>
                                                <div className="font-semibold text-red-300">{holiday.name}</div>
                                                <div className="opacity-60 text-[9px]">Canadian Holiday</div>
                                            </div>
                                        )}

                                        {/* Layer 3: Events (with separator if any above exists) */}
                                        {events.map((evt, i) => (
                                            <div key={i} className={(booking || holiday) ? "border-t border-white/20 mt-1 pt-1" : (i > 0 ? "border-t border-white/20 mt-1 pt-1" : "")}>
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
                    <h2 className="text-xl font-bold text-slate-800">2026 Season Calendar</h2>
                    <p className="text-sm text-muted-foreground">Visual snapshot of any claimed dates for the season.</p>
                </div>
                <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-600 bg-white p-2 rounded-lg border shadow-sm h-fit">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-green-500"></div>
                        <span>Confirmed Booking</span>
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
