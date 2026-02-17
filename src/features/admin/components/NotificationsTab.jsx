import React, { useState, useEffect } from 'react';
import { Clock, Zap, Bell, Info } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { LiveTurnMonitor } from './LiveTurnMonitor';
import { EmailHistoryTab } from './EmailHistoryTab';
import { EmailTestingCenter } from './EmailTestingCenter';
import { TestRecipientModal } from './TestRecipientModal';

export function NotificationsTab({ triggerAlert, isTestMode = true }) {
    const { currentUser } = useAuth();
    const [testRecipient, setTestRecipient] = useState(import.meta.env.VITE_SUPPORT_EMAIL || '');
    const [pendingTest, setPendingTest] = useState(null); // { type, category, label }
    const [activeTab, setActiveTab] = useState('monitor'); // 'monitor' | 'testing' | 'history'

    useEffect(() => {
        if (currentUser?.email) {
            setTestRecipient(currentUser.email);
        }
    }, [currentUser]);

    const tabConfigs = {
        monitor: {
            title: "Live Turn Monitor",
            description: "Tracks the current 48-hour turn window for the active shareholder.",
            modeNote: isTestMode ? "Test Mode: Tracking simulated schedule. Emails redirected to Admins." : "Production Mode: Tracking real-time usage.",
            icon: Clock,
            color: isTestMode ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-green-50 border-green-200 text-green-900"
        },
        testing: {
            title: "Testing Center",
            description: "Safely simulate any system email to verify content and formatting.",
            modeNote: "All manual tests from this page are sent to your selected test recipient.",
            icon: Bell,
            color: "bg-indigo-50 border-indigo-200 text-indigo-900"
        },
        history: {
            title: "Email Audit Log",
            description: "A complete searchable history of every email attempted by the system.",
            modeNote: isTestMode ? "Test Mode: Logs show intended recipient, but email was redirected to you." : "Production Mode: Logs show actual recipients.",
            icon: Info,
            color: "bg-blue-50 border-blue-200 text-blue-900"
        }
    };

    const executeTest = async () => {
        if (!pendingTest) return;
        const { type, category } = pendingTest;
        setPendingTest(null);

        try {
            const { httpsCallable } = await import('firebase/functions');
            const { functions } = await import('../../../lib/firebase');

            if (category === 'transaction') {
                const sendTestFn = httpsCallable(functions, 'sendTestEmail');
                const typeMap = { 'turnPassed': 'turnPassedNext', 'autoPass': 'autoPassNext' };
                await sendTestFn({ emailType: typeMap[type] || type, testEmail: testRecipient });
            } else {
                const sendTestReminderFn = httpsCallable(functions, 'sendTestReminder');
                await sendTestReminderFn({ reminderType: type, testEmail: testRecipient });
            }
            triggerAlert('Success', `Test email sent to ${testRecipient}!`);
        } catch (error) {
            triggerAlert('Error', `Failed: ${error.message}`);
        }
    };

    const tabInfo = tabConfigs[activeTab];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Bell className="w-8 h-8 text-slate-800" /> Notification Center
                </h2>
                <p className="text-sm text-slate-500">Manage, test, and audit system communications.</p>
            </div>

            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
                {['monitor', 'history', 'testing'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${activeTab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{t === 'monitor' ? 'Live Turn Monitor' : t === 'history' ? 'Email History' : 'Testing Center'}</button>
                ))}
            </div>

            {tabInfo && (
                <div className={`p-4 rounded-xl border ${tabInfo.color} flex items-start gap-4 animate-in fade-in slide-in-from-top-2`}>
                    <div className="p-2 bg-white/50 rounded-lg"><tabInfo.icon className="w-5 h-5" /></div>
                    <div>
                        <h3 className="font-bold text-sm uppercase tracking-wide opacity-90">{tabInfo.title}</h3>
                        <p className="font-bold text-lg leading-snug">{tabInfo.description}</p>
                        <p className="text-sm mt-1 opacity-80 font-medium flex items-center gap-2"><Info className="w-3 h-3" />{tabInfo.modeNote}</p>
                    </div>
                </div>
            )}

            {activeTab === 'monitor' && <LiveTurnMonitor />}
            {activeTab === 'testing' && <EmailTestingCenter initiateTestReminder={(type, label) => setPendingTest({ type, category: 'reminder', label })} initiateTestTransaction={(type, label) => setPendingTest({ type, category: 'transaction', label })} />}
            {activeTab === 'history' && <EmailHistoryTab />}

            <TestRecipientModal isOpen={!!pendingTest} onClose={() => setPendingTest(null)} onConfirm={executeTest} testRecipient={testRecipient} setTestRecipient={setTestRecipient} label={pendingTest?.label} />
        </div>
    );
}
