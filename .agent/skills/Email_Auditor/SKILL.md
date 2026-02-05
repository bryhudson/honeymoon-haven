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
* **Typography**: Never use em dashes (—). Always use regular hyphens (-) with spaces.

### 5. Frontend-Backend Integration (Critical)
* **emailService.sendEmail Flow**: The frontend `emailService.js` must properly pass ALL parameters to the backend Cloud Function:
  * `to` - Recipient object `{ name, email }` or string
  * `templateId` - For template-based emails
  * `params` - Data object for template hydration
  * `subject` - For custom/raw emails (e.g., admin reports)
  * `htmlContent` - For custom/raw emails
* **Backend Validation**: The `sendEmail` Cloud Function must validate that either:
  1. A valid `templateId` exists and can hydrate subject/html, OR
  2. Raw `subject` AND `htmlContent` are provided
* **Reject if both are missing** - never send blank emails
* **Deployment Sync**: Frontend changes require `npm run release` to deploy; backend-only needs `firebase deploy --only functions`

## 🧠 Logic Steps (The Skill Workflow)

0.  **Credential Verification** (CRITICAL - Run First):
    * Check Firebase secrets exist: `firebase functions:secrets:access GMAIL_EMAIL`
    * Verify sender matches expected: `honeymoonhavenresort.lc@gmail.com`
    * Check for 535-5.7.8 errors in recent logs: `firebase functions:log -n 20 | grep -i "535\|BadCredentials\|Invalid login"`
    * If credentials fail, guide user to regenerate app password in Google Account > Security > App Passwords
    * After fix: `firebase functions:secrets:set GMAIL_APP_PASSWORD` then redeploy

1.  **Discovery**: Scan `/functions` and `/src/emails` to index all templates and their triggers (Timed vs. Transactional).
2.  **Timing Audit**: Cross-reference triggers against the **10 AM PST Anchor**. Flag any "Fast Mode" or `Date.now()` logic that ignores the anchor.
3.  **Tonal Translation**:
    * **Scan**: Identify "robotic" or "dry" phrasing.
    * **Refactor**: Rewrite into the "HHR Fun Voice" (e.g., change "1 Hour Remaining" to "Clock's ticking! ⏳ You've got just one hour left.").
4.  **Structural Alignment**: Compare headers/footers against the HHR Master Component. Ensure the "Round" and "Product Name" are correct.
5.  **Open Season Check**: Ensure the post-Round 2 "First-Come, First-Served" template exists and matches the system style.
6.  **Frontend-Backend Flow Audit** (NEW):
    * Trace the email call from UI button → `emailService.sendEmail()` → Cloud Function → `sendGmail()`
    * Verify all parameters are passed through each layer
    * Check that custom emails (reports, admin alerts) include `subject` AND `htmlContent`
    * Confirm frontend is deployed (not just backend) if UI-initiated emails are blank

## 🔍 Debugging Checklist (Blank Email Issues)

When an email arrives blank or with "(No Subject)":

1. **Check Firebase Logs First**:
   ```bash
   firebase functions:log --only sendEmail
   ```

2. **Look for these error patterns**:
   - `Cannot use "undefined" as a Firestore value (found in field "subject")` → subject not passed
   - `Email subject and HTML content are required` → validation caught missing data
   - `[TEST MODE ACTIVE]` → email was intercepted (check test mode settings)

3. **Trace the data flow**:
   - Frontend: Is `emailService.sendEmail({ subject, htmlContent, ... })` being called with all params?
   - Backend: Is `request.data` being destructured correctly?
   - Email helper: Is `sendGmail({ subject, htmlContent })` receiving the values?

4. **Common fixes**:
   - Add missing parameters to `emailService.sendEmail()` call
   - Ensure frontend is redeployed (`npm run release "message"`)
   - Add validation in backend to reject incomplete emails early

## 📊 Admin Report Requirements

When generating admin email reports (like the Season Booking Report):

1. **Subject Line Format**: `[Admin] {Report Title} - {Date}`
2. **Required Sections**:
   - Summary stats (revenue, unpaid, bookings, nights)
   - Booking list table with all columns
   - Calendar view (May-September with color-coded bookings)
   - Legend for shareholder colors
3. **Calculate analytics inline** - don't reference `useMemo` values that may not be in scope

## 💬 Usage Example
"Using your Email Auditor Skill, review the templates in `functions/reminders.js`. Ensure the 10 AM PST 'Bonus Time' logic is clearly explained in the 'Turn Started' email, fix the Round 2 Snake Draft labels, and make the tone more conversational."

## 💬 Usage Example (Frontend-Backend Audit)
"Using your Email Auditor Skill, audit the Email Report functionality. Trace the flow from the Admin Dashboard button through emailService.sendEmail to the backend sendEmail Cloud Function. Ensure subject and htmlContent are properly passed at each layer."