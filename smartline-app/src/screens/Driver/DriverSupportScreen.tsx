import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Linking, FlatList, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Colors } from '../../constants/Colors';
import { ArrowLeft, Phone, MessageCircle, Plus, MessageSquare } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { apiRequest } from '../../services/backend';
import { useLanguage } from '../../context/LanguageContext';

export default function DriverSupportScreen() {
    const navigation = useNavigation<any>();
    const { t, isRTL } = useLanguage();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showNewTicketInput, setShowNewTicketInput] = useState(false);
    const [newSubject, setNewSubject] = useState('');

    useFocusEffect(
        useCallback(() => {
            fetchTickets();
        }, [])
    );

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const data = await apiRequest<{ tickets: any[] }>('/support/tickets');
            if (data.tickets) {
                setTickets(data.tickets);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTicket = async () => {
        if (!newSubject.trim()) {
            Alert.alert(t('error'), t('enterSubjectError'));
            return;
        }

        try {
            const data = await apiRequest<{ ticket: any }>('/support/tickets', {
                method: 'POST',
                body: JSON.stringify({ subject: newSubject })
            });

            setNewSubject('');
            setShowNewTicketInput(false);
            fetchTickets();
            navigation.navigate('SupportChat', { ticketId: data.ticket.id, subject: data.ticket.subject });
        } catch (e: any) {
            Alert.alert(t('error'), e.message);
        }
    };

    const openWhatsApp = () => Linking.openURL('whatsapp://send?phone=+201000000000');
    const callSupport = () => Linking.openURL('tel:+201000000000');

    const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' } as any;
    const textAlign = { textAlign: isRTL ? 'right' : 'left' } as any;

    const renderTicket = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.ticketCard, rowStyle]}
            onPress={() => navigation.navigate('SupportChat', { ticketId: item.id, subject: item.subject })}
        >
            <View style={[styles.ticketIcon, { marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }]}>
                <MessageSquare size={24} color={Colors.primary} />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={styles.ticketSubject}>{item.subject}</Text>
                <Text style={styles.ticketDate}>
                    {new Date(item.updated_at || item.created_at).toLocaleDateString()}
                </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'open' ? '#DCFCE7' : '#E5E7EB' }]}>
                <Text style={[styles.statusText, { color: item.status === 'open' ? '#166534' : '#374151' }]}>
                    {item.status.toUpperCase()}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header, rowStyle]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }]}>
                    <ArrowLeft size={24} color="#1e1e1e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('support')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Instant Actions */}
                <Text style={[styles.sectionHeader, textAlign]}>{t('contactUs')}</Text>
                <View style={[styles.actionGrid, rowStyle]}>
                    <TouchableOpacity style={styles.actionCard} onPress={callSupport}>
                        <View style={[styles.iconBox, { backgroundColor: '#DBEAFE' }]}>
                            <Phone size={24} color="#2563EB" />
                        </View>
                        <Text style={styles.actionLabel}>{t('callUs')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard} onPress={openWhatsApp}>
                        <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                            <MessageCircle size={24} color="#166534" />
                        </View>
                        <Text style={styles.actionLabel}>{t('whatsapp')}</Text>
                    </TouchableOpacity>
                </View>

                {/* My Tickets */}
                <View style={[styles.ticketsHeader, rowStyle]}>
                    <Text style={styles.sectionHeader}>{t('myRequests')}</Text>
                    <TouchableOpacity
                        style={[styles.newButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                        onPress={() => setShowNewTicketInput(!showNewTicketInput)}
                    >
                        <Plus size={20} color="#fff" />
                        <Text style={styles.newButtonText}>{t('newRequest')}</Text>
                    </TouchableOpacity>
                </View>

                {showNewTicketInput && (
                    <View style={styles.newTicketBox}>
                        <Text style={[styles.boxTitle, textAlign]}>{t('whatIsYourIssue')}</Text>
                        <TextInput
                            style={[styles.input, textAlign]}
                            placeholder={t('enterSubject')}
                            value={newSubject}
                            onChangeText={setNewSubject}
                        />
                        <TouchableOpacity style={styles.createButton} onPress={handleCreateTicket}>
                            <Text style={styles.createButtonText}>{t('startChat')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {loading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
                ) : tickets.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>{t('noTickets')}</Text>
                    </View>
                ) : (
                    <View style={styles.ticketList}>
                        {tickets.map(ticket => <View key={ticket.id}>{renderTicket({ item: ticket })}</View>)}
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#E5E7EB'
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e1e1e' },
    content: { padding: 20 },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },

    actionGrid: { justifyContent: 'space-between', marginBottom: 32 },
    actionCard: {
        flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 4,
        alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2
    },
    iconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    actionLabel: { fontWeight: '600', color: '#1f2937' },

    ticketsHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    newButton: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignItems: 'center', gap: 4 },
    newButtonText: { color: '#fff', fontWeight: '600', fontSize: 12 },

    ticketList: { gap: 12 },
    ticketCard: {
        alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12,
        marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1
    },
    ticketIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
    ticketSubject: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
    ticketDate: { fontSize: 12, color: '#6b7280' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '700' },

    newTicketBox: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 20 },
    boxTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
    input: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, marginBottom: 12 },
    createButton: { backgroundColor: Colors.primary, padding: 12, borderRadius: 8, alignItems: 'center' },
    createButtonText: { color: '#fff', fontWeight: 'bold' },

    emptyBox: { alignItems: 'center', padding: 20 },
    emptyText: { color: '#6b7280' }
});
