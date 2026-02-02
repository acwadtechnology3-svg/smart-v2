import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Send, Phone } from 'lucide-react-native';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;
type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

interface Message {
    id: string;
    text: string;
    senderId: string;
    time: string;
    isUser: boolean;
}

export default function ChatScreen() {
    const navigation = useNavigation<ChatScreenNavigationProp>();
    const route = useRoute<ChatScreenRouteProp>();
    const { driverName, tripId, role = 'customer' } = route.params;

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [userId, setUserId] = useState<string | null>(null);
    const [tripDetails, setTripDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    // 1. Fetch Trip Data & Establish Identity
    useEffect(() => {
        const setupChat = async () => {
            // A. Fetch Trip to know participants
            const { data: trip } = await supabase
                .from('trips')
                .select('customer_id, driver_id')
                .eq('id', tripId)
                .single();

            if (trip) {
                setTripDetails(trip);

                // B. Try Auth Session first
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setUserId(session.user.id);
                } else {
                    // C. Fallback: Use ID based on ROLE (Dev friendly)
                    // If we are 'customer', assume we are the customer_id
                    // If we are 'driver', assume we are the driver_id
                    const fallbackId = role === 'customer' ? trip.customer_id : trip.driver_id;
                    if (fallbackId) {
                        console.log(`[Chat] Using ${role} fallback ID:`, fallbackId);
                        setUserId(fallbackId);
                    }
                }
            }
        };

        setupChat();
    }, [tripId, role]);

    // 2. Fetch Initial Messages
    useEffect(() => {
        if (!tripId) return;

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('trip_id', tripId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching messages:', error);
                setLoading(false);
                return;
            }

            if (data) {
                // Formatting
                const formattedMessages = data.map((msg: any) => ({
                    id: msg.id,
                    text: msg.content,
                    senderId: msg.sender_id,
                    time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    // isUser will be calculated in render or effect update
                    isUser: false // Placeholder
                }));
                setMessages(formattedMessages);
            }
            setLoading(false);
        };

        fetchMessages();
    }, [tripId]);

    // 3. Realtime Subscription
    useEffect(() => {
        if (!tripId) return;

        const channel = supabase
            .channel(`chat:${tripId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `trip_id=eq.${tripId}` },
                (payload) => {
                    const newMsg = payload.new;
                    setMessages((prev) => {
                        if (prev.find(m => m.id === newMsg.id)) return prev;
                        return [
                            {
                                id: newMsg.id,
                                text: newMsg.content,
                                senderId: newMsg.sender_id,
                                time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                isUser: false // Placeholder
                            },
                            ...prev
                        ];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tripId]);

    // 4. Update "isUser" flag whenever messages, userId, or tripDetails change
    useEffect(() => {
        if (!tripDetails) return;

        // Calculate who "Me" is based on Role or Auth
        // Priority: Auth ID -> Role-based ID from Trip
        let myId = userId;
        if (!myId) {
            myId = role === 'customer' ? tripDetails.customer_id : tripDetails.driver_id;
        }

        if (myId) {
            setMessages(prev => prev.map(msg => ({
                ...msg,
                isUser: msg.senderId === myId
            })));
        }

    }, [userId, tripDetails, role, messages.length]); // Re-run when length changes (new message)

    const handleSend = async () => {
        if (inputText.trim().length === 0 || !tripId) return;

        // Ensure we have a sender ID
        let senderId = userId;
        if (!senderId && tripDetails) {
            senderId = role === 'customer' ? tripDetails.customer_id : tripDetails.driver_id;
        }

        if (!senderId) {
            Alert.alert("Error", "Could not verify identity.");
            return;
        }

        const textToSend = inputText.trim();
        setInputText('');

        try {
            const { error } = await supabase
                .from('messages')
                .insert({
                    trip_id: tripId,
                    sender_id: senderId,
                    content: textToSend
                });

            if (error) {
                console.error('[Chat] Insert Error:', error);
                Alert.alert('Error', "Failed to send.");
                setInputText(textToSend);
            }
        } catch (err) {
            console.error('[Chat] Unexpected Error:', err);
            setInputText(textToSend);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1e1e1e" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>{driverName}</Text>
                    <Text style={styles.headerStatus}>Online</Text>
                </View>
                <TouchableOpacity style={styles.callBtn}>
                    <Phone size={20} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    inverted
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.messagesList}
                    renderItem={({ item }) => (
                        <View style={[styles.messageBubble, item.isUser ? styles.userBubble : styles.driverBubble]}>
                            <Text style={[styles.messageText, item.isUser ? styles.userText : styles.driverText]}>
                                {item.text}
                            </Text>
                            <Text style={[styles.timeText, item.isUser ? { color: '#BFDBFE' } : { color: '#9CA3AF' }]}>
                                {item.time}
                            </Text>
                        </View>
                    )}
                />
            )}

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={10}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        value={inputText}
                        onChangeText={setInputText}
                        placeholderTextColor="#9CA3AF"
                        returnKeyType="send"
                        onSubmitEditing={handleSend}
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
                        <Send size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backBtn: { padding: 8 },
    headerInfo: { flex: 1, marginHorizontal: 12 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e1e1e' },
    headerStatus: { fontSize: 12, color: '#10B981' },
    callBtn: { padding: 10, backgroundColor: '#EFF6FF', borderRadius: 20 },

    messagesList: { padding: 16 },
    messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 12 },
    userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 2 },
    driverBubble: { alignSelf: 'flex-start', backgroundColor: '#F3F4F6', borderBottomLeftRadius: 2 },
    messageText: { fontSize: 16 },
    userText: { color: '#fff' },
    driverText: { color: '#1e1e1e' },
    timeText: { fontSize: 10, marginTop: 4, textAlign: 'right' },

    inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff' },
    input: { flex: 1, height: 44, backgroundColor: '#F9FAFB', borderRadius: 22, paddingHorizontal: 16, fontSize: 16, marginRight: 12, color: '#1e1e1e' },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
