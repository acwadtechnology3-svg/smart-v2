import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Copy, Share2, Ticket, Users } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export default function InviteFriendsScreen() {
    const navigation = useNavigation();
    const referralCode = 'SALAH882'; // ideally from props or context

    const copyToClipboard = async () => {
        // Mock copy functionality as expo-clipboard is not installed
        // In a real app, you would install expo-clipboard or @react-native-clipboard/clipboard
        Alert.alert('Success', 'Referral code copied to clipboard!');
    };

    const shareCode = async () => {
        try {
            await Share.share({
                message: `Join me on SmartLine! Use my code ${referralCode} to get 50% off your first trip. Download the app now!`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Invite Friends</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.illustrationParams}>
                    <View style={styles.iconCircle}>
                        <Ticket size={48} color="#F97316" />
                    </View>
                    <View style={styles.badge}>
                        <Users size={14} color="#ffffff" />
                        <Text style={styles.badgeText}>Refer & Earn</Text>
                    </View>
                </View>

                <Text style={styles.mainTitle}>Give 50%, Get 50%</Text>
                <Text style={styles.description}>
                    Invite your friends to use SmartLine. When they take their first trip, you both get a 50% discount!
                </Text>

                <View style={styles.card}>
                    <Text style={styles.cardLabel}>YOUR REFERRAL CODE</Text>
                    <TouchableOpacity style={styles.codeContainer} onPress={copyToClipboard} activeOpacity={0.7}>
                        <Text style={styles.codeText}>{referralCode}</Text>
                        <View style={styles.copyButton}>
                            <Copy size={18} color="#3B82F6" />
                            <Text style={styles.copyText}>Copy</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.spacer} />

                <TouchableOpacity style={styles.shareBtnContainer} onPress={shareCode} activeOpacity={0.8}>
                    <LinearGradient
                        colors={['#3B82F6', '#2563EB']}
                        style={styles.shareBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Share2 size={20} color="#fff" style={styles.shareIcon} />
                        <Text style={styles.shareBtnText}>Share Code</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    content: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
    },
    illustrationParams: {
        marginTop: 20,
        marginBottom: 24,
        alignItems: 'center',
        position: 'relative',
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFF7ED',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#ffffff',
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    badge: {
        position: 'absolute',
        bottom: 0,
        backgroundColor: '#F97316',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    badgeText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    mainTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
        paddingHorizontal: 10,
    },
    card: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    cardLabel: {
        fontSize: 12,
        color: '#9CA3AF',
        marginBottom: 12,
        fontWeight: '700',
        letterSpacing: 1,
        textAlign: 'center',
    },
    codeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
    },
    codeText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: 1,
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#EFF6FF',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    copyText: {
        fontSize: 14,
        color: '#3B82F6',
        fontWeight: '600',
    },
    spacer: {
        flex: 1,
    },
    shareBtnContainer: {
        width: '100%',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
        marginTop: 20,
    },
    shareBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 16,
    },
    shareIcon: {
        marginRight: 10,
    },
    shareBtnText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
