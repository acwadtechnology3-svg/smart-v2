import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, ActivityIndicator, Image, AppState } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';
import { Phone, MessageSquare, MapPin, Navigation, ArrowRight, CheckCircle2, XCircle } from 'lucide-react-native';
import MapView, { UrlTile, Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { getDirections } from '../../services/mapService';

const { width, height } = Dimensions.get('window');
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1Ijoic2FsYWhlenphdDEyMCIsImEiOiJjbWwyem4xMHIwaGFjM2NzYmhtNDNobmZvIn0.Q5Tm9dtAgsgsI84y4KWTUg';

export default function DriverActiveTripScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RootStackParamList, 'DriverActiveTrip'>>();
    const { tripId } = route.params;

    const [trip, setTrip] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [driverLoc, setDriverLoc] = useState<any>(null);
    const [routeCoords, setRouteCoords] = useState<any[]>([]);
    const mapRef = useRef<MapView>(null);

    // 1. Fetch Trip Details & Subscriptions
    useEffect(() => {
        // Initial Fetch
        fetchTrip();
        startLocationTracking();

        // Handle App State Changes (Background -> Foreground)
        const appStateSub = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                console.log("App foregrounded, checking trip status...");
                handleCheckStatus();
            }
        });

        // Realtime listener
        const channel = supabase.channel(`trip-active-${tripId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` }, (payload) => {
                const newTrip = payload.new;
                console.log("Realtime update:", newTrip.status);
                setTrip(newTrip);
            })
            .subscribe();

        // Aggressive Polling (Every 1000ms)
        const interval = setInterval(() => {
            handleCheckStatus();
        }, 1000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
            appStateSub.remove();
        };
    }, [tripId]);

    // 2. Monitor Status Cancellation (Side Effect)
    useEffect(() => {
        if (trip?.status === 'cancelled') {
            // AUTOMATIC NAVIGATION: Don't wait for user
            if (navigation.canGoBack()) {
                navigation.popToTop();
            } else {
                navigation.navigate('DriverHome' as any);
            }

            // Show Alert informing them of the auto-action
            // Adding a slight delay prevents it from being swallowed if the screen unmounts instantly effectively
            setTimeout(() => {
                Alert.alert("Trip Cancelled", "The passenger has cancelled this trip. You have been returned to the home screen.");
            }, 500);
        }
    }, [trip?.status]);

    const handleCheckStatus = async () => {
        try {
            const { data, error } = await supabase
                .from('trips')
                .select('status')
                .eq('id', tripId)
                .single();

            if (data) {
                // Only update if status changed to avoid re-renders
                setTrip((prev: any) => {
                    if (prev && prev.status !== data.status) {
                        console.log("Polling updated status to:", data.status);
                        return { ...prev, status: data.status };
                    }
                    return prev;
                });
            }
        } catch (err) {
            console.log("Polling error:", err);
        }
    };

    const fetchTrip = async () => {
        try {
            const { data, error } = await supabase
                .from('trips')
                .select('*, customer:customer_id(full_name, phone)')
                .eq('id', tripId)
                .single();

            if (error) throw error;
            setTrip(data);
            setLoading(false);
        } catch (error: any) {
            console.error("Fetch Trip Error", error);
            Alert.alert("Error", "Could not load trip details.");
            navigation.goBack();
        }
    };

    const startLocationTracking = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const loc = await Location.getCurrentPositionAsync({});
        setDriverLoc(loc.coords);
    };

    // Calculate directions based on trip status
    useEffect(() => {
        if (!trip || !driverLoc) return;

        const getRoute = async () => {
            let destination: [number, number];
            if (trip.status === 'accepted' || trip.status === 'arrived') {
                // Navigate to Pickup
                destination = [trip.pickup_lng, trip.pickup_lat];
            } else {
                // Navigate to Destination
                destination = [trip.dest_lng, trip.dest_lat];
            }

            const data = await getDirections([driverLoc.longitude, driverLoc.latitude], destination);
            if (data) {
                const points = data.geometry.coordinates.map((pt: any) => ({
                    latitude: pt[1],
                    longitude: pt[0]
                }));
                setRouteCoords(points);

                // Fit map
                mapRef.current?.fitToCoordinates(points, {
                    edgePadding: { top: 50, right: 50, bottom: 350, left: 50 },
                    animated: true
                });
            }
        };

        getRoute();
    }, [trip?.status, driverLoc]);

    // SAFE GUARDED Action Handler
    const handleUpdateStatus = async (newStatus: string) => {
        try {
            // 1. Double-Check Server State
            const { data: latestTrip, error: checkError } = await supabase
                .from('trips')
                .select('status')
                .eq('id', tripId)
                .single();

            if (checkError) throw checkError;

            // 2. Reject if Cancelled
            if (latestTrip.status === 'cancelled') {
                Alert.alert("Trip Cancelled", "This trip was cancelled by the passenger.");
                if (navigation.canGoBack()) {
                    navigation.popToTop();
                } else {
                    navigation.navigate('DriverHome' as any);
                }
                return;
            }

            // 3. Proceed if Active
            const response = await axios.post(`${API_URL}/trips/update-status`, {
                tripId,
                status: newStatus
            });

            if (response.data.success) {
                if (newStatus === 'completed') {
                    Alert.alert("Success", "Trip completed!", [{ text: "OK", onPress: () => navigation.navigate('DriverHome') }]);
                } else {
                    setTrip(response.data.trip);
                }
            }
        } catch (error: any) {
            console.error("Status Update Error:", error);
            Alert.alert("Error", "Failed to update status. Please check your connection.");
        }
    };

    if (loading || !trip) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const currentStatus = trip.status;

    return (
        <View style={styles.container}>
            {/* Map Layer */}
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: driverLoc?.latitude || trip.pickup_lat,
                    longitude: driverLoc?.longitude || trip.pickup_lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01
                }}
            >
                <UrlTile
                    urlTemplate={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_ACCESS_TOKEN}`}
                    maximumZ={19}
                    flipY={false}
                    tileSize={256}
                />

                {driverLoc && (
                    <Marker coordinate={driverLoc} title="You">
                        <View style={styles.driverMarker}>
                            <Navigation size={20} color="#fff" fill="#fff" transform={[{ rotate: '45deg' }]} />
                        </View>
                    </Marker>
                )}

                <Marker coordinate={{ latitude: trip.pickup_lat, longitude: trip.pickup_lng }} title="Pickup">
                    <View style={[styles.dotMarker, { backgroundColor: Colors.success }]} />
                </Marker>

                <Marker coordinate={{ latitude: trip.dest_lat, longitude: trip.dest_lng }} title="Destination">
                    <View style={[styles.dotMarker, { backgroundColor: Colors.danger }]} />
                </Marker>

                {routeCoords.length > 0 && (
                    <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor={Colors.primary} />
                )}
            </MapView>

            {/* UI Overlay */}
            <View style={styles.topBanner}>
                <Text style={styles.statusTitle}>
                    {currentStatus === 'accepted' ? 'Driving to Pickup' :
                        currentStatus === 'arrived' ? 'At Pickup Location' :
                            currentStatus === 'started' ? 'On Trip' :
                                currentStatus === 'cancelled' ? 'CANCELLED' : 'Trip Finished'}
                </Text>
                <Text style={styles.addressText} numberOfLines={1}>
                    {currentStatus === 'started' ? trip.dest_address : trip.pickup_address}
                </Text>
                {currentStatus === 'cancelled' && (
                    <Text style={{ color: 'red', fontWeight: 'bold', marginTop: 4 }}>TRIP CANCELLED</Text>
                )}
            </View>

            {/* Bottom Sheet */}
            <View style={styles.bottomSheet}>
                <View style={styles.passengerInfo}>
                    <View style={styles.avatar}>
                        <Image source={{ uri: 'https://ui-avatars.com/api/?name=' + trip.customer?.full_name }} style={styles.avatarImg} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.customerName}>{trip.customer?.full_name || 'Passenger'}</Text>
                        <Text style={styles.customerSub}>Payment: {trip.payment_method?.toUpperCase()}</Text>
                    </View>
                    <View style={styles.actionIcons}>
                        <TouchableOpacity style={styles.iconCircle}>
                            <Phone size={24} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconCircle}>
                            <MessageSquare size={24} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Earnings */}
                <View style={styles.earningsRow}>
                    <Text style={styles.earningsLabel}>Trip Earnings</Text>
                    <Text style={styles.earningsValue}>EGP {trip.price}</Text>
                </View>

                {/* Main Action Button */}
                {currentStatus === 'accepted' && (
                    <TouchableOpacity style={styles.mainBtn} onPress={() => handleUpdateStatus('arrived')}>
                        <Text style={styles.mainBtnText}>ARRIVED AT PICKUP</Text>
                    </TouchableOpacity>
                )}

                {currentStatus === 'arrived' && (
                    <TouchableOpacity style={[styles.mainBtn, { backgroundColor: Colors.success }]} onPress={() => handleUpdateStatus('started')}>
                        <Text style={styles.mainBtnText}>START TRIP</Text>
                    </TouchableOpacity>
                )}

                {currentStatus === 'started' && (
                    <TouchableOpacity style={[styles.mainBtn, { backgroundColor: Colors.danger }]} onPress={() => handleUpdateStatus('completed')}>
                        <Text style={styles.mainBtnText}>COMPLETE TRIP</Text>
                    </TouchableOpacity>
                )}

                {/* Fallback Refresh Button (Only if cancelled or stuck) */}
                <TouchableOpacity style={{ alignSelf: 'center', marginTop: 10 }} onPress={handleCheckStatus}>
                    <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Refresh Status</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    map: { flex: 1 },
    topBanner: { position: 'absolute', top: 50, left: 20, right: 20, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.1, elevation: 5, alignItems: 'center', zIndex: 10 },
    statusTitle: { fontSize: 12, fontWeight: 'bold', color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 },
    addressText: { fontSize: 16, fontWeight: 'bold', color: '#1e1e1e' },

    bottomSheet: { position: 'absolute', bottom: 0, width: width, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, shadowColor: '#000', shadowOpacity: 0.1, elevation: 20 },
    passengerInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F3F4F6', marginRight: 16, overflow: 'hidden' },
    avatarImg: { width: '100%', height: '100%' },
    customerName: { fontSize: 18, fontWeight: 'bold', color: '#1e1e1e' },
    customerSub: { fontSize: 14, color: '#6B7280' },
    actionIcons: { flexDirection: 'row', gap: 12 },
    iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },

    earningsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, marginBottom: 24 },
    earningsLabel: { fontSize: 16, color: '#4B5563' },
    earningsValue: { fontSize: 18, fontWeight: 'bold', color: '#3B82F6' },

    mainBtn: { backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
    mainBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

    driverMarker: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, elevation: 5 },
    dotMarker: { width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, elevation: 5 },
});
