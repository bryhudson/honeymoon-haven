import React from 'react';
import { format, differenceInDays } from 'date-fns';

export function BookingDetailsModal({ booking, onClose }) {
    if (!booking) return null;

    const start = booking.from?.toDate ? booking.from.toDate() : new Date(booking.from);
    const end = booking.to?.toDate ? booking.to.toDate() : new Date(booking.to);
    const nights = differenceInDays(end, start);
    const totalCost = nights * 125;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="bg-background border rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b bg-muted/20 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Booking Details</h2>
                        <p className="text-sm text-muted-foreground">Historical breakdown and payment info</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shareholder</p>
                            <p className="font-bold text-lg">{booking.shareholderName}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cabin</p>
                            <p className="font-bold text-lg">#{booking.cabinNumber}</p>
                        </div>
                    </div>

                    <div className="space-y-1 border-t pt-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dates</p>
                        <p className="font-medium text-lg">
                            {format(start, 'MMMM d, yyyy')} — {format(end, 'MMMM d, yyyy')}
                        </p>
                        <p className="text-sm text-blue-600 font-semibold">{nights} Nights Total</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Maintenance Fee ({nights} nights × $125)</span>
                            <span className="font-semibold text-slate-900">${totalCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                            <span className="font-bold text-slate-900">Total Amount Due</span>
                            <div className="flex items-center gap-2">
                                {booking.isPaid && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 uppercase tracking-widest">
                                        PAID
                                    </span>
                                )}
                                <span className="text-xl font-extrabold text-blue-700">${totalCost.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {booking.isPaid ? (
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-2 text-green-600">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-bold">Payment Received</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Thank you! Your payment has been received and your booking is fully secured.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-2 text-amber-600">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-bold">Payment Instructions</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Please send an e-transfer for the total amount to the resort email below within 48 hours of booking.
                            </p>
                            <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100 group">
                                <code className="text-[13px] font-mono font-bold text-blue-700 flex-1">honeymoonhavenresort.lc@gmail.com</code>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-muted/10 border-t flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
