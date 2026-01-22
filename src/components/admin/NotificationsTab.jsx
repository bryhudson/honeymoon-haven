import React, { useState } from 'react';
import { Info, Mail, Calendar } from 'lucide-react';

export function NotificationsTab({ triggerAlert }) {
    return (
        <div className="space-y-6">
            {/* Info Banner */}
            <div className="flex items-center gap-4 p-4 bg-blue-50 text-blue-900 rounded-lg border border-blue-100">
                <Info className="w-5 h-5 shrink-0" />
                <p className="text-sm">
                    Email notifications are sent automatically based on the schedule below.
                    All emails use fun, friendly tone and redirect to bryan.m.hudson@gmail.com in test mode.
                </p>
            </div>

            {/* Email Schedule Reference Table */}
            <div className="bg-white border-2 border-slate-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-slate-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">📅 Email Schedule</h3>
                        <p className="text-sm text-slate-500">When shareholders receive notifications</p>
                    </div>
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
                                <td className="p-3">7:00 PM same day as turn start</td>
                                <td className="p-3"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Normal</span></td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="p-3 font-medium">☕ Next Day Reminder</td>
                                <td className="p-3">9:00 AM on day 2</td>
                                <td className="p-3"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Normal</span></td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="p-3 font-medium">🌅 Last Day Reminder</td>
                                <td className="p-3">9:00 AM on deadline day (day 3)</td>
                                <td className="p-3"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Normal</span></td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="p-3 font-medium">⏰ Final Warning</td>
                                <td className="p-3">2 hours before deadline</td>
                                <td className="p-3"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Normal</span></td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="p-3 font-medium">⚡ 5-Minute Warning</td>
                                <td className="p-3">5 minutes before deadline</td>
                                <td className="p-3"><span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">Fast</span></td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="p-3 font-medium">🚨 2-Minute Urgent</td>
                                <td className="p-3">2 minutes before deadline</td>
                                <td className="p-3"><span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">Fast</span></td>
                            </tr>

                            {/* ACTION-BASED EMAILS */}
                            <tr className="bg-slate-50">
                                <td colSpan="3" className="p-2 text-xs font-bold text-slate-500 uppercase">Action-Based</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="p-3 font-medium">✅ Booking Confirmed</td>
                                <td className="p-3">When shareholder finalizes booking</td>
                                <td className="p-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Both</span></td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="p-3 font-medium">❌ Booking Cancelled</td>
                                <td className="p-3">When shareholder or admin cancels</td>
                                <td className="p-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Both</span></td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="p-3 font-medium">👋 Turn Passed</td>
                                <td className="p-3">When shareholder passes their turn</td>
                                <td className="p-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Both</span></td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="p-3 font-medium">🎯 You're Up!</td>
                                <td className="p-3">When previous person passes/times out</td>
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
                                <td className="p-3">When admin marks booking as paid</td>
                                <td className="p-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Both</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
                    <p><strong>🤖 Automation:</strong> Scheduler runs every 5 minutes to check for reminder times</p>
                    <p><strong>🧪 Test Mode:</strong> All emails redirect to bryan.m.hudson@gmail.com until Feb 15, 2026</p>
                    <p><strong>✨ Tone:</strong> All emails use fun, friendly, conversational language with emojis</p>
                </div>
            </div>

            {/* Manual Test Email Section */}
            <div className="bg-white border-2 border-purple-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <Mail className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">📧 Test Emails</h3>
                        <p className="text-sm text-slate-500">Send test emails to verify notifications</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                        onClick={async () => {
                            try {
                                const { functions } = await import('../../lib/firebase');
                                const { httpsCallable } = await import('firebase/functions');
                                const testFn = httpsCallable(functions, 'sendTestEmail');
                                await testFn({ emailType: 'turnStarted' });
                                triggerAlert("Test Email Sent", "Turn Started email sent!");
                            } catch (err) {
                                triggerAlert("Error", err.message);
                            }
                        }}
                        className="px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 border-2 border-green-300 rounded-lg font-bold text-sm transition-all"
                    >
                        Turn Start
                    </button>

                    <button
                        onClick={async () => {
                            try {
                                const { functions } = await import('../../lib/firebase');
                                const { httpsCallable } = await import('firebase/functions');
                                const testFn = httpsCallable(functions, 'sendTestEmail');
                                await testFn({ emailType: 'reminder' });
                                triggerAlert("Test Email Sent", "Reminder email sent!");
                            } catch (err) {
                                triggerAlert("Error", err.message);
                            }
                        }}
                        className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border-2 border-blue-300 rounded-lg font-bold text-sm transition-all"
                    >
                        Reminder
                    </button>

                    <button
                        onClick={async () => {
                            try {
                                const { functions } = await import('../../lib/firebase');
                                const { httpsCallable } = await import('firebase/functions');
                                const testFn = httpsCallable(functions, 'sendTestEmail');
                                await testFn({ emailType: 'finalWarning' });
                                triggerAlert("Test Email Sent", "Urgent warning email sent!");
                            } catch (err) {
                                triggerAlert("Error", err.message);
                            }
                        }}
                        className="px-4 py-3 bg-orange-50 hover:bg-orange-100 text-orange-700 border-2 border-orange-300 rounded-lg font-bold text-sm transition-all"
                    >
                        Urgent
                    </button>

                    <button
                        onClick={async () => {
                            try {
                                const { functions } = await import('../../lib/firebase');
                                const { httpsCallable } = await import('firebase/functions');
                                const testFn = httpsCallable(functions, 'sendTestEmail');
                                await testFn({ emailType: 'bookingConfirmed' });
                                triggerAlert("Test Email Sent", "Booking confirmation sent!");
                            } catch (err) {
                                triggerAlert("Error", err.message);
                            }
                        }}
                        className="px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border-2 border-purple-300 rounded-lg font-bold text-sm transition-all"
                    >
                        Confirmed
                    </button>
                </div>

                <p className="text-xs text-slate-500 mt-3">
                    ⚠️ All test emails send to bryan.m.hudson@gmail.com with [TEST EMAIL] prefix
                </p>
            </div>

            {/* Optional: Quick Reference */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
                <p className="font-bold mb-2">📝 Need to edit email templates?</p>
                <p>Email content is managed in code (<code className="bg-slate-200 px-1 rounded text-xs">src/services/emailTemplates.js</code>) or via Firebase Console → Firestore → <code className="bg-slate-200 px-1 rounded text-xs">email_templates</code> collection.</p>
            </div>
        </div>
    );
}
