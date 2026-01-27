import React from 'react';
import { Sparkles, ArrowRight, Zap, Palmtree, Anchor } from 'lucide-react';
import confetti from 'canvas-confetti';

export function WelcomeModal({ isOpen, onClose, userName }) {
    if (!isOpen) return null;

    // Trigger confetti on mount
    React.useEffect(() => {
        const duration = 1000;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function () {
            const timeLeft = duration; // Just a quick burst

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50;
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            clearInterval(interval); // Run once
        }, 250);
    }, []);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-[70] p-0 md:p-4 animate-in fade-in duration-300">
            {/* Modal Container */}
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white border-t md:border border-white/10 rounded-t-3xl md:rounded-2xl shadow-2xl w-full md:max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 relative">

                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

                {/* Mobile Drag Handle */}
                <div className="md:hidden w-full flex justify-center pt-3 pb-1 shrink-0 z-20">
                    <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10 space-y-6">

                    {/* Header */}
                    <div className="text-center space-y-4">
                        <div className="mx-auto w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 mb-2">
                            <Sparkles className="w-7 h-7 md:w-8 md:h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                                Hey {userName}! 👋
                            </h2>
                            <p className="text-sm md:text-base text-indigo-200 font-medium leading-relaxed mt-2">
                                Welcome to the NEW HHR Trailer booking app! We’ve traded the clunky spreadsheets for a much smoother ride.
                            </p>
                        </div>
                    </div>

                    {/* Features Grid - Compact */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-5 space-y-4">
                        <div className="flex gap-4">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-300 shrink-0 h-fit">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm md:text-base">Fully Automated</h3>
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
                                <h3 className="font-bold text-white text-sm md:text-base">Maximum Lake Time</h3>
                                <p className="text-xs md:text-sm text-slate-300 mt-1 leading-relaxed">
                                    Less time at the desk, more time on the dock.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="p-2 bg-pink-500/20 rounded-lg text-pink-300 shrink-0 h-fit">
                                <Anchor className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm md:text-base">Easy Breezy Booking</h3>
                                <p className="text-xs md:text-sm text-slate-300 mt-1 leading-relaxed">
                                    Claiming your summer dates is now as simple as a sunset cruise.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sticky Footer */}
                <div className="p-6 md:p-8 pt-2 md:pt-2 border-t border-white/5 bg-slate-900/50 backdrop-blur-md sticky bottom-0 z-20 shrink-0 space-y-3">
                    <p className="text-xs text-center text-indigo-300/80 italic">
                        Need a hand? Click the <strong>Feedback</strong> button in the header.
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 md:py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-lg rounded-xl shadow-lg ring-1 ring-white/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                    >
                        Let's Get Started
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    {/* Safe area spacer for mobile */}
                    <div className="md:hidden h-2"></div>
                </div>

            </div>
        </div>
    );
}
