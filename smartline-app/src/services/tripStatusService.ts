import { supabase } from '../lib/supabase';
import { NavigationContainerRef } from '@react-navigation/native';
import { Alert } from 'react-native';

/**
 * Global Trip Status Service
 * This service monitors trip status independently of React components
 * It will continue working even during screen transitions
 */
class TripStatusService {
    private static instance: TripStatusService;
    private navigationRef: NavigationContainerRef<any> | null = null;
    private activeTripId: string | null = null;
    private channel: any = null;
    private pollInterval: any = null;
    private lastStatus: string = '';

    private constructor() { }

    static getInstance(): TripStatusService {
        if (!TripStatusService.instance) {
            TripStatusService.instance = new TripStatusService();
        }
        return TripStatusService.instance;
    }

    setNavigationRef(ref: NavigationContainerRef<any>) {
        this.navigationRef = ref;
        console.log('[TripService] ✅ Navigation ref set');
    }

    startMonitoring(tripId: string) {
        if (this.activeTripId === tripId) {
            console.log(`[TripService] Already monitoring trip: ${tripId}`);
            return;
        }

        // Stop any existing monitoring
        this.stopMonitoring();

        this.activeTripId = tripId;
        console.log('========================================');
        console.log(`[TripService] 🚀 Starting monitoring for trip: ${tripId}`);
        console.log('========================================');

        // Setup Realtime listener
        this.channel = supabase
            .channel(`trip-service-${tripId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
                (payload) => {
                    const newStatus = payload.new.status;
                    console.log(`[TripService] 📡 Realtime: ${this.lastStatus} → ${newStatus}`);

                    if (newStatus !== this.lastStatus) {
                        this.lastStatus = newStatus;
                        this.handleStatusChange(newStatus);
                    }
                }
            )
            .subscribe((status, err) => {
                console.log(`[TripService] 🔌 Subscription: ${status}`);
                if (err) console.error(`[TripService] ❌ Error:`, err);
            });

        // Setup polling fallback (every 2 seconds)
        this.pollInterval = setInterval(async () => {
            try {
                const { data } = await supabase
                    .from('trips')
                    .select('status')
                    .eq('id', tripId)
                    .single();

                if (data && data.status !== this.lastStatus) {
                    console.log(`[TripService] 🔄 Poll: ${this.lastStatus} → ${data.status}`);
                    this.lastStatus = data.status;
                    this.handleStatusChange(data.status);
                }
            } catch (err) {
                console.error('[TripService] Poll error:', err);
            }
        }, 2000);
    }

    private handleStatusChange(status: string) {
        if (!this.navigationRef || !this.activeTripId) {
            console.log('[TripService] ⚠️ No navigation ref or trip ID');
            return;
        }

        console.log(`[TripService] 🎯 Handling status: ${status}`);

        switch (status) {
            case 'accepted':
                console.log('[TripService] ✅ Trip ACCEPTED');
                // Will be handled by SearchingDriverScreen
                break;

            case 'arrived':
                console.log('[TripService] 📍 Driver ARRIVED');
                // Will show alert in DriverFoundScreen
                break;

            case 'started':
                console.log('[TripService] 🚗 Trip STARTED');
                this.navigationRef.navigate('OnTrip', { tripId: this.activeTripId });
                break;

            case 'completed':
                console.log('[TripService] 🏁 Trip COMPLETED');
                this.navigationRef.navigate('TripComplete', { tripId: this.activeTripId });
                this.stopMonitoring(); // Stop monitoring after completion
                break;

            case 'cancelled':
                console.log('[TripService] ❌ Trip CANCELLED');
                Alert.alert('Trip Cancelled', 'The trip has been cancelled.');
                this.navigationRef.reset({ index: 0, routes: [{ name: 'CustomerHome' }] });
                this.stopMonitoring();
                break;
        }
    }

    stopMonitoring() {
        console.log('[TripService] 🧹 Stopping monitoring');

        if (this.channel) {
            supabase.removeChannel(this.channel);
            this.channel = null;
        }

        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }

        this.activeTripId = null;
        this.lastStatus = '';
    }

    isMonitoring(): boolean {
        return this.activeTripId !== null;
    }

    getCurrentTripId(): string | null {
        return this.activeTripId;
    }
}

export const tripStatusService = TripStatusService.getInstance();
