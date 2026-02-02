import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { Colors } from '../../constants/Colors';
import { ArrowLeft, MapPin, Calendar, CircleDollarSign } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
// Date formatting helper
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const { width } = Dimensions.get('window');

// Mock Data until we have real trips
const MOCK_TRIPS = [
    { id: '1', date: new Date().toISOString(), pickup: 'Cairo Festival City', dropoff: 'Maadi', price: 150, status: 'completed' },
    { id: '2', date: new Date(Date.now() - 86400000).toISOString(), pickup: 'Nasr City', dropoff: 'Heliopolis', price: 85, status: 'cancelled' },
    { id: '3', date: new Date(Date.now() - 172800000).toISOString(), pickup: 'Zamalek', dropoff: 'Dokki', price: 60, status: 'completed' },
];

export default function DriverHistoryScreen() {
    const navigation = useNavigation<any>();
    const [trips, setTrips] = useState<any[]>([]);

    useEffect(() => {
        fetchTrips();
    }, []);

    const fetchTrips = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('trips')
                .select('*')
                .eq('driver_id', user.id)
                .order('created_at', { ascending: false });

            if (data && data.length > 0) {
                setTrips(data);
            } else {
                setTrips(MOCK_TRIPS); // Fallback to mock for demo
            }
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.date}>{formatDate(item.date || item.created_at || new Date().toISOString())}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'completed' ? '#DCFCE7' : '#FEE2E2' }]}>
                    <Text style={[styles.statusText, { color: item.status === 'completed' ? '#166534' : '#991B1B' }]}>
                        {item.status?.toUpperCase() || 'COMPLETED'}
                    </Text>
                </View>
            </View>

            <View style={styles.locationRow}>
                <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.locationText}>{item.pickup || item.pickup_address || 'Unknown Pickup'}</Text>
            </View>

            <View style={styles.connectorLine} />

            <View style={styles.locationRow}>
                <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.locationText}>{item.dropoff || item.dest_address || 'Unknown Dropoff'}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
                <Text style={styles.priceLabel}>Earnings</Text>
                <Text style={styles.priceValue}>EGP {item.price}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1e1e1e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Trip History</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                data={trips}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Calendar size={48} color={Colors.textSecondary} />
                        <Text style={styles.emptyText}>No trips yet</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#E5E7EB'
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e1e1e' },

    listContent: { padding: 20 },
    card: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    date: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    statusText: { fontSize: 10, fontWeight: 'bold' },

    locationRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    locationText: { fontSize: 15, color: '#111827', fontWeight: '500' },
    connectorLine: {
        height: 16, width: 2, backgroundColor: '#E5E7EB',
        marginLeft: 4, marginVertical: 0
    },

    divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },

    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    priceLabel: { fontSize: 14, color: Colors.textSecondary },
    priceValue: { fontSize: 18, fontWeight: 'bold', color: Colors.primary },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 12 },
    emptyText: { fontSize: 16, color: Colors.textSecondary }
});
