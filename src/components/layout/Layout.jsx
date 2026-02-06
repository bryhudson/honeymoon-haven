import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

export function Layout({ children }) {
    return (
        <div className="flex min-h-screen flex-col bg-background font-sans antialiased">
            <Header />
            <main className="flex-1 flex flex-col">{children}</main>
            <Footer />
        </div>
    );
}
