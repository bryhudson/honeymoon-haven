import React, { useState, useEffect } from 'react';
import { TriviaCard } from '../components/TriviaCard';
import { Trophy, ArrowRight, RotateCcw, Home, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';

const QUESTIONS = [
    {
        question: "What is the name of the legendary serpent-like cryptid said to inhabit Cowichan Lake?",
        options: ["Ogopogo", "Stsinquaw", "Sasquatch", "Caddy"],
        correctAnswer: "Stsinquaw",
        fact: "The Stsinquaw (or Ts'inquaw) is a massive serpent-like creature from First Nations legend, said to overturn canoes! 🐉"
    },
    {
        question: "What does the Hul’qumi’num name 'Quw’utsun' (Cowichan) roughly translate to?",
        options: ["The Big Lake", "Land of Elk", "The Warm Land", "Valley of Mist"],
        correctAnswer: "The Warm Land",
        fact: "It's not just a name; the valley actually has Canada’s highest average annual temperature! ☀️"
    },
    {
        question: "Honeymoon Bay was originally a company town for which industry?",
        options: ["Mining", "Fishing", "Forestry", "Tourism"],
        correctAnswer: "Forestry",
        fact: "It was owned by Western Forest Industries. When the mill closed, residents bought their homes and stayed! 🏚️"
    },
    {
        question: "Which large animal species is commonly seen napping on the local golf course greens?",
        options: ["Grizzly Bear", "Roosevelt Elk", "Moose", "Cougar"],
        correctAnswer: "Roosevelt Elk",
        fact: "They are the largest elk species in North America and act like they own the place. 🦌"
    },
    {
        question: "Approximately how long is Cowichan Lake?",
        options: ["10 km", "20 km", "30 km", "50 km"],
        correctAnswer: "30 km",
        fact: "It's over 30km (19 miles) long, making it the second-largest lake on Vancouver Island! 🌊"
    },
    {
        question: "Before roads were built, how did early visitors travel from Lake Cowichan to Honeymoon Bay?",
        options: ["Horseback", "Train then Boat", "Hiking", "Seaplane"],
        correctAnswer: "Train then Boat",
        fact: "If the lake was choppy, your 'romantic getaway' often started with seasickness! 🚂🤢"
    },
    {
        question: "The Honeymoon Bay Ecological Reserve is famous for protecting which rare flower?",
        options: ["Pink Fawn Lily", "Western Trillium", "Chocolate Lily", "Camas"],
        correctAnswer: "Pink Fawn Lily",
        fact: "Botanists travel from all over just to see it bloom for a fleeting window in April/May. 🌸"
    },
    {
        question: "The local forests have served as filming locations for projects like which famous franchise?",
        options: ["Lord of the Rings", "The Twilight Saga", "Harry Potter", "Star Wars"],
        correctAnswer: "The Twilight Saga",
        fact: "The eerie, dense forests provide that perfect 'ancient, untouched wilderness' vibe. 🎬"
    },
    {
        question: "Cowichan Lake is famous for which type of trout?",
        options: ["Rainbow Trout", "Cutthroat Trout", "Bull Trout", "Brook Trout"],
        correctAnswer: "Cutthroat Trout",
        fact: "The local pub, The Cutthroat Tavern, is even named after them! 🐟"
    },
    {
        question: "What is the 'mandatory' summer ritual on the Cowichan River?",
        options: ["Whitewater Rafting", "Kayaking", "The Tube Run", "Fishing Derby"],
        correctAnswer: "The Tube Run",
        fact: "Floating down the river on an inflatable tube with a cooler is a local rite of passage. 🍩"
    }
];

export function TriviaPage() {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);

    const currentQ = QUESTIONS[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === QUESTIONS.length - 1;

    // Prefetch next image or resources if we had them

    useEffect(() => {
        if (showResult && score > 7) {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
            const randomInRange = (min, max) => Math.random() * (max - min) + min;

            const interval = setInterval(function () {
                const timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) return clearInterval(interval);
                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);
            return () => clearInterval(interval);
        }
    }, [showResult, score]);

    const handleAnswer = (answer) => {
        setSelectedAnswer(answer);
        setIsAnswered(true);
        if (answer === currentQ.correctAnswer) {
            setScore(s => s + 1);
            // Celebration for correct answer?
            confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.7 },
                colors: ['#10B981', '#34D399'] // Green confetti
            });
        }
    };

    const handleNext = () => {
        if (isLastQuestion) {
            setShowResult(true);
        } else {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setIsAnswered(false);
        }
    };

    const restartGame = () => {
        setCurrentQuestionIndex(0);
        setScore(0);
        setShowResult(false);
        setSelectedAnswer(null);
        setIsAnswered(false);
    };

    if (showResult) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-4 bg-slate-50">
                <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center max-w-lg w-full border border-slate-100 relative overflow-hidden">
                    {/* Background decorations */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500"></div>

                    <div className="mb-6 inline-flex p-4 rounded-full bg-yellow-100 text-yellow-600 shadow-inner">
                        <Trophy className="w-16 h-16" />
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Quiz Complete!</h1>
                    <p className="text-slate-500 mb-8">You scored</p>

                    <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-600 to-blue-600 mb-8">
                        {score} / {QUESTIONS.length}
                    </div>

                    <p className="text-lg text-slate-700 mb-8 font-medium">
                        {score === 10 ? "🏆 Perfect Score! You're a true local!" :
                            score >= 7 ? "✨ Great job! You know your stuff!" :
                                "🌲 Nice try! Time to explore more!"}
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={restartGame}
                            className="w-full py-3 px-6 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                        >
                            <RotateCcw className="w-5 h-5" /> Play Again
                        </button>
                        <Link
                            to="/"
                            className="w-full py-3 px-6 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                        >
                            <Home className="w-5 h-5" /> Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header / Progress */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="text-slate-500 hover:text-slate-900 transition-colors">
                        <Home className="w-6 h-6" />
                    </Link>
                    <div className="flex flex-col items-center w-full max-w-md mx-4">
                        <div className="flex justify-between w-full text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                            <span>Question {currentQuestionIndex + 1} / {QUESTIONS.length}</span>
                            <span>Score: {score}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 ease-out"
                                style={{ width: `${((currentQuestionIndex) / QUESTIONS.length) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className="w-6"></div> {/* Spacer for center alignment */}
                </div>
            </div>

            <main className="container mx-auto px-4 py-6 md:py-10 flex flex-col items-center">
                <div className="w-full max-w-lg">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 text-purple-700 font-bold text-sm mb-2 shadow-sm">
                            <Sparkles className="w-4 h-4" /> Honeymoon Trivia
                        </div>
                    </div>

                    <TriviaCard
                        {...currentQ}
                        selectedAnswer={selectedAnswer}
                        isAnswered={isAnswered}
                        onSelect={handleAnswer}
                    />

                    {/* Inline Next Button (No longer fixed at bottom) */}
                    <div className={`mt-6 transition-all duration-500 ease-out transform ${isAnswered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                        <button
                            onClick={handleNext}
                            disabled={!isAnswered}
                            className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-bold text-lg shadow-lg hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            {isLastQuestion ? "See Results" : "Next Question"} <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
