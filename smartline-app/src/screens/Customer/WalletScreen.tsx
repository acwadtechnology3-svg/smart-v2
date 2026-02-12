import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ScrollView, ActivityIndicator, Linking, RefreshControl, Platform, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, CreditCard, Banknote, PlusCircle, Wallet as WalletIcon, Check, X, ArrowDownLeft, Wallet } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import { apiRequest } from '../../services/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useLanguage } from '../../context/LanguageContext';

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
    const { t, isRTL } = useLanguage();

    // RTL Layout Logic
    const isSimulating = isRTL !== I18nManager.isRTL;
    const flexDirection = isSimulating ? 'row-reverse' : 'row';
    const textAlign = isRTL ? 'right' : 'left';
    const iconMargin = isRTL ? { marginLeft: 16, marginRight: 0 } : { marginRight: 16, marginLeft: 0 };
    const iconMarginSmall = isRTL ? { marginLeft: 12, marginRight: 0 } : { marginRight: 12, marginLeft: 0 };


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
            <View style={[styles.header, { flexDirection }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.textPrimary} style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
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
                    <Text style={[styles.balanceLabel, { textAlign }]}>{t('totalBalance') || 'Total Balance'}</Text>
                    <TouchableOpacity style={[styles.balanceRow, { flexDirection }]} onPress={() => setShowTopUp(true)}>
                        <View style={{ flexDirection: flexDirection, alignItems: 'baseline', gap: 6 }}>
                            <Text style={styles.currency}>{t('currency') || 'EGP'}</Text>
                            {loading ? (
                                <ActivityIndicator color={Colors.textPrimary} />
                            ) : (
                                <Text style={styles.amount}>{(balance ?? 0).toFixed(2)}</Text>
                            )}
                        </View>
                        <View style={styles.topUpBadge}>
                            <PlusCircle size={14} color="#fff" />
                            <Text style={styles.topUpText}>{t('topUp') || 'Top Up'}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Divider Line */}
                <View style={styles.divider} />

                <Text style={[styles.sectionHeader, { textAlign }]}>{t('paymentMethods') || 'Payment Methods'}</Text>

                {/* Payment Methods List */}
                <View style={styles.listContainer}>
                    {/* SmartLine Balance Item */}
                    <TouchableOpacity
                        style={[styles.itemRow, selectedMethod === 'balance' && styles.selectedItemRow, { flexDirection }]}
                        onPress={() => setSelectedMethod('balance')}
                    >
                        <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }, iconMargin]}>
                            <WalletIcon size={20} color={Colors.primary} fill={selectedMethod === 'balance' ? Colors.primary : "none"} />
                        </View>
                        <Text style={[styles.itemTitle, selectedMethod === 'balance' && styles.selectedItemTitle]}>{t('smartLineBalance') || 'SmartLine Balance'}</Text>
                        <View style={{ flex: 1 }} />
                        {selectedMethod === 'balance' && <Check size={20} color={Colors.primary} />}
                    </TouchableOpacity>

                    <View style={styles.listDivider} />

                    {/* Cash Item */}
                    <TouchableOpacity
                        style={[styles.itemRow, selectedMethod === 'cash' && styles.selectedItemRow, { flexDirection }]}
                        onPress={() => setSelectedMethod('cash')}
                    >
                        <View style={[styles.iconBox, { backgroundColor: '#F3F4F6' }, iconMargin]}>
                            <Banknote size={20} color={Colors.textSecondary} />
                        </View>
                        <Text style={[styles.itemTitle, selectedMethod === 'cash' && styles.selectedItemTitle]}>{t('cash') || 'Cash'}</Text>
                        <View style={{ flex: 1 }} />
                        {selectedMethod === 'cash' && <Check size={20} color={Colors.primary} />}
                    </TouchableOpacity>

                    <View style={styles.listDivider} />

                    {/* Add Card Item */}
                    <TouchableOpacity style={[styles.itemRow, { flexDirection }]} onPress={() => setShowAddCard(true)}>
                        <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }, iconMargin]}>
                            <PlusCircle size={20} color={Colors.success} />
                        </View>
                        <View>
                            <Text style={[styles.itemTitle, { textAlign }]}>{t('creditDebitCard') || 'Credit / Debit Card'}</Text>
                            <Text style={[styles.itemSubtitle, { textAlign }]}>Visa • Mastercard • Meeza</Text>
                        </View>
                        <View style={{ flex: 1 }} />
                        <ChevronRight size={20} color={Colors.border} style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
                    </TouchableOpacity>
                </View>

                {/* Transaction History */}
                <Text style={[styles.sectionHeader, { textAlign }]}>{t('recentTransactions') || 'Recent Transactions'}</Text>
                {transactions.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>{t('noTransactions') || 'No transactions yet'}</Text>
                ) : (
                    transactions.slice(0, 10).map((tx) => (
                        <View key={tx.id} style={[styles.txCard, { flexDirection }]}>
                            <View style={[styles.txIcon, iconMarginSmall]}>
                                {tx.type === 'deposit' ? (
                                    <ArrowDownLeft size={20} color="#10B981" />
                                ) : (
                                    <Wallet size={20} color={Colors.primary} />
                                )}
                            </View>
                            <View style={[styles.txInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                                <Text style={styles.txTitle}>
                                    {tx.type === 'deposit' ? (t('deposit') || 'Deposit') : tx.type === 'payment' ? (t('payment') || 'Payment') : (t('transaction') || 'Transaction')}
                                </Text>
                                <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleString()}</Text>
                            </View>
                            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                                <Text style={[styles.txAmount, { color: tx.amount > 0 ? '#10B981' : '#111827' }]}>
                                    {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} {t('currency') || 'EGP'}
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
                        <View style={[styles.modalHeader, { flexDirection }]}>
                            <Text style={styles.modalTitle}>{t('topUpBalance') || 'Top Up Balance'}</Text>
                            <TouchableOpacity onPress={() => setShowTopUp(false)}>
                                <X size={24} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.inputLabel, { textAlign }]}>{t('enterAmount') || 'Enter Amount'} ({t('currency') || 'EGP'})</Text>
                        <TextInput
                            style={[styles.input, { textAlign }]}
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
                                <Text style={styles.modalButtonText}>{t('confirmTopUp') || 'Confirm Top Up'}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* --- ADD CARD MODAL --- */}
            <Modal visible={showAddCard} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.modalHeader, { flexDirection }]}>
                            <Text style={styles.modalTitle}>{t('addNewCard') || 'Add New Card'}</Text>
                            <TouchableOpacity onPress={() => setShowAddCard(false)}>
                                <X size={24} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { textAlign }]}>{t('cardNumber') || 'Card Number'}</Text>
                            <TextInput
                                style={[styles.input, { textAlign }]}
                                placeholder="0000 0000 0000 0000"
                                keyboardType="number-pad"
                                value={cardNumber}
                                onChangeText={setCardNumber}
                                maxLength={16}
                            />
                        </View>

                        <View style={{ flexDirection: flexDirection, gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.inputLabel, { textAlign }]}>{t('expiry') || 'Expiry'}</Text>
                                <TextInput
                                    style={[styles.input, { textAlign }]}
                                    placeholder="MM/YY"
                                    keyboardType="numeric"
                                    value={cardExpiry}
                                    onChangeText={setCardExpiry}
                                    maxLength={5}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.inputLabel, { textAlign }]}>{t('cvc') || 'CVC'}</Text>
                                <TextInput
                                    style={[styles.input, { textAlign }]}
                                    placeholder="123"
                                    keyboardType="numeric"
                                    value={cardCVC}
                                    onChangeText={setCardCVC}
                                    maxLength={3}
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={styles.modalButton} onPress={handleAddCard}>
                            <Text style={styles.modalButtonText}>{t('verifyAndAdd') || 'Verify & Add Card'}</Text>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: Platform.OS === 'android' ? 50 : 20,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        zIndex: 10
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary },

    content: { paddingHorizontal: 24, paddingTop: 10 },

    balanceSection: { marginBottom: 24, marginTop: 8 },
    balanceLabel: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
    balanceRow: { alignItems: 'center', justifyContent: 'space-between' },
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
    itemRow: { alignItems: 'center', paddingVertical: 18, borderRadius: 12, paddingHorizontal: 8 },
    selectedItemRow: { backgroundColor: '#F0F9FF' }, // Light blue highlights
    iconBox: { width: 44, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, // Margins handled by style prop
    itemTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
    selectedItemTitle: { color: Colors.primary },
    itemSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    listDivider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 60 },

    // Transaction Styles
    txCard: {
        alignItems: 'center',
        backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8
    },
    txIcon: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6',
        alignItems: 'center', justifyContent: 'center'
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
    modalHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
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
