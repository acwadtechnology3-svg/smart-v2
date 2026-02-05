import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Dimensions, Animated, Modal, TouchableWithoutFeedback, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { ArrowLeft, Car, CloudLightning, CreditCard, Ticket, Clock, Star, BadgePercent, Wallet, X, MapPin } from 'lucide-react-native';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { UrlTile, Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { getDirections } from '../../services/mapService';
import { apiRequest } from '../../services/backend';
import { useLanguage } from '../../context/LanguageContext';

const { width, height } = Dimensions.get('window');
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1Ijoic2FsYWhlenphdDEyMCIsImEiOiJjbWwyem4xMHIwaGFjM2NzYmhtNDNobmZvIn0.Q5Tm9dtAgsgsI84y4KWTUg';

type TripOptionsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TripOptions'>;
type TripOptionsScreenRouteProp = RouteProp<RootStackParamList, 'TripOptions'>;

const RIDE_IMAGES: any = {
    saver: require('../../assets/images/saver.webp'),
    comfort: require('../../assets/images/comfort.webp'),
    vip: require('../../assets/images/vip.webp'),
    taxi: require('../../assets/images/taxi.webp'),
    scooter: require('../../assets/images/scooter.webp'),
};

const BASE_RIDES = [
    { id: 'saver', name: 'Saver', ratePerKm: 5, baseFooter: 10, etaMultiplier: 1.2, image: RIDE_IMAGES.saver, color: '#10B981', promo: 'Best Value' },
    { id: 'comfort', name: 'Comfort', ratePerKm: 7, baseFooter: 15, etaMultiplier: 1.0, image: RIDE_IMAGES.comfort, color: Colors.primary, promo: 'Recommended' },
    { id: 'vip', name: 'VIP', ratePerKm: 12, baseFooter: 25, etaMultiplier: 0.9, image: RIDE_IMAGES.vip, color: '#1e1e1e', promo: 'Premium Service' },
];

export default function TripOptionsScreen() {
    const navigation = useNavigation<TripOptionsScreenNavigationProp>();
    const route = useRoute<TripOptionsScreenRouteProp>();
    const { pickup, destination, destinationCoordinates, autoRequest, pickupCoordinates } = route.params;
    const { t, isRTL } = useLanguage();

    const [selectedRide, setSelectedRide] = useState('comfort');
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Wallet'>('Cash');
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Route Data
    const [pickupCoords, setPickupCoords] = useState<{ latitude: number, longitude: number } | null>(null);
    const [destCoords, setDestCoords] = useState<{ latitude: number, longitude: number } | null>(null);
    const [routeCoords, setRouteCoords] = useState<{ latitude: number, longitude: number }[]>([]);
    const [routeInfo, setRouteInfo] = useState<{ distance: number, duration: number } | null>(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState<string | null>(null);
    const mapRef = useRef<MapView>(null);

    // Promo Logic
    const [showPromoModal, setShowPromoModal] = useState(false);
    const [promoInput, setPromoInput] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

    // Animation
    const slideUp = useRef(new Animated.Value(300)).current;

    useEffect(() => {
        Animated.timing(slideUp, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, []);

    // Auto-Request Logic
    useEffect(() => {
        if (autoRequest && routeInfo && !routeLoading && routeCoords.length > 0) {
            handleRequest();
        }
    }, [autoRequest, routeInfo, routeLoading, routeCoords]);

    // 1. Resolve Coords & Fetch Route
    useEffect(() => {
        const initRoute = async (retryCount = 0) => {
            setRouteLoading(true);
            setRouteError(null);

            try {
                // 1. Get Pickup Coords
                // 1. Get Pickup Coords
                let pCoords = { latitude: 0, longitude: 0 };

                if (pickupCoordinates) {
                    pCoords = { latitude: pickupCoordinates[1], longitude: pickupCoordinates[0] };
                } else if (pickup === 'Current Location' || !pickup) {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                        pCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                    }
                } else {
                    // Try to geocode the address string if no coords provided
                    try {
                        const geocoded = await Location.geocodeAsync(pickup);
                        if (geocoded.length > 0) {
                            pCoords = { latitude: geocoded[0].latitude, longitude: geocoded[0].longitude };
                        } else {
                            // Fallback to current location if geocoding fails
                            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                            pCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                        }
                    } catch (e) {
                        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                        pCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                    }
                }
                setPickupCoords(pCoords);

                // 2. Get Dest Coords
                let dCoords = { latitude: 0, longitude: 0 };
                if (destinationCoordinates) {
                    dCoords = { latitude: destinationCoordinates[1], longitude: destinationCoordinates[0] };
                    setDestCoords(dCoords);
                }

                // 3. Fetch Directions with timeout
                if (pCoords.latitude !== 0 && dCoords.latitude !== 0) {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

                    try {
                        const routeData = await getDirections(
                            [pCoords.longitude, pCoords.latitude],
                            [dCoords.longitude, dCoords.latitude]
                        );
                        clearTimeout(timeoutId);

                        if (routeData) {
                            const points = routeData.geometry.coordinates.map((pt: number[]) => ({
                                latitude: pt[1],
                                longitude: pt[0]
                            }));
                            setRouteCoords(points);
                            setRouteInfo({
                                distance: routeData.distance / 1000,
                                duration: routeData.duration / 60
                            });

                            // Fit Bounds with delay for Android rendering
                            setTimeout(() => {
                                mapRef.current?.fitToCoordinates(points, {
                                    edgePadding: { top: 50, right: 50, bottom: height / 2, left: 50 },
                                    animated: true
                                });
                            }, 800);
                        } else {
                            throw new Error('No route data received');
                        }
                    } catch (dirError: any) {
                        clearTimeout(timeoutId);
                        if (retryCount < 2) {
                            console.log(`[TripOptions] Retrying route fetch (${retryCount + 1}/2)...`);
                            setTimeout(() => initRoute(retryCount + 1), 1000);
                            return;
                        }
                        throw dirError;
                    }
                }
            } catch (err: any) {
                console.error('[TripOptions] Route error:', err);
                setRouteError('Failed to calculate route. Please try again.');
            } finally {
                setRouteLoading(false);
            }
        };

        initRoute();
    }, [pickup, destination, destinationCoordinates]);


    const [pricingConfig, setPricingConfig] = useState<any[]>([]);

    // 0. Fetch Pricing Configuration (Runs when screen is focused)
    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const fetchPricing = async () => {
                console.log("Fetching pricing settings...");
                try {
                    const data = await apiRequest<{ pricing: any[] }>('/pricing/settings', { auth: false });
                    if (data.pricing && isActive) {
                        console.log("Pricing loaded:", data.pricing);
                        setPricingConfig(data.pricing);
                    }
                } catch (error) {
                    console.error("Error fetching pricing:", error);
                }
            };

            fetchPricing();

            return () => { isActive = false; };
        }, [])
    );

    const [promoDiscount, setPromoDiscount] = useState<number>(0);
    const [promoMaxDiscount, setPromoMaxDiscount] = useState<number | null>(null);

    // Calculated Rides with Discount
    const ridesData = useMemo(() => {
        const dist = routeInfo ? routeInfo.distance : 5; // km
        const dur = routeInfo ? routeInfo.duration : 10; // min

        // Localized Definitions
        const Definitions = [
            { id: 'saver', name: t('rideSaver') || 'Saver', image: RIDE_IMAGES.saver, color: '#10B981', promo: t('bestValue') || 'Best Value', etaMult: 1.2 },
            { id: 'comfort', name: t('rideComfort') || 'Comfort', image: RIDE_IMAGES.comfort, color: Colors.primary, promo: t('recommended') || 'Recommended', etaMult: 1.0 },
            { id: 'vip', name: t('rideVIP') || 'VIP', image: RIDE_IMAGES.vip, color: '#1e1e1e', promo: null, etaMult: 1.0 },
            { id: 'scooter', name: t('rideScooter') || 'Scooter', image: RIDE_IMAGES.scooter, color: '#F59E0B', promo: t('fastest') || 'Fastest', etaMult: 0.8 },
            { id: 'taxi', name: t('rideTaxi') || 'Taxi', image: RIDE_IMAGES.taxi, color: '#FBBF24', promo: null, etaMult: 1.1 },
        ];

        // Filter definitions based on what we have in pricingConfig
        return Definitions.map(def => {
            const config = pricingConfig.find(p => p.service_tier === def.id);

            const base = config ? config.base_fare : 10;
            const perKm = config ? config.per_km_rate : 3;
            const perMin = config ? config.per_min_rate : 0.5;
            const minPrice = config ? config.minimum_trip_price : 15;

            let rawPrice = base + (dist * perKm) + (dur * perMin);
            if (rawPrice < minPrice) rawPrice = minPrice;

            let finalPrice = rawPrice;
            const eta = Math.ceil(dur * def.etaMult);

            // Apply Promo
            let promoText = def.promo;
            let oldPrice = null;

            if (appliedPromo) {
                oldPrice = parseFloat(finalPrice.toFixed(2));

                // Calculate Discount Amount
                let discountAmount = finalPrice * (promoDiscount / 100);

                // Apply Max Cap if exists
                if (promoMaxDiscount && discountAmount > promoMaxDiscount) {
                    discountAmount = promoMaxDiscount;
                }

                finalPrice = finalPrice - discountAmount;
                promoText = `${promoDiscount}% ${t('off') || 'OFF'}`;
                if (promoMaxDiscount) promoText += ` (${t('max') || 'Max'} ${promoMaxDiscount} ${t('currency') || 'EGP'})`;
            }

            return {
                ...def,
                price: parseFloat(finalPrice.toFixed(2)),
                oldPrice: oldPrice,
                eta: `${eta} ${t('min') || 'min'}`,
                promo: promoText,
                isValid: !!config
            };
        }).filter(r => r.isValid || pricingConfig.length === 0);
    }, [appliedPromo, routeInfo, pricingConfig, promoDiscount, promoMaxDiscount, t]);




    const handleApplyPromo = async () => {
        if (promoInput.trim().length === 0) return;

        const code = promoInput.trim().toUpperCase();

        try {
            const data = await apiRequest<{ promo: any }>(`/pricing/promo?code=${encodeURIComponent(code)}`, { auth: false });

            // Success
            // Success
            setAppliedPromo(code);
            setPromoDiscount(data.promo.discount_percent);
            setPromoMaxDiscount(data.promo.discount_max);
            setShowPromoModal(false);
            Alert.alert('Success', `Promo applied! You get ${data.promo.discount_percent}% off.`);

        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to verify promo code.');
        }
    };

    const handleRemovePromo = () => {
        setAppliedPromo(null);
        setPromoDiscount(0);
        setPromoMaxDiscount(null);
        setPromoInput('');
    };

    const [requesting, setRequesting] = useState(false);

    // ...
    // Auto-load selected promo from storage
    useEffect(() => {
        const loadSelectedPromo = async () => {
            const storedPromo = await AsyncStorage.getItem('selected_promo');
            if (storedPromo) {
                const promo = JSON.parse(storedPromo);
                // Apply it
                setAppliedPromo(promo.code);
                setPromoDiscount(promo.discount_percent);
                setPromoMaxDiscount(promo.discount_max);
                setPromoInput(promo.code); // Sync input
            }
        };
        loadSelectedPromo();
    }, []);



    // ...

    const handleRequest = async () => {
        if (!pickupCoords || !destCoords || !routeInfo) {
            Alert.alert('Error', 'Route not calculated yet.');
            return;
        }

        setRequesting(true);

        try {
            const sessionData = await AsyncStorage.getItem('userSession');
            if (!sessionData) {
                Alert.alert('Auth Error', 'Please log in again.');
                return;
            }

            const { user } = JSON.parse(sessionData);
            const selectedRideData = ridesData.find(r => r.id === selectedRide);

            if (!selectedRideData) return;

            // Creating Trip
            const payload = {
                customer_id: user.id,
                pickup_lat: pickupCoords.latitude,
                pickup_lng: pickupCoords.longitude,
                dest_lat: destCoords.latitude,
                dest_lng: destCoords.longitude,
                pickup_address: pickup,
                dest_address: destination,
                price: selectedRideData.price,
                distance: routeInfo.distance,
                duration: routeInfo.duration,
                car_type: selectedRide,
                payment_method: paymentMethod.toLowerCase(),
                promo_code: appliedPromo // Send the promo code!
            };

            const response = await apiRequest<{ trip: any }>('/trips/create', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (response.trip) {
                // Clear the used promo from storage
                await AsyncStorage.removeItem('selected_promo');
                navigation.navigate('SearchingDriver', { tripId: response.trip.id });
            }

        } catch (error: any) {
            console.error('Request Ride Error', error);
            const serverMsg = error.response?.data?.error || error.message || 'Unknown error';
            Alert.alert('Request Failed', serverMsg);
        } finally {
            setRequesting(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* --- REAL MAP LAYER --- */}
            <View style={styles.mapLayer}>
                <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFill}
                    initialRegion={{
                        latitude: 30.0444, longitude: 31.2357,
                        latitudeDelta: 0.1, longitudeDelta: 0.1
                    }}
                    userInterfaceStyle="light"
                >
                    <UrlTile
                        urlTemplate={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_ACCESS_TOKEN}`}
                        maximumZ={19}
                        flipY={false}
                        tileSize={256}
                    />

                    {pickupCoords && (
                        <Marker coordinate={pickupCoords} title="Pickup">
                            <View style={styles.customMarkerPickup}>
                                <View style={styles.dotPickupInner} />
                            </View>
                        </Marker>
                    )}
                    {destCoords && (
                        <Marker coordinate={destCoords} title="Destination">
                            <View style={styles.customMarkerDest}>
                                <MapPin size={24} color="#EF4444" fill="#EF4444" />
                            </View>
                        </Marker>
                    )}

                    {routeCoords.length > 0 && (
                        <Polyline
                            coordinates={routeCoords}
                            strokeWidth={4}
                            strokeColor="#1e1e1e"
                        />
                    )}
                </MapView>

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'CustomerHome' }],
                            });
                        }
                    }}
                >
                    <ArrowLeft size={24} color="#000" strokeWidth={3} />
                </TouchableOpacity>
            </View>

            {/* --- BOTTOM SHEET --- */}
            <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideUp }] }]}>

                {/* Route Header */}
                <View style={[styles.routeInfo, { flexDirection: isRTL ? 'row-reverse' : 'column' }]}>
                    <View style={[styles.routeNode, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.dot, { backgroundColor: '#10B981', marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }]} />
                        <Text style={[styles.addressText, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{pickup || t('currentLocation')}</Text>
                    </View>
                    {/* Vertical Line - Hard to RTL perfectly without flex column/row flip on wrapper. Let's keep it simple for now or hide line in RTL? No, line connects dots. */}
                    <View style={[styles.verticalLineWrapper, { alignItems: isRTL ? 'flex-end' : 'flex-start', paddingRight: isRTL ? 7.5 : 0, paddingLeft: isRTL ? 0 : 4.5 }]}>
                        <View style={styles.verticalLine} />
                    </View>
                    <View style={[styles.routeNode, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.dot, { backgroundColor: '#EF4444', marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }]} />
                        <Text style={[styles.addressText, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{destination}</Text>
                    </View>
                </View>

                {routeInfo && (
                    <View style={styles.tripStats}>
                        <Text style={styles.tripStatsText}>{routeInfo.distance.toFixed(1)} {t('km') || 'km'}  •  {Math.ceil(routeInfo.duration)} {t('min') || 'min'}</Text>
                    </View>
                )}

                <View style={styles.divider} />

                <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('chooseRide') || 'Choose a ride'}</Text>

                {/* Ride Options (Vertical List) */}
                <ScrollView
                    style={styles.ridesList}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                >
                    {ridesData.map((ride) => (
                        <TouchableOpacity
                            key={ride.id}
                            style={[
                                styles.rideCard,
                                selectedRide === ride.id && styles.rideCardSelected,
                                { flexDirection: isRTL ? 'row-reverse' : 'row' }
                            ]}
                            onPress={() => setSelectedRide(ride.id)}
                            activeOpacity={0.9}
                        >
                            {/* Icon Section */}
                            <View style={[styles.rideIconWrapper, { marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }]}>
                                <Image source={ride.image} style={styles.rideImage} resizeMode="contain" />
                            </View>

                            {/* Info Section */}
                            <View style={[styles.rideInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={styles.rideName}>{ride.name}</Text>
                                    <View style={styles.personRow}>
                                        <Text style={styles.personText}>4</Text>
                                        <Car size={10} color="#6B7280" />
                                    </View>
                                </View>
                                <Text style={styles.rideEta}>{ride.eta}</Text>
                                {ride.promo && (
                                    <View style={styles.promoTag}>
                                        <Text style={styles.promoText}>{ride.promo}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Price Section */}
                            <View style={[styles.priceSection, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
                                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'baseline' }}>
                                    <Text style={[styles.currency, { marginRight: isRTL ? 0 : 2, marginLeft: isRTL ? 2 : 0 }]}>{t('currency') || 'EGP'}</Text>
                                    <Text style={styles.price}>{ride.price.toFixed(2)}</Text>
                                </View>
                                {ride.oldPrice && (
                                    <Text style={styles.oldPrice}>{t('currency') || 'EGP'} {ride.oldPrice.toFixed(2)}</Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Footer Action */}
                <View style={styles.footer}>
                    <View style={[styles.paymentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <TouchableOpacity
                            style={[styles.paymentSelect, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                            onPress={() => setShowPaymentModal(true)}
                        >
                            {paymentMethod === 'Cash' ? (
                                <CreditCard size={20} color={Colors.primary} />
                            ) : (
                                <Wallet size={20} color={Colors.primary} />
                            )}
                            <Text style={styles.paymentText}>{paymentMethod === 'Cash' ? (t('cash') || 'Cash') : (t('wallet') || 'Wallet')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.promoSelect, appliedPromo ? { backgroundColor: '#DCFCE7' } : null, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                            onPress={() => setShowPromoModal(true)}
                        >
                            <BadgePercent size={18} color={appliedPromo ? '#166534' : "#F97316"} />
                            <Text style={[styles.promoLinkText, appliedPromo ? { color: '#166534' } : null]}>
                                {appliedPromo ? appliedPromo : (t('promoCode') || 'Promo Code')}
                            </Text>
                            {appliedPromo && (
                                <TouchableOpacity onPress={handleRemovePromo} style={{ marginLeft: 4 }}>
                                    <X size={14} color="#166534" />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.requestButton, requesting && { opacity: 0.8 }]}
                        onPress={handleRequest}
                        disabled={requesting}
                    >
                        <LinearGradient
                            colors={[Colors.primary, '#1D4ED8']}
                            style={styles.gradientBtn}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        >
                            {requesting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.requestButtonText}>{t('select') || 'Select'} {ridesData.find(r => r.id === selectedRide)?.name}</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

            </Animated.View>

            {/* Payment Selection Modal */}
            <Modal
                visible={showPaymentModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPaymentModal(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowPaymentModal(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <Text style={[styles.modalTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('selectPaymentMethod') || 'Select Payment Method'}</Text>

                                <TouchableOpacity
                                    style={[styles.paymentOption, paymentMethod === 'Cash' && styles.paymentOptionSelected, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                                    onPress={() => { setPaymentMethod('Cash'); setShowPaymentModal(false); }}
                                >
                                    <View style={[styles.optionIcon, { marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }]}>
                                        <CreditCard size={24} color="#1e1e1e" />
                                    </View>
                                    <Text style={[styles.optionText, { textAlign: isRTL ? 'right' : 'left' }]}>{t('cash') || 'Cash'}</Text>
                                    {paymentMethod === 'Cash' && <View style={styles.selectedDot} />}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.paymentOption, paymentMethod === 'Wallet' && styles.paymentOptionSelected, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                                    onPress={() => { setPaymentMethod('Wallet'); setShowPaymentModal(false); }}
                                >
                                    <View style={[styles.optionIcon, { marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }]}>
                                        <Wallet size={24} color="#1e1e1e" />
                                    </View>
                                    <Text style={[styles.optionText, { textAlign: isRTL ? 'right' : 'left' }]}>{t('wallet') || 'Wallet'}</Text>
                                    {paymentMethod === 'Wallet' && <View style={styles.selectedDot} />}
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Promo Code Modal */}
            <Modal
                visible={showPromoModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowPromoModal(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <TouchableWithoutFeedback onPress={() => setShowPromoModal(false)}>
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback>
                                <View style={[styles.modalContent, { maxHeight: '80%' }]}>
                                    <Text style={[styles.modalTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('enterPromoCode') || "Enter Promo Code"}</Text>
                                    <Text style={[styles.modalSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('promoSubtitle') || "Have a discount code? Enter it below."}</Text>

                                    <TextInput
                                        style={[styles.promoInput, { textAlign: isRTL ? 'right' : 'left' }]}
                                        placeholder={t('promoPlaceholder') || "e.g. SMART50"}
                                        placeholderTextColor="#9CA3AF"
                                        value={promoInput}
                                        onChangeText={setPromoInput}
                                        autoCapitalize="characters"
                                    />

                                    <TouchableOpacity style={styles.applyButton} onPress={handleApplyPromo}>
                                        <Text style={styles.applyButtonText}>{t('applyCode') || "Apply Code"}</Text>
                                    </TouchableOpacity>

                                    {/* Available Promos List */}
                                    <View style={{ width: '100%', marginTop: 16 }}>
                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}>{t('availablePromotions') || "Available Promotions"}</Text>
                                        <PromoList
                                            onSelect={(code) => {
                                                setPromoInput(code);
                                            }}
                                        />
                                    </View>

                                    <TouchableOpacity style={styles.cancelButton} onPress={() => setShowPromoModal(false)}>
                                        <Text style={styles.cancelButtonText}>{t('close') || "Close"}</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

// Sub-component to fetch and list promos
const PromoList = ({ onSelect }: { onSelect: (code: string) => void }) => {
    const [promos, setPromos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const data = await apiRequest<{ promos: any[] }>('/pricing/available', { auth: false }); // auth false because promos might be public? Actually backend allows user info
                if (data.promos) setPromos(data.promos);
            } catch (e) {
                console.log("Failed to load promos in modal", e);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    if (loading) return <ActivityIndicator color={Colors.primary} />;

    if (promos.length === 0) return <Text style={{ color: '#9CA3AF', fontSize: 12 }}>No active promotions found.</Text>;

    return (
        <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
            {promos.map(p => (
                <TouchableOpacity
                    key={p.id}
                    style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        padding: 12, backgroundColor: '#EFF6FF', borderRadius: 8, marginBottom: 8
                    }}
                    onPress={() => onSelect(p.code)}
                >
                    <View>
                        <Text style={{ fontWeight: 'bold', color: '#1E40AF' }}>{p.code}</Text>
                        <Text style={{ fontSize: 10, color: '#60A5FA' }}>{p.discount_percent}% OFF</Text>
                    </View>
                    <Ticket size={16} color="#3B82F6" />
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },

    // Map & Background
    mapLayer: { position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.5, backgroundColor: '#EFF6FF' },
    mapBackground: { flex: 1, backgroundColor: '#EEF2FF' },
    street: { position: 'absolute', backgroundColor: '#fff', opacity: 0.5 },
    backButton: { position: 'absolute', top: 60, left: 20, backgroundColor: '#fff', padding: 10, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, elevation: 5 }, // 👽 02-02-2026: Increased top to 60 for better status bar clearance

    // Fake Route Line
    routeLineContainer: { position: 'absolute', top: '30%', left: '20%', width: '60%', height: 100 },
    routeLine: { position: 'absolute', top: 10, left: 10, width: 2, height: 100, backgroundColor: '#1e1e1e', opacity: 0.2, transform: [{ rotate: '45deg' }] }, // Abstract line
    routeDotPickup: { position: 'absolute', top: 0, left: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#fff' },
    routeDotDropoff: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#fff' },


    // Bottom Sheet
    bottomSheet: {
        position: 'absolute', bottom: 0, width: width, height: height * 0.65,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingTop: 24, paddingHorizontal: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20
    },

    // Route Info Header
    routeInfo: { marginBottom: 16 },
    routeNode: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    addressText: { fontSize: 16, fontWeight: '600', color: '#1e1e1e', flex: 1 },
    verticalLineWrapper: { paddingLeft: 4.5, height: 16 }, // Center line with dot
    verticalLine: { width: 1, height: '100%', backgroundColor: '#E5E7EB' },

    divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e1e1e', marginBottom: 16 },

    // Ride Cards
    ridesList: { flex: 1 },
    rideCard: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 16, paddingHorizontal: 16,
        borderRadius: 16, marginBottom: 12,
        borderWidth: 1.5, borderColor: '#F3F4F6', backgroundColor: '#fff'
    },
    rideCardSelected: { borderColor: Colors.primary, backgroundColor: '#F0F9FF' },

    rideIconWrapper: { width: 110, height: 75, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    rideImage: { width: '100%', height: '100%' },

    rideInfo: { flex: 1 },
    rideName: { fontSize: 18, fontWeight: 'bold', color: '#1e1e1e' },
    personRow: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#F3F4F6', paddingHorizontal: 4, borderRadius: 4 },
    personText: { fontSize: 10, color: '#6B7280' },
    rideEta: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    promoTag: { marginTop: 4, backgroundColor: '#DCFCE7', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    promoText: { color: '#166534', fontSize: 10, fontWeight: 'bold' },

    priceSection: { alignItems: 'flex-end' },
    currency: { fontSize: 12, fontWeight: '600', color: '#1e1e1e', marginRight: 2 },
    price: { fontSize: 18, fontWeight: 'bold', color: '#1e1e1e' },
    oldPrice: { fontSize: 12, color: '#9CA3AF', textDecorationLine: 'line-through' },

    // Footer
    footer: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16, paddingBottom: 20 },
    paymentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    paymentSelect: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    paymentText: { fontSize: 16, fontWeight: '600', color: '#1e1e1e' },
    promoSelect: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    promoLinkText: { fontSize: 16, fontWeight: '600', color: Colors.primary },

    requestButton: { borderRadius: 16, overflow: 'hidden' },
    gradientBtn: { height: 56, alignItems: 'center', justifyContent: 'center' },
    requestButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: width * 0.85, backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: '#1e1e1e' },
    modalSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20, textAlign: 'center' },

    paymentOption: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    paymentOptionSelected: { backgroundColor: '#F9FAFB' },
    optionIcon: { marginRight: 16 },
    optionText: { fontSize: 18, fontWeight: '500', color: '#1e1e1e', flex: 1 },
    selectedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },

    promoInput: { width: '100%', height: 50, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#1e1e1e', marginBottom: 16, backgroundColor: '#F9FAFB' },
    applyButton: { width: '100%', backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
    applyButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    cancelButton: { padding: 8 },
    cancelButtonText: { color: '#6B7280', fontSize: 16, fontWeight: '500' },

    // Markers
    customMarkerPickup: { width: 30, height: 30, backgroundColor: '#fff', borderRadius: 15, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
    dotPickupInner: { width: 14, height: 14, backgroundColor: '#10B981', borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
    customMarkerDest: { alignItems: 'center', justifyContent: 'center' },

    // Stats
    tripStats: { alignSelf: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 12 },
    tripStatsText: { fontSize: 13, fontWeight: '600', color: '#374151' },
});
