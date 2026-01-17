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

                <div className="hidden md:block overflow-x-auto">
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
                                    const r1Entry = fullSchedule[index];
                                    const r2Entry = fullSchedule[12 + (11 - index)];
                                    const isActive = name === status.activePicker;

                                    // Helper to render cell (REUSED)
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
                                            cellBg = "text-muted-foreground";
                                        }

                                        return (
                                            <div className={`px-3 py-2 rounded w-fit ${cellBg} `}>
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
                                            <td className="px-6 py-4 font-bold text-base text-slate-900">{cabinNumber}</td>
                                            <td className="px-6 py-4 font-bold text-base text-slate-900">
                                                {name}
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

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4 p-4 bg-slate-50/50">
                    {(() => {
                        const fullSchedule = mapOrderToSchedule(currentOrder, allDraftRecords, startDateOverride);
                        return currentOrder.map((name, index) => {
                            const owner = CABIN_OWNERS.find(o => o.name === name);
                            const cabinNumber = owner ? owner.cabin : "-";
                            const r1Entry = fullSchedule[index];
                            const r2Entry = fullSchedule[12 + (11 - index)];
                            const isActive = name === status.activePicker;

                            // Inline helper to avoid duplication complexity in render loop
                            const renderMobileStatus = (entry, roundLabel) => {
                                if (!entry) return null;
                                let statusColor = "text-slate-500";
                                let statusText = "Pending";

                                if (entry.status === 'COMPLETED') { statusColor = "text-green-600 font-medium"; statusText = "✓ Done"; }
                                else if (entry.status === 'ACTIVE') { statusColor = "text-blue-600 font-bold"; statusText = "Active Now"; }
                                else if (entry.status === 'GRACE_PERIOD') { statusColor = "text-amber-600 font-bold"; statusText = "Early Access"; }
                                else if (entry.status === 'PASSED') { statusColor = "text-slate-400 line-through"; statusText = "Passed"; }

                                return (
                                    <div className="flex justify-between items-center py-2 border-b last:border-0 border-slate-100">
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{roundLabel}</span>
                                        <div className="text-right">
                                            <div className={`text-xs ${statusColor}`}>{statusText}</div>
                                            <div className="text-sm text-slate-700">{format(entry.start, 'MMM d, h:mm a')}</div>
                                        </div>
                                    </div>
                                );
                            };

                            return (
                                <div key={name} className={`bg-white rounded-lg border shadow-sm overflow-hidden ${isActive ? 'ring-2 ring-blue-500 border-transparent' : 'border-slate-200'}`}>
                                    <div className={`px-4 py-3 flex justify-between items-center ${isActive ? 'bg-blue-50/50' : 'bg-slate-50/50 border-b border-slate-100'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-xs text-slate-400 font-bold">#{index + 1}</span>
                                            <span className="font-bold text-slate-800">{name}</span>
                                        </div>
                                        <div className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded border">
                                            Cabin {cabinNumber}
                                        </div>
                                    </div>
                                    <div className="px-4 py-2">
                                        {renderMobileStatus(r1Entry, "Round 1")}
                                        {renderMobileStatus(r2Entry, "Round 2")}
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>
        </div>
    );
}
