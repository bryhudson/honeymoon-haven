import React from 'react';
import { format, differenceInDays, intervalToDuration } from 'date-fns';
import {
    AlertTriangle, Clock, Calendar, CheckCircle, XCircle, Info, Mail,
    Tent, Map, Caravan, Compass, ArrowRight, User
} from 'lucide-react';
import { normalizeName, formatNameForDisplay } from '../../../lib/shareholders';
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

    const normalizedMe = normalizeName(shareholderName);
    const isAdminPersona = !isReadOnly && (normalizedMe === 'hhr admin' || normalizedMe === 'bryan');

    // --- Queue calc ---
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

    // --- Modern Trailer Widget (MTW) Component ---
    const ModernTrailerWidget = ({
        accentColor = "emerald",
        icon: Icon,
        title,
        subtitle,
        mainContent,
        actions
    }) => {
        const themes = {
            emerald: {
                wrapper: "border-emerald-500/30 bg-gradient-to-r from-emerald-900/40 to-slate-900",
                iconBg: "bg-emerald-500/10",
                icon: "text-emerald-400",
                subtext: "text-emerald-200"
            },
            amber: {
                wrapper: "border-amber-500/30 bg-gradient-to-r from-amber-900/40 to-slate-900",
                iconBg: "bg-amber-500/10",
                icon: "text-amber-400",
                subtext: "text-amber-200"
            },
            indigo: {
                wrapper: "border-indigo-500/30 bg-gradient-to-r from-indigo-900/40 to-slate-900",
                iconBg: "bg-indigo-500/10",
                icon: "text-indigo-400",
                subtext: "text-indigo-200"
            },
            red: {
                wrapper: "border-red-500/30 bg-gradient-to-r from-red-900/40 to-slate-900",
                iconBg: "bg-red-500/10",
                icon: "text-red-400",
                subtext: "text-red-200"
            },
            slate: {
                wrapper: "border-slate-700 bg-slate-800/50",
                iconBg: "bg-slate-700/50",
                icon: "text-slate-400",
                subtext: "text-slate-300"
            }
        };

        const theme = themes[accentColor] || themes.slate;

        return (
            <div data-tour="status-hero" className={`rounded-xl border border-l-4 overflow-hidden shadow-xl ${theme.wrapper}`}>
                {/* Mobile Layout: Stacked */}
                <div className="md:hidden flex flex-col p-5 gap-4">
                    {/* Header Row */}
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${theme.iconBg}`}>
                            <Icon className={`w-6 h-6 ${theme.icon}`} strokeWidth={1.5} />
                        </div>
                        <div>
                            {shareholderName && <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] sm:text-xs mb-1">Welcome, {formatNameForDisplay(shareholderName)}</p>}
                            <h2 className={`font-bold uppercase tracking-wide text-lg ${theme.icon}`}>{title}</h2>
                            {subtitle && <p className={`mt-0.5 text-sm font-medium ${theme.subtext}`}>{subtitle}</p>}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="bg-slate-950/50 rounded-lg p-4 border border-white/5 backdrop-blur-sm">
                        {mainContent}
                    </div>

                    {/* Actions */}
                    {actions && <div className="grid grid-cols-1 gap-2 pt-1">{actions}</div>}
                </div>

                {/* Desktop Layout: Horizontal Bar */}
                <div className="hidden md:flex items-center justify-between p-4 px-6 gap-6 h-20">
                    {/* Left: Status */}
                    <div className="flex items-center gap-4 min-w-[240px]">
                        <div className={`p-2 rounded-lg ${theme.iconBg}`}>
                            <Icon className={`w-6 h-6 ${theme.icon}`} strokeWidth={1.5} />
                        </div>
                        <div>
                            {shareholderName && <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] sm:text-xs mb-1">Welcome, {formatNameForDisplay(shareholderName)}</p>}
                            <h2 className={`font-bold uppercase tracking-wide text-lg ${theme.icon}`}>{title}</h2>
                            {subtitle && <p className={`mt-0.5 text-sm font-medium ${theme.subtext}`}>{subtitle}</p>}
                        </div>
                    </div>

                    {/* Center: Main Content (Desktop Compact) */}
                    <div className="flex-1 border-l border-white/10 pl-6">
                        {mainContent}
                    </div>

                    {/* Right: Actions */}
                    {actions && <div className="flex items-center gap-2 max-w-[300px] justify-end">{actions}</div>}
                </div>
            </div>
        );
    };

    // ============================================
    // 1. SYSTEM MAINTENANCE
    // ============================================
    if (isSystemFrozen && !isSuperAdmin) {
        return <ModernTrailerWidget
            accentColor="amber"
            icon={AlertTriangle}
            title="Maintenance"
            subtitle="System Upgrade"
            mainContent={<div className="text-amber-200">The system is currently undergoing maintenance.</div>}
        />;
    }

    // ============================================
    // 2. PRE-DRAFT
    // ============================================
    if (status.phase === 'PRE_DRAFT' || (!status.activePicker && status.phase !== 'OPEN_SEASON')) {
        return <ModernTrailerWidget
            accentColor="slate"
            icon={Calendar}
            title="Pre-Season"
            subtitle="2026 Draft"
            mainContent={
                <div className="flex items-center gap-3">
                    <span className="text-white font-medium text-lg">
                        {status.windowStarts
                            ? `Draft Starts ${format(new Date(status.windowStarts), 'MMMM d')} @ 10am`
                            : 'Schedule Coming Soon'}
                    </span>
                </div>
            }
        />;
    }

    // ============================================
    // 3. OPEN SEASON
    // ============================================
    if (status.phase === 'OPEN_SEASON') {
        return <ModernTrailerWidget
            accentColor="emerald"
            icon={Tent}
            title="Open Season"
            subtitle="First Come, First Served"
            mainContent={
                <div className="text-white/80 font-medium">
                    All remaining dates are available for booking.
                </div>
            }
            actions={
                <button
                    onClick={onOpenBooking}
                    disabled={isReadOnly}
                    className={`w-full md:w-auto px-6 py-2.5 text-sm font-bold rounded-lg transition-all
                        ${isReadOnly
                            ? 'bg-emerald-900/30 text-emerald-500/50 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 active:scale-95'}`}
                >
                    Book Dates
                </button>
            }
        />;
    }

    // ============================================
    // 4. YOUR TURN
    // ============================================
    if (isYourTurn) {
        const targetDate = status.windowEnds;
        const timeLeft = targetDate ? (() => {
            const end = new Date(targetDate);
            if (end <= now) return 'Ending...';
            const diff = intervalToDuration({ start: now, end });
            const p = [];
            if (diff.days > 0) p.push(`${diff.days}d`);
            if (diff.hours > 0) p.push(`${diff.hours}h`);
            p.push(`${diff.minutes}m`);
            return p.join(' ');
        })() : null;

        const isEarly = status.isGracePeriod;

        return <ModernTrailerWidget
            accentColor={isEarly ? "emerald" : "amber"}
            icon={Clock}
            title={isEarly ? "Early Access" : "Your Turn"}
            subtitle={isEarly ? "Bonus Time Active" : "Official Window Open"}
            mainContent={
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                    <div>
                        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">DEADLINE</p>
                        <p className="text-xl text-white font-bold tracking-tight tabular-nums">
                            {targetDate ? format(new Date(targetDate), 'MMM d, h:mm a') : 'No Deadline'}
                        </p>
                    </div>
                    {timeLeft && (
                        <div className={`self-start md:self-center px-4 py-1.5 rounded-lg bg-slate-900/50 border ${isEarly ? 'border-emerald-500/40 text-emerald-300' : 'border-amber-500/40 text-amber-300'} font-bold text-sm shadow-sm tabular-nums backdrop-blur-sm`}>
                            {timeLeft} left
                        </div>
                    )}
                </div>
            }
            actions={
                <>
                    <button
                        onClick={onPass}
                        disabled={isReadOnly}
                        className="w-full md:w-auto px-4 py-2.5 bg-transparent border border-white/10 hover:bg-white/5 text-white/60 hover:text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Pass Turn
                    </button>
                    <button
                        onClick={onOpenBooking}
                        disabled={isReadOnly}
                        className={`w-full md:w-auto px-6 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2
                            ${isReadOnly
                                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                                : 'bg-white text-slate-900 hover:bg-slate-100'}`}
                    >
                        Book Dates <ArrowRight className="w-4 h-4" />
                    </button>
                </>
            }
        />;
    }

    // ============================================
    // 5. DONE FOR ROUND
    // ============================================
    if (isDoneForRound && lastAction?.type !== 'cancelled') {
        const isPassed = lastAction?.type === 'pass';
        const isSkipped = lastAction?.type === 'skipped';

        if (isPassed || isSkipped) {
            return <ModernTrailerWidget
                accentColor="slate"
                icon={isSkipped ? ArrowRight : XCircle}
                title={isSkipped ? "Turn Skipped" : "Passed Round"}
                subtitle="Wait for next round"
                mainContent={<div className="text-white/60">You opted out of this selection round.</div>}
            />;
        }

        const start = lastAction.from?.toDate ? lastAction.from.toDate() : new Date(lastAction.from);
        const end = lastAction.to?.toDate ? lastAction.to.toDate() : new Date(lastAction.to);
        const nights = differenceInDays(end, start);
        const isPaid = lastAction.isPaid;

        return <ModernTrailerWidget
            accentColor={isPaid ? "emerald" : "amber"}
            icon={Caravan}
            title="Booking Confirmed"
            subtitle={isPaid ? "Ready for Check-in" : "Payment Pending"}
            mainContent={
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                        <p className="text-xl font-bold text-white tracking-tight">
                            {format(start, 'MMM d')} - {format(end, 'MMM d')}
                        </p>
                        <p className="text-xs text-white/40 mt-1 uppercase tracking-wider font-medium">
                            {nights} Nights • Trailer Reserved
                        </p>
                    </div>
                    {!isPaid && (
                        <div className="mt-2 md:mt-0 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded text-amber-300 text-xs font-semibold flex items-center gap-2 w-fit">
                            <AlertTriangle className="w-3 h-3" /> Fee Outstanding
                        </div>
                    )}
                </div>
            }
            actions={
                <div className="flex gap-2 w-full md:w-auto">
                    {!isPaid && onEmail && (
                        <button
                            onClick={() => onEmail(lastAction)}
                            className="flex-1 md:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-bold transition-colors"
                        >
                            Email Info
                        </button>
                    )}
                    <button
                        onClick={() => onViewDetails(lastAction)}
                        className="flex-1 md:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white/70 hover:text-white border border-white/10 rounded-lg text-xs font-bold transition-colors"
                    >
                        View Details
                    </button>
                </div>
            }
        />;
    }

    // ============================================
    // 6. BOOKING CANCELLED
    // ============================================
    if (latestAction?.type === 'cancelled' && !isYourTurn) {
        return <ModernTrailerWidget
            accentColor="red"
            icon={XCircle}
            title="Cancelled"
            subtitle="Booking Removed"
            mainContent={<div className="text-white/60">Your previous booking was cancelled. Wait for next round.</div>}
            actions={
                <button
                    onClick={() => onViewDetails(latestAction)}
                    className="w-full md:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white/60 hover:text-white border border-white/10 rounded-lg text-xs font-bold transition-colors"
                >
                    Details
                </button>
            }
        />;
    }

    // ============================================
    // 7. WAITING IN LINE
    // ============================================
    const upcomingBooking = bookings
        .filter(b => normalizeName(b.shareholderName) === normalizedMe && b.isFinalized && b.type !== 'cancelled' && b.type !== 'pass')
        .sort((a, b) => b.createdAt - a.createdAt)[0];

    const isUpNext = queueInfo?.diff === 1;
    const roundLabel = queueInfo?.round === 1 ? 'Round 1' : 'Round 2';

    return <ModernTrailerWidget
        accentColor="indigo"
        icon={isUpNext ? Compass : Map}
        title={isUpNext ? "You are Next" : `In Line: #${getOrdinal(queueInfo?.diff || 0)}`}
        subtitle={`${roundLabel} Queue`}
        mainContent={
            <div className="flex items-center justify-between md:justify-start md:gap-8">
                <div>
                    <p className="text-xs text-indigo-200/60 uppercase tracking-widest font-bold mb-1">NOW PICKING</p>
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-400" />
                        <span className="text-lg font-bold text-white">
                            {status.activePicker || "Loading..."}
                        </span>
                    </div>
                </div>
                {status.windowEnds && (
                    <div className="md:border-l md:border-white/10 md:pl-8 text-right md:text-left">
                        <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-1">UNTIL</p>
                        <p className="text-lg text-white tabular-nums font-bold">
                            {format(new Date(status.windowEnds), 'h:mm a')}
                        </p>
                    </div>
                )}
            </div>
        }
        actions={
            <div className="flex gap-2 w-full md:w-auto">
                <button onClick={onOpenFeedback} className="flex-1 md:flex-none px-3 py-2 text-xs font-medium text-white/30 hover:text-indigo-300 transition-colors">
                    Feedback
                </button>
                {upcomingBooking && (
                    <button
                        onClick={() => onViewDetails(upcomingBooking)}
                        className="flex-1 md:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white/60 hover:text-white border border-white/10 rounded-lg text-xs font-bold transition-colors"
                    >
                        View Booking
                    </button>
                )}
            </div>
        }
    />;
}

// Helper
const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
