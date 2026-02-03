import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Colors } from '../constants/Colors';
import { MapPin, Clock, CircleDollarSign, X, Check } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

interface TripRequestModalProps {
    visible: boolean;
    trip: any;
    onAccept: (tripId: string) => void;
    onDecline: () => void;
    onBid: (tripId: string, amount: number) => void;
}

export default function TripRequestModal({ visible, trip, onAccept, onDecline, onBid }: TripRequestModalProps) {
    const { t, isRTL } = useLanguage();
    const [bidAmount, setBidAmount] = useState('');
    const [showBidInput, setShowBidInput] = useState(false);

    useEffect(() => {
        if (trip) {
            setBidAmount(trip.price?.toString() || '');
        }
    }, [trip]);

    if (!trip) return null;

    const handleBid = () => {
        const amount = parseFloat(bidAmount);
        if (isNaN(amount) || amount <= 0) return;
        onBid(trip.id, amount);
        setShowBidInput(false);
    };

    const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' } as any;
    const textAlign = { textAlign: isRTL ? 'right' : 'left' } as any;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onDecline}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <View style={styles.card}>
                    {/* Header */}
                    <View style={[styles.header, rowStyle]}>
                        <Text style={styles.title}>{t('newRequest')}</Text>
                        <View style={styles.timerBadge}>
                            <Clock size={14} color="#fff" />
                            <Text style={styles.timerText}>30s</Text>
                        </View>
                    </View>

                    <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                        {/* Route Info */}
                        <View style={styles.routeContainer}>
                            <View style={[styles.routeRow, rowStyle]}>
                                <View style={[styles.dot, { backgroundColor: Colors.primary, marginLeft: isRTL ? 12 : 0, marginRight: isRTL ? 0 : 12 }]} />
                                <Text style={[styles.address, textAlign]} numberOfLines={2}>{trip.pickup_address || t('pickup')}</Text>
                            </View>
                            <View style={[styles.connector, { marginLeft: isRTL ? 0 : 5, marginRight: isRTL ? 5 : 0 }]} />
                            <View style={[styles.routeRow, rowStyle]}>
                                <View style={[styles.dot, { backgroundColor: Colors.danger, marginLeft: isRTL ? 12 : 0, marginRight: isRTL ? 0 : 12 }]} />
                                <Text style={[styles.address, textAlign]} numberOfLines={2}>{trip.dest_address || t('dropoff')}</Text>
                            </View>
                        </View>

                        {/* Stats */}
                        <View style={[styles.statsRow, rowStyle]}>
                            <View style={styles.stat}>
                                <Text style={styles.statLabel}>{t('distance')}</Text>
                                <Text style={styles.statValue}>{trip.distance?.toFixed(1) || 0} km</Text>
                            </View>
                            <View style={styles.stat}>
                                <Text style={styles.statLabel}>{t('estEarnings')}</Text>
                                <Text style={styles.statValue}>{Math.ceil(trip.duration || 0)} min</Text>
                            </View>
                            <View style={styles.stat}>
                                <Text style={styles.statLabel}>{t('price')}</Text>
                                <Text style={styles.statValue}>EGP {trip.price}</Text>
                            </View>
                        </View>

                        {/* Actions */}
                        {!showBidInput ? (
                            <View style={[styles.actions, rowStyle]}>
                                <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
                                    <X size={24} color={Colors.textSecondary} />
                                    <Text style={styles.declineText}>{t('decline')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.bidBtn} onPress={() => setShowBidInput(true)}>
                                    <Text style={styles.bidText}>{t('bid')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.acceptBtn} onPress={() => onAccept(trip.id)}>
                                    <Text style={styles.acceptText}>{t('accept')} {trip.price}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.bidContainer}>
                                <Text style={styles.bidLabel}>{t('bid')} (EGP)</Text>
                                <View style={[styles.bidInputRow, rowStyle]}>
                                    <TextInput
                                        style={styles.bidInput}
                                        value={bidAmount}
                                        onChangeText={setBidAmount}
                                        keyboardType="decimal-pad"
                                        autoFocus
                                        placeholder="0.00"
                                    />
                                    <TouchableOpacity style={styles.confirmBidBtn} onPress={handleBid}>
                                        <Check size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity style={styles.cancelBidBtn} onPress={() => setShowBidInput(false)}>
                                    <Text style={styles.cancelBidText}>{t('cancel')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    card: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },

    header: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary },
    timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.warning, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    timerText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

    routeContainer: { marginBottom: 24 },
    routeRow: { alignItems: 'flex-start' },
    dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
    address: { flex: 1, fontSize: 16, color: Colors.textPrimary, lineHeight: 22 },
    connector: { width: 2, height: 20, backgroundColor: '#E5E7EB', marginVertical: 4 },

    statsRow: { justifyContent: 'space-between', marginBottom: 24, padding: 16, backgroundColor: '#F9FAFB', borderRadius: 12 },
    stat: { alignItems: 'center' },
    statLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
    statValue: { fontSize: 16, fontWeight: 'bold', color: Colors.textPrimary },

    actions: { alignItems: 'center', gap: 12 },
    declineBtn: { alignItems: 'center', justifyContent: 'center', padding: 12 },
    declineText: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },

    bidBtn: { flex: 1, paddingVertical: 16, backgroundColor: '#EFF6FF', borderRadius: 12, alignItems: 'center' },
    bidText: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },

    acceptBtn: { flex: 2, paddingVertical: 16, backgroundColor: Colors.primary, borderRadius: 12, alignItems: 'center' },
    acceptText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },

    bidContainer: { alignItems: 'center' },
    bidLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: 12 },
    bidInputRow: { gap: 12, marginBottom: 12, width: '100%' },
    bidInput: { flex: 1, height: 50, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 16, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
    confirmBidBtn: { width: 50, height: 50, backgroundColor: Colors.success, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    cancelBidBtn: { padding: 8 },
    cancelBidText: { color: Colors.textSecondary },
});
