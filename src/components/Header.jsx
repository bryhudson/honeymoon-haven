import React from 'react';
import { Tent } from 'lucide-react';

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-2 font-bold text-xl text-primary">
                    <Tent className="h-6 w-6" />
                    <span>Honeymoon Haven Resort</span>
                </div>
                <nav className="flex items-center gap-6">
                    <a href="#" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                        Home
                    </a>
                    <a href="#details" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                        Details
                    </a>
                    <a
                        href="#book"
                        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    >
                        Book Now
                    </a>
                </nav>
            </div>
        </header>
    );
}
