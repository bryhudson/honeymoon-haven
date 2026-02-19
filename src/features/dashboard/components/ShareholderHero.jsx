import React from 'react';
import { format, differenceInDays, intervalToDuration } from 'date-fns';
import { AlertTriangle, Clock, Calendar, PlayCircle, CheckCircle, XCircle, Info, Mail, Banknote, PartyPopper, Sparkles } from 'lucide-react';
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

    // --- CONFETTI ---
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

    const normalizedMe = normalizeName(shareholderName);
    const isAdminPersona = !isReadOnly && (normalizedMe === 'hhr admin' || normalizedMe === 'bryan');

    // --- Queue calc (unchanged) ---
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
            if (normalizeName(fullTurnOrder[i]) === normalizedMe && i > activeIndex) { myNextIndex = i; break; }
        }
        if (myNextIndex === -1) {
            if (isAdminPersona) return { diff: 99, round: 1 };
            return null;
        }
        return { diff: myNextIndex - activeIndex, round: myNextIndex < currentOrder.length ? 1 : 2 };
    }, [currentOrder, status, shareholderName, isReadOnly, isAdminPersona]);

    // --- User state ---
    const isYourTurn = status.activePicker && normalizeName(status.activePicker) === normalizedMe;
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


    // ============================================
    // 1. SYSTEM MAINTENANCE
    // ============================================
    if (isSystemFrozen && !isSuperAdmin) {
        return (
            <div data-tour="status-hero" className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-base font-bold text-amber-300">Hang tight!</p>
                <p className="text-sm text-amber-200/60 mt-1">We're doing some quick maintenance. Back shortly.</p>
            </div>
        );
    }

    // ============================================
    // 2. PRE-DRAFT
    // ============================================
    if (status.phase === 'PRE_DRAFT' || (!status.activePicker && status.phase !== 'OPEN_SEASON')) {
        return (
            <div data-tour="status-hero" className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl p-5 md:p-6 text-center">
                <div className="text-3xl mb-2">📅</div>
                <p className="text-lg font-bold text-white">The 2026 season is coming!</p>
                {status.windowStarts ? (
                    <p className="text-sm text-white/50 mt-1">
                        The draft kicks off <span className="text-indigo-400 font-semibold">{format(new Date(status.windowStarts), 'MMMM d')}</span> at 10 AM
                    </p>
                ) : (
                    <p className="text-sm text-white/50 mt-1">We'll let you know when it's time to pick your dates.</p>
                )}
            </div>
        );
    }

    // ============================================
    // 3. OPEN SEASON
    // ============================================
    if (status.phase === 'OPEN_SEASON') {
        return (
            <div data-tour="status-hero" className="bg-gradient-to-br from-slate-900 to-slate-800 border border-emerald-500/20 rounded-2xl p-5 md:p-6 text-center">
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-lg font-bold text-white">It's open season!</p>
                <p className="text-sm text-white/50 mt-1">All remaining dates are first come, first served.</p>
                <button
                    onClick={onOpenBooking}
                    disabled={isReadOnly}
                    className={`mt-4 px-6 py-2.5 text-sm font-bold rounded-xl transition-all
                        ${isReadOnly
                            ? 'bg-emerald-600/30 text-white/40 cursor-not-allowed'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25 active:scale-95'}`}
                >
                    Book Your Dates
                </button>
            </div>
        );
    }

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

        const isEarly = status.isGracePeriod;

        return (
            <div data-tour="status-hero" className={`bg-gradient-to-br from-slate-900 to-slate-800 border rounded-2xl p-5 md:p-6 text-center ${isEarly ? 'border-emerald-500/30' : 'border-orange-500/30'}`}>
                <div className="text-3xl mb-2">{isEarly ? '🌟' : '🎯'}</div>
                <p className={`text-lg font-bold ${isEarly ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {isEarly ? "You've got early access!" : "It's your turn!"}
                </p>
                <p className="text-sm text-white/50 mt-1">
                    {isEarly
                        ? `Official window starts ${status.windowStarts ? format(new Date(status.windowStarts), 'MMM d') : ''} at 10 AM`
                        : 'Pick your dates before the clock runs out'}
                </p>

                {/* Countdown */}
                {targetDate && (
                    <div id="tour-deadline" className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-white/60">Due {format(new Date(targetDate), 'MMM d, h:mm a')}</span>
                        {timeRemaining && (
                            <span className="text-xs font-bold text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded-md">
                                {timeRemaining}
                            </span>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div id="tour-actions" className="mt-4 flex gap-3 justify-center">
                    <button
                        onClick={onPass}
                        disabled={isReadOnly}
                        className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all
                            ${isReadOnly
                                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'}`}
                    >
                        Pass
                    </button>
                    <button
                        onClick={onOpenBooking}
                        disabled={isReadOnly}
                        className={`px-6 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2 transition-all
                            ${isReadOnly
                                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                                : 'bg-white text-slate-900 shadow-lg shadow-white/10 hover:shadow-white/20 active:scale-95'}`}
                    >
                        <Calendar className={`w-4 h-4 ${isReadOnly ? '' : 'text-blue-600'}`} />
                        Book Now
                    </button>
                </div>
            </div>
        );
    }

    // ============================================
    // 5. DONE FOR ROUND
    // ============================================
    if (isDoneForRound && lastAction?.type !== 'cancelled') {
        const isPassed = lastAction?.type === 'pass';
        const isSkipped = lastAction?.type === 'skipped';

        // --- Passed ---
        if (isPassed) {
            return (
                <div data-tour="status-hero" className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl p-5 md:p-6 text-center">
                    <div className="text-3xl mb-2">✋</div>
                    <p className="text-base font-bold text-amber-400">You passed this round</p>
                    <p className="text-sm text-white/40 mt-1">No worries - we'll let you know when the next round starts.</p>
                </div>
            );
        }

        // --- Skipped ---
        if (isSkipped) {
            return (
                <div data-tour="status-hero" className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl p-5 md:p-6 text-center">
                    <div className="text-3xl mb-2">⏭️</div>
                    <p className="text-base font-bold text-orange-400">Turn skipped</p>
                    <p className="text-sm text-white/40 mt-1">Don't sweat it - you'll get another shot next round!</p>
                </div>
            );
        }

        // --- Confirmed Booking ---
        const start = lastAction.from?.toDate ? lastAction.from.toDate() : new Date(lastAction.from);
        const end = lastAction.to?.toDate ? lastAction.to.toDate() : new Date(lastAction.to);
        const nights = differenceInDays(end, start);
        const isPaid = lastAction.isPaid;

        return (
            <div data-tour="status-hero" className={`bg-gradient-to-br from-slate-900 to-slate-800 border rounded-2xl p-5 md:p-6 text-center ${isPaid ? 'border-emerald-500/20' : 'border-amber-500/20'}`}>
                <div className="text-3xl mb-2">{isPaid ? '🏖️' : '💳'}</div>
                <p className={`text-lg font-bold ${isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isPaid ? "You're all booked!" : 'Almost there!'}
                </p>

                {/* Date display - the star of the show */}
                <div className="mt-3 inline-block bg-white/5 rounded-xl px-5 py-3 border border-white/10">
                    <p className="text-xl font-bold text-white">
                        {format(start, 'MMM d')} - {format(end, 'MMM d')}
                    </p>
                    <p className="text-sm text-white/40 mt-0.5">{nights} nights · 2026 Season</p>
                </div>

                {/* Payment status */}
                <p className="text-sm mt-3 text-white/40">
                    {isPaid
                        ? <span>Maintenance fee paid <CheckCircle className="w-3.5 h-3.5 inline text-emerald-400 -mt-0.5" /></span>
                        : <span className="text-amber-300">Fee outstanding - please e-transfer to HHR</span>
                    }
                </p>

                {/* Actions */}
                <div className="mt-4 flex gap-2 justify-center">
                    {!isPaid && onEmail && (
                        <button
                            onClick={() => onEmail(lastAction)}
                            className="px-4 py-2 text-xs font-semibold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl transition-colors flex items-center gap-1.5"
                        >
                            <Mail className="w-3.5 h-3.5" /> Reminder
                        </button>
                    )}
                    <button
                        onClick={() => onViewDetails(lastAction)}
                        className="px-4 py-2 text-xs font-semibold text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                        <Info className="w-3.5 h-3.5" /> Details
                    </button>
                </div>
            </div>
        );
    }

    // ============================================
    // 6. BOOKING CANCELLED
    // ============================================
    if (latestAction?.type === 'cancelled' && !isYourTurn) {
        return (
            <div data-tour="status-hero" className="bg-gradient-to-br from-slate-900 to-slate-800 border border-red-500/20 rounded-2xl p-5 md:p-6 text-center">
                <div className="text-3xl mb-2">😔</div>
                <p className="text-base font-bold text-red-400">Booking cancelled</p>
                <p className="text-sm text-white/40 mt-1">You'll be able to book again next round.</p>
                <button
                    onClick={() => onViewDetails(latestAction)}
                    disabled={isReadOnly}
                    className={`mt-3 px-4 py-2 text-xs font-semibold rounded-xl border transition-colors
                        ${isReadOnly
                            ? 'bg-white/5 text-white/30 border-white/5 cursor-not-allowed'
                            : 'text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'}`}
                >
                    View Details
                </button>
            </div>
        );
    }

    // ============================================
    // 7. WAITING IN LINE
    // ============================================
    const upcomingBooking = bookings
        .filter(b => normalizeName(b.shareholderName) === normalizedMe && b.isFinalized && b.type !== 'cancelled' && b.type !== 'pass')
        .sort((a, b) => b.createdAt - a.createdAt)[0];

    const isUpNext = queueInfo?.diff === 1;
    const roundLabel = queueInfo?.round === 1 ? 'Round 1' : 'Round 2';

    return (
        <div data-tour="status-hero" className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl p-5 md:p-6 text-center">
            {isUpNext ? (
                <>
                    <div className="text-3xl mb-2">🔥</div>
                    <p className="text-lg font-bold text-emerald-400">You're up next!</p>
                    <p className="text-sm text-white/40 mt-1">{roundLabel} - almost your turn</p>
                </>
            ) : (
                <>
                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-1">
                        {getOrdinal(queueInfo?.diff || 1)}
                    </div>
                    <p className="text-sm font-medium text-white/50">in line for {roundLabel}</p>
                </>
            )}

            {/* Who's picking now */}
            {status.activePicker && (
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-sm">
                    <span className="text-white/40">{isUpNext ? 'Almost done:' : 'Now picking:'}</span>
                    <span className="font-semibold text-white/70">{status.activePicker}</span>
                    {status.windowEnds && (
                        <span className="text-[11px] font-bold text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded-md">
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

            <p className="text-xs text-white/30 mt-3">We'll email you when it's your turn 📧</p>

            {/* Bottom actions */}
            <div className="mt-3 flex gap-2 justify-center">
                <button onClick={onOpenFeedback} className="px-3 py-1.5 text-xs font-medium text-white/30 hover:text-indigo-300 transition-colors">
                    Feedback
                </button>
                {upcomingBooking && (
                    <button
                        onClick={() => onViewDetails(upcomingBooking)}
                        disabled={isReadOnly}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors
                            ${isReadOnly
                                ? 'bg-white/5 text-white/30 border-white/5 cursor-not-allowed'
                                : 'text-white/40 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'}`}
                    >
                        View Booking
                    </button>
                )}
            </div>
        </div>
    );
}
