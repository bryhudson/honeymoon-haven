# [CRITICAL] Timezone Standard: PST Only

> All times in the Honeymoon Haven Resort booking platform MUST use Pacific Standard Time (America/Los_Angeles or America/Vancouver). UTC is NEVER acceptable for user-facing times.

## Rationale

All shareholders are located in Pacific Time, and the 10:00 AM PST draft start time is a core business rule. Using UTC causes critical bugs like missed scheduled emails.

## Implementation Rules

### 1. Cloud Functions (Server-Side)

**NEVER USE:**
- `new Date().getHours()` - Returns UTC hours in Cloud Functions
- `date.setHours(n, 0, 0, 0)` - Sets UTC hours, not PST
- Raw hour arithmetic (e.g., `+ 8 hours` for PST offset)

**ALWAYS USE:**
```javascript
// Use toLocaleString for PST time extraction
const pstString = date.toLocaleString('en-US', { 
  timeZone: 'America/Los_Angeles',
  hour: 'numeric',
  minute: '2-digit'
});

// For calculations, use explicit PST offset or luxon library
// PST = UTC-8, PDT = UTC-7 (April to October)
```

### 2. Frontend (Client-Side)

**ALWAYS USE:**
```javascript
date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
// OR
date.toLocaleString('en-US', { timeZone: 'America/Vancouver' })
```

### 3. Firestore Storage

- Store all timestamps as Firestore `Timestamp` objects (UTC internally)
- Convert to PST only when displaying or comparing to human time boundaries

### 4. Email Templates

- All deadline times, reminder schedules, and display times MUST be formatted in PST
- Use `America/Vancouver` or `America/Los_Angeles` timezone in `toLocaleString()`

## Enforcement

- Code reviews MUST flag any use of bare `getHours()`, `setHours()`, or hardcoded UTC offsets
- All scheduled functions must explicitly target PST times using proper timezone math
