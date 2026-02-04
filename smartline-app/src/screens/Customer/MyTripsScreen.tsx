import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Clock } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import AppHeader from '../../components/AppHeader';
import { useLanguage } from '../../context/LanguageContext';

export default function MyTripsScreen() {
    const navigation = useNavigation();
    const { t, isRTL } = useLanguage();
    const [activeTab, setActiveTab] = useState<'active' | 'past'>('past');

    const PAST_TRIPS = [
        { id: '1', from: 'Cairo Festival City', to: 'Maadi', price: '45.50', date: 'Yesterday, 2:30 PM', status: 'completed' },
        { id: '2', from: 'Work', to: 'Home', price: '30.00', date: 'Jan 28, 6:00 PM', status: 'cancelled' },
    ];

    return (
        <View style={styles.container}>
            <AppHeader title={t('myTrips') || 'My Trips'} showBack={true} />

            <View style={[styles.tabs, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity style={[styles.tab, activeTab === 'active' && styles.activeTab]} onPress={() => setActiveTab('active')}>
                    <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>{t('active') || 'Active'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'past' && styles.activeTab]} onPress={() => setActiveTab('past')}>
                    <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>{t('past') || 'Past'}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {activeTab === 'active' ? (
                    <View style={styles.emptyState}>
                        <Clock size={48} color={Colors.textSecondary} />
                        <Text style={styles.emptyText}>{t('noActiveTrips') || 'No active trips'}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={PAST_TRIPS}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.tripCard}>
                                <View style={[styles.tripHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                    <Text style={styles.tripDate}>{item.date}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'completed' ? '#DCFCE7' : '#FEE2E2' }]}>
                                        <Text style={[styles.statusText, { color: item.status === 'completed' ? Colors.success : Colors.danger }]}>
                                            {item.status === 'completed' ? (t('completed') || 'Completed') : (t('cancelled') || 'Cancelled')}
                                        </Text>
                                    </View>
                                </View>
                                <View style={[styles.tripRoute, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                    <View style={[styles.dot, { marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }]} />
                                    <Text style={[styles.address, { textAlign: isRTL ? 'right' : 'left' }]}>{item.from}</Text>
                                </View>
                                <View style={[styles.line, { marginLeft: isRTL ? 0 : 3.5, marginRight: isRTL ? 3.5 : 0 }]} />
                                <View style={[styles.tripRoute, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                    <View style={[styles.square, { marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }]} />
                                    <Text style={[styles.address, { textAlign: isRTL ? 'right' : 'left' }]}>{item.to}</Text>
                                </View>
                                <View style={styles.divider} />
                                <Text style={[styles.price, { textAlign: isRTL ? 'left' : 'right' }]}>{t('currency') || 'EGP'} {item.price}</Text>
                            </View>
                        )}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    tabs: { flexDirection: 'row', paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: Colors.primary },
    tabText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '600' },
    activeTabText: { color: Colors.primary },
    content: { flex: 1, padding: 16 },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { marginTop: 16, color: Colors.textSecondary },
    tripCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
    tripHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    tripDate: { color: Colors.textSecondary, fontSize: 12 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    tripRoute: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success, marginRight: 12 },
    square: { width: 8, height: 8, backgroundColor: Colors.danger, marginRight: 12 },
    address: { fontSize: 14, color: Colors.textPrimary },
    line: { width: 1, height: 12, backgroundColor: Colors.border, marginLeft: 3.5, marginBottom: 8 },
    divider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
    price: { fontSize: 16, fontWeight: 'bold', color: Colors.textPrimary },
});
