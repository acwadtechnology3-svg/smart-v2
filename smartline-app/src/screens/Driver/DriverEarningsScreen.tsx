import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../constants/Colors';
import { ArrowLeft, Wallet, TrendingUp, Calendar } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Dimensions } from "react-native";
import { apiRequest } from '../../services/backend';
import { useLanguage } from '../../context/LanguageContext';

const screenWidth = Dimensions.get("window").width;

export default function DriverEarningsScreen() {
    const navigation = useNavigation<any>();
    const { t, isRTL } = useLanguage();
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [todayEarnings, setTodayEarnings] = useState(0);
    const [tripCount, setTripCount] = useState(0);

    useEffect(() => {
        fetchEarnings();
    }, []);

    const fetchEarnings = async () => {
        try {
            const [walletData, tripsData] = await Promise.all([
                apiRequest<{ balance: number, today_earnings: number }>('/wallet/summary'),
                apiRequest<{ trips: any[] }>('/trips/driver/history')
            ]);

            setTotalEarnings(walletData.balance || 0);
            setTodayEarnings(walletData.today_earnings || 0);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const todayTrips = (tripsData.trips || []).filter((t: any) =>
                new Date(t.created_at) >= today && t.status === 'completed'
            );

            setTripCount(todayTrips.length);
        } catch (error) {
            console.error('Error fetching earnings:', error);
        }
    };

    const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' } as any;

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header, rowStyle]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }]}>
                    <ArrowLeft size={24} color="#1e1e1e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('earnings')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Total Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>{t('totalBalance')}</Text>
                    <Text style={styles.balanceValue}>EGP {totalEarnings.toFixed(2)}</Text>
                    <View style={styles.payoutRow}>
                        <Text style={styles.payoutText}>{t('availableWithdrawal')}</Text>
                    </View>
                </View>

                {/* Quick Stats Grid */}
                <View style={[styles.statsGrid, rowStyle]}>
                    <View style={styles.statBox}>
                        <View style={[styles.iconBg, { backgroundColor: '#DBEAFE' }]}>
                            <TrendingUp size={20} color="#2563EB" />
                        </View>
                        <Text style={styles.statLabel}>{t('today')}</Text>
                        <Text style={styles.statValue}>EGP {todayEarnings}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <View style={[styles.iconBg, { backgroundColor: '#DCFCE7' }]}>
                            <Wallet size={20} color="#166534" />
                        </View>
                        <Text style={styles.statLabel}>{t('trips')}</Text>
                        <Text style={styles.statValue}>{tripCount}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <View style={[styles.iconBg, { backgroundColor: '#FAE8FF' }]}>
                            <Calendar size={20} color="#9333EA" />
                        </View>
                        <Text style={styles.statLabel}>{t('hours')}</Text>
                        <Text style={styles.statValue}>5.5</Text>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#E5E7EB'
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e1e1e' },

    content: { padding: 20 },

    balanceCard: {
        backgroundColor: Colors.primary,
        borderRadius: 20, padding: 24, marginBottom: 24,
        alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8
    },
    balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
    balanceValue: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginVertical: 8 },
    payoutRow: { marginTop: 8, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
    payoutText: { color: '#fff', fontSize: 12 },

    statsGrid: { justifyContent: 'space-between', marginBottom: 24 },
    statBox: {
        flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 4,
        alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2
    },
    iconBg: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    statLabel: { fontSize: 12, color: Colors.textSecondary },
    statValue: { fontSize: 16, fontWeight: 'bold', color: '#111827' },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 }
});
