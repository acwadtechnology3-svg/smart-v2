import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Alert, Image } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { X, MapPin, Navigation as NavigationIcon } from 'lucide-react-native';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { supabase } from '../../lib/supabase';
import { tripStatusService } from '../../services/tripStatusService';

const { width, height } = Dimensions.get('window');
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1Ijoic2FsYWhlenphdDEyMCIsImEiOiJjbWwyem4xMHIwaGFjM2NzYmhtNDNobmZvIn0.Q5Tm9dtAgsgsI84y4KWTUg';

type SearchingDriverScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SearchingDriver'>;
type SearchingDriverScreenRouteProp = RouteProp<RootStackParamList, 'SearchingDriver'>;

export default function SearchingDriverScreen() {
    const navigation = useNavigation<SearchingDriverScreenNavigationProp>();
    const route = useRoute<SearchingDriverScreenRouteProp>();
    const { tripId } = route.params;

    const [isSearching, setIsSearching] = useState(true);
    const [offers, setOffers] = useState<any[]>([]);

    // Start global trip monitoring service
    React.useEffect(() => {
        console.log('[SearchingDriver] Starting global trip monitor');
        tripStatusService.startMonitoring(tripId);

        return () => {
            // Don't stop monitoring here - let it continue across screens
            console.log('[SearchingDriver] Screen unmounting but keeping monitor active');
        };
    }, [tripId]);

    // Animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.3,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Rotate animation
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 3000,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    // Fetch trip details for map
    const [trip, setTrip] = useState<any>(null);

    useEffect(() => {
        const fetchTrip = async () => {
            const { data } = await supabase
                .from('trips')
                .select('*')
                .eq('id', tripId)
                .single();

            if (data) {
                setTrip(data);
            }
        };
        fetchTrip();
    }, [tripId]);

    // Listen for trip offers and status changes
    useEffect(() => {
        console.log('[SearchingDriver] Listening for offers on trip:', tripId);

        const channel = supabase
            .channel(`trip-offers-${tripId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'trip_offers', filter: `trip_id=eq.${tripId}` },
                async (payload) => {
                    console.log('[SearchingDriver] New offer received:', payload.new);

                    // Fetch driver details for this offer
                    const { data: driverData } = await supabase
                        .from('drivers')
                        .select('*, users(full_name, phone)')
                        .eq('id', payload.new.driver_id)
                        .single();

                    if (driverData) {
                        const offerWithDriver = {
                            ...payload.new,
                            driver: {
                                id: driverData.id,
                                name: driverData.users?.full_name || 'Driver',
                                phone: driverData.users?.phone,
                                rating: '5.0',
                                image: driverData.profile_photo_url,
                                car: driverData.vehicle_model,
                                plate: driverData.vehicle_plate,
                                color: driverData.vehicle_color,
                            }
                        };
                        setOffers((prev) => [...prev, offerWithDriver]);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
                async (payload) => {
                    console.log('[SearchingDriver] Trip status updated:', payload.new.status);

                    if (payload.new.status === 'accepted') {
                        console.log('[SearchingDriver] Trip accepted! Fetching driver details...');

                        // Fetch driver details
                        const { data: driverData } = await supabase
                            .from('drivers')
                            .select('*, users(full_name, phone)')
                            .eq('id', payload.new.driver_id)
                            .single();

                        if (driverData) {
                            navigation.replace('DriverFound', {
                                tripId,
                                driver: {
                                    id: driverData.id,
                                    name: driverData.users?.full_name || 'Driver',
                                    phone: driverData.users?.phone,
                                    rating: '5.0',
                                    image: driverData.profile_photo_url,
                                    car: driverData.vehicle_model,
                                    plate: driverData.vehicle_plate,
                                    color: driverData.vehicle_color,
                                    lat: driverData.current_lat,
                                    lng: driverData.current_lng,
                                    eta: '5 min',
                                },
                            });
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tripId]);

    const handleAcceptOffer = async (offer: any) => {
        try {
            console.log('[SearchingDriver] Accepting offer:', offer.id);

            // Update trip status to accepted and set driver
            const { error } = await supabase
                .from('trips')
                .update({
                    status: 'accepted',
                    driver_id: offer.driver_id,
                    offered_price: offer.offered_price
                })
                .eq('id', tripId);

            if (error) {
                console.error('[SearchingDriver] Error accepting offer:', error);
                Alert.alert('Error', 'Failed to accept offer');
                return;
            }

            // Update offer status
            await supabase
                .from('trip_offers')
                .update({ status: 'accepted' })
                .eq('id', offer.id);

            console.log('[SearchingDriver] Offer accepted successfully');
            // Navigation will happen automatically via the status listener
        } catch (err) {
            console.error('[SearchingDriver] Error:', err);
            Alert.alert('Error', 'Something went wrong');
        }
    };

    const handleRejectOffer = async (offer: any) => {
        try {
            console.log('[SearchingDriver] Rejecting offer:', offer.id);

            // Update offer status to rejected
            const { error } = await supabase
                .from('trip_offers')
                .update({ status: 'rejected' })
                .eq('id', offer.id);

            if (error) {
                console.error('[SearchingDriver] Error rejecting offer:', error);
                return;
            }

            // Remove from local state
            setOffers((prev) => prev.filter((o) => o.id !== offer.id));

            console.log('[SearchingDriver] Offer rejected');
        } catch (err) {
            console.error('[SearchingDriver] Error:', err);
        }
    };

    const handleCancel = () => {
        Alert.alert(
            'Cancel Trip',
            'Are you sure you want to cancel this trip request?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        // 1. Cancel the trip
                        await supabase
                            .from('trips')
                            .update({ status: 'cancelled' })
                            .eq('id', tripId);

                        // 2. Fetch trip details to repopulate TripOptions screen
                        const { data: trip } = await supabase
                            .from('trips')
                            .select('pickup_address, dest_address, dest_lat, dest_lng')
                            .eq('id', tripId)
                            .single();

                        if (trip) {
                            // 3. Navigate back to TripOptions with the locations
                            navigation.navigate('TripOptions', {
                                pickup: trip.pickup_address,
                                destination: trip.dest_address,
                                destinationCoordinates: [trip.dest_lng, trip.dest_lat] // [lng, lat] for Mapbox/TripOptions
                            });
                        } else {
                            // Fallback if fetch fails
                            navigation.goBack();
                        }
                    },
                },
            ]
        );
    };

    if (!trip) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Map Background */}
            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: trip.pickup_lat || 31.2357,
                    longitude: trip.pickup_lng || 29.9511,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
            >
                <UrlTile
                    urlTemplate={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_ACCESS_TOKEN}`}
                    maximumZ={19}
                    flipY={false}
                    tileSize={256}
                />
                <Marker
                    coordinate={{
                        latitude: trip.pickup_lat,
                        longitude: trip.pickup_lng,
                    }}
                    title="Pickup"
                >
                    <View style={styles.pickupMarker}>
                        <MapPin size={24} color="#fff" fill="#fff" />
                    </View>
                </Marker>
                <Marker
                    coordinate={{
                        latitude: trip.dest_lat,
                        longitude: trip.dest_lng,
                    }}
                    title="Destination"
                >
                    <View style={styles.destMarker}>
                        <NavigationIcon size={20} color="#fff" fill="#fff" />
                    </View>
                </Marker>
            </MapView>

            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
                <X size={24} color="#1F2937" />
            </TouchableOpacity>

            {/* Bottom Card */}
            <View style={styles.bottomCard}>
                <View style={styles.searchingContainer}>
                    <Animated.View
                        style={[
                            styles.pulseCircle,
                            {
                                transform: [{ scale: pulseAnim }],
                            },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.searchIcon,
                            {
                                transform: [{ rotate: spin }],
                            },
                        ]}
                    >
                        <View style={styles.iconInner}>
                            <Text style={styles.iconText}>🚗</Text>
                        </View>
                    </Animated.View>
                </View>

                <Text style={styles.title}>Finding Your Driver</Text>
                <Text style={styles.subtitle}>
                    {offers.length > 0
                        ? `${offers.length} driver${offers.length > 1 ? 's' : ''} interested - Choose one!`
                        : "We're searching for the best drivers near you..."
                    }
                </Text>

                {/* Driver Offers */}
                {offers.length > 0 && (
                    <View style={styles.offersListContainer}>
                        {offers.map((offer, index) => (
                            <View key={offer.id || index} style={styles.offerCard}>
                                <View style={styles.offerHeader}>
                                    <View style={styles.driverInfo}>
                                        {offer.driver?.image ? (
                                            <Image
                                                source={{ uri: offer.driver.image }}
                                                style={styles.driverImage}
                                            />
                                        ) : (
                                            <View style={styles.driverAvatar}>
                                                <Text style={styles.avatarText}>
                                                    {offer.driver?.name?.charAt(0) || 'D'}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={styles.driverDetails}>
                                            <Text style={styles.driverName}>{offer.driver?.name || 'Driver'}</Text>
                                            <View style={styles.ratingRow}>
                                                <Text style={styles.ratingText}>⭐ {offer.driver?.rating || '5.0'}</Text>
                                            </View>
                                            <Text style={styles.driverCar}>
                                                {offer.driver?.car || 'Vehicle'} • {offer.driver?.color || 'Color'}
                                            </Text>
                                            <Text style={styles.driverPlate}>
                                                Plate: {offer.driver?.plate || 'N/A'}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.priceContainer}>
                                        <Text style={styles.priceLabel}>Offer</Text>
                                        <Text style={styles.priceValue}>EGP {offer.offered_price || offer.price}</Text>
                                    </View>
                                </View>
                                <View style={styles.offerActions}>
                                    <TouchableOpacity
                                        style={styles.rejectButton}
                                        onPress={() => handleRejectOffer(offer)}
                                    >
                                        <Text style={styles.rejectButtonText}>Reject</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.acceptButton}
                                        onPress={() => handleAcceptOffer(offer)}
                                    >
                                        <Text style={styles.acceptButtonText}>Accept Ride</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.tripDetails}>
                    <View style={styles.detailRow}>
                        <View style={styles.dot} />
                        <Text style={styles.detailText} numberOfLines={1}>
                            {trip.pickup_address || 'Pickup location'}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <View style={[styles.dot, { backgroundColor: Colors.danger }]} />
                        <Text style={styles.detailText} numberOfLines={1}>
                            {trip.dest_address || 'Destination'}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                    <Text style={styles.cancelButtonText}>Cancel Request</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    map: {
        flex: 1,
    },
    pickupMarker: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    destMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.danger,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    bottomCard: {
        position: 'absolute',
        bottom: 0,
        width: width,
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 15,
        alignItems: 'center',
    },
    searchingContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    pulseCircle: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: `${Colors.primary}20`,
    },
    searchIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    iconInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconText: {
        fontSize: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    offersContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: `${Colors.success}15`,
        borderRadius: 20,
        marginBottom: 20,
    },
    offersText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.success,
    },
    tripDetails: {
        width: '100%',
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.primary,
        marginRight: 12,
    },
    detailText: {
        flex: 1,
        fontSize: 14,
        color: Colors.textPrimary,
    },
    cancelButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FCA5A5',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Driver Offer Styles
    offersListContainer: {
        width: '100%',
        maxHeight: 200,
        marginBottom: 16,
    },
    offerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: Colors.primary + '30',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    offerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    driverInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginRight: 12,
    },
    driverAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    driverName: {
        fontSize: 17,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    driverCar: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    priceContainer: {
        alignItems: 'flex-end',
        minWidth: 80,
    },
    priceLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    priceValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.success,
    },
    acceptButton: {
        flex: 1,
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginLeft: 8,
    },
    acceptButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    // New styles for enhanced offer cards
    driverImage: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    driverDetails: {
        flex: 1,
        marginLeft: 12,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    ratingText: {
        fontSize: 14,
        color: '#F59E0B',
        fontWeight: '600',
    },
    driverPlate: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 4,
        fontWeight: '500',
    },
    offerActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    rejectButton: {
        flex: 1,
        backgroundColor: '#FEE2E2',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    rejectButtonText: {
        color: '#EF4444',
        fontSize: 15,
        fontWeight: 'bold',
    },
});
