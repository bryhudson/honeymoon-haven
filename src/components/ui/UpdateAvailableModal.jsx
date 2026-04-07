import React from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

export function UpdateAvailableModal({ onReload }) {
    const defaultReload = () => {
        window.location.reload(true);
    };

    return (
        <div className="fixed inset-0 z-[999999] bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[24px] max-w-[400px] w-full p-8 text-center shadow-2xl relative">
                {/* Icon */}
                <div className="mx-auto w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                    <Sparkles className="w-8 h-8 text-indigo-600" />
                </div>
                
                <h1 className="text-2xl font-bold text-slate-900 mb-3">Update Available</h1>
                
                <p className="text-slate-500 mb-8 text-[15px] leading-relaxed">
                    A new version of HHR web app is ready! Please relaunch the app to apply the latest features and improvements.
                </p>
                
                <button
                    onClick={onReload || defaultReload}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-4 px-6 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    <RefreshCw className="w-5 h-5" />
                    Relaunch to Apply
                </button>

                <p className="text-[13px] text-slate-400 mt-5">
                    This only takes a second and ensures the app runs smoothly.
                </p>
            </div>
        </div>
    );
}
