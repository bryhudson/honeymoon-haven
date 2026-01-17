const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { logger } = require("firebase-functions");

/**
 * Creates a new user account (Auth + Firestore).
 * Restricted to Super Admins.
 */
exports.createAccount = onCall(async (request) => {
    // 1. Auth Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be logged in.');
    }

    // 2. Role Check (Only Super Admin can create admins, potentially)
    // For now, simpler: Any admin can create users? Or just Super Admin?
    // Let's enforce Super Admin for creating other Admins, but maybe Admin can create Shareholders.
    // To keep it simple for now: valid Admin required.

    // We can verify the caller's role by checking their Firestore doc
    const callerEmail = request.auth.token.email;
    const callerDoc = await admin.firestore().collection('shareholders').doc(callerEmail).get();

    if (!callerDoc.exists) {
        throw new HttpsError('permission-denied', 'Caller not found in database.');
    }

    const callerRole = callerDoc.data().role || 'shareholder';
    const isSuperAdmin = callerRole === 'super_admin';
    const isAdmin = callerRole === 'admin';

    if (!isSuperAdmin && !isAdmin) {
        throw new HttpsError('permission-denied', 'Insufficient permissions.');
    }

    const { email, password, name, role } = request.data;

    // Validate Role Assignment
    if (role === 'super_admin' && !isSuperAdmin) {
        throw new HttpsError('permission-denied', 'Only Super Admins can create Super Admins.');
    }
    if (role === 'admin' && !isSuperAdmin) {
        // Maybe allow Admins to create other Admins? For now, stick to Super Admin being the master.
        // Let's allow Admins to create Shareholders only.
        throw new HttpsError('permission-denied', 'Only Super Admins can create Admins.');
    }

    try {
        // 3. Create Auth User
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: name,
        });

        // 4. Create Firestore Document
        await admin.firestore().collection('shareholders').doc(email).set({
            email,
            displayName: name,
            role: role || 'shareholder',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: callerEmail
        });

        logger.info(`User created: ${email} by ${callerEmail}`);
        return { success: true, uid: userRecord.uid };

    } catch (error) {
        logger.error("Error creating user:", error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Deletes a user account (Auth + Firestore).
 * Restricted to Admins.
 */
exports.deleteAccount = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be logged in.');
    }

    const { email } = request.data;

    if (!email) {
        throw new HttpsError('invalid-argument', 'Email is required.');
    }

    // Prevent deleting self
    if (email === request.auth.token.email) {
        throw new HttpsError('invalid-argument', 'Cannot delete your own account.');
    }

    // Role Check
    const callerDoc = await admin.firestore().collection('shareholders').doc(request.auth.token.email).get();
    const callerRole = callerDoc.data().role;

    if (callerRole !== 'super_admin' && callerRole !== 'admin') {
        throw new HttpsError('permission-denied', 'Insufficient permissions.');
    }

    // If caller is 'admin', they cannot delete 'super_admin'
    const targetDoc = await admin.firestore().collection('shareholders').doc(email).get();
    if (targetDoc.exists) {
        const targetRole = targetDoc.data().role;
        if (targetRole === 'super_admin') {
            throw new HttpsError('permission-denied', 'Cannot delete a Super Admin.');
        }
    }

    try {
        // 1. Get Auth User (to get UID)
        // Note: getUserByEmail throws if not found, handle gracefully
        let uid;
        try {
            const userRecord = await admin.auth().getUserByEmail(email);
            uid = userRecord.uid;
        } catch (e) {
            if (e.code !== 'auth/user-not-found') throw e;
        }

        // 2. Delete Auth User
        if (uid) {
            await admin.auth().deleteUser(uid);
        }

        // 3. Delete Firestore Doc
        await admin.firestore().collection('shareholders').doc(email).delete();

        logger.info(`User deleted: ${email} by ${request.auth.token.email}`);
        return { success: true };

    } catch (error) {
        logger.error("Error deleting user:", error);
        throw new HttpsError('internal', error.message);
    }
});
