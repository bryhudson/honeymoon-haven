import React from 'react';
import { format, differenceInDays } from 'date-fns';
import { Send, Loader2, Mail, CheckCircle2, X } from 'lucide-react';
import { emailService } from '../../services/emailService';

export function BookingDetailsModal({ booking, onClose, onCancel, onPass, onEdit, onFinalize, currentUser, isAdmin }) {
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

    const handleSendEmail = async (e) => {
        e.preventDefault();
        if (!guestEmail) return;
        setSending(true);
        try {
            await emailService.sendGuestGuideEmail(guestEmail, guestName);
            setSentSuccess(true);
            setTimeout(() => {
                setShowEmailForm(false);
                setSentSuccess(false);
                setGuestEmail('');
            }, 2000);
        } catch (error) {
            console.error("Error sending email:", error);
            alert("Failed to send email. Please try again.");
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

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-4 md:gap-y-6">
                        <div className="col-span-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Shareholder</p>
                            <p className="font-bold text-base md:text-lg leading-tight">{booking.shareholderName}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Cabin</p>
                            <div className="flex items-center gap-1.5 font-bold text-base md:text-lg">
                                <span className="p-1 bg-slate-100 rounded text-slate-600">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                </span>
                                #{booking.cabinNumber}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Guests</p>
                            <p className="font-bold text-base md:text-lg">{booking.guests || 1} People</p>
                        </div>
                    </div>

                    {/* Compact Date Box */}
                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 md:p-4 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Dates</p>
                            <p className="font-bold text-slate-700 text-sm md:text-base">
                                {format(start, 'MMM d')} <span className="text-slate-300 px-1">—</span> {format(end, 'MMM d, yyyy')}
                            </p>
                        </div>
                        <div className="text-right pl-4 border-l border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Duration</p>
                            <p className="font-bold text-blue-600 text-sm md:text-base whitespace-nowrap">{nights} Nights</p>
                        </div>
                    </div>

                    {!isCancelled && (
                        <>
                            {/* Cost Breakdown */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs md:text-sm text-slate-500 px-1">
                                    <span>Fee ({nights} nights × $125)</span>
                                    <span className="font-medium">${totalCost.toLocaleString()}</span>
                                </div>

                                <div className="flex justify-between items-center p-3 bg-slate-100/50 text-slate-700 border border-slate-200 rounded-xl shadow-sm">
                                    <span className="font-bold text-sm text-slate-500 uppercase tracking-wider">Amount Due</span>
                                    <div className="flex items-center gap-2">
                                        {booking.isPaid && (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-green-500 text-white uppercase tracking-widest">
                                                PAID
                                            </span>
                                        )}
                                        <span className="text-xl font-bold text-slate-900">${totalCost.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Info */}
                            {booking.isPaid ? (
                                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl text-green-700">
                                    <div className="bg-green-100 p-1.5 rounded-full shrink-0">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="text-xs font-semibold">Payment confirmed. Thank you!</p>
                                </div>
                            ) : (
                                <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-3 md:p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-blue-700 mb-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-xs font-bold uppercase tracking-wide">Payment Instructions</span>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        E-transfer <strong>${totalCost}</strong> within 48h to:
                                    </p>
                                    <div className="flex items-center gap-2 bg-white p-2 rounded border border-blue-100 shadow-sm relative group">
                                        <code className="text-xs font-mono font-bold text-blue-700 break-all select-all">honeymoonhavenresort.lc@gmail.com</code>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Email Form Overlay */}
                {showEmailForm && (
                    <div className="absolute inset-0 bg-white z-20 flex flex-col animate-in slide-in-from-bottom-5 duration-300">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold flex items-center gap-2">
                                <Mail className="w-5 h-5 text-blue-600" />
                                Email Guest Guide
                            </h3>
                            <button onClick={() => setShowEmailForm(false)} className="p-1 hover:bg-slate-200 rounded-full">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        {sentSuccess ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <h4 className="text-xl font-bold text-slate-900">Email Sent!</h4>
                                <p className="text-slate-600">The guest guide has been sent successfully.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSendEmail} className="p-6 flex-1 flex flex-col gap-4">
                                <p className="text-sm text-slate-600">
                                    Send the <strong>Trailer Checklist & Guest Rules</strong> directly to your guest.
                                    The email will appear to come from <strong>{currentUser}</strong>.
                                </p>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500">Guest Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                        placeholder="e.g. John Doe"
                                        value={guestName}
                                        onChange={e => setGuestName(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500">Guest Email</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                        placeholder="guest@example.com"
                                        value={guestEmail}
                                        onChange={e => setGuestEmail(e.target.value)}
                                    />
                                </div>

                                <div className="mt-auto pt-4">
                                    <button
                                        type="submit"
                                        disabled={sending}
                                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        {sending ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                Send Email
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
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
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        {/* Email Button */}
                        {!isCancelled && (isAdmin || isOwner) && (
                            <button
                                onClick={() => setShowEmailForm(true)}
                                className="px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                                title="Email Guest Guide"
                            >
                                <Mail className="w-4 h-4" />
                                <span className="hidden md:inline">Email Guest</span>
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="flex-1 md:flex-none px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
