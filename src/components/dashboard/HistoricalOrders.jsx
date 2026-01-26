import React from 'react';
import { History, Trophy } from 'lucide-react';

export function HistoricalOrders() {
    const ORDER_2025 = [
        { order: 1, cabin: "2", name: "Mike & Janelle" },
        { order: 2, cabin: "8", name: "Julia, Mandy & Bryan" },
        { order: 3, cabin: "3", name: "Brian & Monique" },
        { order: 4, cabin: "4", name: "Brian & Sam" },
        { order: 5, cabin: "7", name: "Jeff & Lori" },
        { order: 6, cabin: "9", name: "David & Gayla" },
        { order: 7, cabin: "6", name: "Barb" },
        { order: 8, cabin: "12", name: "Steve & Kate" },
        { order: 9, cabin: "5", name: "Ernest & Sandy" },
        { order: 10, cabin: "1", name: "Gerry & Georgina" },
        { order: 11, cabin: "10", name: "Saurabh & Jessica" },
        { order: 12, cabin: "11", name: "Dom & Melanie" }
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            <div className="text-center space-y-2 mb-8">
                <div className="inline-flex items-center justify-center p-3 bg-amber-100 rounded-full text-amber-700 mb-2 shadow-sm">
                    <History className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800">Historical Archives</h2>
                <p className="text-slate-500 max-w-lg mx-auto">
                    A record of past booking orders and rotations for historical reference.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* 2025 Order Card */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                    <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-xl text-slate-800">2025 Season</h3>
                            <p className="text-sm text-slate-500">Historical Record</p>
                        </div>
                        <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">ARCHIVED</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="py-3 px-4 font-semibold text-slate-600 w-16 text-center">Order</th>
                                    <th className="py-3 px-4 font-semibold text-slate-600 w-20 text-center">Cabin</th>
                                    <th className="py-3 px-4 font-semibold text-slate-600">Shareholder</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {ORDER_2025.map((row) => (
                                    <tr key={row.order} className="hover:bg-amber-50/50 transition-colors">
                                        <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold">{row.order}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="inline-block bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold min-w-[30px]">
                                                {row.cabin}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 font-medium text-slate-700">{row.name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Placeholder for future or context */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-6 text-white text-center flex flex-col items-center justify-center min-h-[200px]">
                        <Trophy className="w-12 h-12 mb-4 text-yellow-300 opacity-90" />
                        <h3 className="text-xl font-bold mb-2">2026 is LIVE!</h3>
                        <p className="text-blue-100 mb-6 max-w-xs">
                            The 2026 season draft is currently active. Check the "Schedule" tab for the live rotation.
                        </p>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 text-amber-900/80 text-sm leading-relaxed">
                        <p className="font-semibold text-amber-800 mb-2">Did you know?</p>
                        The booking order rotates annually using a specialized algorithm to ensure fairness over time.
                        The order shifts by one position each year, meaning the 1st pick in 2025 becomes the last pick of the first round in 2026 (before the snake draft reversal).
                    </div>
                </div>
            </div>
        </div>
    );
}
