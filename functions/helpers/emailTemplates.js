/**
 * Honeymoon Haven Resort - Email Templates
 * 
 * Ported to CommonJS for Cloud Functions
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
  padding-bottom: 10px;
  margin-bottom: 20px;
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
const wrapHtml = (title, bodyContent) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <div style="${BASE_STYLES}">
    <h1 style="${HEADER_STYLES}">HHR Trailer Booking</h1>
    ${bodyContent}
    <div style="${FOOTER_STYLES}">
      <p>Questions? Reply to this email or contact honeymoonhavenresort.lc@gmail.com</p>
      <p>Honeymoon Haven Resort - 2026 Season</p>
    </div>
  </div>
</body>
</html>
`;

const emailTemplates = {
  // 1. Turn Started
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
        <a href="https://hhr-trailer-booking.web.app/" style="${CTA_BUTTON_STYLES}">Start Booking Now</a>
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

  // 2. Daily Reminder (Generic logic for Morning/Evening)
  reminder: (data) => {
    const isMorning = data.type === 'morning';
    const subject = isMorning
      ? `Morning Reminder: Complete Your Honeymoon Haven Booking`
      : `Evening Reminder: Your Honeymoon Haven Booking Awaits`;

    let statusSection = '';
    if (data.has_draft) {
      statusSection = `
        <div style="background-color: #fff7ed; padding: 15px; border-radius: 6px; border-left: 4px solid #f97316;">
          <strong>Current Status: Selection saved</strong><br>
          Your dates (${data.check_in} - ${data.check_out}) are being held. Don't forget to finalize when you're ready!
        </div>
      `;
    } else {
      statusSection = `
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px;">
          <strong>Current Status: No booking yet</strong><br>
          You still have time to select your perfect dates for summer 2026.
        </div>
      `;
    }

    const body = `
      <p>Good ${isMorning ? 'morning' : 'evening'} ${data.name},</p>
      <p>${isMorning ? 'This is a friendly reminder that your booking window is still active.' : 'Just checking in on your booking window for Honeymoon Haven Resort.'}</p>

      <p><strong>Time Remaining: ${data.hours_remaining} hours</strong><br>
      (Deadline: ${data.deadline_date} at ${data.deadline_time})</p>

      ${statusSection}

      <div style="margin: 25px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${CTA_BUTTON_STYLES}">Go to Dashboard</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 4. Final Warning
  finalWarning: (data) => {
    const subject = `URGENT: 6 Hours Left to Complete Your Booking`;
    const body = `
      <p>Hi ${data.name},</p>
      <p style="color: #dc2626; font-weight: bold;">URGENT REMINDER</p>
      <p>Your 48-hour booking window expires in just 6 hours!</p>

      <p><strong>Deadline: ${data.deadline_date} at ${data.deadline_time}</strong></p>

      ${data.has_draft ? `
        <div style="margin: 15px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 6px;">
          <strong>You currently have a draft saved:</strong><br>
          • Dates: ${data.check_in} - ${data.check_out}<br>
          • Cabin: ${data.cabin_number}<br>
          • Total: $${data.total_price}<br>
          <br>
          <strong>Action needed: Finalize this booking to lock in your dates.</strong>
        </div>
      ` : `
        <p>You haven't selected any dates yet.</p>
      `}

      <p><strong>What happens if you don't act?</strong><br>
      If no action is taken by ${data.deadline_time}, your turn will automatically pass to the next shareholder (${data.next_shareholder}).</p>

      <div style="margin: 25px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${CTA_BUTTON_STYLES}">FINALIZE NOW</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 5. Booking Finalized
  bookingConfirmed: (data) => {
    const subject = `Booking Confirmed for Honeymoon Haven`;
    const body = `
      <p>Hi ${data.name},</p>
      <p>Congratulations! Your booking is confirmed!</p>

      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #166534;">BOOKING DETAILS</h3>
        <p style="margin-bottom: 0;">
          • Check-in: <strong>${data.check_in}</strong><br>
          • Check-out: <strong>${data.check_out}</strong><br>
          • Cabin: <strong>${data.cabin_number}</strong><br>
          • Guests: <strong>${data.guests}</strong><br>
          • Nights: <strong>${data.nights}</strong><br>
          • Total Maintenance Fee: <strong>$${data.total_price}</strong>
        </p>
      </div>

      <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;">
        <h3 style="margin-top: 0; color: #92400e;">PAYMENT REQUIRED</h3>
        <p>To lock in your cabin, please send an e-transfer within 48 hours:</p>
        <p>
          Email: <strong>honeymoonhavenresort.lc@gmail.com</strong><br>
          Amount: <strong>$${data.total_price}</strong><br>
          Message: "${data.name} - Cabin ${data.cabin_number} - ${data.check_in}"
        </p>
        <p style="font-size: 0.9em; color: #b45309;">Important: Your booking may be cancelled if payment is not received within 48 hours.</p>
      </div>

      <h3>CHECK-IN INFORMATION</h3>
      <ul>
        <li>Check-in time: 3:00 PM</li>
        <li>Check-out time: 11:00 AM</li>
        <li>Address: [Resort Address]</li>
      </ul>

      <div style="margin: 25px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${SECONDARY_STYLES}">View Booking</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 6. Turn Passed (Current Shareholder)
  turnPassedCurrent: (data) => {
    const subject = `Turn Passed - Thank You`;
    const body = `
      <p>Hi ${data.name},</p>
      <p>Thank you for passing your turn!</p>
      <p>Your turn has been successfully passed to the next shareholder in the rotation.</p>

      <h3>OPEN SEASON BOOKING</h3>
      <p>Don't worry - you can still book during our open season! Once all shareholders have had their turn, any remaining dates will be available on a first-come, first-served basis.</p>

      <div style="margin: 25px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${SECONDARY_STYLES}">View Dashboard</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 7. Turn Passed (Next Shareholder - It's Your Turn)
  turnPassedNext: (data) => {
    const subject = `It's Your Turn! Honeymoon Haven Booking Window Open`;
    const body = `
      <p>Hi ${data.name},</p>
      <p>Exciting news! It's now your turn to book at Honeymoon Haven Resort!</p>
      <p>The previous shareholder (${data.previous_shareholder}) has passed their turn, which means your 48-hour booking window has started early.</p>

      <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <strong>Your Deadline: ${data.deadline_date} at ${data.deadline_time}</strong>
      </div>

      <div style="margin: 25px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${CTA_BUTTON_STYLES}">Book Now</a>
        <a href="https://hhr-trailer-booking.web.app/" style="${SECONDARY_STYLES}">View Dashboard</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 8. Automatic Pass (Deadline Missed - Current)
  autoPassCurrent: (data) => {
    const subject = `Booking Window Expired - Turn Automatically Passed`;
    const body = `
      <p>Hi ${data.name},</p>
      <p>Your 48-hour booking window for Honeymoon Haven Resort has expired.</p>
      <p>Since no action was taken by the deadline (${data.deadline_date} at ${data.deadline_time}), your turn has automatically passed to the next shareholder (${data.next_shareholder}).</p>

      <p><strong>WHAT THIS MEANS</strong><br>
      • Your turn for this rotation is complete<br>
      • The next shareholder can now book their dates<br>
      • You can still book during open season (first-come, first-served)</p>

      <div style="margin: 25px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${SECONDARY_STYLES}">View Dashboard</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 9. Automatic Pass (Next Shareholder)
  autoPassNext: (data) => {
    const subject = `It's Your Turn! Honeymoon Haven Booking Window Open`;
    const body = `
      <p>Hi ${data.name},</p>
      <p>Good news! It's now your turn to book at Honeymoon Haven Resort!</p>
      <p>The previous shareholder's booking window has expired, which means your 48-hour window has started.</p>

      <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <strong>Your Deadline: ${data.deadline_date} at ${data.deadline_time}</strong>
      </div>

      <div style="margin: 25px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${CTA_BUTTON_STYLES}">Book Now</a>
        <a href="https://hhr-trailer-booking.web.app/" style="${SECONDARY_STYLES}">View Dashboard</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 10. Booking Cancelled (Current)
  bookingCancelled: (data) => {
    const subject = `Booking Cancelled - Confirmed`;
    const body = `
      <p>Hi ${data.name},</p>
      <p>Your booking for Honeymoon Haven Resort has been cancelled.</p>

      <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0; color: #991b1b;">
        <strong>CANCELLED BOOKING DETAILS</strong><br>
        • Dates: ${data.check_in} - ${data.check_out}<br>
        • Cabin: ${data.cabin_number}<br>
        • Cancelled on: ${data.cancelled_date}
      </div>

      ${data.within_turn_window ? `
        <p><strong>IMPORTANT:</strong> Since this cancellation occurred during your active booking window, your turn has been passed to the next shareholder (${data.next_shareholder}).</p>
      ` : `
        <p>Your dates have been released and are now available for other shareholders to book.</p>
      `}

      <div style="margin: 25px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${SECONDARY_STYLES}">View Dashboard</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 12. Payment Reminder
  paymentReminder: (data) => {
    const subject = `Payment Reminder: E-Transfer Due for Your Booking`;
    const body = `
      <p>Hi ${data.name},</p>
      <p>This is a friendly reminder that your e-transfer payment is due for your Honeymoon Haven booking.</p>

      <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;">
        <p><strong>Total Due: $${data.total_price}</strong></p>
        <p>Please send an e-transfer within the next 12 hours:</p>
        <ul>
          <li>Email: honeymoonhavenresort.lc@gmail.com</li>
          <li>Amount: $${data.total_price}</li>
          <li>Message: "${data.name} - Cabin ${data.cabin_number} - ${data.check_in}"</li>
        </ul>
        <p><strong>Payment Deadline: ${data.payment_deadline}</strong></p>
      </div>

      <div style="margin: 25px 0;">
        <a href="mailto:honeymoonhavenresort.lc@gmail.com" style="${CTA_BUTTON_STYLES}">Send E-Transfer Now</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 13. Payment Received
  paymentReceived: (data) => {
    const subject = `Payment Received - Thank You!`;
    const body = `
      <p>Hi ${data.name},</p>
      <p>Thank you! We have received your payment for your upcoming stay at Honeymoon Haven Resort.</p>

      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
        <h3 style="margin-top: 0; color: #166534;">PAYMENT CONFIRMED</h3>
        <p style="margin-bottom: 0;">
          • Amount Received: <strong>$${data.amount}</strong><br>
          • For Dates: <strong>${data.check_in} - ${data.check_out}</strong><br>
          • Cabin: <strong>${data.cabin_number}</strong>
        </p>
      </div>

      <p>Your booking is now fully secured. We look forward to seeing you at the lake!</p>

      <div style="margin: 25px 0;">
        <a href="https://hhr-trailer-booking.web.app/" style="${SECONDARY_STYLES}">View Booking</a>
      </div>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  },

  // 14. Guest Guide Email
  guestGuide: (data) => {
    const details = data.booking_details || {};
    const hasDetails = details.checkIn && details.checkOut;
    const cabinText = details.cabinNumber ? ` for <strong>Cabin #${details.cabinNumber}</strong>` : '';

    const subject = `Welcome to Honeymoon Haven Resort - Guest Guide`;
    const body = `
      <p>Hi there,</p>
      <p><strong>${data.shareholder_name}</strong> has shared the Honeymoon Haven Resort Guest Guide with you for your upcoming stay${cabinText}.</p>

      ${hasDetails ? `
      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
        <h3 style="margin-top: 0; color: #166534;">🗓️ YOUR STAY DETAILS</h3>
        <p style="margin-bottom: 0; color: #14532d;">
          • Check-in: <strong>${details.checkIn}</strong> (3:00 PM)<br>
          • Check-out: <strong>${details.checkOut}</strong> (11:00 AM)<br>
          • Cabin: <strong>#${details.cabinNumber}</strong>
        </p>
      </div>
      ` : ''}

      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <h3 style="margin-top: 0; color: #1e293b;">📍 LOCATION</h3>
        <p><strong>Honeymoon Haven Resort</strong><br>
        10257 South Shore Road<br>
        Honeymoon Bay, BC V0R 1Y0<br>
        Canada</p>
        <p><a href="https://www.google.com/maps/search/?api=1&query=Honeymoon+Haven+Resort+10257+South+Shore+Road+Honeymoon+Bay+BC+V0R+1Y0" style="color: #2563eb; text-decoration: none;">View on Google Maps</a></p>
      </div>

      <!-- RULES SECTION -->
      <div style="margin: 25px 0;">
        <h3 style="color: #1e3a8a; border-bottom: 2px solid #bfdbfe; padding-bottom: 5px;">📋 RESORT RULES</h3>
        
        <div style="margin-bottom: 15px;">
          <strong style="color: #475569;">🌊 Hot Tub & Safety</strong>
          <ul style="margin-top: 5px; color: #475569; padding-left: 20px;">
            <li>Age <strong>5+</strong> only. Supervise kids.</li>
            <li><strong style="color: #be123c;">No food or drink</strong> (water/alcohol ok).</li>
            <li>Always <strong>replace the lid</strong> after use.</li>
            <li>No lifeguards on duty at beach/dock.</li>
          </ul>
        </div>

        <div style="margin-bottom: 15px;">
          <strong style="color: #475569;">🗑️ Waste & Septic</strong>
          <ul style="margin-top: 5px; color: #475569; padding-left: 20px;">
            <li><strong>Septic Sensitive:</strong> 1-ply paper only.</li>
            <li><strong style="color: #be123c;">NO FLUSHABLE WIPES</strong> or products.</li>
            <li>Sort Garbage vs. Recycling bins.</li>
            <li>Returnables (cans/bottles) in small bins.</li>
          </ul>
        </div>

        <div style="margin-bottom: 15px;">
          <strong style="color: #475569;">🌲 Firewood & Outdoors</strong>
          <ul style="margin-top: 5px; color: #475569; padding-left: 20px;">
            <li>Split wood as you use it.</li>
            <li>Respect provincial fire bans.</li>
            <li>Do <strong>not</strong> use fences as drying racks.</li>
            <li>Clean up beach/fire pit areas after use.</li>
          </ul>
        </div>

        <div>
          <strong style="color: #475569;">🌙 Community</strong>
          <ul style="margin-top: 5px; color: #475569; padding-left: 20px;">
            <li><strong>Quiet Time:</strong> 11:00 PM — 8:00 AM.</li>
            <li>Speed Limit: <strong>10 km/h</strong> max.</li>
            <li>Park in assigned spots only.</li>
            <li>Be considerate of neighbors!</li>
          </ul>
        </div>
      </div>

      <!-- CHECK-IN SECTION -->
      <div style="margin: 25px 0;">
        <h3 style="color: #047857; border-bottom: 2px solid #a7f3d0; padding-bottom: 5px;">🔑 CHECK-IN CHECKLIST</h3>
        
        <div style="margin-bottom: 15px;">
          <strong style="color: #334155;">⚡ Power & Water Heater</strong>
          <p style="margin: 5px 0 0 0; color: #475569;">Turn on the water heater switch in the bathroom to <strong>ELECTRIC</strong>.<br>
          <span style="color: #be123c; font-weight: bold; font-size: 0.9em;">⚠️ Do not use the GAS switch.</span></p>
        </div>

        <div style="margin-bottom: 15px;">
          <strong style="color: #334155;">❄️ Refrigerator</strong>
          <p style="margin: 5px 0 0 0; color: #475569;">Check that the fridge is set to <strong>ELECTRIC</strong>.<br>
          <span style="color: #be123c; font-weight: bold; font-size: 0.9em;">⚠️ Do not use the GAS switch.</span></p>
        </div>

        <div style="margin-bottom: 15px;">
          <strong style="color: #334155;">💧 Water Tanks (Grey & Black)</strong>
          <ul style="margin-top: 5px; color: #475569; padding-left: 20px;">
            <li>Check levels on the monitor panel in the bathroom.</li>
            <li><strong>Every 48 Hours:</strong> Empty both tanks into the septic. Always drain <strong>Black (Sewer)</strong> first, followed by <strong>Grey (Sink/Bath)</strong>.</li>
            <li>Close drain lines when finished to prevent smells.</li>
            <li><em>Note: Grey water fills fast!</em></li>
          </ul>
        </div>

        <div style="margin-bottom: 15px;">
          <strong style="color: #334155;">🔥 Stove & Oven</strong>
          <p style="margin: 5px 0 0 0; color: #475569;">Both can be lit using the push-button igniter or a match.</p>
        </div>
      </div>

      <!-- CHECK-OUT SECTION -->
      <div style="margin: 25px 0;">
        <h3 style="color: #be123c; border-bottom: 2px solid #fecdd3; padding-bottom: 5px;">👋 CHECK-OUT CHECKLIST</h3>
        
        <div style="margin-bottom: 15px;">
          <strong style="color: #334155;">🔌 Systems Off</strong>
          <ul style="margin-top: 5px; color: #475569; padding-left: 20px;">
            <li>Turn <strong>OFF</strong> Water Heater switch (Electric).</li>
            <li>Ensure Furnace / Air Conditioning is <strong>OFF</strong>.</li>
            <li>Turn <strong>OFF</strong> all inside/outside lights.</li>
            <li>Retract awning.</li>
          </ul>
        </div>

        <div style="margin-bottom: 15px;">
          <strong style="color: #334155;">🚿 Final Tank Drain (Critical)</strong>
          <ol style="margin-top: 5px; color: #475569; padding-left: 20px;">
            <li>Drain Black Water (Sewer).</li>
            <li>Drain Grey Water (Sink/Bath).</li>
            <li>Close valves.</li>
            <li>Add septic cleaner to toilet and flush once.</li>
          </ol>
        </div>

        <div style="margin-bottom: 15px;">
          <strong style="color: #334155;">❄️ Refrigerator</strong>
          <ul style="margin-top: 5px; color: #475569; padding-left: 20px;">
            <li>Turn <strong>OFF</strong> (unless new renter arrives tomorrow).</li>
            <li>Clean and wipe out fridge & microwave.</li>
            <li><strong style="color: #be123c;">⚠️ Leave fridge doors OPEN</strong> if turned off to prevent mold.</li>
          </ul>
        </div>

        <div>
          <strong style="color: #334155;">🧹 Cleaning</strong>
          <ul style="margin-top: 5px; color: #475569; padding-left: 20px;">
            <li>Clean floors, carpets, sinks, toilet counters.</li>
            <li>Wipe down all surfaces.</li>
          </ul>
        </div>
      </div>

      <div style="margin: 20px 0; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        <h3 style="color: #334155;">🛍️ LOCAL ATTRACTIONS</h3>
        
        <p><strong>Honeymoon Bay Farmers Market</strong> (Saturdays)<br>
        10055 S Shore Rd<br>
        <a href="https://honeymoonbaymarket.com/" style="color: #2563eb;">Visit Website</a></p>

        <p><strong>Honeymoon Bay Food & General Store</strong><br>
        10056 S Shore Rd<br>
        <a href="https://honeymoonbaystore.ca/" style="color: #2563eb;">Visit Website</a> | <a href="https://www.facebook.com/HoneymoonBay.Store/" style="color: #2563eb;">Facebook</a></p>
      </div>

      <p>We hope you enjoy your stay!</p>
    `;
    return { subject, htmlContent: wrapHtml(subject, body) };
  }
};

module.exports = { emailTemplates };
