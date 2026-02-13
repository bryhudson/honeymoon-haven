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

// Helper for Scheduler Logic Inspection
exports.diagnoseScheduler = onRequest({ secrets: gmailSecrets }, async (req, res) => {
    try {
        const result = {
            now: new Date().toISOString(),
            nowPST: new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }),
            checks: []
        };

        // 1. Fetch Status
        const statusDoc = await db.collection("status").doc("draftStatus").get();
        if (!statusDoc.exists) {
            return res.json({ error: "No draftStatus found." });
        }
        const status = statusDoc.data();
        result.status = {
            activePicker: status.activePicker,
            round: status.round,
            windowStarts: status.windowStarts ? status.windowStarts.toDate().toISOString() : null,
            windowEnds: status.windowEnds ? status.windowEnds.toDate().toISOString() : null,
            testMode: status.testMode || false
        };

        if (!status.activePicker || !status.windowStarts) {
            return res.json({ ...result, error: "Missing activePicker or windowStarts" });
        }

        // 2. Fetch Log
        const logId = `${status.activePicker}-${status.round}`;
        const logDoc = await db.collection("notification_log").doc(logId).get();
        const logData = logDoc.exists ? logDoc.data() : {};
        result.log = logData;

        // 3. Calculate Targets (Replicating Scheduler Logic)
        const turnStart = status.windowStarts.toDate();
        const turnEnd = status.windowEnds ? status.windowEnds.toDate() : new Date(turnStart.getTime() + 48 * 60 * 60 * 1000);

        // Define Helper (Inline for safety/fidelity)
        function getTargetPstTime(baseDate, targetHour, daysOffset = 0) {
            const adjustedDate = new Date(baseDate);
            adjustedDate.setDate(adjustedDate.getDate() + daysOffset);

            const ptParts = new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/Los_Angeles',
                year: 'numeric', month: 'numeric', day: 'numeric'
            }).formatToParts(adjustedDate);

            const year = parseInt(ptParts.find(p => p.type === 'year').value);
            const month = parseInt(ptParts.find(p => p.type === 'month').value);
            const day = parseInt(ptParts.find(p => p.type === 'day').value);

            // Initial guess: UTC = Target + 8h (Standard PST offset)
            const guess = new Date(Date.UTC(year, month - 1, day, targetHour + 8, 0, 0, 0));

            // Verify
            const checkParts = new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false
            }).formatToParts(guess);
            const actualHour = parseInt(checkParts.find(p => p.type === 'hour').value);

            if (actualHour !== targetHour) {
                guess.setUTCHours(guess.getUTCHours() + (targetHour - actualHour));
            }
            return guess;
        }

        const targets = {
            sameDayEvening: { time: getTargetPstTime(turnStart, 19, 0), key: 'sameDayEveningSent', label: 'Day 1 Evening (7pm)' },
            officialTurnStart: { time: getTargetPstTime(turnStart, 10, 0), key: 'officialStartSent', label: 'Official Start (10am)' },
            nextDayMorning: { time: getTargetPstTime(turnStart, 9, 1), key: 'nextDayMorningSent', label: 'Day 2 Morning (9am)' },
            nextDayEvening: { time: getTargetPstTime(turnStart, 19, 1), key: 'nextDayEveningSent', label: 'Day 2 Evening (7pm)' },
            finalMorning6am: { time: getTargetPstTime(turnEnd, 6, 0), key: 'finalMorning6amSent', label: 'Day 3 Morning (6am)' }, // Note: Logic might be T-4h
            finalMorning9am: { time: getTargetPstTime(turnEnd, 9, 0), key: 'finalMorning9amSent', label: 'Day 3 Urgent (9am)' }
        };

        // Note: verify final logic in scheduler uses turnEnd or getTargetPstTime?
        // Scheduler uses: const finalMorning9am = new Date(turnEnd.getTime() - 60 * 60 * 1000); // T-1h
        // Scheduler uses: const finalMorning6am = new Date(turnEnd.getTime() - 4 * 60 * 60 * 1000); // T-4h
        // Let's match scheduler EXACTLY for finals
        targets.finalMorning9am.time = new Date(turnEnd.getTime() - 60 * 60 * 1000);
        targets.finalMorning6am.time = new Date(turnEnd.getTime() - 4 * 60 * 60 * 1000);

        result.targets = {};
        const now = new Date();

        // 4. Evaluate Conditions
        for (const [key, def] of Object.entries(targets)) {
            const isSent = !!logData[def.key];
            const isDue = now >= def.time;
            const pastDueHours = (now - def.time) / (1000 * 60 * 60);

            result.targets[key] = {
                label: def.label,
                scheduledTime: def.time.toISOString(),
                scheduledTimePST: def.time.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }),
                sent: isSent,
                due: isDue,
                pastDueHours: pastDueHours.toFixed(2),
                wouldSendNow: isDue && !isSent
            };
        }

        // 5. Simulate Priority Chain (Normal Mode)
        // If multiple are true, which one WINS?
        let winner = null;
        if (result.targets.finalMorning9am.wouldSendNow) winner = "finalMorning9am";
        else if (result.targets.finalMorning6am.wouldSendNow) winner = "finalMorning6am";
        else if (result.targets.nextDayEvening.wouldSendNow) winner = "nextDayEvening";
        else if (result.targets.nextDayMorning.wouldSendNow) winner = "nextDayMorning";
        else if (result.targets.sameDayEvening.wouldSendNow) winner = "sameDayEvening";
        else if (result.targets.officialTurnStart.wouldSendNow && logData.isEarlyAccess) winner = "officialTurnStart";

        result.priorityWinner = winner || "NONE";

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
