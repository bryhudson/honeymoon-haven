import React, { useState } from 'react';
import { Sparkles, ArrowRight, Mountain, Sun, Home, Trees, Ship, Flower2, Film, Fish, LifeBuoy, Map } from 'lucide-react';

const FACTS = [
    {
        icon: <Map className="w-8 h-8 text-emerald-500" />,
        title: 'The "Loch Ness" Cousin',
        text: 'Cowichan Lake has its own legendary cryptid! The First Nations legend speaks of the Stsinquaw (or Ts\'inquaw), a massive serpent-like creature that was said to overturn canoes. If the water looks weirdly calm... keep an eye out. 🐉'
    },
    {
        icon: <Sun className="w-8 h-8 text-amber-500" />,
        title: 'The "Warm Land" Promise',
        text: 'The name "Cowichan" comes from the Hul’qumi’num word Quw’utsun, which roughly translates to "The Warm Land." It’s not just marketing jargon; the valley actually has Canada’s highest average annual temperature. ☀️'
    },
    {
        icon: <Home className="w-8 h-8 text-blue-500" />,
        title: 'A "Ghost" Town That Survived',
        text: 'For decades, Honeymoon Bay was a "company town" owned entirely by Western Forest Industries. They built the houses, the hall, and the roads. When the mill closed, the town didn\'t die; the residents just bought their houses (sometimes for incredibly low prices) and stayed! 🏚️➡️🏡'
    },
    {
        icon: <Trees className="w-8 h-8 text-green-600" />,
        title: 'The Elk Are the Real Locals',
        text: 'You are almost guaranteed to see Roosevelt Elk here. They are the largest of the elk species in North America, and in Honeymoon Bay, they act like they own the place (because, frankly, they do). They regularly nap on the golf course greens. 🦌'
    },
    {
        icon: <Mountain className="w-8 h-8 text-indigo-500" />,
        title: 'A Lake with "Legs"',
        text: 'Cowichan Lake isn\'t just a circle; it’s massive. It is over 30 kilometers (about 19 miles) long, making it the second-largest lake on Vancouver Island. It’s so big that the weather at one end can be completely different from the other. 🌊'
    },
    {
        icon: <Ship className="w-8 h-8 text-slate-500" />,
        title: 'The "Iron Stomach" Commute',
        text: 'In the early 1900s, there were no roads to the bay. If you wanted to visit, you took the train to the end of the line (Lake Cowichan) and then hopped on a boat. If the lake was choppy, your "romantic getaway" started with seasickness. 🚂🤢'
    },
    {
        icon: <Flower2 className="w-8 h-8 text-pink-500" />,
        title: 'The "Pink" Pilgrimage',
        text: 'The Honeymoon Bay Ecological Reserve protects the Pink Fawn Lily, a flower so rare and specific to this area that botanists travel from all over just to see it bloom for a fleeting window in April/May. 🌸'
    },
    {
        icon: <Film className="w-8 h-8 text-purple-600" />,
        title: 'Hollywood North...ish',
        text: 'The eerie, dense forests around Cowichan Lake have been used as filming locations for thrillers and sci-fi shows that need that "ancient, untouched wilderness" vibe (including spots for The Twilight Saga nearby). 🎬'
    },
    {
        icon: <Fish className="w-8 h-8 text-sky-500" />,
        title: 'The "Cutthroat" Capital',
        text: 'The lake is famous for its Cutthroat Trout. The local pub, The Cutthroat Tavern, honors this. It’s a great trivia point for guests who might think the name sounds menacing rather than fishy. 🐟'
    },
    {
        icon: <LifeBuoy className="w-8 h-8 text-orange-500" />,
        title: 'The Tubing Rite of Passage',
        text: 'While the lake is for boating, the Cowichan River (which flows out of the lake) is famous for "The Tube Run." It is practically a mandatory summer ritual to float down the river on an inflatable tube with a cooler tied to your ankle. 🍩'
    }
];

export function DidYouKnow() {
    // Start with a random fact on mount to keep it fresh
    const [currentIndex, setCurrentIndex] = useState(() => Math.floor(Math.random() * FACTS.length));
    const [isAnimating, setIsAnimating] = useState(false);

    const handleNext = () => {
        setIsAnimating(true);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % FACTS.length);
            setIsAnimating(false);
        }, 150); // Short duration for a "quick flip" feel
    };

    const fact = FACTS[currentIndex];

    return (
        <div className="w-full bg-white/50 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <Sparkles className="w-24 h-24 rotate-12" />
            </div>

            <div className="flex flex-col gap-4 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary/80 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Did You Know?
                    </div>
                    <button
                        onClick={handleNext}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 opacity-70 hover:opacity-100"
                        title="Show another fact"
                    >
                        Next Fact <ArrowRight className="w-3 h-3" />
                    </button>
                </div>

                <div
                    className={`transition-all duration-150 ease-in-out transform ${isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
                        }`}
                >
                    <div className="flex gap-4 items-start">
                        <div className="bg-white p-2.5 rounded-full shadow-sm shrink-0 mt-1">
                            {fact.icon}
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-gray-900 text-lg leading-tight">
                                {fact.title}
                            </h3>
                            <p className="text-gray-600 leading-relaxed text-sm">
                                {fact.text}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Progress dots */}
                <div className="flex justify-center gap-1.5 mt-2">
                    {FACTS.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-4 bg-primary' : 'w-1.5 bg-gray-200'
                                }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
