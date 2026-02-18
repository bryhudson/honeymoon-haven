import { describe, it, expect } from 'vitest';
import {
    validatePasswordReset,
    mapForgotPasswordError,
    validateAuthActionParams,
} from '../src/lib/authValidation';

// ---------------------------------------------------------------------------
// validatePasswordReset
// ---------------------------------------------------------------------------

describe('validatePasswordReset', () => {
    // --- Valid inputs ---

    it('returns null for matching passwords that meet minimum length', () => {
        expect(validatePasswordReset('secret123', 'secret123')).toBeNull();
    });

    it('returns null for exactly 6-character matching passwords', () => {
        expect(validatePasswordReset('abc123', 'abc123')).toBeNull();
    });

    it('returns null for long matching passwords', () => {
        const pw = 'a'.repeat(64);
        expect(validatePasswordReset(pw, pw)).toBeNull();
    });

    // --- Mismatch ---

    it('returns mismatch error when passwords differ', () => {
        expect(validatePasswordReset('password1', 'password2')).toBe(
            'Passwords do not match.'
        );
    });

    it('returns mismatch error when case differs', () => {
        expect(validatePasswordReset('Password', 'password')).toBe(
            'Passwords do not match.'
        );
    });

    it('returns mismatch error when confirm has trailing space', () => {
        expect(validatePasswordReset('secret', 'secret ')).toBe(
            'Passwords do not match.'
        );
    });

    // --- Too short (checked after match) ---

    it('returns length error when both passwords match but are too short (5 chars)', () => {
        expect(validatePasswordReset('abc12', 'abc12')).toBe(
            'Password must be at least 6 characters.'
        );
    });

    it('returns length error for single-character matching passwords', () => {
        expect(validatePasswordReset('x', 'x')).toBe(
            'Password must be at least 6 characters.'
        );
    });

    it('returns length error for both-empty passwords (match but too short)', () => {
        expect(validatePasswordReset('', '')).toBe(
            'Password must be at least 6 characters.'
        );
    });

    // --- Mismatch takes priority over length ---

    it('returns mismatch error (not length error) when passwords differ and are short', () => {
        // 'abc' vs 'xyz': mismatch check runs first
        expect(validatePasswordReset('abc', 'xyz')).toBe('Passwords do not match.');
    });
});

// ---------------------------------------------------------------------------
// mapForgotPasswordError
// ---------------------------------------------------------------------------

describe('mapForgotPasswordError', () => {
    it('maps auth/user-not-found to the friendly not-found message', () => {
        expect(mapForgotPasswordError('auth/user-not-found')).toBe(
            'No account found with this email.'
        );
    });

    it('maps auth/too-many-requests to the generic error message', () => {
        expect(mapForgotPasswordError('auth/too-many-requests')).toBe(
            'Failed to reset password. Please try again.'
        );
    });

    it('maps auth/invalid-email to the generic error message', () => {
        expect(mapForgotPasswordError('auth/invalid-email')).toBe(
            'Failed to reset password. Please try again.'
        );
    });

    it('maps auth/network-request-failed to the generic error message', () => {
        expect(mapForgotPasswordError('auth/network-request-failed')).toBe(
            'Failed to reset password. Please try again.'
        );
    });

    it('maps an unknown error code to the generic error message', () => {
        expect(mapForgotPasswordError('auth/unknown-error')).toBe(
            'Failed to reset password. Please try again.'
        );
    });

    it('maps an empty string code to the generic error message', () => {
        expect(mapForgotPasswordError('')).toBe(
            'Failed to reset password. Please try again.'
        );
    });
});

// ---------------------------------------------------------------------------
// validateAuthActionParams
// ---------------------------------------------------------------------------

describe('validateAuthActionParams', () => {
    // --- Valid ---

    it('returns null for a valid resetPassword mode with an action code', () => {
        expect(validateAuthActionParams('resetPassword', 'abc123xyz')).toBeNull();
    });

    // --- Missing action code ---

    it('returns an error when actionCode is null', () => {
        expect(validateAuthActionParams('resetPassword', null)).toBe(
            'Invalid or missing action code.'
        );
    });

    it('returns an error when actionCode is an empty string', () => {
        expect(validateAuthActionParams('resetPassword', '')).toBe(
            'Invalid or missing action code.'
        );
    });

    it('returns an error when both mode and actionCode are null', () => {
        // actionCode check runs first
        expect(validateAuthActionParams(null, null)).toBe(
            'Invalid or missing action code.'
        );
    });

    // --- Unsupported mode ---

    it('returns an error for an unsupported mode with a valid action code', () => {
        expect(validateAuthActionParams('verifyEmail', 'abc123xyz')).toBe(
            'Unsupported action mode.'
        );
    });

    it('returns an error when mode is null but actionCode is present', () => {
        expect(validateAuthActionParams(null, 'abc123xyz')).toBe(
            'Unsupported action mode.'
        );
    });

    it('returns an error when mode is an empty string but actionCode is present', () => {
        expect(validateAuthActionParams('', 'abc123xyz')).toBe(
            'Unsupported action mode.'
        );
    });

    it('returns an error for a plausible-but-wrong mode like "signIn"', () => {
        expect(validateAuthActionParams('signIn', 'abc123xyz')).toBe(
            'Unsupported action mode.'
        );
    });
});
