import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Tag } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../../services/backend';
import { useLanguage } from '../../context/LanguageContext';
import AppHeader from '../../components/AppHeader';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';

export default function DiscountsScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { t, isRTL } = useLanguage();
    const [promoCode, setPromoCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [promos, setPromos] = useState<any[]>([]);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        fetchPromos();
    }, []);

    const fetchPromos = async () => {
        try {
            const data = await apiRequest<{ promos: any[] }>('/pricing/available');
            if (data.promos) {
                setPromos(data.promos);
            }
        } catch (err) {
            console.log("Error fetching promos", err);
        } finally {
            setFetching(false);
        }
    };

    const applyPromo = async (code: string, isManual = false) => {
        if (!code) return;
        setLoading(true);
        try {
            // Verify first
            const data = await apiRequest<{ promo: any }>(`/pricing/promo?code=${code}`);
            if (data.promo) {
                // Store securely as the "Active" promo for next ride
                await AsyncStorage.setItem('selected_promo', JSON.stringify(data.promo));

                Alert.alert(
                    t('success') || "Success",
                    `${t('promoApplied') || "Promo applied!"} ${t('youWillGet') || "You'll get"} ${data.promo.discount_percent}% ${t('offNextRide') || "off your next ride."}`,
                    [{ text: t('bookNow') || "Book Now", onPress: () => navigation.navigate('SearchLocation' as any) }]
                );
            }
        } catch (error: any) {
            Alert.alert(t('invalidCode') || "Invalid Code", error.message || t('promoInvalid') || "This promo code is not valid.");
        } finally {
            setLoading(false);
        }
    };

    const renderPromo = ({ item }: { item: any }) => (
        <View style={[styles.promoCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.iconCircle, { marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }]}>
                <Tag size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={styles.promoCode}>{item.code}</Text>
                <Text style={styles.promoDesc}>
                    {item.discount_percent > 0 ? `${item.discount_percent}% ${t('off') || 'OFF'}` : ''}
                    {item.discount_max ? ` (${t('max') || 'Max'} ${item.discount_max} ${t('currency') || 'EGP'})` : ''}
                </Text>
                <Text style={styles.validity}>
                    {item.valid_until ? `${t('validUntil') || 'Valid until'} ${new Date(item.valid_until).toLocaleDateString()}` : t('noExpiry') || 'No Expiry'}
                </Text>
            </View>
            <TouchableOpacity style={styles.useButton} onPress={() => applyPromo(item.code)}>
                <Text style={styles.useText}>{t('use') || 'USE'}</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <AppHeader title={t('promoCodes') || 'Promo Codes'} showBack={true} />

            <View style={styles.content}>
                <View style={[styles.inputContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TextInput
                        style={[styles.input, { textAlign: isRTL ? 'right' : 'left', marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }]}
                        placeholder={t('enterPromoCode') || "Enter promo code"}
                        value={promoCode}
                        onChangeText={setPromoCode}
                        autoCapitalize="characters"
                    />
                    <TouchableOpacity style={styles.applyButton} onPress={() => applyPromo(promoCode, true)} disabled={loading}>
                        <Text style={styles.applyText}>{loading ? (t('checking') || 'Checking...') : (t('apply') || 'Apply')}</Text>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('activePromotions') || "Active Promotions"}</Text>

                {fetching ? (
                    <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={promos}
                        keyExtractor={item => item.id}
                        renderItem={renderPromo}
                        ListEmptyComponent={
                            <Text style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 20 }}>
                                {t('noActivePromos') || "No active promotions at the moment."}
                            </Text>
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { flex: 1, padding: 16 },
    inputContainer: { flexDirection: 'row', marginBottom: 24 },
    input: { flex: 1, height: 50, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 16, backgroundColor: Colors.surface, marginRight: 12 },
    applyButton: { backgroundColor: Colors.primary, paddingHorizontal: 24, justifyContent: 'center', borderRadius: 8 },
    applyText: { color: '#fff', fontWeight: 'bold' },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.textSecondary, marginBottom: 16 },
    promoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
    iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    promoCode: { fontSize: 16, fontWeight: 'bold', color: Colors.textPrimary },
    promoDesc: { fontSize: 14, color: Colors.textPrimary, marginVertical: 2 },
    validity: { fontSize: 12, color: Colors.textSecondary },
    useButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#EFF6FF', borderRadius: 6 },
    useText: { color: Colors.primary, fontWeight: 'bold', fontSize: 12 },
});
