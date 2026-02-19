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

    React.useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // --- CONFETTI CELEBRATION ---
    React.useEffect(() => {
        const paidBooking = bookings?.find(b =>
            normalizeName(b.shareholderName) === normalizeName(shareholderName) &&
            b.isFinalized && b.isPaid && !b.celebrated &&
            b.type !== 'cancelled' && b.type !== 'pass'
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
                    style = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                    icon = <CheckCircle className="w-3 h-3" />;
                    text = action.paymentStatus === 'paid' ? "Paid" : "Confirmed";
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
            <div id="tour-status" className="flex items-center gap-2">
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

    // --- HEADER: Welcome left, Badges right ---
    const Header = () => (
        <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-white/50 leading-snug">
                Welcome, <span className="text-white/80 font-semibold">{formatNameForDisplay(shareholderName)}</span>
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
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-600 shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-amber-900">System Maintenance</h2>
                            <p className="text-sm text-amber-700/80 mt-0.5">Booking actions temporarily paused.</p>
                        </div>
                    </div>
                    <Clock className="w-5 h-5 text-amber-400 shrink-0" />
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
                <div className="space-y-4">
                    <Header />

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-indigo-500/15 rounded-lg text-indigo-400 shrink-0">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-base font-bold text-white">Draft starts soon</p>
                                <p className="text-sm text-white/40 mt-0.5">We'll notify you when it's time</p>
                            </div>
                        </div>
                        {status.windowStarts && (
                            <div className="text-right shrink-0">
                                <p className="text-xs text-white/30 font-medium uppercase tracking-wide">Begins</p>
                                <p className="text-sm font-bold text-indigo-400 mt-0.5">
                                    {format(new Date(status.windowStarts), 'MMM d')}
                                </p>
                                <p className="text-xs text-white/40">10:00 AM</p>
                            </div>
                        )}
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
                <div className="space-y-4">
                    <Header />

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-emerald-500/15 rounded-lg text-emerald-400 shrink-0">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-base font-bold text-emerald-400">Open Season</p>
                                <p className="text-sm text-white/40 mt-0.5">First come, first served</p>
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
                <div className="space-y-4">
                    <Header />

                    {/* Status left, countdown right */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2 ${accentBg} rounded-lg ${accentColor} shrink-0`}>
                                <PlayCircle className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className={`text-base font-bold ${accentColor}`}>
                                    {status.isGracePeriod ? 'Early Access' : "It's Your Turn"}
                                </p>
                                <p className="text-sm text-white/40 mt-0.5">
                                    {status.isGracePeriod
                                        ? `Starts officially ${status.windowStarts ? format(new Date(status.windowStarts), 'MMM d') : ''}`
                                        : 'Select your dates or pass'}
                                </p>
                            </div>
                        </div>

                        {/* Countdown badge - right side */}
                        {targetDate && (
                            <div className="text-right shrink-0">
                                <p className="text-xs text-white/30 font-medium uppercase tracking-wide">Due</p>
                                <p className="text-sm font-bold text-white mt-0.5">
                                    {format(new Date(targetDate), 'MMM d')}
                                </p>
                                {timeRemaining && (
                                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500/15 text-blue-300 border border-blue-500/20 text-[11px] font-bold rounded-md">
                                        {timeRemaining}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions - full width row */}
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

        // --- Passed or Skipped ---
        if (isPassed || isSkipped) {
            const icon = isPassed ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />;
            const color = isPassed ? 'text-amber-400' : 'text-orange-400';
            const bg = isPassed ? 'bg-amber-500/15' : 'bg-orange-500/15';
            const label = isPassed ? 'Turn Passed' : 'Turn Skipped';
            const sub = isPassed
                ? "We'll notify you when the next round begins."
                : "You'll get another chance next round.";

            return (
                <Card>
                    <div className="space-y-4">
                        <Header />
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`p-2 ${bg} rounded-lg ${color} shrink-0`}>
                                    {icon}
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-base font-bold ${color}`}>{label}</p>
                                    <p className="text-sm text-white/40 mt-0.5">{sub}</p>
                                </div>
                            </div>
                            {phaseLabel && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-700/60 px-2 py-1 rounded-md shrink-0">
                                    {phaseLabel}
                                </span>
                            )}
                        </div>
                    </div>
                </Card>
            );
        }

        // --- Confirmed booking (paid or unpaid) ---
        const borderColor = isPaid ? 'border-emerald-500/20' : 'border-amber-500/20';

        return (
            <Card borderColor={borderColor}>
                <div className="space-y-4">
                    <Header />

                    {/* Status left, Actions right */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className={`p-2 rounded-lg shrink-0 ${isPaid ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                                {isPaid ? <CheckCircle className="w-5 h-5" /> : <Banknote className="w-5 h-5 animate-pulse" />}
                            </div>
                            <div className="min-w-0">
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
                                    <p className="text-sm text-white/70 mt-1">
                                        <span className="font-semibold text-white">{format(displayDate.start, 'MMM d')} - {format(displayDate.end, 'MMM d')}</span>
                                        <span className="text-white/30 ml-1.5">({nights} nights)</span>
                                    </p>
                                )}
                                <p className="text-xs text-white/30 mt-1">
                                    {isPaid ? 'Maintenance fee verified' : 'Please e-transfer your fee to HHR'}
                                </p>
                            </div>
                        </div>

                        {/* Right side: action buttons stacked */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                            <button
                                onClick={() => onViewDetails(lastAction)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5
                                    ${isPaid
                                        ? 'text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20'
                                        : 'text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20'}`}
                            >
                                <Info className="w-3.5 h-3.5" /> Details
                            </button>
                            {onEmail && !isPaid && (
                                <button
                                    onClick={() => onEmail(lastAction)}
                                    className="px-3 py-1.5 text-xs font-semibold text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                    <Mail className="w-3.5 h-3.5" /> Email
                                </button>
                            )}
                        </div>
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
                <div className="space-y-4">
                    <Header />
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-red-500/15 rounded-lg text-red-400 shrink-0">
                                <XCircle className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-base font-bold text-red-400">Booking Cancelled</p>
                                <p className="text-sm text-white/40 mt-0.5">You can book again next round.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => onViewDetails(latestAction)}
                            disabled={isReadOnly}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors shrink-0
                                ${isReadOnly
                                    ? 'bg-slate-700/40 text-white/40 border-white/5 cursor-not-allowed'
                                    : 'text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-600 border-white/10'}`}
                        >
                            Details
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
            <div className="space-y-4">
                <Header />

                {/* Queue position left, Current picker right */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${isUpNext ? 'bg-emerald-500/15 text-emerald-400' : 'bg-indigo-500/15 text-indigo-400'}`}>
                            <Clock className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            {isUpNext ? (
                                <>
                                    <p className="text-base font-bold text-emerald-400">You're Up Next</p>
                                    <p className="text-sm text-white/40 mt-0.5">{queueInfo?.round === 1 ? 'Round 1' : 'Round 2'}</p>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                                            {getOrdinal(queueInfo?.diff || 1)}
                                        </span>
                                        <span className="text-sm font-medium text-white/40">
                                            in line
                                        </span>
                                    </div>
                                    <p className="text-xs text-white/30 mt-0.5">{queueInfo?.round === 1 ? 'Round 1' : 'Round 2'} - we'll email you</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right side: who's currently picking */}
                    {status.activePicker && (
                        <div className="text-right shrink-0">
                            <p className="text-xs text-white/30 font-medium uppercase tracking-wide">Now Picking</p>
                            <p className="text-sm font-semibold text-white/70 mt-0.5 truncate max-w-[120px]">{status.activePicker}</p>
                            {status.windowEnds && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500/15 text-blue-300 border border-blue-500/20 text-[11px] font-bold rounded-md">
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
                </div>

                {/* Bottom row: feedback left, details right */}
                <div className="flex items-center justify-between">
                    <button onClick={onOpenFeedback} className="text-xs font-medium text-white/30 hover:text-indigo-300 underline decoration-white/10 underline-offset-2 transition-colors">
                        Share feedback
                    </button>
                    {upcomingBooking && (
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
                    )}
                </div>
            </div>
        </Card>
    );
}
