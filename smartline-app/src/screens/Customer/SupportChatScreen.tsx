import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, I18nManager } from 'react-native';
import { Colors } from '../../constants/Colors';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { apiRequest } from '../../services/backend';
import { realtimeClient } from '../../services/realtimeClient';
import { useLanguage } from '../../context/LanguageContext';

export default function SupportChatScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { ticketId, subject } = route.params || {};
    const { t, isRTL } = useLanguage();

    // RTL Logic
    const isSimulating = isRTL !== I18nManager.isRTL;
    const flexDirection = isSimulating ? 'row-reverse' : 'row';
    const textAlign = isRTL ? 'right' : 'left';
    const iconMargin = isRTL ? { marginRight: 12, marginLeft: 0 } : { marginLeft: 12, marginRight: 0 }; // Margin for Send button in Input Area

    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentTicketId, setCurrentTicketId] = useState<string | null>(ticketId || null);
    const [loading, setLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    // Initial check for active ticket if not provided
    useEffect(() => {
        if (!ticketId) {
            checkActiveTicket();
        }
    }, [ticketId]);

    const checkActiveTicket = async () => {
        try {
            setLoading(true);
            const data = await apiRequest<{ tickets: any[] }>('/support/tickets');
            // Find latest open ticket
            const active = data.tickets?.find((t: any) => t.status === 'open');
            if (active) {
                setCurrentTicketId(active.id);
            }
        } catch (e) {
            console.error("Error checking tickets:", e);
        } finally {
            setLoading(false);
        }
    };

    // Real-time & Message Fetching
    useEffect(() => {
        let cleanup: (() => void) | undefined;
        if (currentTicketId) {
            fetchMessages();
            (async () => {
                cleanup = await realtimeClient.subscribe(
                    { channel: 'support:messages', ticketId: currentTicketId },
                    (payload) => {
                        const newMsg = payload.new;
                        if (newMsg) {
                            setMessages(prev => {
                                if (prev.some(m => m.id === newMsg.id)) return prev;
                                return [...prev, newMsg];
                            });
                        }
                    }
                );
            })();
        }
        return () => {
            if (cleanup) cleanup();
        };
    }, [currentTicketId]);

    const fetchMessages = async () => {
        if (!currentTicketId) return;
        try {
            const data = await apiRequest<{ messages: any[] }>(`/support/tickets/${currentTicketId}/messages`);
            if (data.messages) {
                setMessages(data.messages);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim()) return;

        try {
            let activeTicketId = currentTicketId;

            // Create ticket if first message
            if (!activeTicketId) {
                const ticketData = await apiRequest<{ ticket: any }>('/support/tickets', {
                    method: 'POST',
                    body: JSON.stringify({ subject: 'Support Request' })
                });
                activeTicketId = ticketData.ticket.id;
                setCurrentTicketId(activeTicketId);
            }

            // Send message
            await apiRequest(`/support/tickets/${activeTicketId}/messages`, {
                method: 'POST',
                body: JSON.stringify({ message: newMessage })
            });

            setNewMessage('');
            fetchMessages(); // Refresh to be safe
        } catch (e: any) {
            console.error(e);
            alert(e.message || 'Failed to send');
        }
    };

    const renderMessage = ({ item }: { item: any }) => {
        const isMine = !item.is_admin;
        return (
            <View style={[
                styles.msgContainer,
                isMine ? styles.myMsg : styles.theirMsg
            ]}>
                <Text style={[styles.msgText, isMine ? styles.myMsgText : styles.theirMsgText, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {item.message}
                </Text>
                <Text style={[styles.timeText, isMine ? { color: '#BFDBFE' } : { color: '#9CA3AF' }]}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header, { flexDirection }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1e1e1e" style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>{t('supportChat') || 'Support Chat'}</Text>
                    <Text style={styles.headerSubtitle}>
                        {subject || (currentTicketId ? `${t('ticket') || 'Ticket'} #${currentTicketId.slice(0, 8)}` : (t('newConversation') || 'New Conversation'))}
                    </Text>
                </View>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            >
                {loading && !currentTicketId ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.chatContent}
                        style={{ flex: 1 }} // Ensure list takes space
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    />
                )}

                <View style={[styles.inputArea, { flexDirection }]}>
                    <TextInput
                        style={[styles.input, { textAlign }]}
                        placeholder={t('typeMessage') || "Type your message..."}
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                    />
                    <TouchableOpacity onPress={handleSend} style={[styles.sendButton, iconMargin]}>
                        <Send size={20} color="#fff" style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: Platform.OS === 'android' ? 50 : 16,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        zIndex: 10
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    headerSubtitle: { fontSize: 12, color: '#6B7280' },

    chatContent: { padding: 16, paddingBottom: 20 },

    msgContainer: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 12 },
    myMsg: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 2 },
    theirMsg: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderBottomLeftRadius: 2 },

    msgText: { fontSize: 15, lineHeight: 22 },
    myMsgText: { color: '#fff' },
    theirMsgText: { color: '#1F2937' },

    timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },

    inputArea: {
        alignItems: 'center', padding: 12, backgroundColor: '#fff',
        borderTopWidth: 1, borderTopColor: '#E5E7EB'
    },
    input: {
        flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
        maxHeight: 100, fontSize: 16
    },
    sendButton: {
        backgroundColor: Colors.primary, width: 44, height: 44, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center'
    }
});
