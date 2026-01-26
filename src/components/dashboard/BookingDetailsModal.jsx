import React from 'react';
import { format, differenceInDays } from 'date-fns';
import { CheckCircle2, X, AlertTriangle, Home, Mail } from 'lucide-react';
import { ConfirmationModal } from '../ConfirmationModal';

export function BookingDetailsModal({ booking, onClose, onCancel, onPass, onEdit, onFinalize, onEmail, currentUser, isAdmin }) {
    if (!booking) return null;

    const start = booking.from?.toDate ? booking.from.toDate() : new Date(booking.from);
    const end = booking.to?.toDate ? booking.to.toDate() : new Date(booking.to);
    const nights = differenceInDays(end, start);
    const totalCost = nights * 125;

    // Permissions: Admin OR (Owner AND Future Booking)
    const isOwner = booking.shareholderName === currentUser;
    const isFuture = start > new Date();
    const isFinalized = booking.isFinalized;
    const isCancelled = booking.type === 'cancelled';

    // Permission Logic
    // Cancel: Only finalized bookings
    const canCancel = isFinalized && !isCancelled && onCancel && (isAdmin || (isOwner && isFuture));

    // Pass: Only non-finalized (draft) bookings, requires onPass handler
    const canPass = !isFinalized && !isCancelled && onPass && (isAdmin || isOwner);

    // Edit/Finalize: Drafts only
    const canEdit = !isFinalized && !isCancelled && onEdit && (isAdmin || isOwner);
    const canFinalize = !isFinalized && !isCancelled && onFinalize && (isAdmin || isOwner);

    // Email Logic
    const [showEmailForm, setShowEmailForm] = React.useState(false);
    const [guestEmail, setGuestEmail] = React.useState('');
    const [guestName, setGuestName] = React.useState('Guest'); // Default
    const [sending, setSending] = React.useState(false);
    const [sentSuccess, setSentSuccess] = React.useState(false);
    const [alertData, setAlertData] = React.useState(null);

    const handleSendEmail = async () => {
        if (!guestEmail) return;
        setSending(true);
        try {
            await emailService.sendGuestGuideEmail({
                guestEmail,
                guestName,
                bookingDetails: {
                    checkIn: format(start, 'MMM d, yyyy'),
                    checkOut: format(end, 'MMM d, yyyy'),
                    cabinNumber: booking.cabinNumber
                },
                shareholderName: currentUser
            });
            setSentSuccess(true);
            setTimeout(() => {
                setShowEmailForm(false);
                setSentSuccess(false);
                setGuestEmail('');
                setGuestName('Guest'); // Reset name too
            }, 2000);
        } catch (error) {
            console.error("Error sending email:", error);
            console.error("Error sending email:", error);
            setAlertData({
                title: "Error Sending Email",
                message: `Failed to send email: ${error.message}`,
                isDanger: true
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 md:p-4 animate-in fade-in duration-300">
            {/* Mobile: Full width bottom sheet style or centered card. Using centered card with max-height. */}
            <div className="bg-background md:border md:rounded-2xl shadow-2xl w-full md:max-w-lg h-full md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="p-4 md:p-6 border-b bg-muted/20 flex justify-between items-center flex-shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Booking Details</h2>
                            {isCancelled && (
                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wide border border-red-200">
                                    Cancelled
                                </span>
                            )}
                            {!isFinalized && !isCancelled && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wide border border-amber-200">
                                    Draft
                                </span>
                            )}
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Historical breakdown and payment info</p>
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

                {/* Scrollable Content */}
                <div className="p-4 md:p-6 space-y-5 overflow-y-auto flex-1">
                    {isCancelled && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                            <div className="p-2 bg-white rounded-full text-red-500 shadow-sm mt-0.5">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-bold text-red-900 text-sm">Booking Cancelled</h4>
                                <p className="text-xs text-red-700 mt-0.5 leading-snug">
                                    This booking matches no longer valid. No payment required.
                                </p>
                                {booking.cancelledAt && (
                                    <p className="text-[10px] text-red-600/60 mt-1 font-mono">
                                        {format(booking.cancelledAt.toDate ? booking.cancelledAt.toDate() : new Date(booking.cancelledAt), 'MMM d, yyyy')}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Unified Card: Details */}
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Shareholder</p>
                                <p className="font-bold text-lg text-slate-900 leading-tight">{booking.shareholderName}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cabin</p>
                                <div className="inline-flex items-center gap-1.5 font-bold text-lg bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100">
                                    <Home className="w-3.5 h-3.5 text-slate-500" />
                                    #{booking.cabinNumber}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dates</p>
                                <p className="font-bold text-slate-700 text-sm">
                                    {format(start, 'MMM d')} - {format(end, 'MMM d, yyyy')}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Guests</p>
                                <p className="font-bold text-slate-700 text-sm">{booking.guests || 1} People</p>
                            </div>
                        </div>
                    </div>



                    {!isCancelled && (
                        <>
                            {/* Cost Breakdown */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-xs text-slate-500 px-1 font-medium">
                                    <span>Rate ({nights} nights × $125)</span>
                                    <span>${totalCost.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Payment Info */}
                            {booking.isPaid ? (
                                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                                    <div className="flex justify-between items-center p-4 bg-green-50/50 text-green-900 border border-green-200 rounded-xl">
                                        <span className="font-bold text-sm uppercase tracking-wider">Status</span>
                                        <span className="px-2 py-1 rounded text-xs font-black bg-green-500 text-white uppercase tracking-widest shadow-sm">
                                            PAID IN FULL
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl text-green-800">
                                        <div className="bg-green-200/50 p-2 rounded-full shrink-0">
                                            <CheckCircle2 className="w-5 h-5 text-green-700" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">Payment Verified</p>
                                            <p className="text-xs opacity-80">Thank you! Your booking is fully secured.</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-4 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl shadow-sm">
                                        <span className="font-bold text-sm text-slate-500 uppercase tracking-wider">Amount Due</span>
                                        <span className="text-2xl font-black text-slate-900 tracking-tight">${totalCost.toLocaleString()}</span>
                                    </div>

                                    <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4 space-y-3">
                                        <div className="flex items-center gap-2 text-blue-800 mb-1">
                                            <div className="p-1 bg-blue-100 rounded text-blue-600">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-wide">Payment Instructions</span>
                                        </div>
                                        <div className="pl-1">
                                            <p className="text-xs text-slate-600 mb-2">
                                                Please e-transfer <strong>${totalCost}</strong> within 48h to:
                                            </p>
                                            <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-blue-100 shadow-sm">
                                                <code className="text-xs font-mono font-bold text-blue-700 break-all select-all">honeymoonhavenresort.lc@gmail.com</code>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Email Form Modal (Overlay on top of Booking Modal) */}
                {showEmailForm && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-blue-600" />
                                    Email Guest Guide
                                </h3>
                                <button
                                    onClick={() => setShowEmailForm(false)}
                                    className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {!sentSuccess ? (
                                    <>
                                        <p className="text-sm text-slate-600">
                                            Send the <strong>Trailer Checklist & Guest Rules</strong> directly to your guest.
                                            The email will appear to come from <strong>{currentUser}</strong>.
                                            <span className="block mt-2 p-2 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs font-bold flex items-center gap-2">
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                Note: Financial/Payment details are NOT included.
                                            </span>
                                        </p>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Guest Email</label>
                                                <input
                                                    type="email"
                                                    placeholder="guest@example.com"
                                                    value={guestEmail}
                                                    onChange={(e) => setGuestEmail(e.target.value)}
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Guest Name (Optional)</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. John"
                                                    value={guestName}
                                                    onChange={(e) => setGuestName(e.target.value)}
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleSendEmail}
                                            disabled={!guestEmail || sending}
                                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            {sending ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    Send Email
                                                </>
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center py-4 space-y-3 animate-in fade-in zoom-in">
                                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <h4 className="font-bold text-slate-900 text-lg">Email Sent!</h4>
                                        <p className="text-sm text-slate-600">
                                            The guide has been successfully sent to <strong>{guestEmail}</strong>.
                                        </p>
                                        <button
                                            onClick={() => {
                                                setShowEmailForm(false);
                                                setSentSuccess(false);
                                                setGuestEmail('');
                                            }}
                                            className="mt-4 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors text-sm"
                                        >
                                            Close
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 bg-muted/30 border-t flex flex-col md:flex-row gap-3 md:gap-0 justify-between items-center flex-shrink-0">
                    <div className="w-full md:w-auto flex gap-2">
                        {canPass ? (
                            <>
                                {canFinalize && (
                                    <button
                                        onClick={onFinalize}
                                        className="flex-1 md:flex-none px-4 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
                                    >
                                        Finalize
                                    </button>
                                )}
                                {canEdit && (
                                    <button
                                        onClick={onEdit}
                                        className="flex-1 md:flex-none px-4 py-2.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
                                    >
                                        Edit
                                    </button>
                                )}
                                <button
                                    onClick={onPass}
                                    className="flex-1 md:flex-none px-4 py-2.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl text-sm font-bold transition-all active:scale-95"
                                >
                                    Pass
                                </button>
                            </>
                        ) : canCancel ? (
                            <button
                                onClick={onCancel}
                                className="w-full md:w-auto px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors"
                            >
                                Cancel Booking
                            </button>
                        ) : null}

                        {/* Email Guest Button (Paid & Confirmed) */}
                        {booking.isFinalized && booking.isPaid && onEmail && (
                            <button
                                onClick={onEmail}
                                className="w-full md:w-auto px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                <Mail className="w-4 h-4" />
                                Email Guest
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 md:flex-none px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
                        >
                            Close
                        </button>
                    </div>
                </div>
                <ConfirmationModal
                    isOpen={!!alertData}
                    onClose={() => setAlertData(null)}
                    onConfirm={() => setAlertData(null)}
                    title={alertData?.title}
                    message={alertData?.message}
                    isDanger={alertData?.isDanger}
                    confirmText="OK"
                    showCancel={false}
                />
            </div>
        </div>
    );
}
