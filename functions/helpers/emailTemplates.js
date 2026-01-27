/**
 * Honeymoon Haven Resort - Email Templates
 * 
 * Ported to CommonJS for Cloud Functions
 *
 * [DEPLOYMENT BUMP] - Modern UI/UX Overhaul
 */

// --- DESIGN SYSTEM ---
const THEME = {
  colors: {
    primary: '#1e40af',    // Blue-800
    primaryLight: '#3b82f6', // Blue-500
    text: '#1f2937',       // Gray-800
    textLight: '#4b5563',  // Gray-600
    background: '#f9fafb', // Gray-50
    white: '#ffffff',
    border: '#e5e7eb',
    success: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' }, // Emerald
    warning: { bg: '#fffbeb', text: '#92400e', border: '#fcd34d' }, // Amber
    error: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' }, // Red
  },
  typography: {
    fontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
    h1: 'font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 20px 0; letter-spacing: -0.5px;',
    h2: 'font-size: 20px; font-weight: 600; color: #1f2937; margin: 24px 0 12px 0;',
    h3: 'font-size: 16px; font-weight: 600; color: #374151; margin: 16px 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;',
    body: 'font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 16px;',
    small: 'font-size: 14px; color: #6b7280;',
  },
  components: {
    button: `
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    `,
    secondaryButton: `
      display: inline-block;
      background-color: #f3f4f6;
      color: #4b5563;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      border: 1px solid #e5e7eb;
    `,
    card: `
      background-color: #ffffff;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    `,
    callout: (type = 'info') => {
      // Default to info (blueish)
      let bg = '#eff6ff'; let color = '#1e3a8a'; let border = '#bfdbfe';
      if (type === 'success') { bg = THEME.colors.success.bg; color = THEME.colors.success.text; border = THEME.colors.success.border; }
      if (type === 'warning') { bg = THEME.colors.warning.bg; color = THEME.colors.warning.text; border = THEME.colors.warning.border; }
      if (type === 'error') { bg = THEME.colors.error.bg; color = THEME.colors.error.text; border = THEME.colors.error.border; }

      return `
        background-color: ${bg};
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
        border: 1px solid ${border};
        color: ${color};
      `;
    }
  }
};

// --- HELPERS ---

// Helper to generate the Round/Phase Badge
const getRoundBadge = (phase) => {
  let roundText = 'Open Season';
  let bg = '#dbeafe'; // Default blue
  let text = '#1e40af';

  if (phase === 'ROUND_1' || phase === 1) {
    roundText = 'Round 1';
    bg = '#dbeafe'; text = '#1e40af';
  } else if (phase === 'ROUND_2' || phase === 2) {
    roundText = 'Round 2';
    bg = '#ede9fe'; text = '#5b21b6';
  } else {
    roundText = 'Open Season';
    bg = '#dcfce7'; text = '#166534';
  }

  return `
      <div style="margin-bottom: 24px; text-align: center;">
        <span style="display: inline-block; background-color: ${bg}; color: ${text}; padding: 6px 16px; border-radius: 9999px; font-weight: bold; font-size: 14px; letter-spacing: 0.5px;">
          📍 You're booking for: ${roundText}
        </span>
      </div>
    `;
};

// Helper to wrap content in a basic HTML shell
const wrapHtml = (title, bodyContent) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    /* Reset & Client Specific Fixes */
    body { margin: 0; padding: 0; background-color: ${THEME.colors.background}; -webkit-font-smoothing: antialiased; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    a { color: ${THEME.colors.primary}; text-decoration: underline; }
    a:hover { text-decoration: none; }
  </style>
</head>
<body style="font-family: ${THEME.typography.fontFamily}; background-color: ${THEME.colors.background}; color: ${THEME.colors.text}; margin: 0; padding: 40px 0;">
  
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid ${THEME.colors.border};">
          
          <!-- Header -->
          <div style="background-color: #ffffff; padding: 32px 40px 0 40px; text-align: left;">
             <h1 style="${THEME.typography.h1}">HHR Trailer Booking</h1>
             <div style="height: 4px; width: 60px; background: linear-gradient(to right, ${THEME.colors.primary}, ${THEME.colors.primaryLight}); border-radius: 2px;"></div>
          </div>

          <!-- Body Content -->
          <div style="padding: 32px 40px;">
            ${bodyContent}
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid ${THEME.colors.border}; text-align: center;">
            <p style="${THEME.typography.small} margin: 0;">Questions? Reply to this email or contact <a href="mailto:honeymoonhavenresort.lc@gmail.com" style="color: ${THEME.colors.textLight}; text-decoration: none; font-weight: 600;">honeymoonhavenresort.lc@gmail.com</a></p>
            <p style="${THEME.typography.small} margin: 8px 0 0 0; color: #9ca3af;">&copy; 2026 Honeymoon Haven Resort</p>
          </div>

        </div>
      </td>
    </tr>
  </table>

</body>
</html>
`;

// Format details list
const listStyle = `list-style-type: none; padding: 0; margin: 0;`;
const listItemStyle = `padding-left: 24px; position: relative; margin-bottom: 8px; color: ${THEME.colors.textLight};`;
const bulletStyle = `position: absolute; left: 0; color: ${THEME.colors.primary}; font-weight: bold;`;

const emailTemplates = {

  // 1. Turn Started
  turnStarted: (data) => {
    const isRound1 = data.round === 1 || data.phase === 'ROUND_1';
    const subject = isRound1
      ? `HHR Trailer Booking: It's YOUR Turn! 🎉`
      : `HHR Trailer Booking: Round 2 - It's Your Turn! 🎯`;

    // Round 1: Full Welcome Context
    const welcomeSection = isRound1 ? `
      <p style="${THEME.typography.body}"><strong>Welcome to the 2026 booking season!</strong> You're receiving this because it's officially <em>your turn</em> to pick your dates for the trailer.</p>

      <div style="${THEME.components.callout('info')}">
        <strong style="display: block; margin-bottom: 8px; color: #1e3a8a;">🆕 What's this all about?</strong>
        <p style="margin: 0; font-size: 15px;">We've built a brand new web app to make booking the HHR trailer for your guests easier and more organized. No more spreadsheets or email chains - everything's in one place!</p>
      </div>
    ` : `
      <p style="${THEME.typography.body}">It's officially <strong>your turn</strong> for Round 2! The snake draft order has reversed, and you can now make your second selection.</p>
    `;

    const body = `
      <p style="${THEME.typography.h2} margin-top: 0;">Hey ${data.name}! 👋</p>
      
      ${welcomeSection}

      ${getRoundBadge(data.phase)}

      <div style="${THEME.components.card}">
        <h3 style="${THEME.typography.h3} margin-top: 0;">⏳ Your Booking Window</h3>
        <p style="${THEME.typography.body} margin-bottom: 0;">You have until <strong>${data.deadline_date} at ${data.deadline_time}</strong> to make your selection.</p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.button}">Start Booking Now &rarr;</a>
      </div>

      ${isRound1 ? `
      <p style="${THEME.typography.small} margin-top: 24px; text-align: center;">
        <strong>Need help?</strong> Hit the Feedback button in the app to let us know. 💙
      </p>
      ` : ''}
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 2. Daily Reminder
  reminder: (data) => {
    const isMorning = data.type === 'morning';
    const subject = isMorning
      ? `HHR Trailer Booking: Morning Reminder - Complete Your Booking`
      : `HHR Trailer Booking: Evening Reminder - Your Booking Awaits`;

    let statusSection = '';
    if (data.has_draft) {
      statusSection = `
        <div style="${THEME.components.callout('warning')}">
          <strong style="display: block; margin-bottom: 8px;">🟠 Status: Draft Saved</strong>
          <p style="margin: 0;">Your dates (${data.check_in} - ${data.check_out}) are being held. Don't forget to finalize!</p>
        </div>
      `;
    } else {
      statusSection = `
        <div style="${THEME.components.callout('info')}">
          <strong style="display: block; margin-bottom: 8px;">🔵 Status: No booking yet</strong>
          <p style="margin: 0;">You still have time to select your perfect dates for summer 2026.</p>
        </div>
      `;
    }

    const body = `
      <p style="${THEME.typography.body}">Good ${isMorning ? 'morning' : 'evening'} ${data.name},</p>
      <p style="${THEME.typography.body}">${isMorning ? 'This is a friendly reminder that your booking window is still active.' : 'Just checking in on your booking window for Honeymoon Haven Resort.'}</p>

      ${getRoundBadge(data.phase)}

      <div style="${THEME.components.card} text-align: center;">
        <h3 style="${THEME.typography.h3} margin-top: 0; color: ${THEME.colors.textLight};">Time Remaining</h3>
        <p style="font-size: 32px; font-weight: 800; color: ${THEME.colors.primary}; margin: 8px 0;">${data.hours_remaining} hours</p>
        <p style="${THEME.typography.small}">Expires: ${data.deadline_date} at ${data.deadline_time}</p>
      </div>

      ${statusSection}

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.button}">Go to Dashboard &rarr;</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 4. Final Warning
  finalWarning: (data) => {
    const subject = `HHR Trailer Booking: URGENT - 2 Hours Left to Book`;
    const body = `
      <p style="${THEME.typography.h2} color: ${THEME.colors.error.text}; margin-top: 0;">Hi ${data.name},</p>
      <p style="${THEME.typography.body}"><strong>⚠️ URGENT:</strong> Your 48-hour booking window expires in just 2 hours!</p>

      ${getRoundBadge(data.phase)}

      <div style="${THEME.components.card} border-color: ${THEME.colors.error.border}; background-color: #fff1f2;">
         <h3 style="${THEME.typography.h3} margin-top: 0; color: ${THEME.colors.error.text};">Deadline</h3>
         <p style="${THEME.typography.body} font-size: 18px; font-weight: bold; margin: 0;">${data.deadline_date} at ${data.deadline_time}</p>
      </div>

      ${data.has_draft ? `
        <div style="${THEME.components.callout('info')}">
          <strong style="display: block; margin-bottom: 8px;">💾 You have a draft saved:</strong>
          <ul style="${listStyle}">
            <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> ${data.check_in} - ${data.check_out}</li>
            <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> Cabin #${data.cabin_number}</li>
            <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> Total: $${data.total_price}</li>
          </ul>
          <p style="margin-top: 12px; font-weight: 600;">Tap the button below to finalize instantly.</p>
        </div>
      ` : ''}

      <p style="${THEME.typography.small}">
        <strong>Note:</strong> If no action is taken by the deadline, your turn will automatically pass to the next shareholder (${data.next_shareholder}).
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.button} background-color: ${THEME.colors.error.text};">FINALIZE NOW &rarr;</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 5. Booking Finalized
  bookingConfirmed: (data) => {
    const subject = `HHR Trailer Booking: Woohoo! Your Booking is Confirmed! 🎊`;
    const body = `
      <p style="${THEME.typography.h2} margin-top: 0;">Woohoo, ${data.name}! 🎊</p>
      <p style="${THEME.typography.body}">Your trailer booking is <strong>LOCKED IN!</strong> Your guests are going to love it! 🏖️</p>

      <div style="${THEME.components.callout('success')}">
        <h3 style="${THEME.typography.h3} color: ${THEME.colors.success.text}; margin-top: 0;">Your Summer Plans 🌞</h3>
        <p style="font-size: 18px; margin: 8px 0; color: ${THEME.colors.text};">
          📅 <strong>${data.check_in} - ${data.check_out}</strong> (${data.nights} nights)
        </p>
        <p style="margin: 4px 0;">🏠 Cabin #${data.cabin_number}</p>
        <p style="margin: 4px 0;">👥 ${data.guests} guests</p>
        <p style="margin: 4px 0;">💰 <strong>$${data.total_price}</strong></p>
      </div>

      <div style="${THEME.components.callout('warning')}">
        <h3 style="${THEME.typography.h3} color: ${THEME.colors.warning.text}; margin-top: 0;">Next Step: Payment! 💳</h3>
        <p style="${THEME.typography.body}">Please send an <strong>e-transfer of $${data.total_price}</strong> to:</p>
        <p style="font-size: 18px; font-weight: bold; margin: 8px 0; word-break: break-all;">honeymoonhavenresort.lc@gmail.com</p>
        <p style="${THEME.typography.small} margin-top: 12px;">Message: "${data.name} - Cabin ${data.cabin_number} - ${data.check_in}"</p>
        <p style="${THEME.typography.small} color: ${THEME.colors.warning.text}; font-weight: bold; margin-top: 8px;">Due within 24 hours to secure your booking.</p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.button}">Go to Dashboard &rarr;</a>
      </div>

      <p style="${THEME.typography.body}">Can't wait to welcome your guests!</p>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 6. Turn Passed (Current Shareholder)
  turnPassedCurrent: (data) => {
    const subject = `HHR Trailer Booking: Turn Passed - Thank You`;
    const body = `
      <p style="${THEME.typography.h2} margin-top: 0;">Hi ${data.name},</p>
      <p style="${THEME.typography.body}">Thank you for passing your turn! Your slot has been successfully moved to the next shareholder.</p>

      <div style="${THEME.components.card}">
        <h3 style="${THEME.typography.h3} margin-top: 0;">OPEN SEASON BOOKING</h3>
        <p style="${THEME.typography.body}">Don't worry - you can still book during our open season! Once all shareholders have had their turn, any remaining dates will be available on a first-come, first-served basis.</p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.secondaryButton}">View Dashboard</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 7. Turn Passed (Next Shareholder - It's Your Turn)
  turnPassedNext: (data) => {
    const isRound1 = data.round === 1 || data.phase === 'ROUND_1';
    const subject = isRound1
      ? `HHR Trailer Booking: It's Your Turn! (Previous User Passed)`
      : `HHR Trailer Booking: Round 2 - It's Your Turn! (Previous User Passed)`;

    const welcomeSection = isRound1 ? `
      <div style="${THEME.components.callout('info')}">
        <strong style="display: block; margin-bottom: 8px;">🆕 New Booking App!</strong>
        <p style="margin: 0;">We've built a brand new web app to make booking easier. Login to pick your dates!</p>
      </div>
    ` : '';

    const body = `
      <p style="${THEME.typography.h2} margin-top: 0;">Hi ${data.name},</p>
      <p style="${THEME.typography.body}">Exciting news! It's now your turn to book at Honeymoon Haven Resort!</p>
      <p style="${THEME.typography.body}">The previous shareholder (${data.previous_shareholder}) has passed their turn, so your booking window has started early.</p>

      ${welcomeSection}

      ${getRoundBadge(data.phase)}

      <div style="${THEME.components.card}">
         <h3 style="${THEME.typography.h3} margin-top: 0; color: ${THEME.colors.textLight};">Your Deadline</h3>
         <p style="${THEME.typography.body} font-size: 18px; font-weight: bold; margin: 0; color: ${THEME.colors.primary};">${data.deadline_date} at ${data.deadline_time}</p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.button}">Book Now &rarr;</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 8. Automatic Pass (Deadline Missed - Current)
  autoPassCurrent: (data) => {
    const subject = `HHR Trailer Booking: Booking Window Expired`;
    const body = `
      <p style="${THEME.typography.h2} margin-top: 0;">Hi ${data.name},</p>
      <p style="${THEME.typography.body}">Your 48-hour booking window for Honeymoon Haven Resort has expired.</p>
      
      <div style="${THEME.components.callout('warning')}">
        <p style="margin: 0;">Since no action was taken by the deadline, your turn has automatically passed to the next shareholder (${data.next_shareholder}).</p>
      </div>

      <p style="${THEME.typography.h3}">What this means</p>
      <ul style="${listStyle}">
         <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> Your turn for this rotation is complete</li>
         <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> The next shareholder can now book their dates</li>
         <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> You can still book during <strong>open season</strong></li>
      </ul>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.secondaryButton}">View Dashboard</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 9. Automatic Pass (Next Shareholder)
  autoPassNext: (data) => {
    const isRound1 = data.round === 1 || data.phase === 'ROUND_1';
    const subject = isRound1
      ? `HHR Trailer Booking: It's Your Turn! (Previous User Timed Out)`
      : `HHR Trailer Booking: Round 2 - It's Your Turn!`;

    const welcomeSection = isRound1 ? `
      <div style="${THEME.components.callout('info')}">
        <strong style="display: block; margin-bottom: 8px;">🆕 New Web App</strong>
        <p style="margin: 0;">We've replaced the spreadsheets with a new app! Login to pick your dates.</p>
      </div>
    ` : '';

    const body = `
      <p style="${THEME.typography.h2} margin-top: 0;">Hi ${data.name},</p>
      <p style="${THEME.typography.body}">Good news! It's now your turn to book at Honeymoon Haven Resort!</p>
      <p style="${THEME.typography.body}">The previous shareholder's booking window has expired, which means your turn has started.</p>

      ${welcomeSection}

      ${getRoundBadge(data.phase)}

      <div style="${THEME.components.card}">
         <h3 style="${THEME.typography.h3} margin-top: 0; color: ${THEME.colors.textLight};">Your Deadline</h3>
         <p style="${THEME.typography.body} font-size: 18px; font-weight: bold; margin: 0; color: ${THEME.colors.primary};">${data.deadline_date} at ${data.deadline_time}</p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.button}">Book Now &rarr;</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 10. Booking Cancelled (Current)
  bookingCancelled: (data) => {
    const subject = `HHR Trailer Booking: Booking Cancelled - Confirmed`;
    const body = `
      <p style="${THEME.typography.h2} margin-top: 0;">Hi ${data.name},</p>
      <p style="${THEME.typography.body}">Your booking for Honeymoon Haven Resort has been cancelled.</p>

      <div style="${THEME.components.card} border-left: 4px solid ${THEME.colors.error.border};">
        <h3 style="${THEME.typography.h3} margin-top: 0; color: ${THEME.colors.error.text};">Cancelled Details</h3>
        <ul style="${listStyle}">
           <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> Dates: ${data.check_in} - ${data.check_out}</li>
           <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> Cabin: #${data.cabin_number}</li>
           <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> Cancelled on: ${data.cancelled_date}</li>
        </ul>
      </div>

      ${data.within_turn_window ? `
        <div style="${THEME.components.callout('warning')}">
          <strong>IMPORTANT:</strong> Since this cancellation occurred during your active booking window, your turn has been passed to the next shareholder (${data.next_shareholder}).
        </div>
      ` : `
        <p style="${THEME.typography.body}">Your dates have been released and are now available for other shareholders.</p>
      `}

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.secondaryButton}">View Dashboard</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 12. Payment Reminder
  paymentReminder: (data) => {
    const subject = `HHR Trailer Booking: Payment Reminder - E-Transfer Due`;
    const body = `
      <p style="${THEME.typography.h2} margin-top: 0;">Hi ${data.name},</p>
      <p style="${THEME.typography.body}">This is a friendly reminder that your e-transfer payment is due.</p>

      <div style="${THEME.components.callout('warning')}">
        <h3 style="${THEME.typography.h3} color: ${THEME.colors.warning.text}; margin-top: 0;">Total Due: $${data.total_price}</h3>
        <p style="margin-bottom: 8px;">Please send an e-transfer within the next 12 hours:</p>
        <ul style="${listStyle} margin-bottom: 16px;">
          <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> Email: <strong>honeymoonhavenresort.lc@gmail.com</strong></li>
          <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> Message: "${data.name} - Cabin ${data.cabin_number} - ${data.check_in}"</li>
        </ul>
        <p style="${THEME.typography.small}"><strong>Deadline: ${data.payment_deadline}</strong></p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="mailto:honeymoonhavenresort.lc@gmail.com" style="${THEME.components.button}">Send E-Transfer &rarr;</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 13. Payment Received
  paymentReceived: (data) => {
    const subject = `HHR Trailer Booking: Payment Received - Thank You!`;
    const body = `
      <p style="${THEME.typography.h2} margin-top: 0;">Hi ${data.name},</p>
      <p style="${THEME.typography.body}">Thank you! We have received your payment for your upcoming stay.</p>

      <div style="${THEME.components.callout('success')}">
        <h3 style="${THEME.typography.h3} color: ${THEME.colors.success.text}; margin-top: 0;">PAYMENT CONFIRMED</h3>
         <ul style="${listStyle}">
           <li style="${listItemStyle} margin-bottom: 4px;"><span style="${bulletStyle}">•</span> Amount: <strong>$${data.amount}</strong></li>
           <li style="${listItemStyle} margin-bottom: 4px;"><span style="${bulletStyle}">•</span> Dates: <strong>${data.check_in} - ${data.check_out}</strong></li>
           <li style="${listItemStyle} margin-bottom: 4px;"><span style="${bulletStyle}">•</span> Cabin: <strong>#${data.cabin_number}</strong></li>
        </ul>
      </div>

      <p style="${THEME.typography.body}">Your booking is now fully secured. We look forward to seeing you at the lake!</p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.secondaryButton}">View Booking</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 14. Guest Guide
  guestGuide: (data) => {
    const details = data.booking_details || {};
    const hasDetails = details.checkIn && details.checkOut;
    const cabinText = details.cabinNumber ? ` for <strong>Cabin #${details.cabinNumber}</strong>` : '';

    const subject = `HHR Trailer Booking: Welcome Guest Guide`;
    const body = `
      <p style="${THEME.typography.body}">Hi there,</p>
      <p style="${THEME.typography.body}"><strong>${data.shareholder_name}</strong> has shared the Honeymoon Haven Resort Guest Guide with you for your upcoming stay${cabinText}.</p>

      ${hasDetails ? `
      <div style="${THEME.components.callout('success')}">
        <h3 style="${THEME.typography.h3} color: ${THEME.colors.success.text}; margin-top: 0;">🗓️ YOUR STAY DETAILS</h3>
        <p style="margin: 0; color: ${THEME.colors.success.text};">
          Check-in: <strong>${details.checkIn}</strong> (3:00 PM)<br>
          Check-out: <strong>${details.checkOut}</strong> (11:00 AM)
        </p>
      </div>
      ` : ''}

      <div style="${THEME.components.card}">
        <h3 style="${THEME.typography.h3} margin-top: 0;">📍 LOCATION</h3>
        <p style="${THEME.typography.body} margin-bottom: 8px;"><strong>Honeymoon Haven Resort</strong><br>
        10257 South Shore Road, Honeymoon Bay, BC</p>
        <a href="https://www.google.com/maps/search/?api=1&query=Honeymoon+Haven+Resort+10257+South+Shore+Road+Honeymoon+Bay+BC+V0R+1Y0">View on Google Maps</a>
      </div>

      <h3 style="${THEME.typography.h2}">📋 Resort Rules</h3>
      
      <div style="margin-bottom: 24px;">
        <strong style="display: block; color: ${THEME.colors.text}; margin-bottom: 8px;">🌊 Hot Tub & Safety</strong>
        <ul style="${listStyle}">
           <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> Age <strong>5+</strong> only. Supervise kids.</li>
           <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> <strong style="color: ${THEME.colors.error.text};">No food or drink</strong> (water/alcohol ok).</li>
           <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> Always <strong>replace lid</strong> after use.</li>
        </ul>
      </div>

      <div style="margin-bottom: 24px;">
        <strong style="display: block; color: ${THEME.colors.text}; margin-bottom: 8px;">🗑️ Waste & Septic</strong>
        <ul style="${listStyle}">
           <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> <strong>Septic Sensitive:</strong> 1-ply paper only.</li>
           <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> <strong style="color: ${THEME.colors.error.text};">NO WIPES</strong> of any kind.</li>
           <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> Sort Garbage vs. Recycling.</li>
        </ul>
      </div>

      <div style="margin-bottom: 24px;">
        <strong style="display: block; color: ${THEME.colors.text}; margin-bottom: 8px;">🌙 Community</strong>
        <ul style="${listStyle}">
           <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> <strong>Quiet Time:</strong> 11:00 PM — 8:00 AM.</li>
           <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> Speed Limit: <strong>10 km/h</strong> max.</li>
           <li style="${listItemStyle}"><span style="${bulletStyle}">•</span> Be considerate of neighbors!</li>
        </ul>
      </div>

      <h3 style="${THEME.typography.h2} color: ${THEME.colors.success.text}; margin-top: 40px;">🔑 Check-In Checklist</h3>
      <div style="${THEME.components.card}">
         <div style="margin-bottom: 16px;">
            <strong>⚡ Power & Water Heater</strong>
            <p style="${THEME.typography.small} margin: 4px 0;">Turn heater switch to <strong>ELECTRIC</strong>. <span style="color: ${THEME.colors.error.text};">Do NOT use Gas.</span></p>
         </div>
         <div style="margin-bottom: 16px;">
            <strong>❄️ Refrigerator</strong>
            <p style="${THEME.typography.small} margin: 4px 0;">Set to <strong>ELECTRIC</strong> (Auto). <span style="color: ${THEME.colors.error.text};">Do NOT use Gas.</span></p>
         </div>
         <div>
            <strong>💧 Water Tanks</strong>
            <p style="${THEME.typography.small} margin: 4px 0;">Every 48 hours: Empty Black (Sewer), then Grey (Sink). Keep valves closed.</p>
         </div>
      </div>

      <h3 style="${THEME.typography.h2} color: ${THEME.colors.error.text}; margin-top: 40px;">👋 Check-Out Checklist</h3>
      <div style="${THEME.components.card} border-color: ${THEME.colors.error.border};">
         <div style="margin-bottom: 16px;">
            <strong>🔌 Systems Off</strong>
            <p style="${THEME.typography.small} margin: 4px 0;">Turn OFF Water Heater, Furnace/AC, and Lights. Retract awning.</p>
         </div>
         <div style="margin-bottom: 16px;">
            <strong>🚿 Final Tank Drain</strong>
            <p style="${THEME.typography.small} margin: 4px 0;">Drain Black, then Grey. Close valves. Add septic cleaner + 1 flush.</p>
         </div>
         <div style="margin-bottom: 16px;">
            <strong>❄️ Refrigerator</strong>
            <p style="${THEME.typography.small} margin: 4px 0;">Turn OFF. Clean out. <span style="color: ${THEME.colors.error.text}; font-weight: bold;">Leave doors OPEN to prevent mold.</span></p>
         </div>
         <div>
            <strong>🧹 Cleaning</strong>
            <p style="${THEME.typography.small} margin: 4px 0;">Wipe floors, sinks, counters, and toilet.</p>
         </div>
      </div>

      <p style="${THEME.typography.body} text-align: center; margin-top: 40px;">We hope you enjoy your stay!</p>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 15. Feedback
  feedback: (data) => {
    const isBug = data.type === 'bug';
    const typeColor = isBug ? THEME.colors.error : THEME.colors.warning;
    const title = isBug ? '🐛 Bug Report' : '💡 Feature Request';
    const subject = `[HHR Feedback] ${title} from ${data.name}`;

    const body = `
      <div style="${THEME.components.callout(isBug ? 'error' : 'warning')}">
        <h2 style="${THEME.typography.h2} margin-top: 0; color: ${typeColor.text};">${title}</h2>
        <p style="margin: 0; font-weight: bold;">From: ${data.name} (${data.email})</p>
      </div>

      <div style="${THEME.components.card}">
        <p style="${THEME.typography.body} white-space: pre-wrap;">${data.message}</p>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="mailto:${data.email}" style="${THEME.components.secondaryButton}">Reply to User</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  }
};

module.exports = { emailTemplates };
