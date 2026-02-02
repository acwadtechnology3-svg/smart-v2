import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList } from 'react-native';
import { ArrowLeft, Bell, Car } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

const MESSAGES = [
    { id: '1', title: 'Driver Arriving', desc: 'Ahmed is 2 mins away!', time: 'Now', icon: 'car', unread: true },
    { id: '2', title: '50% Off Promo', desc: 'Use code SAVE50 for your next ride.', time: '2h ago', icon: 'promo', unread: false },
    { id: '3', title: 'Trip Completed', desc: 'You paid 45 EGP for your ride to Work.', time: 'Yesterday', icon: 'receipt', unread: false },
];

export default function MessagesScreen() {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1e1e1e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Messages</Text>
            </View>

            <FlatList
                data={MESSAGES}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item }) => (
                    <TouchableOpacity style={[styles.card, item.unread && styles.unreadCard]}>
                        <View style={[styles.iconBox, item.unread ? { backgroundColor: '#DBEAFE' } : { backgroundColor: '#F3F4F6' }]}>
                            {item.icon === 'car' ? <Car size={24} color={item.unread ? '#3B82F6' : '#6B7280'} /> : <Bell size={24} color={item.unread ? '#3B82F6' : '#6B7280'} />}
                        </View>
                        <View style={styles.textContainer}>
                            <View style={styles.topRow}>
                                <Text style={[styles.title, item.unread && styles.unreadText]}>{item.title}</Text>
                                <Text style={styles.time}>{item.time}</Text>
                            </View>
                            <Text style={styles.desc} numberOfLines={2}>{item.desc}</Text>
                        </View>
                        {item.unread && <View style={styles.dot} />}
                    </TouchableOpacity>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backBtn: { marginRight: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    card: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
    unreadCard: { backgroundColor: '#fff', borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
    iconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    textContainer: { flex: 1 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    title: { fontSize: 16, fontWeight: '600', color: '#374151' },
    unreadText: { fontWeight: 'bold', color: '#111827' },
    time: { fontSize: 12, color: '#9CA3AF' },
    desc: { fontSize: 14, color: '#6B7280' },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', marginLeft: 8 },
});
