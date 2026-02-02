import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { ArrowLeft, Copy, Share2, Ticket } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

export default function InviteFriendsScreen() {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1e1e1e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Invite Friends</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.illustration}>
                    <Ticket size={80} color="#F97316" />
                    <Text style={styles.illustrationText}>Give 50%, Get 50%</Text>
                </View>

                <Text style={styles.desc}>Invite your friends to use SmartLine. When they take their first trip, you both get 50% off!</Text>

                <View style={styles.codeBox}>
                    <Text style={styles.codeLabel}>Your Referal Code</Text>
                    <TouchableOpacity style={styles.codeRow}>
                        <Text style={styles.codeText}>SALAH882</Text>
                        <Copy size={20} color="#3B82F6" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.shareBtn}>
                    <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <Share2 size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.shareBtnText}>Share Code</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    backBtn: { marginRight: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
    illustration: { width: 200, height: 200, backgroundColor: '#FFF7ED', borderRadius: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
    illustrationText: { marginTop: 16, fontSize: 22, fontWeight: 'bold', color: '#C2410C' },
    desc: { fontSize: 16, color: '#4B5563', textAlign: 'center', marginBottom: 40, lineHeight: 24 },
    codeBox: { width: '100%', marginBottom: 40 },
    codeLabel: { fontSize: 13, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', fontWeight: '600' },
    codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
    codeText: { fontSize: 20, fontWeight: 'bold', color: '#111827', letterSpacing: 2 },
    shareBtn: { width: '100%', borderRadius: 12, overflow: 'hidden' },
    gradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18 },
    shareBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
