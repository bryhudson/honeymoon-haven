import React, { useState, useEffect } from 'react';
import { BaseModal } from '../../../components/ui/BaseModal';
import { format } from 'date-fns';
import { DollarSign, Calendar, User, Hash, FileText, AlertTriangle } from 'lucide-react';
import { formatNameForDisplay } from '../../../lib/shareholders';
import { calculateBookingCost } from '../../../lib/pricing';

export function PaymentConfirmModal({ isOpen, onClose, onConfirm, booking }) {
    const [amount, setAmount] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [notes, setNotes] = useState('');
    const [paidAt, setPaidAt] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && booking) {
            const existing = booking.paymentDetails;
            const existingPaidAt = existing?.paidAt?.toDate ? existing.paidAt.toDate()
                : existing?.paidAt ? new Date(existing.paidAt)
                : new Date();
            setAmount(
                existing?.amount != null ? String(existing.amount)
                : booking.totalPrice != null ? String(booking.totalPrice) : ''
            );
            setTransactionId(existing?.reference || '');
            setNotes(existing?.notes || '');
            setPaidAt(format(existingPaidAt, 'yyyy-MM-dd'));
            setSubmitting(false);
        }
    }, [isOpen, booking]);

    if (!booking) return null;

    const expected = booking.totalPrice || 0;
    const parsedAmount = parseFloat(amount);
    const amountValid = !isNaN(parsedAmount) && parsedAmount >= 0;
    const amountMismatch = amountValid && parsedAmount !== expected;
    const canSubmit = amountValid && !submitting;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        try {
            await onConfirm({
                paidAmount: parsedAmount,
                paymentRef: transactionId.trim() || null,
                paymentNotes: notes.trim() || null,
                paidAt: new Date(paidAt + 'T12:00:00')
            });
        } finally {
            setSubmitting(false);
        }
    };

    const fromDate = booking.from ? new Date(booking.from) : null;
    const toDate = booking.to ? new Date(booking.to) : null;
    const cost = (fromDate && toDate) ? calculateBookingCost(fromDate, toDate) : null;
    const breakdown = cost?.breakdown;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={booking.isPaid ? "Edit Fee Details" : "Record Fee"}
            description={booking.isPaid ? "Update the e-transfer details for this booking" : "Record the e-transfer details for this booking"}
            maxSize="max-w-lg"
        >
            {/* Compact booking summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3 mb-4 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-800">{formatNameForDisplay(booking.shareholderName)}</span>
                        <span className="text-[11px] text-slate-500">Cabin #{booking.cabinNumber}</span>
                    </div>
                    {fromDate && toDate && (
                        <span className="text-[11px] text-slate-500">{format(fromDate, 'MMM d')} – {format(toDate, 'MMM d, yyyy')}</span>
                    )}
                </div>

                {breakdown && (
                    <div className="pt-2 border-t border-slate-200 space-y-1">
                        {breakdown.weeknights > 0 && (
                            <div className="flex items-center justify-between text-[11px] text-slate-600">
                                <span>{breakdown.weeknights} Weeknight{breakdown.weeknights !== 1 ? 's' : ''} × $100</span>
                                <span className="font-semibold text-slate-800">${breakdown.weeknightTotal.toLocaleString()}</span>
                            </div>
                        )}
                        {breakdown.weekends > 0 && (
                            <div className="flex items-center justify-between text-[11px] text-slate-600">
                                <span>{breakdown.weekends} Weekend night{breakdown.weekends !== 1 ? 's' : ''} × $125</span>
                                <span className="font-semibold text-slate-800">${breakdown.weekendTotal.toLocaleString()}</span>
                            </div>
                        )}
                        {breakdown.discount > 0 && (
                            <div className="flex items-center justify-between text-[11px] text-emerald-600 font-semibold">
                                <span>Weekly Discount ({breakdown.fullWeeks} wk{breakdown.fullWeeks !== 1 ? 's' : ''})</span>
                                <span>−${breakdown.discount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expected Fee</span>
                            <span className="text-base font-black text-slate-800">${expected.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                {/* Amount + Date side by side */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> Collected
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">$</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                required
                            />
                        </div>
                        {amountMismatch && (
                            <div className="flex items-center gap-1 text-[10px] text-amber-700 font-medium">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>Differs from expected</span>
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Date Received
                        </label>
                        <input
                            type="date"
                            value={paidAt}
                            onChange={(e) => setPaidAt(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                            required
                        />
                    </div>
                </div>

                {/* Reference */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                        <Hash className="w-3 h-3" /> Reference <span className="text-slate-300 normal-case tracking-normal">(optional)</span>
                    </label>
                    <input
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="e.g. Interac ref #CA1234567890"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                </div>

                {/* Notes */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Notes <span className="text-slate-300 normal-case tracking-normal">(optional)</span>
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        placeholder="Partial payment, adjustment reason, etc."
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
                    />
                </div>

                <div className="flex gap-3 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors"
                    >
                        {submitting ? 'Saving…' : (booking.isPaid ? 'Save Changes' : 'Record Fee')}
                    </button>
                </div>
            </form>
        </BaseModal>
    );
}
