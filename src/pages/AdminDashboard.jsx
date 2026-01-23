import React, { useState, useEffect } from 'react';
import { version } from '../../package.json';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CABIN_OWNERS, DRAFT_CONFIG, getShareholderOrder, mapOrderToSchedule } from '../lib/shareholders';
import { emailService } from '../services/emailService';
import { db, functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, writeBatch, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, addDoc, deleteField, getDoc, setDoc } from 'firebase/firestore';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ActionsDropdown } from '../components/ActionsDropdown';
import { format, differenceInDays, set } from 'date-fns';
import { Trash2, PlayCircle, Clock, Bell, Calendar, Settings, AlertTriangle, CheckCircle, DollarSign, Pencil, XCircle, Ban, Mail, Key, PlusCircle, Shield, Moon, Download, ArrowRight, ArrowLeft, List as ListIcon } from 'lucide-react';
import { EditBookingModal } from '../components/EditBookingModal';
import { UserActionsDropdown } from '../components/UserActionsDropdown';
import { ReauthenticationModal } from '../components/ReauthenticationModal';
import { PromptModal } from '../components/PromptModal';
import { CreateUserModal } from '../components/CreateUserModal';
import { AdminCalendarView } from '../components/AdminCalendarView';
import { ShareholderHero } from '../components/dashboard/ShareholderHero';
import { AdminTurnHero } from '../components/dashboard/AdminTurnHero';
import { SeasonSchedule } from '../components/dashboard/SeasonSchedule';
import { Users, UserPlus } from 'lucide-react';
import { SystemTab } from '../components/admin/SystemTab';

export function AdminDashboard() {
    const { currentUser } = useAuth();
    const IS_SITE_OWNER = currentUser?.email === 'bryan.m.hudson@gmail.com';

    const [actionLog, setActionLog] = useState("");
    const [allBookings, setAllBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    // Auth Modal State
    const [authModal, setAuthModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: async () => { }
    });

    // Modal State
    const [confirmation, setConfirmation] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { },
        isDanger: false,
        confirmText: "Confirm",
        showCancel: true
    });

    const triggerConfirm = (title, message, onConfirm, isDanger = false, confirmText = "Confirm", requireTyping = null) => {
        setConfirmation({ isOpen: true, title, message, onConfirm, isDanger, confirmText, showCancel: true, requireTyping });
    };

    const triggerAlert = (title, message) => {
        setConfirmation({ isOpen: true, title, message, onConfirm: () => { }, isDanger: false, confirmText: "OK", showCancel: false });
    };

    // Prompt Modal State
    const [promptData, setPromptData] = useState({
        isOpen: false,
        title: "",
        message: "",
        defaultValue: "",
        inputType: "text",
        confirmText: "Confirm",
        onConfirm: () => { }
    });

    const triggerPrompt = (title, message, defaultValue, onConfirm, inputType = "text", confirmText = "Confirm") => {
        setPromptData({ isOpen: true, title, message, defaultValue, onConfirm, inputType, confirmText });
    };

    // Helper for safely converting Firestore timestamps/strings to Dates
    const safeDate = (val) => {
        if (!val) return null;
        if (val.toDate) return val.toDate(); // Firestore Timestamp
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    };

    // Simulation State
    const [simStartDate, setSimStartDate] = useState("");
    const [currentSimDate, setCurrentSimDate] = useState(null);
    const [isSystemFrozen, setIsSystemFrozen] = useState(false);
    const [isTestMode, setIsTestMode] = useState(true); // Default to true for safety
    const [fastTestingMode, setFastTestingMode] = useState(false); // Fast testing mode (10min windows)
    const [bypassTenAM, setBypassTenAM] = useState(false); // Bypass 10am rule (Simulation mode)
    const [draftStatus, setDraftStatus] = useState(null);

    // Editing State
    const [editingBooking, setEditingBooking] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // View State for Bookings Tab
    const [bookingViewMode, setBookingViewMode] = useState('list'); // 'list' | 'calendar'
    const [tick, setTick] = useState(0); // Periodic update trigger

    // Force re-calculate schedule every minute to ensure "Active" status moves to next person
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 60000); // 1 minute
        return () => clearInterval(interval);
    }, []);

    // Fetch Settings & Bookings
    useEffect(() => {
        // 1. Settings
        const unsubSettings = onSnapshot(doc(db, "settings", "general"), async (doc) => {
            if (doc.exists() && doc.data().draftStartDate) {
                const d = doc.data().draftStartDate.toDate();
                setCurrentSimDate(d);
                setSimStartDate(format(d, "yyyy-MM-dd'T'HH:mm"));
                setIsSystemFrozen(doc.data().isSystemFrozen || false);
                setFastTestingMode(doc.data().fastTestingMode || false);
                setBypassTenAM(doc.data().bypassTenAM || false);
            } else {
                // AUTO-DEFAULT: Set to Normal Testing until Feb 15, 2026, then Production
                const now = new Date();
                const feb15_2026 = new Date(2026, 1, 15); // Month is 0-indexed, so 1 = February

                let defaultDate;
                let defaultBypassTenAM;
                let defaultMessage;

                if (now < feb15_2026) {
                    // Before Feb 15: Use Normal Testing (Today @ 6 AM)
                    defaultDate = new Date();
                    defaultDate.setHours(6, 0, 0, 0);
                    defaultBypassTenAM = false;
                    defaultMessage = "Auto-initialized to Normal Testing (Today @ 6 AM)";
                } else {
                    // After Feb 15: Use Production (March 1, 2026 @ 10 AM)
                    defaultDate = new Date(2026, 2, 1, 10, 0, 0); // March 1, 2026
                    defaultBypassTenAM = false;
                    defaultMessage = "Auto-initialized to Production (March 1, 2026)";
                }

                // Initialize settings in Firestore
                await setDoc(doc(db, "settings", "general"), {
                    draftStartDate: defaultDate,
                    bypassTenAM: defaultBypassTenAM,
                    fastTestingMode: false,
                    isSystemFrozen: false,
                    isTestMode: now < feb15_2026 ? true : false, // Auto-enable test mode until Feb 15 for email safety
                    autoInitialized: true,
                    autoInitMessage: defaultMessage
                }, { merge: true });

                console.log(defaultMessage);
                setCurrentSimDate(defaultDate);
                setSimStartDate(format(defaultDate, "yyyy-MM-dd'T'HH:mm"));
                setIsSystemFrozen(false);
                setFastTestingMode(false);
                setBypassTenAM(defaultBypassTenAM);
            }
        });

        // 1b. Draft Status (Active Picker)
        const unsubStatus = onSnapshot(doc(db, "status", "draftStatus"), (doc) => {
            if (doc.exists()) {
                setDraftStatus(doc.data());
            }
        });

        // 2. Bookings
        const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const bookings = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    from: safeDate(data.from),
                    to: safeDate(data.to),
                    createdAt: safeDate(data.createdAt)
                };
            });
            setAllBookings(bookings);
            setLoading(false);
        });
        return () => {
            unsubscribe();
            unsubSettings();
            unsubStatus();
        };
    }, []);

    const performWipe = async (overrideStartDate = null) => {
        setActionLog("Resetting database...");

        // 1. Delete all bookings
        const querySnapshot = await getDocs(collection(db, "bookings"));
        const totalDocs = querySnapshot.size;

        if (totalDocs > 0) {
            const CHUNK_SIZE = 500;
            const chunks = [];
            for (let i = 0; i < totalDocs; i += CHUNK_SIZE) {
                chunks.push(querySnapshot.docs.slice(i, i + CHUNK_SIZE));
            }

            let deletedCount = 0;
            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                deletedCount += chunk.length;
                console.log(`Deleted chunk of ${chunk.length} bookings. Total: ${deletedCount}`);
            }
        }

        // 2. Clear notification_log (critical for email system reset)
        const notificationSnapshot = await getDocs(collection(db, "notification_log"));
        if (notificationSnapshot.size > 0) {
            const batch = writeBatch(db);
            notificationSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`Deleted ${notificationSnapshot.size} notification log entries`);
        }

        // 3. Reset draftStatus (so scheduler knows to start fresh)
        await setDoc(doc(db, "status", "draftStatus"), {
            activePicker: null,
            windowStarts: null,
            windowEnds: null,
            round: 1,
            phase: 'ROUND_1'
        });
        console.log("Draft status reset");

        // 4. Reset Settings
        const defaultStart = overrideStartDate || new Date(2026, 2, 1, 10, 0, 0);

        await setDoc(doc(db, "settings", "general"), {
            draftStartDate: defaultStart,
            isSystemFrozen: false,
            bypassTenAM: false,
            season: 2026
        }, { merge: true });

        console.log("[DEBUG] performWipe: Settings reset command sent");

        const verifySnap = await getDoc(doc(db, "settings", "general"));
        const verifyDate = verifySnap.data()?.draftStartDate?.toDate ? verifySnap.data().draftStartDate.toDate() : verifySnap.data().draftStartDate;
        console.log("[DEBUG] performWipe: Verified DB Value: ", verifyDate);

        // 5. CRITICAL: Send turn start email immediately
        try {
            const order2026 = getShareholderOrder(2026);
            const firstShareholderName = order2026[0];

            const shareholdersSnapshot = await getDocs(collection(db, "shareholders"));
            const firstShareholder = shareholdersSnapshot.docs.map(d => d.data()).find(s => s.name === firstShareholderName);

            if (firstShareholder && firstShareholder.email) {
                const PICK_DURATION_MS = fastTestingMode ? (10 * 60 * 1000) : (48 * 60 * 60 * 1000);
                const deadline = new Date(defaultStart.getTime() + PICK_DURATION_MS);

                await emailService.sendTurnStarted(
                    { name: firstShareholderName, email: firstShareholder.email },
                    {
                        name: firstShareholderName,
                        deadline_date: format(deadline, 'PPP'),
                        deadline_time: format(deadline, 'p'),
                        booking_url: window.location.origin,
                        dashboard_url: window.location.origin,
                        pass_turn_url: window.location.origin,
                        phase: 'ROUND_1',
                        round: 1
                    }
                );
                console.log("Turn start email sent immediately to " + firstShareholderName);
            }
        } catch (emailError) {
            console.error("Failed to send turn start email:", emailError);
        }

        localStorage.clear();
        sessionStorage.clear();

        setActionLog(`Database wiped! ${totalDocs} bookings deleted, notification log cleared, draft status reset.`);
        return totalDocs;
    };

    // Helper to trigger password check
    const requireAuth = (title, message, action) => {
        setAuthModal({
            isOpen: true,
            title,
            message,
            onConfirm: action
        });
    };

    const handleWipeDatabase = () => {
        requireAuth(
            "Wipe Database Audit",
            "This action is destructive and irreversible. Please re-authenticate.",
            () => {
                triggerConfirm(
                    "EXTREME DANGER: Wipe Database",
                    "You are about to PERMANENTLY DELETE ALL BOOKINGS. This cannot be undone.\n\nAre you absolutely sure?",
                    async () => {
                        try {
                            const count = await performWipe();
                            triggerAlert("Success", `Database wiped. ${count} records deleted.`);
                        } catch (err) {
                            console.error(err);
                            triggerAlert("Error", "Wipe failed: " + err.message);
                        }
                    },
                    true,
                    "NUKE DATA"
                );
            }
        );
    };

    const handleToggleFreeze = async () => {
        requireAuth(
            "Security Check: Toggle Maintenance Mode",
            "You are about to change the system maintenance state. Please verify your password.",
            async () => {
                try {
                    const settingsRef = doc(db, "settings", "general");
                    const snap = await getDoc(settingsRef);
                    const current = snap.exists() ? snap.data().isSystemFrozen : false;

                    await setDoc(settingsRef, { isSystemFrozen: !current }, { merge: true });
                    triggerAlert("Success", `System is now ${!current ? 'in MAINTENANCE MODE' : 'ACTIVE'}.`);
                } catch (e) {
                    console.error(e);
                    triggerAlert("Error", "Failed to update system state.");
                }
            }
        );
    };

    const handleDownloadCSV = () => {
        // Use the same logic as the system backup (chronological master list)
        generateAndDownloadCSV(false);
    };

    const handleEmailBookingReport = () => {
        // Generate Master Booking Report (Chronological)
        const sortedBookings = [...allBookings].sort((a, b) => {
            const da = a.from ? new Date(a.from) : new Date(0);
            const db = b.from ? new Date(b.from) : new Date(0);
            return da - db;
        });

        // Filter out purely technical records if desired, or keep them. 
        // User asked for "full season calendar data". Usually implies "actual bookings".
        // Let's filter out 'pass' records for the email report to keep it clean, or keep them if they want "full log".
        // The visual calendar excludes passes, so let's exclude them here to match "Calendar Data".
        const reportBookings = sortedBookings.filter(b => b.type !== 'pass' && b.type !== 'auto-pass' && b.type !== 'cancelled');

        const generateRowHtml = (b) => {
            const paymentStatus = b?.isPaid ? "PAID" : "UNPAID";
            const paymentColor = b?.isPaid ? "#dcfce7" : "#fee2e2";
            const dateStr = b?.from && b?.to ? `${format(b.from, 'MMM d')} - ${format(b.to, 'MMM d, yyyy')}` : "N/A";
            const statusLabel = b.isFinalized ? "Finalized" : "Draft";
            const nights = (b.from && b.to) ? differenceInDays(b.to, b.from) : 0;

            return `
            <tr style="background-color: #fff;">
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${b.shareholderName}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${b.cabinNumber || "?"}</td>
                 <td style="padding: 8px; border-bottom: 1px solid #eee;">${b.guests || 1}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${dateStr}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${nights}</td>
                 <td style="padding: 8px; border-bottom: 1px solid #eee;">${statusLabel}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">
                    <span style="background-color: ${paymentColor}; padding: 2px 6px; borderRadius: 4px; font-size: 11px;">${paymentStatus}</span>
                </td>
            </tr>
            `;
        };

        triggerPrompt(
            "Email Season Report",
            "Enter recipient email:",
            currentUser?.email || "",
            async (recipient) => {
                if (!recipient) return;
                try {
                    const rows = reportBookings.map(generateRowHtml).join("");

                    const htmlTable = `
                        <h2>2026 Season Booking Report</h2>
                        <p>Generated on ${format(new Date(), 'PPP p')}</p>
                        <p>Showing ${reportBookings.length} active bookings.</p>

                        <div style="display: flex; gap: 20px; margin: 30px 0; flex-wrap: wrap;">
                             <div style="background-color: #f0fdf4; border: 1px solid #dcfce7; padding: 15px; border-radius: 8px; flex: 1; min-width: 150px;">
                                <div style="color: #166534; font-size: 11px; font-weight: bold; text-transform: uppercase;">Total Revenue</div>
                                <div style="color: #166534; font-size: 24px; font-weight: bold;">$${analytics.totalRevenue.toLocaleString()}</div>
                             </div>
                             <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 15px; border-radius: 8px; flex: 1; min-width: 150px;">
                                <div style="color: #92400e; font-size: 11px; font-weight: bold; text-transform: uppercase;">Unpaid Fees</div>
                                <div style="color: #92400e; font-size: 24px; font-weight: bold;">$${analytics.outstandingFees.toLocaleString()} <span style="font-size: 14px; opacity: 0.8;">(${analytics.unpaidCount})</span></div>
                             </div>
                             <div style="background-color: #feffff; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; flex: 1; min-width: 150px;">
                                <div style="color: #64748b; font-size: 11px; font-weight: bold; text-transform: uppercase;">Bookings</div>
                                <div style="color: #0f172a; font-size: 24px; font-weight: bold;">${reportBookings.length}</div>
                             </div>
                             <div style="background-color: #feffff; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; flex: 1; min-width: 150px;">
                                <div style="color: #64748b; font-size: 11px; font-weight: bold; text-transform: uppercase;">Total Nights</div>
                                <div style="color: #0f172a; font-size: 24px; font-weight: bold;">${analytics.totalNights}</div>
                             </div>
                        </div>
                        
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-family: sans-serif; font-size: 14px; margin-top: 20px;">
                            <thead>
                                <tr style="background-color: #f8fafc;">
                                    <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Shareholder</th>
                                    <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Cabin</th>
                                     <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Guests</th>
                                    <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Dates</th>
                                    <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Nights</th>
                                    <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Status</th>
                                    <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Payment</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    `;

                    await emailService.sendEmail({
                        to: { name: "Admin", email: recipient },
                        subject: `Date-Ordered Booking Report - ${format(new Date(), 'MMM d')}`,
                        htmlContent: htmlTable
                    });

                    triggerAlert("Success", `Report sent to ${recipient}`);
                } catch (err) {
                    console.error("Report fail", err);
                    triggerAlert("Error", "Failed to send report.");
                }
            },
            "text",
            "Generate Report"
        );
    };

    const handleUpdateStartDate = async () => {
        if (!simStartDate) return triggerAlert("Error", "Please select a date.");

        requireAuth(
            "Protected Action",
            "You are about to override the simulation start date. This requires password verification.",
            async () => {
                try {
                    const date = new Date(simStartDate);
                    if (isNaN(date.getTime())) throw new Error("Invalid Date");

                    const batch = writeBatch(db);
                    const settingsRef = doc(db, "settings", "general");
                    batch.set(settingsRef, { draftStartDate: date }, { merge: true });
                    await batch.commit();

                    triggerAlert("Success", "Simulation Start Date updated.");
                } catch (err) {
                    triggerAlert("Error", err.message);
                }
            }
        );
    };

    const handleResetSimulation = async () => {
        requireAuth(
            "Protected Action",
            "You are about to reset the simulation to default settings. This requires password verification.",
            async () => {
                try {
                    const batch = writeBatch(db);
                    const settingsRef = doc(db, "settings", "general");
                    batch.update(settingsRef, { draftStartDate: null });
                    await batch.commit();
                    triggerAlert("Success", "Simulation reset to default schedule.");
                } catch (err) {
                    try {
                        await updateDoc(doc(db, "settings", "general"), {
                            draftStartDate: null
                        });
                    } catch (e) {
                        // ignore
                    }
                }
            }
        );
    };


    // --- SYSTEM CONTROLS ---

    const generateAndDownloadCSV = (silent = false) => {
        try {
            const headers = ["Shareholder,Cabin,Check In,Check Out,Nights,Status,Payment Status"];
            const rows = allBookings
                .sort((a, b) => {
                    const da = a.from ? new Date(a.from) : new Date(0);
                    const db = b.from ? new Date(b.from) : new Date(0);
                    return da - db;
                })
                .map(b => {
                    const checkIn = (b.type !== 'pass' && b.type !== 'auto-pass' && b.from) ? (b.from instanceof Date ? format(b.from, 'yyyy-MM-dd') : formatDate(b.from)) : "";
                    const checkOut = (b.type !== 'pass' && b.type !== 'auto-pass' && b.to) ? (b.to instanceof Date ? format(b.to, 'yyyy-MM-dd') : formatDate(b.to)) : "";
                    const nights = (b.from && b.to && b.type !== 'pass' && b.type !== 'auto-pass') ? Math.round((new Date(b.to) - new Date(b.from)) / (1000 * 60 * 60 * 24)) : 0;

                    let status = "Draft";
                    if (b.type === 'cancelled') status = "Cancelled";
                    else if (b.type === 'pass') status = "Passed";
                    else if (b.type === 'auto-pass') status = "Auto-Passed";
                    else if (b.isFinalized) status = "Finalized";

                    const payment = b.isPaid ? "PAID" : (status === "Finalized" ? "UNPAID" : "-");

                    return `"${b.shareholderName}","${b.cabinNumber || ''}","${checkIn}","${checkOut}","${nights}","${status}","${payment}"`;
                });

            const csvContent = [headers, ...rows].join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `bookings_backup_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            if (!silent) triggerAlert("Success", "CSV Downloaded.");
            return true;
        } catch (e) {
            console.error(e);
            triggerAlert("Error", "Failed to export CSV.");
            return false;
        }
    };

    const handleResetDB = async () => {
        triggerConfirm(
            "⚠️ DANGER: WIPE DATABASE",
            "Are you sure you want to delete ALL bookings? This cannot be undone.",
            () => {
                // Auto-backup
                generateAndDownloadCSV(true); // Silent mode

                setTimeout(() => {
                    requireAuth(
                        "Security Check: Wipe Database",
                        "High-risk action detected. Backup initiated. Please verify your identity to proceed with database wipe.",
                        async () => {
                            try {
                                const count = await performWipe();
                                triggerAlert("Reset Complete", `✅ Reset Complete.\n\nDeleted ${count} records. Reloading...`);
                                setTimeout(() => window.location.reload(), 2000);
                            } catch (err) {
                                console.error(err);
                                triggerAlert("Error", err.message);
                            }
                        }
                    );
                }, 300);
            },
            true, // Danger
            "Proceed to Auth"
        );
    };

    const toggleSystemFreeze = () => {
        triggerConfirm(
            "System Configuration",
            `Are you sure you want to turn Maintenance Mode ${!isSystemFrozen ? 'ON' : 'OFF'}? Users will ${!isSystemFrozen ? 'NOT' : ''} be able to make bookings.`,
            async () => {
                try {
                    await updateDoc(doc(db, "settings", "general"), {
                        isSystemFrozen: !isSystemFrozen
                    });
                    triggerAlert("Success", `System is now ${!isSystemFrozen ? 'in Maintenance Mode' : 'Active'}`);
                } catch (err) {
                    console.error("Failed to toggle freeze:", err);
                    triggerAlert("Error", "Failed to update freeze settings.");
                }
            },
            !isSystemFrozen, // Danger if turning ON
            !isSystemFrozen ? "Enable Maintenance" : "Disable Maintenance"
        );
    };

    const toggleTestMode = async () => {
        // 1. Strict Email Check - Removed strict check for HHR Admin
        // if (currentUser?.email !== 'bryan.m.hudson@gmail.com') {
        //     triggerAlert("Access Denied", "Only the site owner (bryan.m.hudson@gmail.com) can toggle Test Mode.");
        //     return;
        // }

        // 2. Require Re-Auth (Password Check)
        requireAuth(
            "Security Check: Toggle Test Mode",
            `You are about to switch the system into ${!isTestMode ? 'TEST MODE' : 'PRODUCTION MODE'}. Please verify your password.`,
            async () => {
                try {
                    await setDoc(doc(db, "settings", "general"), {
                        isTestMode: !isTestMode
                    }, { merge: true });
                    setIsTestMode(!isTestMode);
                    triggerAlert("Success", `Test Mode is now ${!isTestMode ? 'ON (Redirecting Emails)' : 'OFF (Real Production Emails)'}`);
                } catch (err) {
                    console.error("Failed to toggle test mode:", err);
                    triggerAlert("Error", "Failed to update test mode settings.");
                }
            }
        );
    };

    const toggleFastTestingMode = async () => {
        const newValue = !fastTestingMode;

        if (newValue) {
            // Enabling - requires password and confirmation
            requireAuth(
                "Security Check: Enable Fast Testing Mode",
                "You are about to enable Fast Testing Mode (10-minute windows + database wipe). Please verify your password.",
                () => {
                    triggerConfirm(
                        "Enable Fast Testing Mode",
                        "This will:\n- Change turn windows from 48 hours to 10 minutes\n- Start turns immediately (no next-day buffer)\n- WIPE THE DATABASE for a clean testing slate\n\nAre you sure?",
                        async () => {
                            try {
                                const now = new Date();
                                const count = await performWipe(now);
                                await setDoc(doc(db, "settings", "general"), {
                                    fastTestingMode: true,
                                    draftStartDate: now,
                                    bypassTenAM: true // Also bypass 10am rule in fast mode
                                }, { merge: true });
                                setFastTestingMode(true);
                                triggerAlert("Fast Testing Mode Enabled", `Database wiped (${count} records). Turn windows are now 10 minutes.`);
                            } catch (err) {
                                console.error("Failed to enable fast testing mode:", err);
                                triggerAlert("Error", "Failed to enable fast testing mode: " + err.message);
                            }
                        },
                        true,
                        "Enable & Wipe"
                    );
                }
            );
        } else {
            // Disabling - requires password
            requireAuth(
                "Security Check: Disable Fast Testing Mode",
                "You are about to disable Fast Testing Mode and restore normal 48-hour windows. Please verify your password.",
                async () => {
                    try {
                        await setDoc(doc(db, "settings", "general"), {
                            fastTestingMode: false,
                            bypassTenAM: false // Return to 10am rule
                        }, { merge: true });
                        setFastTestingMode(false);
                        triggerAlert("Fast Testing Mode Disabled", "Turn windows restored to normal (48 hours).");
                    } catch (err) {
                        console.error("Failed to disable fast testing mode:", err);
                        triggerAlert("Error", "Failed to update fast testing mode settings.");
                    }
                }
            );
        }
    };


    const handleAddAdmin = () => {
        requireAuth(
            "Security Check: Add Administrator",
            "This action grants high-level access to the system. Please verify your password to proceed.",
            () => {
                setCreateUserRole('admin');
                setIsCreateUserModalOpen(true);
            }
        );
    };

    const handleEditClick = (booking) => {
        setEditingBooking(booking);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async (updatedBooking) => {
        try {
            const payload = { ...updatedBooking };
            if (payload.type === null) {
                payload.type = deleteField();
            }
            // Ensure no undefined values (Firestore rejects them)
            Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

            await updateDoc(doc(db, "bookings", updatedBooking.id), payload);

            setIsEditModalOpen(false);
            setEditingBooking(null);
            triggerAlert("Success", "Booking updated successfully.");
        } catch (err) {
            triggerAlert("Error", err.message);
        }
    };

    const handleDeleteBooking = (bookingId, details) => {
        triggerConfirm(
            "Delete Booking?",
            `Are you sure you want to delete the booking for ${details}? This cannot be undone.`,
            () => {
                setTimeout(() => {
                    requireAuth(
                        "Delete Booking",
                        "Please verify your password to permanently delete this booking.",
                        async () => {
                            try {
                                await deleteDoc(doc(db, "bookings", bookingId));
                                triggerAlert("Success", "Booking deleted successfully.");
                            } catch (err) {
                                triggerAlert("Error", err.message);
                            }
                        }
                    );
                }, 300);
            },
            true,
            "Delete"
        );
    };

    const handleToggleFinalized = async (bookingId, currentStatus) => {
        try {
            await updateDoc(doc(db, "bookings", bookingId), {
                isFinalized: !currentStatus
            });
            triggerAlert("Success", `Booking ${!currentStatus ? 'finalized' : 'reverted to draft'}.`);
        } catch (err) {
            triggerAlert("Error", err.message);
        }
    };

    const handleTogglePaid = async (booking) => {
        if (booking.isPaid) {
            // Un-pay
            triggerConfirm(
                "Mark as Unpaid?",
                `Are you sure you want to revert the payment status for ${booking.shareholderName}?`,
                async () => {
                    try {
                        await updateDoc(doc(db, "bookings", booking.id), { isPaid: false, celebrated: false });
                        triggerAlert("Success", "Marked as Unpaid.");
                    } catch (err) {
                        triggerAlert("Error", err.message);
                    }
                },
                false,
                "Mark Unpaid"
            );
        } else {
            // Mark as Paid
            const start = booking.from;
            const end = booking.to;
            const nights = differenceInDays(end, start);
            const amount = nights * 125;

            triggerConfirm(
                "Confirm Payment & Send Email",
                `Mark booking for ${booking.shareholderName} as PAID?\n\nAmount: $${amount}\n\nThis will send a confirmation email to the user.`,
                async () => {
                    try {
                        // 1. Update DB
                        await updateDoc(doc(db, "bookings", booking.id), { isPaid: true, celebrated: false });

                        // 2. Send Email
                        // Find email address
                        const owner = shareholders.find(o => o.name === booking.shareholderName);
                        const userEmail = owner ? owner.email : "bryan.m.hudson@gmail.com";

                        await emailService.sendPaymentReceived({
                            name: booking.shareholderName,
                            email: "bryan.m.hudson@gmail.com" // OVERRIDE for safety/demo, could use userEmail
                        }, {
                            name: booking.shareholderName,
                            amount: amount.toLocaleString(),
                            check_in: format(start, 'MMM d, yyyy'),
                            check_out: format(end, 'MMM d, yyyy'),
                            cabin_number: booking.cabinNumber,
                            dashboard_url: window.location.origin
                        });

                        triggerAlert("Success", "Payment recorded and email sent! 💰");
                    } catch (err) {
                        triggerAlert("Error", err.message);
                    }
                },
                false,
                "Confirm & Send"
            );
        }
    };

    const handleSendPaymentReminder = async (booking) => {
        triggerConfirm(
            "Send Payment Reminder?",
            `Send an email reminder to ${booking.shareholderName} (Cabin #${booking.cabinNumber}) for $${booking.totalPrice}?`,
            async () => {
                try {
                    const owner = shareholders.find(o => o.name === booking.shareholderName);
                    const emailTo = "bryan.m.hudson@gmail.com"; // OVERRIDE for safety/demo

                    await emailService.sendPaymentReminder({
                        name: booking.shareholderName,
                        email: emailTo
                    }, {
                        name: booking.shareholderName,
                        total_price: booking.totalPrice,
                        cabin_number: booking.cabinNumber,
                        check_in: format(booking.from, 'PPP'),
                        payment_deadline: "within 12 hours",
                        dashboard_url: window.location.origin
                    });
                    triggerAlert("Success", "Payment reminder sent.");
                } catch (err) {
                    console.error(err);
                    triggerAlert("Error", "Failed to send reminder.");
                }
            },
            false,
            "Send Email"
        );
    };



    const handleTestEmail = async () => {
        triggerConfirm(
            "Send Test Email?",
            "Send a test email to bryan.m.hudson@gmail.com to verify Gmail SMTP?",
            async () => {
                try {
                    await emailService.sendEmail({
                        to: { name: "Test User", email: "bryan.m.hudson@gmail.com" },
                        subject: "Test Email from Admin Dashboard",
                        htmlContent: "<p>This is a test email sent from the Admin Dashboard to verify the new Gmail SMTP integration.</p>"
                    });
                    triggerAlert("Success", "Test email sent. Check inbox.");
                } catch (err) {
                    console.error(err);
                    triggerAlert("Error", "Failed to send test email: " + err.message);
                }
            },
            false,
            "Send Test"
        );
    };

    const handleCancelBooking = (booking) => {
        triggerConfirm(
            "Cancel Booking?",
            `Are you sure you want to CANCEL the booking for ${booking.shareholderName}? This will free up the dates but keep a record.`,
            async () => {
                try {
                    // 1. Update Database (Priority)
                    await updateDoc(doc(db, "bookings", booking.id), {
                        type: 'cancelled',
                        cancelledAt: new Date(),
                        isFinalized: false,
                        isPaid: false,
                        celebrated: false
                    });

                    // 2. Send "Booking Cancelled" Email (Non-Blocking)
                    try {
                        const owner = shareholders.find(o => o.name === booking.shareholderName);
                        const emailTo = {
                            name: booking.shareholderName,
                            email: owner?.email || "bryan.m.hudson@gmail.com"
                        };
                        // Initial Data Fetch
                        useEffect(() => {
                            const fetchSettings = async () => {
                                try {
                                    const docRef = doc(db, "settings", "general");
                                    const snapshot = await getDoc(docRef);
                                    if (snapshot.exists()) {
                                        const data = snapshot.data();
                                        if (data.draftStartDate) {
                                            setSimStartDate(format(data.draftStartDate.toDate(), 'yyyy-MM-dd HH:mm'));
                                            setCurrentSimDate(data.draftStartDate.toDate());
                                        }
                                        if (data.isSystemFrozen !== undefined) setIsSystemFrozen(data.isSystemFrozen);
                                        if (data.isTestMode !== undefined) setIsTestMode(data.isTestMode);
                                    }
                                } catch (err) {
                                    console.error("Failed to fetch settings", err);
                                }
                            };
                            fetchSettings();
                        }, []);

                        // Helper for safe date formatting
                        const safeFormat = (dateObj) => {
                            try {
                                if (!dateObj) return "N/A";
                                if (dateObj.toDate) return format(dateObj.toDate(), 'MMM d, yyyy');
                                const d = new Date(dateObj);
                                return isNaN(d.getTime()) ? "N/A" : format(d, 'MMM d, yyyy');
                            } catch (e) {
                                return "N/A";
                            }
                        };

                        await emailService.sendBookingCancelled(emailTo, {
                            name: booking.shareholderName,
                            check_in: safeFormat(booking.from),
                            check_out: safeFormat(booking.to),
                            cabin_number: booking.cabinNumber,
                            cancelled_date: format(new Date(), 'PPP'),
                            dashboard_url: window.location.origin
                        });

                        triggerAlert("Success", "Booking cancelled.");
                    } catch (emailErr) {
                        console.error("Email failed:", emailErr);
                        triggerAlert("Warning", "Booking cancelled, but failed to send email notification.");
                    }

                } catch (err) {
                    console.error("Cancellation Critical Error:", err);
                    triggerAlert("Error", "Failed to cancel booking: " + err.message);
                }
            },
            true, // Danger color
            "Cancel Booking",
            "cancel" // strict typing
        );
    };

    const resetOnboarding = () => {
        localStorage.removeItem('hhr_tour_seen');
        triggerAlert("Tour Reset", "The onboarding tour has been reset for your browser. It will appear the next time you visit the dashboard.");
    };

    // --- Derived Schedule & Active Turn ---
    const { schedule, activeTurn } = React.useMemo(() => {
        const currentOrder = getShareholderOrder(2026);
        const sched = mapOrderToSchedule(currentOrder, allBookings, currentSimDate, fastTestingMode, bypassTenAM);

        // PRIORITY 1: use drafted status from Firestore (Synced by Cloud Function)
        let active = null;
        if (draftStatus?.activePicker) {
            // Try to find the exact match in our calculated schedule
            active = sched.find(s => s.name === draftStatus.activePicker && s.round == draftStatus.round); // Loose equality for round safety

            // If not found (maybe strictly because mapOrderToSchedule is out of sync), force create a temporary active object
            // This ensures the Hero matches the Monitor even if local Calc is lagging
            if (!active) {
                active = {
                    name: draftStatus.activePicker,
                    round: draftStatus.round,
                    status: 'ACTIVE',
                    start: draftStatus.windowStarts ? safeDate(draftStatus.windowStarts) : new Date(),
                    end: draftStatus.windowEnds ? safeDate(draftStatus.windowEnds) : new Date()
                };
            }
        }

        // PRIORITY 2: Fallback to local calculation only if Firestore is empty
        if (!active && !draftStatus) {
            active = sched.find(s => s.status === 'ACTIVE' || s.status === 'GRACE_PERIOD');
        }

        return { schedule: sched, activeTurn: active };
    }, [allBookings, draftStatus, currentSimDate, fastTestingMode, bypassTenAM]);






    // --- UI ---

    // --- SHAREHOLDERS MANAGEMENT ---
    const [shareholders, setShareholders] = useState([]);
    const [editingShareholder, setEditingShareholder] = useState(null); // { id, email }

    useEffect(() => {
        // Fetch Shareholders
        const q = query(collection(db, "shareholders"), orderBy("cabin"));
        const unsub = onSnapshot(q, async (snapshot) => {
            if (snapshot.empty) {
                console.log("Migrating shareholders to DB...");
                const batch = writeBatch(db);
                CABIN_OWNERS.forEach(owner => {
                    const ref = doc(collection(db, "shareholders"));
                    batch.set(ref, owner);
                });
                await batch.commit();
                console.log("Migration complete.");
            } else {
                const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                // Sort by cabin number numeric
                list.sort((a, b) => parseInt(a.cabin) - parseInt(b.cabin));
                setShareholders(list);
            }
        });
        return () => unsub();
    }, []);

    const handleUpdateShareholder = async () => {
        if (!editingShareholder || !editingShareholder.email) return;

        // Find original email to link Auth account
        const originalShareholder = shareholders.find(s => s.id === editingShareholder.id);
        const oldEmail = originalShareholder ? originalShareholder.email : null;
        const newEmail = editingShareholder.email;
        const hasChanged = oldEmail && oldEmail !== newEmail;

        try {
            // 1. Update Firestore (Database)
            await updateDoc(doc(db, "shareholders", editingShareholder.id), {
                email: newEmail
            });
            setEditingShareholder(null);

            // 2. Sync Auth (if changed)
            if (hasChanged) {
                try {
                    const updateEmailFn = httpsCallable(functions, 'adminUpdateShareholderEmail');
                    const result = await updateEmailFn({ oldEmail, newEmail });

                    const { authUpdated, message } = result.data;

                    triggerConfirm(
                        "Update Complete",
                        `Database updated successfully.\n\nLogin Account Status:\n${authUpdated ? "✅ " : "⚠️ "}${message}`,
                        () => { }, // No confirm action needed, just info
                        false,
                        "OK"
                    );
                } catch (authErr) {
                    console.error("Auth sync failed", authErr);
                    triggerConfirm(
                        "Update Partial Success",
                        `Database updated to ${newEmail}.\n\n⚠️ Failed to update Login Account: ${authErr.message}.\nUser may need to register new account.`,
                        () => { },
                        false,
                        "OK"
                    );
                }
            } else {
                triggerAlert("Success", "Email updated.");
            }
        } catch (err) {
            triggerAlert("Error", err.message);
        }
    };

    const handlePasswordChange = async (shareholder) => {
        if (!shareholder.email) {
            triggerAlert("Error", "This shareholder has no email set.");
            return;
        }

        triggerPrompt(
            "Change Password",
            `Enter NEW password for ${shareholder.name}\n(${shareholder.email}):`,
            "",
            (newPassword) => {
                if (!newPassword) return;
                if (newPassword.length < 6) {
                    triggerAlert("Error", "Password must be at least 6 characters.");
                    return;
                }

                triggerConfirm(
                    "Confirm Change",
                    `Are you sure you want to forcibly change the password for ${shareholder.name}? They will need to use this new password immediately.`,
                    async () => {
                        try {
                            const adminUpdatePassword = httpsCallable(functions, 'adminUpdatePassword');
                            const result = await adminUpdatePassword({
                                targetEmail: shareholder.email,
                                newPassword: newPassword
                            });

                            // Show exact message from server
                            const msg = result.data?.message || "Password updated successfully.";
                            triggerAlert(result.data?.success ? "Success" : "Notice", msg);

                        } catch (err) {
                            console.error("Password update failed:", err);
                            triggerAlert("Error", "Failed to update password: " + err.message);
                        }
                    },
                    true,
                    "Update Password"
                );
            },
            "password",
            "Next"
        );
    };


    // 4. Analytics Calculations
    const analytics = React.useMemo(() => {
        let totalRevenue = 0;
        let outstandingFees = 0;
        let totalBookings = 0;
        let unpaidCount = 0;
        let totalNights = 0;

        allBookings.forEach(b => {
            // Only count finalized active bookings towards stats
            if (b.isFinalized && b.type !== 'cancelled' && b.type !== 'pass' && b.type !== 'auto-pass') {
                const nights = (b.from && b.to) ? Math.max(0, Math.round((new Date(b.to) - new Date(b.from)) / (1000 * 60 * 60 * 24))) : 0;
                const amount = nights * 125;

                totalBookings++;
                totalNights += nights;

                if (b.isPaid) {
                    totalRevenue += amount;
                } else {
                    outstandingFees += amount;
                    unpaidCount++;
                }
            }
        });

        return { totalRevenue, outstandingFees, totalBookings, unpaidCount, totalNights };
    }, [allBookings]);



    // Render Auth Modal if needed
    if (!authModal.isOpen && !window.sessionStorage.getItem('admin_auth')) {
        // Ideally we check this in useEffect but for now reliance on parent protected route or manual modal trigger
    }

    // --- USER MANAGEMENT ---
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const [createUserRole, setCreateUserRole] = useState('shareholder');

    // Derived Super Admin status from shareholders list
    const myShareholderProfile = shareholders.find(s => s.email === currentUser?.email);



    const handleDeleteUser = (user) => {
        triggerConfirm(
            "Delete User?",
            `Are you sure you want to delete ${user.name} (${user.email})?\n\nThis will remove their Login Access AND their Shareholder record.`,
            async () => {
                try {
                    const deleteAccount = httpsCallable(functions, 'deleteAccount');
                    await deleteAccount({ email: user.email });
                    triggerAlert("Success", "User deleted successfully.");
                } catch (err) {
                    triggerAlert("Error", err.message);
                }
            },
            true, // Danger
            "Delete User"
        );
    };

    const handleRoleChange = async (user, newRole) => {
        try {
            await updateDoc(doc(db, "shareholders", user.id), { role: newRole });
            triggerAlert("Success", `Role updated to ${newRole}.`);
        } catch (err) {
            triggerAlert("Error", "Failed to update role.");
        }
    };

    // --- TABS ---
    const [activeTab, setActiveTab] = useState('bookings'); // 'bookings', 'users'

    // Render Loading
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 py-4 md:py-6 container mx-auto px-4 relative animate-in fade-in duration-500">
            <CreateUserModal
                isOpen={isCreateUserModalOpen}
                initialRole={createUserRole}
                onClose={() => setIsCreateUserModalOpen(false)}
                onSuccess={() => triggerAlert("Success", "User created successfully.")}
            />

            {/* Header & Analytics */}
            <div className="space-y-6">

                {/* Unified Hero Section (matches Shareholder View) */}
                {/* Unified Hero Section (matches Shareholder View) */}
                {myShareholderProfile && activeTurn ? (
                    <ShareholderHero
                        currentUser={currentUser}
                        status={{ ...draftStatus, activePicker: activeTurn.name, phase: 'ROUND_1' }}
                        shareholderName={myShareholderProfile.name}
                        drafts={allBookings}
                        isSuperAdmin={true}
                        onOpenBooking={() => window.location.hash = '#book'}
                        onViewDetails={(booking) => {
                            triggerAlert("Info", `Booking details: ${booking.cabinNumber} (${format(booking.from.toDate(), 'MM/dd')} - ${format(booking.to.toDate(), 'MM/dd')})`);
                        }}
                    />
                ) : activeTurn && (
                    /* Admin Specific Hero (When Admin is NOT the active shareholder) */
                    <AdminTurnHero
                        activeTurn={activeTurn}
                        drafts={allBookings}
                        isTestMode={isTestMode}
                        isSystemFrozen={isSystemFrozen}
                    />
                )}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                            Admin Dashboard
                            <span className="text-sm font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                v{version}
                            </span>
                        </h1>

                        <p className="text-muted-foreground mt-1">Overview of resort performance and bookings.</p>
                    </div>
                    <div className="flex gap-3">
                        {/* Button moved to System tab */}
                    </div>
                </div>

                <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'bookings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Booking Management
                    </button>
                    <button
                        onClick={() => setActiveTab('schedule')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'schedule' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        2026 Season Schedule
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Users & Roles
                    </button>
                    <button
                        onClick={() => setActiveTab('system')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'system' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <div className="flex items-center gap-2">
                            <span>System</span>
                            {isSystemFrozen && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>}
                        </div>
                    </button>
                </div>

                {/* System Tab Content */}
                {activeTab === 'system' && (
                    <SystemTab
                        simStartDate={simStartDate}
                        setSimStartDate={setSimStartDate}
                        fastTestingMode={fastTestingMode}
                        setFastTestingMode={setFastTestingMode}
                        isTestMode={isTestMode}
                        isSystemFrozen={isSystemFrozen}
                        toggleTestMode={toggleTestMode}
                        toggleSystemFreeze={toggleSystemFreeze}
                        toggleFastTestingMode={toggleFastTestingMode}
                        handleWipeDatabase={handleWipeDatabase}
                        requireAuth={requireAuth}
                        triggerAlert={triggerAlert}
                        performWipe={performWipe}
                        IS_SITE_OWNER={IS_SITE_OWNER}
                        db={db}
                        doc={doc}
                        setDoc={setDoc}
                        format={format}
                    />
                )}

                {/* 2026 Season Schedule Tab Content */}
                {activeTab === 'schedule' && (
                    <div className="mt-8 col-span-1 md:col-span-2 lg:col-span-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SeasonSchedule
                            currentOrder={getShareholderOrder(2026)}
                            allDraftRecords={allBookings}
                            status={draftStatus || { phase: 'PRE_DRAFT' }}
                            startDateOverride={currentSimDate}
                            fastTestingMode={fastTestingMode}
                            bypassTenAM={bypassTenAM}
                        />
                    </div>
                )}

                {activeTab === 'bookings' && (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-6 rounded-xl border shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                                        <DollarSign className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                                        <h3 className="text-2xl font-bold text-slate-900">${analytics.totalRevenue.toLocaleString()}</h3>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Unpaid Fees</p>
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-2xl font-bold text-slate-900">${analytics.outstandingFees.toLocaleString()}</h3>
                                            <span className="text-sm text-muted-foreground">({analytics.unpaidCount})</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Bookings</p>
                                        <h3 className="text-2xl font-bold text-slate-900">{analytics.totalBookings}</h3>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-purple-100 text-purple-700 rounded-lg">
                                        <Moon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Nights</p>
                                        <h3 className="text-2xl font-bold text-slate-900">{analytics.totalNights}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>



                        {/* Toggleable Views & Actions */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 mt-6 gap-4">
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                                {bookingViewMode === 'list' ? 'Booking Management' : 'Calendar View'}
                            </h2>

                            <div className="flex flex-wrap items-center gap-3">
                                {/* Shared Reporting Actions (List View Only) */}
                                {bookingViewMode === 'list' && (
                                    <div className="flex items-center gap-2 mr-2 border-r pr-4 border-slate-200">
                                        <button
                                            onClick={handleEmailBookingReport}
                                            className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors px-2 py-1 hover:bg-slate-100 rounded"
                                        >
                                            <Mail className="w-4 h-4" />
                                            <span className="hidden md:inline">Email Report</span>
                                        </button>
                                        <button
                                            onClick={handleDownloadCSV}
                                            className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors px-2 py-1 hover:bg-slate-100 rounded"
                                        >
                                            <Download className="w-4 h-4" />
                                            <span className="hidden md:inline">CSV</span>
                                        </button>
                                    </div>
                                )}

                                {/* View Switcher */}
                                <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
                                    <button
                                        onClick={() => setBookingViewMode('list')}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${bookingViewMode === 'list'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-900'
                                            }`}
                                    >
                                        <ListIcon className="w-4 h-4" />
                                        <span>List</span>
                                    </button>
                                    <button
                                        onClick={() => setBookingViewMode('calendar')}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${bookingViewMode === 'calendar'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-900'
                                            }`}
                                    >
                                        <Calendar className="w-4 h-4" />
                                        <span>Calendar</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {bookingViewMode === 'calendar' ? (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <AdminCalendarView bookings={allBookings} onNotify={triggerAlert} />
                            </div>
                        ) : (
                            // Detailed List View
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">

                                {/* Mobile Card View (Bookings) */}
                                <div className="md:hidden space-y-4 mb-8">
                                    <div className="flex justify-end gap-4 mb-2">
                                        {/* Mobile-only shortcuts if needed, but header handles it now */}
                                    </div>
                                    {(() => {
                                        const currentOrder = getShareholderOrder(2026);
                                        const schedule = mapOrderToSchedule(currentOrder, allBookings, currentSimDate, fastTestingMode, bypassTenAM);

                                        const renderCard = (slot) => {
                                            const booking = slot.booking;
                                            const isSlotBooked = !!booking;

                                            // Helper for payment status style
                                            const paymentClass = booking?.isPaid
                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                                : 'bg-white text-slate-500 border-slate-200';

                                            return (
                                                <div key={`${slot.name}-${slot.round}`} className="bg-white p-5 rounded-xl border shadow-sm space-y-4 relative overflow-hidden">
                                                    {/* Status Stripe */}
                                                    {isSlotBooked && (
                                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${booking.isFinalized ? 'bg-green-500' : 'bg-amber-400'}`}></div>
                                                    )}

                                                    {/* Header */}
                                                    <div className="flex justify-between items-start pl-2">
                                                        <div>
                                                            <h3 className="font-bold text-slate-900 text-lg">{slot.name}</h3>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                    Cabin #{isSlotBooked ? (booking.cabinNumber || "?") : "?"}
                                                                </span>
                                                                {isSlotBooked && booking.guests && (
                                                                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                        <Users className="w-3 h-3" />
                                                                        {booking.guests}
                                                                    </span>
                                                                )}
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                                    Round {slot.round}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {isSlotBooked ? (
                                                            (() => {
                                                                if (booking.type === 'pass' || booking.type === 'auto-pass') {
                                                                    return (
                                                                        <div className="px-2 py-1 rounded text-[10px] font-bold border bg-slate-100 text-slate-600 border-slate-200">
                                                                            PASSED
                                                                        </div>
                                                                    );
                                                                }
                                                                if (booking.type === 'cancelled') {
                                                                    return (
                                                                        <div className="px-2 py-1 rounded text-[10px] font-bold border bg-red-50 text-red-700 border-red-200">
                                                                            CANCELLED
                                                                        </div>
                                                                    );
                                                                }
                                                                return (
                                                                    <div className={`px-2 py-1 rounded text-[10px] font-bold border ${booking.isFinalized
                                                                        ? 'bg-green-50 text-green-700 border-green-200'
                                                                        : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                                        {booking.isFinalized ? "FINALIZED" : "DRAFT"}
                                                                    </div>
                                                                );
                                                            })()
                                                        ) : (
                                                            <span className="text-xs text-slate-400 font-medium italic pr-2">Pending</span>
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    {isSlotBooked ? (
                                                        <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 space-y-3 ml-2">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Dates</div>
                                                                    <div className="text-sm font-medium text-slate-900">
                                                                        {(booking.type === 'pass' || booking.type === 'auto-pass') ? 'Pass' :
                                                                            (booking.from && booking.to ? `${format(booking.from, 'MMM d')} - ${format(booking.to, 'MMM d')}` : 'Invalid')}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Payment</div>
                                                                    {(booking.type === 'pass' || booking.type === 'auto-pass' || booking.type === 'cancelled') ? (
                                                                        <span className="text-slate-400 text-sm">—</span>
                                                                    ) : (
                                                                        <span
                                                                            className={`px-3 py-1 rounded text-xs font-bold border ${paymentClass}`}
                                                                        >
                                                                            {booking.isPaid ? "PAID" : "UNPAID"}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="ml-2 py-4 text-center border-2 border-dashed border-slate-100 rounded-lg text-slate-300 text-xs">
                                                            No booking dates selected
                                                        </div>
                                                    )}

                                                    {/* Actions Footer */}
                                                    {isSlotBooked && (
                                                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 ml-2">
                                                            <ActionsDropdown
                                                                onEdit={(booking.type !== 'cancelled' && booking.type !== 'pass' && booking.type !== 'auto-pass') ? () => handleEditClick(booking) : undefined}
                                                                onCancel={booking.type !== 'cancelled' ? () => handleCancelBooking(booking) : undefined}
                                                                isCancelled={booking.type === 'cancelled'}
                                                                onToggleStatus={() => handleToggleFinalized(booking.id, booking.isFinalized)}
                                                                isFinalized={booking.isFinalized}
                                                                onTogglePaid={() => handleTogglePaid(booking)}
                                                                isPaid={booking.isPaid}
                                                                onSendReminder={() => handleSendPaymentReminder(booking)}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        };

                                        return (
                                            <div className="grid grid-cols-1 gap-4">
                                                {schedule.map(renderCard)}
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="overflow-x-auto hidden md:block">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                                            <tr>
                                                <th className="px-6 py-4">Shareholder</th>
                                                <th className="px-6 py-4">Guests</th>
                                                <th className="px-6 py-4">Dates</th>
                                                <th className="px-6 py-4 text-center">Status</th>
                                                <th className="px-6 py-4 text-center">Payment</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y text-slate-600">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-10 text-center text-muted-foreground italic">
                                                        Loading bookings...
                                                    </td>
                                                </tr>
                                            ) : (() => {
                                                // GENERATE SCHEDULE VIEW
                                                const currentOrder = getShareholderOrder(2026); // Default 2026 Year
                                                const schedule = mapOrderToSchedule(currentOrder, allBookings, currentSimDate, fastTestingMode, bypassTenAM);

                                                // Helper to Render a Row
                                                const renderRow = (slot) => {
                                                    const booking = slot.booking; // Full Booking Object
                                                    const isSlotBooked = !!booking;

                                                    // If not booked, show placeholder
                                                    if (!isSlotBooked) {
                                                        return (
                                                            <tr key={`${slot.name}-${slot.round}`} className="bg-slate-50/30">
                                                                <td className="px-6 py-5">
                                                                    <div className="font-semibold text-slate-400 text-base">{slot.name}</div>
                                                                    <div className="text-xs text-muted-foreground font-mono mt-0.5 opacity-50">
                                                                        Cabin #{CABIN_OWNERS.find(o => o.name === slot.name)?.cabin || "?"}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-5 text-slate-400">—</td>
                                                                <td className="px-6 py-5 text-slate-400">—</td>
                                                                <td className="px-6 py-5 text-center">
                                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-400 border border-slate-200">
                                                                        Pending
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-5 text-center text-slate-300">—</td>
                                                                <td className="px-6 py-5 text-right text-slate-300">—</td>
                                                            </tr>
                                                        );
                                                    }

                                                    // If booked, show existing row logic
                                                    return (
                                                        <tr key={booking.id} className="hover:bg-muted/10 transition-colors bg-white">
                                                            <td className="px-6 py-5">
                                                                <div className="font-semibold text-slate-900 text-base">{booking.shareholderName}</div>
                                                                <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                                                    Cabin #{booking.cabinNumber || CABIN_OWNERS.find(o => o.name === booking.shareholderName)?.cabin || "?"}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5">
                                                                {(booking.type === 'pass' || booking.type === 'auto-pass' || booking.type === 'cancelled') ? (
                                                                    <span className="text-slate-400">—</span>
                                                                ) : (
                                                                    <div className="flex items-center gap-1.5 font-medium text-slate-600">
                                                                        <Users className="w-4 h-4 text-slate-400" />
                                                                        {booking.guests || 1}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-5">
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium text-slate-900">
                                                                        {(booking.type === 'pass' || booking.type === 'auto-pass')
                                                                            ? '—'
                                                                            : (booking.from && booking.to
                                                                                ? `${format(booking.from, 'MMM d')} - ${format(booking.to, 'MMM d, yyyy')}`
                                                                                : 'Invalid Dates')
                                                                        }
                                                                    </span>
                                                                    <span className="text-[11px] text-muted-foreground mt-0.5">
                                                                        Created: {booking.createdAt ? format(booking.createdAt, 'MMM d, HH:mm') : 'N/A'}
                                                                    </span>
                                                                </div>
                                                            </td>

                                                            <td className="px-6 py-5 text-center">
                                                                {booking.type === 'pass' || booking.type === 'auto-pass' ? (
                                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 cursor-default">
                                                                        <XCircle className="w-3 h-3 mr-1.5" />
                                                                        Passed
                                                                    </span>
                                                                ) : booking.type === 'cancelled' ? (
                                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-100 cursor-default">
                                                                        <Ban className="w-3 h-3 mr-1.5" />
                                                                        Cancelled
                                                                    </span>
                                                                ) : (
                                                                    /* Static Badge - Interaction moved to Actions Menu */
                                                                    <span
                                                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${booking.isFinalized
                                                                            ? 'bg-green-50 text-green-700 border-green-200'
                                                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                                                            }`}
                                                                    >
                                                                        {booking.isFinalized ? (
                                                                            <>
                                                                                <CheckCircle className="w-3 h-3 mr-1.5" />
                                                                                Finalized
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Clock className="w-3 h-3 mr-1.5" />
                                                                                Draft
                                                                            </>
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </td>

                                                            <td className="px-6 py-5 text-center">
                                                                {(booking.type === 'pass' || booking.type === 'auto-pass' || booking.type === 'cancelled') ? (
                                                                    <span className="text-slate-400">—</span>
                                                                ) : (
                                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${booking.isPaid
                                                                        ? 'bg-green-100 text-green-800 border-green-200'
                                                                        : 'bg-white text-slate-500 border-slate-200'
                                                                        }`}>
                                                                        {booking.isPaid ? 'PAID' : 'UNPAID'}
                                                                        {booking.isPaid && <span className="ml-1 text-[10px] opacity-75">via {booking.paymentMethod || 'Manual'}</span>}
                                                                    </span>
                                                                )}
                                                            </td>

                                                            <td className="px-6 py-5 text-right">
                                                                {booking.type !== 'pass' && booking.type !== 'auto-pass' && booking.type !== 'cancelled' ? (
                                                                    <ActionsDropdown
                                                                        onEdit={booking.type !== 'cancelled' ? () => handleEditClick(booking) : undefined}
                                                                        onCancel={() => handleCancelBooking(booking)}
                                                                        isCancelled={booking.type === 'cancelled'}
                                                                        onToggleStatus={() => handleToggleFinalized(booking.id, booking.isFinalized)}
                                                                        isFinalized={booking.isFinalized}
                                                                        onTogglePaid={() => handleTogglePaid(booking)}
                                                                        isPaid={booking.isPaid}
                                                                        onSendReminder={() => handleSendPaymentReminder(booking)}
                                                                    />
                                                                ) : null}
                                                            </td>
                                                        </tr>
                                                    );
                                                };

                                                return (
                                                    <>
                                                        {/* ROUND 1 */}
                                                        <tr className="bg-slate-100 border-b border-t border-slate-200">
                                                            <td colSpan="5" className="px-6 py-2 text-xs font-bold tracking-wider text-slate-600 uppercase">
                                                                Round 1 - Shareholder Rotation
                                                            </td>
                                                        </tr>
                                                        {schedule.filter(s => s.round === 1).map(renderRow)}

                                                        {/* ROUND 2 */}
                                                        <tr className="bg-slate-100 border-b border-t border-slate-200">
                                                            <td colSpan="5" className="px-6 py-2 text-xs font-bold tracking-wider text-slate-600 uppercase mt-4">
                                                                Round 2 - Snake Draft
                                                            </td>
                                                        </tr>
                                                        {schedule.filter(s => s.round === 2).map(renderRow)}
                                                    </>
                                                );
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )
                }




                {
                    activeTab === 'users' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-800">Users & Roles</h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setCreateUserRole('shareholder'); setIsCreateUserModalOpen(true); }}
                                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors flex items-center gap-2 shadow-sm"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                        Add Shareholder
                                    </button>
                                    {IS_SITE_OWNER && (
                                        <button
                                            onClick={handleAddAdmin}
                                            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm"
                                        >
                                            <Shield className="w-4 h-4" />
                                            Add Admin
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Mobile Card View (Users) */}
                            <div className="md:hidden space-y-4">
                                {shareholders.map((person) => (
                                    <div key={person.id} className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-lg">{person.name}</h3>
                                                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                                                    Cabin #{person.cabin}
                                                </span>
                                            </div>
                                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${person.role === 'super_admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                {person.role === 'super_admin' ? 'Super Admin' : 'Shareholder'}
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                                            <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Email</div>
                                            <div className="text-slate-700 font-medium break-all">{person.email}</div>
                                        </div>

                                        <div className="border-t border-slate-100 pt-3 flex justify-end">
                                            <UserActionsDropdown
                                                user={person}
                                                onEdit={(u) => setEditingShareholder({ id: u.id, email: u.email })}
                                                onPassword={handlePasswordChange}
                                                onDelete={handleDeleteUser}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table View (Users) */}
                            <div className="bg-white border rounded-xl shadow-sm overflow-hidden hidden md:block">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                                            <tr>
                                                <th className="px-6 py-3 w-20">Cabin</th>
                                                <th className="px-6 py-3">Name</th>
                                                <th className="px-6 py-3">Email(s)</th>
                                                <th className="px-6 py-3">Role</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y text-slate-600">
                                            {shareholders.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-8 text-center text-muted-foreground italic">
                                                        Loading users...
                                                    </td>
                                                </tr>
                                            ) : (
                                                shareholders.map((person) => (
                                                    <tr key={person.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-3 font-mono text-slate-400">#{person.cabin}</td>
                                                        <td className="px-6 py-3 font-semibold text-slate-900">{person.name}</td>
                                                        <td className="px-6 py-3">
                                                            {editingShareholder?.id === person.id ? (
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={editingShareholder.email}
                                                                        onChange={(e) => setEditingShareholder({ ...editingShareholder, email: e.target.value })}
                                                                        className="flex-1 px-2 py-1 text-xs border rounded shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                                    />
                                                                    <button
                                                                        onClick={handleUpdateShareholder}
                                                                        className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                                                    >
                                                                        <CheckCircle className="h-4 w-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingShareholder(null)}
                                                                        className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                                                                    >
                                                                        <XCircle className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-600">{person.email}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded textxs font-medium ${person.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'
                                                                }`}>
                                                                {person.role === 'super_admin' ? 'Super Admin' : 'Shareholder'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3 text-right">
                                                            {editingShareholder?.id !== person.id && (
                                                                <div className="flex justify-end pr-2">
                                                                    <UserActionsDropdown
                                                                        user={person}

                                                                        onEdit={(u) => setEditingShareholder({ id: u.id, email: u.email })}
                                                                        onPassword={handlePasswordChange}
                                                                        onDelete={handleDeleteUser}
                                                                    />
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Modal */}
                {/* Modal */}
                <ConfirmationModal
                    isOpen={confirmation.isOpen}
                    onClose={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={confirmation.onConfirm}
                    title={confirmation.title}
                    message={confirmation.message}
                    isDanger={confirmation.isDanger}
                    confirmText={confirmation.confirmText}
                    showCancel={confirmation.showCancel}
                    requireTyping={confirmation.requireTyping}
                />

                {/* Edit Modal */}
                <EditBookingModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleSaveEdit}
                    booking={editingBooking}
                    otherBookings={allBookings.filter(b => b.id !== editingBooking?.id)}
                />

                {/* Reauth Modal */}
                <ReauthenticationModal
                    isOpen={authModal.isOpen}
                    onClose={() => setAuthModal(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={authModal.onConfirm}
                    title={authModal.title}
                    message={authModal.message}
                />

                {/* Prompt Modal */}
                <PromptModal
                    isOpen={promptData.isOpen}
                    onClose={() => setPromptData(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={promptData.onConfirm}
                    title={promptData.title}
                    message={promptData.message}
                    defaultValue={promptData.defaultValue}
                    inputType={promptData.inputType}
                    confirmText={promptData.confirmText}
                />
            </div >
        </div >
    );
}
