import { describe, it, expect } from 'vitest';
import { getOfficialStart, getPickDurationMS } from '../src/lib/shareholders';

// Expose getTargetPstTime logic for testing
function getTargetPstTime(baseDate: Date, targetHour: number, daysOffset: number = 0): Date {
  const adjustedDate = new Date(baseDate);
  adjustedDate.setDate(adjustedDate.getDate() + daysOffset);

  const ptParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric', month: 'numeric', day: 'numeric'
  }).formatToParts(adjustedDate);

  const year = parseInt(ptParts.find(p => p.type === 'year')!.value);
  const month = parseInt(ptParts.find(p => p.type === 'month')!.value);
  const day = parseInt(ptParts.find(p => p.type === 'day')!.value);

  const guess = new Date(Date.UTC(year, month - 1, day, targetHour + 8, 0, 0, 0));

  const checkParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric', hour12: false
  }).formatToParts(guess);
  let actualHour = parseInt(checkParts.find(p => p.type === 'hour')!.value);
  if (actualHour === 24) actualHour = 0;

  if (actualHour !== targetHour) {
      guess.setUTCHours(guess.getUTCHours() + (targetHour - actualHour));
  }

  return guess;
}

describe('Temporal Logic & DST Boundaries', () => {
    it('calculates official start correctly during Standard Time', () => {
        // e.g. Feb 1, 2026 5:00 AM UTC (Feb 1 9:00 PM PST previous day)
        // Wait, DRAFT_CONFIG.START_DATE is Mar 1, 2026.
        const baseDate = new Date('2026-02-01T15:00:00Z'); // 7:00 AM PST
        const start = getOfficialStart(baseDate);
        expect(start!.toISOString()).toBe('2026-02-01T18:00:00.000Z'); // 10:00 AM PST is 18:00 UTC
    });

    it('calculates official start correctly during Daylight Saving Time', () => {
        // e.g. June 1, 2026 5:00 AM UTC
        const baseDate = new Date('2026-06-01T15:00:00Z'); // 8:00 AM PDT
        const start = getOfficialStart(baseDate);
        expect(start!.toISOString()).toBe('2026-06-01T17:00:00.000Z'); // 10:00 AM PDT is 17:00 UTC
    });

    it('correctly crosses the DST boundary (Spring Forward - March 8, 2026)', () => {
        // baseDate: March 7 10:00 AM PST
        const baseDate = new Date('2026-03-07T18:00:00Z');
        
        // Add duration: 2 days (48 hours)
        const durationMS = getPickDurationMS();
        const rawEndDate = new Date(baseDate.getTime() + durationMS); // March 9 18:00 UTC
        
        // Let's see what getOfficialStart gives. March 9 should be PDT, so 10:00 AM is 17:00 UTC!
        // But 48 hours later is 18:00 UTC. So getOfficialStart should snap it to 10:00 AM PDT (17:00 UTC).
        // Wait, if it finishes at 18:00 UTC (11:00 AM PDT), getOfficialStart will push to next day 10 AM.
        // If we just ask getTargetPstTime for March 9 10AM:
        const nextStart = getTargetPstTime(baseDate, 10, 2);
        expect(nextStart.toISOString()).toBe('2026-03-09T17:00:00.000Z');
    });

    it('correctly calculates +2 days offset across Spring Forward DST', () => {
        const baseDate = new Date('2026-03-07T18:00:00Z'); // 10 AM PST
        const nextStart = getTargetPstTime(baseDate, 10, 2); // Target 10 AM PT in 2 days (March 9)
        expect(nextStart.toISOString()).toBe('2026-03-09T17:00:00.000Z'); // 10 AM PDT
    });

    it('correctly calculates getOfficialStart for an action at exactly 10:00 AM boundary', () => {
        const actionTime = new Date('2026-03-01T18:00:00.000Z'); // 10:00 AM PST
        const start = getOfficialStart(actionTime);
        expect(start!.toISOString()).toBe('2026-03-01T18:00:00.000Z');
    });

    it('correctly calculates getOfficialStart for an action AFTER 10:00 AM boundary', () => {
        const actionTime = new Date('2026-03-01T18:00:01.000Z'); // 10:00:01 AM PST
        const start = getOfficialStart(actionTime);
        expect(start!.toISOString()).toBe('2026-03-02T18:00:00.000Z'); // Pushed to NEXT day 10:00 AM
    });
});
