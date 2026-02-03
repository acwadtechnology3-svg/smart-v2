import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { apiRequest } from '../../services/backend';

type PasswordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Password'>;
type PasswordScreenRouteProp = RouteProp<RootStackParamList, 'Password'>;

import { useLanguage } from '../../context/LanguageContext';

export default function PasswordScreen() {
    const navigation = useNavigation<PasswordScreenNavigationProp>();
    const route = useRoute<PasswordScreenRouteProp>();
    const { phone, role } = route.params;
    const { t, isRTL } = useLanguage();

    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!password) {
            Alert.alert(t('error'), t('pleaseEnterPassword'));
            return;
        }

        setLoading(true);

        try {
            // Trim phone and password just in case
            const cleanPhone = phone.trim();
            const cleanPassword = password.trim();

            const response = await axios.post(`${API_URL}/auth/login`, {
                phone: cleanPhone,
                password: cleanPassword,
            });

            const { user, token } = response.data;

            // 🛑 ROLE CHECK: If we are in a specific role flow (e.g. Driver App Login), enforce it.
            if (role && role === 'driver' && user.role !== 'driver') {
                throw new Error(t('accountNotDriver'));
            }

            // Clear any old session first to ensure no state pollution
            await AsyncStorage.removeItem('userSession');
            await AsyncStorage.setItem('userSession', JSON.stringify({ token, user }));

            if (user.role === 'driver') {
                // Check if driver profile is complete
                let driverData: any = null;
                try {
                    const response = await apiRequest<{ driver: any }>('/drivers/me');
                    driverData = response.driver;
                } catch {
                    driverData = null;
                }

                if (!driverData) {
                    setLoading(false);
                    navigation.replace('DriverSignup', { phone: cleanPhone });
                    return;
                }

                setLoading(false);

                if (driverData.status !== 'approved') {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'DriverWaiting' }],
                    });
                } else {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'DriverHome' }],
                    });
                }
            } else {
                setLoading(false);
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'CustomerHome' }],
                });
            }

        } catch (err: any) {
            setLoading(false);
            console.error('[Password] Login Error:', err);

            let message = t('loginFailed');

            // Handle specific Known Errors
            const rawMessage = err?.response?.data?.error || err.message || '';

            if (rawMessage === t('accountNotDriver') || (typeof rawMessage === 'string' && rawMessage.includes('not registered'))) {
                message = t('accountNotDriver');
            } else if (typeof rawMessage === 'string' && (rawMessage.includes('Network Error') || rawMessage.includes('fetch failed'))) {
                message = t('connectionError');
            } else if (err?.response?.status === 401) {
                message = t('loginFailed'); // Likely wrong password
            } else {
                message = t('genericError');
            }

            Alert.alert(t('error'), message);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.inner}>
                        {/* Header Section */}
                        <View style={styles.header}>
                            <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', width: '100%' }}>
                                <TouchableOpacity
                                    onPress={() => navigation.goBack()}
                                    style={[
                                        styles.backButton,
                                        { alignSelf: isRTL ? 'flex-end' : 'flex-start', transform: [{ scaleX: isRTL ? -1 : 1 }] }
                                    ]}
                                >
                                    <ArrowLeft size={28} color={Colors.textPrimary} />
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{t('welcomeBack')} 👋</Text>
                            <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                                {t('enterPasswordFor')} <Text style={styles.phoneHighlight}>{phone}</Text>
                            </Text>
                        </View>

                        {/* Form Section */}
                        <View style={styles.form}>
                            <View style={styles.inputContainer}>
                                <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('password')}</Text>
                                <View style={[styles.passwordInputWrapper, showPassword && styles.inputActive, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                    <TextInput
                                        style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                                        placeholder={t('enterPassword')}
                                        placeholderTextColor="#9CA3AF"
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={setPassword}
                                        autoCapitalize="none"
                                        autoComplete="off"
                                        autoCorrect={false}
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeIcon}
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={22} color={Colors.primary} /> : <Eye size={22} color="#9CA3AF" />}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.forgotPassword, { alignSelf: isRTL ? 'flex-start' : 'flex-end' }]}
                            >
                                <Text style={styles.forgotPasswordText}>{t('forgotPassword')}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Footer / Button Section */}
                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={[styles.button, loading && styles.buttonDisabled]}
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>{t('login')}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    keyboardView: { flex: 1 },
    inner: { flex: 1, justifyContent: 'space-between' },

    header: { paddingHorizontal: 24, paddingTop: 60 }, // 👽 02-02-2026: Increased top padding (was 20)
    backButton: { marginBottom: 24, alignSelf: 'flex-start', padding: 4, marginLeft: -4 },
    title: { fontSize: 32, fontWeight: '800', color: '#111827', marginBottom: 12, letterSpacing: -0.5 },
    subtitle: { fontSize: 16, color: '#6B7280', lineHeight: 24 },
    phoneHighlight: { color: Colors.primary, fontWeight: '700' },

    form: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },

    inputContainer: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    passwordInputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 16,
        backgroundColor: '#F9FAFB',
        height: 56,
        paddingHorizontal: 16,
        // transition: 'all 0.2s' // Removed unsupported property
    },
    inputActive: { borderColor: Colors.primary, backgroundColor: '#F5F3FF' },
    input: { flex: 1, fontSize: 16, color: '#111827', height: '100%' },
    eyeIcon: { padding: 8 },

    forgotPassword: { alignSelf: 'flex-end', paddingVertical: 8 },
    forgotPasswordText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },

    footer: { padding: 24, paddingTop: 10 },
    button: {
        backgroundColor: Colors.primary,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4
    },
    buttonDisabled: { opacity: 0.7, backgroundColor: '#9CA3AF', shadowOpacity: 0 },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
