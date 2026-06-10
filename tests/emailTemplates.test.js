import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

// emailTemplates is a CommonJS module, so we use createRequire to import it
const require = createRequire(import.meta.url);
const { emailTemplates } = require('../functions/helpers/emailTemplates');

// --- Shared test data ---
const baseData = {
    name: 'Test Shareholder',
    round: 1,
    phase: 'ROUND_1',
    deadline_date: 'Wed, Jun 17',
    deadline_time: '10:00 AM',
    status_message: 'Test status message',
    urgency_message: 'Test urgency message',
    dashboard_url: 'https://hhr-trailer-booking.web.app/',
};

const bookingData = {
    ...baseData,
    check_in: 'June 15, 2026',
    check_out: 'June 22, 2026',
    nights: 7,
    cabin_number: 3,
    guests: 4,
    total_price: 650,
};

const priceBreakdown = {
    weeknights: 5,
    weeknightTotal: 500,
    weekends: 2,
    weekendTotal: 250,
    discount: 100,
};

// --- Tests ---
describe('Email Templates', () => {

    describe('All templates return required fields', () => {
        const templateTests = [
            { name: 'turnStarted', data: baseData },
            { name: 'reminder', data: { ...baseData, type: 'morning', hours_remaining: 24 } },
            { name: 'finalWarning', data: { ...baseData, type: 'morning', hours_remaining: 1 } },
            { name: 'bookingConfirmed', data: bookingData },
            { name: 'bookingCancelled', data: { ...bookingData, within_turn_window: false, next_shareholder: 'Next Person' } },
            { name: 'turnPassedCurrent', data: baseData },
            { name: 'turnPassedNext', data: { ...baseData, previous_shareholder: 'Prev Person' } },
            { name: 'autoPassCurrent', data: baseData },
            { name: 'autoPassNext', data: { ...baseData, previous_shareholder: 'Prev Person' } },
            { name: 'paymentReminder', data: { ...bookingData, price_breakdown: priceBreakdown } },
            { name: 'paymentReceived', data: { ...bookingData, amount: 650 } },
            { name: 'guestGuide', data: bookingData },
            { name: 'officialTurnStart', data: baseData },
            { name: 'openSeasonStarted', data: {} },
            { name: 'feedback', data: baseData },
            { name: 'paymentOverdueAdmin', data: { ...bookingData, price_breakdown: priceBreakdown, created_at: 'Mon, Jun 15, 10:00 AM', deadline: 'Wed, Jun 17, 10:00 AM', hours_overdue: 12 } },
        ];

        templateTests.forEach(({ name, data }) => {
            it(`${name}() returns subject and htmlContent`, () => {
                const result = emailTemplates[name](data);
                expect(result).toHaveProperty('subject');
                expect(result).toHaveProperty('htmlContent');
                expect(result.subject).toBeTruthy();
                expect(result.htmlContent).toBeTruthy();
                expect(typeof result.subject).toBe('string');
                expect(typeof result.htmlContent).toBe('string');
            });
        });
    });

    describe('Template content quality', () => {
        it('turnStarted includes shareholder name and round', () => {
            const result = emailTemplates.turnStarted(baseData);
            expect(result.htmlContent).toContain('Test Shareholder');
            expect(result.subject).toContain('Turn');
        });

        it('bookingConfirmed includes booking details', () => {
            const result = emailTemplates.bookingConfirmed(bookingData);
            expect(result.htmlContent).toContain('June 15');
            expect(result.htmlContent).toContain('June 22');
        });

        it('escapes HTML in user-controlled fields to prevent injection', () => {
            const result = emailTemplates.bookingConfirmed({
                ...bookingData,
                name: '<img src=x onerror=alert(1)>',
                cabin_number: '<script>evil</script>',
            });
            // Raw tags must NOT survive into the rendered HTML
            expect(result.htmlContent).not.toContain('<img src=x onerror=');
            expect(result.htmlContent).not.toContain('<script>evil');
            // The escaped form should be present instead
            expect(result.htmlContent).toContain('&lt;img src=x onerror=');
        });

        it('escapes HTML in the feedback message and email fields', () => {
            const result = emailTemplates.feedback({
                name: 'Tester',
                type: 'bug',
                message: '<script>steal()</script> and <b>bold</b>',
                email: '"><img src=x onerror=alert(1)>@evil.com',
            });
            // Raw tags from user-typed feedback must NOT survive into the admin's email
            expect(result.htmlContent).not.toContain('<script>steal()');
            expect(result.htmlContent).not.toContain('onerror=alert(1)>@evil.com');
            // Escaped forms should be present instead
            expect(result.htmlContent).toContain('&lt;script&gt;steal()');
        });

        it('paymentReminder includes price breakdown', () => {
            const data = { ...bookingData, price_breakdown: priceBreakdown };
            const result = emailTemplates.paymentReminder(data);
            expect(result.htmlContent).toContain('500');
            expect(result.htmlContent).toContain('250');
        });

        it('reminder uses day2 morning greeting for type=day2', () => {
            const result = emailTemplates.reminder({ ...baseData, type: 'day2', hours_remaining: 24 });
            expect(result.htmlContent).toMatch(/good morning/i);
        });

        it('reminder uses evening tone for type=evening', () => {
            const result = emailTemplates.reminder({ ...baseData, type: 'evening', hours_remaining: 12 });
            expect(result.htmlContent).toMatch(/calling|awaits/i);
        });

        it('openSeasonStarted works with empty data', () => {
            const result = emailTemplates.openSeasonStarted({});
            expect(result.subject).toBeTruthy();
            expect(result.htmlContent).toContain('Open Season');
        });
    });

    describe('HTML structure', () => {
        it('all templates produce valid HTML with wrapper', () => {
            const result = emailTemplates.turnStarted(baseData);
            expect(result.htmlContent).toContain('<!DOCTYPE html>');
            expect(result.htmlContent).toContain('</html>');
            expect(result.htmlContent).toContain('HHR Trailer Booking App');
        });

        it('templates include dashboard link', () => {
            const result = emailTemplates.turnStarted(baseData);
            expect(result.htmlContent).toContain('hhr-trailer-booking.web.app');
        });
    });

    describe('paymentUrgent template', () => {
        it('returns subject and content with payment context', () => {
            const data = {
                ...baseData,
                hours_remaining: 6,
                type: 'morning',
                total_price: 650,
            };
            const result = emailTemplates.paymentUrgent(data);
            expect(result.subject).toBeTruthy();
            expect(result.htmlContent).toBeTruthy();
            // Should NOT mention "turn skipped" - this is a payment reminder
            expect(result.htmlContent).not.toMatch(/turn.*skip/i);
        });
    });

    describe('paymentOverdueAdmin template', () => {
        it('includes overdue hours and admin context', () => {
            const data = {
                ...bookingData,
                price_breakdown: priceBreakdown,
                created_at: 'Mon, Jun 15, 10:00 AM',
                deadline: 'Wed, Jun 17, 10:00 AM',
                hours_overdue: 12,
            };
            const result = emailTemplates.paymentOverdueAdmin(data);
            expect(result.subject).toContain('Overdue');
            expect(result.htmlContent).toContain('12');
        });
    });

    // Open-season audit regression locks: round/phase labelling in subjects.
    describe('open-season round labelling', () => {
        it('bookingConfirmed subject shows [Open Season] when phase is OPEN_SEASON', () => {
            const result = emailTemplates.bookingConfirmed({ ...baseData, phase: 'OPEN_SEASON', round: 3 });
            expect(result.subject).toContain('[Open Season]');
        });

        it('bookingConfirmed subject shows [Round 2] for ROUND_2 phase', () => {
            const result = emailTemplates.bookingConfirmed({ ...baseData, phase: 'ROUND_2', round: 2 });
            expect(result.subject).toContain('[Round 2]');
        });

        it('round 3 WITHOUT a phase still labels as Open Season (autosync writes round: 3)', () => {
            const result = emailTemplates.bookingConfirmed({ ...baseData, round: 3 });
            expect(result.subject).toContain('[Open Season]');
        });

        it('bookingCancelled subject shows [Open Season] when phase is OPEN_SEASON', () => {
            const result = emailTemplates.bookingCancelled({ ...baseData, phase: 'OPEN_SEASON' });
            expect(result.subject).toContain('[Open Season]');
        });

        it('turnPassedCurrent subject bracket follows the actual round/phase', () => {
            const result = emailTemplates.turnPassedCurrent({
                name: 'Test Shareholder',
                phase: 'ROUND_2',
                round: 2,
                next_opportunity_title: 'OPEN SEASON BOOKING',
                next_opportunity_text: 'First come, first served.',
            });
            expect(result.subject).toContain('[Round 2]');
            expect(result.subject).not.toContain('[Round 1]');
        });

        it('paymentReceived subject uses the standard "App [Label]:" format', () => {
            const result = emailTemplates.paymentReceived({ ...baseData, phase: 'OPEN_SEASON', amount: 450, expected_amount: 450 });
            expect(result.subject).toMatch(/^HHR Trailer Booking App \[Open Season\]:/);
        });

        it('paymentReminder subject uses the standard "App [Label]:" format', () => {
            const result = emailTemplates.paymentReminder({ ...baseData, phase: 'OPEN_SEASON', total_price: 450 });
            expect(result.subject).toMatch(/^HHR Trailer Booking App \[Open Season\]:/);
        });
    });

    // Overdue admin alert: real dates in the subject, sane hour grammar.
    describe('paymentOverdueAdmin formatting', () => {
        it('renders "1 hour overdue" (singular) for the first alert past the deadline', () => {
            const result = emailTemplates.paymentOverdueAdmin({
                name: 'Lori and Jeff',
                cabin_number: '7',
                check_in: 'Mon, Aug 31, 2026',
                check_out: 'Thu, Sep 3, 2026',
                guests: 2,
                total_price: 300,
                created_at: 'Sun, Jun 7, 11:13 PM',
                deadline: 'Tue, Jun 9, 11:13 PM',
                hours_overdue: 1,
            });
            expect(result.htmlContent).toContain('1 hour overdue');
            expect(result.htmlContent).not.toContain('1 hours overdue');
        });

        it('puts the check-in date in the subject', () => {
            const result = emailTemplates.paymentOverdueAdmin({
                name: 'Lori and Jeff',
                check_in: 'Mon, Aug 31, 2026',
                check_out: 'Thu, Sep 3, 2026',
                hours_overdue: 2,
            });
            expect(result.subject).toContain('Mon, Aug 31, 2026');
            expect(result.htmlContent).toContain('2 hours overdue');
        });
    });
});
