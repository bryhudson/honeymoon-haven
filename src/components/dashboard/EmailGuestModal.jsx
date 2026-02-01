import React, { useState } from 'react';
import { Mail, X, Send, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ConfirmationModal } from '../ConfirmationModal';
import { emailService } from '../../services/emailService';
import { format } from 'date-fns';

export function EmailGuestModal({ booking, currentUser, onClose }) {
    const [guestEmail, setGuestEmail] = useState('');
    const [guestName, setGuestName] = useState('Guest');
    const [sending, setSending] = useState(false);
    const [sentSuccess, setSentSuccess] = useState(false);
    const [alertData, setAlertData] = useState(null);

    const start = booking.from?.toDate ? booking.from.toDate() : new Date(booking.from);
    const end = booking.to?.toDate ? booking.to.toDate() : new Date(booking.to);

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
                onClose();
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-blue-600" />
                        Email Guest Guide
                    </h3>
                    <button
                        onClick={onClose}
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
                                    Note: Financial/Fee details are NOT included.
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
                                onClick={onClose}
                                className="mt-4 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors text-sm"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
