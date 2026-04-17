import React, { useState, useEffect } from 'react';
import { Clock, Calendar, AlertTriangle, CheckCircle, Info, ChevronRight, ChevronLeft, History, RotateCw, Zap, CalendarCheck, DollarSign, ChevronDown } from 'lucide-react';
import { format, differenceInHours, addDays, isPast } from 'date-fns';
import { DRAFT_CONFIG, getOfficialStart, mapOrderToSchedule, CABIN_OWNERS } from '../../../lib/shareholders';
import { HistoricalOrders } from './HistoricalOrders';

export function SeasonSchedule({ currentOrder, allBookings, status, startDateOverride, onAction, bypassTenAM = false }) {
    const [view, setView] = useState('current'); // 'current' | 'history'
    const [isInfoExpanded, setIsInfoExpanded] = useState(false); // Collapsed by default on all screens

    return (
        <div id="tour-schedule" className="">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-slate-800" />
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Draft Schedule</h2>
                        <p className="text-sm text-slate-500">Season timeline, turn order, and historical archives</p>
                    </div>
                </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setView('current')}
                        className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${view === 'current' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <Calendar className="w-4 h-4" />
                        2026 Season
                    </button>
                    <button
                        onClick={() => setView('history')}
                        className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${view === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <History className="w-4 h-4" />
                        Archives
                    </button>
                </div>
                {onAction && (
                    <div>{onAction}</div>
                )}
            </div>

            {view === 'history' ? (
                <HistoricalOrders />
            ) : (
                <div className="bg-card border rounded-lg shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-slate-50 border-b">
                        <button
                            onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                            aria-expanded={isInfoExpanded}
                            aria-controls="schedule-info-panel"
                            className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 hover:bg-slate-100/70 transition-colors group"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 rounded-lg bg-blue-100/70 text-blue-600 shrink-0">
                                    <Info className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        Fees &amp; How the Schedule Works
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                                        {isInfoExpanded
                                            ? 'Tap to hide details'
                                            : 'Tap to see maintenance fees, turn timing, and draft rules'}
                                    </p>
                                </div>
                            </div>
                            <div className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${isInfoExpanded ? 'bg-slate-200 text-slate-700' : 'bg-white border border-slate-200 text-slate-600 group-hover:bg-slate-200 group-hover:border-slate-300'}`}>
                                <span className="hidden sm:inline">{isInfoExpanded ? 'Hide' : 'Show more'}</span>
                                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isInfoExpanded ? 'rotate-180' : ''}`} />
                            </div>
                        </button>

                        <div
                            id="schedule-info-panel"
                            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-6 transition-all duration-300 ease-in-out overflow-hidden ${isInfoExpanded ? 'max-h-[1200px] opacity-100 pt-2 pb-6' : 'max-h-0 opacity-0'}`}>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-100/50 text-blue-600 rounded-lg shrink-0">
                                    <RotateCw className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm">Structure & Rotation</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed mt-1">
                                        Two rounds of bookings (Snake Schedule). Order rotates annually.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-purple-100/50 text-purple-600 rounded-lg shrink-0">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm">Turn Timing</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed mt-1">
                                        Official turn start time is 10:00 AM. You have 48 hours to make your selection.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-emerald-100/50 text-emerald-600 rounded-lg shrink-0">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm">Early Access</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed mt-1">
                                        If the previous person finishes early, you get bonus time immediately!
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-amber-100/50 text-amber-600 rounded-lg shrink-0">
                                    <CalendarCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm">Open Season</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed mt-1">
                                        After Round 2, remaining dates open up for first-come, first-served booking.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-green-100/50 text-green-600 rounded-lg shrink-0">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm">Maintenance Fees</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed mt-1">
                                        <strong>Weeknights (Sun-Thu):</strong> $100<br />
                                        <strong>Weekends (Fri-Sat):</strong> $125<br />
                                        <strong>Full Week (7 Nights):</strong> $650
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                                <tr>
                                    <th className="px-6 py-4">Order</th>
                                    <th className="px-6 py-4">Cabin #</th>
                                    <th className="px-6 py-4">Shareholder</th>
                                    <th className="px-6 py-4">First Pass (Forward)</th>
                                    <th className="px-6 py-4">Second Pass (Snake Back)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {(() => {
                                    // Pre-calculate full schedule history/projection
                                    const fullSchedule = mapOrderToSchedule(currentOrder, allBookings, startDateOverride, bypassTenAM);

                                    return currentOrder.map((name, index) => {
                                        const owner = CABIN_OWNERS.find(o => o.name === name);
                                        const cabinNumber = owner ? owner.cabin : "-";
                                        const r1Entry = fullSchedule[index];
                                        const r2Entry = fullSchedule[12 + (11 - index)];
                                        const isActive = name === status.activePicker;

                                        // Helper: For completed/cancelled bookings, show actual reservation dates
                                        // For active/future/passed turns, show turn window times
                                        const getDisplayDates = (entry) => {
                                            const hasBookingDates = entry.booking && entry.booking.from && entry.booking.to;
                                            const isReservation = hasBookingDates && (entry.status === 'COMPLETED' || entry.status === 'CANCELLED');
                                            if (isReservation) {
                                                const from = entry.booking.from instanceof Date ? entry.booking.from : (entry.booking.from?.toDate ? entry.booking.from.toDate() : new Date(entry.booking.from));
                                                const to = entry.booking.to instanceof Date ? entry.booking.to : (entry.booking.to?.toDate ? entry.booking.to.toDate() : new Date(entry.booking.to));
                                                return { start: from, end: to, isReservation: true };
                                            }
                                            return { start: entry.start, end: entry.end, isReservation: false };
                                        };

                                        // Helper to render cell (REUSED)
                                        const renderCell = (entry, label) => {
                                            if (!entry) return <span className="text-gray-300">-</span>;

                                            let cellBg = "";
                                            let badge = null;

                                            if (entry.status === 'COMPLETED') {
                                                cellBg = "bg-green-50 text-green-700 border border-green-200";
                                                badge = "✓ Done";
                                            } else if (entry.status === 'CANCELLED') {
                                                cellBg = "bg-red-50 text-red-600 line-through border border-red-200";
                                                badge = "Cancelled";
                                            } else if (entry.status === 'PASSED') {
                                                cellBg = "bg-slate-100 text-slate-500 line-through border border-slate-200";
                                                badge = "Passed";
                                            } else if (entry.status === 'ACTIVE') {
                                                cellBg = "bg-blue-100 text-blue-900 font-bold ring-2 ring-blue-500 ring-inset animate-pulse";
                                                badge = "Active Now";
                                            } else if (entry.status === 'GRACE_PERIOD') {
                                                cellBg = "bg-amber-50 text-amber-900 font-bold ring-2 ring-amber-500 ring-inset animate-pulse";
                                                badge = "Early Access";
                                            } else if (entry.status === 'SKIPPED') {
                                                cellBg = "bg-red-50 text-red-400 border border-red-100";
                                                badge = "Skipped";
                                            } else {
                                                cellBg = "text-muted-foreground";
                                            }

                                            const dates = getDisplayDates(entry);
                                            const dateFormat = dates.isReservation ? 'MMM d, yyyy' : 'MMM d, h:mm a';

                                            return (
                                                <div className={`px-4 py-2 rounded-md w-fit flex flex-col gap-1 ${cellBg}`}>
                                                    <div className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                                                        {badge || label}
                                                    </div>
                                                    <div className="text-xs opacity-90 whitespace-nowrap">
                                                        {format(dates.start, dateFormat)} - {format(dates.end, dateFormat)}
                                                    </div>
                                                </div>
                                            );
                                        };

                                        return (
                                            <tr key={name} className={`transition-colors border-l-4 ${isActive ? "bg-blue-50/50 border-l-blue-600 shadow-sm" : "hover:bg-muted/10 border-l-transparent"}`}>
                                                <td className="px-6 py-4 font-mono text-muted-foreground">
                                                    #{index + 1}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-base text-slate-900">{cabinNumber}</td>
                                                <td className="px-6 py-4 font-bold text-base text-slate-900">
                                                    {name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {renderCell(r1Entry, "Round 1")}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {renderCell(r2Entry, "Round 2")}
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile/Tablet Card View (Visible up to LG) */}
                    <div className="lg:hidden space-y-4 p-4 bg-slate-50/50">
                        {(() => {
                            const fullSchedule = mapOrderToSchedule(currentOrder, allBookings, startDateOverride, bypassTenAM);
                            return currentOrder.map((name, index) => {
                                const owner = CABIN_OWNERS.find(o => o.name === name);
                                const cabinNumber = owner ? owner.cabin : "-";
                                const r1Entry = fullSchedule[index];
                                const r2Entry = fullSchedule[12 + (11 - index)];
                                const isActive = name === status.activePicker;

                                // Inline helper to avoid duplication complexity in render loop
                                const renderMobileStatus = (entry, roundLabel) => {
                                    if (!entry) return null;
                                    let statusColor = "text-slate-500";
                                    let statusText = "Future";
                                    let bgClass = "bg-transparent";

                                    if (entry.status === 'COMPLETED') { statusColor = "text-green-700 font-bold"; statusText = "✓ Done"; bgClass = "bg-green-50 border border-green-200 p-2 rounded"; }
                                    else if (entry.status === 'ACTIVE') { statusColor = "text-blue-700 font-bold animate-pulse"; statusText = "Active Now"; bgClass = "bg-blue-50 border border-blue-200 p-2 rounded ring-1 ring-blue-500"; }
                                    else if (entry.status === 'GRACE_PERIOD') { statusColor = "text-amber-700 font-bold animate-pulse"; statusText = "Early Access"; bgClass = "bg-amber-50 border border-amber-200 p-2 rounded ring-1 ring-amber-500"; }
                                    else if (entry.status === 'PASSED') { statusColor = "text-slate-400 line-through"; statusText = "Passed"; }
                                    else if (entry.status === 'SKIPPED') { statusColor = "text-red-400 line-through"; statusText = "Skipped"; }

                                    return (
                                        <div className="flex flex-col py-3 border-b last:border-0 border-slate-100 gap-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{roundLabel}</span>
                                                <span className={`text-[10px] uppercase tracking-wider font-bold ${statusColor} ${bgClass === "bg-transparent" ? "" : "px-1.5 py-0.5"}`}>
                                                    {statusText}
                                                </span>
                                            </div>
                                            <div className={`flex items-center gap-1.5 text-xs ${bgClass !== "bg-transparent" ? "bg-white/60 p-1.5 rounded mt-0.5" : "text-slate-600 pl-0"} `}>
                                                <Calendar className="w-3 h-3 text-slate-400" />
                                                {(() => {
                                                    const hasBookingDates = entry.booking && entry.booking.from && entry.booking.to;
                                                    const isReservation = hasBookingDates && (entry.status === 'COMPLETED' || entry.status === 'CANCELLED');
                                                    if (isReservation) {
                                                        const from = entry.booking.from instanceof Date ? entry.booking.from : (entry.booking.from?.toDate ? entry.booking.from.toDate() : new Date(entry.booking.from));
                                                        const to = entry.booking.to instanceof Date ? entry.booking.to : (entry.booking.to?.toDate ? entry.booking.to.toDate() : new Date(entry.booking.to));
                                                        return <span>{format(from, 'MMM d, yyyy')} - {format(to, 'MMM d, yyyy')}</span>;
                                                    }
                                                    return <span>{format(entry.start, 'MMM d, h:mm a')} - {format(entry.end, 'MMM d, h:mm a')}</span>;
                                                })()}
                                            </div>
                                        </div>
                                    );
                                };

                                return (
                                    <div key={name} className={`bg-white rounded-lg border shadow-sm overflow-hidden ${isActive ? 'ring-2 ring-blue-500 border-transparent shadow-md' : 'border-slate-200'}`}>
                                        <div className={`px-4 py-3 flex justify-between items-center ${isActive ? 'bg-blue-50/50' : 'bg-slate-50/30 border-b border-slate-100'}`}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[10px] text-slate-400 font-bold bg-slate-100 px-1 py-0.5 rounded">#{index + 1}</span>
                                                <span className="font-bold text-sm text-slate-900 line-clamp-1">{name}</span>
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border shadow-sm whitespace-nowrap">
                                                Cabin {cabinNumber}
                                            </div>
                                        </div>
                                        <div className="px-3 pb-1">
                                            {renderMobileStatus(r1Entry, "Round 1")}
                                            {renderMobileStatus(r2Entry, "Round 2")}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
