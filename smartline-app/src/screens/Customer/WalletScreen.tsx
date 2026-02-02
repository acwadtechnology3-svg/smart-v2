import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { ArrowLeft, ChevronRight, CreditCard, Banknote, PlusCircle, Wallet as WalletIcon, Check, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';

type PaymentMethod = 'balance' | 'cash' | 'card';

export default function WalletScreen() {
    const navigation = useNavigation();
    const [balance, setBalance] = useState(150.00); // Mock initial balance
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');

    // Modals
    const [showTopUp, setShowTopUp] = useState(false);
    const [showAddCard, setShowAddCard] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('');

    // Mock Card Data
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCVC, setCardCVC] = useState('');

    const handleTopUp = () => {
        const amount = parseFloat(topUpAmount);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount.');
            return;
        }
        setBalance(prev => prev + amount);
        setTopUpAmount('');
        setShowTopUp(false);
        Alert.alert('Success', `Successfully added EGP ${amount.toFixed(2)} to your wallet.`);
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

            <ScrollView contentContainerStyle={styles.content}>

                {/* Balance Section - Click to Top Up */}
                <View style={styles.balanceSection}>
                    <Text style={styles.balanceLabel}>Total Balance</Text>
                    <TouchableOpacity style={styles.balanceRow} onPress={() => setShowTopUp(true)}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                            <Text style={styles.currency}>EGP</Text>
                            <Text style={styles.amount}>{balance.toFixed(2)}</Text>
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
                        <TouchableOpacity style={styles.modalButton} onPress={handleTopUp}>
                            <Text style={styles.modalButtonText}>Confirm Top Up</Text>
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
