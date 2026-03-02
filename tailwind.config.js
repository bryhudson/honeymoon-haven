/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "pulse-scale": {
                    "0%, 100%": { transform: "scale(1)" },
                    "50%": { transform: "scale(1.05)" },
                },
                wiggle: {
                    "0%, 100%": { transform: "rotate(-3deg)" },
                    "50%": { transform: "rotate(3deg)" },
                },
                "bounce-subtle": {
                    "0%, 100%": { transform: "translateY(-5%)" },
                    "50%": { transform: "translateY(0)" },
                },
                "drive": {
                    "0%, 100%": { transform: "translateY(0) rotate(0)" },
                    "25%": { transform: "translateY(-1px) rotate(-1deg)" },
                    "50%": { transform: "translateY(1px) rotate(1deg)" },
                    "75%": { transform: "translateY(-1px) rotate(0)" },
                },
            },
            animation: {
                "pulse-scale": "pulse-scale 2s ease-in-out infinite",
                wiggle: "wiggle 1s ease-in-out infinite",
                "bounce-subtle": "bounce-subtle 2s ease-in-out infinite",
                "spin-slow": "spin 3s linear infinite",
                "drive": "drive 1.2s ease-in-out infinite",
            },
        },
    },
    plugins: [],
}
