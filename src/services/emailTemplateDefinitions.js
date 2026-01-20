/**
 * Definitions for Email Templates
 * Used by Admin Dashboard to show available variables and by emailService to validate data.
 */

export const TEMPLATE_DEFINITIONS = [
    {
        id: "turnStarted",
        name: "Turn Started (Current User)",
        variables: ["name", "deadline_date", "deadline_time", "booking_url", "dashboard_url", "pass_turn_url", "current_phase_title", "current_phase_detail"],
        description: "Sent to the shareholder when their 48h window begins."
    },
    {
        id: "reminder",
        name: "Daily Reminder (Morning/Evening)",
        variables: ["name", "type", "hours_remaining", "deadline_date", "deadline_time", "has_draft", "check_in", "check_out", "booking_url", "dashboard_url", "current_phase_title", "current_phase_detail"],
        description: "Sent twice daily during the active window."
    },
    {
        id: "finalWarning",
        name: "Final Warning (6 Hours Left)",
        variables: ["name", "hours_remaining", "deadline_date", "deadline_time", "has_draft", "check_in", "check_out", "total_price", "cabin_number", "next_shareholder", "booking_url", "dashboard_url", "current_phase_title", "current_phase_detail"],
        description: "Urgent reminder sent 6 hours before deadline."
    },
    {
        id: "bookingConfirmed",
        name: "Booking Confirmed",
        variables: ["name", "check_in", "check_out", "cabin_number", "guests", "nights", "total_price", "dashboard_url"],
        description: "Sent immediately after the user finalizes their booking."
    },
    {
        id: "turnPassedCurrent",
        name: "Turn Passed (You Passed)",
        variables: ["name", "dashboard_url", "next_opportunity_title", "next_opportunity_text"],
        description: "Confirmation sent to the user who chose to pass."
    },
    {
        id: "turnPassedNext",
        name: "Turn Passed (Next User Notified)",
        variables: ["name", "previous_shareholder", "deadline_date", "deadline_time", "booking_url", "dashboard_url", "current_phase_title", "current_phase_detail"],
        description: "Sent to the NEXT user when the previous user passes early."
    },
    {
        id: "autoPassCurrent",
        name: "Auto-Pass (Expired - You)",
        variables: ["name", "deadline_date", "deadline_time", "next_shareholder", "dashboard_url", "next_opportunity_title", "next_opportunity_text"],
        description: "Sent to the user who missed their deadline."
    },
    {
        id: "autoPassNext",
        name: "Auto-Pass (Next User Notified)",
        variables: ["name", "deadline_date", "deadline_time", "booking_url", "dashboard_url", "current_phase_title", "current_phase_detail"],
        description: "Sent to the NEXT user when the previous user times out."
    },
    {
        id: "bookingCancelled",
        name: "Booking Cancelled",
        variables: ["name", "check_in", "check_out", "cabin_number", "cancelled_date", "within_turn_window", "next_shareholder", "dashboard_url"],
        description: "Sent when a booking is cancelled."
    },
    {
        id: "paymentReminder",
        name: "Payment Reminder",
        variables: ["name", "total_price", "cabin_number", "check_in", "payment_deadline", "dashboard_url"],
        description: "Sent manually or automatically to remind of payment."
    },
    {
        id: "paymentReceived",
        name: "Payment Received",
        variables: ["name", "amount", "check_in", "check_out", "cabin_number", "dashboard_url"],
        description: "Sent when admin marks a booking as paid."
    }
];
