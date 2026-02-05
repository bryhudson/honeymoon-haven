const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { calculateDraftSchedule, getShareholderOrder } = require("../helpers/shareholders");
const { sendGmail, gmailSecrets } = require("../helpers/email");
const { emailTemplates } = require("../helpers/emailTemplates");

if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

exports.debugShareholder = onRequest({ secrets: gmailSecrets }, async (req, res) => {
    try {
        const targetName = req.query.name || "Jeff & Lori";
        const action = req.query.action || "inspect"; // 'inspect' or 'simulate'
        const result = { targetName, action, logs: [] };

        const log = (msg) => {
            console.log(msg);
            result.logs.push(msg);
        };

        if (action === 'simulate_lifecycle') {
            log("🎬 Starting Lifecycle Simulation...");
            const bookingId = "SIMULATION_" + Date.now();
            const docRef = admin.firestore().collection("bookings").doc(bookingId);

            // 1. Create PENDING
            log(`[1/2] Creating ${bookingId} as PENDING...`);
            await docRef.set({
                createdAt: new Date(),
                uid: "user_sim",
                cabinId: "7",
                checkInDate: new Date("2026-06-01"),
                checkOutDate: new Date("2026-06-08"),
                status: "pending",
                test: true,
                note: "Debug Lifecycle Test"
            });
            log("   -> Created. Sleeping 2s...");
            await new Promise(r => setTimeout(r, 2000));

            // 2. Update CONFIRMED
            log(`[2/2] Updating ${bookingId} to CONFIRMED...`);
            await docRef.update({ status: "confirmed" });

            log("✅ Update complete. Check logs for trigger firing.");
            result.lifecycleTest = "Updated " + bookingId + " to confirmed";

        } else if (action === 'smoke_test') {
            log("🔥 Running Smoke Test: Writing to 'bookings/TRIGGER_VITALITY_TEST'...");
            const testDocRef = admin.firestore().collection("bookings").doc("TRIGGER_VITALITY_TEST");
            await testDocRef.set({
                createdAt: new Date(),
                test: true,
                status: 'test_ignore',
                note: "Smoke test triggered via debugShareholder at " + new Date().toISOString()
            });
            log("✅ Write complete. Check onBookingChangeTrigger logs.");
            result.smokeTest = "Wrote to bookings/TRIGGER_VITALITY_TEST";
        } else if (action === 'simulate') {
            // --- SIMULATION MODE ---
            log("Starting Simulation for: " + targetName);

            // 1. Fetch Bookings & Settings
            const settingsDoc = await db.collection("settings").doc("general").get();
            const settings = settingsDoc.exists ? settingsDoc.data() : {};
            log("Settings loaded. TestMode: " + settings.isTestMode);

            const bookingsSnapshot = await db.collection("bookings").get();
            const allBookings = bookingsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(doc.data().createdAt),
                from: doc.data().from?.toDate(),
                to: doc.data().to?.toDate()
            }));
            log(`Bookings loaded: ${allBookings.length}`);

            // 2. Calc Schedule
            const year = 2026;
            const shareholders = getShareholderOrder(year);

            const schedule = calculateDraftSchedule(
                shareholders,
                allBookings,
                new Date(),
                settings.draftStartDate?.toDate(),
                settings.bypassTenAM
            );
            log(`Schedule Calc: Active=${schedule.activePicker}, Next=${schedule.nextPicker}`);

            // Force Active Picker to target if provided (for testing specific user email fail)
            const nextPickerName = schedule.activePicker;

            if (nextPickerName === targetName) {
                log(`Target matches Active Picker. Proceeding to lookup.`);

                const nextUserQuery = await db.collection("shareholders").where("name", "==", nextPickerName).limit(1).get();

                if (!nextUserQuery.empty) {
                    const nextUser = nextUserQuery.docs[0].data();
                    log(`User Found: ${nextUser.email}`);

                    // Templates
                    const emailParams = {
                        name: nextPickerName,
                        previous_shareholder: "Previous Shareholder", // simplified
                        deadline_date: formatDate(schedule.windowEnds),
                        deadline_time: formatTime(schedule.windowEnds),
                        round: schedule.round,
                        phase: schedule.phase
                    };

                    log("Hydrating Template...");
                    try {
                        const { subject, htmlContent } = emailTemplates.turnPassedNext(emailParams);
                        log(`Template Hydrated. Subject: ${subject}`);

                        // Send
                        log("Attempting Send...");
                        const sendRes = await sendGmail({
                            to: { name: nextPickerName, email: nextUser.email },
                            subject: subject,
                            htmlContent: htmlContent
                        });
                        log(`Send Success: ${JSON.stringify(sendRes)}`);
                        result.success = true;
                    } catch (tmplErr) {
                        log(`Template/Send Failed: ${tmplErr.message}`);
                        result.error = tmplErr.message;
                    }

                } else {
                    log("User NOT found in DB query.");
                }
            } else {
                log(`Target (${targetName}) is NOT the active picker (${nextPickerName}). Simulation skipped. (Verify schedule state)`);
            }

        } else if (action === 'inspect_bookings') {
            const bookingsSnapshot = await db.collection("bookings").orderBy("createdAt", "desc").limit(5).get();
            result.bookings = bookingsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()?.toISOString()
            }));
        } else {
            // --- INSPECT MODE ---
            // 1. Check Shareholder Doc
            const snapshot = await db.collection("shareholders").where("name", "==", targetName).get();
            if (snapshot.empty) {
                result.found = false;
                const all = await db.collection("shareholders").select("name").get();
                result.allNames = all.docs.map(d => d.data().name);
            } else {
                result.found = true;
                result.data = snapshot.docs[0].data();
            }

            // 2. Check Schedule Calculation
            const bookingsSnapshot = await db.collection("bookings").get();
            const allBookings = bookingsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(doc.data().createdAt),
                from: doc.data().from?.toDate(),
                to: doc.data().to?.toDate()
            }));

            const settingsDoc = await db.collection("settings").doc("general").get();
            const settings = settingsDoc.exists ? settingsDoc.data() : {};

            const year = 2026;
            const shareholders = getShareholderOrder(year);

            const schedule = calculateDraftSchedule(
                shareholders,
                allBookings,
                new Date(),
                settings.draftStartDate?.toDate(),
                settings.bypassTenAM
            );

            result.schedule = {
                activePicker: schedule.activePicker,
                nextPicker: schedule.nextPicker,
                phase: schedule.phase,
                trace: "Schedule Calc Completed"
            };

            // 3. Simulate Email Lookup
            if (schedule.nextPicker) {
                const nextQ = await db.collection("shareholders").where("name", "==", schedule.nextPicker).get();
                result.nextPickerLookup = {
                    name: schedule.nextPicker,
                    found: !nextQ.empty,
                    email: !nextQ.empty ? nextQ.docs[0].data().email : "N/A"
                };
            }
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

function toDate(input) {
    if (!input) return null;
    if (input.toDate) return input.toDate();
    if (typeof input === 'string') return new Date(input);
    return input;
}

function formatDate(input) {
    const date = toDate(input);
    if (!date || isNaN(date.getTime())) return "Unknown Date";
    return date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Vancouver' });
}

function formatTime(input) {
    const date = toDate(input);
    if (!date || isNaN(date.getTime())) return "Unknown Time";
    return date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Vancouver' });
}
