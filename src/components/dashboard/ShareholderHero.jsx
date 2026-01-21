import React from 'react';
import { Calendar, Clock, CheckCircle, Info, AlertTriangle, PlayCircle, XCircle, Mail, DollarSign, User } from 'lucide-react';
import { format, differenceInDays, intervalToDuration } from 'date-fns';
import confetti from 'canvas-confetti';

export function ShareholderHero({
    currentUser,
    status,
    shareholderName,
    drafts,
    onOpenBooking,
    onFinalize,
    onPass,
    isSystemFrozen,
    isSuperAdmin,
    onViewDetails,
    onEmail,
    onViewSchedule,
    currentOrder,
    isReadOnly = false,
    onOpenFeedback,
    onCelebrated
}) {
    const [now, setNow] = React.useState(new Date());

    // Update timer every minute to keep countdown alive
    React.useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // --- CONFETTI CELEBRATION ---
    React.useEffect(() => {
        // Find the most recent finalized, paid, but uncelebrated booking
        const paidBooking = drafts?.find(b =>
            b.shareholderName === shareholderName &&
            b.isFinalized &&
            b.isPaid &&
            !b.celebrated &&
            b.type !== 'cancelled' &&
            b.type !== 'pass'
        );

        if (paidBooking && onCelebrated) {
            // FIRE CONFETTI!
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min, max) => Math.random() * (max - min) + min;

            const interval = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                // since particles fall down, start a bit higher than random
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            // Mark as celebrated in Firestore
            onCelebrated(paidBooking.id);
        }
    }, [drafts, shareholderName, onCelebrated]);
    if (!shareholderName) return null;

    // Helper to convert number to ordinal (1st, 2nd, 3rd, etc.)
    const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // --- QUEUE CALCULATION (Moved to top to avoid ReferenceError) ---
    // Define Admin Persona Check at top-level so it can be used in Timer logic too
    // IMPORTANT: Don't treat as admin persona if in read-only masquerade mode
    const isAdminPersona = !isReadOnly && (shareholderName === 'HHR Admin' || shareholderName === 'Bryan');

    const queueInfo = React.useMemo(() => {
        if (!currentOrder || !status || !shareholderName) return null;

        if (!currentOrder || !status || !shareholderName) return null;

        // ADMIN OVERRIDE: If name is Admin/Bryan but they are not in the list, return a mock object
        // so they can see the "Active Turn" or "Waiting" UI without crashing or return null
        // Note: 'Bryan' might actually be in the list if he's playing.List check handles that below.

        const fullTurnOrder = [...currentOrder, ...[...currentOrder].reverse()];
        let activeIndex = -1;

        if (status.phase === 'PRE_DRAFT') {
            activeIndex = -1;
        } else if (status.activePicker) {
            const round1Len = currentOrder.length;
            if (status.phase === 'ROUND_1') {
                activeIndex = fullTurnOrder.findIndex((n, i) => n === status.activePicker && i < round1Len);
            } else {
                // If phase is ROUND_2 (or fallback), look in 2nd half
                activeIndex = fullTurnOrder.findIndex((n, i) => n === status.activePicker && i >= round1Len);
                // Fallback: if not found in 2nd half (edge case), find anywhere
                if (activeIndex === -1) activeIndex = fullTurnOrder.findIndex(n => n === status.activePicker);
            }
        }

        // Use findIndex with a filter condition is not direct, so loop
        let myNextIndex = -1;
        for (let i = 0; i < fullTurnOrder.length; i++) {
            if (fullTurnOrder[i] === shareholderName && i > activeIndex) {
                myNextIndex = i;
                break;
            }
        }

        if (myNextIndex === -1) {
            if (isAdminPersona) {
                // Return a mock object so the rest of the component renders "Waiting" state
                return { diff: 99, round: 1 };
            }
            return null;
        }

        // Determine which round the next slot belongs to
        // If myNextIndex is within the first half of the full order (which is length * 2), it's Round 1
        // Actually fullTurnOrder is [R1, R2]. R1 length is currentOrder.length.
        const round = myNextIndex < currentOrder.length ? 1 : 2;

        return { diff: myNextIndex - activeIndex, round };
    }, [currentOrder, status, shareholderName, isReadOnly, isAdminPersona]);

    // 1. System Maintenance (Highest Priority)
    if (isSystemFrozen && !isSuperAdmin) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-sm">
                <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                    <div className="p-4 bg-amber-100 rounded-full text-amber-600 shrink-0">
                        <AlertTriangle className="w-10 h-10" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-amber-900 mb-2">System Maintenance</h2>
                        <p className="text-amber-800/80 text-lg">
                            We are currently performing important system updates. Booking actions are temporarily paused. Please check back shortly.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Open Season
    if (status.phase === 'OPEN_SEASON') {
        return (
            <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden group">
                {/* Abstract Background Shapes */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-green-900 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-emerald-900 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Calendar className="w-48 h-48 text-green-500 transform rotate-12" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-3 py-1 rounded-full bg-green-900/50 text-green-200 text-xs font-bold uppercase tracking-wider border border-green-500/30">
                                Open Season
                            </span>
                        </div>
                        <p className="text-xl md:text-2xl font-medium text-white/90">
                            Welcome to the 2026 Season, <span className="text-white font-bold">{shareholderName}</span>!
                        </p>
                        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-green-400 drop-shadow-md">
                            Booking is Open
                        </h1>
                        <p className="text-lg text-slate-300 max-w-xl">
                            Reservations are now first-come, first-served for all available dates.
                        </p>
                    </div>

                    <button
                        onClick={onOpenBooking}
                        className="w-full md:w-auto px-8 py-4 bg-green-600 text-white text-lg font-bold rounded-xl shadow-lg hover:bg-green-700 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
                    >
                        <Calendar className="w-6 h-6" />
                        Book Dates Now
                    </button>
                </div>
            </div>
        );
    }

    // Helper for Phase Badge
    const getPhaseLabel = (phase) => {
        if (phase === 'ROUND_1') return 'Round 1';
        if (phase === 'ROUND_2') return 'Round 2';
        if (phase === 'OPEN_SEASON') return 'Open Season';
        return null;
    };
    const phaseLabel = getPhaseLabel(status.phase);

    // 3. User State Logic
    const isYourTurn = status.activePicker === shareholderName;
    const activeDraft = drafts.find(b => b.shareholderName === shareholderName && !b.isFinalized && b.type !== 'cancelled');

    // Determine completed status
    let roundTarget = 1;
    if (status.phase === 'ROUND_2') roundTarget = 2;
    const myActions = drafts.filter(b =>
        b.shareholderName === shareholderName &&
        (b.isFinalized || b.type === 'pass') &&
        b.type !== 'cancelled'
    );
    const isDoneForRound = myActions.length >= roundTarget;
    const lastAction = myActions[myActions.length - 1];

    // Get the absolute most recent action (including cancellations) for generic state detection
    const latestAction = drafts
        .filter(b => b.shareholderName === shareholderName && (b.isFinalized || b.type === 'pass' || b.type === 'cancelled'))
        .sort((a, b) => b.createdAt - a.createdAt)[0];

    // Helper: Render Split Round Badges
    const renderBadges = () => {
        // Filter for cancellations
        const cancelledActions = drafts.filter(b => b.shareholderName === shareholderName && b.type === 'cancelled').sort((a, b) => a.createdAt - b.createdAt);

        return (
            <div className="flex flex-col sm:flex-row items-center md:items-start justify-center md:justify-start gap-2 mt-2">
                {/* Round 1 Status Badge */}
                {(() => {
                    const r1Action = myActions[0]; // Logic assumes chronological order
                    const r1Cancelled = !r1Action && cancelledActions.length > 0; // Better logic needed if re-cancelled, but works for simpler cases

                    // Check if Round 1 is active relative to queue or phase
                    const isR1Queue = queueInfo && queueInfo.round === 1;
                    const isR1Turn = status.phase === 'ROUND_1' && isYourTurn;

                    let bg = 'bg-slate-800/50 text-slate-400 border-slate-700/50';
                    let icon = <Clock className="w-3 h-3" />;
                    let text = "Waiting";

                    if (r1Action) {
                        if (r1Action.type === 'pass') {
                            bg = 'bg-amber-500/10 text-amber-200 border-amber-500/20';
                            icon = <CheckCircle className="w-3.5 h-3.5" />;
                            text = "Passed";
                        } else {
                            const isPaid = r1Action.paymentStatus === 'paid';
                            bg = 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20';
                            icon = <CheckCircle className="w-3.5 h-3.5" />;
                            text = isPaid ? "Paid" : "Confirmed";
                        }
                    } else if (r1Cancelled) {
                        bg = 'bg-red-500/10 text-red-200 border-red-500/20';
                        icon = <XCircle className="w-3.5 h-3.5" />;
                        text = "Cancelled";
                    } else if (isR1Turn) {
                        bg = 'bg-blue-500/20 text-blue-200 border-blue-500/30';
                        icon = <Clock className="w-3.5 h-3.5 animate-pulse" />;
                        text = "Your Turn";
                    } else if (isR1Queue) {
                        bg = 'bg-blue-500/10 text-blue-200 border-blue-500/20';
                        icon = <Clock className="w-3.5 h-3.5" />;
                        text = queueInfo.diff === 1 ? "Up Next!" : `#${queueInfo.diff} in Line`;
                    }

                    return (
                        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border backdrop-blur-md ${bg}`}>
                            <span className="opacity-60">R1:</span>
                            {icon}
                            {text}
                        </div>
                    );
                })()}

                {/* Round 2 Status Badge */}
                {(() => {
                    // Logic: Round 2 action is the second one if it exists
                    const r2Action = myActions.length > 1 ? myActions[1] : null;
                    const r2Cancelled = !r2Action && cancelledActions.length > (r2Action ? 2 : 1); // Simplistic check: If more cancellations than expected? Ideally we check Round IDs but we don't have them easily mapped here.
                    // Actually, if R1 is done (or cancelled), and we have ANOTHER cancellation, then R2 is cancelled.
                    const r1DoneOrCancelled = myActions.length > 0 || cancelledActions.length > 0;
                    const isR2Cancelled = r1DoneOrCancelled && !r2Action && cancelledActions.length >= (myActions.length > 0 ? 1 : 2); // Very rough heuristic, assumes chronological.

                    // Actually, better heuristic:
                    // If we have 1 "good" action (R1 done), and 1 "cancelled" action (R2 cancelled).
                    // If we have 0 "good" actions, and 2 "cancelled" actions (R1 cancelled, R2 cancelled).
                    // If we have 0 "good" actions, and 1 "cancelled" action, it's R1 cancelled.

                    const isR2CancelledHeuristic = (myActions.length === 1 && cancelledActions.length >= 1) || (myActions.length === 0 && cancelledActions.length >= 2);

                    const isR2Queue = queueInfo && queueInfo.round === 2;
                    // If R2 is active phase and R1 is done, and it's your turn
                    const isR2Turn = status.phase === 'ROUND_2' && isYourTurn;

                    let bg = 'bg-slate-800/50 text-slate-400 border-slate-700/50';
                    let icon = <Clock className="w-3 h-3" />;
                    let text = "Waiting";

                    if (r2Action) {
                        if (r2Action.type === 'pass') {
                            bg = 'bg-amber-500/10 text-amber-200 border-amber-500/20';
                            icon = <CheckCircle className="w-3.5 h-3.5" />;
                            text = "Passed";
                        } else {
                            const isPaid = r2Action.paymentStatus === 'paid';
                            bg = 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20';
                            icon = <CheckCircle className="w-3.5 h-3.5" />;
                            text = isPaid ? "Paid" : "Confirmed";
                        }
                    } else if (isR2CancelledHeuristic) {
                        bg = 'bg-red-500/10 text-red-200 border-red-500/20';
                        icon = <XCircle className="w-3.5 h-3.5" />;
                        text = "Cancelled";
                    } else if (isR2Turn) {
                        bg = 'bg-blue-500/20 text-blue-200 border-blue-500/30';
                        icon = <Clock className="w-3.5 h-3.5 animate-pulse" />;
                        text = "Your Turn";
                    } else if (isR2Queue) {
                        bg = 'bg-blue-500/10 text-blue-200 border-blue-500/20';
                        icon = <Clock className="w-3.5 h-3.5" />;
                        text = queueInfo.diff === 1 ? "Up Next!" : `#${queueInfo.diff} in Line`;
                    }

                    return (
                        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border backdrop-blur-md ${bg}`}>
                            <span className="opacity-60">R2:</span>
                            {icon}
                            {text}
                        </div>
                    );
                })()}
            </div>
        );
    };

    // --- SHARED UI COMPONENTS ---
    const renderStatusCard = (customTheme = 'indigo') => {
        const isJustPassed = lastAction && lastAction.type === 'pass';
        const isUpNext = queueInfo?.diff === 1;

        // Theme mapping
        const themes = {
            indigo: {
                text: 'text-indigo-200',
                label: 'text-indigo-300',
                divider: 'border-indigo-500/20',
                highlight: 'from-blue-300 to-indigo-300',
                countdownBg: 'bg-indigo-500/10'
            },
            blue: {
                text: 'text-blue-200',
                label: 'text-blue-300',
                divider: 'border-blue-500/20',
                highlight: 'from-blue-300 to-cyan-300',
                countdownBg: 'bg-blue-500/10'
            },
            red: {
                text: 'text-red-200',
                label: 'text-red-300',
                divider: 'border-red-500/20',
                highlight: 'from-red-300 to-rose-300',
                countdownBg: 'bg-red-500/10'
            },
            green: {
                text: 'text-emerald-200',
                label: 'text-emerald-300',
                divider: 'border-emerald-500/20',
                highlight: 'from-emerald-300 to-green-400',
                countdownBg: 'bg-emerald-500/10'
            }
        };

        const t = themes[customTheme] || themes.indigo;

        return (
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
                <div className="flex flex-col md:flex-row md:items-stretch gap-8 md:gap-0">
                    {/* Left: Your Context */}
                    <div className="flex-1 md:pr-8">
                        <p className={`text-[11px] font-bold ${t.label} uppercase tracking-[0.15em] mb-4 opacity-70`}>Your Position in the Queue</p>
                        {isUpNext ? (
                            <div className="space-y-4">
                                <h2 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-green-400 tracking-tight leading-tight">
                                    You're Up Next!
                                </h2>
                                <p className={`text-sm ${t.text} opacity-60 leading-relaxed max-w-sm`}>
                                    Get your dates ready! <span className="font-bold text-white">{status.activePicker}</span> is currently picking, and then it's your turn.
                                </p>
                            </div>
                        ) : isJustPassed ? (
                            <div className="space-y-2">
                                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Turn Passed</h2>
                                <p className={`text-sm ${t.text} opacity-60`}>Thanks for making your selection! Enjoy the break until the next round.</p>
                            </div>
                        ) : isYourTurn ? (
                            <div className="space-y-4">
                                <h2 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300 tracking-tight">
                                    Your Turn
                                </h2>
                                <p className={`text-sm ${t.text} opacity-60`}>It's your time to shine! Select your dates before the deadline.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-baseline gap-3">
                                    <span className={`text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r ${t.highlight} tracking-tighter`}>
                                        {getOrdinal(queueInfo?.diff || 1)}
                                    </span>
                                    <span className={`text-3xl font-medium ${t.text} opacity-80`}>in Line</span>
                                </div>
                                <p className={`text-sm ${t.text} opacity-60 leading-relaxed`}>No rush! We'll email you as soon as it's your turn to pick your dates.</p>
                            </div>
                        )}
                    </div>

                    {/* Right: Global Context - Dividier */}
                    {!isYourTurn && !isJustPassed && (
                        <div className={`md:w-px md:bg-white/10 hidden md:block`}></div>
                    )}

                    {!isYourTurn && !isJustPassed && (
                        <div className="md:pl-8 flex flex-col justify-center min-w-[280px]">
                            <p className={`text-[11px] font-bold ${t.label} uppercase tracking-[0.15em] mb-4 opacity-70`}>Currently Picking</p>
                            <h3 className="text-3xl font-bold text-white mb-6">{status.activePicker}</h3>

                            {status.windowEnds && (
                                <div className="space-y-3">
                                    <div className={`text-[11px] font-bold ${t.label} uppercase tracking-widest opacity-50`}>Turn Ends</div>
                                    <div className="text-xl font-bold text-white/90">
                                        {format(new Date(status.windowEnds), 'MMM d, h:mm a')}
                                    </div>
                                    <div className={`inline-flex items-center gap-2 ${t.countdownBg} px-3 py-1.5 rounded-lg border border-white/5 text-[10px] font-bold text-white uppercase tracking-wider`}>
                                        Time left: <span className="text-blue-400">
                                            {(() => {
                                                const end = new Date(status.windowEnds);
                                                if (end <= now) return 'Ending...';
                                                const diff = intervalToDuration({ start: now, end });
                                                const parts = [];
                                                if (diff.days > 0) parts.push(`${diff.days}d`);
                                                if (diff.hours > 0) parts.push(`${diff.hours}h`);
                                                if (diff.minutes > 0) parts.push(`${diff.minutes}m`);
                                                return parts.join(' ') || '< 1m';
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderHeader = () => (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h1 className="text-xl md:text-2xl font-light text-white/70">
                Welcome to the 2026 Season, <span className="text-white font-bold">{shareholderName}</span>!
            </h1>
            <div id="tour-status">
                {renderBadges()}
            </div>
        </div>
    );

    const renderBackground = (theme = 'blue') => {
        const colors = {
            blue: 'bg-blue-900 bg-purple-900',
            red: 'bg-red-900 bg-rose-900',
            green: 'bg-emerald-900 bg-green-900',
            indigo: 'bg-indigo-900 bg-purple-900'
        };
        const activeColors = colors[theme] || colors.blue;
        const [c1, c2] = activeColors.split(' ');
        return (
            <>
                <div className={`absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 ${c1} rounded-full blur-3xl opacity-20 pointer-events-none`}></div>
                <div className={`absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 ${c2} rounded-full blur-3xl opacity-20 pointer-events-none`}></div>
            </>
        );
    };

    // --- CASE A: Your Turn + Has Draft ---
    if (isYourTurn && activeDraft) {
        return (
            <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden">
                {renderBackground('blue')}

                <div className="relative z-10 flex flex-col gap-8">
                    {renderHeader()}

                    <div className="space-y-2">
                        <h2 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300 tracking-tighter pb-1">
                            Draft Saved
                        </h2>
                        <p className="text-xl text-blue-100/60 font-medium leading-relaxed max-w-2xl">
                            You have selected dates. Please <span className="text-white font-bold">finalize</span> your booking to lock them in.
                        </p>
                    </div>

                    {renderStatusCard('blue')}

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="space-y-1 text-center sm:text-left">
                            <p className="text-[11px] font-bold text-blue-300 uppercase tracking-widest opacity-70">Complete Request By</p>
                            <div className="text-2xl font-bold text-white">
                                {status.windowEnds && format(new Date(status.windowEnds), 'MMM d, h:mm a')}
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                            <button
                                onClick={() => onViewDetails(activeDraft)}
                                className="px-6 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
                            >
                                <Info className="w-5 h-5" />
                                Review Details
                            </button>
                            <button
                                disabled={isReadOnly}
                                onClick={() => onFinalize(activeDraft.id, shareholderName)}
                                className={`px-10 py-4 text-white text-lg font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all 
                                    ${isReadOnly
                                        ? 'bg-slate-700 cursor-not-allowed opacity-50'
                                        : 'bg-green-600 hover:bg-green-500 hover:shadow-xl hover:-translate-y-0.5'
                                    }`}
                            >
                                <CheckCircle className="w-5 h-5" />
                                {isReadOnly ? 'Finalize Disabled' : 'Finalize Booking'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- CASE B: Your Turn (No Draft) ---
    if (isYourTurn) {
        return (
            <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden">
                {renderBackground('blue')}

                <div className="relative z-10 flex flex-col gap-8">
                    {renderHeader()}

                    <div className="space-y-2">
                        <h2 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300 tracking-tighter pb-1">
                            It's Your Turn
                        </h2>
                        <p className="text-xl text-blue-100/60 font-medium leading-relaxed max-w-2xl">
                            The calendar is yours! Please select your dates or pass your turn to the next shareholder.
                        </p>
                    </div>

                    {renderStatusCard('blue')}

                    <div id="tour-actions" className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="space-y-1 text-center sm:text-left">
                            <p className="text-[11px] font-bold text-blue-300 uppercase tracking-widest opacity-70">Complete Request By</p>
                            <div className="text-2xl font-bold text-white">
                                {status.windowEnds && format(new Date(status.windowEnds), 'MMM d, h:mm a')}
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                            <button
                                onClick={onPass}
                                disabled={isReadOnly}
                                className={`px-6 py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 border 
                                    ${isReadOnly
                                        ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed border-transparent'
                                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border-white/10'
                                    }`}
                            >
                                {isReadOnly ? 'Pass (Disabled)' : 'Pass Turn'}
                            </button>
                            <button
                                onClick={onOpenBooking}
                                disabled={isReadOnly}
                                className={`px-10 py-4 text-xl font-bold rounded-xl shadow-lg flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95
                                    ${isReadOnly
                                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                                        : 'bg-white text-slate-900 shadow-blue-900/20 hover:shadow-blue-900/40 hover:bg-blue-50'
                                    }`}
                            >
                                <PlayCircle className={`w-6 h-6 ${isReadOnly ? 'text-slate-500' : 'text-blue-600'}`} />
                                {isReadOnly ? 'Booking Disabled' : 'Start Booking'}
                            </button>
                        </div>
                    </div>
                </div>
            </div >
        );
    }

    // --- CASE C: Done for Round ---
    if (isDoneForRound) {
        const isPassed = lastAction?.type === 'pass';
        let displayDate = null;
        let nights = 0;
        let paymentStatus = null;

        if (!isPassed && lastAction) {
            const start = lastAction.from?.toDate ? lastAction.from.toDate() : new Date(lastAction.from);
            const end = lastAction.to?.toDate ? lastAction.to.toDate() : new Date(lastAction.to);
            displayDate = { start, end };
            nights = differenceInDays(end, start);
            paymentStatus = lastAction.isPaid ? 'paid' : 'unpaid';
        }

        const isPaid = paymentStatus === 'paid';
        const theme = isPassed ? 'indigo' : 'green';

        return (
            <div className="bg-slate-900 rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden text-white">
                {renderBackground(theme)}

                <div className="relative z-10 flex flex-col gap-8">
                    {renderHeader()}

                    <div className="space-y-4">
                        <h2 className={`text-6xl md:text-7xl font-black tracking-tighter pb-1 text-transparent bg-clip-text bg-gradient-to-r ${isPassed ? 'from-amber-300 to-orange-400' : 'from-emerald-300 to-green-400'}`}>
                            {isPassed ? "Turn Passed" : "You're All Set!"}
                        </h2>
                        <div className="text-xl text-slate-400 leading-relaxed font-medium">
                            {isPassed ? (
                                <p>You have passed your turn for this round. We'll let you know when the next round begins!</p>
                            ) : (
                                <div className="space-y-2">
                                    <p>
                                        Booking confirmed for <span className="text-white font-bold">{format(displayDate.start, 'MMM d')} - {format(displayDate.end, 'MMM d, yyyy')}</span>
                                        <span className="opacity-40 ml-2">({nights} nights)</span>
                                    </p>
                                    <div className="flex items-center gap-3">
                                        {isPaid ? (
                                            <span className="flex items-center gap-2 text-emerald-400 text-sm font-bold uppercase tracking-widest">
                                                <CheckCircle className="w-4 h-4" />
                                                Payment Completed
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2 text-amber-500 text-sm font-bold uppercase tracking-widest">
                                                <AlertTriangle className="w-4 h-4" />
                                                Payment Outstanding
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {renderStatusCard(theme)}

                    {!isPassed && lastAction && (
                        <div className="flex flex-col sm:flex-row gap-4 w-full justify-end mt-2">
                            <button
                                onClick={() => onViewDetails(lastAction)}
                                className="px-6 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
                            >
                                <Info className="w-5 h-5" />
                                View Details
                            </button>
                            {lastAction.isPaid && onEmail && (
                                <button
                                    onClick={() => onEmail(lastAction)}
                                    className="px-6 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    <Mail className="w-4 h-4" />
                                    Email Guest
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- CASE D: Booking Cancelled ---
    if (latestAction?.type === 'cancelled' && !isYourTurn) {
        return (
            <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden">
                {renderBackground('red')}

                <div className="relative z-10 flex flex-col gap-8">
                    {renderHeader()}

                    <div className="space-y-4">
                        <h2 className="text-6xl md:text-7xl font-black tracking-tighter pb-1 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-500">
                            Booking Cancelled
                        </h2>
                        <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-2xl">
                            Your previous booking was cancelled. You have returned to the queue and will be able to book again in the next available round.
                        </p>
                    </div>

                    {renderStatusCard('red')}

                    <div className="flex justify-end mt-2">
                        <button
                            onClick={() => onViewDetails(latestAction)}
                            className="px-6 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
                        >
                            <Info className="w-5 h-5" />
                            View Cancelled Details
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- CASE E: Waiting (Queue) ---
    const upcomingBooking = drafts
        .filter(b => b.shareholderName === shareholderName && b.isFinalized && b.type !== 'cancelled' && b.type !== 'pass')
        .sort((a, b) => b.createdAt - a.createdAt)[0];

    return (
        <div className="bg-slate-900 rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-xl relative overflow-hidden text-white group">
            {renderBackground('indigo')}

            <div className="relative z-10 flex flex-col gap-8">
                {renderHeader()}

                <div className="space-y-4">
                    <p className="text-xl text-indigo-100/40 font-medium leading-relaxed max-w-3xl">
                        We hope you like the new HHR Trailer Booking App. <br />If you have any questions, just click <button onClick={onOpenFeedback} className="font-bold text-white hover:text-indigo-400 underline decoration-indigo-500/50 underline-offset-4 transition-colors">Feedback</button> and let us know.
                    </p>
                </div>

                {renderStatusCard('indigo')}

                {upcomingBooking && (
                    <div id="tour-actions" className="flex justify-end mt-2">
                        <button
                            onClick={() => onViewDetails(upcomingBooking)}
                            className="px-6 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
                        >
                            <Info className="w-5 h-5" />
                            View Details
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
