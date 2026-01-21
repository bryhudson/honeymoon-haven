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
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
                            Welcome to the 2026 Season, {shareholderName}!
                        </h1>
                        <p className="text-lg text-slate-300 max-w-xl">
                            Booking is now <span className="font-bold text-green-400">Open Season</span>. Reservations are first-come, first-served.
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
                            bg = 'bg-amber-900/50 text-amber-200 border-amber-500/30';
                            icon = <CheckCircle className="w-3 h-3" />;
                            text = "Passed";
                        } else {
                            const isPaid = r1Action.paymentStatus === 'paid';
                            bg = 'bg-green-900/50 text-green-200 border-green-500/30';
                            icon = <CheckCircle className="w-3 h-3" />;
                            text = isPaid ? "Paid" : "Confirmed";
                        }
                    } else if (r1Cancelled) {
                        bg = 'bg-red-900/50 text-red-200 border-red-500/30';
                        icon = <XCircle className="w-3 h-3" />;
                        text = "Cancelled";
                    } else if (isR1Turn) {
                        bg = 'bg-blue-900/50 text-blue-200 border-blue-500/30';
                        icon = <PlayCircle className="w-3 h-3" />;
                        text = "Your Turn";
                    } else if (isR1Queue) {
                        bg = 'bg-blue-900/50 text-blue-200 border-blue-500/30';
                        text = queueInfo.diff === 1 ? "Up Next!" : `#${queueInfo.diff} in Line`;
                    }

                    return (
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${bg}`}>
                            <span className="opacity-70 mr-1">R1:</span>
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
                            bg = 'bg-amber-900/50 text-amber-200 border-amber-500/30';
                            icon = <CheckCircle className="w-3 h-3" />;
                            text = "Passed";
                        } else {
                            const isPaid = r2Action.paymentStatus === 'paid';
                            bg = 'bg-green-900/50 text-green-200 border-green-500/30';
                            icon = <CheckCircle className="w-3 h-3" />;
                            text = isPaid ? "Paid" : "Confirmed";
                        }
                    } else if (isR2CancelledHeuristic) {
                        bg = 'bg-red-900/50 text-red-200 border-red-500/30';
                        icon = <XCircle className="w-3 h-3" />;
                        text = "Cancelled";
                    } else if (isR2Turn) {
                        bg = 'bg-blue-900/50 text-blue-200 border-blue-500/30';
                        icon = <PlayCircle className="w-3 h-3" />;
                        text = "Your Turn";
                    } else if (isR2Queue) {
                        bg = 'bg-blue-900/50 text-blue-200 border-blue-500/30';
                        text = queueInfo.diff === 1 ? "Up Next!" : `#${queueInfo.diff} in Line`;
                    }

                    return (
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${bg}`}>
                            <span className="opacity-70 mr-1">R2:</span>
                            {icon}
                            {text}
                        </div>
                    );
                })()}
            </div>
        );
    };

    // --- TIMER LOGIC (Unified) ---
    // Only show if windowEnds is defined AND (it's my turn OR I'm up next)
    // --- TIMER LOGIC (Unified) ---
    // Only show if windowEnds is defined AND (it's my turn OR I'm up next OR I'm an admin)
    // --- TIMER LOGIC (Unified) ---
    // Only show if windowEnds is defined AND (it's my turn OR I'm up next OR I'm an admin/persona)
    const isAdminView = isSuperAdmin
        || isAdminPersona
        || currentUser?.role === 'admin'
        || currentUser?.role === 'super_admin'
        || currentUser?.email === 'honeymoonhavenresort.lc@gmail.com';

    const showTimer = status.windowEnds && (isYourTurn || queueInfo?.diff === 1 || isAdminView);

    const TimerComponent = null; // Replaced by DeadlineTimerDisplay below

    // --- SHARED DEADLINE TIMER DISPLAY ---
    // Extracted from Case B to be used in Case A and logic reused elsewhere
    const DeadlineTimerDisplay = (showTimer && status.windowEnds) ? (
        <div className="flex-1 min-w-[300px]">
            <div className="text-sm font-bold text-blue-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {isYourTurn || activeDraft ? "Complete Request By" : "Turn Deadline"}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
                <div className="text-3xl md:text-4xl font-bold text-white tabular-nums tracking-tight">
                    {format(new Date(status.windowEnds), 'MMM d, h:mm a')}
                </div>
                <div className="bg-blue-900/50 px-3 py-1 rounded-lg border border-blue-500/30 text-blue-200 text-sm font-bold flex items-center gap-2 w-fit">
                    Time remaining:
                    <span className="text-white">
                        {(() => {
                            const end = new Date(status.windowEnds);
                            if (end <= now) return 'Ending soon...';
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
        </div>
    ) : null;

    // --- CASE A: Your Turn + Has Draft ---
    if (isYourTurn && activeDraft) {
        return (
            <div className="bg-slate-900 text-white rounded-xl p-5 md:p-6 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden">
                {/* Abstract Background Shapes */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-900 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-purple-900 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col gap-4">
                    {/* Header Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h1 className="text-xl md:text-2xl font-medium text-blue-200">
                            Welcome to the 2026 Season, <span className="text-white font-bold">{shareholderName}</span>!
                        </h1>
                        <div className="flex items-center gap-2">
                            {/* Phase Badge */}
                            {phaseLabel && (
                                <span className="px-3 py-1 rounded-full bg-slate-700/50 text-slate-300 text-xs font-bold uppercase tracking-wider border border-slate-600/30">
                                    {phaseLabel}
                                </span>
                            )}
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/50 text-blue-200 text-xs font-bold uppercase tracking-wider border border-blue-500/30">
                                <Clock className="w-3 h-3 animate-pulse text-blue-400" />
                                Action Required
                            </div>
                        </div>
                    </div>

                    {/* Hero Message */}
                    <div className="space-y-2">
                        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-md">
                            Draft Selection Saved
                        </h2>
                        <p className="text-lg text-blue-100/90 font-light leading-relaxed max-w-3xl">
                            You have selected dates. Please <span className="font-bold text-white">finalize</span> to lock them in.
                        </p>
                    </div>

                    {/* Action Bar */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-5 backdrop-blur-sm mt-1">
                        <div className="flex flex-col xl:flex-row gap-4 xl:items-end justify-between">

                            {/* Draft Timer / Info */}
                            {DeadlineTimerDisplay}

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                                <button
                                    onClick={() => onViewDetails(activeDraft)}
                                    className="px-6 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
                                >
                                    <Info className="w-5 h-5" />
                                    Review Details
                                </button>
                                <button
                                    disabled={isReadOnly}
                                    onClick={() => onFinalize(activeDraft.id, shareholderName)}
                                    className={`px-8 py-3 text-white text-lg font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all 
                                        ${isReadOnly
                                            ? 'bg-slate-600 cursor-not-allowed opacity-70'
                                            : 'bg-green-600 hover:bg-green-700 hover:shadow-xl hover:-translate-y-0.5 animate-pulse'
                                        }`}
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    {isReadOnly ? 'Finalize (Disabled)' : 'Finalize Booking'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );

    }

    // --- CASE B: Your Turn (No Draft) ---
    if (isYourTurn) {
        return (
            <div className="bg-slate-900 text-white rounded-xl p-5 md:p-6 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden">
                {/* Abstract Background Shapes */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-slate-800 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-slate-800 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col gap-4">
                    {/* TOP HEADER ROW: Welcome & Badges */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h1 className="text-xl md:text-2xl font-medium text-blue-200">
                                Welcome to the 2026 Season, <span className="text-white font-bold">{shareholderName}</span>!
                            </h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="px-3 py-1 rounded-full bg-slate-700/50 border border-slate-600/50 text-slate-300 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                                Round {currentOrder?.round || 1}
                            </div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-bold uppercase tracking-wider border border-blue-500/30 animate-pulse">
                                <Clock className="w-3 h-3" />
                                Action Required
                            </div>
                        </div>
                    </div>

                    {/* MAIN HERO MESSAGE */}
                    <div className="space-y-2">
                        <h2 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300 tracking-tight drop-shadow-md">
                            It's Your Turn
                        </h2>
                        <p className="text-lg text-blue-100/90 font-light leading-relaxed max-w-3xl">
                            The calendar is yours! Please select your dates or pass your turn to the next shareholder.
                        </p>
                    </div>

                    {/* ACTION BAR: Timer & Buttons */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-5 backdrop-blur-sm mt-1">
                        <div className="flex flex-col xl:flex-row gap-4 xl:items-end justify-between">

                            {/* DEADLINE TIMER */}
                            {showTimer && status.windowEnds && (
                                <div className="flex-1 min-w-[300px]">
                                    <div className="text-sm font-bold text-blue-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        {isYourTurn ? "Complete Request By" : "Turn Deadline"}
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
                                        <div className="text-3xl md:text-4xl font-bold text-white tabular-nums tracking-tight">
                                            {format(new Date(status.windowEnds), 'MMM d, h:mm a')}
                                        </div>
                                        <div className="bg-blue-900/50 px-3 py-1 rounded-lg border border-blue-500/30 text-blue-200 text-sm font-bold flex items-center gap-2 w-fit">
                                            Time remaining:
                                            <span className="text-white">
                                                {(() => {
                                                    const end = new Date(status.windowEnds);
                                                    if (end <= now) return 'Ending soon...';
                                                    const diff = intervalToDuration({ start: now, end });
                                                    const parts = [];
                                                    if (diff.years > 0) parts.push(`${diff.years}y`);
                                                    if (diff.months > 0) parts.push(`${diff.months}mo`);
                                                    if (diff.days > 0) parts.push(`${diff.days}d`);
                                                    if (diff.hours > 0) parts.push(`${diff.hours}h`);
                                                    if (diff.minutes > 0) parts.push(`${diff.minutes}m`);
                                                    return parts.join(' ') || '< 1m';
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PRIMARY ACTIONS */}
                            <div id="tour-actions" className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto self-stretch xl:self-end">
                                <button
                                    onClick={onOpenBooking}
                                    disabled={isReadOnly}
                                    className={`flex-1 sm:flex-none py-4 px-8 text-xl font-bold rounded-xl shadow-lg flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95
                                        ${isReadOnly
                                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                                            : 'bg-white text-slate-900 shadow-blue-900/20 hover:shadow-blue-900/40 hover:bg-blue-50'
                                        }`}
                                >
                                    <PlayCircle className={`w-6 h-6 ${isReadOnly ? 'text-slate-500' : 'text-blue-600'}`} />
                                    {isReadOnly ? 'Booking Disabled' : 'Start Booking'}
                                </button>

                                <button
                                    onClick={onPass}
                                    disabled={isReadOnly}
                                    className={`flex-1 sm:flex-none py-4 px-8 font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-transparent
                                        ${isReadOnly
                                            ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed border-slate-700'
                                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600'
                                        }`}
                                >
                                    {isReadOnly ? 'Pass (Disabled)' : 'Pass Turn'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div >
        );
    }

    // --- CASE C: Done for Round ---
    if (isDoneForRound) {
        const isPassed = lastAction?.type === 'pass';

        // Helper to extract booking details if not passed
        let displayDate = null;
        let nights = 0;
        let paymentStatus = null; // 'paid', 'unpaid', null

        if (!isPassed && lastAction) {
            const start = lastAction.from?.toDate ? lastAction.from.toDate() : new Date(lastAction.from);
            const end = lastAction.to?.toDate ? lastAction.to.toDate() : new Date(lastAction.to);
            displayDate = { start, end };
            nights = differenceInDays(end, start);
            paymentStatus = lastAction.isPaid ? 'paid' : 'unpaid';
        }

        const isPaid = paymentStatus === 'paid';


        return (
            <div className={`
                rounded-xl p-5 md:p-6 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden text-white
                ${isPassed ? 'bg-slate-900' : 'bg-slate-900'}
            `}>
                {/* Abstract Background Shapes */}
                <div className={`absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none ${isPassed ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                <div className={`absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none ${isPassed ? 'bg-amber-600' : 'bg-green-600'}`}></div>

                <div className="relative z-10 flex flex-col gap-4">
                    {/* Header Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h1 className="text-xl md:text-2xl font-medium text-white/90">
                            Welcome to the 2026 Season, <span className="text-white font-bold">{shareholderName}</span>!
                        </h1>
                        <div id="tour-status">
                            {renderBadges()}
                        </div>
                    </div>

                    {/* Hero Message */}
                    <div className="space-y-2">
                        <h2 className={`text-5xl md:text-6xl font-black tracking-tight drop-shadow-md text-transparent bg-clip-text bg-gradient-to-r ${isPassed ? 'from-amber-300 to-orange-400' : 'from-emerald-300 to-green-400'}`}>
                            {isPassed ? "Turn Passed" : "You're All Set!"}
                        </h2>
                        <div className="text-lg text-slate-300 leading-relaxed">
                            {isPassed ? (
                                <span className="text-slate-200">
                                    You have passed your turn for this round. We'll let you know when the next round begins!
                                </span>
                            ) : (
                                <div className="space-y-1">
                                    <p>
                                        Booking confirmed for <span className="text-white font-bold">{format(displayDate.start, 'MMM d')} - {format(displayDate.end, 'MMM d, yyyy')}</span>
                                        <span className="opacity-60 ml-2">({nights} nights)</span>
                                    </p>
                                    {isPaid ? (
                                        <p className="text-green-400 text-sm font-bold flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4" />
                                            Payment Completed
                                        </p>
                                    ) : (
                                        <p className="text-amber-400 text-sm font-bold flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                                            Payment Outstanding
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    {!isPassed && lastAction && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-5 backdrop-blur-sm mt-1 flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                            <button
                                onClick={() => onViewDetails(lastAction)}
                                className="px-6 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
                            >
                                <Info className="w-5 h-5" />
                                View Details
                            </button>
                            {lastAction.isPaid && onEmail && (
                                <button
                                    onClick={() => onEmail(lastAction)}
                                    className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-all shadow-lg flex items-center justify-center gap-2"
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
    // Moved up to have its own dedicated Hero style
    const latestAction = drafts
        .filter(b => b.shareholderName === shareholderName && (b.isFinalized || b.type === 'pass' || b.type === 'cancelled'))
        .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (latestAction?.type === 'cancelled' && !isYourTurn) {
        return (
            <div className="bg-slate-900 text-white rounded-xl p-5 md:p-6 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden">
                {/* Abstract Background Shapes - Red/Rose for Cancellation */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-red-900 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-rose-900 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col gap-4">
                    {/* Header Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h1 className="text-xl md:text-2xl font-medium text-red-200">
                            Welcome, <span className="text-white font-bold">{shareholderName}</span>
                        </h1>
                        <div id="tour-status">
                            {renderBadges()}
                        </div>
                    </div>

                    {/* Hero Message */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <XCircle className="w-8 h-8 text-red-500" />
                            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white drop-shadow-md">
                                Booking Cancelled
                            </h2>
                        </div>
                        <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
                            Your previous booking was cancelled. You have returned to the queue and will be able to book again when your turn comes up in the next available round or open season.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-5 backdrop-blur-sm mt-1 flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <button
                            onClick={() => onViewDetails(latestAction)}
                            className="px-6 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
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
    // Special check: Did they cancel their turn this round?
    // We look for a booking that is: Mine, Finalized, Cancelled, and (if strict round logic applied) matches this round.
    // For now, we just check if the MOST RECENT action was a cancellation and they are not currently the active picker.

    // Note: 'latestAction' is already calculated above.

    const isJustCancelled = latestAction && latestAction.type === 'cancelled';
    const isJustPassed = latestAction && latestAction.type === 'pass';

    // Find any upcoming confirmed booking to show details for (valid ones)
    const upcomingBooking = drafts
        .filter(b => b.shareholderName === shareholderName && b.isFinalized && b.type !== 'cancelled' && b.type !== 'pass')
        .sort((a, b) => b.createdAt - a.createdAt)[0];

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 md:p-6 animate-in fade-in slide-in-from-top-4 shadow-xl relative overflow-hidden text-white">
            {/* Background Flair - Aligning with AdminTurnHero (Indigo/Purple Theme) */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-indigo-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-4">
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-medium text-indigo-200">
                            Welcome to the 2026 Season, <span className="text-white font-bold">{shareholderName}</span>!
                        </h1>
                        <p className="text-indigo-200/70 text-sm md:text-base mt-2 leading-relaxed">
                            We hope you like the new HHR Trailer Booking App. <br />If you have any questions or need help, just click <button onClick={onOpenFeedback} className="font-semibold text-white underline hover:text-indigo-100 transition-colors">Feedback</button> and let us know.
                        </p>
                    </div>
                    <div id="tour-status">
                        {renderBadges()}
                    </div>
                </div>

                {/* Main Status - Clean Flow */}
                <div className="space-y-4 mt-6">
                    {/* Queue Position - Integrated Design */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                            {/* Left: Your Position */}
                            <div className="flex-1">
                                <p className="text-indigo-200/80 text-sm mb-2">Your Position in the Queue</p>
                                {queueInfo?.diff === 1 ? (
                                    <h2 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-400">
                                        You're Up Next!
                                    </h2>
                                ) : isJustPassed ? (
                                    <h2 className="text-4xl md:text-5xl font-black text-white">Turn Passed</h2>
                                ) : (
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">
                                            {getOrdinal(queueInfo?.diff || 1)}
                                        </span>
                                        <span className="text-2xl md:text-3xl font-medium text-indigo-200">in Line</span>
                                    </div>
                                )}
                                <div className="text-base text-indigo-100/80 mt-3 leading-relaxed">
                                    {isJustPassed ? (
                                        <p>Thanks for making your selection! Enjoy the break until the next round.</p>
                                    ) : queueInfo?.diff === 1 ? (
                                        <p>
                                            Get your dates ready! <span className="font-bold text-white">{status.activePicker}</span> is currently picking, and then it's your turn.
                                        </p>
                                    ) : (
                                        <p>No rush! We'll email you as soon as it's your turn to pick your dates.</p>
                                    )}
                                </div>
                            </div>

                            {/* Right: Current Turn - Integrated */}
                            {!isJustPassed && (
                                <div className="md:border-l md:border-indigo-500/20 md:pl-6 border-t md:border-t-0 pt-4 md:pt-0 min-w-[280px]">
                                    <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2">Currently Picking</div>
                                    <div className="text-2xl font-bold text-white mb-1">{status.activePicker}</div>
                                    {status.windowEnds && (
                                        <div className="mt-3">
                                            <div className="text-xs text-indigo-200/70 mb-1">Turn Ends</div>
                                            <div className="text-lg font-bold text-white">
                                                {format(new Date(status.windowEnds), 'MMM d, h:mm a')}
                                            </div>
                                            <div className="mt-2 bg-indigo-950/50 px-2 py-1 rounded text-indigo-200 font-mono text-xs font-bold w-fit border border-indigo-500/30">
                                                Time left: <span className="text-white">
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
                </div>

                {/* Footer Actions */}
                {upcomingBooking && (
                    <div id="tour-actions" className="flex justify-end">
                        <button
                            onClick={() => onViewDetails(upcomingBooking)}
                            className="px-6 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
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
