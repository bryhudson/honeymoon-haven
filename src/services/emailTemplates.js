/**
 * Honeymoon Haven Resort - Email Templates
 * Fun, Friendly, Conversational Tone! 🎉
 */

const BASE_STYLES = `
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  line-height: 1.6;
  color: #333;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background-color: #ffffff;
`;

const HEADER_STYLES = `
  color: #1a365d;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 15px;
  margin-bottom: 25px;
  font-size: 24px;
  text-align: center;
  letter-spacing: -0.5px;
`;

const CTA_BUTTON_STYLES = `
  display: inline-block;
  background-color: #2563eb;
  color: #ffffff;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 6px;
  margin: 10px 5px 10px 0;
  font-weight: bold;
`;

const SECONDARY_STYLES = `
  display: inline-block;
  background-color: #f1f5f9;
  color: #475569;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 6px;
  margin: 10px 5px 10px 0;
`;

const FOOTER_STYLES = `
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
  font-size: 0.875rem;
  color: #64748b;
`;

// Helper to wrap content in a basic HTML shell
export const wrapHtml = (title, bodyContent) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <div style="${BASE_STYLES}">
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="${HEADER_STYLES}">🚐 Honeymoon Haven Resort</h1>
      <p style="margin-top: -15px; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Trailer Booking App</p>
    </div>
    ${bodyContent}
    <div style="${FOOTER_STYLES}">
      <p>Questions? Just reply to this email - we're here to help! 😊</p>
      <p>Honeymoon Haven Resort • 2026 Season</p>
      <p style="font-size: 11px; margin-top: 10px;">Login at <a href="https://hhr-trailer-booking.web.app" style="color: #64748b; text-decoration: underline;">hhr-trailer-booking.web.app</a></p>
    </div>
  </div>
</body>
</html>
`;

export const emailTemplates = {
  // 1. Turn Started 🎉
  turnStarted: (data) => {
    const subject = `HHR Trailer Booking: It's YOUR Turn! 🎉`;

    // Determine round display text
    const roundText = data.phase === 'ROUND_1' ? 'Round 1' :
      data.phase === 'ROUND_2' ? 'Round 2' :
        'Open Season';

    const body = `
      <p>Hey ${data.name}! 👋</p>
      
      <p><strong>Welcome to the 2026 booking season!</strong> You're receiving this because it's officially <em>your turn</em> to pick your dates for the trailer.</p>

      <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>🆕 What's this all about?</strong><br>
        <p style="margin: 10px 0 0 0;">We've built a brand new web app to make booking the HHR trailer for your guests easier and more organized. No more spreadsheets or email chains - everything's in one place! You can pick your dates, see what's available, and track your bookings all from your personal dashboard.</p>
      </div>

      <p><strong>📍 You're booking for:</strong> <span style="background-color: #dbeafe; padding: 4px 12px; border-radius: 4px; font-weight: bold;">${roundText}</span></p>

      <p><strong>Your booking window:</strong></p>
      <p style="margin: 10px 0;">You have until <strong>${data.deadline_date} at ${data.deadline_time}</strong> to make your selection. That's plenty of time, but don't forget!</p>

      <div style="margin: 25px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${CTA_BUTTON_STYLES}">Go to Dashboard</a>
      </div>

      <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <strong>🔐 Login Credentials:</strong><br>
        <p style="margin: 10px 0 0 0;">
          • <strong>Username:</strong> Your email (the one receiving this)<br>
          • <strong>Password:</strong> cabin# (all lowercase, e.g., "cabin7")
        </p>
      </div>

      <p><strong>Need help or have suggestions?</strong> We'd love to hear from you! Hit the <strong>Feedback</strong> button in the app anytime to share your thoughts, report issues, or suggest improvements. We're here to make this work for everyone. 💙</p>

      <p>Happy booking!</p>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 2. Daily Reminder ☕
  reminder: (data) => {
    const isMorning = data.type === 'morning';
    const subject = `HHR Trailer Booking: ${isMorning ? 'Morning Check-In ☕' : 'Evening Reminder 🌅'}`;

    const roundText = data.phase === 'ROUND_1' ? 'Round 1' :
      data.phase === 'ROUND_2' ? 'Round 2' :
        'Open Season';

    const body = `
      <p>${isMorning ? 'Morning' : 'Hey there'}, ${data.name}! ${isMorning ? '☕' : '🌅'}</p>
      <p>Quick check-in - you've got <strong>${data.hours_remaining} hours</strong> left to lock in your trailer dates for <strong>${roundText}</strong>!</p>

      <div style="background-color: #fffbeb; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>Deadline:</strong> ${data.deadline_date} at ${data.deadline_time}
      </div>

      ${data.has_draft ? `
        <p>✓ Selection saved: ${data.check_in} - ${data.check_out}<br>
        Ready to finalize? Hit the button below!</p>
      ` : `
        <p>Still deciding? No worries - there's time! 🤔</p>
      `}

      <div style="margin: 25px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${CTA_BUTTON_STYLES}">Go to Dashboard</a>
      </div>

      <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <strong>🔐 Login Credentials:</strong><br>
        <p style="margin: 10px 0 0 0;">
          • <strong>Username:</strong> Your email<br>
          • <strong>Password:</strong> cabin# (all lowercase, e.g., "cabin7")
        </p>
      </div>

      <p>Hope you're as excited as we are for summer 2026! 🏖️</p>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 3. Final Warning ⏰
  finalWarning: (data) => {
    const subject = `HHR Trailer Booking: Heads Up! ⏰ 6 Hours Left`;

    const roundText = data.phase === 'ROUND_1' ? 'Round 1' :
      data.phase === 'ROUND_2' ? 'Round 2' :
        'Open Season';

    const body = `
      <p>Hey ${data.name}! ⏰</p>
      <p>Just a heads up - your booking window for <strong>${roundText}</strong> closes in <strong>6 hours</strong> (today at ${data.deadline_time}).</p>

      ${data.has_draft ? `
        <div style="background-color: #fff7ed; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
          <strong>Your draft is waiting!</strong><br>
          ${data.check_in} - ${data.check_out} • Cabin ${data.cabin_number}<br>
          Just needs to be finalized to secure your dates! 🎯
        </div>
      ` : `
        <p>No booking selected yet - but now's the time to grab your perfect dates! 🌅</p>
      `}

      <p><strong>FYI:</strong> If you don't book or pass by the deadline, your turn automatically goes to ${data.next_shareholder}.</p>

      <div style="margin: 25px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${CTA_BUTTON_STYLES}">Go to Dashboard</a>
      </div>
      
      <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <strong>🔐 Login Credentials:</strong><br>
        <p style="margin: 10px 0 0 0;">
          • <strong>Username:</strong> Your email<br>
          • <strong>Password:</strong> cabin# (all lowercase, e.g., "cabin7")
        </p>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 4. Booking Confirmed 🎊
  bookingConfirmed: (data) => {
    const subject = `HHR Trailer Booking: Woohoo! Your Booking is Confirmed! 🎊`;
    const body = `
      <p>Woohoo, ${data.name}! 🎊</p>
      <p>Your trailer booking is <strong>LOCKED IN!</strong> Your guests are going to love it! 🎉</p>

      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #86efac;">
        <h3 style="margin-top: 0; color: #166534;">Your Summer Plans 🌞</h3>
        <p style="margin-bottom: 0; font-size: 16px;">
          📅 ${data.check_in} - ${data.check_out} (${data.nights} nights)<br>
          🏠 Cabin #${data.cabin_number}<br>
          👥 ${data.guests} guests<br>
          💰 $${data.total_price}
        </p>
      </div>

      <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #fbbf24;">
        <h3 style="margin-top: 0; color: #92400e;">Next Step: Payment! 💳</h3>
        <p>Send <strong>$${data.total_price}</strong> e-transfer to:<br>
        <strong>honeymoonhavenresort.lc@gmail.com</strong></p>
        <p>Message: "${data.name} - Cabin ${data.cabin_number} - ${data.check_in}"</p>
        <p style="font-size: 0.9em; color: #b45309;">Payment due within 24 hours to secure your booking!</p>
      </div>

      <div style="margin: 25px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${CTA_BUTTON_STYLES}">Go to Dashboard</a>
      </div>

      <p>Can't wait to welcome your guests! 🌞</p>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 5. Turn Passed (Current) 🙏
  turnPassedCurrent: (data) => {
    const subject = `Thanks for Letting Us Know! 🙏`;
    const body = `
      <p>Thanks for letting us know, ${data.name}! 🙏</p>
      <p>Your turn has been passed to the next shareholder - they're up now!</p>

      <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>${data.next_opportunity_title || "What's Next?"}</strong><br>
        <p style="margin: 10px 0 0 0;">${data.next_opportunity_text || "No worries about missing out - you'll get another shot in Round 2 (snake draft style 🐍) and/or during open season!"}</p>
      </div>

      <div style="margin: 25px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${CTA_BUTTON_STYLES}">Go to Dashboard</a>
      </div>

      <p>Enjoy your summer! 🌞</p>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 6. Turn Passed (Next) 🎯
  turnPassedNext: (data) => {
    const subject = `Surprise! You're Up Early! 🎯`;
    const body = `
      <p>Surprise, ${data.name}! 🎯</p>
      <p>${data.previous_shareholder} passed their turn, so you're up <strong>sooner than expected!</strong></p>

      <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>Your turn starts: NOW!</strong><br>
        Deadline: ${data.deadline_date} at ${data.deadline_time}
      </div>

      <p>Time to grab your perfect dates! 🌞</p>

      <div style="margin: 25px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${CTA_BUTTON_STYLES}">Go to Dashboard</a>
      </div>

      <p style="font-size: 0.9em; color: #64748b;">Lucky you! 😊</p>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 7. Auto-Pass (Current) ⏱️
  autoPassCurrent: (data) => {
    const subject = `Booking Window Closed ⏱️`;
    const body = `
      <p>Hey ${data.name},</p>
      <p>Your booking window wrapped up on ${data.deadline_date} at ${data.deadline_time}.</p>

      <p>Since we didn't hear from you, your turn passed to ${data.next_shareholder} (they're booking now!).</p>

      <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>What's next for you?</strong><br>
        <p style="margin: 10px 0 0 0;">${data.next_opportunity_text || "Round 2 is coming up (you'll pick in reverse order 🔄) OR grab dates during open season!"}</p>
      </div>

      <div style="margin: 25px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${CTA_BUTTON_STYLES}">Go to Dashboard</a>
      </div>

      <p>Life gets busy - we get it! 💙</p>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 8. Auto-Pass (Next) 🎯
  autoPassNext: (data) => {
    const subject = `You're Up! 🎯`;
    const body = `
      <p>Hey ${data.name}! 🎯</p>
      <p>Good news - it's <strong>your turn</strong> to book!</p>

      <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>Your Deadline:</strong> ${data.deadline_date} at ${data.deadline_time}
      </div>

      <p>Time to pick your perfect dates! 🌞</p>

      <div style="margin: 25px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${CTA_BUTTON_STYLES}">Go to Dashboard</a>
        <a href="https://hhr-trailer-booking.web.app/" style="${CTA_BUTTON_STYLES}">Go to Dashboard</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 9. Booking Cancelled ✅
  bookingCancelled: (data) => {
    const subject = `Booking Cancelled - All Set ✅`;
    const body = `
      <p>Hey ${data.name},</p>
      <p>Your booking has been cancelled as requested.</p>

      <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>Cancelled Booking:</strong><br>
        ${data.check_in} - ${data.check_out} • Cabin ${data.cabin_number}
      </div>

      ${data.within_turn_window ? `
        <p>Since this was during your active turn, ${data.next_shareholder} is now up to book.</p>
      ` : `
        <p>These dates are now available for other shareholders to book.</p>
      `}

      <div style="margin: 25px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${CTA_BUTTON_STYLES}">Go to Dashboard</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 10. Payment Reminder 💰
  paymentReminder: (data) => {
    const subject = `Quick Reminder: Payment Due 💰`;
    const body = `
      <p>Hey ${data.name}! 💰</p>
      <p>Quick reminder - we're still waiting on your payment for those sweet summer dates!</p>

      <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #fbbf24;">
        <strong>Amount Due:</strong> $${data.total_price}<br>
        <strong>Send to:</strong> honeymoonhavenresort.lc@gmail.com<br>
        <strong>Message:</strong> "${data.name} - Cabin ${data.cabin_number} - ${data.check_in}"
      </div>

      <div style="margin: 25px 0;">
        <a href="mailto:honeymoonhavenresort.lc@gmail.com" style="${CTA_BUTTON_STYLES}">Send E-Transfer</a>
      </div>

      <p>Need more time or have questions? Just reply - happy to help! 😊</p>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 11. Payment Received 🎉
  paymentReceived: (data) => {
    const subject = `YES! Payment Received! 🎉`;
    const body = `
      <p>YES! Payment received, ${data.name}! 🎉</p>
      <p>Your <strong>$${data.amount}</strong> came through - you're all set for ${data.check_in} to ${data.check_out}!</p>

      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #86efac;">
        <p style="margin: 0; font-size: 16px;">
          ✅ Fully confirmed<br>
          📅 ${data.check_in} - ${data.check_out}<br>
          🏠 Cabin #${data.cabin_number}
        </p>
      </div>

      <p>Everything's locked in. Now the hard part... waiting until summer! 😅</p>

      <div style="margin: 25px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${CTA_BUTTON_STYLES}">Go to Dashboard</a>
      </div>

      <p>Hope to welcome your guests soon! 🌞</p>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  }
};
