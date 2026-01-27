import React, { useState, useEffect } from 'react';
import { TestTube, Clock, Zap, Settings, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmationModal } from '../ConfirmationModal';
import { LiveTurnMonitor } from './LiveTurnMonitor';
import { EmailHistoryTab } from './EmailHistoryTab';

export function NotificationsTab({ triggerAlert }) {
    const { currentUser } = useAuth();
    const [testRecipient, setTestRecipient] = useState('bryan.m.hudson@gmail.com');
    const [pendingTest, setPendingTest] = useState(null); // { type, category, label }

    // Logged-in user default logic
    useEffect(() => {
        if (currentUser?.email) {
            if (currentUser.email === 'honeymoonhavenresort.lc@gmail.com') {
                setTestRecipient('honeymoonhavenresort.lc@gmail.com');
            } else {
                setTestRecipient('bryan.m.hudson@gmail.com');
            }
        }
    }, [currentUser]);

    // Initiate Test Transaction
    const initiateTestTransaction = (type, label) => {
        setPendingTest({ type, category: 'transaction', label });
    };

    // Initiate Test Reminder
    const initiateTestReminder = (type, label) => {
        setPendingTest({ type, category: 'reminder', label });
    };

    // Execute the pending test
    const executeTest = async () => {
        if (!pendingTest) return;
        const { type, category } = pendingTest;
        setPendingTest(null); // Close modal

        try {
            const { httpsCallable } = await import('firebase/functions');
            const { functions } = await import('../../lib/firebase');

            if (category === 'transaction') {
                const sendTestEmailFn = httpsCallable(functions, 'sendTestEmail');
                const typeMap = {
                    'turnStarted': 'turnStarted',
                    'turnPassed': 'turnPassedNext',
                    'bookingConfirmed': 'bookingConfirmed',
                    'paymentReceived': 'paymentReceived',
                    'bookingCancelled': 'bookingCancelled',
                    'paymentReminder': 'paymentReminder'
                };
                const backendType = typeMap[type] || type;
                await sendTestEmailFn({ emailType: backendType, testEmail: testRecipient });
            } else {
                const sendTestReminderFn = httpsCallable(functions, 'sendTestReminder');
                await sendTestReminderFn({ reminderType: type, testEmail: testRecipient });
            }

            triggerAlert('Success', `Test email (${type}) sent to ${testRecipient}!`);
        } catch (error) {
            console.error(error);
            triggerAlert('Error', `Failed: ${error.message}`);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Bell className="w-8 h-8 text-slate-800" />
                    Notification Center
                </h2>
                <p className="text-sm text-slate-500">Manage, test, and audit system communications.</p>
            </div>

            {/* 0. Live Turn Monitor */}
            <LiveTurnMonitor />

            {/* 1. Email System Overview & Testing */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <TestTube className="w-5 h-5 text-indigo-700" />
                        <span className="text-indigo-900">Email System Overview & Testing</span>
                    </h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* LEFT: Timed Reminders (Testable) */}
                    <div className="space-y-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Clock className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">Timed Reminders (48h Window)</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    These run automatically on a set schedule relative to the turn start.
                                    <br />
                                    <span className="text-amber-600 font-medium">⚡️ Instant Test:</span> Click any button below to simulate that email immediately (redirected to you). No waiting required!
                                </p>
                            </div>
                        </div>

                        {/* Timeline Visualization */}
                        <div className="relative pl-4 space-y-6 border-l-2 border-slate-100 ml-2">
                            {/* Evening */}
                            <div className="relative">
                                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-200 border-2 border-white"></div>
                                <div className="flex items-center justify-between group">
                                    <div>
                                        <div className="text-xs font-bold text-blue-600 mb-0.5">Subject: Evening Reminder: Your Honeymoon Haven Booking Awaits</div>
                                        <div className="text-sm font-bold text-slate-700">First Night (Same Day) @ 7:00 PM</div>
                                        <div className="text-xs text-slate-400">Evening Check-in</div>
                                    </div>
                                    <button
                                        onClick={() => initiateTestReminder('evening', 'First Night Reminder')}
                                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-medium hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-all flex items-center gap-1"
                                    >
                                        <Zap className="w-3 h-3" /> Test
                                    </button>
                                </div>
                            </div>

                            {/* Day 2 */}
                            <div className="relative">
                                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-200 border-2 border-white"></div>
                                <div className="flex items-center justify-between group">
                                    <div>
                                        <div className="text-xs font-bold text-blue-600 mb-0.5">Subject: Morning Reminder: Complete Your Booking</div>
                                        <div className="text-sm font-bold text-slate-700">Middle Morning (Day 2) @ 9:00 AM</div>
                                        <div className="text-xs text-slate-400">Mid-point Reminder</div>
                                    </div>
                                    <button
                                        onClick={() => initiateTestReminder('day2', 'Middle Morning Reminder')}
                                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-medium hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-all flex items-center gap-1"
                                    >
                                        <Zap className="w-3 h-3" /> Test
                                    </button>
                                </div>
                            </div>

                            {/* Day 3 / Final */}
                            <div className="relative">
                                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-200 border-2 border-white"></div>
                                <div className="flex items-center justify-between group">
                                    <div>
                                        <div className="text-xs font-bold text-blue-600 mb-0.5">Subject: Morning Reminder: Complete Your Booking</div>
                                        <div className="text-sm font-bold text-slate-700">Final Morning (Day 3) @ 9:00 AM</div>
                                        <div className="text-xs text-slate-400">Final Morning Warning</div>
                                    </div>
                                    <button
                                        onClick={() => initiateTestReminder('final', 'Final Morning Warning')}
                                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-medium hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-all flex items-center gap-1"
                                    >
                                        <Zap className="w-3 h-3" /> Test
                                    </button>
                                </div>
                            </div>

                            {/* Urgent */}
                            <div className="relative">
                                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white animate-pulse"></div>
                                <div className="flex items-center justify-between group">
                                    <div>
                                        <div className="text-xs font-bold text-amber-600 mb-0.5">Subject: URGENT: 2 Hours Left to Complete Your Booking</div>
                                        <div className="text-sm font-bold text-slate-700">2 Hours Before End</div>
                                        <div className="text-xs text-slate-400">Urgent Deadline Alert</div>
                                    </div>
                                    <button
                                        onClick={() => initiateTestReminder('urgent', 'Urgent Warning')}
                                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-medium hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-all flex items-center gap-1"
                                    >
                                        <Zap className="w-3 h-3" /> Test
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Transactional Events (Testable) */}
                    <div className="space-y-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <Zap className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">Transactional Events</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Triggered by <span className="font-semibold text-slate-700">Actions</span>. Sent instantly when users interact.
                                    <br />
                                    <span className="text-indigo-600 font-medium">⚡️ Instant Test:</span> Click to simulate and send a test to yourself immediately.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { id: "turnStarted", name: "Turn Started", desc: "When active status begins", subject: "It's YOUR Turn! 🎉" },
                                { id: "turnPassed", name: "Turn Passed (Next)", desc: "Notify next user", subject: "It's Your Turn! (Passed)" },
                                { id: "bookingConfirmed", name: "Booking Confirmed", desc: "User finalizes dates", subject: "Booking Confirmed" },
                                { id: "paymentReminder", name: "Payment Reminder", desc: "Manually triggered / Auto", subject: "E-Transfer Due" },
                                { id: "paymentReceived", name: "Payment Received", desc: "Admin marks as Paid", subject: "Payment Received" },
                                { id: "bookingCancelled", name: "Booking Cancelled", desc: "Admin cancels booking", subject: "Booking Cancelled" }
                            ].map((event) => (
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
                    </div>
                </div>
            </div>

            {/* 2. Email History Log */}
            <EmailHistoryTab />

            {/* Test Email Recipient Modal */}
            {pendingTest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-50 rounded-full">
                                <TestTube className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Send Test Email?</h3>
                                <p className="text-sm text-slate-500">Simulate: {pendingTest.label}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Send Test To:</p>

                            <div className="space-y-3">
                                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${testRecipient === 'bryan.m.hudson@gmail.com' ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                    <input
                                        type="radio"
                                        name="testRecipient"
                                        value="bryan.m.hudson@gmail.com"
                                        checked={testRecipient === 'bryan.m.hudson@gmail.com'}
                                        onChange={(e) => setTestRecipient(e.target.value)}
                                        className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                    />
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">Bryan Hudson</div>
                                        <div className="text-xs text-slate-500">bryan.m.hudson@gmail.com</div>
                                    </div>
                                </label>

                                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${testRecipient === 'honeymoonhavenresort.lc@gmail.com' ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                    <input
                                        type="radio"
                                        name="testRecipient"
                                        value="honeymoonhavenresort.lc@gmail.com"
                                        checked={testRecipient === 'honeymoonhavenresort.lc@gmail.com'}
                                        onChange={(e) => setTestRecipient(e.target.value)}
                                        className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                    />
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">HHR Admin</div>
                                        <div className="text-xs text-slate-500">honeymoonhavenresort.lc@gmail.com</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setPendingTest(null)}
                                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeTest}
                                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                            >
                                <Zap className="w-4 h-4" />
                                Send Test
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
