import React from 'react';
import { BaseModal } from '../../../components/ui/BaseModal';
import { Sparkles, Zap, Palmtree, Anchor, ArrowRight, EyeOff } from 'lucide-react';
import confetti from 'canvas-confetti';

export function WelcomeModal({ isOpen, onClose, onDismissPermanently, userName }) {
    const [step, setStep] = React.useState(1);

    // Reset step when reopened
    React.useEffect(() => {
        if (isOpen) setStep(1);
    }, [isOpen]);

    // Trigger confetti on mount
    React.useEffect(() => {
        if (!isOpen) return;
        const duration = 1000;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function () {
            const particleCount = 50;
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            clearInterval(interval); // Run once
        }, 250);
    }, [isOpen]);

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            showClose={false}
            maxSize="max-w-md" // Ultra compact
            scrollable={false} // STRICT NO SCROLL
            containerClassName="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white border-white/10 p-0"
        >
            <div className="relative flex flex-col">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

                <div className="p-6 md:p-8 space-y-6 relative z-10 flex-1 flex flex-col justify-center">

                    {/* STEP 1: WELCOME */}
                    {step === 1 && (
                        <div className="text-center space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/20 transform -rotate-3 mb-4">
                                <Sparkles className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black tracking-tight leading-tight">
                                    Hey {userName}! <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-purple-200">Welcome Home.</span>
                                </h2>
                                <p className="text-base text-indigo-100/80 font-medium leading-relaxed mt-4">
                                    We've completely reimagined the booking experience. No spreadsheets, just relaxation.
                                </p>
                            </div>
                            <div className="pt-4">
                                <button
                                    onClick={() => setStep(2)}
                                    className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-lg rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group backdrop-blur-sm"
                                >
                                    See What's New
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: FEATURES */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-center">
                                <h3 className="text-2xl font-black tracking-tight">Upgrade Complete 🚀</h3>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-2 space-y-1">
                                <div className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-colors">
                                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-300 shrink-0">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-sm">Automated</h3>
                                        <p className="text-xs text-slate-400">No more email chains</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-colors">
                                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-300 shrink-0">
                                        <Palmtree className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-sm">Fair & Balanced</h3>
                                        <p className="text-xs text-slate-400">Smart rotation logic</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-colors">
                                    <div className="p-2 bg-pink-500/20 rounded-lg text-pink-300 shrink-0">
                                        <Anchor className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-sm">Easy Booking</h3>
                                        <p className="text-xs text-slate-400">Book in seconds</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <button
                                    onClick={onClose}
                                    className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-lg rounded-xl shadow-lg ring-1 ring-white/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    Let's Get Started
                                </button>
                                {onDismissPermanently && (
                                    <button
                                        onClick={onDismissPermanently}
                                        className="w-full py-2.5 text-xs font-bold text-indigo-300/60 hover:text-white transition-all flex items-center justify-center gap-2"
                                    >
                                        <EyeOff className="w-4 h-4" />
                                        Don't show this again
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Step Indicator */}
                <div className="flex justify-center gap-2 pb-6 z-10">
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 1 ? 'w-8 bg-white' : 'w-1.5 bg-white/20'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 2 ? 'w-8 bg-white' : 'w-1.5 bg-white/20'}`} />
                </div>
            </div>
        </BaseModal>
    );
}
