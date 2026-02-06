import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { CABIN_OWNERS, getShareholderOrder, mapOrderToSchedule, normalizeName, formatNameForDisplay } from '../../../lib/shareholders';
import { emailService } from '../../../services/emailService';
import { db, functions } from '../../../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, writeBatch, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, setDoc, deleteField, getDoc } from 'firebase/firestore';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { format, differenceInDays } from 'date-fns';
import { List, Calendar, Users, CheckCircle, XCircle, Mail, Download, Settings, Bell, PlusCircle } from 'lucide-react';
import { calculateBookingCost } from '../../../lib/pricing';
import { EditBookingModal } from '../components/EditBookingModal';
import { UserActionsDropdown } from '../../dashboard/components/UserActionsDropdown';
import { ReauthenticationModal } from '../../auth/components/ReauthenticationModal';
import { PromptModal } from '../../../components/ui/PromptModal';
import { CreateUserModal } from '../components/CreateUserModal';
import { ShareholderHero } from '../../dashboard/components/ShareholderHero';
import { AdminTurnHero } from '../../dashboard/components/AdminTurnHero';
import { SeasonSchedule } from '../../dashboard/components/SeasonSchedule';
import { backupBookingsToFirestore, exportBookingsToCSV } from '../services/backupService';
import { SystemTab } from '../components/SystemTab';
import { NotificationsTab } from '../components/NotificationsTab';
import { AdminStatsGrid } from '../components/AdminStatsGrid';
import { AdminBookingManagement } from '../components/AdminBookingManagement';
import { AdminUserManagement } from '../components/AdminUserManagement';

export function AdminDashboard() {
    const { currentUser } = useAuth();
    const IS_SITE_OWNER = currentUser?.email === 'bryan.m.hudson@gmail.com';

    // UI State
    const [activeTab, setActiveTab] = useState('bookings');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Data State
    const [allBookings, setAllBookings] = useState([]);
    const [shareholders, setShareholders] = useState([]);

    // Auth Modal State
    const [authModal, setAuthModal] = useState({ isOpen: false, title: "", message: "", onConfirm: async () => { } });

    // Confirmation Modal State
    const [confirmation, setConfirmation] = useState({ isOpen: false, title: "", message: "", onConfirm: () => { }, isDanger: false, confirmText: "Confirm", showCancel: true, requireTyping: null });

    // Prompt Modal State
    const [promptData, setPromptData] = useState({ isOpen: false, title: "", message: "", defaultValue: "", inputType: "text", confirmText: "Confirm", onConfirm: () => { } });

    const triggerConfirm = (title, message, onConfirm, isDanger = false, confirmText = "Confirm", requireTyping = null) => {
        setConfirmation({ isOpen: true, title, message, onConfirm, isDanger, confirmText, showCancel: true, requireTyping });
    };

    const triggerAlert = (title, message) => {
        setConfirmation({ isOpen: true, title, message, onConfirm: () => { }, isDanger: false, confirmText: "OK", showCancel: false });
    };

    const triggerPrompt = (title, message, defaultValue, onConfirm, inputType = "text", confirmText = "Confirm") => {
        setPromptData({ isOpen: true, title, message, defaultValue, onConfirm, inputType, confirmText });
    };

    // System Settings State
    const [simStartDate, setSimStartDate] = useState("");
    const [currentSimDate, setCurrentSimDate] = useState(null);
    const [isSystemFrozen, setIsSystemFrozen] = useState(false);
    const [isTestMode, setIsTestMode] = useState(true);
    const [fastTestingMode, setFastTestingMode] = useState(false);
    const [bypassTenAM, setBypassTenAM] = useState(false);
    const [draftStatus, setDraftStatus] = useState(null);

    // Editing State (Bookings)
    const [editingBooking, setEditingBooking] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [bookingViewMode, setBookingViewMode] = useState('list');

    // Editing State (Users)
    const [editingShareholder, setEditingShareholder] = useState(null);
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(interval);
    }, []);

    // Listeners and Data Fetching
    useEffect(() => {
        const unsubSettings = onSnapshot(doc(db, "settings", "general"), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.draftStartDate) {
                    const d = data.draftStartDate.toDate();
                    setCurrentSimDate(d);
                    setSimStartDate(format(d, "yyyy-MM-dd'T'HH:mm"));
                }
                setIsSystemFrozen(data.isSystemFrozen || false);
                setIsTestMode(data.isTestMode !== undefined ? data.isTestMode : true);
                setFastTestingMode(data.fastTestingMode || false);
                setBypassTenAM(data.bypassTenAM || false);
            }
        });

        const unsubStatus = onSnapshot(doc(db, "status", "draftStatus"), (snap) => {
            if (snap.exists()) setDraftStatus(snap.data());
        });

        const qBookings = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
        const unsubBookings = onSnapshot(qBookings, (snapshot) => {
            setAllBookings(snapshot.docs.map(doc => {
                const data = doc.data();
                return { id: doc.id, ...data, from: data.from?.toDate ? data.from.toDate() : new Date(data.from), to: data.to?.toDate ? data.to.toDate() : new Date(data.to), createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt) };
            }));
            setLoading(false);
        });

        const qUsers = query(collection(db, "shareholders"), orderBy("cabin"));
        const unsubUsers = onSnapshot(qUsers, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            list.sort((a, b) => parseInt(a.cabin) - parseInt(b.cabin));
            setShareholders(list);
        });

        return () => { unsubSettings(); unsubStatus(); unsubBookings(); unsubUsers(); };
    }, []);

    // Handlers: Authentication
    const requireAuth = (title, message, action) => {
        setAuthModal({ isOpen: true, title, message, onConfirm: action });
    };

    // Handlers: Booking Actions
    const handleToggleFinalized = async (id, status) => {
        try { await updateDoc(doc(db, "bookings", id), { isFinalized: !status }); triggerAlert("Success", "Status updated."); }
        catch (e) { triggerAlert("Error", e.message); }
    };

    const handleTogglePaid = async (booking) => {
        const isPaid = !booking.isPaid;
        triggerConfirm(isPaid ? "Confirm Payment" : "Revert Payment", isPaid ? "Mark as PAID?" : "Mark as UNPAID?", async () => {
            try { await updateDoc(doc(db, "bookings", booking.id), { isPaid }); triggerAlert("Success", "Payment updated."); }
            catch (e) { triggerAlert("Error", e.message); }
        }, !isPaid);
    };

    const handleCancelBooking = (booking) => {
        triggerConfirm("Cancel Booking?", `Are you sure?`, async () => {
            try { await updateDoc(doc(db, "bookings", booking.id), { type: 'cancelled', isFinalized: false, isPaid: false }); triggerAlert("Success", "Cancelled."); }
            catch (e) { triggerAlert("Error", e.message); }
        }, true, "Cancel Booking", "cancel");
    };

    const handleSendPaymentReminder = async (booking) => {
        // Find shareholder email
        const shareholder = shareholders.find(s => s.name === booking.shareholderName);
        const targetEmail = isTestMode ? "bryan.m.hudson@gmail.com" : (shareholder?.email || "bryan.m.hudson@gmail.com");
        const targetName = isTestMode ? `[TEST] ${booking.shareholderName}` : booking.shareholderName;

        triggerConfirm("Send Reminder?", `Send reminder to ${targetName} (${targetEmail})?`, async () => {
            try {
                await emailService.sendEmail({
                    to: { name: targetName, email: targetEmail },
                    templateId: 'paymentReminder',
                    params: {
                        name: booking.shareholderName,
                        total_price: booking.totalPrice || 0,
                        cabin_number: booking.cabinNumber || "?",
                        check_in: booking.from ? format(booking.from, 'PPP') : "N/A",
                        dashboard_url: window.location.origin
                    }
                });
                triggerAlert("Success", "Reminder sent.");
            } catch (e) { triggerAlert("Error", "Failed to send."); }
        });
    };

    const handleSaveEdit = async (updated) => {
        try { const { id, ...data } = updated; await updateDoc(doc(db, "bookings", id), data); setIsEditModalOpen(false); setEditingBooking(null); triggerAlert("Success", "Updated."); }
        catch (e) { triggerAlert("Error", "Failed."); }
    };

    // Handlers: User Actions
    const handleUpdateShareholder = async () => {
        if (!editingShareholder) return;
        try { await updateDoc(doc(db, "shareholders", editingShareholder.id), { email: editingShareholder.email }); setEditingShareholder(null); triggerAlert("Success", "User updated."); }
        catch (e) { triggerAlert("Error", e.message); }
    };

    const handlePasswordChange = async (user) => {
        triggerPrompt("Reset Password", `Enter new password for ${user.name}:`, "", async (pass) => {
            if (!pass || pass.length < 6) { triggerAlert("Error", "Min 6 characters."); return; }
            try { const resetFn = httpsCallable(functions, 'adminResetUserPassword'); await resetFn({ email: user.email, newPassword: pass }); triggerAlert("Success", "Password reset."); }
            catch (e) { triggerAlert("Error", e.message); }
        }, "password");
    };

    const handleDeleteUser = (user) => {
        triggerConfirm("Delete User?", `DELETE ${user.name}? This is irreversible.`, async () => {
            try { await deleteDoc(doc(db, "shareholders", user.id)); triggerAlert("Success", "User deleted."); }
            catch (e) { triggerAlert("Error", "Failed to delete."); }
        }, true, "DELETE USER", "delete user");
    };

    const handleResetWelcomeBanner = async (user) => {
        try { await updateDoc(doc(db, "shareholders", user.id), { hasSeenWelcome: deleteField() }); triggerAlert("Success", "Banner reset."); }
        catch (e) { triggerAlert("Error", "Failed."); }
    };

    // Handlers: System Actions
    const handleToggleFreeze = async () => {
        requireAuth("Maintenance Mode", "Toggle system maintenance?", async () => {
            try { const ref = doc(db, "settings", "general"); const snap = await getDoc(ref); const cur = snap.exists() ? snap.data().isSystemFrozen : false; await setDoc(ref, { isSystemFrozen: !cur }, { merge: true }); triggerAlert("Success", !cur ? "System is in Maintenance Mode" : "System No Longer in Maintenance Mode"); }
            catch (e) { triggerAlert("Error", "Failed."); }
        });
    };

    const handleWipeDatabase = () => {
        if (!IS_SITE_OWNER) return;
        requireAuth("WIPE DATABASE", "EXTREME DANGER", () => {
            triggerConfirm("NUKE DATA?", "Type 'wipe database' to confirm.", async () => {
                try {
                    const snap = await getDocs(collection(db, "bookings"));
                    const batch = writeBatch(db); snap.docs.forEach(d => batch.delete(d.ref)); await batch.commit();
                    await setDoc(doc(db, "status", "draftStatus"), { activePicker: null, round: 1, phase: 'ROUND_1' });
                    triggerAlert("Success", "Wiped.");
                } catch (e) { triggerAlert("Error", e.message); }
            }, true, "NUKE", "wipe database");
        });
    };

    const handleActivateProductionMode = async () => {
        requireAuth("ACTIVATE PRODUCTION", "Switch to LIVE PRODUCTION? This will WIPE ALL TEST DATA. Date will be set to April 13, 2026.", async () => {
            triggerConfirm("CONFIRM WIPE + START", "This will DELETE ALL DATA and start Production.", async () => {
                try {
                    // Safety Net: Backup First
                    triggerAlert("Info", "Creating Backup...");
                    const backupId = await backupBookingsToFirestore();

                    // Safety Net: CSV Download
                    const snap = await getDocs(collection(db, "bookings"));
                    const currentBookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    exportBookingsToCSV(currentBookings);

                    if (backupId) {
                        triggerAlert("Success", `Backup Saved: ${backupId}. Proceeding to Wipe.`);
                    } else {
                        triggerAlert("Info", "Backups skipped (Default Empty). Proceeding.");
                    }

                    // 1. Wipe DB (Clean Slate)
                    const batch = writeBatch(db);
                    snap.docs.forEach(d => batch.delete(d.ref));
                    await batch.commit();

                    // 2. Reset Status
                    await setDoc(doc(db, "status", "draftStatus"), { activePicker: null, round: 1, phase: 'ROUND_1' });

                    // 3. Set Production Mode + Date
                    const ref = doc(db, "settings", "general");
                    const prodDate = new Date("2026-04-13T10:00:00");
                    await setDoc(ref, {
                        isTestMode: false,
                        draftStartDate: Timestamp.fromDate(prodDate)
                    }, { merge: true });
                    setSimStartDate(format(prodDate, "yyyy-MM-dd'T'HH:mm"));
                    triggerAlert("Success", "Production Mode ACTIVATED. DB Wiped. Date set to April 13, 2026.");
                } catch (e) { triggerAlert("Error", "Failed to activate Production: " + e.message); }
            }, true, "START PRODUCTION", "start production");
        });
    };

    const handleActivateTestMode = async () => {
        if (!IS_SITE_OWNER) return;
        requireAuth("ACTIVATE TEST MODE", "WIPE DATABASE and reset to Today @ 10am?", async () => {
            triggerConfirm("CONFIRM WIPE + RESET", "This will DELETE ALL DATA and reset the clock.", async () => {
                try {
                    // Safety Net: Backup First
                    triggerAlert("Info", "Creating Backup...");
                    const backupId = await backupBookingsToFirestore();

                    // Safety Net: CSV Download
                    const snap = await getDocs(collection(db, "bookings"));
                    const currentBookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    exportBookingsToCSV(currentBookings);

                    if (backupId) {
                        triggerAlert("Success", `Backup Saved: ${backupId}. Proceeding to Wipe.`);
                    }

                    // 1. Wipe DB
                    const batch = writeBatch(db);
                    snap.docs.forEach(d => batch.delete(d.ref));
                    await batch.commit();

                    // 2. Reset Status
                    await setDoc(doc(db, "status", "draftStatus"), { activePicker: null, round: 1, phase: 'ROUND_1' });

                    // 3. Set Test Mode + Today's Date @ 10am
                    const todayTenAm = new Date();
                    todayTenAm.setHours(10, 0, 0, 0);

                    const ref = doc(db, "settings", "general");
                    await setDoc(ref, {
                        isTestMode: true,
                        draftStartDate: Timestamp.fromDate(todayTenAm)
                    }, { merge: true });

                    setSimStartDate(format(todayTenAm, "yyyy-MM-dd'T'HH:mm"));
                    triggerAlert("Success", "Test Mode ACTIVATED. DB Wiped. Clock Reset.");
                } catch (e) { triggerAlert("Error", e.message); }
            }, true, "NUKE & RESET", "wipe database");
        });
    };

    // Derived Logic
    const analytics = React.useMemo(() => {
        const stats = { totalRevenue: 0, outstandingFees: 0, totalBookings: 0, unpaidCount: 0, totalNights: 0 };
        allBookings.forEach(b => {
            if (b.type !== 'cancelled' && b.type !== 'pass' && b.type !== 'auto-pass') {
                const nights = (b.from && b.to) ? differenceInDays(b.to, b.from) : 0;
                const cost = calculateBookingCost(b.from, b.to);
                const amount = b.totalPrice || cost.total;
                stats.totalBookings++; stats.totalNights += nights;
                if (b.isPaid) stats.totalRevenue += amount; else { stats.outstandingFees += amount; stats.unpaidCount++; }
            }
        });
        return stats;
    }, [allBookings]);

    const { schedule, activeTurn } = React.useMemo(() => {
        const order = getShareholderOrder(2026);
        const sched = mapOrderToSchedule(order, allBookings, currentSimDate, fastTestingMode, bypassTenAM);
        const active = sched.find(s => s.status === 'ACTIVE' || s.status === 'GRACE_PERIOD') || sched.find(s => s.name === draftStatus?.activePicker && s.round == draftStatus?.round);
        return { schedule: sched, activeTurn: active };
    }, [allBookings, draftStatus, currentSimDate, fastTestingMode, bypassTenAM, tick]);

    if (loading) return <div className="flex items-center justify-center min-h-screen animate-pulse">Loading...</div>;

    const myProfile = shareholders.find(s => s.email === currentUser?.email);

    return (
        <div className="flex flex-col gap-6 py-4 md:py-6 container mx-auto px-4 relative animate-in fade-in duration-500">
            <CreateUserModal isOpen={isCreateUserModalOpen} onClose={() => setIsCreateUserModalOpen(false)} onSuccess={() => triggerAlert("Success", "User created.")} />

            {myProfile && activeTurn ? (
                <ShareholderHero currentUser={currentUser} status={{ ...draftStatus, activePicker: activeTurn.name, phase: 'ROUND_1' }} shareholderName={myProfile.name} drafts={allBookings} isSuperAdmin={true} onOpenBooking={() => window.location.hash = '#book'} />
            ) : activeTurn && (
                <AdminTurnHero activeTurn={activeTurn} drafts={allBookings} isTestMode={isTestMode} isSystemFrozen={isSystemFrozen} />
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">Admin Dashboard <span className="text-sm font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">v{__APP_VERSION__}</span></h1>
                    <p className="text-muted-foreground mt-1">Honeymoon Haven Resort Control Center</p>
                </div>
            </div>

            <div className="md:flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit hidden">
                {['bookings', 'schedule', 'notifications', 'users', 'system'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                ))}
            </div>

            {activeTab === 'bookings' && (
                <div className="space-y-6">
                    <AdminStatsGrid analytics={analytics} />
                    <AdminBookingManagement schedule={schedule} allBookings={allBookings} bookingViewMode={bookingViewMode} setBookingViewMode={setBookingViewMode} handleEditClick={(b) => { setEditingBooking(b); setIsEditModalOpen(true); }} handleCancelBooking={handleCancelBooking} handleToggleFinalized={handleToggleFinalized} handleTogglePaid={handleTogglePaid} handleSendPaymentReminder={handleSendPaymentReminder} triggerAlert={triggerAlert} />
                </div>
            )}

            {activeTab === 'users' && (
                <AdminUserManagement
                    shareholders={shareholders}
                    editingShareholder={editingShareholder}
                    setEditingShareholder={setEditingShareholder}
                    handleUpdateShareholder={handleUpdateShareholder}
                    handlePasswordChange={handlePasswordChange}
                    handleDeleteUser={handleDeleteUser}
                    handleResetWelcomeBanner={handleResetWelcomeBanner}
                    setIsCreateUserModalOpen={setIsCreateUserModalOpen}
                    IS_SITE_OWNER={IS_SITE_OWNER}
                />
            )}

            {activeTab === 'schedule' && <SeasonSchedule currentOrder={getShareholderOrder(2026)} allBookings={allBookings} status={draftStatus || { phase: 'PRE_DRAFT' }} startDateOverride={currentSimDate} fastTestingMode={fastTestingMode} bypassTenAM={bypassTenAM} />}
            {activeTab === 'notifications' && <NotificationsTab triggerAlert={triggerAlert} isTestMode={isTestMode} />}
            {activeTab === 'system' && (
                <SystemTab
                    isTestMode={isTestMode}
                    handleActivateProductionMode={handleActivateProductionMode}
                    handleActivateTestMode={handleActivateTestMode}
                    isSystemFrozen={isSystemFrozen}
                    toggleSystemFreeze={handleToggleFreeze}
                    IS_SITE_OWNER={IS_SITE_OWNER}
                    triggerAlert={triggerAlert}
                />
            )}

            <ConfirmationModal isOpen={confirmation.isOpen} onClose={() => setConfirmation(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmation.onConfirm} title={confirmation.title} message={confirmation.message} isDanger={confirmation.isDanger} confirmText={confirmation.confirmText} showCancel={confirmation.showCancel} requireTyping={confirmation.requireTyping} />
            <EditBookingModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveEdit} booking={editingBooking} otherBookings={allBookings.filter(b => b.id !== editingBooking?.id)} />
            <ReauthenticationModal isOpen={authModal.isOpen} onClose={() => setAuthModal(prev => ({ ...prev, isOpen: false }))} onConfirm={authModal.onConfirm} title={authModal.title} message={authModal.message} />
            <PromptModal isOpen={promptData.isOpen} onClose={() => setPromptData(prev => ({ ...prev, isOpen: false }))} onConfirm={promptData.onConfirm} title={promptData.title} message={promptData.message} defaultValue={promptData.defaultValue} inputType={promptData.inputType} confirmText={promptData.confirmText} />

            <div className="mt-12 pt-8 border-t text-center pb-8"><p className="text-xs text-muted-foreground">&copy; 2026 Honeymoon Haven Resort</p><p className="text-[10px] text-muted-foreground/60 mt-1">v{__APP_VERSION__}</p></div>
        </div>
    );
}
