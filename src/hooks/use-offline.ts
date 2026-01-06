import { useState, useEffect, useCallback } from 'react';

export function useOfflineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const checkConnection = useCallback(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        try {
            // We verify connection by pinging the root with a timestamp to bypass cache.
            // mode: 'no-cors' ensures we don't fail on CORS (we just need successful network roundtrip).
            // This works even if the response is 404 or opaque, as long as it's not a network error.
            await fetch(window.location.origin + '/?_t=' + Date.now(), { 
                method: 'HEAD', 
                cache: 'no-store',
                mode: 'no-cors',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            setIsOnline(true);
            return true;
        } catch (e) {
            clearTimeout(timeoutId);
            console.warn('Connection check failed:', e);
            setIsOnline(false);
            return false;
        }
    }, []);

    useEffect(() => {
        function handleOnline() {
            setIsOnline(true);
            checkConnection();
        }
        function handleOffline() {
            setIsOnline(false);
        }

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Periodic check every 20 seconds to reconcile state
        const interval = setInterval(checkConnection, 20000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, [checkConnection]);

    return { isOnline, isOffline: !isOnline, checkConnection };
}
