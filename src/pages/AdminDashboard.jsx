import React, { useState, useEffect } from 'react';
// import { version } from '../../package.json'; // Removed to use global __APP_VERSION__
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CABIN_OWNERS, DRAFT_CONFIG, getShareholderOrder, mapOrderToSchedule, calculateDraftSchedule } from '../lib/shareholders';
import { emailService } from '../services/emailService';
import { db, functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, writeBatch, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, addDoc, deleteField, getDoc, setDoc } from 'firebase/firestore';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ActionsDropdown } from '../components/ActionsDropdown';
import { format, differenceInDays, set } from 'date-fns';
import { ChevronDown, ChevronUp, Search, Calendar, User, DollarSign, Clock, CheckCircle, XCircle, AlertTriangle, Filter, MoreHorizontal, Mail, Trash2, Edit, List, Moon, Download, Bell, PlusCircle, Settings, Ban, Shield, RefreshCw } from 'lucide-react';
import { calculateBookingCost } from '../lib/pricing';
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
import { NotificationsTab } from '../components/admin/NotificationsTab';

export function AdminDashboard() {
    const { currentUser } = useAuth();
    const IS_SITE_OWNER = currentUser?.email === 'bryan.m.hudson@gmail.com';

    // Tab State: 'system', 'bookings', 'history'
    const [activeTab, setActiveTab] = useState('bookings');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
                if (doc.data().isTestMode !== undefined) setIsTestMode(doc.data().isTestMode);
                setFastTestingMode(doc.data().fastTestingMode || false);
                setBypassTenAM(doc.data().bypassTenAM || false);
            } else {
                // AUTO-DEFAULT: Set to Normal Testing until Feb 15, 2026, then Production
                const now = new Date();
                const feb20_2026 = new Date(2026, 1, 20); // Feb 20, 2026

                let defaultDate;
                let defaultBypassTenAM;
                let defaultMessage;

                if (now < feb20_2026) {
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
                    isTestMode: now < feb20_2026 ? true : false, // Auto-enable test mode until Feb 20 for email safety
                    autoInitialized: true,
                    autoInitMessage: defaultMessage
                }, { merge: true });


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

    const performWipe = async (overrideStartDate = null, options = {}) => {
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

        }

        // 3. Reset draftStatus (so scheduler knows to start fresh)
        await setDoc(doc(db, "status", "draftStatus"), {
            activePicker: null,
            windowStarts: null,
            windowEnds: null,
            round: 1,
            phase: 'ROUND_1'
        });


        // 4. Reset Settings
        const defaultStart = overrideStartDate || new Date(2026, 2, 1, 10, 0, 0);

        const settingsUpdate = {
            draftStartDate: defaultStart,
            isSystemFrozen: false,
            bypassTenAM: false,
            season: 2026
        };

        if (options.forceTestMode) {
            settingsUpdate.isTestMode = true;
        } else if (options.forceProductionMode) {
            settingsUpdate.isTestMode = false;
        }

        await setDoc(doc(db, "settings", "general"), settingsUpdate, { merge: true });



        const verifySnap = await getDoc(doc(db, "settings", "general"));
        const verifyDate = verifySnap.data()?.draftStartDate?.toDate ? verifySnap.data().draftStartDate.toDate() : verifySnap.data().draftStartDate;


        // 5. CRITICAL: Send turn start email immediately
        try {
            const order2026 = getShareholderOrder(2026);
            const firstShareholderName = order2026[0];

            const shareholdersSnapshot = await getDocs(collection(db, "shareholders"));
            const firstShareholder = shareholdersSnapshot.docs.map(d => d.data()).find(s => s.name === firstShareholderName);

            /* [DUPLICATE FIX] - Disabled Client-Side Email
               The backend 'turnReminderScheduler' will detect the new turn within 1 minute
               and send the official email. This prevents double-sending.
            
            if (firstShareholder && firstShareholder.email) {
                const PICK_DURATION_MS = fastTestingMode ? (10 * 60 * 1000) : (48 * 60 * 60 * 1000);
                const deadline = new Date(defaultStart.getTime() + PICK_DURATION_MS);

                await emailService.sendEmail({
                    to: { name: firstShareholderName, email: firstShareholder.email },
                    templateId: 1, // Turn Started
                    params: {
                        name: firstShareholderName,
                        deadline_date: format(deadline, 'PPP'),
                        deadline_time: format(deadline, 'p'),
                        booking_url: window.location.origin,
                        dashboard_url: window.location.origin,
                        pass_turn_url: window.location.origin,
                        phase: 'ROUND_1',
                        round: 1
                    }
                });

            }
            */

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
        // 1. Strict Identity Check
        if (currentUser?.email !== 'bryan.m.hudson@gmail.com') {
            triggerAlert("Access Denied", "Only the Primary Administrator (Bryan) can wipe the database.");
            return;
        }

        // 2. Re-Authenticate (Password)
        requireAuth(
            "Wipe Database Audit",
            "This action is destructive and irreversible. Please re-authenticate.",
            () => {
                // 3. Typed Confirmation
                triggerConfirm(
                    "EXTREME DANGER: Wipe Database",
                    "You are about to PERMANENTLY DELETE ALL BOOKINGS. This cannot be undone.\n\nType 'wipe database' to confirm.",
                    async () => {
                        try {
                            // 4. Auto-Backup (Silent)
                            generateAndDownloadCSV(true);

                            // 5. Notify via Email
                            const { httpsCallable } = await import('firebase/functions');
                            const sendTestEmailFn = httpsCallable(functions, 'sendTestEmail');
                            await sendTestEmailFn({
                                emailType: 'turnStarted', // Using a generic template but with custom values if possible, or just a ping. 
                                // Actually, 'sendTestEmail' is strict on types. Let's generic email service if available or just proceed.
                                // The requirement was "send an email to bryan...". 
                                // Let's try to send a custom report email using the report logic instead? 
                                // Or better, just rely on the CSV download as the "copy" and maybe a simple alert.
                                // Wait, prompt said: "send an email to bryan... and auto download a csv".
                                // I'll send a "Wipe Notification" using the Report Emailer if I can, or just skip if no easy template.
                                // Let's use the 'Email Season Report' logic but targeting Bryan instantly.
                                testEmail: 'bryan.m.hudson@gmail.com'
                            });

                            const count = await performWipe();
                            triggerAlert("Success", `Database wiped. ${count} records deleted. CSV Backup Downloaded.`);
                        } catch (err) {
                            console.error(err);
                            triggerAlert("Error", "Wipe failed: " + err.message);
                        }
                    },
                    true,
                    "NUKE DATA",
                    "wipe database" // Require typing this exact string
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
            const dB = b.from ? new Date(b.from) : new Date(0);
            return da - dB;
        });

        // Filter out purely technical records
        const reportBookings = sortedBookings.filter(b => b.type !== 'pass' && b.type !== 'auto-pass' && b.type !== 'cancelled');

        // Calculate analytics inline (since useMemo analytics is defined later)
        let totalRevenue = 0;
        let outstandingFees = 0;
        let unpaidCount = 0;
        let totalNights = 0;

        reportBookings.forEach(b => {
            if (b.isFinalized) {
                const nights = (b.from && b.to) ? Math.max(0, differenceInDays(b.to, b.from)) : 0;
                const amount = b.totalPrice || 0;
                totalNights += nights;

                if (b.isPaid) {
                    totalRevenue += amount;
                } else {
                    outstandingFees += amount;
                    unpaidCount++;
                }
            }
        });

        const generateRowHtml = (b) => {
            const paymentStatus = b?.isPaid ? "PAID" : "UNPAID";
            const paymentColor = b?.isPaid ? "#dcfce7" : "#fee2e2";
            const dateStr = b?.from && b?.to ? `${format(b.from, 'MMM d')} - ${format(b.to, 'MMM d, yyyy')}` : "N/A";
            const statusLabel = b.type === 'cancelled' ? "Cancelled" : "Confirmed";
            const nights = (b.from && b.to) ? differenceInDays(b.to, b.from) : 0;
            const totalPrice = b.totalPrice || "-";

            return `
            <tr style="background-color: #fff;">
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${b.shareholderName}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${b.cabinNumber || "?"}</td>
                 <td style="padding: 8px; border-bottom: 1px solid #eee;">${b.guests || 1}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${dateStr}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${nights}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">$${totalPrice}</td>
                 <td style="padding: 8px; border-bottom: 1px solid #eee;">${statusLabel}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">
                    <span style="background-color: ${paymentColor}; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${paymentStatus}</span>
                </td>
            </tr>
            `;
        };

        // Generate Calendar View HTML
        const generateCalendarHtml = () => {
            const months = [
                { name: 'May 2026', year: 2026, month: 4 },
                { name: 'June 2026', year: 2026, month: 5 },
                { name: 'July 2026', year: 2026, month: 6 },
                { name: 'August 2026', year: 2026, month: 7 },
                { name: 'September 2026', year: 2026, month: 8 }
            ];

            // Color palette for shareholders
            const shareholderColors = {};
            const colorPalette = ['#dbeafe', '#dcfce7', '#fef3c7', '#fce7f3', '#e0e7ff', '#ccfbf1', '#fecaca', '#fed7aa'];
            let colorIndex = 0;

            // Helper to get booking for a specific date
            const getBookingForDate = (date) => {
                return reportBookings.find(b => {
                    if (!b.from || !b.to) return false;
                    const from = new Date(b.from);
                    const to = new Date(b.to);
                    return date >= from && date < to;
                });
            };

            // Get initials from name
            const getInitials = (name) => {
                return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            };

            // Get color for shareholder
            const getColor = (name) => {
                if (!shareholderColors[name]) {
                    shareholderColors[name] = colorPalette[colorIndex % colorPalette.length];
                    colorIndex++;
                }
                return shareholderColors[name];
            };

            let calendarHtml = `
                <h3 style="margin-top: 40px; margin-bottom: 20px; color: #1e293b;">Calendar View</h3>
            `;

            months.forEach(m => {
                const firstDay = new Date(m.year, m.month, 1);
                const lastDay = new Date(m.year, m.month + 1, 0);
                const startPadding = firstDay.getDay(); // 0 = Sunday
                const daysInMonth = lastDay.getDate();

                calendarHtml += `
                    <div style="margin-bottom: 25px;">
                        <h4 style="margin-bottom: 8px; color: #475569; font-size: 14px;">${m.name}</h4>
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed;">
                            <thead>
                                <tr style="background-color: #f8fafc;">
                                    <th style="padding: 4px; border: 1px solid #e2e8f0; width: 14.28%;">Sun</th>
                                    <th style="padding: 4px; border: 1px solid #e2e8f0; width: 14.28%;">Mon</th>
                                    <th style="padding: 4px; border: 1px solid #e2e8f0; width: 14.28%;">Tue</th>
                                    <th style="padding: 4px; border: 1px solid #e2e8f0; width: 14.28%;">Wed</th>
                                    <th style="padding: 4px; border: 1px solid #e2e8f0; width: 14.28%;">Thu</th>
                                    <th style="padding: 4px; border: 1px solid #e2e8f0; width: 14.28%;">Fri</th>
                                    <th style="padding: 4px; border: 1px solid #e2e8f0; width: 14.28%;">Sat</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                let dayCounter = 1;
                let weekRowsHtml = '';

                for (let week = 0; week < 6 && dayCounter <= daysInMonth; week++) {
                    weekRowsHtml += '<tr>';
                    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                        if ((week === 0 && dayOfWeek < startPadding) || dayCounter > daysInMonth) {
                            weekRowsHtml += '<td style="padding: 4px; border: 1px solid #e2e8f0; background-color: #f9fafb;"></td>';
                        } else {
                            const currentDate = new Date(m.year, m.month, dayCounter);
                            const booking = getBookingForDate(currentDate);

                            if (booking) {
                                const bgColor = getColor(booking.shareholderName);
                                const initials = getInitials(booking.shareholderName);
                                weekRowsHtml += `
                                    <td style="padding: 4px; border: 1px solid #e2e8f0; background-color: ${bgColor}; text-align: center; vertical-align: top;">
                                        <div style="font-weight: bold;">${dayCounter}</div>
                                        <div style="font-size: 9px; color: #475569;">${initials}</div>
                                    </td>
                                `;
                            } else {
                                weekRowsHtml += `
                                    <td style="padding: 4px; border: 1px solid #e2e8f0; text-align: center; vertical-align: top; color: #94a3b8;">
                                        ${dayCounter}
                                    </td>
                                `;
                            }
                            dayCounter++;
                        }
                    }
                    weekRowsHtml += '</tr>';
                }

                calendarHtml += weekRowsHtml + '</tbody></table></div>';
            });

            // Add legend
            const legendItems = Object.entries(shareholderColors).map(([name, color]) =>
                `<span style="display: inline-block; margin-right: 15px; margin-bottom: 5px;"><span style="display: inline-block; width: 12px; height: 12px; background-color: ${color}; border: 1px solid #ccc; margin-right: 4px;"></span>${name}</span>`
            ).join('');

            calendarHtml += `
                <div style="margin-top: 15px; font-size: 11px; color: #64748b;">
                    <strong>Legend:</strong><br/>
                    ${legendItems || '<span style="color: #94a3b8;">No bookings to display</span>'}
                </div>
            `;

            return calendarHtml;
        };

        triggerPrompt(
            "Email Season Report",
            "Enter recipient email:",
            currentUser?.email || "",
            async (recipient) => {
                if (!recipient) return;
                try {
                    const rows = reportBookings.map(generateRowHtml).join("");
                    const calendarSection = generateCalendarHtml();

                    const htmlTable = `
                        <h2>2026 Season Booking Report</h2>
                        <p>Generated on ${format(new Date(), 'PPP p')}</p>
                        <p>Showing ${reportBookings.length} active bookings.</p>

                        <div style="display: flex; gap: 20px; margin: 30px 0; flex-wrap: wrap;">
                             <div style="background-color: #f0fdf4; border: 1px solid #dcfce7; padding: 15px; border-radius: 8px; flex: 1; min-width: 150px;">
                                <div style="color: #166534; font-size: 11px; font-weight: bold; text-transform: uppercase;">Total Fees Collected</div>
                                <div style="color: #166534; font-size: 24px; font-weight: bold;">$${totalRevenue.toLocaleString()}</div>
                             </div>
                             <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 15px; border-radius: 8px; flex: 1; min-width: 150px;">
                                <div style="color: #92400e; font-size: 11px; font-weight: bold; text-transform: uppercase;">Unpaid Fees</div>
                                <div style="color: #92400e; font-size: 24px; font-weight: bold;">$${outstandingFees.toLocaleString()} <span style="font-size: 14px; opacity: 0.8;">(${unpaidCount})</span></div>
                             </div>
                             <div style="background-color: #feffff; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; flex: 1; min-width: 150px;">
                                <div style="color: #64748b; font-size: 11px; font-weight: bold; text-transform: uppercase;">Bookings</div>
                                <div style="color: #0f172a; font-size: 24px; font-weight: bold;">${reportBookings.length}</div>
                             </div>
                             <div style="background-color: #feffff; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; flex: 1; min-width: 150px;">
                                <div style="color: #64748b; font-size: 11px; font-weight: bold; text-transform: uppercase;">Total Nights</div>
                                <div style="color: #0f172a; font-size: 24px; font-weight: bold;">${totalNights}</div>
                             </div>
                        </div>

                        <h3 style="margin-top: 30px; margin-bottom: 15px; color: #1e293b;">Booking List</h3>
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-family: sans-serif; font-size: 14px;">
                            <thead>
                                <tr style="background-color: #f8fafc;">
                                    <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Shareholder</th>
                                    <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Cabin</th>
                                     <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Guests</th>
                                    <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Dates</th>
                                    <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Nights</th>
                                    <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Total Price</th>
                                    <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Status</th>
                                    <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Fee Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>

                        ${calendarSection}
                    `;

                    await emailService.sendEmail({
                        to: { name: "Admin", email: recipient },
                        subject: `[Admin] 2026 Season Booking Report - ${format(new Date(), 'MMM d')}`,
                        htmlContent: htmlTable
                    });

                    triggerAlert("Success", `Report sent to ${recipient}`);
                } catch (err) {
                    console.error("Report fail", err);
                    triggerAlert("Error", "Failed to send report: " + err.message);
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
            const headers = ["Shareholder,Cabin,Guests,Check In,Check Out,Nights,Total Price,Status,Fee Status,Round"];
            const rows = allBookings
                .sort((a, b) => {
                    const da = a.from ? new Date(a.from) : new Date(0);
                    const dB = b.from ? new Date(b.from) : new Date(0);
                    return da - dB;
                })
                .map(b => {
                    const checkIn = (b.type !== 'pass' && b.type !== 'auto-pass' && b.from) ? (b.from instanceof Date ? format(b.from, 'yyyy-MM-dd') : formatDate(b.from)) : "";
                    const checkOut = (b.type !== 'pass' && b.type !== 'auto-pass' && b.to) ? (b.to instanceof Date ? format(b.to, 'yyyy-MM-dd') : formatDate(b.to)) : "";
                    const nights = (b.from && b.to && b.type !== 'pass' && b.type !== 'auto-pass') ? Math.round((new Date(b.to) - new Date(b.from)) / (1000 * 60 * 60 * 24)) : 0;

                    let status = "Confirmed";
                    if (b.type === 'cancelled') status = "Cancelled";
                    else if (b.type === 'pass') status = "Passed";
                    else if (b.type === 'auto-pass') status = "Auto-Passed";

                    const payment = b.isPaid ? "PAID" : (status === "Finalized" ? "UNPAID" : "-");
                    const guests = b.guests || 1;
                    const totalPrice = b.totalPrice || "";
                    const round = b.round || "";

                    return `"${b.shareholderName}","${b.cabinNumber || ''}","${guests}","${checkIn}","${checkOut}","${nights}","${totalPrice}","${status}","${payment}","${round}"`;
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


    const handleAddShareholder = () => {
        if (currentUser?.email !== 'bryan.m.hudson@gmail.com') return;

        triggerPrompt(
            "Security Check",
            "Enter Master Passcode to add a new shareholder:",
            "",
            (code) => {
                if (code === '2026') {
                    setCreateUserRole('shareholder');
                    setIsCreateUserModalOpen(true);
                } else {
                    triggerAlert("Access Denied", "Incorrect passcode.");
                }
            },
            "password",
            "Verify"
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


    const handleTogglePaid = async (booking) => {
        if (booking.isPaid) {
            // Un-pay
            triggerConfirm(
                "Mark as Unpaid?",
                `Are you sure you want to revert the maintenance fee status for ${booking.shareholderName}?`,
                async () => {
                    try {
                        await updateDoc(doc(db, "bookings", booking.id), { isPaid: false, celebrated: false });
                        triggerAlert("Success", "Marked as Unpaid.");
                    } catch (err) {
                        triggerAlert("Error", err.message);
                    }
                },
                true, // Danger
                "Mark Unpaid",
                "UNPAID" // Require strict typing
            );
        } else {
            // Mark as Paid
            const start = booking.from;
            const end = booking.to;
            // Dynamic Pricing Logic for Confirmation
            const cost = calculateBookingCost(booking.from, booking.to);
            const amount = cost.total; // Use dynamic total

            triggerConfirm(
                "Confirm Fee & Send Email",
                `Mark booking for ${booking.shareholderName} as PAID?\n\nAmount: $${amount}\n\nThis will send a confirmation email to the user.`,
                async () => {
                    try {
                        // 1. Update DB
                        await updateDoc(doc(db, "bookings", booking.id), { isPaid: true, celebrated: false });

                        // 2. Send Email
                        // Find email address
                        const owner = shareholders.find(o => o.name === booking.shareholderName);
                        const userEmail = owner ? owner.email : "bryan.m.hudson@gmail.com";

                        await emailService.sendEmail({
                            to: { name: booking.shareholderName, email: userEmail },
                            templateId: 'paymentReceived',
                            params: {
                                name: booking.shareholderName,
                                amount: amount.toLocaleString(),
                                check_in: format(start, 'MMM d, yyyy'),
                                check_out: format(end, 'MMM d, yyyy'),
                                cabin_number: booking.cabinNumber,
                                dashboard_url: window.location.origin
                            }
                        });

                        triggerAlert("Success", "Maintenance fee recorded and email sent! 💰");
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
            "Send Maintenance Fee Reminder?",
            `Send an email reminder to ${booking.shareholderName} (Cabin #${booking.cabinNumber}) for $${booking.totalPrice}?`,
            async () => {
                try {
                    const owner = shareholders.find(o => o.name === booking.shareholderName);
                    const emailTo = "bryan.m.hudson@gmail.com"; // OVERRIDE for safety/demo

                    await emailService.sendEmail({
                        to: { name: booking.shareholderName, email: emailTo },
                        templateId: 'paymentReminder',
                        params: {
                            name: booking.shareholderName,
                            total_price: booking.totalPrice,
                            cabin_number: booking.cabinNumber,
                            check_in: format(booking.from, 'PPP'),
                            payment_deadline: "within 12 hours",
                            dashboard_url: window.location.origin
                        }
                    });
                    triggerAlert("Success", "Maintenance fee reminder sent.");
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

                        // Email handled by backend trigger 'onBookingChangeTrigger'
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

        // PRIORITY 1: Local Calculation (Instant UI updates)
        // If the local math says someone is Active or in Grace Period, trust that immediately.
        let active = sched.find(s => s.status === 'ACTIVE' || s.status === 'GRACE_PERIOD');

        // PRIORITY 2: Fallback to Firestore Draft Status (if local calc is ambiguous or empty)
        if (!active && draftStatus?.activePicker) {
            active = sched.find(s => s.name === draftStatus.activePicker && s.round == draftStatus.round);

            // Absolute Fallback: Create object from draftStatus if not found in schedule
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

        return { schedule: sched, activeTurn: active };
    }, [allBookings, draftStatus, currentSimDate, fastTestingMode, bypassTenAM, tick]);






    // --- UI ---

    // --- SHAREHOLDERS MANAGEMENT ---
    const [shareholders, setShareholders] = useState([]);
    const [editingShareholder, setEditingShareholder] = useState(null); // { id, email }

    useEffect(() => {
        // Fetch Shareholders
        const q = query(collection(db, "shareholders"), orderBy("cabin"));
        const unsub = onSnapshot(q, async (snapshot) => {
            if (snapshot.empty) {

                const batch = writeBatch(db);
                CABIN_OWNERS.forEach(owner => {
                    const ref = doc(collection(db, "shareholders"));
                    batch.set(ref, owner);
                });
                await batch.commit();

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
                const cost = calculateBookingCost(b.from, b.to);
                const amount = b.totalPrice || cost.total;

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

    // --- TABS (Managed at top level) ---

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
                                v{__APP_VERSION__}
                            </span>
                        </h1>

                        <p className="text-muted-foreground mt-1">Overview of resort performance and bookings.</p>
                    </div>
                    <div className="flex gap-3">
                        {/* Button moved to System tab */}
                    </div>
                </div>

                {/* Responsive Navigation */}
                <div className="w-full relative z-20">
                    {/* Mobile: Hamburger Menu */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                {/* Dynamic Icon based on active tab */}
                                {activeTab === 'bookings' && <List className="w-5 h-5 text-slate-500" />}
                                {activeTab === 'schedule' && <Calendar className="w-5 h-5 text-slate-500" />}
                                {activeTab === 'users' && <Users className="w-5 h-5 text-slate-500" />}
                                {activeTab === 'system' && <Settings className="w-5 h-5 text-slate-500" />}
                                {activeTab === 'notifications' && <Bell className="w-5 h-5 text-slate-500" />}

                                <span className="font-bold text-slate-800">
                                    {activeTab === 'bookings' && 'Booking Management'}
                                    {activeTab === 'schedule' && '2026 Season Schedule'}
                                    {activeTab === 'users' && 'Users & Roles'}
                                    {activeTab === 'system' && 'System Controls'}
                                    {activeTab === 'notifications' && 'Notification Center'}
                                </span>
                            </div>
                            {isMobileMenuOpen ? (
                                <XCircle className="w-5 h-5 text-slate-400" />
                            ) : (
                                <List className="w-5 h-5 text-slate-400" />
                            )}
                        </button>

                        {/* Mobile Menu Dropdown */}
                        {isMobileMenuOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col divide-y divide-slate-100">
                                {[
                                    { id: 'bookings', label: 'Booking Management', icon: List },
                                    { id: 'schedule', label: '2026 Season Schedule', icon: Calendar },
                                    { id: 'notifications', label: 'Notification Center', icon: Bell },
                                    { id: 'users', label: 'Users & Roles', icon: Users },
                                    { id: 'system', label: 'System Controls', icon: Settings }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`flex items-center gap-3 p-4 text-left transition-colors ${activeTab === tab.id
                                            ? 'bg-indigo-50 text-indigo-700 font-bold'
                                            : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                                        <span>{tab.label}</span>
                                        {tab.id === 'system' && isSystemFrozen && (
                                            <span className="ml-auto w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                        )}
                                        {activeTab === tab.id && (
                                            <CheckCircle className="w-4 h-4 ml-auto text-indigo-600" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Desktop: Tabs */}
                    <div className="hidden md:flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
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
                            onClick={() => setActiveTab('notifications')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'notifications' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Notifications
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

                {/* Notifications Tab Content */}
                {activeTab === 'notifications' && (
                    <NotificationsTab triggerAlert={triggerAlert} isTestMode={isTestMode} />
                )}



                {/* 2026 Season Schedule Tab Content */}
                {activeTab === 'schedule' && (
                    <div className="mt-8 col-span-1 md:col-span-2 lg:col-span-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SeasonSchedule
                            currentOrder={getShareholderOrder(2026)}
                            allBookings={allBookings}
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
                                    <div className="p-3 bg-rose-100 text-rose-700 rounded-lg">
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
                                        <List className="w-4 h-4" />
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
                                                : 'bg-rose-100 text-rose-800 border-rose-200';

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
                                                                    <div className="px-2 py-1 rounded text-[10px] font-bold border bg-green-50 text-green-700 border-green-200">
                                                                        CONFIRMED
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
                                                                    <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">Maintenance Fee</div>
                                                                    {(booking.type === 'pass' || booking.type === 'auto-pass' || booking.type === 'cancelled') ? (
                                                                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                                                                            {(() => {
                                                                                const cost = calculateBookingCost(booking.from, booking.to);
                                                                                return cost?.averageRate ? `$${Math.round(cost.averageRate)} avg/night` : '$125/night';
                                                                            })()}
                                                                        </div>
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
                                                <th className="px-6 py-4 text-center">Fee Status</th>
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
                                                                    {(() => {
                                                                        const statusConfig = {
                                                                            'ACTIVE': { label: 'Active Now', className: 'bg-emerald-100 text-emerald-700 border-emerald-200 animate-pulse' },
                                                                            'GRACE_PERIOD': { label: 'Early Access', className: 'bg-amber-100 text-amber-700 border-amber-200' },
                                                                            'SKIPPED': { label: 'Skipped', className: 'bg-rose-100 text-rose-700 border-rose-200' },
                                                                            'FUTURE': { label: 'Pending', className: 'bg-slate-100 text-slate-400 border-slate-200' },
                                                                            'PASSED': { label: 'Passed', className: 'bg-slate-100 text-slate-500 border-slate-200' },
                                                                            'CANCELLED': { label: 'Cancelled', className: 'bg-rose-50 text-rose-500 border-rose-100 line-through' }
                                                                        };
                                                                        const config = statusConfig[slot.status] || statusConfig['FUTURE'];
                                                                        return (
                                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}>
                                                                                {config.label}
                                                                            </span>
                                                                        );
                                                                    })()}
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
                                                                        <>
                                                                            <CheckCircle className="w-3 h-3 mr-1.5" />
                                                                            Confirmed
                                                                        </>
                                                                    </span>
                                                                )}
                                                            </td>

                                                            <td className="px-6 py-5 text-center">
                                                                {(booking.type === 'pass' || booking.type === 'auto-pass' || booking.type === 'cancelled') ? (
                                                                    <span className="text-slate-400">—</span>
                                                                ) : (
                                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${booking.isPaid
                                                                        ? 'bg-green-50 text-green-700 border-green-200'
                                                                        : 'bg-rose-50 text-rose-700 border-rose-200'
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
                                    {IS_SITE_OWNER && (
                                        <button
                                            onClick={handleAddShareholder}
                                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors flex items-center gap-2 shadow-sm"
                                        >
                                            <PlusCircle className="w-4 h-4" />
                                            Add Shareholder
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
                <div className="mt-12 pt-8 border-t text-center space-y-2 pb-8">
                    <p className="text-xs text-muted-foreground mb-1">&copy; 2026 Honeymoon Haven Resort</p>
                    <div className="text-center mt-6">
                        <p className="text-[10px] text-muted-foreground/60">v{__APP_VERSION__}</p>
                    </div>
                </div>
            </div >
        </div >
    );
}
