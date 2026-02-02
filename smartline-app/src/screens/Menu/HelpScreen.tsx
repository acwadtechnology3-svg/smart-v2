import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { ArrowLeft, MessageCircle, Phone, FileText, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';

export default function HelpScreen() {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1e1e1e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help Center</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>How can we help you?</Text>

                <View style={styles.card}>
                    <TouchableOpacity style={styles.row}>
                        <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                            <MessageCircle size={24} color="#3B82F6" />
                        </View>
                        <View style={styles.rowText}>
                            <Text style={styles.rowTitle}>Chat with Support</Text>
                            <Text style={styles.rowSub}>Start a conversation now</Text>
                        </View>
                        <ChevronRight size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.row}>
                        <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                            <Phone size={24} color="#10B981" />
                        </View>
                        <View style={styles.rowText}>
                            <Text style={styles.rowTitle}>Call Us</Text>
                            <Text style={styles.rowSub}>Talk to an agent</Text>
                        </View>
                        <ChevronRight size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
                <View style={styles.card}>
                    {['How to pay for a trip?', 'How to cancel a ride?', 'Safety concerns', 'Account issues'].map((item, index) => (
                        <View key={index}>
                            <TouchableOpacity style={styles.faqRow}>
                                <FileText size={18} color="#6B7280" />
                                <Text style={styles.faqText}>{item}</Text>
                                <ChevronRight size={16} color="#D1D5DB" />
                            </TouchableOpacity>
                            {index < 3 && <View style={styles.divider} />}
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
    backBtn: { marginRight: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    content: { padding: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12, marginTop: 12 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    iconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    rowText: { flex: 1 },
    rowTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    rowSub: { fontSize: 13, color: '#6B7280' },
    divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
    faqRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 12 },
    faqText: { flex: 1, fontSize: 15, color: '#374151', fontWeight: '500' },
});
