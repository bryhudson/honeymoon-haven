import React, { useEffect, useState } from 'react';
import { UpdateAvailableModal } from './UpdateAvailableModal';

export function VersionWatcher() {
    const [updateAvailable, setUpdateAvailable] = useState(false);

    useEffect(() => {
        const checkVersion = async () => {
            try {
                // Prevent caching by appending timestamp
                const res = await fetch(`/meta.json?t=${new Date().getTime()}`, {
                    cache: 'no-store'
                });
                
                if (!res.ok) return;
                const data = await res.json();
                
                // Compare with current runtime version injected by Vite
                if (data.version && data.version !== __APP_VERSION__) {
                    console.log(`Version mismatch: App is ${__APP_VERSION__}, Server is ${data.version}. Prompting update.`);
                    setUpdateAvailable(true);
                }
            } catch (err) {
                // Silent fail on network error
            }
        };

        // Check when user returns to tab
        const onFocus = () => checkVersion();
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') checkVersion();
        });

        // Check periodically every 10 minutes
        const interval = setInterval(checkVersion, 10 * 60 * 1000);

        // Initial check 5 seconds after boot (to avoid blocking render)
        const timeout = setTimeout(checkVersion, 5000);

        return () => {
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onFocus);
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, []);

    if (!updateAvailable) return null;

    return <UpdateAvailableModal onReload={() => window.location.reload(true)} />;
}
