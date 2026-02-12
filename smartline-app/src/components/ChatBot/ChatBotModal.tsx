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
    ActivityIndicator,
    Animated
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
import { LinearGradient } from 'expo-linear-gradient';

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
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const cardTranslate = useRef(new Animated.Value(40)).current;

    useEffect(() => {
        if (visible && messages.length === 0) {
            // Start conversation
            const greeting = chatBotService.getGreeting();
            setMessages([greeting]);
        }
    }, [visible]);

    useEffect(() => {
        if (visible) {
            animateIn();
        } else {
            overlayOpacity.setValue(0);
            cardTranslate.setValue(40);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    useEffect(() => {
        // Auto-scroll to bottom when new messages arrive
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages]);

    const animateIn = () => {
        overlayOpacity.setValue(0);
        cardTranslate.setValue(40);
        Animated.parallel([
            Animated.timing(overlayOpacity, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
            }),
            Animated.spring(cardTranslate, {
                toValue: 0,
                damping: 16,
                stiffness: 120,
                mass: 0.9,
                useNativeDriver: true,
            })
        ]).start();
    };

    const animateOut = (callback?: () => void) => {
        Animated.parallel([
            Animated.timing(overlayOpacity, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }),
            Animated.timing(cardTranslate, {
                toValue: 40,
                duration: 180,
                useNativeDriver: true,
            })
        ]).start(() => {
            if (callback) callback();
        });
    };

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
        animateOut(() => {
            chatBotService.resetConversation();
            setMessages([]);
            setShowMapPicker(false);
            onClose();
        });
    };

    const lastMessage = messages[messages.length - 1];

    return (
        <>
            <Modal
                visible={visible}
                transparent
                animationType="none"
                onRequestClose={handleClose}
            >
                <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}> 
                    <KeyboardAvoidingView
                        style={styles.keyboardView}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        <Animated.View style={[styles.sheet, { transform: [{ translateY: cardTranslate }] }]}> 
                            <View style={styles.handle} />
                            <LinearGradient
                                colors={['#DBEAFE', '#FFFFFF']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.hero}
                            >
                                <View style={[styles.heroHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarEmoji}>🤖</Text>
                                    </View>
                                    <View style={styles.heroText}>
                                        <Text style={styles.heroTitle}>مساعد الحجز الذكي</Text>
                                        <Text style={styles.heroSubtitle}>خطوات بسيطة لحجز رحلتك</Text>
                                        <View style={[styles.heroBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                            <MapPin size={14} color="#0F172A" />
                                            <Text style={styles.heroBadgeText}>اختر المواقع بسهولة</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                        <X size={22} color="#0F172A" />
                                    </TouchableOpacity>
                                </View>
                            </LinearGradient>

                            <View style={styles.messagesWrapper}>
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
                            </View>

                            {lastMessage?.quickActions && (
                                <View style={styles.quickActionsWrapper}>
                                    <QuickActions
                                        actions={lastMessage.quickActions}
                                        onActionPress={handleActionPress}
                                    />
                                </View>
                            )}

                            {chatBotService.getCurrentStage() === 'destination' && (
                                <View style={[styles.inputContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
                                    <TextInput
                                        style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                                        placeholder="اكتب عنوان الوجهة..."
                                        value={inputText}
                                        onChangeText={setInputText}
                                        onSubmitEditing={handleSendMessage}
                                    />
                                    <TouchableOpacity
                                        style={styles.sendButton}
                                        onPress={handleSendMessage}
                                        disabled={!inputText.trim()}
                                        activeOpacity={0.9}
                                    >
                                        <LinearGradient
                                            colors={['#2563EB', Colors.primary]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={[styles.sendGradient, { opacity: inputText.trim() ? 1 : 0.6 }]}
                                        >
                                            <Send size={20} color="#FFFFFF" />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Animated.View>
                    </KeyboardAvoidingView>
                </Animated.View>
            </Modal>

            <MapPickerModal
                visible={showMapPicker}
                onClose={() => setShowMapPicker(false)}
                onLocationSelected={handleMapLocationSelected}
                title={mapPickerTitle}
            />
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        justifyContent: 'flex-end',
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 12,
        overflow: 'hidden',
        maxHeight: '95%',
    },
    handle: {
        width: 54,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(148, 163, 184, 0.6)',
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 6,
    },
    hero: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 16,
    },
    heroHeader: {
        alignItems: 'center',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0EA5E9',
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
        marginHorizontal: 8,
    },
    avatarEmoji: {
        fontSize: 28,
    },
    heroText: {
        flex: 1,
        paddingHorizontal: 8,
    },
    heroTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
    },
    heroSubtitle: {
        fontSize: 14,
        color: '#1E293B',
        marginTop: 4,
    },
    heroBadge: {
        marginTop: 10,
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: 'rgba(248, 250, 252, 0.7)',
        borderRadius: 999,
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
    },
    heroBadgeText: {
        color: '#0F172A',
        fontSize: 12,
        fontWeight: '600',
    },
    closeButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(248,250,252,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    messagesWrapper: {
        flex: 1,
        paddingHorizontal: 4,
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
        color: '#64748B',
        fontSize: 14,
    },
    quickActionsWrapper: {
        paddingVertical: 4,
        backgroundColor: '#FFFFFF',
    },
    inputContainer: {
        padding: 16,
        paddingBottom: 24,
        alignItems: 'center',
        gap: 12,
    },
    input: {
        flex: 1,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 18,
        fontSize: 16,
        color: '#0F172A',
    },
    sendButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    sendGradient: {
        flex: 1,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
