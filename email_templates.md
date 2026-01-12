# Email Templates - Honeymoon Haven Resort

Complete email templates for EmailJS implementation with subject, body, and CTAs.

---

## 1. Turn Started Notification

**Subject:** 🏡 Your Honeymoon Haven Booking Turn Has Started!

**Body:**
```
Hi {{name}},

Great news! Your 48-hour booking window for Honeymoon Haven Resort has officially started.

⏰ Deadline: {{deadline_date}} at {{deadline_time}}

You have until the deadline above to:
• Book your preferred dates for the 2026 season
• Save a draft and finalize later
• Pass your turn to the next shareholder

What happens if you don't take action?
If no action is taken by the deadline, your turn will automatically pass to the next shareholder in the rotation.

Ready to book your lakeside getaway?

[Book Now] [View Dashboard] [Pass Turn]

Questions? Reply to this email or contact us at honeymoonhavenresort.lc@gmail.com

Best regards,
The Honeymoon Haven Team

---
Season: March 1st - October 31st, 2026
Your Cabin: {{cabin_number}}
```

**CTAs:**
- Primary: "Book Now" → Direct link to booking modal
- Secondary: "View Dashboard" → Link to dashboard
- Tertiary: "Pass Turn" → Link to pass turn action

---

## 2. Daily Reminder - Morning (9 AM)

**Subject:** ☀️ Morning Reminder: Complete Your Honeymoon Haven Booking

**Body:**
```
Good morning {{name}},

This is a friendly reminder that your booking window is still active.

⏰ Time Remaining: {{hours_remaining}} hours (Deadline: {{deadline_date}} at {{deadline_time}})

{{#if has_draft}}
📝 Current Status: Draft saved
Your dates ({{check_in}} - {{check_out}}) are being held. Don't forget to finalize when you're ready!
{{else}}
📝 Current Status: No booking yet
You still have time to select your perfect dates for summer 2026.
{{/if}}

{{#if urgency_high}}
⚠️ URGENT: Less than 12 hours remaining!
Please finalize your booking, pass your turn, or cancel before the deadline.
{{else if urgency_medium}}
⏳ Don't forget to finalize your booking today to secure your dates.
{{else}}
😊 You still have plenty of time to decide!
{{/if}}

[Finalize Booking] [Edit Draft] [Pass Turn] [Cancel]

Best regards,
The Honeymoon Haven Team

---
Questions? Reply to this email anytime.
```

**CTAs:**
- Primary: "Finalize Booking" → Direct link to finalize
- Secondary: "Edit Draft" → Link to booking modal
- Tertiary: "Pass Turn" | "Cancel" → Action links

---

## 3. Daily Reminder - Evening (7 PM)

**Subject:** 🌙 Evening Reminder: Your Honeymoon Haven Booking Awaits

**Body:**
```
Good evening {{name}},

Just checking in on your booking window for Honeymoon Haven Resort.

⏰ Time Remaining: {{hours_remaining}} hours (Deadline: {{deadline_date}} at {{deadline_time}})

{{#if has_draft}}
📝 You have a draft saved:
• Dates: {{check_in}} - {{check_out}}
• Cabin: {{cabin_number}}
• Guests: {{guests}}
{{else}}
📝 No booking yet - the calendar is waiting for you!
{{/if}}

{{#if urgency_critical}}
🚨 FINAL HOURS: Action required tonight!
Your window expires soon. Please finalize, pass, or cancel before {{deadline_time}}.
{{else if urgency_medium}}
⏳ Consider finalizing before tomorrow morning to lock in your dates.
{{else}}
😌 Relax and take your time to decide. You're doing great!
{{/if}}

[Finalize Booking] [Edit Draft] [Pass Turn] [Cancel]

Sleep well and see you at the lake!

Best regards,
The Honeymoon Haven Team
```

**CTAs:**
- Primary: "Finalize Booking" → Direct link to finalize
- Secondary: "Edit Draft" → Link to booking modal
- Tertiary: "Pass Turn" | "Cancel" → Action links

---

## 4. Final Warning - 6 Hours Remaining

**Subject:** ⏰ URGENT: 6 Hours Left to Complete Your Booking

**Body:**
```
Hi {{name}},

⚠️ URGENT REMINDER ⚠️

Your 48-hour booking window expires in just 6 hours!

⏰ Deadline: {{deadline_date}} at {{deadline_time}}

{{#if has_draft}}
You currently have a draft saved:
• Dates: {{check_in}} - {{check_out}}
• Cabin: {{cabin_number}}
• Total: ${{total_price}}

Action needed: Finalize this booking to lock in your dates.
{{else}}
You haven't selected any dates yet.
{{/if}}

⚠️ What happens if you don't act?
If no action is taken by {{deadline_time}}, your turn will automatically pass to the next shareholder ({{next_shareholder}}).

Please take action now:

[FINALIZE NOW] [Pass Turn] [Cancel Booking]

Need help? Reply to this email immediately.

Best regards,
The Honeymoon Haven Team

---
This is an automated reminder. You're receiving this because your booking window is expiring soon.
```

**CTAs:**
- Primary: "FINALIZE NOW" → Direct link to finalize (prominent)
- Secondary: "Pass Turn" → Link to pass action
- Tertiary: "Cancel Booking" → Link to cancel

---

## 5. Booking Finalized Confirmation

**Subject:** ✅ Booking Confirmed! See You at Honeymoon Haven

**Body:**
```
Hi {{name}},

🎉 Congratulations! Your booking is confirmed!

📅 BOOKING DETAILS
• Check-in: {{check_in}}
• Check-out: {{check_out}}
• Cabin: {{cabin_number}}
• Guests: {{guests}}
• Nights: {{nights}}
• Total Maintenance Fee: ${{total_price}}

💰 PAYMENT REQUIRED
To lock in your cabin, please send an e-transfer within 24 hours:

📧 Email: honeymoonhavenresort.lc@gmail.com
💵 Amount: ${{total_price}}
📝 Message: "{{name}} - Cabin {{cabin_number}} - {{check_in}}"

⚠️ Important: Your booking may be cancelled if payment is not received within 24 hours.

🏡 CHECK-IN INFORMATION
• Check-in time: 3:00 PM
• Check-out time: 11:00 AM
• Address: [Resort Address]
• Parking: Available on-site

📋 WHAT TO BRING
• Linens and towels
• Food and beverages
• Lake gear (kayaks, paddleboards welcome!)
• Firewood for evening bonfires

[View Booking] [Send E-Transfer] [Contact Us]

We can't wait to see you at the lake!

Best regards,
The Honeymoon Haven Team

---
Questions? Reply to this email or call [phone number]
```

**CTAs:**
- Primary: "Send E-Transfer" → Opens email client with pre-filled details
- Secondary: "View Booking" → Link to dashboard
- Tertiary: "Contact Us" → Reply to email

---

## 6. Turn Passed Notification (Current Shareholder)

**Subject:** Turn Passed - Thank You

**Body:**
```
Hi {{name}},

Thank you for passing your turn for Honeymoon Haven Resort.

Your turn has been successfully passed to the next shareholder in the rotation.

📅 OPEN SEASON BOOKING
Don't worry - you can still book during our open season! Once all shareholders have had their turn, any remaining dates will be available on a first-come, first-served basis.

Open Season typically begins: [Date]

We'll notify you when open season booking begins.

[View Available Dates] [View Dashboard]

Looking forward to seeing you at the lake this season!

Best regards,
The Honeymoon Haven Team

---
Next rotation: Your turn will come around again next year.
```

**CTAs:**
- Primary: "View Available Dates" → Link to public schedule
- Secondary: "View Dashboard" → Link to dashboard

---

## 7. Turn Passed Notification (Next Shareholder)

**Subject:** 🎉 It's Your Turn! Honeymoon Haven Booking Window Open

**Body:**
```
Hi {{name}},

Exciting news! It's now your turn to book at Honeymoon Haven Resort!

The previous shareholder ({{previous_shareholder}}) has passed their turn, which means your 48-hour booking window has started early.

⏰ Your Deadline: {{deadline_date}} at {{deadline_time}}

🏡 WHAT YOU CAN DO
• Book your preferred dates for the 2026 season (March 1 - October 31)
• Save a draft and finalize later
• Pass your turn to the next shareholder

📋 BOOKING DETAILS
• Your Cabin: {{cabin_number}}
• Maximum stay: 7 nights
• Rate: $125/night maintenance fee

Ready to plan your lakeside escape?

[Book Now] [View Dashboard] [Pass Turn]

Questions? Reply to this email anytime.

Best regards,
The Honeymoon Haven Team

---
Season: March 1st - October 31st, 2026
```

**CTAs:**
- Primary: "Book Now" → Direct link to booking modal
- Secondary: "View Dashboard" → Link to dashboard
- Tertiary: "Pass Turn" → Link to pass action

---

## 8. Automatic Pass - Deadline Missed (Current)

**Subject:** ⏱️ Booking Window Expired - Turn Automatically Passed

**Body:**
```
Hi {{name}},

Your 48-hour booking window for Honeymoon Haven Resort has expired.

Since no action was taken by the deadline ({{deadline_date}} at {{deadline_time}}), your turn has automatically passed to the next shareholder ({{next_shareholder}}).

📅 WHAT THIS MEANS
• Your turn for this rotation is complete
• The next shareholder can now book their dates
• You can still book during open season (first-come, first-served)

📅 OPEN SEASON BOOKING
Once all shareholders have had their turn, any remaining dates will be available for booking. We'll send you a notification when open season begins.

💡 TIP FOR NEXT TIME
Set a calendar reminder when your turn starts to ensure you don't miss your window!

[View Available Dates] [View Dashboard]

We hope to see you at the lake this season!

Best regards,
The Honeymoon Haven Team

---
No action needed. This is just a notification.
```

**CTAs:**
- Primary: "View Available Dates" → Link to public schedule
- Secondary: "View Dashboard" → Link to dashboard

---

## 9. Automatic Pass - Deadline Missed (Next)

**Subject:** 🎉 It's Your Turn! Honeymoon Haven Booking Window Open

**Body:**
```
Hi {{name}},

Good news! It's now your turn to book at Honeymoon Haven Resort!

The previous shareholder's booking window has expired, which means your 48-hour window has started.

⏰ Your Deadline: {{deadline_date}} at {{deadline_time}}

🏡 WHAT YOU CAN DO
• Book your preferred dates for the 2026 season (March 1 - October 31)
• Save a draft and finalize later
• Pass your turn to the next shareholder

📋 BOOKING DETAILS
• Your Cabin: {{cabin_number}}
• Maximum stay: 7 nights
• Rate: $125/night maintenance fee

Don't miss your chance to secure your perfect summer dates!

[Book Now] [View Dashboard] [Pass Turn]

Questions? Reply to this email anytime.

Best regards,
The Honeymoon Haven Team

---
Season: March 1st - October 31st, 2026
```

**CTAs:**
- Primary: "Book Now" → Direct link to booking modal
- Secondary: "View Dashboard" → Link to dashboard
- Tertiary: "Pass Turn" → Link to pass action

---

## 10. Booking Cancelled Notification (Current)

**Subject:** Booking Cancelled - Confirmed

**Body:**
```
Hi {{name}},

Your booking for Honeymoon Haven Resort has been cancelled.

📅 CANCELLED BOOKING DETAILS
• Dates: {{check_in}} - {{check_out}}
• Cabin: {{cabin_number}}
• Cancelled on: {{cancelled_date}}

{{#if within_turn_window}}
⚠️ IMPORTANT: Since this cancellation occurred during your active booking window, your turn has been passed to the next shareholder ({{next_shareholder}}).
{{else}}
Your dates have been released and are now available for other shareholders to book.
{{/if}}

📅 REBOOKING OPTIONS
{{#if within_turn_window}}
You can still book during open season once all shareholders have had their turn.
{{else}}
You can create a new booking anytime during open season (first-come, first-served).
{{/if}}

[View Available Dates] [View Dashboard]

If this cancellation was made in error, please contact us immediately.

Best regards,
The Honeymoon Haven Team

---
Questions? Reply to this email or contact honeymoonhavenresort.lc@gmail.com
```

**CTAs:**
- Primary: "View Available Dates" → Link to public schedule
- Secondary: "View Dashboard" → Link to dashboard

---

## 11. Booking Cancelled Notification (Next - if applicable)

**Subject:** 🎉 It's Your Turn! Honeymoon Haven Booking Window Open

**Body:**
```
Hi {{name}},

It's now your turn to book at Honeymoon Haven Resort!

The previous shareholder ({{previous_shareholder}}) has cancelled their booking, which means your 48-hour booking window has started.

⏰ Your Deadline: {{deadline_date}} at {{deadline_time}}

🏡 WHAT YOU CAN DO
• Book your preferred dates for the 2026 season (March 1 - October 31)
• Save a draft and finalize later
• Pass your turn to the next shareholder

📋 BOOKING DETAILS
• Your Cabin: {{cabin_number}}
• Maximum stay: 7 nights
• Rate: $125/night maintenance fee

Ready to book your summer getaway?

[Book Now] [View Dashboard] [Pass Turn]

Questions? Reply to this email anytime.

Best regards,
The Honeymoon Haven Team

---
Season: March 1st - October 31st, 2026
```

**CTAs:**
- Primary: "Book Now" → Direct link to booking modal
- Secondary: "View Dashboard" → Link to dashboard
- Tertiary: "Pass Turn" → Link to pass action

---

## 12. Payment Reminder - 12 Hours After Finalization

**Subject:** 💰 Payment Reminder: E-Transfer Due for Your Booking

**Body:**
```
Hi {{name}},

This is a friendly reminder that your e-transfer payment is due for your Honeymoon Haven booking.

📅 BOOKING DETAILS
• Dates: {{check_in}} - {{check_out}}
• Cabin: {{cabin_number}}
• Total Due: ${{total_price}}

💰 PAYMENT INSTRUCTIONS
Please send an e-transfer within the next 12 hours:

📧 Email: honeymoonhavenresort.lc@gmail.com
💵 Amount: ${{total_price}}
📝 Message: "{{name}} - Cabin {{cabin_number}} - {{check_in}}"

⏰ Payment Deadline: {{payment_deadline}}

⚠️ IMPORTANT
If payment is not received by the deadline, your booking may be cancelled and your dates released to other shareholders.

[Send E-Transfer Now] [View Booking] [Contact Us]

Already sent payment? Please disregard this reminder.

Best regards,
The Honeymoon Haven Team

---
Questions about payment? Reply to this email immediately.
```

**CTAs:**
- Primary: "Send E-Transfer Now" → Opens email client with pre-filled details
- Secondary: "View Booking" → Link to dashboard
- Tertiary: "Contact Us" → Reply to email

---

## EmailJS Variable Reference

### Common Variables (used across multiple templates)
- `{{name}}` - Shareholder name
- `{{email}}` - Shareholder email
- `{{cabin_number}}` - Cabin number
- `{{check_in}}` - Check-in date (formatted)
- `{{check_out}}` - Check-out date (formatted)
- `{{guests}}` - Number of guests
- `{{nights}}` - Number of nights
- `{{total_price}}` - Total maintenance fee
- `{{deadline_date}}` - Deadline date (formatted)
- `{{deadline_time}}` - Deadline time (formatted)
- `{{hours_remaining}}` - Hours until deadline
- `{{next_shareholder}}` - Next shareholder name
- `{{previous_shareholder}}` - Previous shareholder name
- `{{has_draft}}` - Boolean: has draft booking
- `{{urgency_high}}` - Boolean: <12 hours remaining
- `{{urgency_medium}}` - Boolean: 12-24 hours remaining
- `{{urgency_critical}}` - Boolean: <6 hours remaining
- `{{within_turn_window}}` - Boolean: action within 48hr window
- `{{cancelled_date}}` - Cancellation date
- `{{payment_deadline}}` - Payment deadline timestamp

---

## Implementation Notes

1. **Create 12 separate templates** in EmailJS (one for each email type)
2. **Use conditional logic** ({{#if}}) for dynamic content
3. **Test each template** with sample data before going live
4. **Track email metrics** (opens, clicks) to optimize
5. **A/B test subject lines** to improve engagement

---

*All templates follow best practices for transactional emails: clear subject lines, scannable content, prominent CTAs, and mobile-responsive design.*
