import React from 'react';
import { TestTube, Clock, Zap } from 'lucide-react';

export function EmailTestingCenter({ initiateTestReminder, initiateTestTransaction }) {
    const transactionEvents = [
        { id: "turnStarted", name: "Turn Started", desc: "When active status begins", subject: "It's YOUR Turn! 🎉" },
        { id: "turnPassed", name: "Turn Passed (Next)", desc: "Bonus Time - user passed early", subject: "Early Access Unlocked! 🎁" },
        { id: "autoPass", name: "Auto Pass (Next)", desc: "Clock Started - timeout from prev", subject: "It's Your Turn! 🎯" },
        { id: "autoPassCurrent", name: "Auto Pass (Skipped)", desc: "Timeout notification to prev user", subject: "Your Turn Has Ended ⌛" },
        { id: "bookingConfirmed", name: "Booking Confirmed", desc: "User finalizes dates", subject: "Booking Confirmed" },
        { id: "paymentReminder", name: "Maintenance Fee Reminder", desc: "Manually triggered / Auto", subject: "E-Transfer Due" },
        { id: "paymentReceived", name: "Maintenance Fee Received", desc: "Admin marks as Paid", subject: "Fee Received" },
        { id: "bookingCancelled", name: "Booking Cancelled", desc: "Admin cancels booking", subject: "Booking Cancelled" },
        { id: "openSeasonStarted", name: "Open Season Blast", desc: "Draft End / Free-for-all", subject: "Open Season is Here! 🌲" }
    ];

    const adminEvents = [
        { id: "paymentOverdueAdmin", name: "Payment Overdue Alert", desc: "Sent when 48h e-transfer deadline passes", subject: "⚠️ Overdue Payment: [Name]" }
    ];

    return (
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <TestTube className="w-5 h-5 text-indigo-700" />
                    <span className="text-indigo-900">Email System Overview & Testing</span>
                </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT: Timed Reminders */}
                <div className="space-y-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800">Timed Reminders (48h Window)</h4>
                            <p className="text-xs text-slate-500 mt-1">
                                These run automatically on a set schedule relative to the turn start.
                            </p>
                        </div>
                    </div>

                    <div className="relative pl-4 space-y-6 border-l-2 border-slate-100 ml-2">
                        {[
                            { id: 'evening', label: 'Day 1 Evening (7 PM)', time: '7:00 PM (First Night)', sub: '"Your Honeymoon Haven Booking Awaits"', color: 'text-blue-600' },
                            { id: 'day2', label: 'Day 2 Morning (9 AM)', time: '9:00 AM (Middle)', sub: '"Complete Your Booking"', color: 'text-blue-600' },
                            { id: 'evening2', label: 'Day 2 Evening (7 PM)', time: '7:00 PM (Night 2)', sub: '"Friendly reminder..."', color: 'text-purple-600' },
                            { id: 'final6am', label: 'Final Morning (6 AM)', time: '6:00 AM (Final Day)', sub: '4 Hours Remaining', color: 'text-amber-600' },
                            { id: 'final9am', label: 'Urgent Warning (9 AM)', time: '9:00 AM (1 Hour Left)', sub: '"URGENT: 1 Hour Left"', color: 'text-red-600', urgent: true }
                        ].map((r) => (
                            <div key={r.id} className="relative">
                                <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white ${r.urgent ? 'bg-red-500 animate-pulse' : 'bg-slate-200'}`}></div>
                                <div className="flex items-center justify-between group">
                                    <div>
                                        <div className={`text-xs font-bold ${r.color} mb-0.5`}>{r.label.split(' (')[0]}</div>
                                        <div className="text-sm font-bold text-slate-700">{r.time}</div>
                                        <div className="text-xs text-slate-400">{r.sub}</div>
                                    </div>
                                    <button
                                        onClick={() => initiateTestReminder(r.id, r.label)}
                                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-medium hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-all flex items-center gap-1"
                                    >
                                        <Zap className="w-3 h-3" /> Test
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Payment Reminders Section */}
                    <div className="space-y-6 pt-6 border-t border-slate-100">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Clock className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">Maintenance Fee Reminders</h4>
                                <p className="text-xs text-slate-500 mt-1">Automated payment nudges based on booking time.</p>
                            </div>
                        </div>

                        <div className="relative pl-4 space-y-6 border-l-2 border-slate-100 ml-2">
                            {[
                                { id: 'paymentReminder', label: 'Payment Reminder (Day 1)', time: '9:00 AM (Next Day)', sub: '"Maintenance Fee Due"', color: 'text-green-600' },
                                { id: 'paymentReminderDay2', label: 'Payment Reminder (Day 2)', time: '9:00 AM (Day 2)', sub: '"Maintenance Fee Due"', color: 'text-green-600' },
                                { id: 'paymentReminder_urgent', label: 'Urgent Payment Warning', time: 'T-6 Hours', sub: '"URGENT: 48-hour window"', color: 'text-red-600', urgent: true }
                            ].map((r) => (
                                <div key={r.id} className="relative">
                                    <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white ${r.urgent ? 'bg-red-500 animate-pulse' : 'bg-slate-200'}`}></div>
                                    <div className="flex items-center justify-between group">
                                        <div>
                                            <div className={`text-xs font-bold ${r.color} mb-0.5`}>{r.label}</div>
                                            <div className="text-sm font-bold text-slate-700">{r.time}</div>
                                            <div className="text-xs text-slate-400">{r.sub}</div>
                                        </div>
                                        <button
                                            onClick={() => initiateTestTransaction('paymentReminder', r.label)}
                                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-medium hover:bg-green-50 text-slate-500 hover:text-green-600 transition-all flex items-center gap-1"
                                        >
                                            <Zap className="w-3 h-3" /> Test
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Transactional Events */}
                <div className="space-y-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Zap className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800">Transactional Events</h4>
                            <p className="text-xs text-slate-500 mt-1">Triggered by system actions and user interactions.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {transactionEvents.map((event) => (
                            <div key={event.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg group hover:border-indigo-200 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-slate-50 rounded-md text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                        <Zap className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-700">{event.name}</div>
                                        <div className="text-xs text-slate-400">"{event.subject}"</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => initiateTestTransaction(event.id, event.name)}
                                    className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold hover:bg-indigo-100 transition-all"
                                >
                                    Test
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Admin Alerts */}
                    <div className="pt-6 border-t border-slate-200 space-y-4 mt-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <Zap className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">Admin-Only Alerts</h4>
                                <p className="text-xs text-slate-500 mt-1">Internal notifications for admins.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {adminEvents.map((event) => (
                                <div key={event.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg group hover:border-red-300 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-white rounded-md text-red-400 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                                            <Zap className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-red-700">{event.name}</div>
                                            <div className="text-xs text-red-500">"{event.subject}"</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => initiateTestTransaction(event.id, event.name)}
                                        className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-red-100 text-red-600 rounded text-[10px] font-bold hover:bg-red-200 transition-all"
                                    >
                                        Test
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
