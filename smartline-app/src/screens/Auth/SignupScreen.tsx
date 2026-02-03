import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';
import { ArrowLeft } from 'lucide-react-native';
import axios from 'axios';
import { API_URL } from '../../config/api';

type SignupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Signup'>;
type SignupScreenRouteProp = RouteProp<RootStackParamList, 'Signup'>;

import { useLanguage } from '../../context/LanguageContext';

export default function SignupScreen() {
    const navigation = useNavigation<SignupScreenNavigationProp>();
    const route = useRoute<SignupScreenRouteProp>();
    const { phone, role } = route.params;
    const { t, isRTL } = useLanguage();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert(t('error'), t('pleaseFillAllFields'));
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert(t('error'), t('passwordsDoNotMatch'));
            return;
        }

        setLoading(true);

        try {
            // Sign up via Backend API
            const response = await axios.post(`${API_URL}/auth/signup`, {
                phone: phone,
                password: password,
                email: email,
                name: name,
                role: role
            });

            // Save Session
            const { user, token } = response.data;
            await AsyncStorage.setItem('userSession', JSON.stringify({ token, user }));

            // Success
            setLoading(false);
            proceedToNextScreen();

        } catch (err: any) {
            console.error('[Signup] Error:', err);
            setLoading(false);

            let message = t('signupFailed');
            if (err.message && (err.message.includes('Network Error') || err.message.includes('fetch failed'))) {
                message = t('connectionError');
            } else {
                // Determine if we should show generic or signup specific
                // t('signupFailed') is "Signup Failed. Please try again." which is good.
                // t('genericError') is "Something went wrong."
                // I will use signupFailed as it gives context (Action failed).
            }

            Alert.alert(t('error'), message);
        }
    };

    const proceedToNextScreen = () => {
        setLoading(false);
        if (role === 'driver') {
            navigation.navigate('DriverSignup', { phone: phone });
        } else {
            navigation.reset({
                index: 0,
                routes: [{ name: 'CustomerHome' }],
            });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
                    <ArrowLeft size={28} color={Colors.textPrimary} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{t('createAccount')}</Text>
                        <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('signUpAs')} {role === 'driver' ? t('driver') : t('passenger') || 'Passenger'}</Text>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('fullName')}</Text>
                            <TextInput
                                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                                placeholder="John Doe"
                                value={name}
                                onChangeText={setName}
                                placeholderTextColor={Colors.textSecondary}
                                autoComplete="off"
                                textContentType="none"
                                importantForAutofill="no"
                                autoCorrect={false}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('email')}</Text>
                            <TextInput
                                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                                placeholder="john@example.com"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholderTextColor={Colors.textSecondary}
                                autoComplete="off"
                                textContentType="none"
                                importantForAutofill="no"
                                autoCorrect={false}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('password')}</Text>
                            <TextInput
                                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                                placeholder="******"
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                                placeholderTextColor={Colors.textSecondary}
                                autoComplete="off"
                                textContentType="none"
                                importantForAutofill="no"
                                autoCorrect={false}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('confirmPassword')}</Text>
                            <TextInput
                                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                                placeholder="******"
                                secureTextEntry
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholderTextColor={Colors.textSecondary}
                                autoComplete="off"
                                textContentType="none"
                                importantForAutofill="no"
                                autoCorrect={false}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleSignup}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>{t('createAccountBtn')}</Text>
                            )}
                        </TouchableOpacity>

                        {/* Spacer for bottom scrolling */}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { padding: 16 },
    content: { padding: 24, paddingBottom: 40 },
    title: { fontSize: 28, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 16, color: Colors.textSecondary, marginBottom: 32 },
    inputContainer: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
    input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 16, fontSize: 16, backgroundColor: Colors.surface, color: Colors.textPrimary },
    button: { backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginTop: 24 },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
