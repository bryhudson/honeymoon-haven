import React from 'react';
import { BaseModal } from '../../../components/ui/BaseModal';
import { TestTube, Zap, User } from 'lucide-react';

export function TestRecipientModal({
    isOpen,
    onClose,
    onConfirm,
    testRecipient,
    setTestRecipient,
    label
}) {
    const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
    const recipients = adminEmails.map(email => ({ name: email.split('@')[0], email }));

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Send Test Email?"
            description={`Simulating: ${label}`}
            maxSize="max-w-md"
        >
            <div className="space-y-6">
                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-200/60">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Select Recipient</p>
                    <div className="space-y-3">
                        {recipients.map((r) => (
                            <label
                                key={r.email}
                                className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer group ${testRecipient === r.email
                                    ? 'bg-white border-indigo-200 shadow-sm ring-1 ring-indigo-100'
                                    : 'bg-white/50 border-slate-100 hover:border-slate-300'
                                    }`}
                            >
                                <div className={`relative flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${testRecipient === r.email
                                    ? 'border-indigo-600 bg-indigo-600'
                                    : 'border-slate-300 group-hover:border-slate-400'
                                    }`}>
                                    {testRecipient === r.email && <div className="w-2 h-2 bg-white rounded-full" />}
                                    <input
                                        type="radio"
                                        name="testRecipient"
                                        value={r.email}
                                        checked={testRecipient === r.email}
                                        onChange={(e) => setTestRecipient(e.target.value)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <div className="font-black text-slate-800 text-sm tracking-tight">{r.name}</div>
                                        {testRecipient === r.email && (
                                            <span className="px-1.5 py-0.5 bg-indigo-100 text-[9px] font-black text-indigo-700 uppercase tracking-wider rounded">Selected</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-400 font-medium">{r.email}</div>
                                </div>
                                <User className={`w-5 h-5 transition-colors ${testRecipient === r.email ? 'text-indigo-600' : 'text-slate-200'}`} />
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-white border border-slate-200 text-slate-700 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all text-[11px]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 text-[11px]"
                    >
                        <Zap className="w-4 h-4" />
                        Send Test
                    </button>
                </div>
            </div>
        </BaseModal>
    );
}
