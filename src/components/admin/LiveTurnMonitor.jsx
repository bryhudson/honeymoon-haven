import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../lib/firebase';
import { Zap, Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useBookingRealtime } from '../../hooks/useBookingRealtime';
import { ConfirmationModal } from '../ConfirmationModal';

export function LiveTurnMonitor() {
    const { status } = useBookingRealtime();
    const [log, setLog] = useState({});
    const [loadingLog, setLoadingLog] = useState(true);
    const [forcing, setForcing] = useState(null);
    const [confirmData, setConfirmData] = useState(null); // { type, label }
    const [alertData, setAlertData] = useState(null); // { title, message, isDanger }

    const activePicker = status?.activePicker;
    const round = status?.round || 1;

    // Listen to notification log for active picker
    useEffect(() => {
        if (!activePicker) {
            setLoadingLog(false);
            return;
        }

        const logId = `${activePicker}-${round}`;
        const unsub = onSnapshot(doc(db, "notification_log", logId), (docSnap) => {
            if (docSnap.exists()) {
                setLog(docSnap.data());
            } else {
                setLog({});
            }
            setLoadingLog(false);
        });

        return () => unsub();
    }, [activePicker, round]);

    // Data for rendering checklist
    const windowStarts = status?.windowStarts?.toDate ? status.windowStarts.toDate() : (status?.windowStarts ? new Date(status.windowStarts) : null);
    const windowEnds = status?.windowEnds?.toDate ? status.windowEnds.toDate() : (status?.windowEnds ? new Date(status.windowEnds) : null);

    // Calculate Expected Times
    const getExpectedTime = (type) => {
        if (!windowStarts) return null;
        const d = new Date(windowStarts);
        switch (type) {
            case 'turnStarted': return windowStarts;
            case 'evening':
                const eve = new Date(d); eve.setHours(19, 0, 0, 0);
                return eve;
            case 'day2':
                const mor = new Date(d); mor.setDate(d.getDate() + 1); mor.setHours(9, 0, 0, 0);
                return mor;
            case 'final':
                const fin = new Date(d); fin.setDate(d.getDate() + 2); fin.setHours(9, 0, 0, 0);
                return fin;
            case 'urgent':
                if (!windowEnds) return null;
                const urg = new Date(windowEnds); urg.setHours(urg.getHours() - 2);
                return urg;
            default: return null;
        }
    };

    // Click "Force Send" -> Open Modal
    const requestForceSend = (type, label) => {
        setConfirmData({ type, label });
    };

    // Confirm in Modal -> Execute
    const executeForceSend = async () => {
        if (!confirmData) return;
        const { type, label } = confirmData;

        setForcing(type);
        setConfirmData(null); // Close modal

        try {
            const forceSendFn = httpsCallable(functions, 'forceSendNotification');
            const result = await forceSendFn({
                targetShareholder: activePicker,
                notificationType: type,
                round: round
            });
            // Show the actual result from the server (e.g. "Sent to user@example.com")
            // Show modern success modal
            setAlertData({
                title: "Example Sent! 📨",
                message: `✅ Success: ${result.data.message}`,
                isDanger: false
            });
        } catch (err) {
            setAlertData({
                title: "Error Sending",
                message: `❌ Failed: ${err.message}`,
                isDanger: true
            });
        } finally {
            setForcing(null);
        }
    };

    const renderChecklistItem = (timestampKey, type, label) => {
        const timestamp = log[timestampKey];
        const isSent = !!timestamp;
        const expectedTime = getExpectedTime(type);
        const now = new Date();

        // Status Logic
        let status = 'future'; // default
        if (isSent) status = 'sent';
        else if (expectedTime && now > expectedTime) status = 'overdue';
        else if (expectedTime && now <= expectedTime) status = 'pending';

        // Styling
        let icon = <Clock className="w-5 h-5 text-slate-300" />;
        let bgColor = "bg-white";
        let borderColor = "border-slate-100";
        let titleColor = "text-slate-500";
        let timeText = expectedTime ? `Scheduled: ${expectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${expectedTime.toLocaleDateString([], { weekday: 'short' })}` : 'Pending schedule...';

        if (status === 'sent') {
            icon = <CheckCircle className="w-5 h-5 text-green-500" />;
            bgColor = "bg-green-50";
            borderColor = "border-green-200";
            titleColor = "text-green-700";
            timeText = `Sent: ${new Date(timestamp.toDate()).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
        } else if (status === 'overdue') {
            icon = <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />;
            bgColor = "bg-red-50";
            borderColor = "border-red-200";
            titleColor = "text-red-700";
            timeText = <span className="font-bold text-red-600">Missed: {expectedTime.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>;
        } else if (status === 'pending') {
            // Future / Pending
            icon = <Clock className="w-5 h-5 text-indigo-400" />;
            bgColor = "bg-slate-50";
            borderColor = "border-slate-200";
            titleColor = "text-slate-700";
        }

        return (
            <div className={`relative flex items-center justify-between p-3 rounded-lg border ${borderColor} ${bgColor} transition-all`}>
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                        {icon}
                    </div>
                    <div>
                        <div className={`text-sm font-bold ${titleColor}`}>{label}</div>
                        <div className="text-xs text-slate-500">
                            {timeText}
                        </div>
                    </div>
                </div>

                {/* Force Send Action */}
                {!isSent && (
                    <button
                        onClick={() => requestForceSend(type, label)}
                        disabled={forcing} // Global forcing state
                        className={`
                            px-3 py-1.5 rounded-md text-xs font-bold border shadow-sm transition-all
                            ${status === 'overdue'
                                ? 'bg-red-600 text-white border-red-700 hover:bg-red-700 opacity-100 animate-pulse' // Prominent if overdue
                                : 'bg-white text-slate-500 border-slate-200 hover:text-red-600 hover:border-red-200 opacity-0 group-hover:opacity-100' // Subtle if future
                            }
                        `}
                    >
                        {status === 'overdue' ? 'Force Send ⚠️' : 'Force Send'}
                    </button>
                )}
            </div>
        );
    };

    const [pickerDetails, setPickerDetails] = useState(null);

    // Fetch Picker Details
    useEffect(() => {
        if (!activePicker) {
            setPickerDetails(null);
            return;
        }

        const fetchDetails = async () => {
            try {
                // Find shareholder by name (Assuming 'shareholders' collection exists and has 'name', 'email', 'defaultCabin')
                // Since activePicker is just the name string, we need to query.
                // NOTE: 'shareholders' collection might be keyed by UID or ID.
                // Let's try querying by name field.
                const { collection, query, where, getDocs } = await import('firebase/firestore');
                const q = query(collection(db, "shareholders"), where("name", "==", activePicker));
                const snap = await getDocs(q);

                if (!snap.empty) {
                    setPickerDetails(snap.docs[0].data());
                } else {
                    setPickerDetails(null);
                }
            } catch (err) {
                console.error("Failed to fetch picker details", err);
            }
        };
        fetchDetails();
    }, [activePicker]);

    if (!activePicker) return null;

    return (
        <>
            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden p-6 mb-8 group">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
                            <RefreshCw className="w-5 h-5 text-green-600 relative z-10" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Live Turn Monitor</h3>
                            <div className="text-xs text-slate-500 flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                                <span>Watching: <strong className="text-indigo-600">{activePicker}</strong> (Round {round})</span>
                                {pickerDetails && (
                                    <span className="flex items-center gap-3 text-slate-400">
                                        <span className="hidden md:inline">|</span>
                                        <span>Cabin: <strong>{pickerDetails.cabin || pickerDetails.cabinNumber || pickerDetails.defaultCabin || "?"}</strong></span>
                                        <span className="hidden md:inline">|</span>
                                        <span>{pickerDetails.email}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    {loadingLog ? (
                        /* Skeleton Loading State */
                        [1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 bg-slate-200 rounded-full"></div>
                                    <div className="space-y-1">
                                        <div className="w-32 h-4 bg-slate-200 rounded"></div>
                                        <div className="w-24 h-3 bg-slate-200 rounded"></div>
                                    </div>
                                </div>
                                <div className="w-20 h-6 bg-slate-200 rounded"></div>
                            </div>
                        ))
                    ) : (
                        <>
                            {renderChecklistItem('lastTurnStartSent', 'turnStarted', '1. Turn Started Email')}
                            {renderChecklistItem('sameDayEveningSent', 'evening', '2. First Night Reminder (7 PM)')}
                            {renderChecklistItem('nextDayMorningSent', 'day2', '3. Middle Morning (9 AM)')}
                            {renderChecklistItem('lastDayMorningSent', 'final', '4. Final Morning (9 AM)')}
                            {renderChecklistItem('twoHourWarningSent', 'urgent', '5. Urgent Warning (T-2h)')}
                        </>
                    )}
                </div>

                {!loadingLog && (
                    <p className="text-[10px] text-slate-400 mt-4 text-center">
                        System automatically detects if emails are <span className="font-bold text-red-500">Missed</span> based on the schedule.
                    </p>
                )}
            </div>

            {/* Replaced inline modal with standardized ConfirmationModal */}
            <ConfirmationModal
                isOpen={!!confirmData}
                onClose={() => setConfirmData(null)}
                onConfirm={executeForceSend}
                title="Force Send Notification?"
                message={`You are about to force send "${confirmData?.label}" to ${activePicker}.\n\n⚠️ WARNING: This action bypasses Test Mode and sends a REAL EMAIL to the shareholder immediately.`}
                isDanger={true}
                confirmText="Force Send"
                requireTyping="force send"
            />

            {/* Alert Modal (Success/Error) */}
            <ConfirmationModal
                isOpen={!!alertData}
                onClose={() => setAlertData(null)}
                onConfirm={() => setAlertData(null)}
                title={alertData?.title}
                message={alertData?.message}
                isDanger={alertData?.isDanger}
                confirmText="OK"
                showCancel={false}
            />
        </>
    );
}
