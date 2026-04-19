import React from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isWithinInterval, startOfDay } from 'date-fns';
import { getHolidayForDate, getEventsForDate } from '../../../lib/seasonEvents';

export function AdminCalendarView({ bookings, onNotify }) {
    // 2026 Season: May - September
    const months = [
        new Date(2026, 4, 1), // May
        new Date(2026, 5, 1), // June
        new Date(2026, 6, 1), // July
        new Date(2026, 7, 1), // Aug
        new Date(2026, 8, 1), // Sept
    ];

    const getBookingForDate = (date) => {
        return bookings.find(b => {
            if (b.type === 'pass' || b.type === 'auto-pass' || b.type === 'cancelled') return false;
            if (!b.from || !b.to) return false;
            const start = b.from instanceof Date ? b.from : b.from.toDate ? b.from.toDate() : new Date(b.from);
            const end = b.to instanceof Date ? b.to : b.to.toDate ? b.to.toDate() : new Date(b.to);
            return isWithinInterval(startOfDay(date), { start: startOfDay(start), end: startOfDay(end) });
        });
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
                        const isPast = startOfDay(day) < startOfDay(new Date());

                        // Priority: past > booking > holiday > event > default
                        let bgClass = "bg-white hover:bg-slate-50 text-slate-700";
                        if (isPast) {
                            bgClass = booking
                                ? "bg-slate-200 text-slate-500"
                                : "bg-slate-50 text-slate-400";
                        } else if (booking) {
                            bgClass = booking.isPaid
                                ? "bg-green-500 text-white hover:bg-green-600"
                                : "bg-rose-500 text-white hover:bg-rose-600";
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

                                {/* Dot indicators */}
                                <span className={`absolute top-0 right-0 flex gap-px p-px ${isPast ? 'opacity-40' : ''}`}>
                                    {holiday && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                                    {hasEvent && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                                </span>

                                {/* Unified hover tooltip */}
                                {hasInfo && (
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 w-max max-w-[200px] bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-lg pointer-events-none text-center space-y-0">
                                        {booking && (
                                            <div>
                                                <div className="font-bold">{booking.shareholderName}</div>
                                                <div className="opacity-75">Cabin #{booking.cabinNumber}</div>
                                                <div className={`mt-1 font-bold ${booking.isPaid ? 'text-green-400' : 'text-rose-400'}`}>
                                                    {booking.isPaid ? "PAID" : "UNPAID"}
                                                </div>
                                            </div>
                                        )}
                                        {holiday && (
                                            <div className={booking ? "border-t border-white/20 mt-1 pt-1" : ""}>
                                                <div className="font-semibold text-red-300">{holiday.name}</div>
                                                <div className="opacity-60 text-[9px]">Canadian Holiday</div>
                                            </div>
                                        )}
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
            <div className="flex flex-col sm:flex-row justify-end items-end sm:items-center gap-4 mb-4">
                <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-600 bg-white p-2 rounded-lg border shadow-sm h-fit">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-green-500"></div>
                        <span>Paid</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-rose-500"></div>
                        <span>Unpaid</span>
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
