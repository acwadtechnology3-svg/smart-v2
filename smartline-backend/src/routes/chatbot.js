const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// Start a new conversation
router.post('/start', async (req, res) => {
    try {
        const userId = req.user.id;

        // Create new conversation
        const { data: conversation, error } = await supabase
            .from('chat_conversations')
            .insert({
                user_id: userId,
                status: 'active',
                conversation_stage: 'greeting'
            })
            .select()
            .single();

        if (error) throw error;

        // Create greeting message
        const { data: message, error: messageError } = await supabase
            .from('chat_messages')
            .insert({
                conversation_id: conversation.id,
                role: 'bot',
                message: 'مرحباً! 👋 أنا مساعدك الذكي لحجز الرحلات. من أين تريد أن نبدأ رحلتك؟',
                quick_actions: [
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
            })
            .select()
            .single();

        if (messageError) throw messageError;

        res.json({
            success: true,
            conversation,
            message
        });
    } catch (error) {
        console.error('Start conversation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Process user message
router.post('/message', async (req, res) => {
    try {
        const userId = req.user.id;
        const { conversationId, message, action, data } = req.body;

        // Verify conversation belongs to user
        const { data: conversation, error: convError } = await supabase
            .from('chat_conversations')
            .select('*')
            .eq('id', conversationId)
            .eq('user_id', userId)
            .single();

        if (convError || !conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        // Save user message
        await supabase
            .from('chat_messages')
            .insert({
                conversation_id: conversationId,
                role: 'user',
                message: message || ''
            });

        // Process based on current stage
        let botResponse;
        let updateData = {};

        switch (conversation.conversation_stage) {
            case 'greeting':
            case 'pickup':
                if (action === 'current_location' || action === 'select_map') {
                    // User selected pickup location
                    updateData = {
                        pickup_address: data.address,
                        pickup_lat: data.lat,
                        pickup_lng: data.lng,
                        conversation_stage: 'car_type'
                    };

                    botResponse = {
                        message: `رائع! سنبدأ من ${data.address}. الآن، ما نوع السيارة التي تفضلها؟`,
                        quick_actions: [
                            { id: 'saver', label: 'موفر 🚗', action: 'car_type', data: 'saver' },
                            { id: 'comfort', label: 'مريح 🚙', action: 'car_type', data: 'comfort' },
                            { id: 'vip', label: 'في آي بي 🚘', action: 'car_type', data: 'vip' },
                            { id: 'taxi', label: 'تاكسي 🚕', action: 'car_type', data: 'taxi' }
                        ]
                    };
                }
                break;

            case 'car_type':
                if (action === 'car_type') {
                    const carNames = {
                        saver: 'موفر',
                        comfort: 'مريح',
                        vip: 'في آي بي',
                        taxi: 'تاكسي'
                    };

                    updateData = {
                        car_type: data,
                        conversation_stage: 'destination'
                    };

                    botResponse = {
                        message: `اخترت ${carNames[data]}. ممتاز! 🎯 الآن، إلى أين تريد الذهاب؟`,
                        quick_actions: [
                            {
                                id: 'select_dest_map',
                                label: 'اختر الوجهة على الخريطة 🗺️',
                                action: 'select_map'
                            }
                        ]
                    };
                }
                break;

            case 'destination':
                if (action === 'select_map' || message) {
                    updateData = {
                        destination_address: data?.address || message,
                        destination_lat: data?.lat,
                        destination_lng: data?.lng,
                        conversation_stage: 'confirmation'
                    };

                    const updatedConv = { ...conversation, ...updateData };

                    botResponse = {
                        message: `ممتاز! 🎉\n\n📍 من: ${updatedConv.pickup_address}\n📍 إلى: ${updatedConv.destination_address}\n🚗 السيارة: ${updatedConv.car_type}\n\nهل تريد تأكيد الحجز؟`,
                        quick_actions: [
                            { id: 'confirm', label: 'تأكيد الحجز ✅', action: 'confirm' },
                            { id: 'cancel', label: 'إلغاء ❌', action: 'cancel' }
                        ]
                    };
                }
                break;

            case 'confirmation':
                if (action === 'confirm') {
                    updateData = {
                        conversation_stage: 'complete',
                        status: 'completed'
                    };

                    botResponse = {
                        message: 'تم! جاري تحويلك لإتمام الحجز...',
                        booking_data: {
                            pickup: conversation.pickup_address,
                            destination: updateData.destination_address || conversation.destination_address,
                            pickupCoordinates: [conversation.pickup_lng, conversation.pickup_lat],
                            destinationCoordinates: [
                                updateData.destination_lng || conversation.destination_lng,
                                updateData.destination_lat || conversation.destination_lat
                            ],
                            carType: conversation.car_type
                        }
                    };
                }
                break;
        }

        // Update conversation
        if (Object.keys(updateData).length > 0) {
            await supabase
                .from('chat_conversations')
                .update(updateData)
                .eq('id', conversationId);
        }

        // Save bot response
        if (botResponse) {
            const { data: botMessage } = await supabase
                .from('chat_messages')
                .insert({
                    conversation_id: conversationId,
                    role: 'bot',
                    message: botResponse.message,
                    quick_actions: botResponse.quick_actions || null
                })
                .select()
                .single();

            res.json({
                success: true,
                message: botMessage,
                booking_data: botResponse.booking_data
            });
        } else {
            res.json({
                success: true,
                message: null
            });
        }
    } catch (error) {
        console.error('Process message error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get conversation history
router.get('/:conversationId/messages', async (req, res) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;

        // Verify conversation belongs to user
        const { data: conversation, error: convError } = await supabase
            .from('chat_conversations')
            .select('*')
            .eq('id', conversationId)
            .eq('user_id', userId)
            .single();

        if (convError || !conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        // Get all messages
        const { data: messages, error: messagesError } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;

        res.json({
            success: true,
            conversation,
            messages
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get user's active conversation
router.get('/active', async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: conversation, error } = await supabase
            .from('chat_conversations')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        res.json({
            success: true,
            conversation: conversation || null
        });
    } catch (error) {
        console.error('Get active conversation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
