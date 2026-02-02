import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Colors } from '../../constants/Colors';
import { ArrowLeft, Phone, MessageCircle, HelpCircle, ChevronRight, FileText } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export default function DriverSupportScreen() {
    const navigation = useNavigation<any>();

    const openWhatsApp = () => {
        Linking.openURL('whatsapp://send?phone=+201000000000');
    };

    const callSupport = () => {
        Linking.openURL('tel:+201000000000');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1e1e1e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Support</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <Text style={styles.sectionHeader}>How can we help you?</Text>

                {/* Instant Actions */}
                <View style={styles.actionGrid}>
                    <TouchableOpacity style={styles.actionCard} onPress={callSupport}>
                        <View style={[styles.iconBox, { backgroundColor: '#DBEAFE' }]}>
                            <Phone size={24} color="#2563EB" />
                        </View>
                        <Text style={styles.actionLabel}>Call Us</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard} onPress={openWhatsApp}>
                        <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                            <MessageCircle size={24} color="#166534" />
                        </View>
                        <Text style={styles.actionLabel}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard}>
                        <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
                            <HelpCircle size={24} color="#9333EA" />
                        </View>
                        <Text style={styles.actionLabel}>FAQ</Text>
                    </TouchableOpacity>
                </View>

                {/* Common Topics */}
                <Text style={styles.subHeader}>Common Topics</Text>

                <View style={styles.topicsList}>
                    <TopicItem label="Earning & Payments" />
                    <TopicItem label="Account & Profile" />
                    <TopicItem label="Safety & Insurance" />
                    <TopicItem label="App Issues" />
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const TopicItem = ({ label }: { label: string }) => (
    <TouchableOpacity style={styles.topicRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <FileText size={20} color={Colors.textSecondary} />
            <Text style={styles.topicText}>{label}</Text>
        </View>
        <ChevronRight size={20} color="#D1D5DB" />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#E5E7EB'
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e1e1e' },

    content: { padding: 20 },

    sectionHeader: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 20 },

    actionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
    actionCard: {
        flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 4,
        alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2
    },
    iconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    actionLabel: { fontWeight: '600', color: '#1f2937' },

    subHeader: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 },

    topicsList: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
    topicRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6'
    },
    topicText: { fontSize: 16, color: '#374151' }
});
