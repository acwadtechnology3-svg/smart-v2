import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { apiRequest } from '../../services/backend';
import { realtimeClient } from '../../services/realtimeClient';

export default function SupportChatScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { ticketId, subject } = route.params || {};

    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentTicketId, setCurrentTicketId] = useState<string | null>(ticketId || null);
    const flatListRef = useRef<FlatList>(null);

    // Real-time subscription
    useEffect(() => {
        let cleanup: (() => void) | undefined;
        if (currentTicketId) {
            fetchMessages(); // Initial load

            (async () => {
                cleanup = await realtimeClient.subscribe(
                    { channel: 'support:messages', ticketId: currentTicketId },
                    (payload) => {
                        const newMsg = payload.new;
                        if (newMsg) {
                            setMessages(prev => {
                                // Prevent duplicates
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
                    body: JSON.stringify({ subject: 'New Support Request' })
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
            // Do NOT call fetchMessages here; let Realtime handle it to avoid flickering/duplication
            // But if Realtime is disconnected, user sees nothing?
            // Safer to call fetchMessages, but reliance on Realtime dedup in useEffect is mostly for *incoming* events.
            // If I call fetchMessages, it overwrites `messages` with latest list.
            // If Realtime event comes AFTER, dedup check handles it.
            // If Realtime event comes BEFORE, fetchMessages overwrites it (which is fine, same data).
            fetchMessages();
        } catch (e: any) {
            console.error(e);
            alert(e.message || 'Failed to send');
        }
    };

    const renderMessage = ({ item }: { item: any }) => {
        const isMine = !item.is_admin; // Assuming messages sent by me are not admin
        return (
            <View style={[styles.msgContainer, isMine ? styles.myMsg : styles.theirMsg]}>
                <Text style={[styles.msgText, isMine ? styles.myMsgText : styles.theirMsgText]}>{item.message}</Text>
                <Text style={[styles.timeText, isMine ? { color: '#BFDBFE' } : { color: '#9CA3AF' }]}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1e1e1e" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Support Chat</Text>
                    <Text style={styles.headerSubtitle}>{subject || (currentTicketId ? `Ticket #${currentTicketId.slice(0, 8)}` : 'New Conversation')}</Text>
                </View>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.chatContent}
                inverted={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.inputArea}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type your message..."
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                    />
                    <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
                        <Send size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#E5E7EB'
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
        flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff',
        borderTopWidth: 1, borderTopColor: '#E5E7EB'
    },
    input: {
        flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
        maxHeight: 100, fontSize: 16, marginRight: 12
    },
    sendButton: {
        backgroundColor: Colors.primary, width: 44, height: 44, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center'
    }
});
