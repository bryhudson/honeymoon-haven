import React from 'react';

/**
 * HeroBackground - GSAP-inspired animated floating gradient orbs.
 * Pure CSS keyframes, zero dependencies, GPU-accelerated.
 *
 * @param {string} color - Theme color key (emerald, blue, indigo, amber, slate, rose, violet, red)
 */

const COLOR_MAP = {
    emerald: { primary: 'rgba(16, 185, 129, 0.25)', secondary: 'rgba(52, 211, 153, 0.15)', tertiary: 'rgba(6, 95, 70, 0.2)' },
    blue:    { primary: 'rgba(59, 130, 246, 0.25)', secondary: 'rgba(96, 165, 250, 0.15)', tertiary: 'rgba(29, 78, 216, 0.2)' },
    indigo:  { primary: 'rgba(99, 102, 241, 0.25)', secondary: 'rgba(129, 140, 248, 0.15)', tertiary: 'rgba(67, 56, 202, 0.2)' },
    amber:   { primary: 'rgba(245, 158, 11, 0.25)', secondary: 'rgba(252, 211, 77, 0.15)', tertiary: 'rgba(180, 83, 9, 0.2)' },
    slate:   { primary: 'rgba(100, 116, 139, 0.25)', secondary: 'rgba(148, 163, 184, 0.15)', tertiary: 'rgba(51, 65, 85, 0.2)' },
    rose:    { primary: 'rgba(244, 63, 94, 0.25)',  secondary: 'rgba(251, 113, 133, 0.15)', tertiary: 'rgba(159, 18, 57, 0.2)' },
    violet:  { primary: 'rgba(139, 92, 246, 0.25)', secondary: 'rgba(167, 139, 250, 0.15)', tertiary: 'rgba(109, 40, 217, 0.2)' },
    red:     { primary: 'rgba(239, 68, 68, 0.25)',  secondary: 'rgba(252, 165, 165, 0.15)', tertiary: 'rgba(185, 28, 28, 0.2)' },
};

// Each orb config: size, position offset, animation name, duration, delay
const ORB_CONFIGS = [
    { size: 320, top: '-15%', left: '-10%', animation: 'heroFloat1', duration: '18s', delay: '0s' },
    { size: 260, top: '60%',  left: '70%',  animation: 'heroFloat2', duration: '22s', delay: '-4s' },
    { size: 200, top: '20%',  left: '50%',  animation: 'heroFloat3', duration: '25s', delay: '-8s' },
    { size: 180, top: '70%',  left: '15%',  animation: 'heroFloat4', duration: '20s', delay: '-12s' },
];

export function HeroBackground({ color = 'slate' }) {
    const colors = COLOR_MAP[color] || COLOR_MAP.slate;

    return (
        <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            aria-hidden="true"
        >
            <style>{`
                @keyframes heroFloat1 {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.18; }
                    25% { transform: translate(60px, 40px) scale(1.1); opacity: 0.25; }
                    50% { transform: translate(30px, -30px) scale(0.95); opacity: 0.12; }
                    75% { transform: translate(-40px, 20px) scale(1.05); opacity: 0.22; }
                }
                @keyframes heroFloat2 {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; }
                    30% { transform: translate(-50px, -40px) scale(1.08); opacity: 0.22; }
                    60% { transform: translate(40px, 30px) scale(0.92); opacity: 0.1; }
                    85% { transform: translate(-20px, -50px) scale(1.04); opacity: 0.2; }
                }
                @keyframes heroFloat3 {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.12; }
                    20% { transform: translate(35px, -45px) scale(1.12); opacity: 0.2; }
                    45% { transform: translate(-45px, 25px) scale(0.9); opacity: 0.08; }
                    70% { transform: translate(25px, 50px) scale(1.06); opacity: 0.18; }
                }
                @keyframes heroFloat4 {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.14; }
                    35% { transform: translate(45px, -25px) scale(1.1); opacity: 0.22; }
                    65% { transform: translate(-35px, -40px) scale(0.94); opacity: 0.1; }
                    90% { transform: translate(20px, 35px) scale(1.02); opacity: 0.18; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .hero-orb { animation: none !important; }
                }
            `}</style>

            {ORB_CONFIGS.map((orb, i) => {
                const orbColors = [colors.primary, colors.secondary, colors.tertiary, colors.primary];
                return (
                    <div
                        key={i}
                        className="hero-orb absolute rounded-full"
                        style={{
                            width: orb.size,
                            height: orb.size,
                            top: orb.top,
                            left: orb.left,
                            background: `radial-gradient(circle, ${orbColors[i]} 0%, transparent 70%)`,
                            filter: 'blur(60px)',
                            animation: `${orb.animation} ${orb.duration} ease-in-out infinite`,
                            animationDelay: orb.delay,
                            willChange: 'transform, opacity',
                        }}
                    />
                );
            })}
        </div>
    );
}
