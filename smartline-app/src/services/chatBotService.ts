// AI Chatbot Service for Trip Booking
export type MessageRole = 'bot' | 'user';
export type ConversationStage = 'greeting' | 'pickup' | 'car_type' | 'destination' | 'confirmation' | 'complete';

export interface ChatMessage {
    id: string;
    role: MessageRole;
    text: string;
    timestamp: Date;
    quickActions?: QuickAction[];
}

export interface QuickAction {
    id: string;
    label: string;
    icon?: string;
    action: 'current_location' | 'select_map' | 'car_type' | 'confirm' | 'cancel';
    data?: any;
}

export interface BookingState {
    stage: ConversationStage;
    pickup?: {
        address: string;
        lat: number;
        lng: number;
    };
    carType?: string;
    destination?: {
        address: string;
        lat: number;
        lng: number;
    };
}

class ChatBotService {
    private state: BookingState = {
        stage: 'greeting'
    };

    resetConversation() {
        this.state = {
            stage: 'greeting'
        };
    }

    getGreeting(): ChatMessage {
        return {
            id: (Date.now() + Math.random()).toString(),
            role: 'bot',
            text: 'مرحباً! 👋 أنا مساعدك الذكي لحجز الرحلات. من أين تريد أن نبدأ رحلتك؟',
            timestamp: new Date(),
            quickActions: [
                {
                    id: 'current_loc',
                    label: 'استخدم موقعي الحالي 📍',
                    action: 'current_location'
                },
                {
                    id: 'select_map',
                    label: 'اختر على الخريطة 🗺️',
                    action: 'select_map'
                }
            ]
        };
    }

    processPickupLocation(address: string, lat: number, lng: number): ChatMessage {
        this.state.pickup = { address, lat, lng };
        this.state.stage = 'car_type';

        return {
            id: (Date.now() + Math.random()).toString(),
            role: 'bot',
            text: `رائع! سنبدأ من ${address}. الآن، ما نوع السيارة التي تفضلها؟`,
            timestamp: new Date(),
            quickActions: [
                { id: 'saver', label: 'موفر 🚗', action: 'car_type', data: 'saver' },
                { id: 'comfort', label: 'مريح 🚙', action: 'car_type', data: 'comfort' },
                { id: 'vip', label: 'في آي بي 🚘', action: 'car_type', data: 'vip' },
                { id: 'taxi', label: 'تاكسي 🚕', action: 'car_type', data: 'taxi' }
            ]
        };
    }

    processCarType(carType: string): ChatMessage {
        this.state.carType = carType;
        this.state.stage = 'destination';

        const carNames: Record<string, string> = {
            saver: 'موفر',
            comfort: 'مريح',
            vip: 'في آي بي',
            taxi: 'تاكسي'
        };

        return {
            id: (Date.now() + Math.random()).toString(),
            role: 'bot',
            text: `اخترت ${carNames[carType]}. ممتاز! 🎯 الآن، إلى أين تريد الذهاب؟`,
            timestamp: new Date(),
            quickActions: [
                {
                    id: 'select_dest_map',
                    label: 'اختر الوجهة على الخريطة 🗺️',
                    action: 'select_map'
                }
            ]
        };
    }

    processDestination(address: string, lat: number, lng: number): ChatMessage {
        this.state.destination = { address, lat, lng };
        this.state.stage = 'confirmation';

        // Simple estimation logic
        // In a real app, calculate distance using Haversine formula
        const estimatedPrice = Math.floor(Math.random() * (50 - 20 + 1) + 20); // Mock price 20-50
        const estimatedTime = Math.floor(Math.random() * (15 - 5 + 1) + 5);   // Mock time 5-15 mins

        return {
            id: (Date.now() + Math.random()).toString(),
            role: 'bot',
            text: `ممتاز! 🎉\n\n📍 من: ${this.state.pickup?.address}\n📍 إلى: ${address}\n🚗 السيارة: ${this.state.carType}\n\n💰 السعر التقديري: ${estimatedPrice} جنيه\n⏱️ الوقت المقدر: ${estimatedTime} دقيقة\n\nهل تريد تأكيد الحجز والبحث عن سائق؟`,
            timestamp: new Date(),
            quickActions: [
                { id: 'confirm', label: 'تأكيد والبحث عن سائق ✅', action: 'confirm' },
                { id: 'cancel', label: 'إلغاء ❌', action: 'cancel' }
            ]
        };
    }

    getBookingData() {
        return this.state;
    }

    getCurrentStage(): ConversationStage {
        return this.state.stage;
    }
}

export const chatBotService = new ChatBotService();
