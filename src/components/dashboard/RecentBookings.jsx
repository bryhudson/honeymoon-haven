import React from 'react';
import { format } from 'date-fns';

export function RecentBookings({ bookings, onViewDetails, currentShareholder, isAdmin, activePicker }) {
    // Filter for table display (exclude passes)
    const bookingsForTable = bookings.filter(r => r.type !== 'pass');

    const renderStatusBadge = (booking) => {
        if (booking.type === 'cancelled') {
            return (
                <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                    Cancelled
                </span>
            );
        }
        if (booking.isFinalized) {
            return (
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    Confirmed
                </span>
            );
        }
        // Draft Logic
        const name = booking.shareholderName || booking.partyName;
        const isActive = name === activePicker;

        if (isActive) {
            return (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20 animate-pulse">
                    In Progress
                </span>
            );
        }

        return (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">
                Queued
            </span>
        );
    };

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold tracking-tight">Recent Bookings</h2>
            <div className="bg-card border rounded-lg shadow-sm overflow-hidden mb-8">
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                            <tr>
                                <th scope="col" className="px-3 md:px-6 py-4">Cabin #</th>
                                <th scope="col" className="px-3 md:px-6 py-4">Shareholder</th>
                                <th scope="col" className="px-3 md:px-6 py-4">Dates</th>
                                <th scope="col" className="px-3 md:px-6 py-4">Guests</th>
                                <th scope="col" className="px-3 md:px-6 py-4">Status</th>
                                <th scope="col" className="px-3 md:px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {bookingsForTable.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-muted-foreground">
                                        No bookings found.
                                    </td>
                                </tr>
                            ) : (
                                bookingsForTable.map((booking, index) => {
                                    return (
                                        <tr key={index} className="hover:bg-muted/10 transition-colors">
                                            <td className="px-3 md:px-6 py-4 font-bold">{booking.cabinNumber || "-"}</td>
                                            <td className="px-3 md:px-6 py-4 font-bold text-base text-slate-900">{booking.shareholderName || booking.partyName || "-"}</td>
                                            <td className="px-3 md:px-6 py-4 text-sm">
                                                {(booking.from && booking.to) ? (
                                                    <>
                                                        {format(booking.from, 'MMM d')} - {format(booking.to, 'MMM d, yyyy')}
                                                    </>
                                                ) : (
                                                    <span className="text-destructive">Invalid Date</span>
                                                )}
                                            </td>
                                            <td className="px-3 md:px-6 py-4">{booking.guests || "-"}</td>
                                            <td className="px-3 md:px-6 py-4">
                                                {renderStatusBadge(booking)}
                                            </td>
                                            <td className="px-3 md:px-6 py-4 text-right">
                                                {(isAdmin || booking.shareholderName === currentShareholder) && (
                                                    <button
                                                        onClick={() => onViewDetails(booking)}
                                                        className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all"
                                                    >
                                                        View Details
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card Layout */}
                <div className="md:hidden space-y-4 p-4 bg-slate-50/50">
                    {bookingsForTable.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground bg-white rounded-lg border border-dashed">
                            No bookings found.
                        </div>
                    ) : (
                        bookingsForTable.map((booking, index) => {
                            const canView = isAdmin || booking.shareholderName === currentShareholder;

                            return (
                                <div key={index} className="bg-white rounded-lg border shadow-sm p-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-slate-900 text-lg">
                                                {booking.shareholderName || booking.partyName || "-"}
                                            </div>
                                            <div className="text-xs font-bold text-slate-500 mt-1">
                                                Cabin {booking.cabinNumber || "-"}
                                            </div>
                                        </div>
                                        {renderStatusBadge(booking)}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-sm border-t pt-3 mt-1 text-slate-600">
                                        <div>
                                            <span className="block text-xs font-semibold text-slate-400 uppercase">Dates</span>
                                            {(booking.from && booking.to) ? (
                                                <span className="font-medium text-slate-800">{format(booking.from, 'MMM d')} - {format(booking.to, 'MMM d')}</span>
                                            ) : (
                                                <span className="text-destructive">Invalid</span>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-xs font-semibold text-slate-400 uppercase">Guests</span>
                                            <span className="font-medium text-slate-800">{booking.guests || "-"}</span>
                                        </div>
                                    </div>

                                    {canView && (
                                        <button
                                            onClick={() => onViewDetails(booking)}
                                            className="w-full mt-1 inline-flex items-center justify-center text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 py-3 rounded-lg transition-all border border-blue-100"
                                        >
                                            View Details
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
