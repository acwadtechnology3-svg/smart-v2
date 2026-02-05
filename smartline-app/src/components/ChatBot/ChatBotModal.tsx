import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator
} from 'react-native';
import { X, Send, MapPin } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { useLanguage } from '../../context/LanguageContext';
import { chatBotService, ChatMessage, QuickAction } from '../../services/chatBotService';
import MessageBubble from './MessageBubble';
import QuickActions from './QuickActions';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import MapPickerModal from './MapPickerModal';

interface ChatBotModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function ChatBotModal({ visible, onClose }: ChatBotModalProps) {
    const { t, isRTL } = useLanguage();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);
    const [mapPickerTitle, setMapPickerTitle] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (visible && messages.length === 0) {
            // Start conversation
            const greeting = chatBotService.getGreeting();
            setMessages([greeting]);
        }
    }, [visible]);

    useEffect(() => {
        // Auto-scroll to bottom when new messages arrive
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages]);

    const addMessage = (message: ChatMessage) => {
        setMessages(prev => [...prev, message]);
    };

    const addUserMessage = (text: string) => {
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text,
            timestamp: new Date()
        };
        addMessage(userMessage);
    };

    const handleCurrentLocation = async () => {
        setLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('تم رفض الإذن', 'نحتاج إلى إذن الموقع لاستخدام موقعك الحالي. يرجى اختيار الموقع على الخريطة بدلاً من ذلك.');
                setLoading(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const geocode = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });

            const address = geocode[0]
                ? `${geocode[0].street || ''}, ${geocode[0].city || ''}`
                : `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`;

            addUserMessage(t('useCurrentLocation') || 'استخدم موقعي الحالي');

            const botResponse = chatBotService.processPickupLocation(
                address,
                location.coords.latitude,
                location.coords.longitude
            );
            addMessage(botResponse);
        } catch (error) {
            Alert.alert('خطأ', 'لم نتمكن من الحصول على موقعك. يرجى المحاولة مرة أخرى أو اختيار الموقع على الخريطة.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectOnMap = () => {
        const stage = chatBotService.getCurrentStage();

        if (stage === 'pickup' || stage === 'greeting') {
            setMapPickerTitle('اختر موقع الانطلاق');
            setShowMapPicker(true);
        } else if (stage === 'destination') {
            setMapPickerTitle('اختر الوجهة');
            setShowMapPicker(true);
        }
    };

    const handleMapLocationSelected = (address: string, lat: number, lng: number) => {
        const stage = chatBotService.getCurrentStage();

        // Show user what they selected
        // addUserMessage(address); // Optional: decide if we want to show address or 'Selected on map'
        // Using address is better

        if (stage === 'pickup' || stage === 'greeting') {
            addUserMessage(address);
            const botResponse = chatBotService.processPickupLocation(address, lat, lng);
            addMessage(botResponse);
        } else if (stage === 'destination') {
            addUserMessage(address);
            const botResponse = chatBotService.processDestination(address, lat, lng);
            addMessage(botResponse);
        }
    };

    const handleCarTypeSelection = (carType: string) => {
        const carNames: Record<string, string> = {
            saver: 'موفر',
            comfort: 'مريح',
            vip: 'في آي بي',
            taxi: 'تاكسي'
        };

        addUserMessage(carNames[carType]);
        const botResponse = chatBotService.processCarType(carType);
        addMessage(botResponse);
    };

    const handleConfirmBooking = () => {
        const bookingData = chatBotService.getBookingData();

        if (!bookingData.pickup || !bookingData.destination || !bookingData.carType) {
            Alert.alert('خطأ', 'معلومات الحجز غير مكتملة');
            return;
        }

        // Navigate to trip options with the booking data
        onClose();
        chatBotService.resetConversation();
        setMessages([]);

        navigation.navigate('TripOptions', {
            pickup: bookingData.pickup.address,
            destination: bookingData.destination.address,
            pickupCoordinates: [bookingData.pickup.lng, bookingData.pickup.lat],
            destinationCoordinates: [bookingData.destination.lng, bookingData.destination.lat],
            preselectedRide: bookingData.carType,
            autoRequest: true
        });
    };

    const handleActionPress = (action: QuickAction) => {
        switch (action.action) {
            case 'current_location':
                handleCurrentLocation();
                break;
            case 'select_map':
                handleSelectOnMap();
                break;
            case 'car_type':
                if (action.data) {
                    handleCarTypeSelection(action.data);
                }
                break;
            case 'confirm':
                handleConfirmBooking();
                break;
            case 'cancel':
                handleClose();
                break;
        }
    };

    const handleSendMessage = () => {
        if (!inputText.trim()) return;

        const stage = chatBotService.getCurrentStage();
        addUserMessage(inputText);

        // Simple text processing based on stage
        if (stage === 'destination') {
            // Treat as destination address
            const botResponse = chatBotService.processDestination(inputText, 0, 0);
            addMessage(botResponse);
        }

        setInputText('');
    };

    const handleClose = () => {
        chatBotService.resetConversation();
        setMessages([]);
        onClose();
    };

    const lastMessage = messages[messages.length - 1];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={[styles.headerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <X size={24} color="#1F2937" />
                        </TouchableOpacity>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>مساعد الحجز الذكي 🤖</Text>
                            <Text style={styles.headerSubtitle}>دعني أساعدك في حجز رحلتك</Text>
                        </View>
                    </View>
                </View>

                {/* Messages */}
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                >
                    {messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            role={message.role}
                            text={message.text}
                            timestamp={message.timestamp}
                        />
                    ))}
                    {loading && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color={Colors.primary} />
                            <Text style={styles.loadingText}>جاري المعالجة...</Text>
                        </View>
                    )}
                </ScrollView>

                {/* Quick Actions */}
                {lastMessage?.quickActions && (
                    <QuickActions
                        actions={lastMessage.quickActions}
                        onActionPress={handleActionPress}
                    />
                )}

                {/* Input */}
                {chatBotService.getCurrentStage() === 'destination' && (
                    <View style={styles.inputContainer}>
                        <TouchableOpacity
                            style={styles.sendButton}
                            onPress={handleSendMessage}
                            disabled={!inputText.trim()}
                        >
                            <Send size={20} color={inputText.trim() ? Colors.primary : '#9CA3AF'} />
                        </TouchableOpacity>
                        <TextInput
                            style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                            placeholder="اكتب عنوان الوجهة..."
                            value={inputText}
                            onChangeText={setInputText}
                            onSubmitEditing={handleSendMessage}
                        />
                    </View>
                )}
            </KeyboardAvoidingView>

            <MapPickerModal
                visible={showMapPicker}
                onClose={() => setShowMapPicker(false)}
                onLocationSelected={handleMapLocationSelected}
                title={mapPickerTitle}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        paddingVertical: 16,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    loadingText: {
        marginLeft: 8,
        color: '#6B7280',
        fontSize: 14,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    input: {
        flex: 1,
        height: 44,
        backgroundColor: '#F3F4F6',
        borderRadius: 22,
        paddingHorizontal: 16,
        fontSize: 15,
        marginRight: 8,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
