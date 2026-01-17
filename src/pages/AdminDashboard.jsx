import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CABIN_OWNERS, DRAFT_CONFIG, getShareholderOrder, mapOrderToSchedule } from '../lib/shareholders';
import { emailService } from '../services/emailService';
import { db, functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, writeBatch, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, addDoc } from 'firebase/firestore';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ActionsDropdown } from '../components/ActionsDropdown';
import { format, differenceInDays, set } from 'date-fns';
import { Trash2, PlayCircle, Clock, Bell, Calendar, Settings, AlertTriangle, CheckCircle, DollarSign, Pencil, XCircle, Ban, Mail, Key } from 'lucide-react';
import { EditBookingModal } from '../components/EditBookingModal';
import { ReauthenticationModal } from '../components/ReauthenticationModal';
import { PromptModal } from '../components/PromptModal';
import { CreateUserModal } from '../components/CreateUserModal';
import { Users, UserPlus } from 'lucide-react';

export function AdminDashboard() {
    const { currentUser } = useAuth();

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

    const triggerConfirm = (title, message, onConfirm, isDanger = false, confirmText = "Confirm") => {
        setConfirmation({ isOpen: true, title, message, onConfirm, isDanger, confirmText, showCancel: true });
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

    // Editing State
    const [editingBooking, setEditingBooking] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Fetch Settings & Bookings
    useEffect(() => {
        // 1. Settings
        const unsubSettings = onSnapshot(doc(db, "settings", "general"), (doc) => {
            if (doc.exists() && doc.data().draftStartDate) {
                const d = doc.data().draftStartDate.toDate();
                setCurrentSimDate(d);
                setSimStartDate(format(d, "yyyy-MM-dd'T'HH:mm"));
                setIsSystemFrozen(doc.data().isSystemFrozen || false);
            } else {
                setCurrentSimDate(null);
                setSimStartDate("");
                setIsSystemFrozen(doc.data()?.isSystemFrozen || false);
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
        };
    }, []);

    const performWipe = async () => {
        setActionLog("Reseting database...");
        const querySnapshot = await getDocs(collection(db, "bookings"));
        const count = querySnapshot.size;

        if (count === 0) {
            setActionLog("Database is already empty.");
            return 0;
        }

        const batch = writeBatch(db);
        querySnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        // Hard Clean
        localStorage.clear();
        sessionStorage.clear();
        return count;
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

    const toggleSystemFreeze = async () => {
        try {
            await updateDoc(doc(db, "settings", "general"), {
                isSystemFrozen: !isSystemFrozen
            });
            triggerAlert("Success", `System is now ${!isSystemFrozen ? 'in Maintenance Mode' : 'Active'}`);
        } catch (err) {
            console.error("Failed to toggle freeze:", err);
            triggerAlert("Error", "Failed to update freeze settings.");
        }
    };

    const handleEditClick = (booking) => {
        setEditingBooking(booking);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async (updatedBooking) => {
        try {
            await updateDoc(doc(db, "bookings", updatedBooking.id), {
                shareholderName: updatedBooking.shareholderName,
                cabinNumber: updatedBooking.cabinNumber,
                from: updatedBooking.from,
                to: updatedBooking.to,
                guests: updatedBooking.guests || 1, // Fix: Save guest count
                isFinalized: updatedBooking.isFinalized,
                type: updatedBooking.type || null // Reset type if removed (e.g. un-cancelling)
            });
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
                        await updateDoc(doc(db, "bookings", booking.id), { isPaid: false });
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
                        await updateDoc(doc(db, "bookings", booking.id), { isPaid: true });

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
                    const sendEmail = httpsCallable(functions, 'sendEmail');
                    await sendEmail({
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
                        isPaid: false
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
            "Cancel Booking"
        );
    };

    const resetOnboarding = () => {
        localStorage.removeItem('hhr_tour_seen');
        triggerAlert("Tour Reset", "The onboarding tour has been reset for your browser. It will appear the next time you visit the dashboard.");
    };

    const handleRunReminders = async () => {
        const currentOrder = getShareholderOrder(2026);
        const schedule = mapOrderToSchedule(currentOrder, allBookings);
        const activeTurn = schedule.find(s => s.status === 'ACTIVE' || s.status === 'GRACE_PERIOD');

        if (!activeTurn) {
            triggerAlert("Status", "No active turn found to remind.");
            return;
        }

        const now = new Date();
        const hoursRemaining = (activeTurn.end - now) / (1000 * 60 * 60);

        triggerConfirm(
            "Send Reminder?",
            `Active User: ${activeTurn.name}\nTime Remaining: ${Math.round(hoursRemaining)} hours\n\nDo you want to send a reminder email to ${activeTurn.name}?`,
            async () => {
                try {
                    const owner = shareholders.find(o => o.name === activeTurn.name);
                    if (owner) {
                        const emailData = {
                            name: activeTurn.name,
                            email: "bryan.m.hudson@gmail.com" // OVERRIDE
                        };
                        const contextData = {
                            name: activeTurn.name,
                            hours_remaining: Math.round(hoursRemaining),
                            deadline_date: format(activeTurn.end, 'PPP'),
                            deadline_time: format(activeTurn.end, 'p'),
                            check_in: "TBD", // Draft data could be fetched if we look up active booking
                            check_out: "TBD",
                            has_draft: false, // Could be improved by checking drafts
                            booking_url: window.location.origin,
                            dashboard_url: window.location.origin
                        };

                        if (hoursRemaining < 6) {
                            await emailService.sendFinalWarning(emailData, contextData);
                            triggerAlert("Sent", "Final Warning email sent.");
                        } else {
                            const type = now.getHours() < 12 ? 'morning' : 'evening';
                            await emailService.sendDailyReminder(emailData, { ...contextData, type });
                            triggerAlert("Sent", `${type === 'morning' ? "Morning" : "Evening"} reminder sent.`);
                        }
                    }
                } catch (err) {
                    console.error(err);
                    triggerAlert("Error", "Failed to send reminder.");
                }
            },
            false,
            "Send Email"
        );
    };



    // --- UI ---

    // --- SHAREHOLDERS MANAGEMENT ---
    const [shareholders, setShareholders] = useState([]);
    const [editingShareholder, setEditingShareholder] = useState(null); // { id, email }

    useEffect(() => {
        // Fetch Shareholders
        const q = query(collection(db, "shareholders"), orderBy("cabin"));
        const unsub = onSnapshot(q, async (snapshot) => {
            if (snapshot.empty) {
                // AUTO-MIGRATION: If collection is empty, populate from code constant
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

                            // Show exact message from server (e.g., "Account CREATED...")
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
        let pendingPayments = 0;

        allBookings.forEach(b => {
            // Only count finalized active bookings towards stats (ignore drafts/cancelled/passes)
            if (b.isFinalized && b.type !== 'cancelled' && b.type !== 'pass' && b.type !== 'auto-pass') {
                const nights = (b.from && b.to) ? Math.max(0, Math.round((new Date(b.to) - new Date(b.from)) / (1000 * 60 * 60 * 24))) : 0;
                const amount = nights * 125;

                totalBookings++;

                if (b.isPaid) {
                    totalRevenue += amount;
                } else {
                    outstandingFees += amount;
                    pendingPayments++;
                }
            }
        });

        return { totalRevenue, outstandingFees, totalBookings, pendingPayments };
    }, [allBookings]);



    // Render Auth Modal if needed
    if (!authModal.isOpen && !window.sessionStorage.getItem('admin_auth')) {
        // Ideally we check this in useEffect but for now reliance on parent protected route or manual modal trigger
    }

    // --- USER MANAGEMENT ---
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState(null);

    useEffect(() => {
        if (currentUser?.email) {
            // Fetch own role
            const fetchRole = async () => {
                const docRef = doc(db, 'shareholders', currentUser.email);
                try {
                    const snap = await getDocs(query(collection(db, 'shareholders'))); // Optimize: direct getDoc
                    // Actually let's just look efficiently at the finding in `shareholders` array since we load it anyway?
                    // Wait, `shareholders` state is loaded in separate useEffect.
                    // Let's just trust `shareholders` state once loaded.
                } catch (e) {
                    console.error(e);
                }
            };
        }
    }, [currentUser]);

    // Derived Super Admin status from shareholders list
    const myShareholderProfile = shareholders.find(s => s.email === currentUser?.email);
    // Fallback for hardcoded safety until DB is fully migrated
    const isHardcodedSuper = currentUser?.email === 'bryan.m.hudson@gmail.com';
    const isSuperAdmin = isHardcodedSuper || (myShareholderProfile?.role === 'super_admin');


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

    // Render Loading (Moved here to avoid Hooks Error #310)
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <CreateUserModal
                isOpen={isCreateUserModalOpen}
                onClose={() => setIsCreateUserModalOpen(false)}
                onSuccess={() => triggerAlert("Success", "User created successfully.")}
            />

            {/* Header & Analytics */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
                        <p className="text-muted-foreground mt-1">Overview of resort performance and bookings.</p>
                    </div>
                    <div className="flex gap-3">
                        <Link to="/#book" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors text-sm">
                            View As Shareholder
                        </Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'bookings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Bookings & Schedule
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Users & Roles
                    </button>
                </div>

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
                                        <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
                                        <h3 className="text-2xl font-bold text-slate-900">${analytics.outstandingFees.toLocaleString()}</h3>
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
                                        <Bell className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Pending</p>
                                        <h3 className="text-2xl font-bold text-slate-900">{analytics.pendingPayments}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reminders & Simulation */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* ... (Existing Reminders Card) ... */}
                            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Bell className="w-6 h-6 text-purple-600" />
                                        <h2 className="text-xl font-bold text-slate-900">Email Reminders</h2>
                                    </div>
                                    <button
                                        onClick={handleTestEmail}
                                        className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
                                    >
                                        Test SMTP
                                    </button>
                                </div>
                                <p className="text-sm text-slate-600">
                                    Manually trigger reminder emails for the active shareholder turn.
                                </p>
                                <button
                                    onClick={handleRunReminders}
                                    className="w-full py-4 border-2 border-dashed border-purple-200 rounded-xl flex items-center justify-center gap-2 text-purple-700 font-bold hover:bg-purple-50 hover:border-purple-300 transition-all"
                                >
                                    <Bell className="w-5 h-5" />
                                    Check & Send Reminders
                                </button>
                            </div>

                            {/* System Controls (Restricted) */}
                            {isSuperAdmin && (
                                <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
                                    <div className="flex items-center gap-3">
                                        <Settings className="w-6 h-6 text-slate-600" />
                                        <h2 className="text-xl font-bold text-slate-900">System Controls</h2>
                                    </div>

                                    {/* ... Existing System Controls content ... */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                                                Simulation Date
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="datetime-local"
                                                    value={simStartDate}
                                                    onChange={(e) => setSimStartDate(e.target.value)}
                                                    className="flex-1 p-2 border rounded-lg text-sm"
                                                />
                                                <button
                                                    onClick={handleUpdateStartDate}
                                                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold"
                                                >
                                                    Set
                                                </button>
                                            </div>
                                        </div>

                                        <div className="col-span-2 mt-4 flex justify-end border-t pt-4">
                                            <button
                                                onClick={() => {
                                                    const generateRowHtml = (s) => {
                                                        const b = s.booking;
                                                        const paymentStatus = b?.isPaid ? "PAID" : "UNPAID";
                                                        const paymentColor = b?.isPaid ? "#dcfce7" : "#fee2e2";
                                                        const dateStr = b?.from && b?.to ? `${format(b.from, 'MMM d')} - ${format(b.to, 'MMM d')}` : "";

                                                        return `
                                                        <tr style="background-color: #fff;">
                                                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${s.name}</td>
                                                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${b?.cabinNumber || "?"}</td>
                                                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${dateStr}</td>
                                                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${b ? 7 : 0}</td>
                                                             <td style="padding: 8px; border-bottom: 1px solid #eee;">${b?.isFinalized ? "Finalized" : "Draft"}</td>
                                                            <td style="padding: 8px; border-bottom: 1px solid #eee;">
                                                                <span style="background-color: ${paymentColor}; padding: 2px 6px; borderRadius: 4px; font-size: 11px;">${paymentStatus}</span>
                                                            </td>
                                                        </tr>
                                                        `;
                                                    };

                                                    triggerPrompt(
                                                        "Email Booking Report",
                                                        "Enter recipient email:",
                                                        currentUser?.email || "",
                                                        async (recipient) => {
                                                            if (!recipient) return;
                                                            try {
                                                                const round1Rows = schedule.filter(s => s.round === 1).map(generateRowHtml).join("");
                                                                const round2Rows = schedule.filter(s => s.round === 2).map(generateRowHtml).join("");

                                                                const htmlTable = `
                                                <h2>Current Booking Report</h2>
                                                <p>Generated on ${format(new Date(), 'PPP p')}</p>
                                                
                                                <h3 style="margin-top: 20px; background-color: #f1f5f9; padding: 10px;">Round 1 - Shareholder Rotation</h3>
                                                <table style="width: 100%; border-collapse: collapse; text-align: left; font-family: sans-serif; font-size: 14px;">
                                                    <thead>
                                                        <tr style="background-color: #f8fafc;">
                                                            <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Shareholder</th>
                                                            <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Cabin</th>
                                                            <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Dates</th>
                                                            <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Nights</th>
                                                            <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Status</th>
                                                            <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Payment</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${round1Rows}
                                                    </tbody>
                                                </table>

                                                <h3 style="margin-top: 30px; background-color: #f1f5f9; padding: 10px;">Round 2 - Snake Draft</h3>
                                                <table style="width: 100%; border-collapse: collapse; text-align: left; font-family: sans-serif; font-size: 14px;">
                                                    <thead>
                                                        <tr style="background-color: #f8fafc;">
                                                            <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Shareholder</th>
                                                            <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Cabin</th>
                                                            <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Dates</th>
                                                            <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Nights</th>
                                                            <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Status</th>
                                                            <th style="padding: 8px; border-bottom: 2px solid #e2e8f0;">Payment</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${round2Rows}
                                                    </tbody>
                                                </table>
                                            `;

                                                                const sendEmailFn = httpsCallable(functions, 'sendEmail');
                                                                await sendEmailFn({
                                                                    to: { name: "Admin", email: recipient },
                                                                    subject: `Booking Report - ${format(new Date(), 'MMM d')}`,
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
                                                }}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors text-sm font-medium border border-blue-200"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                                Email Report
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile Card View (Bookings) */}
                        <div className="md:hidden space-y-4 mb-8">
                            {(() => {
                                const currentOrder = getShareholderOrder(2026);
                                const schedule = mapOrderToSchedule(currentOrder, allBookings);

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
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                            Round {slot.round}
                                                        </span>
                                                    </div>
                                                </div>

                                                {isSlotBooked ? (
                                                    <div className={`px-2 py-1 rounded text-[10px] font-bold border ${booking.isFinalized
                                                        ? 'bg-green-50 text-green-700 border-green-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                        {booking.isFinalized ? "FINALIZED" : "DRAFT"}
                                                    </div>
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
                                                                <button
                                                                    onClick={() => handleTogglePaid(booking)}
                                                                    className={`px-3 py-1 rounded text-xs font-bold border transition-all active:scale-95 ${paymentClass}`}
                                                                >
                                                                    {booking.isPaid ? "PAID" : "UNPAID"}
                                                                </button>
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
                                                    {!(booking.type === 'pass' || booking.type === 'auto-pass' || booking.type === 'cancelled') && (
                                                        <button
                                                            onClick={() => handleToggleFinalized(booking.id, booking.isFinalized)}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${booking.isFinalized
                                                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                                : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                                                        >
                                                            {booking.isFinalized ? (
                                                                <><XCircle className="w-3.5 h-3.5" /> Revert</>
                                                            ) : (
                                                                <><CheckCircle className="w-3.5 h-3.5" /> Finalize</>
                                                            )}
                                                        </button>
                                                    )}
                                                    <ActionsDropdown
                                                        onEdit={() => handleEditClick(booking)}
                                                        onCancel={booking.type !== 'cancelled' ? () => handleCancelBooking(booking) : undefined}
                                                        isCancelled={booking.type === 'cancelled'}
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
                                        const schedule = mapOrderToSchedule(currentOrder, allBookings);

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
                                                            <div className="text-xs text-muted-foreground font-mono mt-0.5 opacity-50">Pending</div>
                                                        </td>
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
                                                            <button
                                                                onClick={() => handleToggleFinalized(booking.id, booking.isFinalized)}
                                                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border transition-all active:scale-95 ${booking.isFinalized
                                                                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                                                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                                                    }`}
                                                                title={booking.isFinalized ? "Click to Revert to Draft" : "Click to Finalize"}
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
                                                            </button>
                                                        )}
                                                    </td>

                                                    <td className="px-6 py-5 text-center">
                                                        {(booking.type === 'pass' || booking.type === 'auto-pass' || booking.type === 'cancelled') ? (
                                                            <span className="text-xs text-muted-foreground/30 font-medium select-none">—</span>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => handleTogglePaid(booking)}
                                                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border transition-all active:scale-95 ${booking.isPaid
                                                                        ? 'bg-emerald-600 text-white border-transparent hover:bg-emerald-700 shadow-sm'
                                                                        : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-500 hover:text-emerald-600'
                                                                        }`}
                                                                    title={booking.isPaid ? "Mark as Unpaid" : "Mark as Paid"}
                                                                >
                                                                    {booking.isPaid ? (
                                                                        <>
                                                                            <DollarSign className="w-3 h-3 mr-1" />
                                                                            PAID
                                                                        </>
                                                                    ) : (
                                                                        "UNPAID"
                                                                    )}
                                                                </button>
                                                                {!booking.isPaid && (
                                                                    <button
                                                                        onClick={() => handleSendPaymentReminder(booking)}
                                                                        className="ml-2 p-1.5 align-middle text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                                                        title="Send Payment Reminder"
                                                                    >
                                                                        <Bell className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </td>

                                                    <td className="px-6 py-5 text-right">
                                                        {booking.type !== 'pass' && booking.type !== 'auto-pass' ? (
                                                            <ActionsDropdown
                                                                onEdit={() => handleEditClick(booking)}
                                                                onCancel={booking.type !== 'cancelled' ? () => handleCancelBooking(booking) : undefined}
                                                                isCancelled={booking.type === 'cancelled'}
                                                            />
                                                        ) : (booking.type === 'pass' || booking.type === 'auto-pass') && (
                                                            // Allow editing turns that were passed (e.g. to un-pass)
                                                            <ActionsDropdown
                                                                onEdit={() => handleEditClick(booking)}
                                                            />
                                                        )}
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
                    </>
                )}




                {activeTab === 'users' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">Users & Roles</h2>
                            <button
                                onClick={() => setIsCreateUserModalOpen(true)}
                                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <PlusCircle className="w-4 h-4" />
                                Add User
                            </button>
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

                                    <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-2 justify-end">
                                        <button
                                            onClick={() => setEditingShareholder({ id: person.id, email: person.email })}
                                            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                                        >
                                            <Pencil className="w-3.5 h-3.5" /> Edit
                                        </button>
                                        <button
                                            onClick={() => handlePasswordChange(person)}
                                            className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                                        >
                                            <Key className="w-3.5 h-3.5" /> Password
                                        </button>

                                        {isSuperAdmin && (
                                            <>
                                                <button
                                                    onClick={() => handleRoleChange(person, person.role === 'super_admin' ? 'shareholder' : 'super_admin')}
                                                    className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors flex items-center gap-1.5"
                                                >
                                                    <Shield className="w-3.5 h-3.5" /> Role
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(person)}
                                                    className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1.5"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                                </button>
                                            </>
                                        )}
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
                                                            <div className="flex gap-1 justify-end">
                                                                <button
                                                                    onClick={() => setEditingShareholder({ id: person.id, email: person.email })}
                                                                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                                                    title="Edit Email"
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handlePasswordChange(person)}
                                                                    className="p-1 text-slate-400 hover:text-amber-600 transition-colors"
                                                                    title="Change Password"
                                                                >
                                                                    <Key className="h-4 w-4" />
                                                                </button>
                                                                {isSuperAdmin && (
                                                                    <div className="flex gap-1 border-l border-slate-200 pl-2 ml-1">
                                                                        <button
                                                                            onClick={() => handleRoleChange(person, person.role === 'super_admin' ? 'shareholder' : 'super_admin')}
                                                                            className="p-1 text-slate-400 hover:text-purple-600 transition-colors"
                                                                            title="Change Role"
                                                                        >
                                                                            <Shield className="h-4 w-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteUser(person)}
                                                                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                                                            title="Delete User"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                )}
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
                )}

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
            </div>
        </div>
    );
}
