import React, { useState } from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, addMonths, startOfDay, isWithinInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { PromptModal } from './PromptModal';
import { emailService } from '../services/emailService';

export function AdminCalendarView({ bookings, onNotify }) {
    // 2026 Season: March - October
    const SEASON_START = new Date(2026, 2, 1); // March 1, 2026
    const SEASON_END = new Date(2026, 9, 31);  // Oct 31, 2026

    // Generate Month List
    const months = [
        new Date(2026, 2, 1), // March
        new Date(2026, 3, 1), // April
        new Date(2026, 4, 1), // May
        new Date(2026, 5, 1), // June
        new Date(2026, 6, 1), // July
        new Date(2026, 7, 1), // Aug
        new Date(2026, 8, 1), // Sept
        new Date(2026, 9, 1), // Oct
    ];

    const { currentUser } = useAuth();

    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [promptCallback, setPromptCallback] = useState(null);

    // --- Email Logic ---
    const handleEmailCalendar = () => {
        setIsPromptOpen(true);
        setPromptCallback(() => handleSendEmail);
    };

    const handleSendEmail = async (recipient) => {
        if (!recipient) return;

        try {
            // Generate HTML for all months
            let monthsHtml = "";

            months.forEach(month => {
                const start = startOfMonth(month);
                const end = endOfMonth(month);
                const days = eachDayOfInterval({ start, end });
                const startDay = start.getDay();
                const blanks = Array(startDay).fill(null);

                // Header
                let gridHtml = `
                    <div style="margin-bottom: 30px; page-break-inside: avoid;">
                        <h3 style="background-color: #f1f5f9; padding: 10px; margin: 0; border: 1px solid #e2e8f0; text-align: center;">${format(month, 'MMMM yyyy')}</h3>
                        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; border: 1px solid #e2e8f0; padding: 5px;">
                            ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div style="text-align: center; font-size: 10px; font-weight: bold; color: #94a3b8; padding: 2px;">${d}</div>`).join('')}
                `;

                // Blanks
                blanks.forEach(() => {
                    gridHtml += `<div style="aspect-ratio: 1; padding: 5px;"></div>`;
                });

                // Days
                days.forEach(day => {
                    const b = getBookingForDate(day);
                    let bg = "#ffffff";
                    let color = "#334155";
                    let info = "";

                    if (b) {
                        if (b.isFinalized) {
                            bg = "#22c55e"; // green-500
                            color = "#ffffff";
                        } else {
                            bg = "#fbbf24"; // amber-400
                            color = "#78350f"; // amber-900
                        }
                        info = `<div style="font-size: 8px; line-height: 1;">${b.cabinNumber}</div>`;
                    }

                    gridHtml += `
                        <div style="background-color: ${bg}; color: ${color}; padding: 4px; text-align: center; border-radius: 4px; min-height: 30px; font-size: 12px;">
                            ${format(day, 'd')}
                            ${info}
                        </div>
                    `;
                });

                gridHtml += `</div></div>`;
                monthsHtml += gridHtml;
            });

            const fullHtml = `
                <h2>2026 Season Calendar</h2>
                <p>Generated on ${format(new Date(), 'PPP')}</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    ${monthsHtml}
                </div>
            `;

            await emailService.sendEmail({
                to: { name: "Admin", email: recipient },
                subject: `Calendar Snapshot - ${format(new Date(), 'MMM d')}`,
                htmlContent: fullHtml
            });

            onNotify("Success", `Calendar sent to ${recipient}`);
            setIsPromptOpen(false);
        } catch (err) {
            console.error("Email fail", err);
            onNotify("Error", "Failed to send calendar.");
        }
    };

    // Helper to find booking for a specific date
    const getBookingForDate = (date) => {
        return bookings.find(b => {
            // Ignore "Pass" or "Cancelled" types for the visual blocks (unless we want to show cancelled specially)
            if (b.type === 'pass' || b.type === 'auto-pass' || b.type === 'cancelled') return false;

            if (!b.from || !b.to) return false;

            // Safe Date conversion
            const start = b.from instanceof Date ? b.from : b.from.toDate ? b.from.toDate() : new Date(b.from);
            const end = b.to instanceof Date ? b.to : b.to.toDate ? b.to.toDate() : new Date(b.to);

            // Check interval (inclusive)
            return isWithinInterval(startOfDay(date), { start: startOfDay(start), end: startOfDay(end) });
        });
    };

    const renderMonth = (monthDate) => {
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);
        const days = eachDayOfInterval({ start, end });

        // Pad with empty cells for start of week (Sun=0)
        const startDay = start.getDay();
        const blanks = Array(startDay).fill(null);

        return (
            <div key={monthDate.toString()} className="bg-white rounded-xl border shadow-sm flex flex-col h-full relative">
                <div className="bg-slate-50 p-3 border-b text-center rounded-t-xl">
                    <h3 className="font-bold text-slate-800">{format(monthDate, 'MMMM yyyy')}</h3>
                </div>
                <div className="p-2 grid grid-cols-7 gap-1">
                    {/* Headers */}
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                        <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase">{d}</div>
                    ))}

                    {/* Blanks */}
                    {blanks.map((_, i) => <div key={`blank-${i}`} />)}

                    {/* Days */}
                    {days.map(day => {
                        const booking = getBookingForDate(day);

                        // Determine styling based on booking status
                        let bgClass = "bg-white hover:bg-slate-50 text-slate-700";
                        if (booking) {
                            if (booking.isFinalized) {
                                bgClass = "bg-green-500 text-white hover:bg-green-600";
                            } else {
                                bgClass = "bg-amber-400 text-amber-900 hover:bg-amber-500";
                            }
                        }

                        // Tooltip text
                        const title = booking ? `${booking.shareholderName} (Cabin #${booking.cabinNumber || '?'})` : format(day, 'MMM d');

                        return (
                            <div
                                key={day.toString()}
                                className={`
                                    aspect-square rounded-md flex items-center justify-center text-xs font-medium cursor-default transition-colors relative group
                                    ${bgClass}
                                `}
                                title={title}
                            >
                                {format(day, 'd')}
                                {booking && (
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 w-max max-w-[150px] bg-slate-900 text-white text-[10px] p-2 rounded shadow-lg pointer-events-none text-center">
                                        <div className="font-bold">{booking.shareholderName}</div>
                                        <div className="opacity-75">Cabin #{booking.cabinNumber}</div>
                                        <div className="opacity-75 mt-1 text-[9px] uppercase border-t border-slate-700 pt-1">
                                            {booking.isFinalized ? "Finalized" : "Draft"}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">2026 Season Calendar</h2>
                    <p className="text-sm text-muted-foreground">Visual snapshot of all clean bookings for the season.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
                    <button
                        onClick={handleEmailCalendar}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <Mail className="w-4 h-4" />
                        Email Calendar
                    </button>
                    <div className="flex gap-4 text-xs font-bold text-slate-600 bg-white p-2 rounded-lg border shadow-sm h-fit">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-green-500"></div>
                            <span>Finalized</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-amber-400"></div>
                            <span>Draft</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {months.map(m => renderMonth(m))}
            </div>

            <PromptModal
                isOpen={isPromptOpen}
                onClose={() => setIsPromptOpen(false)}
                onConfirm={handleSendEmail}
                title="Email Calendar View"
                message="Enter recipient email:"
                defaultValue={currentUser?.email || ""}
                confirmText="Send Calendar"
            />
        </div>
    );
}
