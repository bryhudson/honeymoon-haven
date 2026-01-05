import React from 'react';
import { format } from 'date-fns';

export function RecentBookings({ bookings, onViewDetails, currentShareholder, isAdmin }) {
    // Filter for table display (exclude passes)
    const bookingsForTable = bookings.filter(r => r.type !== 'pass');

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold tracking-tight">Recent Bookings</h2>
            <div className="bg-card border rounded-lg shadow-sm overflow-hidden mb-8">
                <div className="overflow-x-auto">
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
                                            <td className="px-3 md:px-6 py-4 font-medium">{booking.shareholderName || booking.partyName || "-"}</td>
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
                                                {booking.isFinalized ? (
                                                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                                        Confirmed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                                        In Progress
                                                    </span>
                                                )}
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
            </div>
        </div>
    );
}
