import React, { useState } from 'react';
import { BaseModal } from '../../../components/ui/BaseModal';
import { useAuth } from '../../auth/AuthContext';
import { emailService } from '../../../services/emailService';
import { Bug, Lightbulb, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';

export function FeedbackModal({ isOpen, onClose, shareholderName }) {
    const { currentUser } = useAuth();
    const [step, setStep] = useState('select'); // 'select', 'form', 'success'
    const [type, setType] = useState(null); // 'bug', 'feature'
    const [message, setMessage] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [alertData, setAlertData] = useState(null);

    // Reset state when opening/closing
    React.useEffect(() => {
        if (isOpen) {
            setStep('select');
            setType(null);
            setMessage('');
            setName(shareholderName || '');
            setEmail(currentUser?.email || '');
            setIsSending(false);
        }
    }, [isOpen, shareholderName, currentUser]);

    const handleSelect = (selectedType) => {
        setType(selectedType);
        setStep('form');
    };

    const handleBack = () => {
        setStep('select');
        setType(null);
    };

    const handleSubmit = async () => {
        if (!message.trim()) return;

        setIsSending(true);
        try {
            const finalName = name.trim() || shareholderName || 'Anonymous';
            const finalEmail = email.trim() || currentUser?.email || 'N/A';

            await emailService.sendEmail({
                to: { name: 'Super Admin', email: import.meta.env.VITE_SUPPORT_EMAIL || 'bryan.m.hudson@gmail.com' },
                templateId: 'feedback',
                params: {
                    name: finalName,
                    email: finalEmail,
                    type: type,
                    message: message
                }
            });

            setStep('success');
            setTimeout(() => {
                onClose();
            }, 2500);
        } catch (error) {
            console.error("Failed to send feedback:", error);
            setAlertData({
                title: "Feedback Error",
                message: `Failed to send feedback. Please try again or email ${import.meta.env.VITE_SUPPORT_EMAIL || 'bryan.m.hudson@gmail.com'} directly.`,
                isDanger: true
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={step === 'success' ? "" : "Send Feedback"}
            showClose={!isSending}
        >
            <div className="min-h-[320px] flex flex-col relative">
                {/* Step Content */}
                {step === 'select' && (
                    <div className="flex flex-col gap-5 flex-1 justify-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <p className="text-center text-slate-500 text-sm leading-relaxed mb-2">
                            Help us make the Honeymoon Haven Trailer Booking App better! What would you like to do?
                        </p>

                        <button
                            onClick={() => handleSelect('bug')}
                            className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-red-50 hover:border-red-100 transition-all text-left"
                        >
                            <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform text-rose-500">
                                <Bug className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 group-hover:text-rose-900 transition-colors">Report an Issue</h3>
                                <p className="text-xs text-slate-500 group-hover:text-rose-700/70 transition-colors mt-0.5">Something isn't working right</p>
                            </div>
                        </button>

                        <button
                            onClick={() => handleSelect('feature')}
                            className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-amber-50 hover:border-amber-100 transition-all text-left"
                        >
                            <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform text-amber-500">
                                <Lightbulb className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 group-hover:text-amber-900 transition-colors">Suggest Improvement</h3>
                                <p className="text-xs text-slate-500 group-hover:text-amber-700/70 transition-colors mt-0.5">I have an idea for a new feature</p>
                            </div>
                        </button>
                    </div>
                )}

                {step === 'form' && (
                    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${type === 'bug' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                }`}>
                                {type === 'bug' ? <Bug className="w-3 h-3" /> : <Lightbulb className="w-3 h-3" />}
                                {type === 'bug' ? 'Issue' : 'Idea'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Optional"
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-sm font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Optional"
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-sm font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Details</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder={type === 'bug'
                                        ? "What happened, and how can we reproduce it?"
                                        : "How can we make the app better for you?"}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-sm font-medium min-h-[140px] resize-none"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-700 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!message.trim() || isSending}
                                className="flex-1 py-3.5 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10"
                            >
                                {isSending ? "Sending..." : "Send Feedback"}
                                {!isSending && <Send className="w-4 h-4 ml-1" />}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div className="flex flex-col items-center justify-center flex-1 text-center animate-in zoom-in-95 duration-500 py-10">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-sm ring-4 ring-emerald-50/50">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Got it! 📬</h3>
                        <p className="text-slate-500 text-sm max-w-[280px] leading-relaxed">
                            Your feedback is on its way to Bryan. We appreciate you helping us improve!
                        </p>
                    </div>
                )}
            </div>

            {/* Confirmation Modal for Feedback Alerts */}
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
        </BaseModal>
    );
}
