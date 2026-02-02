import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView, Dimensions, ActivityIndicator } from 'react-native';
import MapView, { UrlTile, Region } from 'react-native-maps';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';
import axios from 'axios';

type LocationPickerNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LocationPicker'>;
type LocationPickerRouteProp = RouteProp<RootStackParamList, 'LocationPicker'>;

const { width, height } = Dimensions.get('window');
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1Ijoic2FsYWhlenphdDEyMCIsImEiOiJjbWwyem4xMHIwaGFjM2NzYmhtNDNobmZvIn0.Q5Tm9dtAgsgsI84y4KWTUg';

export default function LocationPickerScreen() {
    const navigation = useNavigation<LocationPickerNavigationProp>();
    const route = useRoute<LocationPickerRouteProp>();
    const { field } = route.params;

    const [region, setRegion] = useState<Region>({
        latitude: 30.0444, // Cairo default
        longitude: 31.2357,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });
    const [address, setAddress] = useState<string>('Loading...');
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);

    // Get current location on mount
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            let location = await Location.getCurrentPositionAsync({});
            setRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        })();
    }, []);

    // Reverse Geocoding when region changes (debounced?)
    // Actually, onRegionChangeComplete is better.
    const onRegionChangeComplete = async (newRegion: Region) => {
        setRegion(newRegion);
        setIsDragging(false);
        fetchAddress(newRegion.latitude, newRegion.longitude);
    };

    const fetchAddress = async (lat: number, lng: number) => {
        setLoading(true);
        try {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=address,poi,neighborhood`;
            const response = await axios.get(url);
            if (response.data.features && response.data.features.length > 0) {
                setAddress(response.data.features[0].place_name);
            } else {
                setAddress('Unknown location');
            }
        } catch (error) {
            console.error(error);
            setAddress('Error fetching address');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        // Navigate back to SearchLocation with params
        // We use 'navigate' to merge params into existing screen in stack if it exists, or push new if not. 
        // Ideally we used navigation.goBack() but we need to pass data.
        // React Navigation 6: navigate({ name: 'SearchLocation', params: { ... }, merge: true })
        navigation.navigate('SearchLocation', {
            selectedAddress: address,
            selectedCoordinates: { latitude: region.latitude, longitude: region.longitude },
            field: field
        });
    };

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                region={region}
                onRegionChange={() => setIsDragging(true)}
                onRegionChangeComplete={onRegionChangeComplete}
                userInterfaceStyle="light"
            >
                <UrlTile
                    urlTemplate={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_ACCESS_TOKEN}`}
                    maximumZ={19}
                    flipY={false}
                    tileSize={256}
                />
            </MapView>

            <View style={styles.centerMarkerContainer} pointerEvents="none">
                <MapPin size={40} color={Colors.primary} fill={Colors.primary} />
                <View style={styles.markerDot} />
            </View>

            {/* Header Overlay */}
            <SafeAreaView style={styles.header} pointerEvents="box-none">
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color="#1e1e1e" />
                </TouchableOpacity>
            </SafeAreaView>

            {/* Bottom Sheet for confirmation */}
            <View style={styles.bottomSheet}>
                <Text style={styles.label}>{field === 'pickup' ? 'Pick up location' : 'Destination'}</Text>

                <View style={styles.addressContainer}>
                    {loading ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                        <Text style={styles.addressText} numberOfLines={2}>{address}</Text>
                    )}
                </View>

                <TouchableOpacity
                    style={[styles.confirmButton, loading && styles.disabledButton]}
                    onPress={handleConfirm}
                    disabled={loading}
                >
                    <Text style={styles.confirmButtonText}>Confirm Location</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    map: { flex: 1 },
    header: { position: 'absolute', top: 0, left: 0, right: 0, padding: 16 },
    backButton: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3
    },
    centerMarkerContainer: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 40 // Adjust for pin height so the tip is at center
    },
    markerDot: {
        width: 4, height: 4, borderRadius: 2, backgroundColor: '#000', marginTop: -4, opacity: 0.3
    },
    bottomSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10
    },
    label: { fontSize: 14, color: '#6B7280', marginBottom: 8, fontWeight: '600', textTransform: 'uppercase' },
    addressContainer: {
        minHeight: 50, justifyContent: 'center', marginBottom: 20,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 16
    },
    addressText: { fontSize: 18, color: '#111827', fontWeight: '600' },
    confirmButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 16, borderRadius: 12, alignItems: 'center'
    },
    disabledButton: { opacity: 0.7 },
    confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
