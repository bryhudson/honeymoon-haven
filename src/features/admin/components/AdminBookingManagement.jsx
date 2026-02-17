import React from 'react';
import { format } from 'date-fns';
import { List, Calendar as CalendarIcon, Users, CheckCircle, XCircle, Ban } from 'lucide-react';
import { ActionsDropdown } from './ActionsDropdown';
import { AdminCalendarView } from './AdminCalendarView';
import { CABIN_OWNERS, normalizeName, formatNameForDisplay } from '../../../lib/shareholders';
import { calculateBookingCost } from '../../../lib/pricing';

export function AdminBookingManagement({
    schedule,
    allBookings,
    bookingViewMode,
    setBookingViewMode,
    handleEditClick,
    handleCancelBooking,
    handleToggleFinalized,
    handleTogglePaid,
    handleSendPaymentReminder,
    triggerAlert
}) {
    // Helper for payment status style
    const getPaymentClass = (isPaid) => isPaid
        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
        : 'bg-rose-100 text-rose-800 border-rose-200';

    const renderMobileCard = (slot) => {
        const booking = slot.booking;
        const isSlotBooked = !!booking;
        const paymentClass = getPaymentClass(booking?.isPaid);

        return (
            <div key={`${slot.name}-${slot.round}`} className="bg-white p-5 rounded-xl border shadow-sm space-y-4 relative overflow-hidden">
                {isSlotBooked && (
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${booking.isFinalized ? 'bg-green-500' : 'bg-amber-400'}`}></div>
                )}

                <div className="flex justify-between items-start pl-2">
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">{slot.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                Cabin #{isSlotBooked ? (booking.cabinNumber || "?") : "?"}
                            </span>
                            {isSlotBooked && booking.guests && (
                                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {booking.guests}
                                </span>
                            )}
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Round {slot.round}
                            </span>
                        </div>
                    </div>

                    {isSlotBooked ? (
                        (() => {
                            if (booking.type === 'pass' || booking.type === 'auto-pass') {
                                return <div className="px-2 py-1 rounded text-[10px] font-bold border bg-slate-100 text-slate-600 border-slate-200 w-24 justify-center flex">PASSED</div>;
                            }
                            if (booking.type === 'cancelled') {
                                return <div className="px-2 py-1 rounded text-[10px] font-bold border bg-red-50 text-red-700 border-red-200 w-24 justify-center flex">CANCELLED</div>;
                            }
                            return <div className="px-2 py-1 rounded text-[10px] font-bold border bg-green-50 text-green-700 border-green-200 w-24 justify-center flex">CONFIRMED</div>;
                        })()
                    ) : (
                        <span className="text-xs text-slate-400 font-medium italic pr-2">Pending</span>
                    )}
                </div>

                {isSlotBooked ? (
                    <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 space-y-3 ml-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Dates</div>
                                <div className="text-sm font-medium text-slate-900">
                                    {(booking.type === 'pass' || booking.type === 'auto-pass') ? 'Pass' :
                                        (booking.from && booking.to ? `${format(booking.from, 'MMM d')} - ${format(booking.to, 'MMM d')}` : 'Invalid')}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Maintenance Fee</div>
                                {(booking.type === 'pass' || booking.type === 'auto-pass' || booking.type === 'cancelled') ? (
                                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                                        {(() => {
                                            const cost = calculateBookingCost(booking.from, booking.to);
                                            return cost?.averageRate ? `$${Math.round(cost.averageRate)} avg/night` : '$125/night';
                                        })()}
                                    </div>
                                ) : (
                                    <span className={`px-3 py-1 rounded text-xs font-bold border w-24 justify-center flex ${paymentClass}`}>
                                        {booking.isPaid ? "PAID" : "UNPAID"}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="ml-2 py-4 text-center border-2 border-dashed border-slate-100 rounded-lg text-slate-300 text-xs">
                        No booking dates selected
                    </div>
                )}

                {isSlotBooked && (
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 ml-2">
                        <ActionsDropdown
                            onEdit={(booking.type !== 'cancelled' && booking.type !== 'pass' && booking.type !== 'auto-pass') ? () => handleEditClick(booking) : undefined}
                            onCancel={booking.type !== 'cancelled' ? () => handleCancelBooking(booking) : undefined}
                            isCancelled={booking.type === 'cancelled'}
                            onToggleStatus={() => handleToggleFinalized(booking.id, booking.isFinalized)}
                            isFinalized={booking.isFinalized}
                            onTogglePaid={() => handleTogglePaid(booking)}
                            isPaid={booking.isPaid}
                            onSendReminder={() => handleSendPaymentReminder(booking)}
                        />
                    </div>
                )}
            </div>
        );
    };

    const renderRow = (slot) => {
        const booking = slot.booking;
        const isSlotBooked = !!booking;

        if (!isSlotBooked) {
            const owner = CABIN_OWNERS.find(o => normalizeName(o.name) === normalizeName(slot.name));
            const statusConfig = {
                'ACTIVE': { label: 'Active Now', className: 'bg-emerald-100 text-emerald-700 border-emerald-200 animate-pulse' },
                'GRACE_PERIOD': { label: 'Early Access', className: 'bg-amber-100 text-amber-700 border-amber-200' },
                'SKIPPED': { label: 'Skipped', className: 'bg-rose-100 text-rose-700 border-rose-200' },
                'FUTURE': { label: 'Pending', className: 'bg-slate-100 text-slate-400 border-slate-200' },
                'PASSED': { label: 'Passed', className: 'bg-slate-100 text-slate-500 border-slate-200' },
                'CANCELLED': { label: 'Cancelled', className: 'bg-rose-50 text-rose-500 border-rose-100 line-through' }
            };
            const config = statusConfig[slot.status] || statusConfig['FUTURE'];

            return (
                <tr key={`${slot.name}-${slot.round}`} className="bg-slate-50/30">
                    <td className="px-6 py-5">
                        <div className="font-semibold text-slate-400 text-base">{slot.name}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5 opacity-50">
                            Cabin #{owner?.cabin || "?"}
                        </div>
                    </td>
                    <td className="px-6 py-5 text-slate-400">—</td>
                    <td className="px-6 py-5 text-slate-400">—</td>
                    <td className="px-6 py-5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border w-24 justify-center ${config.className}`}>
                            {config.label}
                        </span>
                    </td>
                    <td className="px-6 py-5 text-center text-slate-300">—</td>
                    <td className="px-6 py-5 text-right text-slate-300">—</td>
                </tr>
            );
        }

        const owner = CABIN_OWNERS.find(o => normalizeName(o.name) === normalizeName(booking.shareholderName));
        const paymentClass = getPaymentClass(booking.isPaid);

        return (
            <tr key={booking.id} className="hover:bg-muted/10 transition-colors bg-white">
                <td className="px-6 py-5">
                    <div className="font-semibold text-slate-900 text-base">{formatNameForDisplay(booking.shareholderName)}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        Cabin #{booking.cabinNumber || owner?.cabin || "?"}
                    </div>
                </td>
                <td className="px-6 py-5">
                    {(booking.type === 'pass' || booking.type === 'auto-pass' || booking.type === 'cancelled') ? (
                        <span className="text-slate-400">—</span>
                    ) : (
                        <div className="flex items-center gap-1.5 font-medium text-slate-600">
                            <Users className="w-4 h-4 text-slate-400" />
                            {booking.guests || 1}
                        </div>
                    )}
                </td>
                <td className="px-6 py-5">
                    <div className="flex flex-col">
                        <span className="font-medium text-slate-900">
                            {(booking.type === 'pass' || booking.type === 'auto-pass')
                                ? '—'
                                : (booking.from && booking.to
                                    ? `${format(booking.from, 'MMM d')} - ${format(booking.to, 'MMM d, yyyy')}`
                                    : 'Invalid Dates')
                            }
                        </span>
                        <span className="text-[11px] text-muted-foreground mt-0.5">
                            Created: {booking.createdAt ? format(booking.createdAt, 'MMM d, HH:mm') : 'N/A'}
                        </span>
                    </div>
                </td>
                <td className="px-6 py-5 text-center">
                    {booking.type === 'pass' || booking.type === 'auto-pass' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 cursor-default w-24 justify-center">
                            <XCircle className="w-3 h-3 mr-1.5" />
                            Passed
                        </span>
                    ) : booking.type === 'cancelled' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-100 cursor-default w-24 justify-center">
                            <Ban className="w-3 h-3 mr-1.5" />
                            Cancelled
                        </span>
                    ) : (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border w-24 justify-center ${booking.isFinalized
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                            <CheckCircle className="w-3 h-3 mr-1.5" />
                            Confirmed
                        </span>
                    )}
                </td>
                <td className="px-6 py-5 text-center">
                    {(booking.type === 'pass' || booking.type === 'auto-pass' || booking.type === 'cancelled') ? (
                        <span className="text-slate-400">—</span>
                    ) : (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border w-24 justify-center ${paymentClass}`}>
                            {booking.isPaid ? 'PAID' : 'UNPAID'}
                        </span>
                    )}
                </td>
                <td className="px-6 py-5 text-right">
                    {booking.type !== 'pass' && booking.type !== 'auto-pass' && booking.type !== 'cancelled' ? (
                        <ActionsDropdown
                            onEdit={booking.type !== 'cancelled' ? () => handleEditClick(booking) : undefined}
                            onCancel={() => handleCancelBooking(booking)}
                            isCancelled={booking.type === 'cancelled'}
                            onTogglePaid={() => handleTogglePaid(booking)}
                            isPaid={booking.isPaid}
                            onSendReminder={() => handleSendPaymentReminder(booking)}
                        />
                    ) : null}
                </td>
            </tr>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    {bookingViewMode === 'list' ? 'Booking Management' : 'Calendar View'}
                </h2>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setBookingViewMode('list')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${bookingViewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <div className="flex items-center gap-2">
                            <List className="w-3.5 h-3.5" />
                            List
                        </div>
                    </button>
                    <button
                        onClick={() => setBookingViewMode('calendar')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${bookingViewMode === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            Calendar
                        </div>
                    </button>
                </div>
            </div>

            {bookingViewMode === 'calendar' ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <AdminCalendarView bookings={allBookings} onNotify={triggerAlert} />
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Mobile View */}
                    <div className="md:hidden space-y-4">
                        {schedule.map(renderMobileCard)}
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:block bg-white border rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                                <tr>
                                    <th className="px-6 py-4">Shareholder</th>
                                    <th className="px-6 py-4">Guests</th>
                                    <th className="px-6 py-4">Dates</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-center">Fee Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-slate-600">
                                <tr className="bg-slate-100 border-b border-t border-slate-200">
                                    <td colSpan="6" className="px-6 py-2 text-xs font-bold tracking-wider text-slate-600 uppercase">
                                        Round 1 - Shareholder Rotation
                                    </td>
                                </tr>
                                {schedule.filter(s => s.round === 1).map(renderRow)}
                                <tr className="bg-slate-100 border-b border-t border-slate-200">
                                    <td colSpan="6" className="px-6 py-2 text-xs font-bold tracking-wider text-slate-600 uppercase mt-4">
                                        Round 2 - Snake Draft
                                    </td>
                                </tr>
                                {schedule.filter(s => s.round === 2).map(renderRow)}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
