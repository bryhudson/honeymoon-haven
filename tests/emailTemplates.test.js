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
});
