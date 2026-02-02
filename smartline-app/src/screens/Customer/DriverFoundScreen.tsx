import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Linking, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Phone, MessageSquare, Star, CarFront, ShieldCheck, Navigation } from 'lucide-react-native';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1Ijoic2FsYWhlenphdDEyMCIsImEiOiJjbWwyem4xMHIwaGFjM2NzYmhtNDNobmZvIn0.Q5Tm9dtAgsgsI84y4KWTUg';

type DriverFoundScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DriverFound'>;
type DriverFoundScreenRouteProp = RouteProp<RootStackParamList, 'DriverFound'>;

export default function DriverFoundScreen() {
    const navigation = useNavigation<DriverFoundScreenNavigationProp>();
    const route = useRoute<DriverFoundScreenRouteProp>();
    const { tripId, driver } = route.params;

    const [driverLoc, setDriverLoc] = useState({
        latitude: driver?.lat || 31.2357,
        longitude: driver?.lng || 29.9511
    });
    const [isArrived, setIsArrived] = useState(false);
    const mapRef = useRef<MapView>(null);

    // Listen for driver location and "arrived" status only
    // Global service handles all navigation
    useEffect(() => {
        if (!driver?.id) return;

        console.log("[DriverFound] Setting up listeners");

        const channel = supabase.channel(`driverfound-${tripId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `id=eq.${driver.id}` },
                (payload) => {
                    if (payload.new.current_lat && payload.new.current_lng) {
                        const newPos = {
                            latitude: payload.new.current_lat,
                            longitude: payload.new.current_lng
                        };
                        setDriverLoc(newPos);
                        mapRef.current?.animateToRegion({ ...newPos, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 1000);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
                (payload) => {
                    console.log("[DriverFound] Status:", payload.new.status);

                    // Only handle "arrived" alert - global service handles navigation
                    if (payload.new.status === 'arrived' && !isArrived) {
                        setIsArrived(true);
                        Alert.alert(
                            "Driver Arrived!",
                            "Your captain has reached the pickup location.",
                            [{ text: "OK" }]
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [driver?.id, tripId, isArrived]);

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: driverLoc.latitude,
                    longitude: driverLoc.longitude,
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
                <Marker coordinate={driverLoc}>
                    <View style={styles.carMarker}>
                        <Navigation size={18} color="#fff" fill="#fff" transform={[{ rotate: '45deg' }]} />
                    </View>
                </Marker>
            </MapView>

            <View style={styles.bottomSheet}>
                <View style={styles.statusHeader}>
                    <Text style={[styles.etaText, isArrived && { color: Colors.success }]}>
                        {isArrived ? 'Driver is here!' : `Arriving in ${driver?.eta || '2 min'}`}
                    </Text>
                    <Text style={styles.plateText}>{driver?.plate || 'ABC 123'}</Text>
                </View>

                <View style={styles.infoCard}>
                    <View style={styles.driverSection}>
                        <View style={styles.avatarPlaceholder}>
                            <Image
                                source={{ uri: driver?.image || 'https://ui-avatars.com/api/?name=' + (driver?.name || 'Driver') }}
                                style={styles.avatar}
                            />
                        </View>
                        <View style={styles.driverTexts}>
                            <Text style={styles.driverName}>{driver?.name || 'Captain'}</Text>
                            <View style={styles.ratingRow}>
                                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                                <Text style={styles.ratingText}>{driver?.rating || '5.0'}</Text>
                                <Text style={styles.tripCount}>(1,240 trips)</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.carSection}>
                        <CarFront size={28} color={Colors.primary} />
                        <Text style={styles.carModel}>{driver?.car || 'Sedan'}</Text>
                        <Text style={styles.carColor}>{driver?.color || 'Silver'}</Text>
                    </View>
                </View>

                <View style={styles.actionsGrid}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => {
                            const phoneNumber = driver?.phone || driver?.phone_number || '';
                            if (phoneNumber) {
                                Linking.openURL(`tel:${phoneNumber}`);
                            } else {
                                Alert.alert('No Phone Number', 'Driver phone number not available');
                            }
                        }}
                    >
                        <View style={styles.iconCircle}>
                            <Phone size={24} color={Colors.primary} />
                        </View>
                        <Text style={styles.actionLabel}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Chat', { driverName: driver?.name || 'Captain', tripId })}>
                        <View style={styles.iconCircle}>
                            <MessageSquare size={24} color={Colors.primary} />
                        </View>
                        <Text style={styles.actionLabel}>Chat</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Safety')}>
                        <View style={styles.iconCircle}>
                            <ShieldCheck size={24} color={Colors.primary} />
                        </View>
                        <Text style={styles.actionLabel}>Safety</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footerBtns}>
                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => {
                            Alert.alert("Cancel Trip", "Are you sure? A cancellation fee may apply.", [
                                { text: "No", style: 'cancel' },
                                {
                                    text: "Yes, Cancel",
                                    style: 'destructive',
                                    onPress: async () => {
                                        try {
                                            // 1. Update DB Status
                                            const { error } = await supabase
                                                .from('trips')
                                                .update({ status: 'cancelled' })
                                                .eq('id', tripId);

                                            if (error) {
                                                Alert.alert("Error", "Failed to cancel trip.");
                                                return;
                                            }

                                            // 2. Navigate Back
                                            navigation.popToTop();
                                        } catch (e) {
                                            console.error("Cancellation Error", e);
                                            Alert.alert("Error", "Network error while cancelling.");
                                        }
                                    }
                                }
                            ])
                        }}
                    >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    map: { flex: 1 },
    carMarker: {
        width: 40, height: 40, backgroundColor: Colors.primary, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff',
        shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, elevation: 5
    },
    bottomSheet: {
        position: 'absolute', bottom: 0, width: width, backgroundColor: '#fff',
        borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40,
        shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 15
    },
    statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    etaText: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary },
    plateText: { fontSize: 14, fontWeight: 'bold', color: '#111827', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, letterSpacing: 1 },
    infoCard: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' },
    driverSection: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E5E7EB', overflow: 'hidden' },
    avatar: { width: '100%', height: '100%' },
    driverTexts: { justifyContent: 'center' },
    driverName: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    ratingText: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
    tripCount: { fontSize: 12, color: '#6B7280' },
    carSection: { alignItems: 'flex-end' },
    carModel: { fontSize: 14, fontWeight: 'bold', color: '#111827', marginTop: 4 },
    carColor: { fontSize: 12, color: '#6B7280' },
    actionsGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
    actionBtn: { alignItems: 'center', gap: 8 },
    iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
    actionLabel: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
    footerBtns: { flexDirection: 'row' },
    cancelBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 16 },
    cancelBtnText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
});
