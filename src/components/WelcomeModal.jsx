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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300 relative">

                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

                <div className="p-8 relative z-10 text-center space-y-6">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 mb-2">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                            Hey {userName}! 👋
                        </h2>
                        <p className="text-base text-indigo-200 font-medium leading-relaxed">
                            Welcome to the NEW HHR Trailer booking app! We’ve traded the clunky spreadsheets for a much smoother ride.
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-left space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-300 shrink-0">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-base">Fully Automated</h3>
                                <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                                    No more getting lost in email chains. Everything is now handled automatically.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-300 shrink-0">
                                <Palmtree className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-base">Maximum Lake Time</h3>
                                <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                                    We built this so our directors and shareholders can spend more time on the dock and less time at the desk.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-pink-500/20 rounded-lg text-pink-300 shrink-0">
                                <Anchor className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-base">Easy Breezy Booking</h3>
                                <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                                    Claiming your summer dates is now as simple as a sunset cruise.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="text-xs text-indigo-300/80 italic px-4">
                        Need a hand? If you run into any issues, just click the <strong>Feedback</strong> button in the header.
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-lg rounded-xl shadow-lg ring-1 ring-white/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
                    >
                        Let's Get Started
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>

                </div>
            </div>
        </div>
    );
}
