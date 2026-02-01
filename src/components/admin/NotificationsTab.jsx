import React, { useState, useEffect } from 'react';
import { TestTube, Clock, Zap, Settings, Bell, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmationModal } from '../ConfirmationModal';
import { LiveTurnMonitor } from './LiveTurnMonitor';
import { EmailHistoryTab } from './EmailHistoryTab';

export function NotificationsTab({ triggerAlert, isTestMode = true }) {
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

    const [activeTab, setActiveTab] = useState('monitor'); // 'monitor' | 'testing' | 'history'

    // --- Tab Summaries ---
    const getTabSummary = () => {
        switch (activeTab) {
            case 'monitor':
                return {
                    title: "Live Turn Monitor",
                    description: "Tracks the current 48-hour turn window for the active shareholder.",
                    modeNote: isTestMode
                        ? "Test Mode Active: Tracking the simulated schedule. Auto-emails are redirected to Admins."
                        : "Production Mode: Tracking real-time usage. Emails are sent to Shareholders.",
                    icon: Clock,
                    color: isTestMode ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-green-50 border-green-200 text-green-900"
                };
            case 'testing':
                return {
                    title: "Testing Center",
                    description: "Safely simulate any system email to verify content and formatting.",
                    modeNote: "All manual tests from this page are sent to your selected test recipient (default: You).",
                    icon: TestTube,
                    color: "bg-indigo-50 border-indigo-200 text-indigo-900"
                };
            case 'history':
                return {
                    title: "Email Audit Log",
                    description: "A complete searchable history of every email attempted by the system.",
                    modeNote: isTestMode
                        ? "Test Mode: Logs show the INTENDED recipient, but the email was safely redirected to you."
                        : "Production Mode: Logs show actual emails sent to shareholders.",
                    icon: Info,
                    color: "bg-blue-50 border-blue-200 text-blue-900"
                };
            default: return null;
        }
    };

    const tabInfo = getTabSummary();

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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Bell className="w-8 h-8 text-slate-800" />
                    Notification Center
                </h2>
                <p className="text-sm text-slate-500">Manage, test, and audit system communications.</p>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('monitor')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'monitor' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    Live Turn Monitor
                </button>
                <button
                    onClick={() => setActiveTab('testing')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'testing' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    <div className="flex items-center gap-2">
                        <span>Testing Center</span>
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    Email History
                </button>
            </div>

            {/* Tab Summary Banner */}
            {tabInfo && (
                <div className={`p-4 rounded-xl border ${tabInfo.color} flex items-start gap-4 animate-in fade-in slide-in-from-top-2`}>
                    <div className="p-2 bg-white/50 rounded-lg">
                        <tabInfo.icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm uppercase tracking-wide opacity-90">{tabInfo.title}</h3>
                        <p className="font-bold text-lg leading-snug">{tabInfo.description}</p>
                        <p className="text-sm mt-1 opacity-80 font-medium flex items-center gap-2">
                            <Info className="w-3 h-3" />
                            {tabInfo.modeNote}
                        </p>
                    </div>
                </div>
            )}

            {/* 0. Live Turn Monitor Content */}
            {activeTab === 'monitor' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <LiveTurnMonitor />
                </div>
            )}

            {/* 1. Email System Overview & Testing Content */}
            {activeTab === 'testing' && (
                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                                {/* Day 1 Evening */}
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-200 border-2 border-white"></div>
                                    <div className="flex items-center justify-between group">
                                        <div>
                                            <div className="text-xs font-bold text-blue-600 mb-0.5">Day 1 - Evening</div>
                                            <div className="text-sm font-bold text-slate-700">7:00 PM (First Night)</div>
                                            <div className="text-xs text-slate-400">"Your Honeymoon Haven Booking Awaits"</div>
                                        </div>
                                        <button
                                            onClick={() => initiateTestReminder('evening', 'Day 1 Evening (7 PM)')}
                                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-medium hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-all flex items-center gap-1"
                                        >
                                            <Zap className="w-3 h-3" /> Test
                                        </button>
                                    </div>
                                </div>

                                {/* Day 2 Morning */}
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-200 border-2 border-white"></div>
                                    <div className="flex items-center justify-between group">
                                        <div>
                                            <div className="text-xs font-bold text-blue-600 mb-0.5">Day 2 - Morning</div>
                                            <div className="text-sm font-bold text-slate-700">9:00 AM (Middle)</div>
                                            <div className="text-xs text-slate-400">"Complete Your Booking"</div>
                                        </div>
                                        <button
                                            onClick={() => initiateTestReminder('day2', 'Day 2 Morning (9 AM)')}
                                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-medium hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-all flex items-center gap-1"
                                        >
                                            <Zap className="w-3 h-3" /> Test
                                        </button>
                                    </div>
                                </div>

                                {/* Day 2 Evening (NEW) */}
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-200 border-2 border-white"></div>
                                    <div className="flex items-center justify-between group">
                                        <div>
                                            <div className="text-xs font-bold text-purple-600 mb-0.5">Day 2 - Evening</div>
                                            <div className="text-sm font-bold text-slate-700">7:00 PM (Night 2)</div>
                                            <div className="text-xs text-slate-400">"Friendly reminder..."</div>
                                        </div>
                                        <button
                                            onClick={() => initiateTestReminder('evening2', 'Day 2 Evening (7 PM)')}
                                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-medium hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-all flex items-center gap-1"
                                        >
                                            <Zap className="w-3 h-3" /> Test
                                        </button>
                                    </div>
                                </div>

                                {/* Day 3 Morning - Early */}
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-200 border-2 border-white"></div>
                                    <div className="flex items-center justify-between group">
                                        <div>
                                            <div className="text-xs font-bold text-amber-600 mb-0.5">Day 3 - Early Warning</div>
                                            <div className="text-sm font-bold text-slate-700">6:00 AM (Final Day)</div>
                                            <div className="text-xs text-slate-400">4 Hours Remaining</div>
                                        </div>
                                        <button
                                            onClick={() => initiateTestReminder('final6am', 'Final Morning (6 AM)')}
                                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-medium hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-all flex items-center gap-1"
                                        >
                                            <Zap className="w-3 h-3" /> Test
                                        </button>
                                    </div>
                                </div>

                                {/* Day 3 Urgent */}
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white animate-pulse"></div>
                                    <div className="flex items-center justify-between group">
                                        <div>
                                            <div className="text-xs font-bold text-red-600 mb-0.5">Day 3 - URGENT</div>
                                            <div className="text-sm font-bold text-slate-700">9:00 AM (1 Hour Left)</div>
                                            <div className="text-xs text-slate-400">"URGENT: 1 Hour Left"</div>
                                        </div>
                                        <button
                                            onClick={() => initiateTestReminder('final9am', 'Urgent Warning (9 AM)')}
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
                                    { id: "paymentReminder", name: "Maintenance Fee Reminder", desc: "Manually triggered / Auto", subject: "E-Transfer Due" },
                                    { id: "paymentReceived", name: "Maintenance Fee Received", desc: "Admin marks as Paid", subject: "Fee Received" },
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
            )}

            {/* 2. Email History Log Content */}
            {activeTab === 'history' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                                <Info className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-blue-900">Safety Verification Note</h4>
                                <p className="text-sm text-blue-700 mt-1">
                                    When <strong>Test Mode</strong> is active, the logs below display the <span className="underline decoration-blue-400 decoration-2 underline-offset-2">Intended Recipient</span> so you can verify the logic is correct.
                                    Rest assured, the actual emails are <strong>redirected to you</strong> (Admin) and are <strong>NOT</strong> sent to the shareholders.
                                </p>
                            </div>
                        </div>
                    </div>

                    <EmailHistoryTab />
                </div>
            )}

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
