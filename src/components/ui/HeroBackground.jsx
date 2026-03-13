import React from 'react';
import { Caravan, Tent, Compass, Map, Coffee } from 'lucide-react';

/**
 * HeroBackground - GSAP-inspired layered animated hero background.
 *
 * Layers (back to front):
 *   1. Perimeter glow - ambient edge lighting
 *   2. Gradient orbs - soft floating color blobs
 *   3. Floating mini icons - travel-themed icons drifting independently
 *   4. Giant Caravan watermark - signature brand mark, slowly rotating
 *
 * Pure CSS keyframes, zero dependencies beyond lucide icons, GPU-accelerated.
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

/* ── Perimeter glow colors ── */
const GLOW_MAP = {
    emerald: 'rgba(16,185,129,0.15)',
    blue:    'rgba(59,130,246,0.15)',
    indigo:  'rgba(99,102,241,0.15)',
    amber:   'rgba(245,158,11,0.12)',
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

/* ── Floating mini-icon configs ── */
const MINI_ICONS = [
    { Icon: Tent,    size: 28, top: '18%', left: '72%', anim: 'miniFloat1', dur: '16s', delay: '0s' },
    { Icon: Compass, size: 22, top: '65%', left: '15%', anim: 'miniFloat2', dur: '20s', delay: '2s' },
    { Icon: Map,     size: 26, top: '12%', left: '30%', anim: 'miniFloat3', dur: '18s', delay: '4s' },
    { Icon: Coffee,  size: 20, top: '55%', left: '80%', anim: 'miniFloat4', dur: '14s', delay: '1s' },
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

/* Floating Mini Icons */
@keyframes miniFloat1 {
    0%   { transform: translate(0, 0) rotate(0deg); opacity: 0.10; }
    25%  { transform: translate(-20px, 15px) rotate(15deg); opacity: 0.18; }
    50%  { transform: translate(10px, -25px) rotate(-10deg); opacity: 0.12; }
    75%  { transform: translate(-15px, -10px) rotate(20deg); opacity: 0.16; }
    100% { transform: translate(0, 0) rotate(0deg); opacity: 0.10; }
}
@keyframes miniFloat2 {
    0%   { transform: translate(0, 0) rotate(0deg); opacity: 0.08; }
    30%  { transform: translate(25px, -20px) rotate(-20deg); opacity: 0.16; }
    60%  { transform: translate(-15px, 20px) rotate(15deg); opacity: 0.10; }
    100% { transform: translate(0, 0) rotate(0deg); opacity: 0.08; }
}
@keyframes miniFloat3 {
    0%   { transform: translate(0, 0) rotate(0deg); opacity: 0.12; }
    20%  { transform: translate(18px, 22px) rotate(25deg); opacity: 0.18; }
    50%  { transform: translate(-22px, -15px) rotate(-15deg); opacity: 0.08; }
    80%  { transform: translate(12px, -18px) rotate(10deg); opacity: 0.15; }
    100% { transform: translate(0, 0) rotate(0deg); opacity: 0.12; }
}
@keyframes miniFloat4 {
    0%   { transform: translate(0, 0) rotate(0deg); opacity: 0.10; }
    35%  { transform: translate(-18px, -15px) rotate(-18deg); opacity: 0.16; }
    70%  { transform: translate(20px, 12px) rotate(12deg); opacity: 0.08; }
    100% { transform: translate(0, 0) rotate(0deg); opacity: 0.10; }
}

/* Giant Caravan Watermark */
@keyframes caravanDrift {
    0%   { transform: translate(0, 0) rotate(0deg) scale(1); }
    25%  { transform: translate(-8px, 6px) rotate(3deg) scale(1.02); }
    50%  { transform: translate(4px, -8px) rotate(-2deg) scale(0.98); }
    75%  { transform: translate(-6px, -4px) rotate(4deg) scale(1.01); }
    100% { transform: translate(0, 0) rotate(0deg) scale(1); }
}

/* Perimeter pulse */
@keyframes perimeterPulse {
    0%   { opacity: 0.6; }
    50%  { opacity: 1; }
    100% { opacity: 0.6; }
}

@media (prefers-reduced-motion: reduce) {
    .hero-orb, .hero-mini-icon, .hero-caravan, .hero-glow { animation: none !important; }
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

            {/* ── LAYER 3: Floating Mini Travel Icons ── */}
            {MINI_ICONS.map(({ Icon, size, top, left, anim, dur, delay }, i) => (
                <div
                    key={`mini-${i}`}
                    className="hero-mini-icon absolute"
                    style={{
                        top,
                        left,
                        animation: `${anim} ${dur} ease-in-out ${delay} infinite`,
                        willChange: 'transform, opacity',
                    }}
                >
                    <Icon
                        style={{ width: size, height: size }}
                        className="text-white/[0.12]"
                        strokeWidth={1.2}
                    />
                </div>
            ))}

            {/* ── LAYER 4: Giant Caravan Watermark ── */}
            <div
                className="hero-caravan absolute"
                style={{
                    bottom: '-5%',
                    right: '-2%',
                    animation: 'caravanDrift 25s ease-in-out infinite',
                    willChange: 'transform',
                }}
            >
                <Caravan
                    className="text-white/[0.06]"
                    style={{ width: 340, height: 340 }}
                    strokeWidth={0.6}
                />
            </div>
        </div>
    );
}
