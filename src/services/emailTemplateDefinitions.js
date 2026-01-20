/**
 * Definitions for Email Templates
 * Used by Admin Dashboard to show available variables and by emailService to validate data.
 */

export const TEMPLATE_DEFINITIONS = [
    {
        id: "turnStarted",
        name: "Turn Started (Current User)",
        variables: ["name", "deadline_date", "deadline_time", "booking_url", "dashboard_url", "pass_turn_url", "current_phase_title", "current_phase_detail"],
        description: "Sent to the shareholder when their 48h window begins.",
        defaultSubject: "Your Honeymoon Haven Booking Turn Has Started",
        defaultBody: `
<p>Hi {{name}},</p>
<p>Great news! Your 48-hour booking window for <strong>{{current_phase_title}}</strong> has officially started.</p>

<div style="background-color: #f0fdf4; padding: 12px; border-radius: 6px; font-size: 0.9em; border-left: 4px solid #16a34a; margin-bottom: 20px;">
    <strong>{{current_phase_title}}</strong>: {{current_phase_detail}}
</div>

<div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
<strong>Deadline: {{deadline_date}} at {{deadline_time}}</strong>
</div>

<p>You have until the deadline above to:</p>
<ul>
    <li>Book your preferred dates for the 2026 season</li>
    <li>Save a draft and finalize later</li>
    <li>Pass your turn to the next shareholder</li>
</ul>

<p><strong>What happens if you don't take action?</strong><br>
If no action is taken by the deadline, your turn will automatically pass to the next shareholder in the rotation.</p>

<p>Ready to book your lakeside getaway?</p>

<div style="margin: 25px 0;">
<a href="{{booking_url}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0; font-weight: bold;">Book Now</a>
<a href="{{dashboard_url}}" style="display: inline-block; background-color: #f1f5f9; color: #475569; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0;">View Dashboard</a>
</div>

<p><small><a href="{{pass_turn_url}}">Pass Turn</a></small></p>
`
    },
    {
        id: "reminder",
        name: "Daily Reminder (Morning/Evening)",
        variables: ["name", "type", "hours_remaining", "deadline_date", "deadline_time", "has_draft", "check_in", "check_out", "booking_url", "dashboard_url", "current_phase_title", "current_phase_detail"],
        description: "Sent twice daily during the active window.",
        defaultSubject: "Morning Reminder: Complete Your Honeymoon Haven Booking",
        defaultBody: `
<p>Good morning {{name}},</p>
<p>This is a friendly reminder that your booking window for <strong>{{current_phase_title}}</strong> is still active.</p>

<p><strong>Time Remaining: {{hours_remaining}} hours</strong><br>
(Deadline: {{deadline_date}} at {{deadline_time}})</p>

<div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px;">
    <strong>Current Status: No booking yet</strong><br>
    You still have time to select your perfect dates for summer 2026.
</div>

<div style="margin: 25px 0;">
<a href="{{booking_url}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0; font-weight: bold;">Finalize Booking</a>
<a href="{{dashboard_url}}" style="display: inline-block; background-color: #f1f5f9; color: #475569; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0;">View Dashboard</a>
</div>
`
    },
    {
        id: "finalWarning",
        name: "Final Warning (6 Hours Left)",
        variables: ["name", "hours_remaining", "deadline_date", "deadline_time", "has_draft", "check_in", "check_out", "total_price", "cabin_number", "next_shareholder", "booking_url", "dashboard_url", "current_phase_title", "current_phase_detail"],
        description: "Urgent reminder sent 6 hours before deadline.",
        defaultSubject: "URGENT: 6 Hours Left to Complete Your Booking",
        defaultBody: `
<p>Hi {{name}},</p>
<p style="color: #dc2626; font-weight: bold;">URGENT REMINDER</p>
<p>This is your last chance to book for <strong>{{current_phase_title}}</strong>. Your 48-hour booking window expires in just 6 hours!</p>

<p><strong>Deadline: {{deadline_date}} at {{deadline_time}}</strong></p>

<p>You haven't selected any dates yet.</p>

<p><strong>What happens if you don't act?</strong><br>
If no action is taken by {{deadline_time}}, your turn will automatically pass to the next shareholder ({{next_shareholder}}).</p>

<div style="margin: 25px 0;">
<a href="{{booking_url}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0; font-weight: bold;">FINALIZE NOW</a>
</div>
`
    },
    {
        id: "bookingConfirmed",
        name: "Booking Confirmed",
        variables: ["name", "check_in", "check_out", "cabin_number", "guests", "nights", "total_price", "dashboard_url"],
        description: "Sent immediately after the user finalizes their booking.",
        defaultSubject: "Booking Confirmed for Honeymoon Haven",
        defaultBody: `
<p>Hi {{name}},</p>
<p>Congratulations! Your booking is confirmed!</p>

<div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
<h3 style="margin-top: 0; color: #166534;">BOOKING DETAILS</h3>
<p style="margin-bottom: 0;">
    • Check-in: <strong>{{check_in}}</strong><br>
    • Check-out: <strong>{{check_out}}</strong><br>
    • Cabin: <strong>{{cabin_number}}</strong><br>
    • Guests: <strong>{{guests}}</strong><br>
    • Nights: <strong>{{nights}}</strong><br>
    • Total Maintenance Fee: <strong>\${{total_price}}</strong>
</p>
</div>

<div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;">
<h3 style="margin-top: 0; color: #92400e;">PAYMENT REQUIRED</h3>
<p>To lock in your cabin, please send an e-transfer within 24 hours:</p>
<p>
    Email: <strong>honeymoonhavenresort.lc@gmail.com</strong><br>
    Amount: <strong>\${{total_price}}</strong><br>
    Message: "{{name}} - Cabin {{cabin_number}} - {{check_in}}"
</p>
<p style="font-size: 0.9em; color: #b45309;">Important: Your booking may be cancelled if payment is not received within 24 hours.</p>
</div>

<h3>CHECK-IN INFORMATION</h3>
<ul>
<li>Check-in time: 3:00 PM</li>
<li>Check-out time: 11:00 AM</li>
<li>Address: [Resort Address]</li>
</ul>

<div style="margin: 25px 0;">
<a href="mailto:honeymoonhavenresort.lc@gmail.com?subject=Payment for {{cabin_number}} - {{check_in}}&body=Sending e-transfer for \${{total_price}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0; font-weight: bold;">Send E-Transfer</a>
<a href="{{dashboard_url}}" style="display: inline-block; background-color: #f1f5f9; color: #475569; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0;">View Booking</a>
</div>
`
    },
    {
        id: "turnPassedCurrent",
        name: "Turn Passed (You Passed)",
        variables: ["name", "dashboard_url", "next_opportunity_title", "next_opportunity_text"],
        description: "Confirmation sent to the user who chose to pass.",
        defaultSubject: "Turn Passed - Thank You",
        defaultBody: `
<p>Hi {{name}},</p>
<p>Thank you for passing your turn!</p>
<p>Your turn has been successfully passed to the next shareholder in the rotation.</p>

<h3>{{next_opportunity_title}}</h3>
<p>{{next_opportunity_text}}</p>

<div style="margin: 25px 0;">
<a href="{{dashboard_url}}" style="display: inline-block; background-color: #f1f5f9; color: #475569; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0;">View Dashboard</a>
</div>
`
    },
    {
        id: "turnPassedNext",
        name: "Turn Passed (Next User Notified)",
        variables: ["name", "previous_shareholder", "deadline_date", "deadline_time", "booking_url", "dashboard_url", "current_phase_title", "current_phase_detail"],
        description: "Sent to the NEXT user when the previous user passes early.",
        defaultSubject: "It's Your Turn! Honeymoon Haven Booking Window Open",
        defaultBody: `
<p>Hi {{name}},</p>
<p>Exciting news! It's now your turn to book for <strong>{{current_phase_title}}</strong> at Honeymoon Haven Resort!</p>
<p>The previous shareholder ({{previous_shareholder}}) has passed their turn, which means your 48-hour booking window has started early.</p>

<div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
<strong>Your Deadline: {{deadline_date}} at {{deadline_time}}</strong><br>
<span style="font-size: 0.85em; color: #1e3a8a;">{{current_phase_detail}}</span>
</div>

<div style="margin: 25px 0;">
<a href="{{booking_url}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0; font-weight: bold;">Book Now</a>
<a href="{{dashboard_url}}" style="display: inline-block; background-color: #f1f5f9; color: #475569; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0;">View Dashboard</a>
</div>
`
    },
    {
        id: "autoPassCurrent",
        name: "Auto-Pass (Expired - You)",
        variables: ["name", "deadline_date", "deadline_time", "next_shareholder", "dashboard_url", "next_opportunity_title", "next_opportunity_text"],
        description: "Sent to the user who missed their deadline.",
        defaultSubject: "Booking Window Expired - Turn Automatically Passed",
        defaultBody: `
<p>Hi {{name}},</p>
<p>Your 48-hour booking window for Honeymoon Haven Resort has expired.</p>
<p>Since no action was taken by the deadline ({{deadline_date}} at {{deadline_time}}), your turn has automatically passed to the next shareholder ({{next_shareholder}}).</p>

<p><strong>WHAT THIS MEANS</strong><br>
• Your turn for this rotation is complete<br>
• The next shareholder can now book their dates<br>
• {{next_opportunity_text}}</p>

<div style="margin: 25px 0;">
<a href="{{dashboard_url}}" style="display: inline-block; background-color: #f1f5f9; color: #475569; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0;">View Dashboard</a>
</div>
`
    },
    {
        id: "autoPassNext",
        name: "Auto-Pass (Next User Notified)",
        variables: ["name", "deadline_date", "deadline_time", "booking_url", "dashboard_url", "current_phase_title", "current_phase_detail"],
        description: "Sent to the NEXT user when the previous user times out.",
        defaultSubject: "It's Your Turn! Honeymoon Haven Booking Window Open",
        defaultBody: `
<p>Hi {{name}},</p>
<p>Good news! It's now your turn to book for <strong>{{current_phase_title}}</strong> at Honeymoon Haven Resort!</p>
<p>The previous shareholder's booking window has expired, which means your 48-hour window has started.</p>

<div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
<strong>Your Deadline: {{deadline_date}} at {{deadline_time}}</strong><br>
<span style="font-size: 0.85em; color: #1e3a8a;">{{current_phase_detail}}</span>
</div>

<div style="margin: 25px 0;">
<a href="{{booking_url}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0; font-weight: bold;">Book Now</a>
<a href="{{dashboard_url}}" style="display: inline-block; background-color: #f1f5f9; color: #475569; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0;">View Dashboard</a>
</div>
`
    },
    {
        id: "bookingCancelled",
        name: "Booking Cancelled",
        variables: ["name", "check_in", "check_out", "cabin_number", "cancelled_date", "within_turn_window", "next_shareholder", "dashboard_url"],
        description: "Sent when a booking is cancelled.",
        defaultSubject: "Booking Cancelled - Confirmed",
        defaultBody: `
<p>Hi {{name}},</p>
<p>Your booking for Honeymoon Haven Resort has been cancelled.</p>

<div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0; color: #991b1b;">
<strong>CANCELLED BOOKING DETAILS</strong><br>
• Dates: {{check_in}} - {{check_out}}<br>
• Cabin: {{cabin_number}}<br>
• Cancelled on: {{cancelled_date}}
</div>

<p>Your dates have been released and are now available for other shareholders to book.</p>

<div style="margin: 25px 0;">
<a href="{{dashboard_url}}" style="display: inline-block; background-color: #f1f5f9; color: #475569; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0;">View Dashboard</a>
</div>
`
    },
    {
        id: "paymentReminder",
        name: "Payment Reminder",
        variables: ["name", "total_price", "cabin_number", "check_in", "payment_deadline", "dashboard_url"],
        description: "Sent manually or automatically to remind of payment.",
        defaultSubject: "Payment Reminder: E-Transfer Due for Your Booking",
        defaultBody: `
<p>Hi {{name}},</p>
<p>This is a friendly reminder that your e-transfer payment is due for your Honeymoon Haven booking.</p>

<div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;">
<p><strong>Total Due: \${{total_price}}</strong></p>
<p>Please send an e-transfer within the next 12 hours:</p>
<ul>
    <li>Email: honeymoonhavenresort.lc@gmail.com</li>
    <li>Amount: \${{total_price}}</li>
    <li>Message: "{{name}} - Cabin {{cabin_number}} - {{check_in}}"</li>
</ul>
<p><strong>Payment Deadline: {{payment_deadline}}</strong></p>
</div>

<div style="margin: 25px 0;">
<a href="mailto:honeymoonhavenresort.lc@gmail.com" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0; font-weight: bold;">Send E-Transfer Now</a>
</div>
`
    },
    {
        id: "paymentReceived",
        name: "Payment Received",
        variables: ["name", "amount", "check_in", "check_out", "cabin_number", "dashboard_url"],
        description: "Sent when admin marks a booking as paid.",
        defaultSubject: "Payment Received - Thank You!",
        defaultBody: `
<p>Hi {{name}},</p>
<p>Thank you! We have received your payment for your upcoming stay at Honeymoon Haven Resort.</p>

<div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
<h3 style="margin-top: 0; color: #166534;">PAYMENT CONFIRMED</h3>
<p style="margin-bottom: 0;">
    • Amount Received: <strong>\${{amount}}</strong><br>
    • For Dates: <strong>{{check_in}} - {{check_out}}</strong><br>
    • Cabin: <strong>{{cabin_number}}</strong>
</p>
</div>

<p>Your booking is now fully secured. We look forward to seeing you at the lake!</p>

<div style="margin: 25px 0;">
<a href="{{dashboard_url}}" style="display: inline-block; background-color: #f1f5f9; color: #475569; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px 10px 0;">View Booking</a>
</div>
`
    }
];
