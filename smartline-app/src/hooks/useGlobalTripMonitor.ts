import { useEffect, useRef } from 'react';
import { apiRequest } from '../services/backend';
import { realtimeClient } from '../services/realtimeClient';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';

/**
 * Global Trip Monitor Hook
 * This hook monitors a trip's status independently of screen navigation
 * It will work even if screens are transitioning or unmounting
 */
export const useGlobalTripMonitor = (tripId: string | null, enabled: boolean = true) => {
    const navigation = useNavigation<any>();
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const lastStatusRef = useRef<string>('');

    useEffect(() => {
        if (!tripId || !enabled) {
            console.log('[GlobalMonitor] Disabled or no tripId');
            return;
        }

        console.log('========================================');
        console.log(`[GlobalMonitor] 🚀 Starting monitor for trip: ${tripId}`);
        console.log('========================================');

        const handleStatusChange = (status: string) => {
            console.log(`[GlobalMonitor] 🎯 Handling status: ${status}`);

            switch (status) {
                case 'started':
                    console.log('[GlobalMonitor] ✅ Trip STARTED');
                    navigation.navigate('OnTrip', { tripId });
                    break;

                case 'completed':
                    console.log('[GlobalMonitor] 🏁 Trip COMPLETED');
                    navigation.navigate('TripComplete', { tripId });
                    break;

                case 'cancelled':
                    console.log('[GlobalMonitor] ❌ Trip CANCELLED');
                    Alert.alert('Trip Cancelled', 'The trip has been cancelled.');
                    navigation.reset({ index: 0, routes: [{ name: 'CustomerHome' }] });
                    break;
            }
        };

        let active = true;
        (async () => {
            try {
                const data = await apiRequest<{ trip: any }>(`/trips/${tripId}`);
                if (active && data.trip?.status) {
                    lastStatusRef.current = data.trip.status;
                }
            } catch {
                // ignore initial fetch errors
            }

            try {
                const unsubscribe = await realtimeClient.subscribe(
                    { channel: 'trip:status', tripId },
                    (payload) => {
                        const newStatus = payload?.new?.status;
                        if (!newStatus) return;

                        console.log(`[GlobalMonitor] 📡 Status changed: ${lastStatusRef.current} → ${newStatus}`);
                        if (newStatus !== lastStatusRef.current) {
                            lastStatusRef.current = newStatus;
                            handleStatusChange(newStatus);
                        }
                    }
                );

                if (active) {
                    unsubscribeRef.current = unsubscribe;
                } else {
                    unsubscribe();
                }
            } catch (err) {
                console.error('[GlobalMonitor] Realtime error:', err);
            }
        })();

        // Cleanup
        return () => {
            console.log('[GlobalMonitor] 🧹 Cleaning up...');
            active = false;
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
        };
    }, [tripId, enabled]);

    return {
        // Expose method to manually check status
        checkStatus: async () => {
            if (!tripId) return null;
            const data = await apiRequest<{ trip: any }>(`/trips/${tripId}`);
            return data.trip?.status ?? null;
        }
    };
};
