import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../constants/Colors';
import { ArrowLeft, Wallet, CreditCard, TrendingUp, Calendar } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
// import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from "react-native";

const screenWidth = Dimensions.get("window").width;

export default function DriverEarningsScreen() {
    const navigation = useNavigation<any>();
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [todayEarnings, setTodayEarnings] = useState(0);

    useEffect(() => {
        fetchEarnings();
    }, []);

    const fetchEarnings = async () => {
        // Here we would aggregate real data
        // Mocking for immediate UI feedback
        setTotalEarnings(4250.50);
        setTodayEarnings(450.00);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1e1e1e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Earnings</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Total Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Total Balance</Text>
                    <Text style={styles.balanceValue}>EGP {totalEarnings.toFixed(2)}</Text>
                    <View style={styles.payoutRow}>
                        <Text style={styles.payoutText}>Next payout: Tuesday</Text>
                    </View>
                </View>

                {/* Quick Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <View style={[styles.iconBg, { backgroundColor: '#DBEAFE' }]}>
                            <TrendingUp size={20} color="#2563EB" />
                        </View>
                        <Text style={styles.statLabel}>Today</Text>
                        <Text style={styles.statValue}>EGP {todayEarnings}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <View style={[styles.iconBg, { backgroundColor: '#DCFCE7' }]}>
                            <Wallet size={20} color="#166534" />
                        </View>
                        <Text style={styles.statLabel}>Trips</Text>
                        <Text style={styles.statValue}>12</Text>
                    </View>
                    <View style={styles.statBox}>
                        <View style={[styles.iconBg, { backgroundColor: '#FAE8FF' }]}>
                            <Calendar size={20} color="#9333EA" />
                        </View>
                        <Text style={styles.statLabel}>Hours</Text>
                        <Text style={styles.statValue}>5.5</Text>
                    </View>
                </View>

                {/* Chart Section - Temporarily disabled due to module resolution issues */}
                {/* 
                <Text style={styles.sectionTitle}>Weekly Performance</Text>
                <LineChart
                    data={{
                        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                        datasets: [{ data: [300, 450, 280, 520, 600, 400, 450] }]
                    }}
                    width={screenWidth - 40} 
                    height={220}
                    yAxisLabel="EGP "
                    yAxisInterval={1} 
                    chartConfig={{
                        backgroundColor: "#fff",
                        backgroundGradientFrom: "#fff",
                        backgroundGradientTo: "#fff",
                        decimalPlaces: 0, 
                        color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                        style: { borderRadius: 16 },
                        propsForDots: { r: "6", strokeWidth: "2", stroke: "#4F46E5" }
                    }}
                    bezier
                    style={{ marginVertical: 8, borderRadius: 16 }}
                /> 
                */}

                {/* Withdraw Button */}
                <TouchableOpacity style={styles.withdrawButton}>
                    <Text style={styles.withdrawText}>Request Payout</Text>
                </TouchableOpacity>

            </ScrollView>
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

    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    statBox: {
        flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 4,
        alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2
    },
    iconBg: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    statLabel: { fontSize: 12, color: Colors.textSecondary },
    statValue: { fontSize: 16, fontWeight: 'bold', color: '#111827' },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },

    withdrawButton: {
        backgroundColor: Colors.primary, borderRadius: 28, height: 56,
        alignItems: 'center', justifyContent: 'center', marginTop: 24,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
    },
    withdrawText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
