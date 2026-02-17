import React from 'react';
import { BaseModal } from '../../../components/ui/BaseModal';
import { Mail, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { calculateBookingCost } from '../../../lib/pricing';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';

export function BookingDetailsModal({ booking, onClose, onCancel, onPass, onEdit, onFinalize, onEmail, currentUser, isAdmin, isReadOnly }) {
    if (!booking) return null;

    const start = booking.from?.toDate ? booking.from.toDate() : new Date(booking.from);
    const end = booking.to?.toDate ? booking.to.toDate() : new Date(booking.to);
    const priceDetails = booking.from && booking.to
        ? calculateBookingCost(booking.from.toDate ? booking.from.toDate() : booking.from, booking.to.toDate ? booking.to.toDate() : booking.to)
        : null;

    // Use stored total if available (historical accuracy), otherwise calc
    const displayedTotal = booking.totalPrice || (priceDetails ? priceDetails.total : 0);

    // Permissions
    const isOwner = booking.shareholderName === currentUser;
    const isFuture = start > new Date();
    const isFinalized = booking.isFinalized;
    const isCancelled = booking.type === 'cancelled';

    // Permission Logic
    const canCancel = !isReadOnly && isFinalized && !isCancelled && onCancel && (isAdmin || (isOwner && isFuture));
    const canPass = !isReadOnly && !isFinalized && !isCancelled && onPass && (isAdmin || isOwner);
    const canEdit = !isReadOnly && !isFinalized && !isCancelled && onEdit && (isAdmin || isOwner);

    return (
        <BaseModal
            isOpen={!!booking}
            onClose={onClose}
            title="Booking Details"
            description="Historical breakdown and maintenance fee info"
            maxSize="max-w-lg"
            footer={
                <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                        {canPass ? (
                            <button
                                onClick={onPass}
                                className="flex-1 py-3.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                Pass Turn
                            </button>
                        ) : canCancel ? (
                            <button
                                onClick={onCancel}
                                className="flex-1 py-3.5 bg-white border border-rose-100 text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                Cancel Booking
                            </button>
                        ) : null}

                        {booking.isFinalized && booking.isPaid && onEmail && (
                            <button
                                onClick={onEmail}
                                className="flex-1 py-3.5 bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                <Mail className="w-4 h-4" />
                                Email Guest
                            </button>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                    >
                        Return to Dashboard
                    </button>
                </div>
            }
        >
            <div className="space-y-6">
                {isCancelled && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
                        <div className="p-2 bg-white rounded-xl text-rose-500 shadow-sm mt-0.5">
                            <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div>
                            <h4 className="font-bold text-rose-900 text-sm">Booking Cancelled</h4>
                            <p className="text-xs text-rose-700 mt-0.5 leading-snug">
                                This booking is no longer valid. No fee required.
                            </p>
                            {booking.cancelledAt && (
                                <p className="text-[10px] text-rose-600/60 mt-2 font-mono uppercase tracking-wider">
                                    {format(booking.cancelledAt.toDate ? booking.cancelledAt.toDate() : new Date(booking.cancelledAt), 'MMM d, yyyy')}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Unified Details Card */}
                <div className="bg-slate-50/80 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    {/* Header Row: Shareholder & Cabin */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Shareholder</span>
                            {/* Mobile: Truncate, Desktop: Full */}
                            <span className="font-black text-slate-700 text-sm md:text-base md:truncate max-w-[150px] md:max-w-none">
                                {booking.shareholderName}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cabin</span>
                            <span className="font-black text-slate-800 text-xl">#{booking.cabinNumber}</span>
                        </div>
                    </div>

                    {/* Details Body */}
                    <div className="p-5 space-y-5">

                        {/* Row: Dates */}
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dates</span>
                                <div className="font-black text-slate-800 text-lg leading-tight mt-0.5">
                                    {format(start, 'MMM d')} - {format(end, 'MMM d, yyyy')}
                                </div>
                                <div className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
                                    {/* Duration Calc */}
                                    {Math.round((end - start) / (1000 * 60 * 60 * 24))} nights
                                </div>
                            </div>
                        </div>

                        {/* Row: Guests */}
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Guests</span>
                                <div className="font-black text-slate-800 text-lg leading-tight mt-0.5">
                                    {booking.guests || 1} {parseInt(booking.guests) === 1 ? 'Guest' : 'Guests'}
                                </div>
                            </div>
                        </div>

                        {/* Row: Cost Breakdown (Accordion) */}
                        {!isCancelled && (
                            <details className="group">
                                <summary className="flex items-start justify-between cursor-pointer list-none select-none">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-500">Total Maintenance Fee</span>
                                        <div className="text-2xl font-black text-slate-800 tracking-tight leading-none mt-1">
                                            ${displayedTotal.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 group-open:bg-indigo-100 transition-colors mt-1">
                                        <span className="group-open:hidden">See Breakdown</span>
                                        <span className="hidden group-open:block">Hide Breakdown</span>
                                    </div>
                                </summary>

                                <div className="pt-4 space-y-2 animate-in slide-in-from-top-1 duration-200">
                                    <div className="h-px bg-slate-100 mb-3"></div>

                                    {/* Breakdown Items */}
                                    {priceDetails?.breakdown?.weeknights > 0 && (
                                        <div className="flex justify-between text-xs md:text-sm text-slate-600">
                                            <span>{priceDetails.breakdown.weeknights} Weeklight{priceDetails.breakdown.weeknights !== 1 ? 's' : ''} x $100</span>
                                            <span className="font-bold text-slate-900">${priceDetails.breakdown.weeknightTotal}</span>
                                        </div>
                                    )}
                                    {priceDetails?.breakdown?.weekends > 0 && (
                                        <div className="flex justify-between text-xs md:text-sm text-slate-600">
                                            <span>{priceDetails.breakdown.weekends} Weekend{priceDetails.breakdown.weekends !== 1 ? 's' : ''} x $125</span>
                                            <span className="font-bold text-slate-900">${priceDetails.breakdown.weekendTotal}</span>
                                        </div>
                                    )}
                                    {priceDetails?.breakdown?.discount > 0 && (
                                        <div className="flex justify-between text-xs md:text-sm text-emerald-600 font-bold">
                                            <span>Weekly Discount</span>
                                            <span>-${priceDetails.breakdown.discount}</span>
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}
                    </div>
                </div>

                {!isCancelled && (
                    <div className="space-y-4">
                        {/* Status Label */}
                        {booking.isPaid ? (
                            <div className="flex items-center gap-3 p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl shadow-sm">
                                <div className="bg-emerald-100 p-2 rounded-full shrink-0">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-emerald-900">Payment Verified</p>
                                    <p className="text-xs text-emerald-700/80">Your booking is fully secured.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-sm flex flex-col gap-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Payment Required</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Please e-transfer <strong>${displayedTotal}</strong> to:
                                </p>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between group cursor-pointer hover:border-indigo-200 transition-colors">
                                    <code className="text-xs font-mono font-bold text-slate-700 select-all">honeymoonhavenresort.lc@gmail.com</code>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Controls */}

            </div>
        </BaseModal >
    );
}
