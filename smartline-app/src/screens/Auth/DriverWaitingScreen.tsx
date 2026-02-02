import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, Animated, Easing, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Clock, CheckCircle2, XCircle, RefreshCw, LogOut, MessageCircle } from 'lucide-react-native';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

type DriverWaitingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DriverWaiting'>;

export default function DriverWaitingScreen() {
    const navigation = useNavigation<DriverWaitingScreenNavigationProp>();
    const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const [checking, setChecking] = useState(false);

    // Animation values
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        startPulse();
        checkStatus();
        const interval = setInterval(checkStatus, 10000); // Pool every 10s
        return () => clearInterval(interval);
    }, []);

    const startPulse = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1000,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease),
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease),
                }),
            ])
        ).start();
    };

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const checkStatus = async (isManual = false) => {
        if (isManual) setChecking(true);
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            console.log("Checking driver status for:", user.id);

            const { data, error } = await supabase
                .from('drivers')
                .select('status')
                .eq('id', user.id)
                .single();

            if (data) {
                console.log("Driver Status:", data.status);
                setStatus(data.status);

                if (data.status === 'approved') {
                    if (isManual) alert("Congratulations! You are approved.");
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'DriverHome' }],
                    });
                } else if (isManual && data.status === 'pending') {
                    alert("Your application is still under review. We appreciate your patience.");
                }
            } else if (error) {
                console.error("Error fetching status:", error);
            }
        } catch (error) {
            console.error('Error checking status:', error);
        } finally {
            if (isManual) setChecking(false);
            rotateAnim.setValue(0); // Stop spinning
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigation.reset({
            index: 0,
            routes: [{ name: 'RoleSelection' }],
        });
    };

    const contactSupport = () => {
        Linking.openURL('mailto:support@smartline.com');
    };

    const renderContent = () => {
        switch (status) {
            case 'rejected':
                return (
                    <>
                        <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                            <XCircle size={64} color={Colors.danger} />
                        </View>
                        <Text style={styles.title}>Application Rejected</Text>
                        <Text style={styles.description}>
                            Unfortunately, your application could not be approved at this time.
                            Please review the requirements or contact support for assistance.
                        </Text>
                        <TouchableOpacity style={[styles.button, styles.contactButton]} onPress={contactSupport}>
                            <MessageCircle size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.buttonText}>Contact Support</Text>
                        </TouchableOpacity>
                    </>
                );
            case 'approved': // Should auto-navigate, but just in case
                return (
                    <>
                        <View style={[styles.iconContainer, { backgroundColor: '#D1FAE5' }]}>
                            <CheckCircle2 size={64} color={Colors.success || '#10B981'} />
                        </View>
                        <Text style={styles.title}>Approved!</Text>
                        <Text style={styles.description}>
                            Welcome aboard! You are now ready to start driving.
                        </Text>
                    </>
                );
            default: // Pending
                return (
                    <>
                        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
                            <Clock size={64} color={Colors.primary} />
                        </Animated.View>
                        <Text style={styles.title}>Under Review</Text>
                        <Text style={styles.subtitle}>Application ID: #WaitList</Text>
                        <Text style={styles.description}>
                            Thanks for submitting your documents! Our team is currently reviewing your profile.
                            This usually takes 24-48 hours.
                        </Text>

                        <View style={styles.statusBadge}>
                            <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />
                            <Text style={styles.statusText}>Review in progress...</Text>
                        </View>
                    </>
                );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
                    <LogOut size={20} color={Colors.textSecondary} />
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {renderContent()}
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.refreshButton} onPress={() => checkStatus(true)} disabled={checking}>
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <RefreshCw size={20} color={Colors.textSecondary} />
                    </Animated.View>
                    <Text style={styles.refreshText}>{checking ? 'Checking...' : 'Refresh Status'}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { padding: 20, alignItems: 'flex-end' },
    content: { flex: 1, padding: 32, justifyContent: 'center', alignItems: 'center' },

    iconContainer: {
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: '#E0F2FE', // Light blue background
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 32,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1, shadowRadius: 20, elevation: 5
    },

    title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 24, textTransform: 'uppercase', letterSpacing: 1 },
    description: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24, marginBottom: 32 },

    statusBadge: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB'
    },
    statusText: { color: Colors.textPrimary, fontWeight: '600' },

    button: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12 },
    contactButton: { backgroundColor: Colors.primary },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    footer: { padding: 24, alignItems: 'center' },
    refreshButton: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    refreshText: { marginLeft: 8, color: Colors.textSecondary, fontWeight: '600' },

    signOutButton: { flexDirection: 'row', alignItems: 'center', padding: 8 },
    signOutText: { marginLeft: 8, color: Colors.textSecondary, fontWeight: '600' },
});
