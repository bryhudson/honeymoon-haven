import React from 'react';
import { Caravan, Sailboat, Flame, Beer, Fish, Sun, Waves, Mountain, Anchor, Target, Bath } from 'lucide-react';

/**
 * HeroBackground - "Lakeside Memories" animated hero background.
 *
 * Layers (back to front):
 *   1. Perimeter glow - ambient edge lighting
 *   2. Gradient orbs - soft floating color blobs
 *   3. Floating lakeside icons - themed icons drifting independently
 *   4. Centered Caravan/Trailer - signature brand mark
 *
 * Pure CSS keyframes, GPU-accelerated, accessibility-aware.
 *
 * @param {string} color - Theme color key
 */

/* ── Color palettes for orbs ── */
const COLOR_MAP = {
    emerald: ['rgba(16,185,129,0.4)', 'rgba(52,211,153,0.3)', 'rgba(6,215,130,0.25)'],
    blue:    ['rgba(59,130,246,0.4)', 'rgba(96,165,250,0.3)', 'rgba(37,99,235,0.25)'],
    indigo:  ['rgba(99,102,241,0.4)', 'rgba(129,140,248,0.3)', 'rgba(79,70,229,0.25)'],
    amber:   ['rgba(245,158,11,0.4)', 'rgba(252,211,77,0.3)', 'rgba(217,119,6,0.25)'],
    slate:   ['rgba(148,163,184,0.35)', 'rgba(100,116,139,0.25)', 'rgba(71,85,105,0.2)'],
    rose:    ['rgba(244,63,94,0.4)', 'rgba(251,113,133,0.3)', 'rgba(225,29,72,0.25)'],
    violet:  ['rgba(139,92,246,0.4)', 'rgba(167,139,250,0.3)', 'rgba(124,58,237,0.25)'],
    red:     ['rgba(239,68,68,0.4)', 'rgba(252,165,165,0.3)', 'rgba(220,38,38,0.25)'],
};

/* ── Perimeter glow ── */
const GLOW_MAP = {
    emerald: 'rgba(16,185,129,0.15)',
    blue:    'rgba(59,130,246,0.15)',
    indigo:  'rgba(99,102,241,0.18)',
    amber:   'rgba(245,158,11,0.14)',
    slate:   'rgba(148,163,184,0.1)',
    rose:    'rgba(244,63,94,0.15)',
    violet:  'rgba(139,92,246,0.15)',
    red:     'rgba(239,68,68,0.15)',
};

/* ── Gradient orb configs ── */
const ORB_CONFIGS = [
    { size: 300, top: '-18%', right: '-8%',  anim: 'heroOrb1', dur: '14s' },
    { size: 240, bottom: '-12%', left: '-6%', anim: 'heroOrb2', dur: '18s' },
    { size: 180, top: '35%', left: '45%',    anim: 'heroOrb3', dur: '22s' },
];

/* ── Floating lakeside icons - scattered around the hero ── */
const LAKESIDE_ICONS = [
    { Icon: Sailboat,  size: 44, top: '12%', left: '70%', anim: 'lakeFloat1', dur: '18s', delay: '0s' },
    { Icon: Flame,     size: 40, top: '60%', left: '8%',  anim: 'lakeFloat2', dur: '15s', delay: '1s' },
    { Icon: Beer,      size: 38, top: '18%', left: '25%', anim: 'lakeFloat3', dur: '20s', delay: '3s' },
    { Icon: Fish,      size: 42, top: '55%', left: '82%', anim: 'lakeFloat4', dur: '16s', delay: '2s' },
    { Icon: Sun,       size: 44, top: '8%',  left: '88%', anim: 'lakeFloat5', dur: '22s', delay: '0s' },
    { Icon: Waves,     size: 40, top: '72%', left: '45%', anim: 'lakeFloat6', dur: '17s', delay: '4s' },
    { Icon: Mountain,  size: 44, top: '10%', left: '48%', anim: 'lakeFloat7', dur: '24s', delay: '1s' },
    { Icon: Anchor,    size: 38, top: '65%', left: '28%', anim: 'lakeFloat8', dur: '19s', delay: '2s' },
    { Icon: Target,    size: 42, top: '40%', left: '90%', anim: 'lakeFloat9', dur: '21s', delay: '3s' },
    { Icon: Bath,      size: 44, top: '35%', left: '5%',  anim: 'lakeFloat11', dur: '19s', delay: '2s' },
];

/* ── All keyframes ── */
const KEYFRAMES = `
/* Gradient Orbs */
@keyframes heroOrb1 {
    0%   { transform: translate(0, 0) scale(1); }
    25%  { transform: translate(-35px, 25px) scale(1.12); }
    50%  { transform: translate(15px, -15px) scale(0.92); }
    75%  { transform: translate(-25px, -35px) scale(1.08); }
    100% { transform: translate(0, 0) scale(1); }
}
@keyframes heroOrb2 {
    0%   { transform: translate(0, 0) scale(1); }
    30%  { transform: translate(40px, -25px) scale(1.1); }
    60%  { transform: translate(-25px, 35px) scale(0.9); }
    100% { transform: translate(0, 0) scale(1); }
}
@keyframes heroOrb3 {
    0%   { transform: translate(0, 0) scale(1); }
    20%  { transform: translate(25px, -40px) scale(1.15); }
    50%  { transform: translate(-40px, 15px) scale(0.88); }
    80%  { transform: translate(35px, 30px) scale(1.05); }
    100% { transform: translate(0, 0) scale(1); }
}

/* Lakeside Floating Icons - 8 unique paths */
@keyframes lakeFloat1 {
    0%   { transform: translate(0, 0) rotate(0deg); opacity: 0.18; }
    25%  { transform: translate(-20px, 12px) rotate(12deg); opacity: 0.28; }
    50%  { transform: translate(15px, -18px) rotate(-8deg); opacity: 0.20; }
    75%  { transform: translate(-10px, -8px) rotate(15deg); opacity: 0.26; }
    100% { transform: translate(0, 0) rotate(0deg); opacity: 0.18; }
}
@keyframes lakeFloat2 {
    0%   { transform: translate(0, 0) rotate(0deg); opacity: 0.22; }
    30%  { transform: translate(25px, -15px) rotate(-15deg); opacity: 0.30; }
    60%  { transform: translate(-12px, 20px) rotate(10deg); opacity: 0.18; }
    100% { transform: translate(0, 0) rotate(0deg); opacity: 0.22; }
}
@keyframes lakeFloat3 {
    0%   { transform: translate(0, 0) rotate(0deg); opacity: 0.20; }
    20%  { transform: translate(18px, 22px) rotate(20deg); opacity: 0.28; }
    50%  { transform: translate(-22px, -12px) rotate(-12deg); opacity: 0.16; }
    80%  { transform: translate(10px, -16px) rotate(8deg); opacity: 0.25; }
    100% { transform: translate(0, 0) rotate(0deg); opacity: 0.20; }
}
@keyframes lakeFloat4 {
    0%   { transform: translate(0, 0) rotate(0deg); opacity: 0.16; }
    35%  { transform: translate(-18px, -12px) rotate(-18deg); opacity: 0.26; }
    70%  { transform: translate(22px, 10px) rotate(12deg); opacity: 0.18; }
    100% { transform: translate(0, 0) rotate(0deg); opacity: 0.16; }
}
@keyframes lakeFloat5 {
    0%   { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 0.22; }
    25%  { transform: translate(-8px, 10px) rotate(8deg) scale(1.08); opacity: 0.30; }
    50%  { transform: translate(12px, -6px) rotate(-5deg) scale(0.95); opacity: 0.20; }
    75%  { transform: translate(-6px, -12px) rotate(10deg) scale(1.05); opacity: 0.28; }
    100% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 0.22; }
}
@keyframes lakeFloat6 {
    0%   { transform: translate(0, 0) rotate(0deg); opacity: 0.18; }
    25%  { transform: translate(30px, 5px) rotate(5deg); opacity: 0.25; }
    50%  { transform: translate(-10px, -8px) rotate(-8deg); opacity: 0.15; }
    75%  { transform: translate(20px, -5px) rotate(3deg); opacity: 0.22; }
    100% { transform: translate(0, 0) rotate(0deg); opacity: 0.18; }
}
@keyframes lakeFloat7 {
    0%   { transform: translate(0, 0) rotate(0deg); opacity: 0.15; }
    30%  { transform: translate(-15px, 18px) rotate(10deg); opacity: 0.24; }
    60%  { transform: translate(20px, -10px) rotate(-6deg); opacity: 0.18; }
    100% { transform: translate(0, 0) rotate(0deg); opacity: 0.15; }
}
@keyframes lakeFloat8 {
    0%   { transform: translate(0, 0) rotate(0deg); opacity: 0.20; }
    40%  { transform: translate(15px, 15px) rotate(15deg); opacity: 0.28; }
    70%  { transform: translate(-20px, -8px) rotate(-10deg); opacity: 0.16; }
    100% { transform: translate(0, 0) rotate(0deg); opacity: 0.20; }
}
@keyframes lakeFloat9 {
    0%   { transform: translate(0, 0) rotate(0deg); opacity: 0.18; }
    30%  { transform: translate(-15px, 20px) rotate(22deg); opacity: 0.28; }
    55%  { transform: translate(20px, -10px) rotate(-10deg); opacity: 0.20; }
    80%  { transform: translate(-8px, -15px) rotate(15deg); opacity: 0.26; }
    100% { transform: translate(0, 0) rotate(0deg); opacity: 0.18; }
}
@keyframes lakeFloat10 {
    0%   { transform: translate(0, 0) rotate(0deg); opacity: 0.20; }
    25%  { transform: translate(18px, -12px) rotate(-15deg); opacity: 0.30; }
    60%  { transform: translate(-14px, 18px) rotate(12deg); opacity: 0.18; }
    100% { transform: translate(0, 0) rotate(0deg); opacity: 0.20; }
}
@keyframes lakeFloat11 {
    0%   { transform: translate(0, 0) rotate(0deg); opacity: 0.22; }
    35%  { transform: translate(12px, 15px) rotate(10deg); opacity: 0.30; }
    65%  { transform: translate(-18px, -8px) rotate(-8deg); opacity: 0.18; }
    100% { transform: translate(0, 0) rotate(0deg); opacity: 0.22; }
}

/* Center Caravan - gentle float */
@keyframes caravanFloat {
    0%   { transform: translate(-50%, -50%) rotate(0deg) scale(1); }
    25%  { transform: translate(calc(-50% - 6px), calc(-50% + 8px)) rotate(2deg) scale(1.02); }
    50%  { transform: translate(calc(-50% + 4px), calc(-50% - 6px)) rotate(-1.5deg) scale(0.98); }
    75%  { transform: translate(calc(-50% - 4px), calc(-50% - 3px)) rotate(2.5deg) scale(1.01); }
    100% { transform: translate(-50%, -50%) rotate(0deg) scale(1); }
}

/* Perimeter pulse */
@keyframes perimeterPulse {
    0%   { opacity: 0.6; }
    50%  { opacity: 1; }
    100% { opacity: 0.6; }
}

@media (prefers-reduced-motion: reduce) {
    .hero-orb, .hero-lake-icon, .hero-caravan-center, .hero-glow { animation: none !important; }
    .hero-caravan-center { transform: translate(-50%, -50%) !important; }
}
`;

export function HeroBackground({ color = 'slate' }) {
    const orbColors = COLOR_MAP[color] || COLOR_MAP.slate;
    const glowColor = GLOW_MAP[color] || GLOW_MAP.slate;

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <style>{KEYFRAMES}</style>

            {/* ── LAYER 1: Perimeter Glow ── */}
            <div
                className="hero-glow absolute inset-0"
                style={{
                    boxShadow: `inset 0 0 80px 20px ${glowColor}, inset 0 0 120px 40px ${glowColor}`,
                    animation: 'perimeterPulse 8s ease-in-out infinite',
                    willChange: 'opacity',
                }}
            />

            {/* ── LAYER 2: Gradient Orbs ── */}
            {ORB_CONFIGS.map((orb, i) => {
                const pos = {};
                if (orb.top) pos.top = orb.top;
                if (orb.bottom) pos.bottom = orb.bottom;
                if (orb.left) pos.left = orb.left;
                if (orb.right) pos.right = orb.right;

                return (
                    <div
                        key={`orb-${i}`}
                        className="hero-orb absolute rounded-full"
                        style={{
                            width: orb.size,
                            height: orb.size,
                            ...pos,
                            background: `radial-gradient(circle, ${orbColors[i]} 0%, transparent 65%)`,
                            filter: 'blur(40px)',
                            animation: `${orb.anim} ${orb.dur} ease-in-out infinite`,
                            willChange: 'transform',
                        }}
                    />
                );
            })}

            {/* ── LAYER 3: Floating Lakeside Icons ── */}
            {LAKESIDE_ICONS.map(({ Icon, size, top, left, anim, dur, delay }, i) => (
                <div
                    key={`lake-${i}`}
                    className="hero-lake-icon absolute"
                    style={{
                        top,
                        left,
                        animation: `${anim} ${dur} ease-in-out ${delay} infinite`,
                        willChange: 'transform, opacity',
                    }}
                >
                    <Icon
                        style={{ width: size, height: size }}
                        className="text-white/[0.35]"
                        strokeWidth={1.8}
                    />
                </div>
            ))}

            {/* ── LAYER 4: Centered Caravan / Trailer ── */}
            <div
                className="hero-caravan-center absolute"
                style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    animation: 'caravanFloat 22s ease-in-out infinite',
                    willChange: 'transform',
                }}
            >
                <Caravan
                    className="text-white/[0.15]"
                    style={{ width: 260, height: 260 }}
                    strokeWidth={1.0}
                />
            </div>
        </div>
    );
}
