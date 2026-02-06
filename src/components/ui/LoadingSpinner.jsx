import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-slate-500 font-medium animate-pulse">Loading Honeymoon Haven...</p>
        </div>
    );
}
