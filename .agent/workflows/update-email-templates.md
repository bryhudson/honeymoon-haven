---
description: How to update email templates consistently
---

# Email Template Update Workflow

## Critical Rule
**ALWAYS update BOTH frontend and backend email templates together.** They must stay in sync!

## Template Locations

### Frontend (for display/preview)
`src/services/emailTemplates.js`

### Backend (for actual sending via Cloud Functions)  
`functions/helpers/emailTemplates.js`

## Update Process

### 1. Identify the Email Template
Find which template needs updating (e.g., `turnStarted`, `reminder`, `bookingConfirmed`)

### 2. Update Frontend First
Edit `src/services/emailTemplates.js`:
- Locate the template function
- Make your changes (subject, body, styling)
- Test the changes visually if possible

### 3. Mirror Changes to Backend
Edit `functions/helpers/emailTemplates.js`:
- Find the SAME template function
- Apply IDENTICAL changes
- Ensure subject and body match frontend exactly

### 4. Verify Consistency
Compare both files side-by-side:
```bash
# Quick check - line counts should be similar
wc -l src/services/emailTemplates.js functions/helpers/emailTemplates.js
```

### 5. Deploy
```bash
npm run build && npm run deploy
```
This deploys both frontend (hosting) and backend (cloud functions)

## Common Templates to Update

| Template | Purpose |
|----------|---------|
| `turnStarted` | "It's YOUR Turn!" email |
| `reminder` | Daily morning/evening reminders |
| `finalWarning` | 6-hour warning before deadline |
| `bookingConfirmed` | Booking confirmation |
| `turnPassedCurrent` | Current user passed turn |
| `turnPassedNext` | Next user's turn started early |
| `autoPassCurrent` | Timeout - turn auto-passed |
| `autoPassNext` | Next user after auto-pass |
| `bookingCancelled` | Booking cancelled |

## Testing Checklist

- [ ] Frontend template updated
- [ ] Backend template updated identically  
- [ ] Subject lines match
- [ ] All variables (`${data.name}`, etc.) present in both
- [ ] HHR prefix (`HHR Trailer Booking:`) in subject if required
- [ ] Login credentials section included if needed
- [ ] Round information included if applicable
- [ ] Deployed and tested

## Pro Tips

✅ **Do:**
- Update both files in the same commit
- Test with "Send Test Email" in Admin panel
- Check both desktop and mobile email rendering

❌ **Don't:**
- Update only one file and forget the other
- Assume they auto-sync (they don't!)
- Skip testing after changes
