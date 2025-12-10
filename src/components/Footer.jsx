import React from 'react';

export function Footer() {
    return (
        <footer className="border-t bg-muted/40 py-6 md:py-0">
            <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row px-4">
                <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                    © 2024 Honeymoon Haven Resort. All rights reserved.
                </p>
                <div className="flex gap-4">
                    <a href="#" className="text-sm text-muted-foreground hover:underline">Terms</a>
                    <a href="#" className="text-sm text-muted-foreground hover:underline">Privacy</a>
                </div>
            </div>
        </footer>
    );
}
