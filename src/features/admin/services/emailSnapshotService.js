import { format, eachDayOfInterval, startOfMonth, endOfMonth, isWithinInterval, startOfDay } from 'date-fns';
import { emailService } from '../../../services/emailService';

export const sendCalendarEmailSnapshot = async (bookings, recipient, onNotify) => {
    if (!recipient) return;

    // 2026 Season: March - October
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

    // Helper to find booking for a specific date
    const getBookingForDate = (date) => {
        return bookings.find(b => {
            if (b.type === 'pass' || b.type === 'auto-pass' || b.type === 'cancelled') return false;
            if (!b.from || !b.to) return false;

            const start = b.from instanceof Date ? b.from : b.from.toDate ? b.from.toDate() : new Date(b.from);
            const end = b.to instanceof Date ? b.to : b.to.toDate ? b.to.toDate() : new Date(b.to);

            return isWithinInterval(startOfDay(date), { start: startOfDay(start), end: startOfDay(end) });
        });
    };

    try {
        let monthsHtml = "";

        months.forEach(month => {
            const start = startOfMonth(month);
            const end = endOfMonth(month);
            const days = eachDayOfInterval({ start, end });
            const startDay = start.getDay();
            const blanks = Array(startDay).fill(null);

            let gridHtml = `
                <div style="margin-bottom: 30px; page-break-inside: avoid;">
                    <h3 style="background-color: #f1f5f9; padding: 10px; margin: 0; border: 1px solid #e2e8f0; text-align: center;">${format(month, 'MMMM yyyy')}</h3>
                    <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; border: 1px solid #e2e8f0; padding: 5px;">
                        ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div style="text-align: center; font-size: 10px; font-weight: bold; color: #94a3b8; padding: 2px;">${d}</div>`).join('')}
            `;

            blanks.forEach(() => {
                gridHtml += `<div style="aspect-ratio: 1; padding: 5px;"></div>`;
            });

            days.forEach(day => {
                const b = getBookingForDate(day);
                let bg = "#ffffff";
                let color = "#334155";
                let info = "";

                if (b) {
                    bg = b.isPaid ? "#22c55e" : "#f43f5e";
                    color = "#ffffff";
                    info = `<div style="font-size: 8px; line-height: 1;">${b.cabinNumber || b.cabin || "?"}</div>`;
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
            <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto;">
                <h2 style="color: #0f172a; text-align: center;">2026 Season Calendar</h2>
                <p style="color: #64748b; text-align: center; margin-bottom: 30px;">Generated on ${format(new Date(), 'PPP')}</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    ${monthsHtml}
                </div>
            </div>
        `;

        await emailService.sendEmail({
            to: { name: "Admin", email: recipient },
            subject: `Calendar Snapshot - ${format(new Date(), 'MMM d')}`,
            htmlContent: fullHtml
        });

        if (onNotify) onNotify("Success", `Calendar snapshot sent to ${recipient}`);
    } catch (err) {
        console.error("Email fail", err);
        if (onNotify) onNotify("Error", "Failed to send calendar snapshot.");
    }
};
