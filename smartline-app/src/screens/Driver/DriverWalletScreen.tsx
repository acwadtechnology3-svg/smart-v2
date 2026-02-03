import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, Alert, Modal, TextInput, Linking, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Wallet, CreditCard, ArrowDownLeft, ArrowUpRight, Banknote, X } from 'lucide-react-native';
import { apiRequest } from '../../services/backend';
import { Colors } from '../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import Constants from 'expo-constants';

// Backend URL (Replace with actual IP/URL of backend)
// Assuming user is running locally, use their IP or typical pattern
const BACKEND_URL = Constants.expoConfig?.hostUri
    ? `http://${Constants.expoConfig.hostUri.split(':').shift()}:3000/api`
    : 'http://192.168.1.10:3000/api';

export default function DriverWalletScreen() {
    const navigation = useNavigation();
    const [balance, setBalance] = useState<number | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false); // Changed to false for instant display
    const [refreshing, setRefreshing] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Deposit State
    const [depositModalVisible, setDepositModalVisible] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositing, setDepositing] = useState(false);

    // Withdraw State
    const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawMethod, setWithdrawMethod] = useState<'wallet' | 'instapay'>('instapay');
    const [withdrawAccount, setWithdrawAccount] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);

    useEffect(() => {
        loadCachedData();
        fetchWalletData();
    }, []);

    const loadCachedData = async () => {
        try {
            const cached = await AsyncStorage.getItem('wallet_data');
            if (cached) {
                const { balance: cachedBalance, transactions: cachedTxs } = JSON.parse(cached);
                setBalance(cachedBalance);
                setTransactions(cachedTxs);
            }
        } catch (error) {
            console.error('Error loading cached wallet data:', error);
        }
    };

    const fetchWalletData = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const session = await AsyncStorage.getItem('userSession');
            if (!session) return;
            const { user } = JSON.parse(session);
            setUserId(user.id);

            const data = await apiRequest<{ balance: number; transactions: any[] }>('/wallet/summary');
            setBalance(data.balance || 0);
            setTransactions(data.transactions || []);

            // Cache the data
            await AsyncStorage.setItem('wallet_data', JSON.stringify({
                balance: data.balance || 0,
                transactions: data.transactions || []
            }));

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const initiateDeposit = async () => {
        if (!depositAmount || isNaN(parseFloat(depositAmount)) || parseFloat(depositAmount) <= 0) {
            Alert.alert("Invalid Amount", "Please enter a valid positive amount.");
            return;
        }

        setDepositing(true);
        try {
            // Use apiRequest helper to ensuring headers (Auth Token) are sent
            const data = await apiRequest<{ paymentUrl: string; orderId: string }>('/payment/deposit/init', {
                method: 'POST',
                body: JSON.stringify({ userId, amount: parseFloat(depositAmount) })
            });

            if (data.paymentUrl) {
                // Open Kashier Page
                Linking.openURL(data.paymentUrl);
                setDepositModalVisible(false);
                setDepositAmount('');
                Alert.alert("Redirecting", "Complete payment in your browser. Your balance will update shortly.");

                // Refresh wallet data after a short delay to catch completed payments
                setTimeout(() => fetchWalletData(), 3000);
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", error.message || "Failed to initiate deposit");
        } finally {
            setDepositing(false);
        }
    };

    const requestWithdrawal = async () => {
        if (!withdrawAmount || isNaN(parseFloat(withdrawAmount)) || parseFloat(withdrawAmount) <= 0) {
            Alert.alert("Invalid Amount", "Please enter a valid positive amount.");
            return;
        }
        if (!withdrawAccount) {
            Alert.alert("Missing Info", "Please enter your account number/phone.");
            return;
        }

        if (balance !== null && parseFloat(withdrawAmount) > balance) {
            Alert.alert("Insufficient Funds", "You cannot withdraw more than your balance.");
            return;
        }

        setWithdrawing(true);
        try {
            // Use apiRequest helper which handles authentication
            await apiRequest('/payment/withdraw/request', {
                method: 'POST',
                body: JSON.stringify({
                    amount: parseFloat(withdrawAmount),
                    method: withdrawMethod,
                    accountNumber: withdrawAccount
                })
            });

            Alert.alert("Success", "Withdrawal request sent! Admin will review shortly.");
            setWithdrawModalVisible(false);
            setWithdrawAmount('');
            setWithdrawAccount('');
            fetchWalletData(); // Refresh to see updated data

        } catch (error: any) {
            console.error('Withdrawal request error:', error);
            Alert.alert("Error", error.message || "Failed to request withdrawal");
        } finally {
            setWithdrawing(false);
        }
    };

    const renderTransaction = ({ item }: { item: any }) => {
        // Determine Status Color & Label
        let statusColor = '#6B7280';
        let statusLabel = item.status || 'Completed';
        let icon = <Banknote size={20} color={Colors.textSecondary} />;
        let iconBg = '#F3F4F6';

        if (item.status === 'pending') {
            statusColor = '#F59E0B'; // Orange
            statusLabel = 'Pending';
        } else if (item.status === 'failed' || item.status === 'rejected' || item.status === 'cancelled') {
            statusColor = '#EF4444'; // Red
            statusLabel = item.status === 'rejected' ? 'Rejected' : 'Failed';
        } else if (item.status === 'completed' || item.status === 'approved') {
            statusColor = '#10B981'; // Green
            statusLabel = 'Success';
        }

        // Determine Icon & Main Color based on Type
        if (item.type === 'deposit') {
            icon = <ArrowDownLeft size={20} color="#10B981" />;
            iconBg = '#DCFCE7';
        } else if (item.type === 'withdrawal' || item.type === 'withdrawal_request') {
            icon = <ArrowUpRight size={20} color="#EF4444" />;
            iconBg = '#FEE2E2';
        } else if (item.type === 'trip_earnings') {
            icon = <Wallet size={20} color={Colors.primary} />;
            iconBg = '#E0E7FF';
        } else if (item.type === 'payment' || item.type === 'fee') {
            icon = <CreditCard size={20} color="#F59E0B" />;
            iconBg = '#FEF3C7';
        }

        const isPositive = item.amount > 0;
        const amountColor = isPositive ? '#10B981' : '#111827';

        return (
            <View style={styles.txCard}>
                <View style={[styles.txIcon, { backgroundColor: iconBg }]}>
                    {icon}
                </View>
                <View style={styles.txInfo}>
                    <Text style={styles.txTitle}>
                        {item.type === 'withdrawal_request' ? 'Withdrawal Request' :
                            item.type === 'payment' ? 'Platform Fee' :
                                item.type === 'trip_earnings' ? 'Trip Earnings' :
                                    item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Text>
                    <Text style={styles.txDate}>{format(new Date(item.created_at), 'MMM dd, hh:mm a')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.txAmount, { color: amountColor }]}>
                        {isPositive ? '+' : ''}{item.amount.toFixed(2)} EGP
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Wallet</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                {/* Balance Card */}
                <View style={[styles.balanceCard, balance !== null && balance < -100 ? styles.balanceCardDanger : null]}>
                    <Text style={[styles.balanceLabel, balance !== null && balance < -100 ? { color: '#fff' } : null]}>Current Balance</Text>
                    {loading ? (
                        <ActivityIndicator color={Colors.primary} />
                    ) : (
                        <Text style={[styles.balanceValue, balance !== null && balance < -100 ? { color: '#fff' } : null]}>
                            {balance?.toFixed(2) || '0.00'} <Text style={{ fontSize: 20 }}>EGP</Text>
                        </Text>
                    )}

                    {balance !== null && balance < -100 && (
                        <View style={styles.blockedBadge}>
                            <Text style={styles.blockedText}>BLOCKED (Debt {'>'} 100)</Text>
                        </View>
                    )}
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => setDepositModalVisible(true)}>
                        <View style={styles.actionIconBg}>
                            <Wallet size={24} color={Colors.primary} />
                        </View>
                        <Text style={styles.actionText}>Deposit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => setWithdrawModalVisible(true)}>
                        <View style={[styles.actionIconBg, { backgroundColor: '#F0FDF4' }]}>
                            <Banknote size={24} color={Colors.success} />
                        </View>
                        <Text style={styles.actionText}>Withdraw</Text>
                    </TouchableOpacity>
                </View>

                {/* Transactions */}
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                <FlatList
                    data={transactions}
                    keyExtractor={item => item.id}
                    renderItem={renderTransaction}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => fetchWalletData(true)}
                            colors={[Colors.primary]}
                        />
                    }
                    ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>No transactions yet.</Text>}
                />
            </View>

            {/* DEPOSIT MODAL */}
            <Modal visible={depositModalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Deposit Funds</Text>
                                    <TouchableOpacity onPress={() => setDepositModalVisible(false)}>
                                        <X size={24} color="#000" />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.label}>Amount (EGP)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 200"
                                    keyboardType="numeric"
                                    value={depositAmount}
                                    onChangeText={setDepositAmount}
                                />

                                <TouchableOpacity
                                    style={[styles.confirmBtn, { backgroundColor: Colors.primary }]}
                                    onPress={initiateDeposit}
                                    disabled={depositing}
                                >
                                    {depositing ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Pay with Kashier</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>

            {/* WITHDRAW MODAL */}
            <Modal visible={withdrawModalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Request Withdrawal</Text>
                                    <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                                        <X size={24} color="#000" />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.label}>Amount (EGP)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 500"
                                    keyboardType="numeric"
                                    value={withdrawAmount}
                                    onChangeText={setWithdrawAmount}
                                />

                                <Text style={styles.label}>Method</Text>
                                <View style={styles.methodRow}>
                                    <TouchableOpacity
                                        style={[styles.methodOption, withdrawMethod === 'instapay' && styles.methodOptionActive]}
                                        onPress={() => setWithdrawMethod('instapay')}
                                    >
                                        <Text style={[styles.methodText, withdrawMethod === 'instapay' && styles.methodTextActive]}>InstaPay</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.methodOption, withdrawMethod === 'wallet' && styles.methodOptionActive]}
                                        onPress={() => setWithdrawMethod('wallet')}
                                    >
                                        <Text style={[styles.methodText, withdrawMethod === 'wallet' && styles.methodTextActive]}>Mobile Wallet</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.label}>Account Number / Phone</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="01xxxxxxxxx"
                                    keyboardType="phone-pad"
                                    value={withdrawAccount}
                                    onChangeText={setWithdrawAccount}
                                />

                                <TouchableOpacity
                                    style={[styles.confirmBtn, { backgroundColor: Colors.success }]}
                                    onPress={requestWithdrawal}
                                    disabled={withdrawing}
                                >
                                    {withdrawing ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Request Withdrawal</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },

    content: { flex: 1, paddingHorizontal: 20 },

    balanceCard: {
        backgroundColor: '#fff', borderRadius: 20, padding: 24, marginBottom: 24,
        alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3
    },
    balanceCardDanger: {
        backgroundColor: '#EF4444',
    },
    balanceLabel: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
    balanceValue: { fontSize: 36, fontWeight: 'bold', color: '#111827' },

    blockedBadge: {
        marginTop: 12, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12
    },
    blockedText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

    actionRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
    actionBtn: { alignItems: 'center' },
    actionIconBg: {
        width: 56, height: 56, borderRadius: 28, backgroundColor: '#EEF2FF',
        alignItems: 'center', justifyContent: 'center', marginBottom: 8
    },
    actionText: { fontSize: 14, fontWeight: '500', color: '#374151' },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#111827' },

    txCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        padding: 16, borderRadius: 12, marginBottom: 8
    },
    txIcon: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6',
        alignItems: 'center', justifyContent: 'center', marginRight: 12
    },
    txInfo: { flex: 1 },
    txTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
    txDate: { fontSize: 12, color: '#9CA3AF' },
    txAmount: { fontSize: 16, fontWeight: 'bold' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginTop: 4 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },

    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 12 },
    input: {
        backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#303641', borderRadius: 12,
        padding: 16, fontSize: 16, color: '#111827'
    },

    confirmBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
    confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    methodRow: { flexDirection: 'row', gap: 12 },
    methodOption: {
        flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center',
        backgroundColor: '#F9FAFB'
    },
    methodOptionActive: { borderColor: Colors.primary, backgroundColor: '#EFF6FF' },
    methodText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
    methodTextActive: { color: Colors.primary, fontWeight: 'bold' }
});
