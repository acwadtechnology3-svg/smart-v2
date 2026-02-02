import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';

/**
 * Global Trip Monitor Hook
 * This hook monitors a trip's status independently of screen navigation
 * It will work even if screens are transitioning or unmounting
 */
export const useGlobalTripMonitor = (tripId: string | null, enabled: boolean = true) => {
    const navigation = useNavigation<any>();
    const channelRef = useRef<any>(null);
    const pollIntervalRef = useRef<any>(null);
    const lastStatusRef = useRef<string>('');

    useEffect(() => {
        if (!tripId || !enabled) {
            console.log('[GlobalMonitor] Disabled or no tripId');
            return;
        }

        console.log('========================================');
        console.log(`[GlobalMonitor] 🚀 Starting monitor for trip: ${tripId}`);
        console.log('========================================');

        // Realtime Listener
        const channel = supabase
            .channel(`global-trip-monitor-${tripId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
                (payload) => {
                    const newStatus = payload.new.status;
                    console.log(`[GlobalMonitor] 📡 Status changed: ${lastStatusRef.current} → ${newStatus}`);

                    if (newStatus !== lastStatusRef.current) {
                        lastStatusRef.current = newStatus;
                        handleStatusChange(newStatus);
                    }
                }
            )
            .subscribe((status, err) => {
                console.log(`[GlobalMonitor] 🔌 Subscription: ${status}`);
                if (err) console.error(`[GlobalMonitor] ❌ Error:`, err);
            });

        channelRef.current = channel;

        // Polling Fallback - runs every 2 seconds
        const pollInterval = setInterval(async () => {
            try {
                const { data } = await supabase
                    .from('trips')
                    .select('status')
                    .eq('id', tripId)
                    .single();

                if (data && data.status !== lastStatusRef.current) {
                    console.log(`[GlobalMonitor] 🔄 Poll detected change: ${lastStatusRef.current} → ${data.status}`);
                    lastStatusRef.current = data.status;
                    handleStatusChange(data.status);
                }
            } catch (err) {
                console.error('[GlobalMonitor] Poll error:', err);
            }
        }, 2000);

        pollIntervalRef.current = pollInterval;

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

        // Cleanup
        return () => {
            console.log('[GlobalMonitor] 🧹 Cleaning up...');
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [tripId, enabled]);

    return {
        // Expose method to manually check status
        checkStatus: async () => {
            if (!tripId) return null;
            const { data } = await supabase
                .from('trips')
                .select('status')
                .eq('id', tripId)
                .single();
            return data?.status;
        }
    };
};
