import React, { useState } from 'react';
import { BaseModal } from '../../../components/ui/BaseModal';
import { Mail, Send, Loader2, CheckCircle2, AlertTriangle, User, ShieldCheck } from 'lucide-react';
import { emailService } from '../../../services/emailService';
import { format } from 'date-fns';

export function EmailGuestModal({ booking, currentUser, onClose }) {
    const [guestEmail, setGuestEmail] = useState('');
    const [guestName, setGuestName] = useState('Guest');
    const [sending, setSending] = useState(false);
    const [sentSuccess, setSentSuccess] = useState(false);
    const [error, setError] = useState(null);

    const start = booking.from?.toDate ? booking.from.toDate() : new Date(booking.from);
    const end = booking.to?.toDate ? booking.to.toDate() : new Date(booking.to);

    const handleSendEmail = async () => {
        if (!guestEmail) return;
        setSending(true);
        setError(null);
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
                onClose();
            }, 2500);
        } catch (err) {
            console.error("Error sending email:", err);
            setError(err.message || "Failed to send guest guide.");
        } finally {
            setSending(false);
        }
    };

    return (
        <BaseModal
            isOpen={true}
            onClose={onClose}
            title="Guest Guide"
            description="Share rules and check-in info with your guests"
            maxSize="max-w-sm"
            showClose={!sending}
        >
            <div className="space-y-6">
                {!sentSuccess ? (
                    <>
                        <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3">
                            <div className="flex items-start gap-3">
                                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-slate-800">Sender: {currentUser}</p>
                                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">
                                        Your guest will receive the <strong>HHR Trailer Checklist & Rules</strong>. Financial details are excluded.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); handleSendEmail(); }} className="space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <Mail className="w-3 h-3" /> Guest Email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="guest@example.com"
                                        value={guestEmail}
                                        onChange={(e) => setGuestEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                        disabled={sending}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <User className="w-3 h-3" /> Guest name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. John"
                                        value={guestName}
                                        onChange={(e) => setGuestName(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                        disabled={sending}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold rounded-xl flex items-center gap-2">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={sending}
                                    className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-700 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all text-[11px] disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!guestEmail || sending}
                                    className="flex-1 py-3.5 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 text-[11px] disabled:opacity-50"
                                >
                                    {sending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Send
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-50/50">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 text-lg tracking-tight">Guide Sent!</h4>
                            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                                The guest guide has been successfully delivered to <span className="text-indigo-600 font-bold">{guestEmail}</span>.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-full py-3.5 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-lg"
                        >
                            Return
                        </button>
                    </div>
                )}
            </div>
        </BaseModal>
    );
}
