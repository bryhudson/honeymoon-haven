import React from 'react';

/**
 * HeroBackground - GSAP-inspired animated floating gradient orbs.
 * Pure CSS keyframes, zero dependencies, GPU-accelerated.
 *
 * @param {string} color - Theme color key (emerald, blue, indigo, amber, slate, rose, violet, red)
 */

const COLOR_MAP = {
    emerald: [
        'rgba(16, 185, 129, 0.45)',
        'rgba(52, 211, 153, 0.35)',
        'rgba(6, 215, 130, 0.3)',
        'rgba(16, 185, 129, 0.25)',
    ],
    blue: [
        'rgba(59, 130, 246, 0.45)',
        'rgba(96, 165, 250, 0.35)',
        'rgba(37, 99, 235, 0.3)',
        'rgba(59, 130, 246, 0.25)',
    ],
    indigo: [
        'rgba(99, 102, 241, 0.45)',
        'rgba(129, 140, 248, 0.35)',
        'rgba(79, 70, 229, 0.3)',
        'rgba(99, 102, 241, 0.25)',
    ],
    amber: [
        'rgba(245, 158, 11, 0.45)',
        'rgba(252, 211, 77, 0.35)',
        'rgba(217, 119, 6, 0.3)',
        'rgba(245, 158, 11, 0.25)',
    ],
    slate: [
        'rgba(148, 163, 184, 0.4)',
        'rgba(100, 116, 139, 0.3)',
        'rgba(71, 85, 105, 0.25)',
        'rgba(148, 163, 184, 0.2)',
    ],
    rose: [
        'rgba(244, 63, 94, 0.45)',
        'rgba(251, 113, 133, 0.35)',
        'rgba(225, 29, 72, 0.3)',
        'rgba(244, 63, 94, 0.25)',
    ],
    violet: [
        'rgba(139, 92, 246, 0.45)',
        'rgba(167, 139, 250, 0.35)',
        'rgba(124, 58, 237, 0.3)',
        'rgba(139, 92, 246, 0.25)',
    ],
    red: [
        'rgba(239, 68, 68, 0.45)',
        'rgba(252, 165, 165, 0.35)',
        'rgba(220, 38, 38, 0.3)',
        'rgba(239, 68, 68, 0.25)',
    ],
};

const ORB_CONFIGS = [
    { size: 350, top: '-20%', right: '-10%', animation: 'heroOrb1', duration: '14s' },
    { size: 280, bottom: '-15%', left: '-8%', animation: 'heroOrb2', duration: '18s' },
    { size: 220, top: '30%', left: '40%', animation: 'heroOrb3', duration: '20s' },
    { size: 160, top: '10%', left: '60%', animation: 'heroOrb4', duration: '12s' },
];

const KEYFRAMES = `
@keyframes heroOrb1 {
    0%   { transform: translate(0, 0) scale(1); }
    25%  { transform: translate(-40px, 30px) scale(1.15); }
    50%  { transform: translate(20px, -20px) scale(0.9); }
    75%  { transform: translate(-30px, -40px) scale(1.1); }
    100% { transform: translate(0, 0) scale(1); }
}
@keyframes heroOrb2 {
    0%   { transform: translate(0, 0) scale(1); }
    30%  { transform: translate(50px, -30px) scale(1.12); }
    60%  { transform: translate(-30px, 40px) scale(0.88); }
    100% { transform: translate(0, 0) scale(1); }
}
@keyframes heroOrb3 {
    0%   { transform: translate(0, 0) scale(1); }
    20%  { transform: translate(30px, -50px) scale(1.18); }
    50%  { transform: translate(-50px, 20px) scale(0.85); }
    80%  { transform: translate(40px, 40px) scale(1.08); }
    100% { transform: translate(0, 0) scale(1); }
}
@keyframes heroOrb4 {
    0%   { transform: translate(0, 0) scale(0.8); }
    33%  { transform: translate(-35px, 25px) scale(1.2); }
    66%  { transform: translate(30px, -35px) scale(0.9); }
    100% { transform: translate(0, 0) scale(0.8); }
}
@media (prefers-reduced-motion: reduce) {
    .hero-orb { animation: none !important; }
}
`;

export function HeroBackground({ color = 'slate' }) {
    const orbColors = COLOR_MAP[color] || COLOR_MAP.slate;

    return (
        <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            aria-hidden="true"
        >
            <style>{KEYFRAMES}</style>

            {ORB_CONFIGS.map((orb, i) => {
                const posStyle = {};
                if (orb.top !== undefined) posStyle.top = orb.top;
                if (orb.bottom !== undefined) posStyle.bottom = orb.bottom;
                if (orb.left !== undefined) posStyle.left = orb.left;
                if (orb.right !== undefined) posStyle.right = orb.right;

                return (
                    <div
                        key={i}
                        className="hero-orb absolute rounded-full"
                        style={{
                            width: orb.size,
                            height: orb.size,
                            ...posStyle,
                            background: `radial-gradient(circle, ${orbColors[i]} 0%, transparent 65%)`,
                            filter: 'blur(40px)',
                            animation: `${orb.animation} ${orb.duration} ease-in-out infinite`,
                            willChange: 'transform',
                        }}
                    />
                );
            })}
        </div>
    );
}
