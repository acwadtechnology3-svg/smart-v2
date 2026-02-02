import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { ArrowLeft, Tag } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';

export default function DiscountsScreen() {
    const navigation = useNavigation();
    const [promoCode, setPromoCode] = useState('');

    const PROMOS = [
        { id: '1', code: 'WELCOME50', description: '50% off your first ride', validUntil: 'Feb 28, 2026' },
        { id: '2', code: 'SMART10', description: '10% off any ride', validUntil: 'Dec 31, 2026' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Promo Codes</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter promo code"
                        value={promoCode}
                        onChangeText={setPromoCode}
                    />
                    <TouchableOpacity style={styles.applyButton}>
                        <Text style={styles.applyText}>Apply</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Active Promotions</Text>

                <FlatList
                    data={PROMOS}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.promoCard}>
                            <View style={styles.iconCircle}>
                                <Tag size={20} color={Colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.promoCode}>{item.code}</Text>
                                <Text style={styles.promoDesc}>{item.description}</Text>
                                <Text style={styles.validity}>Valid until {item.validUntil}</Text>
                            </View>
                            <TouchableOpacity style={styles.useButton}>
                                <Text style={styles.useText}>Use</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 60 }, // 👽 02-02-2026: Increased top padding for header
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary },
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
    useButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#EFF6FF', borderRadius: 4 },
    useText: { color: Colors.primary, fontWeight: '600', fontSize: 12 },
});
