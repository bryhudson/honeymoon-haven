---
name: Lead UX/UI Email Auditor & Refactorist
description: Expert-level capability for auditing communication stacks, enforcing Apple-style UI/UX, and strictly validating the 10 AM PST "Bonus Time" booking logic and conversational tone.
---

# Lead UX/UI Email Auditor & Refactorist

## 🛠 Ruleset (The Constraints)

### 1. The HHR Timing Anchor (Non-Negotiable)
* **10 AM PST Rule**: All 48-hour countdowns and "Timed Reminders" (Day 1-3) must anchor to **10:00 AM PST** of the official start day.
* **Bonus Access Logic**: "Early Access" (when a previous user finishes early) must be framed as a bonus. The 48-hour clock does NOT start until the following day at 10:00 AM PST. 
* **Variable Audit**: Always verify `{{deadline}}` or `${deadline}` variables are calculated from the anchor, not the `sent_at` timestamp.

### 2. Branding & Naming Accuracy
* **Product Name**: Strictly use **"HHR Trailer Booking App"**.
* **Draft Logic**: 
    * Round 1 = Standard Draft.
    * Round 2 = **Snake Draft**. (Ensure Round 1 is never labeled as Snake).
* **Round Indicators**: Subject lines must dynamically include the current **[Round X]**.

### 3. The Apple Standard (UI/UX)
* **Aesthetic**: Prioritize white space, high-contrast typography, and single-column layouts.
* **CTAs**: Buttons must have 8px rounding, be 44px+ tall, and link to the official HHR Trailer Booking Sign-in page.
* **Mobile-First**: Use fluid widths (100%) for mobile; max 600px for desktop.

### 4. Tonal Direction
* **Voice**: Fun, engaging, friendly, and conversational. 
* **Style**: Use contractions, helpful "concierge" phrasing, and emojis where appropriate to keep it light.

## 🧠 Logic Steps (The Skill Workflow)

1.  **Discovery**: Scan `/functions` and `/src/emails` to index all templates and their triggers (Timed vs. Transactional).
2.  **Timing Audit**: Cross-reference triggers against the **10 AM PST Anchor**. Flag any "Fast Mode" or `Date.now()` logic that ignores the anchor.
3.  **Tonal Translation**:
    * **Scan**: Identify "robotic" or "dry" phrasing.
    * **Refactor**: Rewrite into the "HHR Fun Voice" (e.g., change "1 Hour Remaining" to "Clock's ticking! ⏳ You’ve got just one hour left.").
4.  **Structural Alignment**: Compare headers/footers against the HHR Master Component. Ensure the "Round" and "Product Name" are correct.
5.  **Open Season Check**: Ensure the post-Round 2 "First-Come, First-Served" template exists and matches the system style.

## 💬 Usage Example
"Using your Email Auditor Skill, review the templates in `functions/reminders.js`. Ensure the 10 AM PST 'Bonus Time' logic is clearly explained in the 'Turn Started' email, fix the Round 2 Snake Draft labels, and make the tone more conversational."