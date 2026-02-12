import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Keyboard, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Clock, MapPin, Plus, Flame, Home, Briefcase, Star } from 'lucide-react-native';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';
import { searchPlaces } from '../../services/mapService';
import * as Location from 'expo-location';
import { useLanguage } from '../../context/LanguageContext';

type SearchLocationScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SearchLocation'>;
type SearchLocationScreenRouteProp = RouteProp<RootStackParamList, 'SearchLocation'>;

const MOCK_PLACES = [
    { id: '1', name: '2Q44+9QV', address: '2Q44+9QV, Ikingi Mariout (East & West), Amriya', icon: 'clock' },
    { id: '2', name: '3 Malwa', address: '3 Malwa Al Ibrahimiyah Bahri WA Sidi Gaber', icon: 'flame' },
    { id: '3', name: 'Water Station Mosque', address: 'Ezbet El-Nozha Sidi Gaber Alexandria', icon: 'flame' },
    { id: '4', name: 'Banque Du Cairo', address: 'Sidi Gaber Sidi Gaber Alexandria Governorate', icon: 'flame' },
    { id: '5', name: 'Mostafa Kamel', address: 'Mostafa Kamel Ezbet Saad Sidi Gaber', icon: 'flame' },
];

export default function SearchLocationScreen() {
    const navigation = useNavigation<SearchLocationScreenNavigationProp>();
    const route = useRoute<SearchLocationScreenRouteProp>();
    const { t, isRTL } = useLanguage();

    // RTL Logic
    const isSimulating = isRTL !== I18nManager.isRTL;
    const flexDirection = isSimulating ? 'row-reverse' : 'row';
    const textAlign = isRTL ? 'right' : 'left';
    const lineStyle = isSimulating ? { right: 11 } : { left: 11 };
    const iconMargin = isRTL ? { marginLeft: 16, marginRight: 0 } : { marginRight: 16, marginLeft: 0 };

    const [pickup, setPickup] = useState('Current Location'); // Default to "Current Location" text
    const [destination, setDestination] = useState('');
    const [activeField, setActiveField] = useState<'pickup' | 'destination'>('destination');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchCache, setSearchCache] = useState<Record<string, any[]>>({});

    const pickupRef = useRef<TextInput | null>(null);
    const destinationRef = useRef<TextInput | null>(null);

    // Handle return from LocationPicker
    useEffect(() => {
        if (route.params?.selectedAddress) {
            const { selectedAddress, selectedCoordinates, field } = route.params;

            // Prepare coordinate data
            const coords = selectedCoordinates
                ? { lat: selectedCoordinates.latitude, lng: selectedCoordinates.longitude }
                : undefined;
            const placeData = { address: selectedAddress, ...coords };

            // If we have a return screen, return immediately with the data
            if (route.params.returnScreen) {
                const targetField = field || 'destination';
                navigation.navigate(route.params.returnScreen as any, {
                    // Start with existing values to prevent overwriting
                    pickup: route.params.currentPickup,
                    destination: route.params.currentDest,
                    // Apply new selection
                    [targetField]: placeData
                });
                return;
            }

            if (field === 'pickup') {
                setPickup(selectedAddress);
                setActiveField('destination');
                setTimeout(() => destinationRef.current?.focus(), 500);
            } else {
                setDestination(selectedAddress);

                const destCoords: [number, number] | undefined = selectedCoordinates
                    ? [selectedCoordinates.longitude, selectedCoordinates.latitude]
                    : undefined;

                navigation.navigate('TripOptions', {
                    pickup: pickup,
                    destination: selectedAddress,
                    destinationCoordinates: destCoords
                });
            }
        }
    }, [route.params]);
    // Note: route.params changes when we navigate back TO this screen with new params? 
    // Yes, if we use navigate 'SearchLocation'. If we use goBack() we need context or route.params injection.
    // My LocationPicker uses navigation.navigate('SearchLocation', params). This updates route params.

    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

    // Get proximity location on mount
    useEffect(() => {
        (async () => {
            try {
                const loc = await Location.getCurrentPositionAsync({});
                setUserLocation([loc.coords.longitude, loc.coords.latitude]);
            } catch (e) {
                console.log("Error getting location for search proximity", e);
            }
        })();
    }, []);

    // Debounce search
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleSearch = (text: string) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (text.length < 3) {
            setResults([]);
            return;
        }

        if (searchCache[text]) {
            setResults(searchCache[text]);
            return;
        }

        setIsLoading(true);
        timeoutRef.current = setTimeout(async () => {
            try {
                // Priority search for Egypt with proximity
                // If we are in "TravelRequest" mode, prioritize "place" (cities) over addresses
                const isIntercity = route.params?.returnScreen === 'TravelRequest';
                const searchTypes = isIntercity ? 'place,locality' : undefined;

                const places = await searchPlaces(text, userLocation || undefined, searchTypes);

                // Save to cache
                setSearchCache(prev => ({ ...prev, [text]: places }));
                setResults(places);
            } finally {
                setIsLoading(false);
            }
        }, 700); // Increased debounce to 700ms to reduce API tokens/costs
    };

    useEffect(() => {
        if (route.params?.field) {
            setActiveField(route.params.field);
            if (route.params.field === 'pickup') {
                if (pickup === 'Current Location') setPickup('');
                setTimeout(() => pickupRef.current?.focus(), 100);
            } else {
                setTimeout(() => destinationRef.current?.focus(), 100);
            }
        } else {
            const id = setTimeout(() => {
                destinationRef.current?.focus();
                setActiveField('destination');
            }, 100);
            return () => clearTimeout(id);
        }
    }, [route.params?.field]);

    const handleSelectPlace = (place: any) => {
        Keyboard.dismiss();

        // If clicking a result
        const selectedAddress = place.place_name || place.address || place.name;
        const coords = place.center ? { lat: place.center[1], lng: place.center[0] } : undefined;
        const placeData = { address: selectedAddress, ...coords };

        // If explicitly requested to return to a screen
        if (route.params?.returnScreen && activeField) {
            navigation.navigate(route.params.returnScreen as any, {
                [activeField]: placeData
            });
            return;
        }

        if (activeField === 'pickup') {
            setPickup(selectedAddress);
            // After picking pickup, jump to destination
            setActiveField('destination');
            // destinationRef.current?.focus(); // Focus managed by useEffect or logic
            setTimeout(() => destinationRef.current?.focus(), 100);
        } else {
            setDestination(selectedAddress);
            // Ready to Go!
            navigation.navigate('TripOptions', {
                pickup: pickup,
                destination: selectedAddress,
                destinationCoordinates: place.center // Mapbox returns center [lng, lat]
            });
        }
    };

    // ... (render)
    // Update FlatList data source
    const displayData = (destination.length > 0 && activeField === 'destination') || (pickup.length > 0 && activeField === 'pickup' && pickup !== 'Current Location')
        ? results
        : MOCK_PLACES;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.contentContainer}>
                {/* Header & Inputs Block */}
                <View style={[styles.topSection, { flexDirection }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#1e1e1e" style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
                    </TouchableOpacity>

                    <View style={styles.inputCluster}>
                        {/* Connecting Line */}
                        {!route.params?.returnScreen && <View style={[styles.connectingLine, lineStyle]} />}

                        {/* Pickup Input */}
                        {(!route.params?.returnScreen || activeField === 'pickup') && (
                            <View style={[styles.inputRow, { flexDirection }]}>
                                <View style={[styles.dot, styles.dotPickup, isRTL ? { marginLeft: 12, marginRight: 6 } : {}]} />
                                <View style={[styles.inputContainer, { flexDirection }]} pointerEvents="box-none">
                                    <TextInput
                                        ref={pickupRef}
                                        style={[styles.textInput, { textAlign }]}
                                        value={pickup}
                                        onChangeText={(text) => {
                                            setPickup(text);
                                            setActiveField('pickup');
                                            handleSearch(text);
                                        }}
                                        placeholder={activeField === 'pickup' ? "Enter Pickup Location" : "Current Location"}
                                        placeholderTextColor="#9CA3AF"
                                        onFocus={() => {
                                            setActiveField('pickup');
                                            if (pickup === 'Current Location') setPickup('');
                                        }}
                                        autoCorrect={false}
                                    />
                                    {pickup.length > 0 && (
                                        <TouchableOpacity
                                            onPress={() => setPickup('')}
                                            style={styles.clearButton}
                                        >
                                            <Text style={styles.clearButtonText}>✕</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )}

                        {!route.params?.returnScreen && <View style={{ height: 12 }} />}

                        {/* Destination Input */}
                        {(!route.params?.returnScreen || activeField === 'destination') && (
                            <View style={[styles.inputRow, { flexDirection }]}>
                                <View style={[styles.dot, styles.dotDest, isRTL ? { marginLeft: 12, marginRight: 6 } : {}]} />
                                <View style={[styles.inputContainer, { flexDirection }]} pointerEvents="box-none">
                                    <TextInput
                                        ref={destinationRef}
                                        style={[styles.textInput, { textAlign }]}
                                        value={destination}
                                        onChangeText={(text) => {
                                            setDestination(text);
                                            setActiveField('destination');
                                            handleSearch(text);
                                        }}
                                        placeholder="Where to?"
                                        placeholderTextColor="#9CA3AF"
                                        onFocus={() => setActiveField('destination')}
                                        autoCorrect={false}
                                    />
                                    {destination.length > 0 && (
                                        <TouchableOpacity
                                            onPress={() => {
                                                setDestination('');
                                                setResults([]);
                                            }}
                                            style={styles.clearButton}
                                        >
                                            <Text style={styles.clearButtonText}>✕</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )}
                        {isLoading && (
                            <View style={styles.loadingIndicator}>
                                <Text style={styles.loadingText}>Searching in Egypt...</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Map Button */}
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={styles.mapButton}
                        onPress={() => navigation.navigate('LocationPicker', {
                            field: activeField,
                            returnScreen: route.params?.returnScreen,
                            currentPickup: route.params?.currentPickup,
                            currentDest: route.params?.currentDest
                        })}
                    >
                        <View style={styles.mapIconCircle}>
                            <MapPin size={16} color="#4F46E5" />
                        </View>
                        <Text style={styles.mapButtonText}>Choose on map</Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Access */}
                <View style={styles.quickAccessRow}>
                    <TouchableOpacity style={styles.quickBtn} onPress={() => handleSelectPlace({ name: 'Home' })}>
                        <Home size={18} color="#4B5563" />
                        <Text style={styles.quickBtnText}>Home</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickBtn} onPress={() => handleSelectPlace({ name: 'Work' })}>
                        <Briefcase size={18} color="#4B5563" />
                        <Text style={styles.quickBtnText}>Work</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickBtn} onPress={() => handleSelectPlace({ name: 'Favorites' })}>
                        <Star size={18} color="#4B5563" />
                        <Text style={styles.quickBtnText}>Favorites</Text>
                    </TouchableOpacity>
                </View>

                {/* Results List */}
                <FlatList
                    keyboardShouldPersistTaps="handled"
                    data={displayData}
                    keyExtractor={(item) => item.id || Math.random().toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.resultItem, { flexDirection }]}
                            onPress={() => handleSelectPlace(item)}
                        >
                            <View style={[styles.iconContainer, iconMargin]}>
                                <MapPin size={20} color="#1e1e1e" />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={[styles.placeName, { textAlign }]}>{item.text || item.name}</Text>
                                <Text style={[styles.placeAddress, { textAlign }]} numberOfLines={2}>
                                    {item.place_name || item.address}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    contentContainer: { flex: 1 },

    topSection: {
        // flexDirection handled dynamically
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingTop: 50, // 👽 02-02-2026: Increased top padding (was 16)
        paddingBottom: 8,
    },
    backButton: {
        marginTop: 12, // Align with the first input roughly
        marginRight: 16,
        padding: 4,
    },
    inputCluster: {
        flex: 1,
        position: 'relative', // For the connecting line
    },
    connectingLine: {
        position: 'absolute',
        left: 11, // Center of the 22px dot area? roughly. Dot is 8 or 10.
        top: 24,
        bottom: 24,
        width: 1,
        backgroundColor: '#E5E7EB', // Faint line
        zIndex: -1,
    },
    inputRow: {
        // flexDirection handled dynamically
        alignItems: 'center',
        // zIndex removed to prevent stacking issues
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 12,
        marginLeft: 6,
    },
    dotPickup: { backgroundColor: '#4F46E5' },
    dotDest: { backgroundColor: '#4F46E5' },

    inputContainer: {
        flex: 1,
        height: 48,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#1e1e1e',
        fontWeight: '500',
        padding: 0,
        margin: 0,
        height: 46,
    },
    clearButton: {
        padding: 4,
        marginLeft: 4,
    },
    clearButtonText: {
        color: '#9CA3AF',
        fontSize: 16,
        fontWeight: '600',
    },

    actionRow: {
        flexDirection: 'row',
        paddingHorizontal: 56, // Indent to match inputs
        paddingBottom: 16,
        paddingTop: 8, // Added top padding
    },
    mapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    mapIconCircle: { marginRight: 8 }, // Just the icon directly is fine too
    mapButtonText: { color: '#4F46E5', fontWeight: '600', fontSize: 14 },

    quickAccessRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        justifyContent: 'space-around', // Changed to space-around for better spacing
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    quickBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
    quickBtnText: { color: '#4B5563', fontSize: 14, fontWeight: '500' },

    listContent: { paddingBottom: 20 },
    resultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24 }, // increased horizontal padding
    iconContainer: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6',
        alignItems: 'center', justifyContent: 'center', marginRight: 16
    },
    textContainer: { flex: 1 },
    placeName: { fontSize: 16, fontWeight: '600', color: '#1e1e1e', marginBottom: 4 },
    placeAddress: { fontSize: 13, color: '#9CA3AF' },

    mapPinItem: { flexDirection: 'row', alignItems: 'center', padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    mapPinCircle: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6',
        alignItems: 'center', justifyContent: 'center', marginRight: 16
    },
    mapPinText: { fontSize: 16, color: '#1e1e1e', fontWeight: '500' },
    loadingIndicator: {
        paddingTop: 8,
        paddingLeft: 28,
    },
    loadingText: {
        fontSize: 12,
        color: '#4F46E5',
        fontStyle: 'italic',
    }
});
