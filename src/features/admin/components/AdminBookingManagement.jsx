import React from 'react';
import { format } from 'date-fns';
import { List, Calendar as CalendarIcon, Users, CheckCircle, XCircle, Ban, StickyNote } from 'lucide-react';
import { ActionsDropdown } from './ActionsDropdown';
import { AdminCalendarView } from './AdminCalendarView';
import { CABIN_OWNERS, normalizeName, formatNameForDisplay } from '../../../lib/shareholders';
import { calculateBookingCost } from '../../../lib/pricing';
import { exportBookingsToCSV } from '../services/backupService';
import { Download } from 'lucide-react';

export function AdminBookingManagement({
    schedule,
    allBookings,
    bookingViewMode,
    setBookingViewMode,
    handleEditClick,
    handleCancelBooking,
    handleToggleFinalized,
    handleTogglePaid,
    handleEditPayment,
    handleSendPaymentReminder,
    handleBookSkippedSlot,
    triggerAlert
}) {
    const handleDownloadCSV = () => {
        try {
            exportBookingsToCSV(allBookings);
        } catch (err) {
            console.error("CSV Export Error:", err);
            triggerAlert("Error", "Failed to export CSV");
        }
    };

    // Helper for payment status style
    const getPaymentClass = (isPaid) => isPaid
        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
        : 'bg-rose-100 text-rose-800 border-rose-200';

    const renderMobileCard = (slot) => {
        const booking = slot.booking;
        const isSlotBooked = !!booking;
        const isBookable = isSlotBooked && booking.type !== 'pass' && booking.type !== 'auto-pass' && booking.type !== 'cancelled';
        const expected = booking?.totalPrice || 0;
        const pd = booking?.paymentDetails;

        // Status badge config
        const getStatusBadge = () => {
            if (!isSlotBooked) {
                const configs = {
                    'ACTIVE': { label: 'Active Now', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse' },
                    'GRACE_PERIOD': { label: 'Early Access', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                    'SKIPPED': { label: 'Skipped', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
                    'FUTURE': { label: 'Pending', cls: 'bg-slate-50 text-slate-400 border-slate-200' },
                    'PASSED': { label: 'Passed', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
                };
                return configs[slot.status] || configs['FUTURE'];
            }
            if (booking.type === 'pass' || booking.type === 'auto-pass') return { label: 'Passed', cls: 'bg-slate-50 text-slate-500 border-slate-200' };
            if (booking.type === 'cancelled') return { label: 'Cancelled', cls: 'bg-red-50 text-red-600 border-red-100' };
            if (booking.isPaid) return { label: 'Fee Received', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
            return { label: 'Pending Fee', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
        };
        const badge = getStatusBadge();

        // Left accent bar color
        const getAccentColor = () => {
            if (!isSlotBooked) {
                if (slot.status === 'ACTIVE') return 'bg-emerald-500 animate-pulse';
                if (slot.status === 'GRACE_PERIOD') return 'bg-amber-400';
                return '';
            }
            if (booking.type === 'cancelled') return 'bg-red-400';
            if (booking.type === 'pass' || booking.type === 'auto-pass') return 'bg-slate-300';
            if (booking.isPaid) return 'bg-emerald-500';
            return 'bg-amber-400';
        };
        const accent = getAccentColor();

        const isActive = !isSlotBooked && (slot.status === 'ACTIVE' || slot.status === 'GRACE_PERIOD');

        return (
            <div key={`${slot.name}-${slot.round}`} className={`rounded-2xl border shadow-sm relative overflow-hidden transition-all ${isActive ? 'bg-emerald-50/30 ring-2 ring-emerald-500/40' : 'bg-white'}`}>
                {/* Accent bar */}
                {accent && <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />}

                {/* Header */}
                <div className="flex justify-between items-start px-5 pt-5 pb-3">
                    <div className="pl-1">
                        <h3 className={`font-bold text-base ${isActive ? 'text-emerald-700' : 'text-slate-900'}`}>{slot.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-md">
                                Cabin #{isSlotBooked ? (booking.cabinNumber || "?") : "?"}
                            </span>
                            {isSlotBooked && booking.guests && (
                                <span className="text-[11px] font-mono text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {booking.guests}
                                </span>
                            )}
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                R{slot.round}
                            </span>
                        </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${badge.cls}`}>
                        {badge.label}
                    </span>
                </div>

                {/* Body */}
                {isSlotBooked ? (
                    <div className="mx-5 mb-4 bg-slate-50/80 rounded-xl border border-slate-100 overflow-hidden">
                        {/* Dates + Fee row */}
                        {isBookable ? (
                            <div className="grid grid-cols-2 divide-x divide-slate-100">
                                <div className="p-3">
                                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Dates</div>
                                    <div className="text-sm font-semibold text-slate-900">
                                        {booking.from && booking.to ? `${format(booking.from, 'MMM d')} – ${format(booking.to, 'MMM d')}` : 'Invalid'}
                                    </div>
                                </div>
                                <div className="p-3 text-right">
                                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Fee</div>
                                    <div className="text-lg font-black text-slate-800">${expected.toLocaleString()}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3">
                                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Status</div>
                                <div className="text-sm font-medium text-slate-500">
                                    {(booking.type === 'pass' || booking.type === 'auto-pass') ? 'Passed this round' : 'Cancelled'}
                                </div>
                            </div>
                        )}

                        {/* Fee details row (only for paid bookings with details) */}
                        {isBookable && booking.isPaid && (pd?.reference || pd?.notes) && (
                            <div className="border-t border-slate-100 px-3 py-2.5 space-y-1">
                                {pd.reference && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                        <span className="text-slate-400 font-medium">Ref:</span>
                                        <span className="font-mono truncate">{pd.reference}</span>
                                    </div>
                                )}
                                {pd.notes && (
                                    <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                                        <StickyNote className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />
                                        <span className="italic line-clamp-2">{pd.notes}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mx-5 mb-4 py-6 text-center border-2 border-dashed border-slate-100 rounded-xl text-slate-300 text-xs">
                        No booking dates selected
                    </div>
                )}

                {/* Actions footer */}
                {isSlotBooked && isBookable && (
                    <div className="flex justify-end px-5 pb-4 pt-1 border-t border-slate-50">
                        <ActionsDropdown
                            onEdit={() => handleEditClick(booking)}
                            onCancel={() => handleCancelBooking(booking)}
                            isCancelled={false}
                            onToggleStatus={() => handleToggleFinalized(booking.id, booking.isFinalized)}
                            isFinalized={booking.isFinalized}
                            onTogglePaid={() => handleTogglePaid(booking)}
                            onEditPayment={() => handleEditPayment(booking)}
                            isPaid={booking.isPaid}
                            onSendReminder={() => handleSendPaymentReminder(booking)}
                        />
                    </div>
                )}
                {!isSlotBooked && slot.status === 'SKIPPED' && handleBookSkippedSlot && (
                    <div className="flex justify-end px-5 pb-4 pt-1 border-t border-slate-50">
                        <ActionsDropdown onBookDates={() => handleBookSkippedSlot(slot)} />
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

            const isActive = slot.status === 'ACTIVE' || slot.status === 'GRACE_PERIOD';

            return (
                <tr key={`${slot.name}-${slot.round}`} className={`bg-slate-50/30 ${isActive ? 'ring-inset ring-2 ring-emerald-500/50 shadow-sm relative z-10 bg-emerald-50/30' : ''}`}>
                    <td className="px-5 py-4">
                        <div className={`font-semibold text-sm ${isActive ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>{slot.name}</div>
                        <div className={`text-xs font-mono mt-0.5 ${isActive ? 'text-emerald-700/70 font-medium' : 'text-muted-foreground opacity-50'}`}>
                            Cabin #{owner?.cabin || "?"}
                        </div>
                    </td>
                    <td className="px-5 py-4 text-slate-400">—</td>
                    <td className="px-5 py-4 text-slate-400">—</td>
                    <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border justify-center ${config.className}`}>
                            {config.label}
                        </span>
                    </td>
                    <td className="px-5 py-4 text-center text-slate-300">—</td>
                    <td className="px-5 py-4 text-center text-slate-300">—</td>
                    <td className="px-5 py-4 text-slate-300">—</td>
                    <td className="px-5 py-4 text-right">
                        {slot.status === 'SKIPPED' && handleBookSkippedSlot ? (
                            <ActionsDropdown onBookDates={() => handleBookSkippedSlot(slot)} />
                        ) : (
                            <span className="text-slate-300">—</span>
                        )}
                    </td>
                </tr>
            );
        }

        const owner = CABIN_OWNERS.find(o => normalizeName(o.name) === normalizeName(booking.shareholderName));
        const paymentClass = getPaymentClass(booking.isPaid);
        const isBookable = booking.type !== 'pass' && booking.type !== 'auto-pass' && booking.type !== 'cancelled';
        const expected = booking.totalPrice || 0;
        const pd = booking.paymentDetails;
        const received = pd?.amount;
        const mismatch = booking.isPaid && received != null && received !== expected;

        return (
            <tr key={booking.id} className="hover:bg-muted/10 transition-colors bg-white">
                <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900 text-sm">{formatNameForDisplay(booking.shareholderName)}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        Cabin #{booking.cabinNumber || owner?.cabin || "?"}
                    </div>
                </td>
                <td className="px-5 py-4">
                    {(booking.type === 'pass' || booking.type === 'auto-pass' || booking.type === 'cancelled') ? (
                        <span className="text-slate-400">—</span>
                    ) : (
                        <div className="flex items-center gap-1.5 font-medium text-slate-600 text-sm">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {booking.guests || 1}
                        </div>
                    )}
                </td>
                <td className="px-5 py-4">
                    <div className="flex flex-col">
                        <span className="font-medium text-slate-900 text-sm">
                            {(booking.type === 'pass' || booking.type === 'auto-pass')
                                ? '—'
                                : (booking.from && booking.to
                                    ? `${format(booking.from, 'MMM d')} – ${format(booking.to, 'MMM d')}`
                                    : 'Invalid')
                            }
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                            {booking.createdAt ? format(booking.createdAt, 'MMM d, HH:mm') : ''}
                        </span>
                    </div>
                </td>
                <td className="px-5 py-4 text-center">
                    {booking.type === 'pass' || booking.type === 'auto-pass' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 cursor-default justify-center">
                            <XCircle className="w-3 h-3 mr-1" />
                            Passed
                        </span>
                    ) : booking.type === 'cancelled' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-100 cursor-default justify-center">
                            <Ban className="w-3 h-3 mr-1" />
                            Cancelled
                        </span>
                    ) : booking.isPaid ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 justify-center whitespace-nowrap">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Fee Received
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 justify-center whitespace-nowrap">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Pending Fee
                        </span>
                    )}
                </td>
                <td className="px-5 py-4 text-center">
                    {!isBookable ? (
                        <span className="text-slate-400">—</span>
                    ) : (
                        <div className="flex flex-col items-center">
                            <span className="text-sm font-bold text-slate-800">${expected.toLocaleString()}</span>
                            {booking.isPaid && mismatch && (
                                <span className="text-[10px] text-amber-700 font-semibold mt-0.5">
                                    Collected: ${received.toLocaleString()}
                                </span>
                            )}
                        </div>
                    )}
                </td>
                <td className="px-5 py-4 text-center">
                    {!isBookable ? (
                        <span className="text-slate-400">—</span>
                    ) : booking.isPaid && pd?.reference ? (
                        <span className="text-xs text-slate-600 font-mono" title={pd.reference}>
                            {pd.reference.length > 18 ? pd.reference.slice(0, 18) + '…' : pd.reference}
                        </span>
                    ) : (
                        <span className="text-slate-300">—</span>
                    )}
                </td>
                <td className="px-5 py-4">
                    {!isBookable ? (
                        <span className="text-slate-400">—</span>
                    ) : booking.isPaid && pd?.notes ? (
                        <div className="flex items-center gap-1 text-xs text-slate-500 max-w-[160px]" title={pd.notes}>
                            <StickyNote className="w-3 h-3 flex-shrink-0" />
                            <span className="italic truncate">{pd.notes}</span>
                        </div>
                    ) : (
                        <span className="text-slate-300">—</span>
                    )}
                </td>
                <td className="px-5 py-4 text-right">
                    {isBookable ? (
                        <ActionsDropdown
                            onEdit={booking.type !== 'cancelled' ? () => handleEditClick(booking) : undefined}
                            onCancel={() => handleCancelBooking(booking)}
                            isCancelled={booking.type === 'cancelled'}
                            onTogglePaid={() => handleTogglePaid(booking)}
                            onEditPayment={() => handleEditPayment(booking)}
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
                <div className="flex items-center gap-3">
                    <CalendarIcon className="w-8 h-8 text-slate-800" />
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                            {bookingViewMode === 'list' ? 'Booking Management' : 'Calendar View'}
                        </h2>
                        <p className="text-sm text-slate-500">View, edit, and manage shareholder reservations</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={handleDownloadCSV}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-200/50`}
                            title="Download CSV"
                        >
                            <div className="flex items-center gap-2">
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Export</span>
                            </div>
                        </button>
                    </div>

                    <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1"></div>

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
                    <div className="hidden md:block bg-white border rounded-xl shadow-sm overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                                <tr>
                                    <th className="px-5 py-3 text-xs">Shareholder</th>
                                    <th className="px-5 py-3 text-xs">Guests</th>
                                    <th className="px-5 py-3 text-xs">Dates</th>
                                    <th className="px-5 py-3 text-xs text-center">Status</th>
                                    <th className="px-5 py-3 text-xs text-center">Fee</th>
                                    <th className="px-5 py-3 text-xs text-center">Reference</th>
                                    <th className="px-5 py-3 text-xs">Notes</th>
                                    <th className="px-5 py-3 text-xs text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-slate-600">
                                <tr className="bg-slate-100 border-b border-t border-slate-200">
                                    <td colSpan="8" className="px-6 py-2 text-xs font-bold tracking-wider text-slate-600 uppercase">
                                        Round 1 - Shareholder Rotation
                                    </td>
                                </tr>
                                {schedule.filter(s => s.round === 1).map(renderRow)}
                                <tr className="bg-slate-100 border-b border-t border-slate-200">
                                    <td colSpan="8" className="px-6 py-2 text-xs font-bold tracking-wider text-slate-600 uppercase mt-4">
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
