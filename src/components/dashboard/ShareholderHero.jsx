import React from 'react';
import { Calendar, Clock, CheckCircle, Info, AlertTriangle, PlayCircle, XCircle, Mail } from 'lucide-react';
import { format, differenceInDays, intervalToDuration } from 'date-fns';
import confetti from 'canvas-confetti';

export function ShareholderHero({
    currentUser,
    status,
    shareholderName,
    bookings,
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
        const paidBooking = bookings?.find(b =>
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
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            // Mark as celebrated in Firestore
            onCelebrated(paidBooking.id);
        }
    }, [bookings, shareholderName, onCelebrated]);

    if (!shareholderName) return null;

    // Helper to convert number to ordinal (1st, 2nd, 3rd, etc.)
    const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // --- QUEUE CALCULATION ---
    const isAdminPersona = !isReadOnly && (shareholderName === 'HHR Admin' || shareholderName === 'Bryan');

    const queueInfo = React.useMemo(() => {
        if (!currentOrder || !status || !shareholderName) return null;

        const fullTurnOrder = [...currentOrder, ...[...currentOrder].reverse()];
        let activeIndex = -1;

        if (status.phase === 'PRE_DRAFT') {
            activeIndex = -1;
        } else if (status.activePicker) {
            const round1Len = currentOrder.length;
            if (status.phase === 'ROUND_1') {
                activeIndex = fullTurnOrder.findIndex((n, i) => n === status.activePicker && i < round1Len);
            } else {
                activeIndex = fullTurnOrder.findIndex((n, i) => n === status.activePicker && i >= round1Len);
                if (activeIndex === -1) activeIndex = fullTurnOrder.findIndex(n => n === status.activePicker);
            }
        }

        let myNextIndex = -1;
        for (let i = 0; i < fullTurnOrder.length; i++) {
            if (fullTurnOrder[i] === shareholderName && i > activeIndex) {
                myNextIndex = i;
                break;
            }
        }

        if (myNextIndex === -1) {
            if (isAdminPersona) {
                return { diff: 99, round: 1 };
            }
            return null;
        }

        const round = myNextIndex < currentOrder.length ? 1 : 2;
        return { diff: myNextIndex - activeIndex, round };
    }, [currentOrder, status, shareholderName, isReadOnly, isAdminPersona]);


    // 1. System Maintenance (Highest Priority)
    if (isSystemFrozen && !isSuperAdmin) {
        return (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-lg">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-100 rounded-xl text-amber-600 shrink-0">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl md:text-3xl font-black text-amber-900 tracking-tight">System Maintenance</h2>
                        <p className="text-amber-800/80 text-base leading-relaxed">
                            We're performing important system updates. Booking actions are temporarily paused.
                        </p>
                    </div>
                </div>
            </div>
        );
    }



    // 1b. Pre-Draft / Waiting for Start (Null Active Picker)
    if (status.phase === 'PRE_DRAFT' || (!status.activePicker && status.phase !== 'OPEN_SEASON')) {
        return (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-xl relative overflow-hidden">
                {renderBackground('indigo')}

                <div className="relative z-10 space-y-6">
                    {renderHeader()}

                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/20 text-indigo-300 text-sm font-bold uppercase tracking-wider border border-indigo-500/30">
                            ⏳ Coming Soon
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
                            {title}
                        </h2>
                        <p className="text-base text-slate-300 leading-relaxed">
                            The 2026 booking season hasn't officially begun yet. Sit tight, we'll notify you when the schedule kicks off!
                        </p>
                    </div>

                    {status.windowStarts && (
                        <div className="bg-slate-800/40 border border-white/10 rounded-xl p-5 backdrop-blur-sm inline-block">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Schedule Starts</p>
                            <div className="text-xl font-bold text-white mt-1">
                                {format(new Date(status.windowStarts), 'MMMM d, yyyy @ h:mm a')}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 2. Open Season
    if (status.phase === 'OPEN_SEASON') {
        return (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-xl relative overflow-hidden">
                {renderBackground('green')}

                <div className="relative z-10 space-y-6">
                    {renderHeader()}

                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 text-green-300 text-sm font-bold uppercase tracking-wider border border-green-500/30">
                            🎉 Open Season
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-500">
                            Booking is Open
                        </h2>
                        <p className="text-base text-slate-300 leading-relaxed">
                            Reservations are now first-come, first-served for all available dates.
                        </p>
                    </div>

                    <div>
                        <button
                            disabled={isReadOnly}
                            className={`px-6 py-3 font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all 
                                ${isReadOnly
                                    ? 'bg-green-600/50 text-white/50 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-500 text-white hover:scale-105 active:scale-95'}`}
                        >
                            <Calendar className="w-5 h-5" />
                            Book Dates Now
                        </button>
                    </div>
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

    // Determine completed status
    let roundTarget = 1;
    if (status.phase === 'ROUND_2') roundTarget = 2;
    const myActions = bookings.filter(b =>
        b.shareholderName === shareholderName &&
        (b.isFinalized || b.type === 'pass' || b.type === 'skipped' || b.type === 'cancelled' || b.status === 'cancelled')
    ).sort((a, b) => a.createdAt - b.createdAt);
    const isDoneForRound = myActions.length >= roundTarget;
    const lastAction = myActions[myActions.length - 1];

    // Get the absolute most recent action (including cancellations and skips) for generic state detection
    const latestAction = bookings
        .filter(b => b.shareholderName === shareholderName && (b.isFinalized || b.type === 'pass' || b.type === 'cancelled' || b.type === 'skipped' || b.status === 'cancelled'))
        .sort((a, b) => b.createdAt - a.createdAt)[0];


    // Helper: Render Round Status Badges
    const renderBadges = () => {
        const cancelledActions = bookings.filter(b => b.shareholderName === shareholderName && (b.type === 'cancelled' || b.status === 'cancelled')).sort((a, b) => a.createdAt - b.createdAt);

        return (
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                {/* Round 1 Badge */}
                {(() => {
                    const hasRoundData = myActions.some(b => b.round !== undefined);
                    const r1Action = hasRoundData ? myActions.find(b => b.round === 1) : myActions[0];
                    const isR1Queue = queueInfo && queueInfo.round === 1;
                    const isR1Turn = status.phase === 'ROUND_1' && isYourTurn;

                    // Implicit Skip Detection (Round 1)
                    let isR1SkippedImplicitly = false;
                    if (!r1Action) {
                        if (['ROUND_2', 'OPEN_SEASON', 'COMPLETED'].includes(status.phase)) {
                            isR1SkippedImplicitly = true;
                        } else if (status.phase === 'ROUND_1') {
                            const myIndex = currentOrder.indexOf(shareholderName);
                            const activeIndex = currentOrder.indexOf(status.activePicker);
                            if (myIndex !== -1 && activeIndex !== -1 && myIndex < activeIndex) {
                                isR1SkippedImplicitly = true;
                            }
                        }
                    }

                    let badgeClass = 'bg-slate-800/50 text-slate-400 border-slate-600/50';
                    let icon = <Clock className="w-4 h-4" />;
                    let text = "Waiting";

                    if (r1Action) {
                        if (r1Action.type === 'pass') {
                            badgeClass = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
                            icon = <CheckCircle className="w-4 h-4" />;
                            text = "Passed";
                        } else if (r1Action.type === 'skipped') {
                            badgeClass = 'bg-orange-500/10 text-orange-300 border-orange-500/30';
                            icon = <XCircle className="w-4 h-4" />;
                            text = "Skipped";
                        } else if (r1Action.type === 'cancelled' || r1Action.status === 'cancelled') {
                            badgeClass = 'bg-red-500/10 text-red-300 border-red-500/30';
                            icon = <XCircle className="w-4 h-4" />;
                            text = "Cancelled";
                        } else {
                            const isPaid = r1Action.paymentStatus === 'paid';
                            badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                            icon = <CheckCircle className="w-4 h-4" />;
                            text = isPaid ? "Paid" : "Confirmed";
                        }
                    } else if (isR1SkippedImplicitly) {
                        badgeClass = 'bg-orange-500/10 text-orange-300 border-orange-500/30';
                        icon = <XCircle className="w-4 h-4" />;
                        text = "Skipped";
                    } else if (isR1Turn) {
                        badgeClass = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
                        icon = <Clock className="w-4 h-4 animate-pulse" />;
                        text = "Your Turn";
                    } else if (isR1Queue) {
                        badgeClass = 'bg-blue-500/10 text-blue-300 border-blue-500/30';
                        icon = <Clock className="w-4 h-4" />;
                        text = queueInfo.diff === 1 ? "Up Next!" : `#${queueInfo.diff} in Line`;
                    }

                    return (
                        <div className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border backdrop-blur-sm ${badgeClass}`}>
                            <span className="opacity-70">R1</span>
                            {icon}
                            <span>{text}</span>
                        </div>
                    );
                })()}

                {/* Round 2 Badge */}
                {(() => {
                    const hasRoundData = myActions.some(b => b.round !== undefined);
                    const r2Action = hasRoundData ? myActions.find(b => b.round === 2) : (myActions.length > 1 ? myActions[1] : null);
                    const isR2Queue = queueInfo && queueInfo.round === 2;
                    const isR2Turn = status.phase === 'ROUND_2' && isYourTurn;

                    // Implicit Skip Detection (Round 2)
                    let isR2SkippedImplicitly = false;
                    if (!r2Action) {
                        if (['OPEN_SEASON', 'COMPLETED'].includes(status.phase)) {
                            isR2SkippedImplicitly = true;
                        } else if (status.phase === 'ROUND_2') {
                            // Round 2 is reversed order
                            const r2Order = [...currentOrder].reverse();
                            const myIndex = r2Order.indexOf(shareholderName);
                            const activeIndex = r2Order.indexOf(status.activePicker);
                            if (myIndex !== -1 && activeIndex !== -1 && myIndex < activeIndex) {
                                isR2SkippedImplicitly = true;
                            }
                        }
                    }

                    let badgeClass = 'bg-slate-800/50 text-slate-400 border-slate-600/50';
                    let icon = <Clock className="w-4 h-4" />;
                    let text = "Waiting";

                    if (r2Action) {
                        if (r2Action.type === 'pass') {
                            badgeClass = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
                            icon = <CheckCircle className="w-4 h-4" />;
                            text = "Passed";
                        } else if (r2Action.type === 'skipped') {
                            badgeClass = 'bg-orange-500/10 text-orange-300 border-orange-500/30';
                            icon = <XCircle className="w-4 h-4" />;
                            text = "Skipped";
                        } else if (r2Action.type === 'cancelled' || r2Action.status === 'cancelled') {
                            badgeClass = 'bg-red-500/10 text-red-300 border-red-500/30';
                            icon = <XCircle className="w-4 h-4" />;
                            text = "Cancelled";
                        } else {
                            const isPaid = r2Action.paymentStatus === 'paid';
                            badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                            icon = <CheckCircle className="w-4 h-4" />;
                            text = isPaid ? "Paid" : "Confirmed";
                        }
                    } else if (isR2SkippedImplicitly) {
                        badgeClass = 'bg-orange-500/10 text-orange-300 border-orange-500/30';
                        icon = <XCircle className="w-4 h-4" />;
                        text = "Skipped";
                    } else if (isR2Turn) {
                        badgeClass = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
                        icon = <Clock className="w-4 h-4 animate-pulse" />;
                        text = "Your Turn";
                    } else if (isR2Queue) {
                        badgeClass = 'bg-blue-500/10 text-blue-300 border-blue-500/30';
                        icon = <Clock className="w-4 h-4" />;
                        text = queueInfo.diff === 1 ? "Up Next!" : `#${queueInfo.diff} in Line`;
                    }

                    return (
                        <div className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border backdrop-blur-sm ${badgeClass}`}>
                            <span className="opacity-70">R2</span>
                            {icon}
                            <span>{text}</span>
                        </div>
                    );
                })()}
            </div>
        );
    };



    // --- SHARED UI COMPONENTS ---




    const renderHeader = () => (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-xl md:text-2xl font-normal text-white/80">
                Welcome to the 2026 Season, <span className="text-white font-bold">{shareholderName}</span>
            </h1>
            <div id="tour-status" className="flex-shrink-0">
                {renderBadges()}
            </div>
        </div>
    );

    const renderBackground = (theme = 'blue') => {
        const colors = {
            blue: ['bg-blue-500/10', 'bg-purple-500/10'],
            red: ['bg-red-500/10', 'bg-rose-500/10'],
            green: ['bg-emerald-500/10', 'bg-green-500/10'],
            indigo: ['bg-indigo-500/10', 'bg-purple-500/10']
        };
        const [c1, c2] = colors[theme] || colors.blue;

        return (
            <>
                <div className={`absolute top-0 right-0 w-96 h-96 ${c1} rounded-full blur-3xl pointer-events-none`}></div>
                <div className={`absolute bottom-0 left-0 w-96 h-96 ${c2} rounded-full blur-3xl pointer-events-none`}></div>
            </>
        );
    };







    // --- CASE B: Your Turn (No Draft) ---
    if (isYourTurn) {
        // Calculate time remaining
        const timeRemaining = status.windowEnds ? (() => {
            const end = new Date(status.windowEnds);
            if (end <= now) return 'Ending...';
            const diff = intervalToDuration({ start: now, end });
            const parts = [];
            if (diff.days > 0) parts.push(`${diff.days}d`);
            if (diff.hours > 0) parts.push(`${diff.hours}h`);
            if (diff.minutes > 0) parts.push(`${diff.minutes}m`);
            return parts.join(' ') || '< 1m';
        })() : null;

        const theme = status.isGracePeriod ? 'green' : 'red';
        const timerLabel = status.isGracePeriod ? 'Bonus Time Remaining' : 'Official Turn Ends';

        return (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-xl relative overflow-hidden">
                {renderBackground(theme)}

                <div className="relative z-10 space-y-6">
                    {renderHeader()}

                    <div className="space-y-3">
                        <h2 className={`text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r tracking-tight ${status.isGracePeriod ? 'from-emerald-400 to-green-500' : 'from-orange-400 to-red-500'}`}>
                            {status.isGracePeriod ? 'You Have Early Access!' : "It's Your Official Turn"}
                        </h2>
                        <p className="text-base text-white/60 leading-relaxed">
                            {status.isGracePeriod
                                ? "The clock doesn't officially start until 10:00 AM."
                                : "The calendar is yours! Please select your dates or pass your turn to the next shareholder."}
                        </p>
                    </div>

                    <div id="tour-deadline" className="bg-slate-800/40 border border-white/10 rounded-xl p-5 backdrop-blur-sm">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-blue-400" />
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{timerLabel}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xl font-bold text-white">
                                            {status.windowEnds && format(new Date(status.windowEnds), 'MMM d, h:mm a')}
                                        </span>
                                        {timeRemaining && (
                                            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-lg border border-blue-500/30">
                                                Time remaining: {timeRemaining}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 lg:flex-shrink-0">
                                <button
                                    onClick={onPass}
                                    disabled={isReadOnly}
                                    className={`px-5 py-3 font-semibold rounded-lg transition-all 
                                        ${isReadOnly
                                            ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                                            : 'bg-slate-700/70 text-slate-300 hover:bg-slate-600 hover:text-white'
                                        }`}
                                >
                                    Pass Turn
                                </button>
                                <button
                                    onClick={onOpenBooking}
                                    disabled={isReadOnly}
                                    className={`px-6 py-3 font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all
                                        ${isReadOnly
                                            ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                            : 'bg-white text-slate-900 hover:bg-blue-50 hover:scale-105 active:scale-95'
                                        }`}
                                >
                                    <PlayCircle className={`w-5 h-5 ${isReadOnly ? 'text-slate-500' : 'text-blue-600'}`} />
                                    Start Booking
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }



    // --- CASE C: Done for Round ---
    if (isDoneForRound && lastAction?.type !== 'cancelled') {
        const isPassed = lastAction?.type === 'pass';
        const isSkipped = lastAction?.type === 'skipped';
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
        const theme = isPassed ? 'indigo' : (isSkipped ? 'red' : 'green');

        return (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-10 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden text-white">
                {renderBackground(theme)}

                <div className="relative z-10 space-y-8">
                    {renderHeader()}

                    <div className="space-y-4">
                        <h2 className={`text-5xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r ${isPassed ? 'from-amber-400 to-orange-500' : (isSkipped ? 'from-orange-400 to-red-500' : 'from-emerald-400 to-green-500')}`}>
                            {isPassed ? "Turn Passed" : (isSkipped ? "Turn Skipped" : "You're All Set!")}
                        </h2>
                        <div className="text-lg md:text-xl text-slate-300 leading-relaxed font-medium">
                            {isPassed ? (
                                <p>You've passed your turn for this round. We'll notify you when the next round begins!</p>
                            ) : isSkipped ? (
                                <p>Your turn expired without action. Don't worry - you'll get another chance in the next round!</p>
                            ) : (
                                <div className="space-y-3">
                                    <p>
                                        Booking confirmed for <span className="text-white font-bold">{format(displayDate.start, 'MMM d')} - {format(displayDate.end, 'MMM d, yyyy')}</span>
                                        <span className="text-slate-500 ml-2">({nights} nights)</span>
                                    </p>
                                    <div className="flex items-center gap-3">
                                        {isPaid ? (
                                            <span className="flex items-center gap-2 text-emerald-400 text-sm font-bold uppercase tracking-widest">
                                                <CheckCircle className="w-4 h-4" />
                                                Maintenance Fee Paid
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2 text-amber-500 text-sm font-bold uppercase tracking-widest">
                                                <AlertTriangle className="w-4 h-4" />
                                                Fee Outstanding
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {!isPassed && !isSkipped && lastAction && (
                        <div className="flex flex-col sm:flex-row gap-4 justify-end">
                            <button
                                onClick={() => onViewDetails(lastAction)}
                                disabled={isReadOnly}
                                className={`px-6 py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2
                                    ${isReadOnly
                                        ? 'bg-white/5 text-white/50 border border-white/5 cursor-not-allowed'
                                        : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}
                            >
                                <Info className="w-5 h-5" />
                                View Details
                            </button>
                            {lastAction.isPaid && onEmail && (
                                <button
                                    onClick={() => onEmail(lastAction)}
                                    disabled={isReadOnly}
                                    className={`px-6 py-4 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2
                                        ${isReadOnly
                                            ? 'bg-blue-600/50 text-white/50 cursor-not-allowed'
                                            : 'bg-blue-600 text-white hover:bg-blue-500'}`}
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
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-xl relative overflow-hidden">
                {renderBackground('red')}

                <div className="relative z-10 space-y-6">
                    {renderHeader()}

                    <div className="space-y-3">
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-500">
                            Booking Cancelled
                        </h2>
                        <p className="text-base text-slate-300 leading-relaxed">
                            Your previous booking was cancelled. You've returned to the queue and will be able to book again in the next available round.
                        </p>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={() => onViewDetails(latestAction)}
                            disabled={isReadOnly}
                            className={`px-5 py-3 border border-white/10 font-semibold rounded-lg transition-all
                                ${isReadOnly
                                    ? 'bg-slate-700/40 text-white/40 cursor-not-allowed'
                                    : 'bg-slate-700/70 text-white hover:bg-slate-600'}`}
                        >
                            View Cancelled Details
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- CASE E: Waiting (Queue) ---
    const upcomingBooking = bookings
        .filter(b => b.shareholderName === shareholderName && b.isFinalized && b.type !== 'cancelled' && b.type !== 'pass')
        .sort((a, b) => b.createdAt - a.createdAt)[0];

    const isUpNext = queueInfo?.diff === 1;

    return (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-xl relative overflow-hidden text-white">
            {renderBackground('indigo')}

            <div className="relative z-10 space-y-6">
                {renderHeader()}

                <div className="space-y-2">
                    <p className="text-sm text-white/50">
                        Thanks for using the new HHR Trailer Booking App!
                    </p>
                    <p className="text-sm text-white/50">
                        Have questions or feedback? Click <button onClick={onOpenFeedback} className="font-semibold text-white hover:text-indigo-300 underline decoration-indigo-500/50 underline-offset-2 transition-colors">here</button> to let us know.
                    </p>
                </div>

                <div className="bg-slate-800/40 border border-white/10 rounded-xl p-5 backdrop-blur-sm">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Left: Your Position */}
                        <div className="space-y-3">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Your Position</p>

                            {isUpNext ? (
                                <>
                                    <div className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-500">
                                        You're Up Next for {queueInfo?.round === 1 ? 'Round 1' : 'Round 2'}!
                                    </div>
                                    <p className="text-sm text-white/60">
                                        Get ready! <span className="font-bold text-white">{status.activePicker}</span> is currently picking.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
                                            {getOrdinal(queueInfo?.diff || 1)}
                                        </span>
                                        <span className="text-xl font-bold text-white/60">
                                            in Line ({queueInfo?.round === 1 ? 'Round 1' : 'Round 2'})
                                        </span>
                                    </div>
                                    <p className="text-sm text-white/60">Sit tight! We'll email you when it's your turn.</p>
                                </>
                            )}
                        </div>

                        {/* Right: Currently Picking */}
                        {!isYourTurn && status.activePicker && (
                            <div className="space-y-3 md:border-l md:border-white/10 md:pl-6">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Currently Picking</p>
                                <h3 className="text-2xl font-bold text-white">{status.activePicker}</h3>

                                {status.windowEnds && (
                                    <div className="space-y-2">
                                        <div>
                                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Turn Ends</div>
                                            <div className="text-base font-bold text-white mt-1">
                                                {format(new Date(status.windowEnds), 'MMM d, h:mm a')}
                                            </div>
                                        </div>

                                        <div className="inline-flex items-center gap-2 bg-slate-700/40 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-white">
                                            <Clock className="w-3.5 h-3.5" />
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
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {upcomingBooking && (
                    <div id="tour-actions" className="flex justify-end">
                        <button
                            onClick={() => onViewDetails(upcomingBooking)}
                            disabled={isReadOnly}
                            className={`px-5 py-3 border border-white/10 font-semibold rounded-lg transition-all 
                                ${isReadOnly
                                    ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                                    : 'bg-slate-700/70 text-white hover:bg-slate-600'}`}
                        >
                            View Details
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
