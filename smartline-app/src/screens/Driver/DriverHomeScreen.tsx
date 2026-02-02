import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Switch, Image, Dimensions, Animated, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { UrlTile, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { Menu, Shield, CircleDollarSign, Navigation, Siren } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import DriverSideMenu from '../../components/DriverSideMenu';
import TripRequestModal from '../../components/TripRequestModal';

const { width, height } = Dimensions.get('window');

export default function DriverHomeScreen() {
    const navigation = useNavigation<any>();
    const [isOnline, setIsOnline] = useState(false);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [driverProfile, setDriverProfile] = useState<any>(null);
    const [isSideMenuVisible, setSideMenuVisible] = useState(false);
    const mapRef = useRef<MapView>(null);

    // Animation for "Finding Trips" pulse
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Start pulse animation when online
        if (isOnline) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isOnline]);

    const [dailyEarnings, setDailyEarnings] = useState(0);
    const [walletBalance, setWalletBalance] = useState(0);

    // Initial Data Fetch
    useEffect(() => {
        (async () => {
            // 1. Get Permissions
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            // 2. Get Initial Location
            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);

            // 3. Fetch Driver Profile & Finances
            const sessionData = await AsyncStorage.getItem('userSession');
            if (sessionData) {
                const { user } = JSON.parse(sessionData);

                // Fetch Profile
                const { data: driver } = await supabase
                    .from('drivers')
                    .select('id, profile_photo_url, users!inner(full_name)')
                    .eq('id', user.id)
                    .single();

                if (driver) {
                    if (driver.profile_photo_url) driver.profile_photo_url = `${driver.profile_photo_url}?t=${new Date().getTime()}`;
                    setDriverProfile(driver);
                }

                // Fetch Wallet Balance
                const { data: userData } = await supabase.from('users').select('balance').eq('id', user.id).single();
                if (userData) setWalletBalance(userData.balance || 0);

                // Fetch Today's Earnings
                // Sum of final_price or driver net? "Money I get it today" usually means Gross Cash + Net Wallet.
                // Let's sum 'final_price' for completed trips today as a proxy for "Sales".
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);

                const { data: trips } = await supabase
                    .from('trips')
                    .select('final_price')
                    .eq('driver_id', user.id)
                    .eq('status', 'completed')
                    .gte('created_at', todayStart.toISOString());

                if (trips) {
                    const total = trips.reduce((sum, t) => sum + (t.final_price || 0), 0);
                    setDailyEarnings(total);
                }
            }
        })();
    }, []);

    const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
    const [incomingTrip, setIncomingTrip] = useState<any>(null);

    // Toggle Online Status
    const toggleOnline = async () => {
        // BLOCKING LOGIC: Check Debt
        if (!isOnline && walletBalance < -100) {
            Alert.alert(
                "Access Blocked",
                "Your wallet balance is below -100 EGP. Please deposit to continue receiving trips.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Go to Wallet", onPress: () => navigation.navigate('DriverWallet') }
                ]
            );
            return;
        }

        const newStatus = !isOnline;
        // ... (rest of logic)
        try {
            const sessionData = await AsyncStorage.getItem('userSession');
            if (!sessionData) {
                Alert.alert("Error", "No user found. Please re-login.");
                return;
            }
            const { user } = JSON.parse(sessionData); // Re-fetch user to be safe

            // Ensure we have location before going online
            let currentLoc = location;
            // ... (permission logic same as before)
            if (newStatus && !currentLoc) {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    currentLoc = await Location.getCurrentPositionAsync({});
                    setLocation(currentLoc);
                } else {
                    Alert.alert("Permission Denied", "Location permission is required.");
                    return;
                }
            }

            setIsOnline(newStatus);

            await supabase.from('drivers').update({
                is_online: newStatus,
                current_lat: currentLoc?.coords.latitude || null,
                current_lng: currentLoc?.coords.longitude || null,
                last_location_update: new Date().toISOString()
            }).eq('id', user.id);

            if (newStatus) {
                const sub = await Location.watchPositionAsync(
                    { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 50 },
                    (loc) => { setLocation(loc); updateDriverLocation(user.id, loc); }
                );
                setLocationSubscription(sub);
            } else {
                if (locationSubscription) {
                    locationSubscription.remove();
                    setLocationSubscription(null);
                }
            }
        } catch (error: any) {
            console.error("Error updating status:", error);
            Alert.alert("Go Online Failed", error.message);
            setIsOnline(isOnline);
        }
    };

    // Separate Effect for Trip Listening to handle reloads/status changes reliably
    useEffect(() => {
        let channel: any = null;

        if (isOnline && driverProfile) {
            console.log("Starting Realtime Trip Listener (Stable)...");
            console.log("✅ Polling DISABLED - Only showing NEW trips via Realtime");
            // Pass location once for initial context, but don't restart on location change
            channel = listenForTrips(driverProfile.id, location);
        }

        return () => {
            if (channel) {
                console.log("Cleaning up Trip Listener...");
                supabase.removeChannel(channel);
            }
        };
    }, [isOnline, driverProfile]); // REMOVED 'location' from here

    const updateDriverLocation = async (userId: string, loc: Location.LocationObject) => {
        const { error } = await supabase.from('drivers').update({
            current_lat: loc.coords.latitude,
            current_lng: loc.coords.longitude,
            last_location_update: new Date().toISOString()
        }).eq('id', userId);

        if (error) console.error("Loc Update Error:", error);
    };

    const listenForTrips = (driverId: string, currentLocation: any) => {
        console.log(`========================================`);
        console.log(`[Realtime] 🚀 Starting Inbox for Driver: ${driverId}`);
        console.log(`[Realtime] Driver Location:`, location?.coords);
        console.log(`========================================`);

        const channel = supabase.channel('driver-trip-inbox')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'trips' },
                (payload) => {
                    const newTrip = payload.new;
                    console.log(`========================================`);
                    console.log(`[Realtime] 🆕 NEW TRIP ARRIVED!`);
                    console.log(`[Realtime] Trip ID:`, newTrip.id);
                    console.log(`[Realtime] Status:`, newTrip.status);
                    console.log(`[Realtime] Pickup:`, newTrip.pickup_lat, newTrip.pickup_lng);
                    console.log(`[Realtime] Full Data:`, JSON.stringify(newTrip));
                    console.log(`========================================`);

                    if (newTrip.status !== 'requested') {
                        console.log(`[Realtime] ⚠️ Ignoring: status is ${newTrip.status}`);
                        return;
                    }

                    // Check distance
                    const loc = location || currentLocation;
                    if (loc && newTrip.pickup_lat) {
                        const dist = getDistanceFromLatLonInKm(
                            loc.coords.latitude, loc.coords.longitude,
                            newTrip.pickup_lat, newTrip.pickup_lng
                        );
                        console.log(`[Realtime] 📍 Driver is ${dist.toFixed(2)}km from pickup.`);

                        // Show all trips within 1000km for testing, but log it
                        if (dist < 1000) {
                            console.log(`[Realtime] ✅ Showing trip to driver!`);
                            setIncomingTrip(newTrip);
                        } else {
                            console.log("[Realtime] ❌ Trip too far (>1000km)");
                        }
                    } else {
                        console.log("[Realtime] ⚠️ No location, showing anyway");
                        setIncomingTrip(newTrip);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'trip_offers' },
                (payload) => {
                    console.log(`[Realtime] 📬 Offer Update:`, payload.new.status);
                    if (payload.new.driver_id === driverId && payload.new.status === 'accepted') {
                        console.log(`[Realtime] ✅ Offer ACCEPTED!`);
                        Alert.alert("Success", "Customer accepted your offer!", [
                            { text: "OK", onPress: () => navigation.navigate('DriverActiveTrip', { tripId: payload.new.trip_id }) }
                        ]);
                    }
                }
            )
            .subscribe((status, err) => {
                console.log(`[Realtime] 🔌 Subscription Status:`, status);
                if (err) {
                    console.error(`[Realtime] ❌ Subscription Error:`, err.message);
                }

                if (status === 'SUBSCRIBED') {
                    console.log(`[Realtime] ✅ Successfully subscribed to trip inbox!`);
                }

                if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
                    console.log(`[Realtime] ⚠️ Connection failed. Retrying in 3 seconds...`);
                    setTimeout(() => {
                        if (isOnline) {
                            console.log("[Realtime] Attempting reconnect...");
                        }
                    }, 3000);
                }
            });

        return channel;
    };

    const handleAcceptTrip = async (tripId: string) => {
        if (!driverProfile || !incomingTrip) return;
        submitOffer(tripId, parseFloat(incomingTrip.price));
    };

    const handleBidTrip = async (tripId: string, amount: number) => {
        submitOffer(tripId, amount);
    };

    const submitOffer = async (tripId: string, amount: number) => {
        try {
            const { error } = await supabase
                .from('trip_offers')
                .insert({
                    trip_id: tripId,
                    driver_id: driverProfile.id,
                    offer_price: amount,
                    status: 'pending'
                });

            if (error) throw error;

            console.log("Offer Inserted Successfully:", tripId, amount);
            Alert.alert("Offer Sent", "Waiting for customer to accept...");
            setIncomingTrip(null);
        } catch (err: any) {
            Alert.alert("Error", err.message);
        }
    };

    // Haversine Formula
    function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
        var R = 6371; // Radius of the earth in km
        var dLat = deg2rad(lat2 - lat1);  // deg2rad below
        var dLon = deg2rad(lon2 - lon1);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d;
    }

    function deg2rad(deg: number) {
        return deg * (Math.PI / 180)
    }

    useEffect(() => {
        return () => {
            if (locationSubscription) locationSubscription.remove();
        };
    }, [locationSubscription]);

    const recenterMap = () => {
        if (location && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        }
    };

    return (
        <View style={styles.container}>
            {/* --- MAP LAYER --- */}
            {location ? (
                <MapView
                    ref={mapRef}
                    style={styles.mapLayer}
                    initialRegion={{
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                    showsUserLocation={true}
                    userInterfaceStyle="light"
                >
                    <UrlTile
                        urlTemplate="https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1Ijoic2FsYWhlenphdDEyMCIsImEiOiJjbWwyem4xMHIwaGFjM2NzYmhtNDNobmZvIn0.Q5Tm9dtAgsgsI84y4KWTUg"
                        maximumZ={19}
                        flipY={false}
                        tileSize={256}
                    />
                </MapView>
            ) : (
                <View style={[styles.mapLayer, { backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text>Loading Map...</Text>
                </View>
            )}

            {/* --- UI OVERLAY --- */}
            <SafeAreaView style={styles.overlayContainer} pointerEvents="box-none">

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.menuButton} onPress={() => setSideMenuVisible(true)}>
                        <Menu color="#1e1e1e" size={24} />
                    </TouchableOpacity>

                    {/* Earnings Pill */}
                    <TouchableOpacity style={styles.earningsPill} onPress={() => navigation.navigate('DriverWallet')}>
                        <CircleDollarSign size={20} color={Colors.primary} />
                        <Text style={styles.earningsText}>
                            EGP {dailyEarnings.toFixed(2)}
                            {walletBalance < -100 && <Text style={{ color: Colors.danger, fontSize: 10 }}> (!)</Text>}
                        </Text>
                    </TouchableOpacity>

                    {/* Driver Profile Pic */}
                    <View style={styles.profileContainer}>
                        {driverProfile?.profile_photo_url ? (
                            <Image source={{ uri: driverProfile.profile_photo_url }} style={styles.profileImage} />
                        ) : (
                            <View style={[styles.profileImage, { backgroundColor: '#ccc' }]} />
                        )}
                        <View style={[styles.statusDot, { backgroundColor: isOnline ? Colors.success : Colors.textSecondary }]} />
                    </View>
                </View>

                {/* Floating Controls */}
                <View style={styles.rightControls} pointerEvents="box-none">
                    <TouchableOpacity style={styles.iconButton}>
                        <Shield color="#1e1e1e" size={24} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconButton, { marginTop: 12 }]} onPress={recenterMap}>
                        <Navigation color="#1e1e1e" size={24} />
                    </TouchableOpacity>
                </View>


                {/* Bottom Action Area */}
                <View style={styles.bottomContainer}>
                    {isOnline && (
                        <View style={styles.onlineStatusContainer}>
                            <Animated.View style={[styles.radarPulse, { transform: [{ scale: pulseAnim }] }]} />
                            <Text style={styles.findingText}>Finding Trips...</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.goButton, { backgroundColor: isOnline ? Colors.danger : Colors.primary }]}
                        onPress={toggleOnline}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.goButtonText}>{isOnline ? 'GO OFFLINE' : 'GO ONLINE'}</Text>
                    </TouchableOpacity>
                </View>

            </SafeAreaView>

            {/* Side Menu Component */}
            <DriverSideMenu
                visible={isSideMenuVisible}
                onClose={() => setSideMenuVisible(false)}
                initialProfile={driverProfile}
            />

            <TripRequestModal
                visible={!!incomingTrip}
                trip={incomingTrip}
                onAccept={handleAcceptTrip}
                onDecline={() => setIncomingTrip(null)}
                onBid={handleBidTrip}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    mapLayer: { ...StyleSheet.absoluteFillObject },

    overlayContainer: { flex: 1, justifyContent: 'space-between' },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 50 : 10, // Extra padding for Android status bar
        paddingBottom: 10,
    },
    menuButton: {
        width: 44, height: 44,
        backgroundColor: '#fff', borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3
    },
    earningsPill: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16,
        borderRadius: 25,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3
    },
    earningsText: {
        fontSize: 16, fontWeight: 'bold', color: '#1e1e1e'
    },
    profileContainer: { position: 'relative' },
    profileImage: {
        width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#fff',
    },
    statusDot: {
        position: 'absolute', bottom: 0, right: 0,
        width: 14, height: 14, borderRadius: 7,
        borderWidth: 2, borderColor: '#fff'
    },

    rightControls: {
        position: 'absolute',
        right: 20,
        top: Platform.OS === 'android' ? 180 : 150, // Lower on Android
        alignItems: 'center'
    },
    iconButton: {
        width: 44, height: 44,
        backgroundColor: '#fff', borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3
    },

    bottomContainer: {
        padding: 24,
        paddingBottom: Platform.OS === 'android' ? 50 : 40, // Extra padding for Android navigation
        alignItems: 'center'
    },
    onlineStatusContainer: {
        marginBottom: 30,
        alignItems: 'center', justifyContent: 'center',
        height: 60,
    },
    radarPulse: {
        position: 'absolute',
        width: 200, height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(79, 70, 229, 0.1)', // Primary opacity
    },
    findingText: {
        fontSize: 18, fontWeight: '600', color: '#1e1e1e',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, overflow: 'hidden'
    },
    goButton: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6
    },
    goButtonText: {
        color: '#fff', fontSize: 20, fontWeight: 'bold', letterSpacing: 1
    }
});
