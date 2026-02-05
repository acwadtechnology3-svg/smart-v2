import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { X, MapPin, Locate } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { useLanguage } from '../../context/LanguageContext';
import * as Location from 'expo-location';

interface MapPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onLocationSelected: (address: string, lat: number, lng: number) => void;
    title: string;
}

const { width, height } = Dimensions.get('window');

export default function MapPickerModal({ visible, onClose, onLocationSelected, title }: MapPickerModalProps) {
    const { t, isRTL } = useLanguage();
    const mapRef = useRef<MapView>(null);
    const [selectedLocation, setSelectedLocation] = useState({
        latitude: 31.2001,
        longitude: 29.9187,
    });
    const [markerCoordinate, setMarkerCoordinate] = useState(selectedLocation);
    const [loading, setLoading] = useState(false);

    const handleMapPress = (event: any) => {
        const coordinate = event.nativeEvent.coordinate;
        setMarkerCoordinate(coordinate);
    };

    const handleCenterLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;

            mapRef.current?.animateCamera({
                center: { latitude, longitude },
                pitch: 45,
                heading: 0,
                altitude: 1000,
                zoom: 17
            });
            setMarkerCoordinate({ latitude, longitude });
        } catch (error) {
            console.log(error);
        }
    };

    const handleConfirm = async () => {
        setLoading(true);
        try {
            // Reverse geocode to get address
            const geocode = await Location.reverseGeocodeAsync({
                latitude: markerCoordinate.latitude,
                longitude: markerCoordinate.longitude
            });

            const address = geocode[0]
                ? `${geocode[0].street || ''}, ${geocode[0].city || ''}`.trim()
                : `${markerCoordinate.latitude.toFixed(4)}, ${markerCoordinate.longitude.toFixed(4)}`;

            onLocationSelected(address, markerCoordinate.latitude, markerCoordinate.longitude);
            onClose();
        } catch (error) {
            // Fallback to coordinates
            const address = `${markerCoordinate.latitude.toFixed(4)}, ${markerCoordinate.longitude.toFixed(4)}`;
            onLocationSelected(address, markerCoordinate.latitude, markerCoordinate.longitude);
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{title}</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Map */}
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={{
                        latitude: selectedLocation.latitude,
                        longitude: selectedLocation.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                    initialCamera={{
                        center: {
                            latitude: selectedLocation.latitude,
                            longitude: selectedLocation.longitude,
                        },
                        pitch: 45,
                        heading: 0,
                        altitude: 1000,
                        zoom: 17
                    }}
                    pitchEnabled={true}
                    onPress={handleMapPress}
                    showsUserLocation
                    showsMyLocationButton={false} // Custom button used below
                >
                    <UrlTile
                        urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                        maximumZ={19}
                        flipY={false}
                    />
                    <Marker coordinate={markerCoordinate}>
                        <View style={styles.markerContainer}>
                            <MapPin size={48} color={Colors.primary} fill={Colors.primary} />
                            <View style={styles.markerShadow} />
                        </View>
                    </Marker>
                </MapView>

                {/* Floating Controls */}
                <View style={styles.floatingControls}>
                    {/* My Location FAB */}
                    <TouchableOpacity
                        style={styles.locationFab}
                        onPress={handleCenterLocation}
                        activeOpacity={0.8}
                    >
                        <Locate size={24} color={Colors.primary} />
                    </TouchableOpacity>

                    {/* Confirm Button */}
                    <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={handleConfirm}
                        activeOpacity={0.8}
                        disabled={loading}
                    >
                        <Text style={styles.confirmButtonText}>
                            {loading ? (isRTL ? 'جاري التأكيد...' : 'Confirming...') : (isRTL ? 'تأكيد الموقع' : 'Confirm Location')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    map: {
        flex: 1,
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerShadow: {
        width: 10,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(0,0,0,0.3)',
        marginTop: -2,
    },
    floatingControls: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        alignItems: 'center',
    },
    locationFab: {
        alignSelf: 'flex-end',
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 8,
    },
    confirmButton: {
        width: '100%',
        backgroundColor: Colors.primary,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 10,
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
});
