import React, { useState } from 'react';
import { X, Bug, Lightbulb, Send, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { emailService } from '../services/emailService';
import { useAuth } from '../contexts/AuthContext';

export function FeedbackModal({ isOpen, onClose, shareholderName }) {
    const { currentUser } = useAuth();
    const [step, setStep] = useState('select'); // 'select', 'form', 'success'
    const [type, setType] = useState(null); // 'bug', 'feature'
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Reset state when opening/closing
    React.useEffect(() => {
        if (isOpen) {
            setStep('select');
            setType(null);
            setMessage('');
            setIsSending(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

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
            const senderName = shareholderName || currentUser?.email || 'Anonymous';
            const subject = `[HHR Feedback] ${type === 'bug' ? '🐛 Bug Report' : '💡 Feature Request'} from ${senderName}`;

            const htmlContent = `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: ${type === 'bug' ? '#ef4444' : '#eab308'};">
                        ${type === 'bug' ? 'Bug Report' : 'Feature Request'}
                    </h2>
                    <p><strong>From:</strong> ${senderName} (${currentUser?.email})</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 16px; line-height: 1.5; white-space: pre-wrap;">${message}</p>
                </div>
            `;

            await emailService.sendEmail({
                to: 'bryan.m.hudson@gmail.com',
                subject,
                htmlContent
            });

            setStep('success');
            setTimeout(() => {
                onClose();
            }, 2500);
        } catch (error) {
            console.error("Failed to send feedback:", error);
            alert("Failed to send feedback. Please try again or email bryan.m.hudson@gmail.com directly.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-background rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-border">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                        {step === 'form' && (
                            <button onClick={handleBack} className="p-1 hover:bg-slate-200 rounded-full transition-colors mr-1">
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <h2 className="font-bold text-lg">Send Feedback</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 min-h-[300px] flex flex-col">

                    {step === 'select' && (
                        <div className="flex flex-col gap-4 flex-1 justify-center animate-in slide-in-from-right-4 duration-300">
                            <p className="text-center text-muted-foreground mb-4">
                                Help us make Honeymoon Haven better! <br />What would you like to do?
                            </p>

                            <button
                                onClick={() => handleSelect('bug')}
                                className="group flex items-center gap-4 p-4 rounded-xl border-2 border-transparent bg-red-50 hover:border-red-200 hover:bg-red-100 transition-all text-left"
                            >
                                <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform text-red-500">
                                    <Bug className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-red-900">Report an Issue</h3>
                                    <p className="text-sm text-red-700/80">Something isn't working right</p>
                                </div>
                            </button>

                            <button
                                onClick={() => handleSelect('feature')}
                                className="group flex items-center gap-4 p-4 rounded-xl border-2 border-transparent bg-amber-50 hover:border-amber-200 hover:bg-amber-100 transition-all text-left"
                            >
                                <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform text-amber-500">
                                    <Lightbulb className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-amber-900">Suggest Improvement</h3>
                                    <p className="text-sm text-amber-700/80">I have an idea for a new feature</p>
                                </div>
                            </button>
                        </div>
                    )}

                    {step === 'form' && (
                        <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
                                {type === 'bug' ? (
                                    <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md">
                                        <Bug className="w-3 h-3" /> Report Issue
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                                        <Lightbulb className="w-3 h-3" /> Convert Idea
                                    </span>
                                )}
                            </div>

                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={type === 'bug'
                                    ? "Describe what happened, what you expected, and steps to reproduce..."
                                    : "Tell us about your idea! How would it help you?"}
                                className="flex-1 w-full p-4 p-3 rounded-xl border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[150px]"
                                autoFocus
                            />

                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={handleSubmit}
                                    disabled={!message.trim() || isSending}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                                >
                                    {isSending ? (
                                        <>Sending...</>
                                    ) : (
                                        <>
                                            Send Feedback <Send className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="flex flex-col items-center justify-center flex-1 text-center animate-in zoom-in-95 duration-300 py-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Thank you!</h3>
                            <p className="text-muted-foreground max-w-[250px]">
                                Your feedback has been sent directly to Bryan. We appreciate your input!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
