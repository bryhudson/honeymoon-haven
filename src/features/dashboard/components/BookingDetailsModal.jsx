import React from 'react';
import { BaseModal } from '../../../components/ui/BaseModal';
import { Home, Mail, AlertTriangle, Loader2, CheckCircle2, Send } from 'lucide-react';
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
                                className="flex-1 py-3.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                Pass Turn
                            </button>
                        ) : canCancel ? (
                            <button
                                onClick={onCancel}
                                className="flex-1 py-3.5 bg-white border border-rose-100 text-rose-600 hover:bg-rose-50 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                Cancel Booking
                            </button>
                        ) : null}

                        {booking.isFinalized && booking.isPaid && onEmail && (
                            <button
                                onClick={onEmail}
                                className="flex-1 py-3.5 bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 rounded-2xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                <Mail className="w-4 h-4" />
                                Email Guest
                            </button>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                    >
                        Return to Dashboard
                    </button>
                </div>
            }
        >
            <div className="space-y-6">
                {isCancelled && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
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

                {/* Main Details Card */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Shareholder</p>
                            <p className="font-black text-xl text-slate-900 leading-tight">{booking.shareholderName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Cabin</p>
                            <div className="inline-flex items-center gap-2 font-black text-xl bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-100 text-indigo-600">
                                <Home className="w-4 h-4" />
                                #{booking.cabinNumber}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Dates</p>
                            <p className="font-bold text-slate-700 text-sm">
                                {format(start, 'MMM d')} - {format(end, 'MMM d, yyyy')}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Guests</p>
                            <p className="font-bold text-slate-700 text-sm">{booking.guests || 1} People</p>
                        </div>
                    </div>
                </div>

                {!isCancelled && (
                    <div className="space-y-6">
                        {/* Cost Breakdown - Compact Accordion */}
                        <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                            <details className="group">
                                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-slate-100/50 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Maintenance Fee</span>
                                        <span className="text-2xl font-black text-slate-900 leading-tight">${displayedTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 group-open:bg-indigo-100 transition-colors">
                                        <span className="group-open:hidden">See Breakdown</span>
                                        <span className="hidden group-open:block">Hide Breakdown</span>
                                    </div>
                                </summary>

                                <div className="px-5 pb-5 pt-0 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                    <div className="h-px bg-slate-200 my-2"></div>
                                    {priceDetails?.breakdown?.weeknights > 0 && (
                                        <div className="flex justify-between text-sm text-slate-600">
                                            <span>{priceDetails.breakdown.weeknights} Weeknights x $100</span>
                                            <span className="font-bold text-slate-900">${priceDetails.breakdown.weeknightTotal}</span>
                                        </div>
                                    )}
                                    {priceDetails?.breakdown?.weekends > 0 && (
                                        <div className="flex justify-between text-sm text-slate-600">
                                            <span>{priceDetails.breakdown.weekends} Weekends x $125</span>
                                            <span className="font-bold text-slate-900">${priceDetails.breakdown.weekendTotal}</span>
                                        </div>
                                    )}
                                    {priceDetails?.breakdown?.discount > 0 && (
                                        <div className="flex justify-between text-sm text-emerald-600 font-bold">
                                            <span>Weekly Discount</span>
                                            <span>-${priceDetails.breakdown.discount}</span>
                                        </div>
                                    )}
                                </div>
                            </details>
                        </div>

                        {/* Status Label */}
                        {booking.isPaid ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-2xl shadow-sm shadow-emerald-500/5">
                                    <span className="font-bold text-[10px] uppercase tracking-widest">Payment Status</span>
                                    <span className="px-3 py-1 rounded-lg text-[10px] font-black bg-emerald-500 text-white uppercase tracking-widest shadow-sm">
                                        PAID IN FULL
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                    <div className="bg-emerald-100 p-2.5 rounded-xl shrink-0">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Verified</p>
                                        <p className="text-xs text-slate-500">Thank you! Your booking is fully secured.</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl">
                                    <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Amount Due</span>
                                    <span className="text-2xl font-black text-slate-900 tracking-tight">${displayedTotal.toLocaleString()}</span>
                                </div>

                                <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-5 space-y-4">
                                    <div className="flex items-center gap-2 text-indigo-800">
                                        <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
                                            <Mail className="w-4 h-4" />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Payment Instructions</span>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        Please e-transfer <strong>${displayedTotal}</strong> within 48h to:
                                    </p>
                                    <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-sm flex items-center gap-3 group cursor-pointer hover:border-indigo-200 transition-colors">
                                        <code className="text-xs font-mono font-black text-indigo-700 select-all flex-1">honeymoonhavenresort.lc@gmail.com</code>
                                    </div>
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
