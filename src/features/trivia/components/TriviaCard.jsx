import React from 'react';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';

export function TriviaCard({
    question,
    options,
    selectedAnswer,
    correctAnswer,
    fact,
    onSelect,
    isAnswered,
    isLastQuestion,
    onNext
}) {
    return (
        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-xl w-full animate-in fade-in zoom-in duration-300">
            <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-full shrink-0 mt-0.5">
                    <HelpCircle className="w-4 h-4" />
                </div>
                <h2 className="text-base md:text-lg font-bold text-slate-800 leading-snug">
                    {question}
                </h2>
            </div>

            <div className="grid gap-2 mb-4">
                {options.map((option, index) => {
                    let btnClass = "w-full p-2.5 text-left rounded-xl border-2 transition-all duration-200 font-semibold text-sm flex justify-between items-center group ";

                    if (isAnswered) {
                        if (option === correctAnswer) {
                            btnClass += "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm scale-[1.01] z-10";
                        } else if (option === selectedAnswer && option !== correctAnswer) {
                            btnClass += "border-red-500 bg-red-50 text-red-800 opacity-60";
                        } else {
                            btnClass += "border-slate-100 bg-slate-50 text-slate-400 opacity-50";
                        }
                    } else {
                        btnClass += "border-slate-200 hover:border-purple-400 hover:bg-purple-50 hover:shadow-sm active:scale-[0.98] text-slate-700";
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
                                <CheckCircle className="w-5 h-5 text-emerald-600 animate-in zoom-in spin-in-12" />
                            )}
                            {isAnswered && option === selectedAnswer && option !== correctAnswer && (
                                <XCircle className="w-5 h-5 text-red-500 animate-in zoom-in" />
                            )}
                        </button>
                    );
                })}
            </div>

            {isAnswered && (
                <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-3">
                        <div className="text-xl shrink-0">💡</div>
                        <div>
                            <h4 className="font-bold text-blue-900 text-xs mb-0.5 uppercase tracking-wide">Did You Know?</h4>
                            <p className="text-blue-800 text-xs leading-relaxed font-medium">
                                {fact}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onNext}
                        className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-sm shadow-md hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {isLastQuestion ? "See Results" : "Next Question"}
                    </button>
                </div>
            )}
        </div>
    );
}
