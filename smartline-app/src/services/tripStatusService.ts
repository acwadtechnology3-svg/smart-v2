import { apiRequest } from './backend';
import { realtimeClient } from './realtimeClient';
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
    private unsubscribe: (() => void) | null = null;
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

        (async () => {
            try {
                const data = await apiRequest<{ trip: any }>(`/trips/${tripId}`);
                if (data.trip?.status) {
                    this.lastStatus = data.trip.status;
                }
            } catch {
                // ignore initial fetch errors
            }

            try {
                this.unsubscribe = await realtimeClient.subscribe(
                    { channel: 'trip:status', tripId },
                    (payload) => {
                        const newStatus = payload?.new?.status;
                        if (!newStatus) return;

                        console.log(`[TripService] 📡 Realtime: ${this.lastStatus} → ${newStatus}`);
                        if (newStatus !== this.lastStatus) {
                            this.lastStatus = newStatus;
                            this.handleStatusChange(newStatus);
                        }
                    }
                );
            } catch (err) {
                console.error('[TripService] Realtime error:', err);
            }
        })();
    }

    private handleStatusChange(status: string) {
        if (!this.navigationRef || !this.activeTripId) {
            console.log('[TripService] ⚠️ No navigation ref or trip ID');
            return;
        }

        console.log(`[TripService] 🎯 Handling status: ${status}`);

        switch (status) {
            case 'accepted':
                console.log('[TripService] ✅ Trip ACCEPTED - navigating to DriverFound');
                this.navigationRef.navigate('DriverFound', { tripId: this.activeTripId });
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

        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
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
