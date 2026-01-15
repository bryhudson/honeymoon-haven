import React from 'react';
import { format } from 'date-fns';
import { CABIN_OWNERS, mapOrderToSchedule } from '../../lib/shareholders';

export function SeasonSchedule({ currentOrder, allDraftRecords, status, startDateOverride }) {
    return (
        <div className="">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold tracking-tight">2026 Season Booking Schedule</h2>
            </div>

            <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 bg-muted/20 border-b">
                    <p className="text-muted-foreground text-sm">
                        <strong>How it works:</strong> The booking order rotates by one spot annually.
                        <br />
                        <strong>Round 1:</strong> 2 Days per person (Forward order).
                        <br />
                        <strong>Round 2:</strong> 2 Days per person (Reverse "Snake" order).
                        <br />
                        <strong>Open Season:</strong> Starts after Round 2. First come, first serve (48h cooldown).
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">Order</th>
                                <th className="px-6 py-4">Cabin #</th>
                                <th className="px-6 py-4">Shareholder</th>
                                <th className="px-6 py-4">First Pass (Forward)</th>
                                <th className="px-6 py-4">Second Pass (Snake Back)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {(() => {
                                // Pre-calculate full schedule history/projection
                                const fullSchedule = mapOrderToSchedule(currentOrder, allDraftRecords, startDateOverride);

                                return currentOrder.map((name, index) => {
                                    const owner = CABIN_OWNERS.find(o => o.name === name);
                                    const cabinNumber = owner ? owner.cabin : "-";

                                    // Find R1 and R2 entries for this person
                                    // Note: mapOrderToSchedule returns 24 items in order
                                    // Round 1 is indices 0-11. Round 2 is 12-23 (reversed order).

                                    // R1 entry is simply at index `index`
                                    const r1Entry = fullSchedule[index];

                                    // R2 entry is at index `12 + (11 - index)`
                                    const r2Entry = fullSchedule[12 + (11 - index)];

                                    const isActive = name === status.activePicker;

                                    // Helper to render cell
                                    const renderCell = (entry, label) => {
                                        if (!entry) return <span className="text-gray-300">-</span>;

                                        let cellBg = "";
                                        let badge = null;

                                        if (entry.status === 'COMPLETED') {
                                            cellBg = "bg-green-50 text-green-700";
                                            badge = "✓ Done";
                                        } else if (entry.status === 'CANCELLED') {
                                            cellBg = "bg-red-50 text-red-600 line-through";
                                            badge = "Cancelled";
                                        } else if (entry.status === 'PASSED') {
                                            cellBg = "bg-gray-100 text-gray-500 line-through";
                                            badge = "Passed";
                                        } else if (entry.status === 'ACTIVE') {
                                            cellBg = "bg-blue-100 text-blue-900 font-bold ring-2 ring-blue-500 ring-inset";
                                            badge = "Active Now";
                                        } else if (entry.status === 'GRACE_PERIOD') {
                                            cellBg = "bg-amber-50 text-amber-900 font-bold ring-2 ring-amber-500 ring-inset";
                                            badge = "Early Access";
                                        } else if (entry.status === 'SKIPPED') {
                                            cellBg = "bg-red-50 text-red-400";
                                            badge = "Skipped";
                                        } else {
                                            // Future
                                            cellBg = "text-muted-foreground";
                                        }

                                        return (
                                            <div className={`px-3 py-2 rounded md:w-fit ${cellBg} `}>
                                                <div className="text-xs font-semibold uppercase tracking-wider mb-0.5 opacity-70">
                                                    {badge || label}
                                                </div>
                                                <div>
                                                    {format(entry.start, 'MMM d, h:mm a')}
                                                </div>
                                            </div>
                                        );
                                    };


                                    return (
                                        <tr key={name} className={`transition-colors border-l-4 ${isActive ? "bg-blue-50/50 border-l-blue-600 shadow-sm" : "hover:bg-muted/10 border-l-transparent"} `}>
                                            <td className="px-6 py-4 font-mono text-muted-foreground">
                                                #{index + 1}
                                            </td>
                                            <td className="px-6 py-4 font-bold">{cabinNumber}</td>
                                            <td className="px-6 py-4 font-medium text-lg">
                                                {name}
                                                {/* Show simplified status badge next to name if needed */}
                                            </td>
                                            <td className="px-6 py-4">
                                                {renderCell(r1Entry, "Round 1")}
                                            </td>
                                            <td className="px-6 py-4">
                                                {renderCell(r2Entry, "Round 2")}
                                            </td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
