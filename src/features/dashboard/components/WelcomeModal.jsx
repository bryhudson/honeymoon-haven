import React from 'react';
import { BaseModal } from '../../../components/ui/BaseModal';
import { Sparkles, Zap, Palmtree, Anchor, ArrowRight, EyeOff } from 'lucide-react';
import confetti from 'canvas-confetti';

export function WelcomeModal({ isOpen, onClose, onDismissPermanently, userName }) {
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
            maxSize="max-w-lg"
            containerClassName="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white border-white/10 p-0 overflow-hidden"
        >
            <div className="relative">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

                <div className="p-6 md:p-8 space-y-6 relative z-10">
                    {/* Header */}
                    <div className="text-center space-y-4">
                        <div className="mx-auto w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 mb-2">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                                Hey {userName}! 👋
                            </h2>
                            <p className="text-sm md:text-base text-indigo-100 font-medium leading-relaxed mt-2">
                                Welcome to the NEW HHR Trailer booking app! We’ve traded the clunky spreadsheets for a much smoother ride.
                            </p>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 space-y-4">
                        <div className="flex gap-4">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-300 shrink-0 h-fit">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm md:text-base tracking-tight">Fully Automated</h3>
                                <p className="text-xs md:text-sm text-slate-300 mt-1 leading-relaxed">
                                    No more getting lost in email chains. Everything is now handled automatically.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-300 shrink-0 h-fit">
                                <Palmtree className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm md:text-base tracking-tight">Maximum Lake Time</h3>
                                <p className="text-xs md:text-sm text-slate-300 mt-1 leading-relaxed">
                                    No more month-long email chains. The system handles scheduling automatically.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="p-2 bg-pink-500/20 rounded-lg text-pink-300 shrink-0 h-fit">
                                <Anchor className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm md:text-base tracking-tight">Easy Breezy Booking</h3>
                                <p className="text-xs md:text-sm text-slate-300 mt-1 leading-relaxed">
                                    Claiming your summer dates is now as simple as a sunset cruise.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-lg rounded-xl shadow-lg ring-1 ring-white/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                        >
                            Let's Get Started
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                        {onDismissPermanently && (
                            <button
                                onClick={onDismissPermanently}
                                className="w-full py-2.5 text-xs font-bold text-indigo-300/60 hover:text-white transition-all flex items-center justify-center gap-2 group"
                            >
                                <EyeOff className="w-4 h-4" />
                                Don't show this again
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </BaseModal>
    );
}
