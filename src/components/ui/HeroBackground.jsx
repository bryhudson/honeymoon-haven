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

/* ── Perimeter glow (subtle ambient lighting) ── */
const GLOW_MAP = {
    emerald: 'rgba(16,185,129,0.10)',
    blue:    'rgba(59,130,246,0.10)',
    indigo:  'rgba(99,102,241,0.12)',
    amber:   'rgba(245,158,11,0.10)',
    slate:   'rgba(148,163,184,0.08)',
    rose:    'rgba(244,63,94,0.10)',
    violet:  'rgba(139,92,246,0.10)',
    red:     'rgba(239,68,68,0.10)',
};

/* ── Gradient orb configs - each with its own vibrant color (boosted) ── */
const ORB_CONFIGS = [
    { size: 400, top: '-15%', right: '-5%',  anim: 'heroOrb1', dur: '14s', color: 'rgba(6,182,212,0.45)' },     // teal/cyan
    { size: 340, bottom: '-10%', left: '-4%', anim: 'heroOrb2', dur: '18s', color: 'rgba(139,92,246,0.42)' },    // violet
    { size: 260, top: '30%', left: '42%',    anim: 'heroOrb3', dur: '22s', color: 'rgba(245,158,11,0.38)' },     // amber/gold
    { size: 220, top: '8%', left: '12%',     anim: 'heroOrb4', dur: '26s', color: 'rgba(244,63,94,0.38)' },      // rose/pink
    { size: 200, bottom: '3%', right: '15%', anim: 'heroOrb5', dur: '20s', color: 'rgba(56,189,248,0.40)' },     // sky blue
];

/* ── Cute Walking Puppy SVG ── */
function WalkingPuppy() {
    return (
        <svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 48, height: 36 }}>
            {/* Body */}
            <ellipse cx="30" cy="24" rx="16" ry="10" fill="rgba(255,255,255,0.85)" />
            {/* Head */}
            <circle cx="46" cy="18" r="8" fill="rgba(255,255,255,0.9)" />
            {/* Ear (floppy) */}
            <ellipse cx="50" cy="13" rx="4" ry="6" fill="rgba(255,255,255,0.7)"
                style={{ transformOrigin: '50px 10px', animation: 'puppyEarBounce 0.35s ease-in-out infinite' }} />
            {/* Eye */}
            <circle cx="49" cy="17" r="1.5" fill="rgba(30,41,59,0.9)" />
            {/* Eye shine */}
            <circle cx="49.8" cy="16.3" r="0.5" fill="white" />
            {/* Nose */}
            <ellipse cx="53" cy="19" rx="2" ry="1.5" fill="rgba(30,41,59,0.8)" />
            {/* Tongue (little pink) */}
            <ellipse cx="51" cy="23" rx="1.5" ry="2" fill="rgba(244,114,182,0.8)" />
            {/* Spots on body */}
            <circle cx="24" cy="21" r="3" fill="rgba(180,160,140,0.35)" />
            <circle cx="33" cy="26" r="2.5" fill="rgba(180,160,140,0.3)" />
            {/* Tail (wagging) */}
            <g style={{ transformOrigin: '14px 24px', animation: 'puppyTailWag 0.4s ease-in-out infinite' }}>
                <path d="M14 20 Q8 12, 6 14" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </g>
            {/* Front legs (alternate timing) */}
            <line x1="38" y1="32" x2="40" y2="42" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round"
                style={{ transformOrigin: '38px 32px', animation: 'puppyFrontLegs 0.3s ease-in-out infinite' }} />
            <line x1="34" y1="32" x2="32" y2="42" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round"
                style={{ transformOrigin: '34px 32px', animation: 'puppyBackLegs 0.3s ease-in-out infinite' }} />
            {/* Back legs (offset from front) */}
            <line x1="22" y1="32" x2="24" y2="42" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round"
                style={{ transformOrigin: '22px 32px', animation: 'puppyBackLegs 0.3s ease-in-out infinite' }} />
            <line x1="18" y1="32" x2="16" y2="42" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round"
                style={{ transformOrigin: '18px 32px', animation: 'puppyFrontLegs 0.3s ease-in-out infinite' }} />
            {/* Collar */}
            <path d="M42 22 Q46 26, 50 23" stroke="rgba(244,63,94,0.7)" strokeWidth="1.5" fill="none" />
            {/* Collar tag */}
            <circle cx="47" cy="25" r="1.2" fill="rgba(250,204,21,0.8)" />
        </svg>
    );
}

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

/* ── Puppy walk-across (GSAP-style cubic-bezier) ── */
/* 25s total cycle: 10s walk across, 15s off-screen pause */
@keyframes puppyWalkAcross {
    0%   { left: -60px; opacity: 0; }
    2%   { opacity: 0.6; }
    38%  { opacity: 0.6; }
    40%  { left: calc(100% + 60px); opacity: 0; }
    100% { left: calc(100% + 60px); opacity: 0; }
}

/* Puppy body bounce while walking */
@keyframes puppyBounce {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-3px); }
}

/* Front legs walking */
@keyframes puppyFrontLegs {
    0%   { transform: rotate(15deg); }
    50%  { transform: rotate(-15deg); }
    100% { transform: rotate(15deg); }
}

/* Back legs walking (offset) */
@keyframes puppyBackLegs {
    0%   { transform: rotate(-15deg); }
    50%  { transform: rotate(15deg); }
    100% { transform: rotate(-15deg); }
}

/* Tail wagging */
@keyframes puppyTailWag {
    0%   { transform: rotate(-20deg); }
    50%  { transform: rotate(20deg); }
    100% { transform: rotate(-20deg); }
}

/* Floppy ear bounce */
@keyframes puppyEarBounce {
    0%, 100% { transform: rotate(20deg) translateY(0); }
    50%      { transform: rotate(20deg) translateY(2px); }
}

@media (prefers-reduced-motion: reduce) {
    .hero-orb, .hero-caravan-center, .hero-glow, .hero-puppy-walker { animation: none !important; }
    .hero-caravan-center { transform: translate(-50%, -50%) !important; }
    .puppy-front-legs, .puppy-back-legs, .puppy-tail, .puppy-ear { animation: none !important; }
}
`;

export function HeroBackground({ color = 'slate' }) {
    const glowColor = GLOW_MAP[color] || GLOW_MAP.slate;

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <style>{KEYFRAMES}</style>

            {/* ── LAYER 1: Perimeter Glow (subtle) ── */}
            <div
                className="hero-glow absolute inset-0"
                style={{
                    boxShadow: `inset 0 0 80px 20px ${glowColor}`,
                    animation: 'perimeterPulse 8s ease-in-out infinite',
                    willChange: 'opacity',
                }}
            />

            {/* ── LAYER 2: Multicolor Gradient Orbs ── */}
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
                            background: `radial-gradient(circle, ${orb.color} 0%, transparent 65%)`,
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

            {/* ── LAYER 4: Walking Puppy ── */}
            <div
                className="hero-puppy-walker absolute"
                style={{
                    bottom: '12%',
                    left: '-60px',
                    animation: 'puppyWalkAcross 25s cubic-bezier(0.25, 0.1, 0.25, 1) infinite',
                    willChange: 'left, opacity',
                    zIndex: 5,
                }}
            >
                <div style={{ animation: 'puppyBounce 0.35s ease-in-out infinite' }}>
                    <WalkingPuppy />
                </div>
            </div>
        </div>
    );
}
