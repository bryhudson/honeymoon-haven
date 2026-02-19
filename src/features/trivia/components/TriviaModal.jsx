import React, { useState, useEffect } from 'react';
import { BaseModal } from '../../../components/ui/BaseModal';
import { Caravan, Sparkles, Trophy, ArrowRight, HelpCircle, X, PartyPopper } from 'lucide-react';
import { TRIVIA_QUESTIONS } from '../data/triviaData';
import JSConfetti from 'js-confetti';

export function TriviaModal({ isOpen, onClose }) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [gameComplete, setGameComplete] = useState(false);

    const currentQuestion = TRIVIA_QUESTIONS[currentQuestionIndex];

    useEffect(() => {
        if (isOpen) {
            // Reset game when opened
            setCurrentQuestionIndex(0);
            setScore(0);
            setShowResult(false);
            setSelectedAnswer(null);
            setIsAnswered(false);
            setGameComplete(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (gameComplete) {
            const jsConfetti = new JSConfetti();
            jsConfetti.addConfetti({
                emojis: ['🚐', '✨', '🌲', '🏕️', '🏆'],
            });
        }
    }, [gameComplete]);

    const handleAnswer = (option) => {
        if (isAnswered) return;

        setSelectedAnswer(option);
        setIsAnswered(true);

        const isCorrect = option === currentQuestion.correctAnswer;
        if (isCorrect) {
            setScore(prev => prev + 1);
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < TRIVIA_QUESTIONS.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setIsAnswered(false);
        } else {
            setGameComplete(true);
        }
    };

    const getScoreMessage = () => {
        const percentage = (score / TRIVIA_QUESTIONS.length) * 100;
        if (percentage === 100) return "Perfect Score! You're a true HHR Legend! 🌟";
        if (percentage >= 80) return "Amazing! You know your HHR history! 🚐";
        if (percentage >= 50) return "Good job! You're getting there! 🌲";
        return "Nice try! Time to brush up on your rules! 📖";
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="">
            <div className="relative overflow-hidden">
                {/* Close Button - Custom positioned to not conflict with header */}
                <button
                    onClick={onClose}
                    className="absolute top-0 right-0 p-2 text-slate-400 hover:text-slate-600 transition-colors z-50"
                >
                    <X className="w-6 h-6" />
                </button>

                {!gameComplete ? (
                    <div className="space-y-6 pt-4">
                        {/* Easter Egg Header */}
                        <div className="text-center space-y-2">
                            <div className="inline-flex items-center gap-3 animate-bounce-subtle">
                                <Caravan className="w-8 h-8 text-indigo-500 animate-wiggle" />
                                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                                    HHR Trivia
                                </h2>
                                <Sparkles className="w-8 h-8 text-amber-400 animate-spin-slow" />
                            </div>
                            <p className="text-slate-500 font-medium text-sm">
                                Question {currentQuestionIndex + 1} of {TRIVIA_QUESTIONS.length}
                            </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                                style={{ width: `${((currentQuestionIndex) / TRIVIA_QUESTIONS.length) * 100}%` }}
                            />
                        </div>

                        {/* Question Card */}
                        <div className="bg-white p-1">
                            <h3 className="text-xl font-bold text-slate-900 mb-6 text-center leading-relaxed">
                                {currentQuestion.question}
                            </h3>

                            <div className="grid gap-3">
                                {currentQuestion.options.map((option, idx) => {
                                    let buttonStyle = "bg-white border-2 border-slate-200 hover:border-indigo-300 hover:bg-slate-50";

                                    if (isAnswered) {
                                        if (option === currentQuestion.correctAnswer) {
                                            buttonStyle = "bg-emerald-50 border-2 border-emerald-500 text-emerald-700";
                                        } else if (option === selectedAnswer) {
                                            buttonStyle = "bg-rose-50 border-2 border-rose-500 text-rose-700";
                                        } else {
                                            buttonStyle = "bg-slate-50 border-2 border-slate-100 text-slate-400 opacity-50";
                                        }
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswer(option)}
                                            disabled={isAnswered}
                                            className={`w-full p-4 rounded-xl text-left font-medium transition-all duration-200 ${buttonStyle}`}
                                        >
                                            {option}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Fact Reveal & Next Button */}
                        {isAnswered && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-4">
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                                    <HelpCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-bold text-amber-800 text-sm mb-1">Did You Know?</div>
                                        <p className="text-sm text-amber-700 leading-relaxed">
                                            {currentQuestion.fact}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleNext}
                                    className="w-full bg-slate-900 text-white rounded-xl py-4 font-bold text-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    Next Question <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 space-y-6 animate-in zoom-in-95 duration-500">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 blur-2xl opacity-20 animate-pulse rounded-full" />
                            <Trophy className="w-24 h-24 text-amber-400 relative z-10 drop-shadow-xl mx-auto" strokeWidth={1.5} />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-slate-900">Quiz Complete!</h2>
                            <p className="text-slate-500">You scored</p>
                            <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                                {score}/{TRIVIA_QUESTIONS.length}
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 max-w-sm mx-auto">
                            <p className="text-lg font-medium text-slate-800">
                                {getScoreMessage()}
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl"
                        >
                            Close Trivia
                        </button>
                    </div>
                )}
            </div>
        </BaseModal>
    );
}
