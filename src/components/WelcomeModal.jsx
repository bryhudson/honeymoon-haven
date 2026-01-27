import React from 'react';
import { Sparkles, Calendar, Smartphone, ArrowRight } from 'lucide-react';
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

                    <div className="space-y-2">
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight">
                            Welcome Back, {userName}!
                        </h2>
                        <p className="text-lg text-indigo-200 font-medium">
                            Ready for the 2026 Season? 🌲
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-left space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-300 shrink-0">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">New Draft System</h3>
                                <p className="text-sm text-slate-300 mt-1">
                                    We've introduced a fair "Snake Draft" format. Round 1 goes forward (1-12), Round 2 goes backward (12-1).
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-green-500/20 rounded-lg text-green-300 shrink-0">
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">Mobile First</h3>
                                <p className="text-sm text-slate-300 mt-1">
                                    Book from anywhere! The new app is designed to work perfectly on your phone.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-lg rounded-xl shadow-lg ring-1 ring-white/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
                    >
                        Let's Get Started
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <p className="text-xs text-slate-500">
                        PS: Check the "Rules" tab if you get lost!
                    </p>
                </div>
            </div>
        </div>
    );
}
