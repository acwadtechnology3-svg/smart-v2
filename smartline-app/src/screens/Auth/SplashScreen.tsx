import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin, Car } from 'lucide-react-native';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

type SplashScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SplashScreen'>;

const { width } = Dimensions.get('window');

export default function SplashScreen() {
    const navigation = useNavigation<SplashScreenNavigationProp>();

    // Animation Values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.3)).current;
    const carSlideAnim = useRef(new Animated.Value(-width)).current; // Car starts off-screen left
    const textSlideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        // Animation Sequence
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(carSlideAnim, {
                toValue: 0,
                duration: 1200,
                easing: Easing.out(Easing.exp),
                useNativeDriver: true,
            }),
            Animated.timing(textSlideAnim, {
                toValue: 0,
                duration: 1000,
                easing: Easing.out(Easing.exp),
                useNativeDriver: true,
            })
        ]).start();

        const checkSession = async () => {
            try {
                // Wait for animation a bit
                await new Promise(resolve => setTimeout(resolve, 2000));

                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    const { user } = session;

                    // Check user role from metadata or db? 
                    // Let's assume we can fetch it or trust the session user metadata if available.
                    // But easier to just query the tables or look at AsyncStorage if we stored role there.
                    // In PasswordScreen, we stored: AsyncStorage.setItem('userSession', JSON.stringify({ token, user }));
                    // The 'user' object from axios login response likely has the role.

                    // Let's check AsyncStorage first for role hint, or just query Supabase.
                    // We'll query Supabase 'drivers' table to see if this ID exists there.

                    const { data: driverData, error } = await supabase
                        .from('drivers')
                        .select('status')
                        .eq('id', user.id)
                        .single();

                    if (driverData) {
                        // It's a driver
                        if (driverData.status === 'approved') {
                            navigation.reset({ index: 0, routes: [{ name: 'DriverHome' }] });
                        } else {
                            navigation.reset({ index: 0, routes: [{ name: 'DriverWaiting' }] });
                        }
                    } else {
                        // Assume customer if not in drivers table (or check customers table)
                        navigation.reset({ index: 0, routes: [{ name: 'CustomerHome' }] });
                    }
                } else {
                    navigation.replace('RoleSelection');
                }
            } catch (e) {
                // If anything fails, go to login
                navigation.replace('RoleSelection');
            }
        };

        checkSession();
    }, [navigation]);

    return (
        <View style={styles.container}>
            {/* Background Circles for decoration */}
            <View style={[styles.circle, styles.circle1]} />
            <View style={[styles.circle, styles.circle2]} />

            <View style={styles.content}>
                <Animated.View style={[styles.iconContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                    <View style={styles.pinWrapper}>
                        <MapPin size={80} color="#fff" fill={Colors.primary} strokeWidth={1} />
                    </View>
                </Animated.View>

                {/* Animated Car sliding in */}
                <Animated.View style={{ transform: [{ translateX: carSlideAnim }] }}>
                    <Car size={40} color="#fff" style={styles.carIcon} />
                </Animated.View>

                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: textSlideAnim }] }}>
                    <Text style={styles.logoText}>SmartLine</Text>
                    <Text style={styles.tagline}>Your Ride, Simplified.</Text>
                </Animated.View>
            </View>

            <View style={styles.footer}>
                <ActivityIndicatorDot />
            </View>
        </View>
    );
}

// Simple pulsing dot component
const ActivityIndicatorDot = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true })
            ])
        ).start();
    }, []);

    return <Animated.View style={[styles.loadingDot, { opacity }]} />;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    circle: {
        position: 'absolute',
        borderRadius: 1000,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    circle1: { width: width * 1.5, height: width * 1.5, top: -width * 0.5, left: -width * 0.2 },
    circle2: { width: width, height: width, bottom: -width * 0.2, right: -width * 0.2 },
    content: {
        alignItems: 'center',
        zIndex: 10,
    },
    iconContainer: {
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    pinWrapper: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    carIcon: {
        marginBottom: 20,
    },
    logoText: {
        fontSize: 48,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 2,
        marginBottom: 8,
        textAlign: 'center',
    },
    tagline: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.8)',
        letterSpacing: 1,
        textAlign: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 60,
    },
    loadingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
    },
});
