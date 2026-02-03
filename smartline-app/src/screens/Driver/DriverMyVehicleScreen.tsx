import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { Colors } from '../../constants/Colors';
import { ArrowLeft, Car, PenTool, AlertCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { apiRequest } from '../../services/backend';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

export default function DriverMyVehicleScreen() {
    const navigation = useNavigation<any>();
    const [vehicle, setVehicle] = useState<any>(null);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        // Try to load header/cache first for instant result
        try {
            const cached = await AsyncStorage.getItem('driver_vehicle_cache');
            if (cached) {
                setVehicle(JSON.parse(cached));
            }
        } catch (e) {
            // ignore cache error
        }

        // Then fetch fresh data
        fetchVehicleData();
    };

    const fetchVehicleData = async () => {
        try {
            const data = await apiRequest<{ driver: any }>('/drivers/me');
            if (data.driver) {
                setVehicle(data.driver);
                AsyncStorage.setItem('driver_vehicle_cache', JSON.stringify(data.driver));
            }
        } catch (e) {
            console.error(e);
            // On error, if we have no vehicle, show fallback
            if (!vehicle) setFallbackData();
        }
    };

    const setFallbackData = () => {
        setVehicle({
            vehicle_model: 'Toyota Corolla',
            vehicle_plate: 'ABC 123',
            vehicle_type: 'Sedan',
            vehicle_front_url: null
        });
    };

    if (!vehicle) return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1e1e1e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Vehicle</Text>
                <View style={{ width: 24 }} />
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text>Loading vehicle info...</Text>
            </View>
        </SafeAreaView>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1e1e1e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Vehicle</Text>
                <TouchableOpacity onPress={() => navigation.navigate('DriverChangeVehicle')}>
                    <PenTool size={20} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {vehicle.pendingRequest && (
                <View style={[styles.statusBanner, { backgroundColor: vehicle.pendingRequest.status === 'rejected' ? '#FEE2E2' : '#FEF3C7' }]}>
                    <Text style={[styles.statusBannerText, { color: vehicle.pendingRequest.status === 'rejected' ? '#DC2626' : '#D97706' }]}>
                        {vehicle.pendingRequest.status === 'rejected'
                            ? `Vehicle Change Rejected: ${vehicle.pendingRequest.admin_notes || 'Contact support'}`
                            : 'Vehicle Change Request Pending Approval'}
                    </Text>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.content}>

                {/* Vehicle Card */}
                <View style={styles.vehicleCard}>
                    <Image
                        source={{ uri: vehicle.vehicle_front_url || 'https://via.placeholder.com/400x200?text=No+Photo' }}
                        style={styles.vehicleImage}
                        resizeMode="cover"
                    />
                    <View style={styles.vehicleInfo}>
                        <Text style={styles.modelName}>{vehicle.vehicle_model}</Text>
                        <Text style={styles.plateNumber}>{vehicle.vehicle_plate}</Text>

                        <View style={styles.typeBadge}>
                            <Car size={14} color="#4F46E5" />
                            <Text style={styles.typeText}>{vehicle.vehicle_type}</Text>
                        </View>
                    </View>
                </View>

                {/* Documents Status */}
                <Text style={styles.sectionTitle}>Documents Status</Text>
                <View style={styles.docList}>
                    <DocumentRow
                        label="Driver License"
                        status={vehicle.license_front_url ? "Uploaded" : "Missing"}
                        expires={vehicle.license_front_url ? "View Document" : "Upload Required"}
                        isWarning={!vehicle.license_front_url}
                    />
                    <DocumentRow
                        label="Vehicle License"
                        status={vehicle.vehicle_license_front_url ? "Uploaded" : "Missing"}
                        expires={vehicle.vehicle_license_front_url ? "View Document" : "Upload Required"}
                        isWarning={!vehicle.vehicle_license_front_url}
                    />
                    <DocumentRow
                        label="National ID"
                        status={vehicle.id_front_url ? "Uploaded" : "Missing"}
                        expires={vehicle.id_front_url ? "View Document" : "Upload Required"}
                        isWarning={!vehicle.id_front_url}
                    />
                </View>

                {/* Info Note */}
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('DriverChangeVehicle')}
                >
                    <PenTool size={20} color="#fff" style={{ marginRight: 10 }} />
                    <Text style={styles.actionButtonText}>Request Vehicle Change</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const DocumentRow = ({ label, status, expires, isWarning }: any) => (
    <View style={styles.docRow}>
        <View>
            <Text style={styles.docLabel}>{label}</Text>
            <Text style={styles.docExpiry}>Expires: {expires}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isWarning ? '#FEF3C7' : '#DCFCE7' }]}>
            <Text style={[styles.statusText, { color: isWarning ? '#D97706' : '#166534' }]}>{status}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#E5E7EB'
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e1e1e' },

    content: { padding: 20 },

    vehicleCard: {
        backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', marginBottom: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4
    },
    vehicleImage: { width: '100%', height: 200 },
    vehicleInfo: { padding: 20 },
    modelName: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
    plateNumber: { fontSize: 16, color: Colors.textSecondary, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 12 },
    typeBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#EEF2FF', alignSelf: 'flex-start',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20
    },
    typeText: { color: '#4F46E5', fontWeight: '600', fontSize: 12 },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },

    docList: { backgroundColor: '#fff', borderRadius: 16, padding: 8, marginBottom: 24 },
    docRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6'
    },
    docLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
    docExpiry: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 12, fontWeight: '600' },

    noteBox: {
        flexDirection: 'row', gap: 12, backgroundColor: '#FFFBEB',
        padding: 16, borderRadius: 12, alignItems: 'flex-start'
    },
    noteText: { flex: 1, fontSize: 13, color: '#B45309', lineHeight: 20 },
    statusBanner: { padding: 12, alignItems: 'center', justifyContent: 'center' },
    statusBannerText: { fontSize: 14, fontWeight: 'bold' },
    actionButton: {
        flexDirection: 'row', backgroundColor: Colors.primary, padding: 16, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 40
    },
    actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
