import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ScrollView, ActivityIndicator, Linking, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, CreditCard, Banknote, PlusCircle, Wallet as WalletIcon, Check, X, ArrowDownLeft, Wallet } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import { apiRequest } from '../../services/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

type PaymentMethod = 'balance' | 'cash' | 'card';

const BACKEND_URL = Constants.expoConfig?.hostUri
    ? `http://${Constants.expoConfig.hostUri.split(':').shift()}:3000/api`
    : 'http://192.168.1.10:3000/api';

interface Transaction {
    id: string;
    type: string;
    amount: number;
    status: string;
    created_at: string;
    description?: string;
}

export default function WalletScreen() {
    const navigation = useNavigation();
    const [balance, setBalance] = useState<number | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');


    const [showTopUp, setShowTopUp] = useState(false);
    const [showAddCard, setShowAddCard] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('');
    const [toppingUp, setToppingUp] = useState(false);

    // Mock Card Data
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCVC, setCardCVC] = useState('');

    useEffect(() => {
        loadCachedData();
        fetchWalletData();
    }, []);

    const loadCachedData = async () => {
        try {
            const cached = await AsyncStorage.getItem('customer_wallet_data');
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

            const data = await apiRequest<{ balance: number; transactions: Transaction[] }>('/wallet/summary');
            setBalance(data.balance || 0);
            setTransactions(data.transactions || []);

            await AsyncStorage.setItem('customer_wallet_data', JSON.stringify({
                balance: data.balance || 0,
                transactions: data.transactions || []
            }));

        } catch (error) {
            console.error('Error fetching wallet data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleTopUp = async () => {
        if (!topUpAmount || isNaN(parseFloat(topUpAmount)) || parseFloat(topUpAmount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
            return;
        }

        setToppingUp(true);
        try {
            const data = await apiRequest<{ paymentUrl: string; orderId: string }>('/payment/deposit/init', {
                method: 'POST',
                body: JSON.stringify({ userId, amount: parseFloat(topUpAmount) })
            });

            if (data.paymentUrl) {
                Linking.openURL(data.paymentUrl);
                setShowTopUp(false);
                setTopUpAmount('');
                Alert.alert('Success', 'Complete payment in your browser. Your balance will update shortly.');
                setTimeout(() => fetchWalletData(), 3000);
            }
        } catch (error: any) {
            console.error('Top up error:', error);
            Alert.alert('Error', error.message || 'Failed to initiate top up');
        } finally {
            setToppingUp(false);
        }
    };

    const handleAddCard = () => {
        if (cardNumber.length < 16 || cardExpiry.length < 4 || cardCVC.length < 3) {
            Alert.alert('Invalid Details', 'Please enter valid card information.');
            return;
        }
        setShowAddCard(false);
        setCardNumber('');
        setCardExpiry('');
        setCardCVC('');
        Alert.alert('Success', 'Card added successfully!');
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>SmartLine Pay</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchWalletData(true)}
                        colors={[Colors.primary]}
                    />
                }
            >

                {/* Balance Section - Click to Top Up */}
                <View style={styles.balanceSection}>
                    <Text style={styles.balanceLabel}>Total Balance</Text>
                    <TouchableOpacity style={styles.balanceRow} onPress={() => setShowTopUp(true)}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                            <Text style={styles.currency}>EGP</Text>
                            {loading ? (
                                <ActivityIndicator color={Colors.textPrimary} />
                            ) : (
                                <Text style={styles.amount}>{(balance ?? 0).toFixed(2)}</Text>
                            )}
                        </View>
                        <View style={styles.topUpBadge}>
                            <PlusCircle size={14} color="#fff" />
                            <Text style={styles.topUpText}>Top Up</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Divider Line */}
                <View style={styles.divider} />

                <Text style={styles.sectionHeader}>Payment Methods</Text>

                {/* Payment Methods List */}
                <View style={styles.listContainer}>
                    {/* SmartLine Balance Item */}
                    <TouchableOpacity
                        style={[styles.itemRow, selectedMethod === 'balance' && styles.selectedItemRow]}
                        onPress={() => setSelectedMethod('balance')}
                    >
                        <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                            <WalletIcon size={20} color={Colors.primary} fill={selectedMethod === 'balance' ? Colors.primary : "none"} />
                        </View>
                        <Text style={[styles.itemTitle, selectedMethod === 'balance' && styles.selectedItemTitle]}>SmartLine Balance</Text>
                        <View style={{ flex: 1 }} />
                        {selectedMethod === 'balance' && <Check size={20} color={Colors.primary} />}
                    </TouchableOpacity>

                    <View style={styles.listDivider} />

                    {/* Cash Item */}
                    <TouchableOpacity
                        style={[styles.itemRow, selectedMethod === 'cash' && styles.selectedItemRow]}
                        onPress={() => setSelectedMethod('cash')}
                    >
                        <View style={[styles.iconBox, { backgroundColor: '#F3F4F6' }]}>
                            <Banknote size={20} color={Colors.textSecondary} />
                        </View>
                        <Text style={[styles.itemTitle, selectedMethod === 'cash' && styles.selectedItemTitle]}>Cash</Text>
                        <View style={{ flex: 1 }} />
                        {selectedMethod === 'cash' && <Check size={20} color={Colors.primary} />}
                    </TouchableOpacity>

                    <View style={styles.listDivider} />

                    {/* Add Card Item */}
                    <TouchableOpacity style={styles.itemRow} onPress={() => setShowAddCard(true)}>
                        <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                            <PlusCircle size={20} color={Colors.success} />
                        </View>
                        <View>
                            <Text style={styles.itemTitle}>Credit / Debit Card</Text>
                            <Text style={styles.itemSubtitle}>Visa • Mastercard • Meeza</Text>
                        </View>
                        <View style={{ flex: 1 }} />
                        <ChevronRight size={20} color={Colors.border} />
                    </TouchableOpacity>
                </View>

                {/* Transaction History */}
                <Text style={styles.sectionHeader}>Recent Transactions</Text>
                {transactions.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>No transactions yet</Text>
                ) : (
                    transactions.slice(0, 10).map((tx) => (
                        <View key={tx.id} style={styles.txCard}>
                            <View style={styles.txIcon}>
                                {tx.type === 'deposit' ? (
                                    <ArrowDownLeft size={20} color="#10B981" />
                                ) : (
                                    <Wallet size={20} color={Colors.primary} />
                                )}
                            </View>
                            <View style={styles.txInfo}>
                                <Text style={styles.txTitle}>
                                    {tx.type === 'deposit' ? 'Deposit' : tx.type === 'payment' ? 'Payment' : 'Transaction'}
                                </Text>
                                <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleString()}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[styles.txAmount, { color: tx.amount > 0 ? '#10B981' : '#111827' }]}>
                                    {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} EGP
                                </Text>
                                <View style={[styles.statusBadge, { backgroundColor: (tx.status === 'completed' ? '#10B981' : tx.status === 'pending' ? '#F59E0B' : '#EF4444') + '20' }]}>
                                    <Text style={[styles.statusText, { color: tx.status === 'completed' ? '#10B981' : tx.status === 'pending' ? '#F59E0B' : '#EF4444' }]}>
                                        {tx.status}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* --- TOP UP MODAL --- */}
            <Modal visible={showTopUp} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Top Up Balance</Text>
                            <TouchableOpacity onPress={() => setShowTopUp(false)}>
                                <X size={24} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.inputLabel}>Enter Amount (EGP)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            keyboardType="numeric"
                            value={topUpAmount}
                            onChangeText={setTopUpAmount}
                            autoFocus
                        />
                        <TouchableOpacity
                            style={[styles.modalButton, toppingUp && { opacity: 0.7 }]}
                            onPress={handleTopUp}
                            disabled={toppingUp}
                        >
                            {toppingUp ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.modalButtonText}>Confirm Top Up</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* --- ADD CARD MODAL --- */}
            <Modal visible={showAddCard} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Card</Text>
                            <TouchableOpacity onPress={() => setShowAddCard(false)}>
                                <X size={24} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Card Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0000 0000 0000 0000"
                                keyboardType="number-pad"
                                value={cardNumber}
                                onChangeText={setCardNumber}
                                maxLength={16}
                            />
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Expiry</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="MM/YY"
                                    keyboardType="numeric"
                                    value={cardExpiry}
                                    onChangeText={setCardExpiry}
                                    maxLength={5}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>CVC</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="123"
                                    keyboardType="numeric"
                                    value={cardCVC}
                                    onChangeText={setCardCVC}
                                    maxLength={3}
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={styles.modalButton} onPress={handleAddCard}>
                            <Text style={styles.modalButtonText}>Verify & Add Card</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary },

    content: { paddingHorizontal: 24, paddingTop: 10 },

    balanceSection: { marginBottom: 24, marginTop: 8 },
    balanceLabel: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
    balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    currency: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary },
    amount: { fontSize: 48, fontWeight: 'bold', color: Colors.textPrimary, lineHeight: 56 },
    topUpBadge: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, gap: 4
    },
    topUpText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

    divider: { height: 1, backgroundColor: Colors.surface, marginVertical: 16, borderWidth: 0.5, borderColor: Colors.border },

    sectionHeader: { fontSize: 14, fontWeight: 'bold', color: Colors.textSecondary, marginBottom: 12, textTransform: 'uppercase' },

    listContainer: { marginTop: 8 },
    itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderRadius: 12, paddingHorizontal: 8 },
    selectedItemRow: { backgroundColor: '#F0F9FF' }, // Light blue highlights
    iconBox: { width: 44, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    itemTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
    selectedItemTitle: { color: Colors.primary },
    itemSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    listDivider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 60 },

    // Transaction Styles
    txCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8
    },
    txIcon: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6',
        alignItems: 'center', justifyContent: 'center', marginRight: 12
    },
    txInfo: { flex: 1 },
    txTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
    txDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
    txAmount: { fontSize: 16, fontWeight: 'bold' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginTop: 4 },
    statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'capitalize' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary },
    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 14, fontWeight: 'bold', color: Colors.textSecondary, marginBottom: 8 },
    input: {
        backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: Colors.border,
        borderRadius: 12, padding: 16, fontSize: 16, color: Colors.textPrimary
    },
    modalButton: {
        backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16,
        alignItems: 'center', marginTop: 24
    },
    modalButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
