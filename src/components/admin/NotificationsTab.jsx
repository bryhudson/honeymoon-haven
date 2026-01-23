import React, { useState } from 'react';
import { Mail, Calendar, Clock, Zap } from 'lucide-react';

export function NotificationsTab({ triggerAlert }) {
    const [testEmail, setTestEmail] = useState('bryan.m.hudson@gmail.com');

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Mail className="w-8 h-8 text-slate-800" />
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Email Notifications</h2>
                    <p className="text-sm text-slate-500">Automated emails sent to shareholders</p>
                </div>
            </div>

            {/* Status Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                        <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-blue-900 text-lg mb-1">Email Automation Active</h3>
                        <p className="text-blue-700 text-sm leading-relaxed">
                            Emails are sent automatically based on the schedule below. All emails use fun, friendly tone
                            and redirect to bryan.m.hudson@gmail.com in test mode.
                        </p>
                        <div className="mt-3 flex items-center gap-4 text-xs font-bold text-blue-600">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Scheduler runs every 5 minutes
                            </div>
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                Test mode until Feb 15, 2026
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Email Schedule Table - Spans 2 columns */}
                <div className="lg:col-span-2 bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                        <h3 className="font-bold text-slate-900">📅 Email Schedule</h3>
                        <p className="text-xs text-slate-500 mt-1">When shareholders receive notifications</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-200">
                                    <th className="text-left p-3 font-bold text-slate-700">Email</th>
                                    <th className="text-left p-3 font-bold text-slate-700">When Sent</th>
                                    <th className="text-left p-3 font-bold text-slate-700">Mode</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {/* TURN MANAGEMENT EMAILS */}
                                <tr className="bg-slate-50">
                                    <td colSpan="3" className="p-2 text-xs font-bold text-slate-500 uppercase">Turn Management</td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="p-3 font-medium">🎉 It's YOUR Turn!</td>
                                    <td className="p-3">Immediately when turn begins</td>
                                    <td className="p-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Both</span></td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="p-3 font-medium">🌅 Evening Check-In</td>
                                    <td className="p-3">7:00 PM same day</td>
                                    <td className="p-3"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Normal</span></td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="p-3 font-medium">☕ Next Day Reminder</td>
                                    <td className="p-3">9:00 AM on day 2</td>
                                    <td className="p-3"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Normal</span></td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="p-3 font-medium">🌅 Last Day Reminder</td>
                                    <td className="p-3">9:00 AM on deadline day</td>
                                    <td className="p-3"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Normal</span></td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="p-3 font-medium">⏰ Final Warning</td>
                                    <td className="p-3">2 hours before deadline</td>
                                    <td className="p-3"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Normal</span></td>
                                </tr>

                                {/* ACTION-BASED EMAILS */}
                                <tr className="bg-slate-50">
                                    <td colSpan="3" className="p-2 text-xs font-bold text-slate-500 uppercase">Action-Based</td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="p-3 font-medium">✅ Booking Confirmed</td>
                                    <td className="p-3">When shareholder finalizes</td>
                                    <td className="p-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Both</span></td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="p-3 font-medium">❌ Booking Cancelled</td>
                                    <td className="p-3">When cancelled</td>
                                    <td className="p-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Both</span></td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="p-3 font-medium">👋 Turn Passed</td>
                                    <td className="p-3">When shareholder passes</td>
                                    <td className="p-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Both</span></td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="p-3 font-medium">⏱️ Auto-Skip (Current)</td>
                                    <td className="p-3">When 48h expires</td>
                                    <td className="p-3"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Normal</span></td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="p-3 font-medium">🎯 Auto-Skip (Next)</td>
                                    <td className="p-3">When previous times out</td>
                                    <td className="p-3"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Normal</span></td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="p-3 font-medium">🎯 You're Up!</td>
                                    <td className="p-3">When previous passes/times out</td>
                                    <td className="p-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Both</span></td>
                                </tr>

                                {/* PAYMENT EMAILS */}
                                <tr className="bg-slate-50">
                                    <td colSpan="3" className="p-2 text-xs font-bold text-slate-500 uppercase">Payment</td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="p-3 font-medium">💰 Payment Reminder</td>
                                    <td className="p-3">Manually sent by admin</td>
                                    <td className="p-3"><span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">Manual</span></td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="p-3 font-medium">🎉 Payment Received</td>
                                    <td className="p-3">When marked as paid</td>
                                    <td className="p-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Both</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Test Emails Card - Right column */}
                <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-sm overflow-hidden">
                    <div className="bg-purple-50 px-6 py-4 border-b border-purple-200">
                        <h3 className="font-bold text-slate-900">📧 Test Emails</h3>
                        <p className="text-xs text-slate-500 mt-1">Send test emails instantly</p>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Email Input */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Send Test Email To:
                            </label>
                            <input
                                type="email"
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                                placeholder="bryan.m.hudson@gmail.com"
                                className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-purple-400 transition-colors text-sm"
                            />
                            <p className="text-xs text-slate-500 mt-1">Default: bryan.m.hudson@gmail.com</p>
                        </div>

                        {/* Test Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={async () => {
                                    try {
                                        const { functions } = await import('../../lib/firebase');
                                        const { httpsCallable } = await import('firebase/functions');
                                        const testFn = httpsCallable(functions, 'sendTestEmail');
                                        await testFn({ emailType: 'turnStarted', testEmail });
                                        triggerAlert("Test Email Sent", `Turn Started email sent to ${testEmail}!`);
                                    } catch (err) {
                                        triggerAlert("Error", err.message);
                                    }
                                }}
                                className="w-full px-4 py-3 text-left rounded-lg border border-slate-200 bg-white hover:border-green-500 hover:bg-green-50 transition-all group"
                            >
                                <div className="font-semibold text-slate-900 group-hover:text-green-700">Turn Start</div>
                                <div className="text-xs text-slate-500 mt-0.5">Welcome email</div>
                            </button>

                            <button
                                onClick={async () => {
                                    try {
                                        const { functions } = await import('../../lib/firebase');
                                        const { httpsCallable } = await import('firebase/functions');
                                        const testFn = httpsCallable(functions, 'sendTestEmail');
                                        await testFn({ emailType: 'reminder', testEmail });
                                        triggerAlert("Test Email Sent", `Reminder email sent to ${testEmail}!`);
                                    } catch (err) {
                                        triggerAlert("Error", err.message);
                                    }
                                }}
                                className="w-full px-4 py-3 text-left rounded-lg border border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50 transition-all group"
                            >
                                <div className="font-semibold text-slate-900 group-hover:text-blue-700">Reminder</div>
                                <div className="text-xs text-slate-500 mt-0.5">Check-in email</div>
                            </button>

                            <button
                                onClick={async () => {
                                    try {
                                        const { functions } = await import('../../lib/firebase');
                                        const { httpsCallable } = await import('firebase/functions');
                                        const testFn = httpsCallable(functions, 'sendTestEmail');
                                        await testFn({ emailType: 'finalWarning', testEmail });
                                        triggerAlert("Test Email Sent", `Urgent warning sent to ${testEmail}!`);
                                    } catch (err) {
                                        triggerAlert("Error", err.message);
                                    }
                                }}
                                className="w-full px-4 py-3 text-left rounded-lg border border-slate-200 bg-white hover:border-orange-500 hover:bg-orange-50 transition-all group"
                            >
                                <div className="font-semibold text-slate-900 group-hover:text-orange-700">Urgent</div>
                                <div className="text-xs text-slate-500 mt-0.5">Final warning</div>
                            </button>

                            <button
                                onClick={async () => {
                                    try {
                                        const { functions } = await import('../../lib/firebase');
                                        const { httpsCallable } = await import('firebase/functions');
                                        const testFn = httpsCallable(functions, 'sendTestEmail');
                                        await testFn({ emailType: 'bookingConfirmed', testEmail });
                                        triggerAlert("Test Email Sent", `Confirmation sent to ${testEmail}!`);
                                    } catch (err) {
                                        triggerAlert("Error", err.message);
                                    }
                                }}
                                className="w-full px-4 py-3 text-left rounded-lg border border-slate-200 bg-white hover:border-purple-500 hover:bg-purple-50 transition-all group"
                            >
                                <div className="font-semibold text-slate-900 group-hover:text-purple-700">Confirmed</div>
                                <div className="text-xs text-slate-500 mt-0.5">Booking email</div>
                            </button>

                            <button
                                onClick={async () => {
                                    try {
                                        const { functions } = await import('../../lib/firebase');
                                        const { httpsCallable } = await import('firebase/functions');
                                        const testFn = httpsCallable(functions, 'sendTestEmail');
                                        await testFn({ emailType: 'bookingCancelled', testEmail });
                                        triggerAlert("Test Email Sent", `Cancellation sent to ${testEmail}!`);
                                    } catch (err) {
                                        triggerAlert("Error", err.message);
                                    }
                                }}
                                className="w-full px-4 py-3 text-left rounded-lg border border-slate-200 bg-white hover:border-red-500 hover:bg-red-50 transition-all group"
                            >
                                <div className="font-semibold text-slate-900 group-hover:text-red-700">Cancelled</div>
                                <div className="text-xs text-slate-500 mt-0.5">Cancellation</div>
                            </button>

                            <button
                                onClick={async () => {
                                    try {
                                        const { functions } = await import('../../lib/firebase');
                                        const { httpsCallable } = await import('firebase/functions');
                                        const testFn = httpsCallable(functions, 'sendTestEmail');
                                        await testFn({ emailType: 'turnPassedNext', testEmail });
                                        triggerAlert("Test Email Sent", `Turn passed email sent to ${testEmail}!`);
                                    } catch (err) {
                                        triggerAlert("Error", err.message);
                                    }
                                }}
                                className="w-full px-4 py-3 text-left rounded-lg border border-slate-200 bg-white hover:border-cyan-500 hover:bg-cyan-50 transition-all group"
                            >
                                <div className="font-semibold text-slate-900 group-hover:text-cyan-700">Turn Passed</div>
                                <div className="text-xs text-slate-500 mt-0.5">Early turn</div>
                            </button>

                            <button
                                onClick={async () => {
                                    try {
                                        const { functions } = await import('../../lib/firebase');
                                        const { httpsCallable } = await import('firebase/functions');
                                        const testFn = httpsCallable(functions, 'sendTestEmail');
                                        await testFn({ emailType: 'paymentReminder', testEmail });
                                        triggerAlert("Test Email Sent", `Payment reminder sent to ${testEmail}!`);
                                    } catch (err) {
                                        triggerAlert("Error", err.message);
                                    }
                                }}
                                className="w-full px-4 py-3 text-left rounded-lg border border-slate-200 bg-white hover:border-amber-500 hover:bg-amber-50 transition-all group"
                            >
                                <div className="font-semibold text-slate-900 group-hover:text-amber-700">Payment Due</div>
                                <div className="text-xs text-slate-500 mt-0.5">Payment reminder</div>
                            </button>

                            <button
                                onClick={async () => {
                                    try {
                                        const { functions } = await import('../../lib/firebase');
                                        const { httpsCallable } = await import('firebase/functions');
                                        const testFn = httpsCallable(functions, 'sendTestEmail');
                                        await testFn({ emailType: 'paymentReceived', testEmail });
                                        triggerAlert("Test Email Sent", `Payment confirmation sent to ${testEmail}!`);
                                    } catch (err) {
                                        triggerAlert("Error", err.message);
                                    }
                                }}
                                className="w-full px-4 py-3 text-left rounded-lg border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
                            >
                                <div className="font-semibold text-slate-900 group-hover:text-emerald-700">Payment Received</div>
                                <div className="text-xs text-slate-500 mt-0.5">Payment confirm</div>
                            </button>

                            <div className="pt-3 border-t text-xs text-slate-500">
                                ⚠️ Test emails sent to address specified above
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Footer */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
                <p className="text-sm text-slate-600">
                    <span className="font-bold">✏️ Need to edit email templates?</span> Email content is managed in code or Firebase Console.
                </p>
            </div>
        </div>
    );
}
