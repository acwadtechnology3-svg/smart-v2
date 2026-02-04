import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Polygon, Marker, Callout } from 'react-native-maps';
import { apiRequest } from '../services/backend';

interface SurgeZone {
    id: string;
    center_lat: number;
    center_lng: number;
    radius: number;
    multiplier: number;
    label: string;
}

// Function to generate Polygon coordinates for a hexagon (honeycomb)
const getHexagonCoords = (lat: number, lng: number, radiusMeters: number) => {
    const coords = [];
    const R = 6378137; // Earth's radius in meters
    const dLat = radiusMeters / R;
    const dLng = radiusMeters / (R * Math.cos(Math.PI * lat / 180));

    for (let i = 0; i < 6; i++) {
        const theta = (Math.PI / 3) * i; // 60 degrees in radians
        // Offset
        const dy = Math.sin(theta) * dLat;
        const dx = Math.cos(theta) * dLng;

        // Convert back to degrees
        const latPoint = lat + (dy * 180 / Math.PI);
        const lngPoint = lng + (dx * 180 / Math.PI);

        coords.push({ latitude: latPoint, longitude: lngPoint });
    }
    return coords;
};

export default function SurgeMapLayer() {
    const [zones, setZones] = useState<SurgeZone[]>([]);

    useEffect(() => {
        const fetchSurgeZones = async () => {
            try {
                // Fetch active zones
                const response = await apiRequest<{ zones: SurgeZone[] }>('/surge/active', { auth: false });
                if (response && response.zones) {
                    setZones(response.zones);
                }
            } catch (e) {
                console.error('Failed to fetch surge zones', e);
            }
        };

        fetchSurgeZones();

        // Refresh every 5 minutes
        const interval = setInterval(fetchSurgeZones, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (zones.length === 0) return null;

    return (
        <>
            {zones.map(zone => (
                <React.Fragment key={zone.id}>
                    <Polygon
                        coordinates={getHexagonCoords(zone.center_lat, zone.center_lng, zone.radius)}
                        fillColor="rgba(249, 115, 22, 0.25)" // Orange with opacity
                        strokeColor="#ea580c"
                        strokeWidth={2}
                        zIndex={10}
                    />
                    {/* Multiplier Label Marker */}
                    <Marker
                        coordinate={{ latitude: zone.center_lat, longitude: zone.center_lng }}
                        zIndex={11}
                        anchor={{ x: 0.5, y: 0.5 }}
                    >
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>⚡ {zone.multiplier}x</Text>
                        </View>
                    </Marker>
                </React.Fragment>
            ))}
        </>
    );
}

const styles = StyleSheet.create({
    badge: {
        backgroundColor: '#fff',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#ea580c',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4
    },
    badgeText: {
        fontWeight: '700',
        color: '#ea580c',
        fontSize: 13
    }
});
