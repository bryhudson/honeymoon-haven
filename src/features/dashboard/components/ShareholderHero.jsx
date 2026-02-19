import React from 'react';
import { format, differenceInDays, intervalToDuration } from 'date-fns';
import { AlertTriangle, Clock, Calendar, PlayCircle, CheckCircle, XCircle, Info, Mail, Banknote } from 'lucide-react';
import { normalizeName, formatNameForDisplay, DRAFT_CONFIG } from '../../../lib/shareholders';
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
        const paidBooking = bookings?.find(b =>
            normalizeName(b.shareholderName) === normalizeName(shareholderName) &&
            b.isFinalized &&
            b.isPaid &&
            !b.celebrated &&
            b.type !== 'cancelled' &&
            b.type !== 'pass'
        );

        if (paidBooking && onCelebrated) {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
            const randomInRange = (min, max) => Math.random() * (max - min) + min;

            const interval = setInterval(function () {
                const timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) return clearInterval(interval);
                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

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
    const normalizedMe = normalizeName(shareholderName);
    const isAdminPersona = !isReadOnly && (normalizedMe === 'hhr admin' || normalizedMe === 'bryan');

    const queueInfo = React.useMemo(() => {
        if (!currentOrder || !status || !shareholderName) return null;

        const fullTurnOrder = [...currentOrder, ...[...currentOrder].reverse()];
        let activeIndex = -1;

        if (status.phase === 'PRE_DRAFT') {
            activeIndex = -1;
        } else if (status.activePicker) {
            const round1Len = currentOrder.length;
            if (status.phase === 'ROUND_1') {
                activeIndex = fullTurnOrder.findIndex((n, i) => normalizeName(n) === normalizeName(status.activePicker) && i < round1Len);
            } else {
                activeIndex = fullTurnOrder.findIndex((n, i) => normalizeName(n) === normalizeName(status.activePicker) && i >= round1Len);
                if (activeIndex === -1) activeIndex = fullTurnOrder.findIndex(n => normalizeName(n) === normalizeName(status.activePicker));
            }
        }

        let myNextIndex = -1;
        for (let i = 0; i < fullTurnOrder.length; i++) {
            if (normalizeName(fullTurnOrder[i]) === normalizedMe && i > activeIndex) {
                myNextIndex = i;
                break;
            }
        }

        if (myNextIndex === -1) {
            if (isAdminPersona) return { diff: 99, round: 1 };
            return null;
        }

        const round = myNextIndex < currentOrder.length ? 1 : 2;
        return { diff: myNextIndex - activeIndex, round };
    }, [currentOrder, status, shareholderName, isReadOnly, isAdminPersona]);


    // --- SHARED: Round badges ---
    const renderBadges = () => {
        const myActions = bookings.filter(b =>
            normalizeName(b.shareholderName) === normalizedMe &&
            (b.isFinalized || b.type === 'pass' || b.type === 'skipped' || b.type === 'cancelled' || b.status === 'cancelled')
        ).sort((a, b) => a.createdAt - b.createdAt);

        const isYourTurn = status.activePicker && normalizeName(status.activePicker) === normalizedMe;

        const getBadge = (roundNum) => {
            const hasRoundData = myActions.some(b => b.round !== undefined);
            const action = hasRoundData
                ? myActions.find(b => b.round === roundNum)
                : roundNum === 1 ? myActions[0] : (myActions.length > 1 ? myActions[1] : null);

            const isQueueRound = queueInfo && queueInfo.round === roundNum;
            const isTurnRound = (roundNum === 1 ? status.phase === 'ROUND_1' : status.phase === 'ROUND_2') && isYourTurn;

            // Implicit skip detection
            let isSkippedImplicitly = false;
            if (!action) {
                if (roundNum === 1 && ['ROUND_2', 'OPEN_SEASON', 'COMPLETED'].includes(status.phase)) {
                    isSkippedImplicitly = true;
                } else if (roundNum === 2 && ['OPEN_SEASON', 'COMPLETED'].includes(status.phase)) {
                    isSkippedImplicitly = true;
                } else if ((roundNum === 1 && status.phase === 'ROUND_1') || (roundNum === 2 && status.phase === 'ROUND_2')) {
                    const order = roundNum === 2 ? [...currentOrder].reverse() : currentOrder;
                    const myIdx = order.findIndex(n => normalizeName(n) === normalizedMe);
                    const activeIdx = order.findIndex(n => normalizeName(n) === normalizeName(status.activePicker));
                    if (myIdx !== -1 && activeIdx !== -1 && myIdx < activeIdx) isSkippedImplicitly = true;
                }
            }

            let style = 'bg-slate-700/60 text-slate-400 border-slate-600/50';
            let icon = <Clock className="w-3 h-3" />;
            let text = "Waiting";

            if (action) {
                if (action.type === 'pass') {
                    style = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
                    icon = <CheckCircle className="w-3 h-3" />;
                    text = "Passed";
                } else if (action.type === 'skipped') {
                    style = 'bg-orange-500/10 text-orange-300 border-orange-500/30';
                    icon = <XCircle className="w-3 h-3" />;
                    text = "Skipped";
                } else if (action.type === 'cancelled' || action.status === 'cancelled') {
                    style = 'bg-red-500/10 text-red-300 border-red-500/30';
                    icon = <XCircle className="w-3 h-3" />;
                    text = "Cancelled";
                } else {
                    const isPaid = action.paymentStatus === 'paid';
                    style = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                    icon = <CheckCircle className="w-3 h-3" />;
                    text = isPaid ? "Paid" : "Confirmed";
                }
            } else if (isSkippedImplicitly) {
                style = 'bg-orange-500/10 text-orange-300 border-orange-500/30';
                icon = <XCircle className="w-3 h-3" />;
                text = "Skipped";
            } else if (isTurnRound) {
                style = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
                icon = <Clock className="w-3 h-3 animate-pulse" />;
                text = "Your Turn";
            } else if (isQueueRound) {
                style = 'bg-blue-500/10 text-blue-300 border-blue-500/30';
                icon = <Clock className="w-3 h-3" />;
                text = queueInfo.diff === 1 ? "Up Next!" : `#${queueInfo.diff} in Line`;
            }

            return (
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${style}`}>
                    <span className="opacity-60">R{roundNum}</span>
                    {icon}
                    <span>{text}</span>
                </div>
            );
        };

        return (
            <div id="tour-status" className="flex flex-wrap items-center gap-2">
                {getBadge(1)}
                {getBadge(2)}
            </div>
        );
    };

    // --- CARD WRAPPER ---
    const Card = ({ children, borderColor = 'border-white/10', className = '' }) => (
        <div data-tour="status-hero" className={`bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 md:p-6 shadow-lg border ${borderColor} ${className}`}>
            {children}
        </div>
    );

    // --- WELCOME LINE ---
    const WelcomeLine = () => (
        <div className="space-y-2">
            <p className="text-sm text-white/50 leading-snug">
                Welcome to the 2026 Season, <span className="text-white/80 font-semibold">{formatNameForDisplay(shareholderName)}</span>
            </p>
            {renderBadges()}
        </div>
    );

    // ============================================
    // 1. SYSTEM MAINTENANCE
    // ============================================
    if (isSystemFrozen && !isSuperAdmin) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg text-amber-600 shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-amber-900">System Maintenance</h2>
                        <p className="text-sm text-amber-700/80 mt-0.5">Booking actions are temporarily paused.</p>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================
    // 2. PRE-DRAFT
    // ============================================
    if (status.phase === 'PRE_DRAFT' || (!status.activePicker && status.phase !== 'OPEN_SEASON')) {
        return (
            <Card>
                <div className="space-y-3">
                    <WelcomeLine />
                    <div className="flex items-center gap-3 pt-1">
                        <div className="p-2 bg-indigo-500/15 rounded-lg text-indigo-400 shrink-0">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-base font-bold text-white">Draft starts soon</p>
                            {status.windowStarts && (
                                <p className="text-sm text-white/50 mt-0.5">
                                    {format(new Date(status.windowStarts), 'MMMM d, yyyy')} at 10:00 AM
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        );
    }

    // ============================================
    // 3. OPEN SEASON
    // ============================================
    if (status.phase === 'OPEN_SEASON') {
        return (
            <Card borderColor="border-emerald-500/20">
                <div className="space-y-3">
                    <WelcomeLine />
                    <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/15 rounded-lg text-emerald-400 shrink-0">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-base font-bold text-emerald-400">Open Season</p>
                                <p className="text-sm text-white/50 mt-0.5">First come, first served for all dates</p>
                            </div>
                        </div>
                        <button
                            onClick={onOpenBooking}
                            disabled={isReadOnly}
                            className={`px-4 py-2 text-sm font-bold rounded-lg shrink-0 transition-all
                                ${isReadOnly
                                    ? 'bg-emerald-600/30 text-white/40 cursor-not-allowed'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'}`}
                        >
                            Book Now
                        </button>
                    </div>
                </div>
            </Card>
        );
    }


    // --- User State Logic ---
    const isYourTurn = normalizeName(status.activePicker) === normalizedMe;

    let roundTarget = 1;
    if (status.phase === 'ROUND_2') roundTarget = 2;
    const myActions = bookings.filter(b =>
        normalizeName(b.shareholderName) === normalizedMe &&
        (b.isFinalized || b.type === 'pass' || b.type === 'skipped' || b.type === 'cancelled' || b.status === 'cancelled')
    ).sort((a, b) => a.createdAt - b.createdAt);
    const isDoneForRound = myActions.length >= roundTarget;
    const lastAction = myActions[myActions.length - 1];

    const latestAction = bookings
        .filter(b => normalizeName(b.shareholderName) === normalizedMe && (b.isFinalized || b.type === 'pass' || b.type === 'cancelled' || b.type === 'skipped' || b.status === 'cancelled'))
        .sort((a, b) => b.createdAt - a.createdAt)[0];

    // Phase badge helper
    const getPhaseLabel = (phase) => {
        if (phase === 'ROUND_1') return 'Round 1';
        if (phase === 'ROUND_2') return 'Round 2';
        if (phase === 'OPEN_SEASON') return 'Open Season';
        return null;
    };
    const phaseLabel = getPhaseLabel(status.phase);


    // ============================================
    // 4. YOUR TURN
    // ============================================
    if (isYourTurn) {
        const targetDate = status.windowEnds;

        const timeRemaining = targetDate ? (() => {
            const end = new Date(targetDate);
            if (end <= now) return 'Ending...';
            const diff = intervalToDuration({ start: now, end });
            const parts = [];
            if (diff.days > 0) parts.push(`${diff.days}d`);
            if (diff.hours > 0) parts.push(`${diff.hours}h`);
            if (diff.minutes > 0) parts.push(`${diff.minutes}m`);
            return parts.join(' ') || '< 1m';
        })() : null;

        const borderColor = status.isGracePeriod ? 'border-emerald-500/30' : 'border-orange-500/30';
        const accentColor = status.isGracePeriod ? 'text-emerald-400' : 'text-orange-400';
        const accentBg = status.isGracePeriod ? 'bg-emerald-500/15' : 'bg-orange-500/15';

        return (
            <Card borderColor={borderColor}>
                <div className="space-y-3">
                    <WelcomeLine />

                    {/* Status line */}
                    <div className="flex items-start gap-3 pt-1">
                        <div className={`p-2 ${accentBg} rounded-lg ${accentColor} shrink-0 mt-0.5`}>
                            <PlayCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-base font-bold ${accentColor}`}>
                                {status.isGracePeriod ? 'Early Access' : "It's Your Turn"}
                            </p>
                            <p className="text-sm text-white/50 mt-0.5">
                                {status.isGracePeriod
                                    ? `Official window starts ${status.windowStarts ? format(new Date(status.windowStarts), 'MMM d') : ''} at 10 AM`
                                    : 'Select your dates or pass your turn'}
                            </p>
                        </div>
                    </div>

                    {/* Deadline + Actions */}
                    <div id="tour-deadline" className="bg-slate-800/60 rounded-xl p-3 space-y-3">
                        {targetDate && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <span className="text-xs text-slate-400 font-medium">Due</span>
                                    <span className="text-sm font-bold text-white">
                                        {format(new Date(targetDate), 'MMM d, h:mm a')}
                                    </span>
                                </div>
                                {timeRemaining && (
                                    <span className="px-2 py-0.5 bg-blue-500/15 text-blue-300 border border-blue-500/20 text-[11px] font-bold rounded-md">
                                        {timeRemaining}
                                    </span>
                                )}
                            </div>
                        )}

                        <div id="tour-actions" className="flex gap-2">
                            <button
                                onClick={onPass}
                                disabled={isReadOnly}
                                className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all
                                    ${isReadOnly
                                        ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                                        : 'bg-slate-700/70 text-slate-300 hover:bg-slate-600 hover:text-white'}`}
                            >
                                Pass Turn
                            </button>
                            <button
                                onClick={onOpenBooking}
                                disabled={isReadOnly}
                                className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all
                                    ${isReadOnly
                                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                        : 'bg-white text-slate-900 hover:bg-blue-50 active:scale-95'}`}
                            >
                                <PlayCircle className={`w-4 h-4 ${isReadOnly ? 'text-slate-500' : 'text-blue-600'}`} />
                                Book Now
                            </button>
                        </div>
                    </div>
                </div>
            </Card>
        );
    }


    // ============================================
    // 5. DONE FOR ROUND
    // ============================================
    if (isDoneForRound && lastAction?.type !== 'cancelled') {
        const isPassed = lastAction?.type === 'pass';
        const isSkipped = lastAction?.type === 'skipped';
        let displayDate = null;
        let nights = 0;
        let paymentStatus = null;

        if (!isPassed && !isSkipped && lastAction) {
            const start = lastAction.from?.toDate ? lastAction.from.toDate() : new Date(lastAction.from);
            const end = lastAction.to?.toDate ? lastAction.to.toDate() : new Date(lastAction.to);
            displayDate = { start, end };
            nights = differenceInDays(end, start);
            paymentStatus = lastAction.isPaid ? 'paid' : 'unpaid';
        }

        const isPaid = paymentStatus === 'paid';

        // Determine round label for the booking
        const getRoundLabel = () => {
            const nonCancelledActions = myActions.filter(b => b.type !== 'cancelled' && b.status !== 'cancelled');
            const logicalIndex = nonCancelledActions.findIndex(b => b.id === lastAction.id);
            if (lastAction.round) {
                if (lastAction.round === 1) return 'Round 1';
                if (lastAction.round === 2) return 'Round 2';
                return 'Open Season';
            }
            if (logicalIndex === 0) return 'Round 1';
            if (logicalIndex === 1) return 'Round 2';
            if (logicalIndex >= 2) return 'Open Season';
            return null;
        };

        if (isPassed || isSkipped) {
            // Passed or Skipped - very compact
            const icon = isPassed ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />;
            const color = isPassed ? 'text-amber-400' : 'text-orange-400';
            const bg = isPassed ? 'bg-amber-500/15' : 'bg-orange-500/15';
            const label = isPassed ? 'Turn Passed' : 'Turn Skipped';
            const sub = isPassed
                ? "We'll notify you when the next round begins."
                : "Don't worry - you'll get another chance next round.";

            return (
                <Card>
                    <div className="space-y-3">
                        <WelcomeLine />
                        <div className="flex items-center gap-3 pt-1">
                            <div className={`p-2 ${bg} rounded-lg ${color} shrink-0`}>
                                {icon}
                            </div>
                            <div>
                                <p className={`text-base font-bold ${color}`}>{label}</p>
                                <p className="text-sm text-white/50 mt-0.5">{sub}</p>
                            </div>
                        </div>
                    </div>
                </Card>
            );
        }

        // Confirmed booking (paid or unpaid)
        const borderColor = isPaid ? 'border-emerald-500/20' : 'border-amber-500/20';

        return (
            <Card borderColor={borderColor}>
                <div className="space-y-3">
                    <WelcomeLine />

                    {/* Booking confirmation line */}
                    <div className="flex items-start gap-3 pt-1">
                        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${isPaid ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                            {isPaid ? <CheckCircle className="w-5 h-5" /> : <Banknote className="w-5 h-5 animate-pulse" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className={`text-base font-bold ${isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {isPaid ? 'Confirmed' : 'Fee Outstanding'}
                                </p>
                                {getRoundLabel() && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-700/60 px-1.5 py-0.5 rounded">
                                        {getRoundLabel()}
                                    </span>
                                )}
                            </div>
                            {displayDate && (
                                <p className="text-sm text-white/70 mt-0.5">
                                    <span className="font-semibold text-white">{format(displayDate.start, 'MMM d')} - {format(displayDate.end, 'MMM d')}</span>
                                    <span className="text-white/40 ml-1.5">({nights} nights)</span>
                                </p>
                            )}
                            <p className="text-xs text-white/40 mt-1">
                                {isPaid ? 'Maintenance fee verified - enjoy the season!' : 'Please e-transfer your fee to HHR to finalize.'}
                            </p>
                        </div>
                    </div>

                    {/* Action row */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                        {onEmail && !isPaid && (
                            <button
                                onClick={() => onEmail(lastAction)}
                                className="px-3 py-1.5 text-xs font-semibold text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                                <Mail className="w-3.5 h-3.5" /> Email
                            </button>
                        )}
                        <button
                            onClick={() => onViewDetails(lastAction)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5
                                ${isPaid
                                    ? 'text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20'
                                    : 'text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20'}`}
                        >
                            <Info className="w-3.5 h-3.5" /> Details
                        </button>
                    </div>
                </div>
            </Card>
        );
    }


    // ============================================
    // 6. BOOKING CANCELLED
    // ============================================
    if (latestAction?.type === 'cancelled' && !isYourTurn) {
        return (
            <Card borderColor="border-red-500/20">
                <div className="space-y-3">
                    <WelcomeLine />
                    <div className="flex items-center gap-3 pt-1">
                        <div className="p-2 bg-red-500/15 rounded-lg text-red-400 shrink-0">
                            <XCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-base font-bold text-red-400">Booking Cancelled</p>
                            <p className="text-sm text-white/50 mt-0.5">You'll be able to book again in the next available round.</p>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={() => onViewDetails(latestAction)}
                            disabled={isReadOnly}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors
                                ${isReadOnly
                                    ? 'bg-slate-700/40 text-white/40 border-white/5 cursor-not-allowed'
                                    : 'text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-600 border-white/10'}`}
                        >
                            View Details
                        </button>
                    </div>
                </div>
            </Card>
        );
    }

    // ============================================
    // 7. WAITING / QUEUE
    // ============================================
    const upcomingBooking = bookings
        .filter(b => normalizeName(b.shareholderName) === normalizedMe && b.isFinalized && b.type !== 'cancelled' && b.type !== 'pass')
        .sort((a, b) => b.createdAt - a.createdAt)[0];

    const isUpNext = queueInfo?.diff === 1;

    return (
        <Card>
            <div className="space-y-3">
                <WelcomeLine />

                {/* Feedback links */}
                <p className="text-xs text-white/40">
                    Have questions? <button onClick={onOpenFeedback} className="font-semibold text-white/60 hover:text-indigo-300 underline decoration-indigo-500/50 underline-offset-2 transition-colors">Share feedback</button>
                </p>

                {/* Queue position */}
                <div className="flex items-start gap-3 pt-1">
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${isUpNext ? 'bg-emerald-500/15 text-emerald-400' : 'bg-indigo-500/15 text-indigo-400'}`}>
                        <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        {isUpNext ? (
                            <>
                                <p className="text-base font-bold text-emerald-400">
                                    You're Up Next ({queueInfo?.round === 1 ? 'Round 1' : 'Round 2'})
                                </p>
                                <p className="text-sm text-white/50 mt-0.5">
                                    <span className="font-semibold text-white/70">{status.activePicker}</span> is currently picking.
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                                        {getOrdinal(queueInfo?.diff || 1)}
                                    </span>
                                    <span className="text-sm font-semibold text-white/50">
                                        in line ({queueInfo?.round === 1 ? 'Round 1' : 'Round 2'})
                                    </span>
                                </div>
                                <p className="text-xs text-white/40 mt-0.5">We'll email you when it's your turn.</p>
                            </>
                        )}
                    </div>
                </div>

                {/* Currently picking info - inline, not a separate card */}
                {!isYourTurn && status.activePicker && !isUpNext && (
                    <div className="bg-slate-800/60 rounded-lg px-3 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-slate-400 font-medium shrink-0">Now picking:</span>
                            <span className="text-sm font-semibold text-white truncate">{status.activePicker}</span>
                        </div>
                        {status.windowEnds && (
                            <span className="text-[11px] font-bold text-blue-300 bg-blue-500/15 border border-blue-500/20 px-2 py-0.5 rounded-md shrink-0 ml-2">
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
                        )}
                    </div>
                )}

                {/* View details for existing booking */}
                {upcomingBooking && (
                    <div className="flex justify-end">
                        <button
                            onClick={() => onViewDetails(upcomingBooking)}
                            disabled={isReadOnly}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors
                                ${isReadOnly
                                    ? 'bg-slate-700/40 text-white/40 border-white/5 cursor-not-allowed'
                                    : 'text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-600 border-white/10'}`}
                        >
                            View Details
                        </button>
                    </div>
                )}
            </div>
        </Card>
    );
}
