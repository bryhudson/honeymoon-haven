import React from 'react';
import { Caravan } from 'lucide-react';

/**
 * HeroBackground - Atmospheric hero background with ambient lighting and fireworks.
 *
 * Layers (back to front):
 *   1. Perimeter glow - intense theme-colored ambient edge lighting
 *   2. Gradient orbs - soft floating color blobs (boosted intensity)
 *   3. Centered Caravan/Trailer - signature brand mark
 *   4. Fireworks canvas - periodic celebratory firework bursts
 *
 * Pure CSS keyframes + canvas fireworks, GPU-accelerated, accessibility-aware.
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

/* ── Firework color palettes per theme ── */
const FIREWORK_COLORS = {
    emerald: ['#34d399', '#6ee7b7', '#a7f3d0', '#10b981', '#ffffff'],
    blue:    ['#60a5fa', '#93c5fd', '#bfdbfe', '#3b82f6', '#ffffff'],
    indigo:  ['#818cf8', '#a5b4fc', '#c7d2fe', '#6366f1', '#ffffff'],
    amber:   ['#fbbf24', '#fcd34d', '#fde68a', '#f59e0b', '#ffffff'],
    slate:   ['#94a3b8', '#cbd5e1', '#e2e8f0', '#64748b', '#ffffff'],
    rose:    ['#fb7185', '#fda4af', '#fecdd3', '#f43f5e', '#ffffff'],
    violet:  ['#a78bfa', '#c4b5fd', '#ddd6fe', '#8b5cf6', '#ffffff'],
    red:     ['#f87171', '#fca5a5', '#fecaca', '#ef4444', '#ffffff'],
};

/* ── Gradient orb configs - each with its own vibrant color (boosted) ── */
const ORB_CONFIGS = [
    { size: 400, top: '-15%', right: '-5%',  anim: 'heroOrb1', dur: '14s', color: 'rgba(6,182,212,0.45)' },
    { size: 340, bottom: '-10%', left: '-4%', anim: 'heroOrb2', dur: '18s', color: 'rgba(139,92,246,0.42)' },
    { size: 260, top: '30%', left: '42%',    anim: 'heroOrb3', dur: '22s', color: 'rgba(245,158,11,0.38)' },
    { size: 220, top: '8%', left: '12%',     anim: 'heroOrb4', dur: '26s', color: 'rgba(244,63,94,0.38)' },
    { size: 200, bottom: '3%', right: '15%', anim: 'heroOrb5', dur: '20s', color: 'rgba(56,189,248,0.40)' },
];

/* ── Fireworks Canvas Component ── */
function FireworksCanvas({ colors }) {
    const canvasRef = React.useRef(null);
    const animRef = React.useRef(null);
    const particlesRef = React.useRef([]);
    const rocketsRef = React.useRef([]);
    const lastLaunchRef = React.useRef(0);

    // Check for reduced motion preference
    const prefersReducedMotion = React.useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }, []);

    React.useEffect(() => {
        if (prefersReducedMotion) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        };
        resize();
        window.addEventListener('resize', resize);

        const palette = colors || FIREWORK_COLORS.slate;

        function createParticle(x, y, color) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1.5;
            return {
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                decay: Math.random() * 0.015 + 0.012,
                color,
                size: Math.random() * 2.5 + 1,
                trail: [],
            };
        }

        function createRocket(canvasW, canvasH) {
            const x = canvasW * (0.15 + Math.random() * 0.7);
            const targetY = canvasH * (0.15 + Math.random() * 0.35);
            return {
                x,
                y: canvasH + 10,
                targetY,
                vy: -(Math.random() * 3 + 4),
                alpha: 1,
                color: palette[Math.floor(Math.random() * (palette.length - 1))],
                exploded: false,
            };
        }

        function explode(rocket) {
            const count = 30 + Math.floor(Math.random() * 25);
            const particles = particlesRef.current;
            for (let i = 0; i < count; i++) {
                const color = palette[Math.floor(Math.random() * palette.length)];
                particles.push(createParticle(rocket.x, rocket.y, color));
            }
        }

        function animate(timestamp) {
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            // Launch new rockets periodically (every 3-4 seconds, 1-2 at a time)
            if (timestamp - lastLaunchRef.current > 3000 + Math.random() * 1500) {
                lastLaunchRef.current = timestamp;
                const count = Math.random() > 0.6 ? 2 : 1;
                for (let i = 0; i < count; i++) {
                    rocketsRef.current.push(createRocket(w, h));
                }
            }

            // Update rockets
            const rockets = rocketsRef.current;
            for (let i = rockets.length - 1; i >= 0; i--) {
                const r = rockets[i];
                r.y += r.vy;

                // Draw rocket trail
                ctx.beginPath();
                ctx.arc(r.x, r.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = r.color;
                ctx.globalAlpha = 0.8;
                ctx.fill();

                // Small trailing glow
                ctx.beginPath();
                ctx.arc(r.x, r.y + 6, 1.5, 0, Math.PI * 2);
                ctx.fillStyle = '#fef3c7';
                ctx.globalAlpha = 0.5;
                ctx.fill();

                if (r.y <= r.targetY) {
                    explode(r);
                    rockets.splice(i, 1);
                }
            }

            // Update particles
            const particles = particlesRef.current;
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.trail.push({ x: p.x, y: p.y, alpha: p.alpha });
                if (p.trail.length > 5) p.trail.shift();

                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.04; // gravity
                p.vx *= 0.99; // drag
                p.alpha -= p.decay;

                if (p.alpha <= 0) {
                    particles.splice(i, 1);
                    continue;
                }

                // Draw trail
                for (let t = 0; t < p.trail.length; t++) {
                    const tp = p.trail[t];
                    ctx.beginPath();
                    ctx.arc(tp.x, tp.y, p.size * 0.5, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = tp.alpha * 0.3 * (t / p.trail.length);
                    ctx.fill();
                }

                // Draw particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.fill();
            }

            ctx.globalAlpha = 1;
            animRef.current = requestAnimationFrame(animate);
        }

        // Initial launch after a short delay
        setTimeout(() => {
            rocketsRef.current.push(createRocket(canvas.width, canvas.height));
            if (Math.random() > 0.5) {
                rocketsRef.current.push(createRocket(canvas.width, canvas.height));
            }
        }, 800);

        animRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener('resize', resize);
            particlesRef.current = [];
            rocketsRef.current = [];
        };
    }, [colors, prefersReducedMotion]);

    if (prefersReducedMotion) return null;

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ zIndex: 5, opacity: 0.7, pointerEvents: 'none' }}
        />
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

@media (prefers-reduced-motion: reduce) {
    .hero-orb, .hero-caravan-center, .hero-glow { animation: none !important; }
    .hero-caravan-center { transform: translate(-50%, -50%) !important; }
}
`;

export function HeroBackground({ color = 'slate' }) {
    const glowColor = GLOW_MAP[color] || GLOW_MAP.slate;
    const fireworkColors = FIREWORK_COLORS[color] || FIREWORK_COLORS.slate;

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

            {/* ── LAYER 4: Fireworks Canvas ── */}
            <FireworksCanvas colors={fireworkColors} />
        </div>
    );
}
