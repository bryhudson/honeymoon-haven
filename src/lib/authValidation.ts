/**
 * Pure validation utilities for the auth password reset flow.
 * Extracted from AuthAction.jsx and ForgotPassword.jsx so they can be unit-tested
 * without jsdom or Firebase mocks.
 */

/**
 * Validates a new password + confirmation pair.
 * Returns null when valid, or an error string the UI can display directly.
 */
export function validatePasswordReset(
    password: string,
    confirmPassword: string
): string | null {
    if (password !== confirmPassword) return 'Passwords do not match.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return null;
}

/**
 * Maps a Firebase Auth error code to a user-facing message for the
 * "Forgot Password" (sendPasswordResetEmail) flow.
 */
export function mapForgotPasswordError(code: string): string {
    if (code === 'auth/user-not-found') return 'No account found with this email.';
    return 'Failed to reset password. Please try again.';
}

/**
 * Validates the URL parameters passed to the AuthAction page.
 * Returns null when the params look valid, or an error string.
 */
export function validateAuthActionParams(
    mode: string | null,
    actionCode: string | null
): string | null {
    if (!actionCode) return 'Invalid or missing action code.';
    if (mode !== 'resetPassword') return 'Unsupported action mode.';
    return null;
}
