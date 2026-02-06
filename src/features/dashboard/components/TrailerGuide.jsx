import React, { useState } from 'react';
import { format } from 'date-fns';
import {
    Droplets,
    Zap,
    ThermometerSnowflake,
    Flame,
    AlertCircle,
    CheckCircle2,
    AlertTriangle,

    Trash2,
    Wind,
    Key,
    ListChecks,
    BookOpen,
    LifeBuoy,
    Trees,
    Car,
    Moon,
    Wine,
    Waves,
    LogIn,
    LogOut,
    Send,
    Loader2,
    X,
    Mail
} from 'lucide-react';
import { CABIN_OWNERS } from '../../../lib/shareholders';
import { emailService } from '../../../services/emailService';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';



export function TrailerGuide({ shareholderName, booking }) {
    const [activeTab, setActiveTab] = useState('resort-rules');

    // Email Modal State
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [guestEmail, setGuestEmail] = useState('');
    const [guestName, setGuestName] = useState('');
    const [sending, setSending] = useState(false);
    const [sentSuccess, setSentSuccess] = useState(false);
    const [alertData, setAlertData] = useState(null);

    const handleSendEmail = async () => {
        if (!guestEmail) return;
        setSending(true);

        // Prepare Booking Details if available
        let bookingDetails = {};
        if (booking) {
            const start = booking.from?.toDate ? booking.from.toDate() : new Date(booking.from);
            const end = booking.to?.toDate ? booking.to.toDate() : new Date(booking.to);
            bookingDetails = {
                checkIn: format(start, 'MMM d, yyyy'),
                checkOut: format(end, 'MMM d, yyyy'),
                cabinNumber: booking.cabinNumber
            };
        }

        try {
            await emailService.sendGuestGuideEmail({
                guestEmail,
                guestName,
                bookingDetails,
                shareholderName: shareholderName || "A HHR Shareholder"
            });
            setSentSuccess(true);
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
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden relative">
            {/* Header / Tabs */}
            <div className="flex border-b relative">
                <button
                    onClick={() => setActiveTab('resort-rules')}
                    className={`flex-1 py-3 md:py-4 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 font-bold text-xs md:text-sm uppercase tracking-wider transition-colors ${activeTab === 'resort-rules'
                        ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                >
                    <BookOpen className="w-4 h-4 md:w-4 md:h-4" />
                    <span className="text-center">Guest Rules</span>
                </button>
                <div className="w-px bg-slate-200"></div>
                <button
                    onClick={() => setActiveTab('check-in')}
                    className={`flex-1 py-3 md:py-4 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 font-bold text-xs md:text-sm uppercase tracking-wider transition-colors ${activeTab === 'check-in'
                        ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                >
                    <LogIn className="w-4 h-4 md:w-4 md:h-4" />
                    Check In
                </button>
                <div className="w-px bg-slate-200"></div>
                <button
                    onClick={() => setActiveTab('check-out')}
                    className={`flex-1 py-3 md:py-4 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 font-bold text-xs md:text-sm uppercase tracking-wider transition-colors ${activeTab === 'check-out'
                        ? 'bg-rose-50 text-rose-700 border-b-2 border-rose-500'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                >
                    <LogOut className="w-4 h-4 md:w-4 md:h-4" />
                    Check Out
                </button>
            </div>

            <div className="p-4 md:p-8">
                {activeTab === 'check-in' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0 mt-1">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-base">Power & Water Heater</h4>
                                <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                    Turn on the water heater switch in the bathroom to <strong>ELECTRIC</strong>.
                                    <span className="block text-rose-600 font-semibold mt-1 text-sm uppercase tracking-wide">⚠️ Do not use the GAS switch.</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg shrink-0 mt-1">
                                <ThermometerSnowflake className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-base">Refrigerator</h4>
                                <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                    Check that the fridge is set to <strong>ELECTRIC</strong>.
                                    <span className="block text-rose-600 font-semibold mt-1 text-sm uppercase tracking-wide">⚠️ Do not use the GAS switch.</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg shrink-0 mt-1">
                                <Droplets className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-base">Water Tanks (Grey & Black)</h4>
                                <div className="text-slate-600 text-sm mt-1 space-y-2 leading-relaxed">
                                    <p>Check levels on the monitor panel in the bathroom. <span className="italic text-slate-400">(Note: Sensors may read half-full incorrectly).</span></p>
                                    <p><strong>Every 48 Hours:</strong> Empty both tanks into the septic. Always drain <strong>Black (Sewer)</strong> first, followed by <strong>Grey (Sink/Bath)</strong>.</p>
                                    <p className="font-medium text-slate-800">Close drain lines when finished to prevent smells.</p>
                                    <p className="text-sm bg-slate-100 p-2 rounded border border-slate-200">
                                        Note: Grey water fills fast! If tanks are full upon arrival, please notify a cabin owner.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0 mt-1">
                                <Flame className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-base">Stove & Oven</h4>
                                <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                    Both can be lit using the push-button igniter or a match.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg shrink-0 mt-1">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-base">Issues?</h4>
                                <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                    If propane tanks are empty (check front of trailer), consult your cabin owner for replacement/reimbursement.
                                    <br />
                                    Please report any initial issues immediately to a cabin owner.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'resort-rules' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">


                        {/* Rules Grid */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-sky-100 text-sky-600 rounded-lg shrink-0 mt-0.5">
                                    <Waves className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-base">Hot Tub & Safety</h4>
                                    <ul className="text-sm text-slate-600 mt-1 space-y-1">
                                        <li>• Age <strong>5+</strong> only. Supervise kids.</li>
                                        <li>• <span className="text-rose-600 font-bold">No food or drink</span> (water/alcohol ok).</li>
                                        <li>• Always <strong>replace the lid</strong> after use.</li>
                                        <li>• No lifeguards on duty at beach/dock.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg shrink-0 mt-0.5">
                                    <Trash2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-base">Waste & Septic</h4>
                                    <ul className="text-sm text-slate-600 mt-1 space-y-1">
                                        <li>• <strong>Septic Sensitive:</strong> 1-ply paper only.</li>
                                        <li>• <span className="text-rose-600 font-bold">NO FLUSHABLE WIPES</span> or products.</li>
                                        <li>• Sort Garbage vs. Recycling bins.</li>
                                        <li>• Returnables (cans/bottles) in small bins.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0 mt-0.5">
                                    <Trees className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-base">Firewood & Outdoors</h4>
                                    <ul className="text-sm text-slate-600 mt-1 space-y-1">
                                        <li>• Split wood as you use it.</li>
                                        <li>• Respect provincial fire bans.</li>
                                        <li>• Do <strong>not</strong> use fences as drying racks.</li>
                                        <li>• Clean up beach/fire pit areas after use.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                                    <Moon className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-base">Community</h4>
                                    <ul className="text-sm text-slate-600 mt-1 space-y-1">
                                        <li>• <strong>Quiet Time:</strong> 11:00 PM - 8:00 AM.</li>
                                        <li>• Speed Limit: <strong>10 km/h</strong> max.</li>
                                        <li>• Park in assigned spots only.</li>
                                        <li>• Be considerate of neighbors!</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'check-out' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0 mt-1">
                                <LogOut className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-base">Systems Off</h4>
                                <ul className="text-sm text-slate-600 mt-1 space-y-1 list-disc list-inside">
                                    <li>Turn <strong>OFF</strong> Water Heater switch (Electric).</li>
                                    <li>Ensure Furnace / Air Conditioning is <strong>OFF</strong>.</li>
                                    <li>Turn <strong>OFF</strong> all inside/outside lights.</li>
                                    <li>Retract awning.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg shrink-0 mt-1">
                                <Droplets className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-base">Final Tank Drain (Critical)</h4>
                                <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                    <strong>1.</strong> Drain Black Water (Sewer).<br />
                                    <strong>2.</strong> Drain Grey Water (Sink/Bath).<br />
                                    <strong>3.</strong> Close valves.<br />
                                    <strong>4.</strong> Add septic cleaner to toilet and flush once.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg shrink-0 mt-1">
                                <ThermometerSnowflake className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-base">Refrigerator</h4>
                                <ul className="text-sm text-slate-600 mt-1 space-y-1">
                                    <li>Turn <strong>OFF</strong> (unless new renter arrives tomorrow).</li>
                                    <li>Clean and wipe out fridge & microwave.</li>
                                    <li className="font-bold text-rose-600">⚠️ Leave fridge doors OPEN if turned off to prevent mold.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg shrink-0 mt-1">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-base">Cleaning</h4>
                                <ul className="text-sm text-slate-600 mt-1 space-y-1 list-disc list-inside">
                                    <li>Clean floors, carpets, sinks, toilet counters.</li>
                                    <li>Fold sheets and clean all surfaces.</li>
                                    <li>Give used rags/towels to your cabin owner.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-sky-100 text-sky-600 rounded-lg shrink-0 mt-1">
                                <Wind className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-base">Ventilation (Summer)</h4>
                                <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                    Leave several windows cracked and ensure the bathroom ceiling vent is left <strong>open</strong>.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg shrink-0 mt-1">
                                <Key className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-base">Lock Up</h4>
                                <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                    Ensure front and back doors are locked. Return key to shed workbench or cabin owner.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Email Guest Modal */}
            {isEmailModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-blue-600" />
                                Email Guest Guide
                            </h3>
                            <button
                                onClick={() => setIsEmailModalOpen(false)}
                                className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {!sentSuccess ? (
                                <>
                                    <p className="text-sm text-slate-600">
                                        Send the <strong>Resort Guest Guide</strong> (Rules, Location) directly to your guest.
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
                                        onClick={() => {
                                            setIsEmailModalOpen(false);
                                            setSentSuccess(false);
                                            setGuestEmail('');
                                            setGuestName('');
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
    );
}
