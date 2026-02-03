import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { Menu, Scan, ShieldCheck, Search, MapPin, Gift, CarFront, Navigation } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';
import SideMenu from '../../components/SideMenu';
import { apiRequest } from '../../services/backend';

import { useLanguage } from '../../context/LanguageContext';

type CustomerHomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CustomerHome'>;

const { width, height } = Dimensions.get('window');

// Enhanced Mock Data for Cars
const DUMMY_CARS = [
    { id: 1, top: height * 0.25, left: width * 0.2, rotate: '45deg', delay: 0 },
    { id: 2, top: height * 0.35, left: width * 0.6, rotate: '120deg', delay: 500 },
    { id: 3, top: height * 0.30, left: width * 0.8, rotate: '-15deg', delay: 1000 },
    { id: 4, top: height * 0.45, left: width * 0.3, rotate: '90deg', delay: 1500 },
    { id: 5, top: height * 0.40, left: width * 0.7, rotate: '-45deg', delay: 200 },
    { id: 6, top: height * 0.20, left: width * 0.5, rotate: '180deg', delay: 800 },
];

export default function CustomerHomeScreen() {
    const navigation = useNavigation<CustomerHomeScreenNavigationProp>();
    const { t, isRTL } = useLanguage();
    const [isSideMenuVisible, setSideMenuVisible] = useState(false);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [currentAddress, setCurrentAddress] = useState<{ title: string, subtitle: string } | null>(null);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);

            // Check for active trip
            try {
                const history = await apiRequest<{ trips: any[] }>('/trips/passenger/history');
                if (history.trips && history.trips.length > 0) {
                    // Search through history for any active trip
                    const activeTrip = history.trips.find(t =>
                        ['requested', 'accepted', 'arrived', 'started'].includes(t.status)
                    );

                    if (activeTrip) {
                        console.log("Restoring passenger trip:", activeTrip.id, activeTrip.status);
                        if (activeTrip.status === 'requested') {
                            navigation.navigate('SearchingDriver', { tripId: activeTrip.id });
                        } else if (activeTrip.status === 'accepted') {
                            navigation.navigate('DriverFound', { tripId: activeTrip.id });
                        } else if (activeTrip.status === 'arrived' || activeTrip.status === 'started') {
                            navigation.navigate('OnTrip', { tripId: activeTrip.id });
                        }
                    }
                }
            } catch (e) {
                console.log("Error checking passenger active trip", e);
            }

            // 👽 02-02-2026: Added Reverse Geocoding to get real address
            try {
                const reverseGeocode = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });

                if (reverseGeocode.length > 0) {
                    const addr = reverseGeocode[0];
                    setCurrentAddress({
                        title: addr.street || addr.name || addr.district || "Current Location",
                        subtitle: `${addr.city || ''} ${addr.region || ''}`.trim() || "Locating..."
                    });
                }
            } catch (error) {
                console.log("Error fetching address:", error);
            }
        })();
    }, []);

    // Animation for pulse effect
    // 👽 02-02-2026: Commented out unused animation to improve performance
    // const pulseAnim = useRef(new Animated.Value(1)).current;

    // useEffect(() => {
    //     const anim = Animated.loop(
    //         Animated.sequence([
    //             Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
    //             Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
    //         ])
    //     );
    //     anim.start();
    //     return () => anim.stop();
    // }, []);

    const handleWhereToPress = () => {
        navigation.navigate('SearchLocation');
    };

    return (
        <View style={styles.container}>
            {/* --- MAP BACKGROUND LAYER --- */}
            {location ? (
                <MapView
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

                    {/* Cars Animation */}
                    {DUMMY_CARS.map(car => (
                        // Need to convert screen coords to map coords for cars? 
                        // For now, let's keep cars floating on top or remove them. 
                        // The prompt asks for "map api", implies real map. 
                        // Real map makes dummy cars hard to place without real lat/lng.
                        // I will COMMENT OUT dummy cars for now and rely on real map.
                        null
                    ))}
                </MapView>
            ) : (
                <View style={styles.mapLayer}>
                    <View style={styles.mapBackground} />
                    {/* Loading State or Fallback */}
                </View>
            )}


            {/* --- UI OVERLAY LAYER --- */}
            <SafeAreaView style={styles.overlayContainer} pointerEvents="box-none">

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.circleButton} onPress={() => setSideMenuVisible(true)}>
                        <Menu color="#1e1e1e" size={24} strokeWidth={2.5} />
                    </TouchableOpacity>

                    <View style={styles.locationHeader}>
                        <Text style={styles.locationHeaderTitle}>{currentAddress?.title || t('currentLocation')}</Text>
                        <Text style={styles.locationHeaderSubtitle}>{currentAddress?.subtitle || t('locating')}</Text>
                    </View>

                    <TouchableOpacity style={styles.circleButton}>
                        <Scan color="#1e1e1e" size={24} strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>

                {/* 👽 02-02-2026: Added Spacer for responsive layout, pushing bottom content down */}
                <View style={{ flex: 1 }} pointerEvents="none" />

                {/* Safety Shield - Floating */}
                <View style={styles.floatingUI} pointerEvents="box-none">
                    <TouchableOpacity style={styles.recenterButton}>
                        <Navigation color="#1e1e1e" size={24} fill="#1e1e1e" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.safetyPill} onPress={() => navigation.navigate('Safety', {})}>
                        <View style={styles.shieldIconBg}>
                            <ShieldCheck color="#fff" size={14} fill="#fff" />
                        </View>
                        <Text style={styles.safetyText}>{t('safetyCenter')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Bottom Sheet */}
                <View style={styles.bottomSheetContainer}>
                    <View style={styles.bottomSheet}>

                        <View style={styles.dragHandle} />

                        {/* Search Component */}
                        <TouchableOpacity style={styles.searchCard} onPress={handleWhereToPress}>
                            <View style={styles.searchIconBubble} />
                            <Text style={styles.searchPlaceholder}>{t('where_to')}</Text>
                        </TouchableOpacity>

                        {/* Location Pin Row */}
                        <View style={styles.addressRow}>
                            <View style={styles.pinDot} />
                            <Text style={styles.addressText} numberOfLines={1}>
                                {currentAddress ? `${currentAddress.title}, ${currentAddress.subtitle}` : t('fetchingLocation')}
                            </Text>
                        </View>

                        {/* Cards Grid */}
                        <View style={styles.gridContainer}>

                            {/* Main Promo Card */}
                            <TouchableOpacity style={styles.promoCardWrapper} onPress={() => navigation.navigate('Discounts')}>
                                <View style={styles.promoCardContent}>
                                    <View style={styles.iconRow}>
                                        <View style={styles.giftIconBox}>
                                            <Gift size={28} color="#fff" strokeWidth={2.5} />
                                            {/* Notification Badge */}
                                            <View style={styles.notificationBadge}>
                                                <Text style={styles.badgeText}>1</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.promoTexts}>
                                        <Text style={styles.promoTitle}>{t('exclusiveDiscounts')}</Text>
                                        <Text style={styles.promoSubtitle}>{t('dailyDiscounts')}</Text>
                                    </View>

                                    <View style={styles.clickButton}>
                                        <Text style={styles.clickText}>{t('clickHere')}</Text>
                                        <Text style={{ fontSize: 12 }}>👆</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {/* Secondary Options Column */}
                            <View style={styles.rightColumn}>
                                {/* Safety Box */}
                                <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('Safety', {})}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.featureTitle}>{t('enjoy')}</Text>
                                        <Text style={styles.featureSubHighlight}>{t('safestTrips')}</Text>
                                    </View>
                                    <ShieldCheck size={24} color="#4F46E5" fill="#fff" style={styles.featureIcon} />
                                </TouchableOpacity>

                                {/* Affordable Box */}
                                <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('SearchLocation')}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.featureTitle}>{t('enjoy')}</Text>
                                        <Text style={styles.featureTitle}>{t('affordable')}</Text>
                                        <Text style={styles.featureTitle}>{t('tripsWithUs')}</Text>
                                    </View>
                                    <CarFront size={24} color="#4F46E5" fill="#E0E7FF" style={styles.featureIcon} />
                                </TouchableOpacity>
                            </View>
                        </View>

                    </View>
                </View>
            </SafeAreaView>

            {/* Side Menu Component */}
            <SideMenu visible={isSideMenuVisible} onClose={() => setSideMenuVisible(false)} />
        </View>
    );
}

// Sub-component for animated simulated cars
const CarMarker = ({ top, left, rotate, delay }: any) => {
    const floatAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -5, duration: 1500, delay: delay, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 1500, useNativeDriver: true })
            ])
        );
        anim.start();
        return () => anim.stop();
    }, []);

    return (
        <Animated.View style={[styles.carMarker, { top, left, transform: [{ rotate }, { translateY: floatAnim }] }]}>
            <CarFront size={18} color="#4B5563" fill="#1e1e1e" />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EFF6FF' },

    // --- MAP STYLES ---
    mapLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#E5E7EB', overflow: 'hidden' },
    mapBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: '#F3F4F6' },
    waterBody: { position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: '#BFDBFE' },
    street: { position: 'absolute', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    park: { position: 'absolute', backgroundColor: '#DCFCE7', opacity: 0.6 },

    carMarker: {
        position: 'absolute', width: 32, height: 32,
        backgroundColor: '#fff', borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4,
        zIndex: 10
    },

    locationBeamContainer: {
        position: 'absolute', top: height * 0.35, left: width * 0.5 - 40,
        alignItems: 'center', justifyContent: 'center'
    },
    locationPulse: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(79, 70, 229, 0.2)', // Purple pulse
        position: 'absolute'
    },
    locationCenter: {
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: '#4F46E5', borderWidth: 3, borderColor: '#fff',
        zIndex: 20
    },
    beamCone: {
        width: 100, height: 100,
        position: 'absolute', top: 0,
        transform: [{ rotate: '45deg' }, { translateY: -40 }],
        opacity: 0.5
    },

    // --- UI OVERLAY STYLES ---
    overlayContainer: { flex: 1 },

    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        paddingHorizontal: 20, paddingTop: 40 // 👽 02-02-2026: Lowered header buttons as requested (was 10)
    },
    circleButton: {
        width: 44, height: 44,
        backgroundColor: '#fff', borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 5
    },
    locationHeader: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
    locationHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#1e1e1e' },
    locationHeaderSubtitle: { fontSize: 10, color: '#6B7280' },

    floatingUI: {
        marginBottom: -35,
        width: '100%',
        height: 50,
        zIndex: 10,
        // No flex needed for absolute children
    },
    safetyPill: {
        position: 'absolute',
        left: 20, // Force Left
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', paddingRight: 12, paddingLeft: 4, paddingVertical: 4,
        borderRadius: 20, gap: 8,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
    },
    shieldIconBg: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' },
    safetyText: { fontSize: 12, fontWeight: '700', color: '#1e1e1e' },
    recenterButton: {
        position: 'absolute',
        right: 20, // Force Right
        width: 44, height: 44,
        backgroundColor: '#fff', borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 5
    },

    bottomSheetContainer: {
        // flex: 1, justifyContent: 'flex-end', // 👽 02-02-2026: Removed flex: 1 as Spacer handles the positioning now
        marginBottom: -20
    }, // Extend below safe area slightly
    bottomSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, paddingBottom: 50,
        shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 20
    },
    dragHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },

    searchCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row', alignItems: 'center',
        gap: 16,
        marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
        borderWidth: 1, borderColor: '#F3F4F6'
    },
    searchIconBubble: {
        width: 12, height: 12, borderRadius: 6,
        backgroundColor: '#10B981', // Green dot for "Where to" / Pickup feel
        alignItems: 'center', justifyContent: 'center'
    },
    searchPlaceholder: { fontSize: 22, fontWeight: 'bold', color: '#111827' },

    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, marginBottom: 24 },
    pinDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9CA3AF' },
    addressText: { color: '#6B7280', fontSize: 13, fontWeight: '500' },

    gridContainer: { flexDirection: 'row', gap: 12, height: 200 },

    // Promo Card
    promoCardWrapper: {
        flex: 1.3, backgroundColor: '#fff',
        borderRadius: 20, overflow: 'hidden',
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 4,
        borderWidth: 1, borderColor: '#F3F4F6',
        padding: 16
    },
    promoCardContent: { flex: 1, justifyContent: 'space-between' },
    iconRow: { flexDirection: 'row', alignItems: 'flex-start' },
    giftIconBox: {
        width: 48, height: 48, borderRadius: 16,
        backgroundColor: '#4F46E5', // Purple Icon Bg
        alignItems: 'center', justifyContent: 'center',
    },
    notificationBadge: {
        position: 'absolute', top: -4, right: -4,
        backgroundColor: '#EF4444', borderRadius: 10,
        width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#fff'
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

    promoTexts: { marginTop: 4 },
    promoTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e1e1e', marginBottom: 4, lineHeight: 20 },
    promoSubtitle: { fontSize: 12, color: '#4F46E5', fontWeight: '500', lineHeight: 16 }, // Purple text

    clickButton: {
        backgroundColor: '#4F46E5', // Purple Button
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4
    },
    clickText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

    // Right Column
    rightColumn: { flex: 1, gap: 12 },
    featureCard: {
        flex: 1, backgroundColor: '#fff',
        borderRadius: 20, padding: 14,
        justifyContent: 'space-between',
        borderWidth: 1, borderColor: '#F3F4F6',
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
    },
    featureIcon: { alignSelf: 'flex-end', marginTop: 'auto' },
    featureTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e1e1e' },
    featureSubHighlight: { fontSize: 13, color: '#4F46E5', fontWeight: '500', marginTop: 2 }, // Purple text
});
