import React from 'react';
import { Caravan } from 'lucide-react';

/**
 * HeroBackground - Atmospheric hero background with GSAP-style ambient lighting.
 *
 * Layers (back to front):
 *   1. Perimeter glow - intense theme-colored ambient edge lighting
 *   2. Gradient orbs - soft floating color blobs (boosted intensity)
 *   3. Centered Caravan/Trailer - signature brand mark
 *
 * Pure CSS keyframes, GPU-accelerated, accessibility-aware.
 *
 * @param {string} color - Theme color key
 */

/* ── Color palettes for orbs (boosted opacity) ── */
const COLOR_MAP = {
    emerald: ['rgba(16,185,129,0.55)', 'rgba(52,211,153,0.45)', 'rgba(6,215,130,0.35)'],
    blue:    ['rgba(59,130,246,0.55)', 'rgba(96,165,250,0.45)', 'rgba(37,99,235,0.35)'],
    indigo:  ['rgba(99,102,241,0.55)', 'rgba(129,140,248,0.45)', 'rgba(79,70,229,0.35)'],
    amber:   ['rgba(245,158,11,0.55)', 'rgba(252,211,77,0.45)', 'rgba(217,119,6,0.35)'],
    slate:   ['rgba(148,163,184,0.45)', 'rgba(100,116,139,0.35)', 'rgba(71,85,105,0.28)'],
    rose:    ['rgba(244,63,94,0.55)', 'rgba(251,113,133,0.45)', 'rgba(225,29,72,0.35)'],
    violet:  ['rgba(139,92,246,0.55)', 'rgba(167,139,250,0.45)', 'rgba(124,58,237,0.35)'],
    red:     ['rgba(239,68,68,0.55)', 'rgba(252,165,165,0.45)', 'rgba(220,38,38,0.35)'],
};

/* ── Perimeter glow (intensified for GSAP-style ambient lighting) ── */
const GLOW_MAP = {
    emerald: 'rgba(16,185,129,0.25)',
    blue:    'rgba(59,130,246,0.25)',
    indigo:  'rgba(99,102,241,0.28)',
    amber:   'rgba(245,158,11,0.22)',
    slate:   'rgba(148,163,184,0.18)',
    rose:    'rgba(244,63,94,0.25)',
    violet:  'rgba(139,92,246,0.25)',
    red:     'rgba(239,68,68,0.25)',
};

/* ── Gradient orb configs (bigger, more dramatic) ── */
const ORB_CONFIGS = [
    { size: 380, top: '-18%', right: '-8%',  anim: 'heroOrb1', dur: '14s' },
    { size: 320, bottom: '-12%', left: '-6%', anim: 'heroOrb2', dur: '18s' },
    { size: 240, top: '35%', left: '45%',    anim: 'heroOrb3', dur: '22s' },
    { size: 200, top: '10%', left: '15%',    anim: 'heroOrb4', dur: '26s' },
    { size: 160, bottom: '5%', right: '20%', anim: 'heroOrb5', dur: '20s' },
];

/* ── All keyframes ── */
const KEYFRAMES = `
/* Gradient Orbs - dramatic movement */
@keyframes heroOrb1 {
    0%   { transform: translate(0, 0) scale(1); }
    25%  { transform: translate(-45px, 30px) scale(1.18); }
    50%  { transform: translate(20px, -20px) scale(0.88); }
    75%  { transform: translate(-30px, -40px) scale(1.12); }
    100% { transform: translate(0, 0) scale(1); }
}
@keyframes heroOrb2 {
    0%   { transform: translate(0, 0) scale(1); }
    30%  { transform: translate(50px, -30px) scale(1.15); }
    60%  { transform: translate(-30px, 40px) scale(0.85); }
    100% { transform: translate(0, 0) scale(1); }
}
@keyframes heroOrb3 {
    0%   { transform: translate(0, 0) scale(1); }
    20%  { transform: translate(30px, -50px) scale(1.2); }
    50%  { transform: translate(-50px, 20px) scale(0.82); }
    80%  { transform: translate(40px, 35px) scale(1.1); }
    100% { transform: translate(0, 0) scale(1); }
}
@keyframes heroOrb4 {
    0%   { transform: translate(0, 0) scale(1); }
    35%  { transform: translate(-25px, 35px) scale(1.1); }
    65%  { transform: translate(35px, -20px) scale(0.92); }
    100% { transform: translate(0, 0) scale(1); }
}
@keyframes heroOrb5 {
    0%   { transform: translate(0, 0) scale(1); }
    25%  { transform: translate(20px, -30px) scale(1.12); }
    50%  { transform: translate(-35px, 15px) scale(0.9); }
    75%  { transform: translate(15px, 25px) scale(1.08); }
    100% { transform: translate(0, 0) scale(1); }
}

/* Center Caravan - gentle float */
@keyframes caravanFloat {
    0%   { transform: translate(-50%, -50%) rotate(0deg) scale(1); }
    25%  { transform: translate(calc(-50% - 6px), calc(-50% + 8px)) rotate(2deg) scale(1.02); }
    50%  { transform: translate(calc(-50% + 4px), calc(-50% - 6px)) rotate(-1.5deg) scale(0.98); }
    75%  { transform: translate(calc(-50% - 4px), calc(-50% - 3px)) rotate(2.5deg) scale(1.01); }
    100% { transform: translate(-50%, -50%) rotate(0deg) scale(1); }
}

/* Perimeter glow - breathing pulse */
@keyframes perimeterPulse {
    0%   { opacity: 0.5; }
    50%  { opacity: 1; }
    100% { opacity: 0.5; }
}

/* Edge sweep - ambient light moving around the edges */
@keyframes edgeSweep {
    0%   { background-position: 0% 0%; }
    25%  { background-position: 100% 0%; }
    50%  { background-position: 100% 100%; }
    75%  { background-position: 0% 100%; }
    100% { background-position: 0% 0%; }
}

@media (prefers-reduced-motion: reduce) {
    .hero-orb, .hero-caravan-center, .hero-glow, .hero-edge-sweep { animation: none !important; }
    .hero-caravan-center { transform: translate(-50%, -50%) !important; }
}
`;

export function HeroBackground({ color = 'slate' }) {
    const orbColors = COLOR_MAP[color] || COLOR_MAP.slate;
    const glowColor = GLOW_MAP[color] || GLOW_MAP.slate;

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <style>{KEYFRAMES}</style>

            {/* ── LAYER 1: Perimeter Glow (intensified) ── */}
            <div
                className="hero-glow absolute inset-0"
                style={{
                    boxShadow: `
                        inset 0 0 100px 30px ${glowColor},
                        inset 0 0 200px 60px ${glowColor},
                        inset 0 0 300px 80px ${glowColor}
                    `,
                    animation: 'perimeterPulse 6s ease-in-out infinite',
                    willChange: 'opacity',
                }}
            />

            {/* ── LAYER 1b: Edge sweep - moving ambient light ── */}
            <div
                className="hero-edge-sweep absolute inset-0"
                style={{
                    background: `
                        radial-gradient(ellipse 60% 40% at var(--sweep-x, 50%) 0%, ${glowColor} 0%, transparent 70%),
                        radial-gradient(ellipse 40% 60% at 100% var(--sweep-y, 50%), ${glowColor} 0%, transparent 70%),
                        radial-gradient(ellipse 60% 40% at var(--sweep-x2, 30%) 100%, ${glowColor} 0%, transparent 70%),
                        radial-gradient(ellipse 40% 60% at 0% var(--sweep-y2, 30%), ${glowColor} 0%, transparent 70%)
                    `,
                    animation: 'perimeterPulse 10s ease-in-out 2s infinite',
                    opacity: 0.7,
                    willChange: 'opacity',
                }}
            />

            {/* ── LAYER 2: Gradient Orbs (bigger + more intense) ── */}
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
                            background: `radial-gradient(circle, ${orbColors[i % orbColors.length]} 0%, transparent 65%)`,
                            filter: 'blur(50px)',
                            animation: `${orb.anim} ${orb.dur} ease-in-out infinite`,
                            willChange: 'transform',
                        }}
                    />
                );
            })}

            {/* ── LAYER 3: Centered Caravan / Trailer ── */}
            <div
                className="hero-caravan-center absolute"
                style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    opacity: 0.15,
                    animation: 'caravanFloat 22s ease-in-out infinite',
                    willChange: 'transform',
                }}
            >
                <Caravan
                    className="text-white"
                    style={{ width: 260, height: 260 }}
                    strokeWidth={1.0}
                />
            </div>
        </div>
    );
}
