
const admin = require('firebase-admin');

// Initialize app - hopefully environment credentials work
// If not, we might need to be more creative or ask user
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const email = "bryan.m.hudson@gmail.com";
const newPassword = "9WAuRzy8Ex7omUerivsv";

async function updatePassword() {
    try {
        console.log(`Looking up user: ${email}`);
        const user = await admin.auth().getUserByEmail(email);
        console.log(`Found user ${user.uid}. Updating password...`);

        await admin.auth().updateUser(user.uid, {
            password: newPassword
        });

        console.log("Password updated successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Error updating password:", error);
        process.exit(1);
    }
}

updatePassword();
