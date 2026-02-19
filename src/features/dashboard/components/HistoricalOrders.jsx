import React from 'react';
import { History, Info } from 'lucide-react';

export function HistoricalOrders() {
    const ORDER_2025 = [
        { order: 1, cabin: "2", name: "Janelle and Mike" },
        { order: 2, cabin: "8", name: "Julia, Mandy and Bryan" },
        { order: 3, cabin: "3", name: "Monique and Brian" },
        { order: 4, cabin: "4", name: "Sam and Brian" },
        { order: 5, cabin: "7", name: "Lori and Jeff" },
        { order: 6, cabin: "9", name: "Gayla and David" },
        { order: 7, cabin: "6", name: "Barb" },
        { order: 8, cabin: "12", name: "Steve and Kate" },
        { order: 9, cabin: "5", name: "Sandy and Ernest" },
        { order: 10, cabin: "1", name: "Georgina and Jerry" },
        { order: 11, cabin: "10", name: "Jessica and Saurabh" },
        { order: 12, cabin: "11", name: "Melanie and Dom" }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <History className="w-8 h-8 text-slate-800" />
                    Historical Archives
                </h2>
                <p className="text-sm text-slate-500">A record of past booking orders and rotations.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: 2025 Season Table */}
                <div className="lg:col-span-2 bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-slate-900">2025 Season</h3>
                            <p className="text-xs text-slate-500">Historical Booking Order</p>
                        </div>
                        <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
                            Archived
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3 w-20">Order</th>
                                    <th className="px-6 py-3 w-24">Cabin #</th>
                                    <th className="px-6 py-3">Shareholder</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {ORDER_2025.map((row) => (
                                    <tr key={row.order} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-400 font-bold">
                                            #{row.order}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center justify-center bg-slate-100 text-slate-600 px-2.5 py-1 rounded font-bold text-xs min-w-[2rem]">
                                                {row.cabin}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {row.name}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar Context */}
                <div className="space-y-6">
                    {/* Did You Know */}
                    <div className="bg-amber-50 rounded-xl border border-amber-100 p-5">
                        <h4 className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-2">
                            <Info className="w-4 h-4" />
                            How Rotation Works
                        </h4>
                        <p className="text-xs text-amber-900/70 leading-relaxed">
                            The booking order rotates annually using a specialized algorithm to ensure fairness over time.
                            The order shifts by one position each year, meaning the 1st pick in 2025 becomes the last pick of the first round in 2026.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
