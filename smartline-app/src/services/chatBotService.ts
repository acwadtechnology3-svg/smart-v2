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

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Calculate price based on distance and car type
function calculatePrice(distanceKm: number, carType: string): number {
    const basePrices: Record<string, number> = {
        saver: 8,    // 8 EGP base + 3 EGP/km
        comfort: 12, // 12 EGP base + 4 EGP/km
        vip: 20,     // 20 EGP base + 6 EGP/km
        taxi: 10     // 10 EGP base + 3.5 EGP/km
    };

    const perKmPrices: Record<string, number> = {
        saver: 3,
        comfort: 4,
        vip: 6,
        taxi: 3.5
    };

    const basePrice = basePrices[carType] || 10;
    const perKm = perKmPrices[carType] || 3.5;

    return Math.ceil(basePrice + (distanceKm * perKm));
}

// Calculate estimated duration based on distance
function calculateDuration(distanceKm: number): number {
    // Assume average speed of 30 km/h in city traffic
    const avgSpeedKmh = 30;
    const durationMinutes = (distanceKm / avgSpeedKmh) * 60;
    return Math.ceil(durationMinutes);
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
            text: `رائع! سنبدأ من:\n📍 ${address}\n\nالآن، ما نوع السيارة التي تفضلها؟`,
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
            saver: 'موفر 🚗',
            comfort: 'مريح 🚙',
            vip: 'في آي بي 🚘',
            taxi: 'تاكسي 🚕'
        };

        return {
            id: (Date.now() + Math.random()).toString(),
            role: 'bot',
            text: `اخترت ${carNames[carType]}. ممتاز! 🎯\n\nالآن، إلى أين تريد الذهاب؟`,
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

        console.log('🚀 [ChatBot] Processing destination:', { address, lat, lng });
        console.log('🚀 [ChatBot] Current state:', this.state);

        const carNames: Record<string, string> = {
            saver: 'موفر',
            comfort: 'مريح',
            vip: 'في آي بي',
            taxi: 'تاكسي'
        };

        // Calculate real distance if coordinates are available
        let distanceKm = 0;
        let estimatedPrice = 25;
        let estimatedTime = 10;

        if (this.state.pickup && lat !== 0 && lng !== 0) {
            distanceKm = calculateDistance(
                this.state.pickup.lat,
                this.state.pickup.lng,
                lat,
                lng
            );
            estimatedPrice = calculatePrice(distanceKm, this.state.carType || 'saver');
            estimatedTime = calculateDuration(distanceKm);
            console.log('✅ [ChatBot] Calculated with real coordinates:', { distanceKm, estimatedPrice, estimatedTime });
        } else {
            // Fallback to mock values if no coordinates
            distanceKm = Math.random() * 10 + 2; // 2-12 km
            estimatedPrice = calculatePrice(distanceKm, this.state.carType || 'saver');
            estimatedTime = calculateDuration(distanceKm);
            console.log('⚠️ [ChatBot] Using fallback values:', { distanceKm, estimatedPrice, estimatedTime });
        }

        const summaryText = `✅ تم! إليك ملخص رحلتك:

━━━━━━━━━━━━━━━━━━━━━━
📍 نقطة الانطلاق
${this.state.pickup?.address || 'غير محدد'}

📍 الوجهة
${address}

🚗 نوع السيارة
${carNames[this.state.carType || 'saver']}

━━━━━━━━━━━━━━━━━━━━━━
📏 المسافة: ${distanceKm.toFixed(1)} كم
⏱️ الوقت المقدر: ${estimatedTime} دقيقة
💰 السعر التقديري: ${estimatedPrice} جنيه
━━━━━━━━━━━━━━━━━━━━━━

هل تريد تأكيد الحجز والبحث عن سائق؟`;

        console.log('📝 [ChatBot] Generated summary text:', summaryText);

        return {
            id: (Date.now() + Math.random()).toString(),
            role: 'bot',
            text: summaryText,
            timestamp: new Date(),
            quickActions: [
                { id: 'confirm', label: '✅ تأكيد والبحث عن سائق', action: 'confirm' },
                { id: 'cancel', label: '❌ إلغاء', action: 'cancel' }
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
