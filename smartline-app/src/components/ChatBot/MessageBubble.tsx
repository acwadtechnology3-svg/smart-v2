import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useLanguage } from '../../context/LanguageContext';

interface MessageBubbleProps {
    role: 'bot' | 'user';
    text: string;
    timestamp: Date;
}

export default function MessageBubble({ role, text, timestamp }: MessageBubbleProps) {
    const { isRTL } = useLanguage();
    const isBot = role === 'bot';

    return (
        <View style={[
            styles.container,
            { alignItems: isBot ? (isRTL ? 'flex-end' : 'flex-start') : (isRTL ? 'flex-start' : 'flex-end') }
        ]}>
            <View style={[
                styles.bubble,
                isBot ? styles.botBubble : styles.userBubble,
                { alignSelf: isBot ? (isRTL ? 'flex-end' : 'flex-start') : (isRTL ? 'flex-start' : 'flex-end') }
            ]}>
                <Text style={[styles.text, isBot ? styles.botText : styles.userText]}>
                    {text}
                </Text>
                <Text style={[styles.timestamp, isBot ? styles.botTimestamp : styles.userTimestamp]}>
                    {timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
        paddingHorizontal: 16,
    },
    bubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
    },
    botBubble: {
        backgroundColor: '#EFF6FF',
        borderBottomLeftRadius: 4,
    },
    userBubble: {
        backgroundColor: Colors.primary,
        borderBottomRightRadius: 4,
    },
    text: {
        fontSize: 15,
        lineHeight: 22,
    },
    botText: {
        color: '#1F2937',
    },
    userText: {
        color: '#FFFFFF',
    },
    timestamp: {
        fontSize: 11,
        marginTop: 4,
    },
    botTimestamp: {
        color: '#6B7280',
    },
    userTimestamp: {
        color: '#E0E7FF',
    },
});
