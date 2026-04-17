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

        // Build booking summary table with fee details
        const activeBookings = bookings
            .filter(b => b.type !== 'pass' && b.type !== 'auto-pass' && b.type !== 'cancelled' && b.from && b.to)
            .sort((a, b) => {
                const aFrom = a.from instanceof Date ? a.from : a.from.toDate ? a.from.toDate() : new Date(a.from);
                const bFrom = b.from instanceof Date ? b.from : b.from.toDate ? b.from.toDate() : new Date(b.from);
                return aFrom - bFrom;
            });

        const totalExpected = activeBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        const totalCollected = activeBookings.reduce((sum, b) => {
            if (!b.isPaid) return sum;
            const amt = b.paymentDetails?.amount != null ? b.paymentDetails.amount : (b.totalPrice || 0);
            return sum + amt;
        }, 0);
        const totalOutstanding = activeBookings.reduce((sum, b) => b.isPaid ? sum : sum + (b.totalPrice || 0), 0);

        const rowsHtml = activeBookings.map(b => {
            const from = b.from instanceof Date ? b.from : b.from.toDate ? b.from.toDate() : new Date(b.from);
            const to = b.to instanceof Date ? b.to : b.to.toDate ? b.to.toDate() : new Date(b.to);
            const pd = b.paymentDetails || {};
            const received = b.isPaid ? (pd.amount != null ? pd.amount : (b.totalPrice || 0)) : null;
            const statusColor = b.isPaid ? '#059669' : '#dc2626';
            const statusLabel = b.isPaid ? 'RECEIVED' : 'OUTSTANDING';

            return `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 8px; font-size: 12px; color: #334155;">${b.shareholderName || ''}<br><span style="color: #94a3b8; font-size: 10px;">Cabin #${b.cabinNumber || '?'}</span></td>
                    <td style="padding: 8px; font-size: 12px; color: #334155;">${format(from, 'MMM d')} – ${format(to, 'MMM d, yyyy')}</td>
                    <td style="padding: 8px; font-size: 12px; color: #334155; text-align: right;">$${(b.totalPrice || 0).toLocaleString()}</td>
                    <td style="padding: 8px; font-size: 12px; text-align: center;"><span style="color: ${statusColor}; font-weight: 600;">${statusLabel}</span></td>
                    <td style="padding: 8px; font-size: 12px; color: #334155; text-align: right;">${received != null ? '$' + received.toLocaleString() : '—'}</td>
                    <td style="padding: 8px; font-size: 11px; color: #64748b; font-family: monospace;">${pd.reference || '—'}</td>
                    <td style="padding: 8px; font-size: 11px; color: #64748b; font-style: italic;">${pd.notes || ''}</td>
                </tr>
            `;
        }).join('');

        const summaryHtml = `
            <div style="margin-top: 40px; page-break-before: always;">
                <h2 style="color: #0f172a;">Booking Fee Summary</h2>
                <div style="display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap;">
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; flex: 1; min-width: 140px;">
                        <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Expected</div>
                        <div style="font-size: 18px; font-weight: 700; color: #0f172a;">$${totalExpected.toLocaleString()}</div>
                    </div>
                    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 16px; flex: 1; min-width: 140px;">
                        <div style="font-size: 10px; color: #059669; text-transform: uppercase; letter-spacing: 0.05em;">Collected</div>
                        <div style="font-size: 18px; font-weight: 700; color: #059669;">$${totalCollected.toLocaleString()}</div>
                    </div>
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; flex: 1; min-width: 140px;">
                        <div style="font-size: 10px; color: #dc2626; text-transform: uppercase; letter-spacing: 0.05em;">Outstanding</div>
                        <div style="font-size: 18px; font-weight: 700; color: #dc2626;">$${totalOutstanding.toLocaleString()}</div>
                    </div>
                </div>
                <table style="width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e2e8f0;">
                    <thead>
                        <tr style="background: #f1f5f9;">
                            <th style="padding: 8px; text-align: left; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Shareholder</th>
                            <th style="padding: 8px; text-align: left; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Dates</th>
                            <th style="padding: 8px; text-align: right; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Fee</th>
                            <th style="padding: 8px; text-align: center; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Status</th>
                            <th style="padding: 8px; text-align: right; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Collected</th>
                            <th style="padding: 8px; text-align: left; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Reference</th>
                            <th style="padding: 8px; text-align: left; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Notes</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml || '<tr><td colspan="7" style="padding: 20px; text-align: center; color: #94a3b8;">No bookings yet</td></tr>'}</tbody>
                </table>
            </div>
        `;

        const fullHtml = `
            <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto;">
                <h2 style="color: #0f172a; text-align: center;">2026 Season Calendar</h2>
                <p style="color: #64748b; text-align: center; margin-bottom: 30px;">Generated on ${format(new Date(), 'PPP')}</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    ${monthsHtml}
                </div>
                ${summaryHtml}
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
