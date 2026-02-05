/**
 * Honeymoon Haven Resort - Email Templates
 * 
 * Design System: Modern Minimalist (Apple-Inspired)
 * Tone: Friendly, Warm, Mobile-First
 */

// --- DESIGN SYSTEM (Apple Style) ---
const THEME = {
  colors: {
    bg: '#F5F5F7',         // Light Gray Background (Apple standard)
    card: '#FFFFFF',       // Pure White Card
    text: '#1d1d1f',       // Nearly Black (High Contrast)
    textLight: '#86868b',  // Secondary Text
    primary: '#0071e3',    // Apple Blue
    accent: '#0071e3',     // Accent (Same as primary for now)
    success: '#34c759',    // Green
    warning: '#ff9f0a',    // Orange
    error: '#ff3b30',      // Red
    border: '#d2d2d7',     // Light Border
  },
  typography: {
    fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
    h1: 'font-size: 24px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.01em; margin: 0 0 12px 0; line-height: 1.2;',
    h2: 'font-size: 20px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.005em; margin: 24px 0 12px 0; line-height: 1.3;',
    h3: 'font-size: 12px; font-weight: 600; color: #86868b; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 8px 0;',
    body: 'font-size: 16px; line-height: 1.5; color: #1d1d1f; margin: 0 0 16px 0;',
    small: 'font-size: 13px; line-height: 1.4; color: #86868b; margin: 0;',
    link: 'color: #0071e3; text-decoration: none;',
  },
  components: {
    // Main Wrapper
    wrapper: `
      width: 100%; 
      background-color: #F5F5F7; 
      padding: 40px 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    `,
    // Centered Content Container
    container: `
      max-width: 600px; 
      margin: 0 auto; 
      background-color: transparent;
    `,
    // White Content Card
    card: `
      background-color: #FFFFFF; 
      border-radius: 18px; 
      padding: 40px; 
      box-shadow: 0 4px 12px rgba(0,0,0,0.03); 
      margin-bottom: 24px;
      overflow: hidden;
    `,
    // Header (Logo/Title) - now simpler
    header: `
      text-align: center;
      padding-bottom: 30px;
    `,
    headerText: `
      font-size: 14px;
      font-weight: 600;
      color: #86868b;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    `,
    // Primary Button (Full width on mobile implied by simplicity, but here inline-block)
    button: `
      display: inline-block;
      background-color: #0071e3;
      color: #ffffff;
      padding: 14px 28px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 999px; /* Pill shape */
      text-align: center;
      margin-top: 10px;
      border: 1px solid #0071e3;
    `,
    // Secondary Button (Outline)
    secondaryButton: `
      display: inline-block;
      background-color: transparent;
      color: #0071e3;
      padding: 14px 28px;
      font-size: 16px;
      font-weight: 500;
      text-decoration: none;
      border-radius: 999px;
      text-align: center;
      margin-top: 10px;
    `,
    // Key/Value Row for Data
    dataRow: `
      padding: 12px 0;
      border-bottom: 1px solid #f5f5f7;
      display: block;
    `
  }
};

// --- HELPERS ---

const wrapHtml = (title, bodyContent) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: ${THEME.colors.bg}; -webkit-font-smoothing: antialiased;">
  <div style="${THEME.components.wrapper}">
    <div style="${THEME.components.container}">
      


      <!-- Main Card -->
      <div style="${THEME.components.card}">
        ${bodyContent}
      </div>

      <!-- Footer with Support Options -->
      <div style="text-align: center; padding: 32px 20px; border-top: 1px solid #e5e5ea; margin-top: 32px;">
        <p style="${THEME.typography.small} margin-bottom: 8px;">
          <strong>Have questions or feedback?</strong>
        </p>
        <p style="${THEME.typography.small}">
          You can <a href="mailto:bryan.m.hudson@gmail.com?subject=HHR%20App%20Question" style="${THEME.typography.link}">reply directly to this email</a> or submit feedback in the <a href="https://hhr-trailer-booking.web.app/" style="${THEME.typography.link}">Booking Portal</a>.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
`;

// Helper for Key/Value layout
const dataItem = (label, value, isLast = false) => `
  <div style="${THEME.components.dataRow} ${isLast ? 'border-bottom: none;' : ''}">
    <span style="font-size: 13px; color: ${THEME.colors.textLight}; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">${label}</span>
    <span style="font-size: 16px; font-weight: 500; color: ${THEME.colors.text}; display: block;">${value}</span>
  </div>
`;

// Helper for "Callouts" (Colored text blocks)
const callout = (text, type = 'info') => {
  let color = THEME.colors.textLight;
  if (type === 'error') color = THEME.colors.error;
  if (type === 'success') color = THEME.colors.success;
  return `<p style="${THEME.typography.body} color: ${color}; font-weight: 500;">${text}</p>`;
};

const emailTemplates = {

  // 1. Turn Started
  turnStarted: (data) => {
    const subject = `HHR Trailer Booking App: It's Your Turn! 🎯`;
    const body = `
      <h1 style="${THEME.typography.h1}">Welcome to the new HHR Trailer Booking App! 🚀</h1>
      <p style="${THEME.typography.body}">You're up, ${data.name}! We're ditching the spreadsheets and manual emails for something much better.</p>
      
      <div style="background-color: #E8F5FF; border: 1px solid #B6E0FE; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="${THEME.typography.body} margin: 0; color: #004085;"><strong>✨ What's New?</strong><br>
        We built the <strong>HHR Trailer Booking App</strong> to make booking effortless. View the live calendar, pick your dates instantly, and confirm your spot in seconds.</p>
      </div>

      <p style="${THEME.typography.body}">The draft is moving and the spotlight is on you. It's officially your turn to pick your dates for the 2026 season.</p>
      
      <div style="margin: 32px 0;">
        ${dataItem('Deadline', `${data.deadline_date} at ${data.deadline_time} PT`)}
        ${dataItem('Phase', data.round === 1 ? 'Round 1 (Standard Draft)' : 'Round 2 (Snake Draft)', true)}
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.button}">Book Your Dates</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 2. Daily Reminder
  reminder: (data) => {
    const subject = `HHR Trailer Booking App: The clock is ticking ⏳`;
    const body = `
      <h1 style="${THEME.typography.h1}">Don't snooze on summer, ${data.name}.</h1>
      <p style="${THEME.typography.body}">You have <strong>${data.hours_remaining} hours left</strong> to lock in your plans before the turn passes.</p>

      <div style="margin: 32px 0;">
         ${dataItem('Deadline', `${data.deadline_date} at ${data.deadline_time} PT`)}
         ${dataItem('Status', data.has_draft ? 'Draft Saved (Not Submitted)' : 'No Selection Yet', true)}
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.button}">Complete Booking</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 3. Final Warning
  finalWarning: (data) => {
    const subject = `HHR Trailer Booking App: Last Call! 🚨`;
    const body = `
      <p style="${THEME.typography.body} font-weight: 600;">Hi ${data.name},</p>
      <h1 style="${THEME.typography.h1} color: ${THEME.colors.error};">1 Hour Remaining</h1>
      <p style="${THEME.typography.body}">This is it. You have one hour left before your turn auto-skips to the next shareholder.</p>

      ${data.has_draft ? `
        <div style="background-color: #fff1f2; border-radius: 12px; padding: 16px; margin: 24px 0;">
          <p style="${THEME.typography.body} margin: 0; color: ${THEME.colors.error};"><strong>Draft Found:</strong> We see you have dates saved but not confirmed. Tap the button below to secure them instantly.</p>
        </div>
      ` : ''}

      <div style="text-align: center; margin-top: 32px;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.button}">Secure Your Spot</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 4. Booking Confirmed
  bookingConfirmed: (data) => {
    const subject = `HHR Trailer Booking App: You're Going to the Lake! 🌊`;

    // Breakdown HTML
    let breakdownHtml = '';
    if (data.price_breakdown) {
      const bd = data.price_breakdown;
      breakdownHtml = `
         <div style="background-color: #F5F5F7; border-radius: 8px; padding: 12px; margin-top: 8px; font-size: 13px; color: #1d1d1f;">
            ${bd.weeknights > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>${bd.weeknights} Weeknight${bd.weeknights !== 1 ? 's' : ''} x $100</span><span>$${bd.weeknightTotal}</span></div>` : ''}
            ${bd.weekends > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>${bd.weekends} Weekend${bd.weekends !== 1 ? 's' : ''} x $125</span><span>$${bd.weekendTotal}</span></div>` : ''}
            ${bd.discount > 0 ? `<div style="display: flex; justify-content: space-between; color: #34c759; font-weight: 600; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #d2d2d7;"><span>Weekly Discount</span><span>-$${bd.discount}</span></div>` : ''}
         </div>
       `;
    }

    const body = `
      <h1 style="${THEME.typography.h1}">You're all set! 🏔️</h1>
      <p style="${THEME.typography.body}">We've got you down for your dates. Here are your details:</p>

      <div style="margin: 32px 0;">
        ${dataItem('Check In', data.check_in)}
        ${dataItem('Check Out', data.check_out)}
        ${dataItem('Cabin', `Cabin #${data.cabin_number}`)}
        
        <div style="${THEME.components.dataRow} border-bottom: none;">
          <span style="font-size: 13px; color: ${THEME.colors.textLight}; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Maintenance Fee Breakdown</span>
          <span style="font-size: 16px; font-weight: 700; color: ${THEME.colors.text}; display: block;">$${data.total_price}</span>
          ${breakdownHtml}
        </div>
      </div>

      <div style="background-color: #FFF4E5; border: 1px solid #FFE0B2; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center;">
         <p style="${THEME.typography.body} margin: 0; color: #9A3412;">
           <strong>Action Required:</strong> Please complete your e-transfer within 48 hours to secure your booking.
         </p>
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="https://hhr-trailer-booking.web.app/dashboard" style="${THEME.components.button}">View Itinerary</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 5. Turn Passed - Current
  turnPassedCurrent: (data) => {
    const nextStepTitle = data.next_opportunity_title || 'Open Season';
    const nextStepText = data.next_opportunity_text || 'You can still book any remaining dates during <strong>Open Season</strong>.';

    // Dynamic Subject
    const isRound2 = nextStepTitle.toUpperCase().includes('ROUND 2');
    const subject = isRound2 ? `HHR Trailer Booking App: See you in Round 2 👋` : `HHR Trailer Booking App: See you in Open Season 👋`;

    const body = `
      <h1 style="${THEME.typography.h1}">Thanks for letting us know, ${data.name}.</h1>
      <p style="${THEME.typography.body}">We've successfully passed the baton to the next shareholder.</p>
      
      <div style="background-color: #FFFFFF; border: 1px solid #d2d2d7; border-radius: 12px; padding: 20px; margin: 24px 0;">
         <strong style="display: block; color: ${THEME.colors.primary}; margin-bottom: 8px;">👉 ${nextStepTitle}</strong>
         <p style="${THEME.typography.body} margin: 0; font-size: 14px;">${nextStepText}</p>
      </div>
      
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.button}">Sign In</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 6. Turn Passed - Next (Early Access / Bonus Time)
  turnPassedNext: (data) => {
    const subject = `HHR Trailer Booking App: Early Access Unlocked! 🎁`;
    const body = `
      <h1 style="${THEME.typography.h1}">Good news, ${data.name}!</h1>
      <p style="${THEME.typography.body}">The previous shareholder just passed their turn, which means you now have <strong>early access</strong> to start planning your dates.</p>

      <div style="background-color: #E8F5FF; border: 1px solid #B6E0FE; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="${THEME.typography.body} margin: 0; color: #004085;"><strong>🎁 Bonus Time!</strong><br>
        This is extra time to browse the calendar and plan - no pressure. Your official 48-hour window doesn't start until <strong>${data.deadline_date} at 10:00 AM PT</strong>.</p>
      </div>

      <div style="margin: 32px 0;">
        ${dataItem('Official Deadline', `${data.deadline_date} at ${data.deadline_time} PT`)}
        ${dataItem('Round', data.round, true)}
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.button}">Start Planning</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 7. Auto Pass - Current (Timeout)
  autoPassCurrent: (data) => {
    const subject = `HHR Trailer Booking App: Your Turn Has Ended ⌛`;
    const body = `
      <h1 style="${THEME.typography.h1}">We missed you, ${data.name}.</h1>
      <p style="${THEME.typography.body}">We didn't hear from you by the deadline, so we had to move the line along to keep fairness for everyone.</p>
      <p style="${THEME.typography.body}">Don't worry - you can still book during <strong>Open Season</strong>.</p>

      <div style="text-align: center; margin-top: 32px;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.button}">Check Status</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 8. Auto Pass - Next (Timeout from Prev) - NO BONUS TIME, clock starts now
  autoPassNext: (data) => {
    const subject = `HHR Trailer Booking App: It's Your Turn! 🎯`;
    const body = `
      <h1 style="${THEME.typography.h1}">You're up, ${data.name}!</h1>
      <p style="${THEME.typography.body}">The previous shareholder's window has expired, and it's now officially your turn to book.</p>

      <div style="background-color: #FFF4E5; border: 1px solid #FFE0B2; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="${THEME.typography.body} margin: 0; color: #9A3412;"><strong>⏰ Your 48-Hour Window Has Started</strong><br>
        The clock is ticking! Make sure to complete your booking or pass before the deadline.</p>
      </div>

      <div style="margin: 32px 0;">
        ${dataItem('Deadline', `${data.deadline_date} at ${data.deadline_time} PT`)}
        ${dataItem('Round', data.round, true)}
      </div>

      <div style="text-align: center; margin-top: 32px;">
         <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.button}">Book Now</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 9. Booking Cancelled
  bookingCancelled: (data) => {
    const subject = `HHR Trailer Booking App: Cancellation Confirmed`;
    const body = `
      <h1 style="${THEME.typography.h1}">Booking Cancelled.</h1>
      <p style="${THEME.typography.body}">Hi ${data.name}, we've released your dates back to the pool as requested.</p>

      <div style="margin: 32px 0;">
         ${dataItem('Cancelled Dates', `${data.check_in} - ${data.check_out}`)}
         ${dataItem('Refund Status', 'Processed (if applicable)', true)}
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.button}">Sign In</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 10. Payment Reminder
  paymentReminder: (data) => {
    const subject = `HHR Trailer Booking App: Let's make it official 💸`;

    // Breakdown HTML
    let breakdownHtml = '';
    // Note: data for paymentReminder might come from manual triggers which might not have priceBreakdown
    // But if we pass it, we should render it.
    if (data.price_breakdown) {
      const bd = data.price_breakdown;
      breakdownHtml = `
         <div style="background-color: #F5F5F7; border-radius: 8px; padding: 12px; margin-top: 8px; font-size: 13px; color: #1d1d1f;">
            ${bd.weeknights > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>${bd.weeknights} Weeknight${bd.weeknights !== 1 ? 's' : ''} x $100</span><span>$${bd.weeknightTotal}</span></div>` : ''}
            ${bd.weekends > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>${bd.weekends} Weekend${bd.weekends !== 1 ? 's' : ''} x $125</span><span>$${bd.weekendTotal}</span></div>` : ''}
            ${bd.discount > 0 ? `<div style="display: flex; justify-content: space-between; color: #34c759; font-weight: 600; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #d2d2d7;"><span>Weekly Discount</span><span>-$${bd.discount}</span></div>` : ''}
         </div>
       `;
    }

    const body = `
      <h1 style="${THEME.typography.h1}">Maintenance Fee Due</h1>
      <p style="${THEME.typography.body}">Hi ${data.name}, please complete your e-transfer to finalize the booking.</p>

      <div style="margin: 32px 0;">
        <div style="${THEME.components.dataRow}">
          <span style="font-size: 13px; color: ${THEME.colors.textLight}; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Maintenance Fee Breakdown</span>
          <span style="font-size: 16px; font-weight: 700; color: ${THEME.colors.text}; display: block;">$${data.total_price}</span>
          ${breakdownHtml}
        </div>
        ${dataItem('Message', `${data.name} - Cabin ${data.cabin_number}`, true)}
      </div>

      <div style="text-align: center; margin-top: 32px; background-color: #F5F5F7; padding: 24px; border-radius: 12px; border: 1px solid #e5e5ea;">
         <p style="${THEME.typography.body} margin: 0; font-weight: 600; color: ${THEME.colors.textLight}; font-size: 12px; text-transform: uppercase;">Send E-Transfer To</p>
         <p style="${THEME.typography.h2} color: ${THEME.colors.primary}; margin: 8px 0; font-size: 18px; word-break: break-all;">honeymoonhavenresort.lc@gmail.com</p>
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.button}">View Booking</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 11. Payment Received
  paymentReceived: (data) => {
    const subject = `HHR Trailer Booking App: Maintenance Fee Received! ✅`;
    const body = `
      <h1 style="${THEME.typography.h1}">Maintenance Fee Received.</h1>
      <p style="${THEME.typography.body}">Thanks, ${data.name}. You're all set for simpler times at the lake.</p>

      <div style="margin: 32px 0;">
        ${dataItem('Maintenance Fee Received', `$${data.amount}`)}
        ${dataItem('Dates', `${data.check_in || 'TBD'} - ${data.check_out || 'TBD'}`)}
        ${dataItem('Cabin', `Cabin #${data.cabin_number}`, true)}
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.button}">View Booking</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 12. Guest Guide
  guestGuide: (data) => {
    const details = data.booking_details || {};
    const subject = `HHR Trailer Booking App: Your Guide to Honeymoon Haven 🦌`;

    // Custom content logic for the guide (more text heavy)
    const customContent = `
      <h1 style="${THEME.typography.h1} margin-bottom: 8px;">Welcome, ${data.guest_name}!</h1>
        <p style="${THEME.typography.body}">${data.shareholder_name} wants to ensure you have the best stay possible.</p>

      ${details.checkIn ? `
      <div style="margin: 32px 0;">
        <h3 style="${THEME.typography.h3}">Your Stay</h3>
        ${dataItem('Check In', `${details.checkIn} (3:00 PM)`)}
        ${dataItem('Check Out', `${details.checkOut} (11:00 AM)`)}
        ${dataItem('Cabin', `Cabin #${details.cabinNumber}`, true)}
      </div>
      ` : ''
      }

      <div style="margin-top: 40px;">
        <h3 style="${THEME.typography.h3}">Essentials</h3>
        
        <div style="margin-bottom: 24px;">
          <strong style="display: block; margin-bottom: 4px;">Septic System 🚽</strong>
          <p style="${THEME.typography.small}">This is critical! Use 1-ply paper only. <strong>NO WIPES</strong> of any kind. This protects the ecosystem and our plumbing.</p>
        </div>

        <div style="margin-bottom: 24px;">
          <strong style="display: block; margin-bottom: 4px;">Hot Tub Safety 🌊</strong>
          <p style="${THEME.typography.small}">Ages 5+. No food or glass. Please always replace the lid after use.</p>
        </div>

        <div style="margin-bottom: 24px;">
          <strong style="display: block; margin-bottom: 4px;">Quiet Time 🌙</strong>
          <p style="${THEME.typography.small}">11:00 PM - 8:00 AM. Please be considerate of your neighbors.</p>
        </div>
      </div>

       <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f5f5f7;">
          <strong style="display: block; margin-bottom: 4px;">Address</strong>
          <p style="${THEME.typography.body}">10257 South Shore Road, Honeymoon Bay, BC</p>
          <a href="https://www.google.com/maps/search/?api=1&query=Honeymoon+Haven+Resort+10257+South+Shore+Road+Honeymoon+Bay+BC+V0R+1Y0" style="${THEME.components.button}">Open in Maps</a>
       </div>
    `;

    return { subject, htmlContent: wrapHtml(subject, customContent) };
  },

  // 14. Open Season Started (NEW)
  openSeasonStarted: (data) => {
    const subject = `HHR Trailer Booking App: Open Season is Here! 🌲`;
    const body = `
      <h1 style="${THEME.typography.h1}">The Draft is Complete.</h1>
      <p style="${THEME.typography.body}">All rounds are finished, and Open Season has officially begun.</p>
      
      <div style="background-color: #E8F5FF; border: 1px solid #B6E0FE; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="${THEME.typography.body} margin: 0; color: #004085;"><strong>🚀 First-Come, First-Served</strong><br>
        Remaining dates are now available to all shareholders. No more turns, no more waiting.</p>
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="https://hhr-trailer-booking.web.app/" style="${THEME.components.button}">Book Remaining Dates</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 13. Feedback
  feedback: (data) => {
    const isBug = data.type === 'bug';
    const title = isBug ? 'Bug Report' : 'Feature Request';
    const subject = `HHR Trailer Booking: New Feedback 📬 (${title})`;

    const body = `
      <h3 style="${THEME.typography.h3}">${title}</h3>
      <h1 style="${THEME.typography.h1} font-size: 20px;">From ${data.name}</h1>
      
      <div style="background-color: #F5F5F7; border-radius: 12px; padding: 20px; margin: 32px 0;">
        <p style="${THEME.typography.body} margin: 0; white-space: pre-wrap;">${data.message}</p>
      </div>

      <p style="${THEME.typography.small}">Reply to: <a href="mailto:${data.email}">${data.email}</a></p>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  }
};

module.exports = { emailTemplates };
