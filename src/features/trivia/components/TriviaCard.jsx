import React from 'react';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';

export function TriviaCard({
    question,
    options,
    selectedAnswer,
    correctAnswer,
    onSelect,
    isAnswered,
    fact
}) {
    return (
        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-xl w-full animate-in fade-in zoom-in duration-300">
            <div className="flex items-start gap-4 mb-5">
                <div className="p-2.5 bg-purple-100 text-purple-600 rounded-full shrink-0 mt-0.5">
                    <HelpCircle className="w-5 h-5" />
                </div>
                <h2 className="text-lg md:text-xl font-bold text-slate-800 leading-snug">
                    {question}
                </h2>
            </div>

            <div className="grid gap-2.5 mb-5">
                {options.map((option, index) => {
                    let btnClass = "w-full p-3.5 text-left rounded-xl border-2 transition-all duration-200 font-medium text-base flex justify-between items-center group ";

                    if (isAnswered) {
                        if (option === correctAnswer) {
                            btnClass += "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-md transform scale-[1.02] z-10";
                        } else if (option === selectedAnswer && option !== correctAnswer) {
                            btnClass += "border-red-500 bg-red-50 text-red-800 opacity-60";
                        } else {
                            btnClass += "border-slate-100 bg-slate-50 text-slate-400 opacity-50";
                        }
                    } else {
                        btnClass += "border-slate-200 hover:border-purple-400 hover:bg-purple-50 hover:shadow-md active:scale-[0.98] text-slate-700";
                    }

                    return (
                        <button
                            key={index}
                            onClick={() => !isAnswered && onSelect(option)}
                            disabled={isAnswered}
                            className={btnClass}
                        >
                            <span>{option}</span>
                            {isAnswered && option === correctAnswer && (
                                <CheckCircle className="w-6 h-6 text-emerald-600 animate-in zoom-in spin-in-12" />
                            )}
                            {isAnswered && option === selectedAnswer && option !== correctAnswer && (
                                <XCircle className="w-6 h-6 text-red-500 animate-in zoom-in" />
                            )}
                        </button>
                    );
                })}
            </div>

            {isAnswered && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 animate-in slide-in-from-bottom-2 fade-in">
                    <div className="flex gap-3">
                        <div className="text-2xl shrink-0">💡</div>
                        <div>
                            <h4 className="font-bold text-blue-900 mb-1">Did You Know?</h4>
                            <p className="text-blue-800 text-sm leading-relaxed">
                                {fact}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
