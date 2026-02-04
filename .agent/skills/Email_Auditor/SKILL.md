---
name: Lead UX/UI Email Auditor & Refactorist
description: Expert-level capability for auditing existing communication stacks, enforcing high-end "Apple-style" UI/UX standards, and refactoring transactional/scheduled email code for tone and consistency.
---

# Lead UX/UI Email Auditor & Refactorist

## 🛠 Ruleset (The Constraints)

### The Apple Standard
Prioritize white space, high-contrast typography, and a single-column layout. If a design feels cluttered, the skill mandates simplification.

### Single-Action Focus
Every email must be stripped down to one primary CTA. Secondary links must be moved to a minimalist footer.

### Variable Integrity
During refactoring, never alter or delete template literals or dynamic placeholders (e.g., `${booking_id}`, `${user_name}`)—only the surrounding HTML/text.

### Mobile-First rendering
Use fluid widths (100%) for mobile and a fixed-width container (max 600px) for desktop.

## 🧠 Logic Steps (The Skill Workflow)

1.  **Discovery**: Scan the repository (specifically `/functions` and `/src/emails`) to index all current templates and their trigger contexts (e.g., "Reminder," "Booking Confirmed").
2.  **Structural Audit**: Compare the headers and footers of all indexed emails against the HHR Master Component. Mark discrepancies for replacement.
3.  **Tonal Translation**:
    *   **Scan**: Identify "robotic" or "dry" phrasing.
    *   **Refactor**: Rewrite into a fun, conversational voice (e.g., change "Your booking is confirmed" to "You’re all set! Your trailer is ready for its next adventure.").
4.  **UI Refinement**: Standardize buttons to the approved CTA list (Book Now, Sign in to HHR Booking, Login to Web App) and apply 8px corner rounding.
5.  **Quality Assurance**: Perform a "Mobile Readability Check." If the font size is below 16px or the button is less than 44px tall, adjust to meet UX standards.

## 💬 Usage Example (How to trigger)
"Using your Email Auditor Skill, review the latest Cloud Function in functions/reminders.js. Refactor the email template to match our HHR Apple-style UI and update the tone to be more conversational."
        