import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import axios from 'axios';
import { API_URL } from '../../config/api';

type PhoneInputScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PhoneInput'>;
type PhoneInputScreenRouteProp = RouteProp<RootStackParamList, 'PhoneInput'>;

export default function PhoneInputScreen() {
    const navigation = useNavigation<PhoneInputScreenNavigationProp>();
    const route = useRoute<PhoneInputScreenRouteProp>();
    const { role } = route.params;

    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const handleContinue = async () => {
        if (!phone || phone.length < 10) {
            Alert.alert('Error', 'Please enter a valid phone number');
            return;
        }

        setLoading(true);
        const fullPhone = `+20${phone.replace(/^0+/, '')}`; // Ensure +20 format

        try {
            // Check if user exists via Backend API
            const response = await axios.post(`${API_URL}/auth/check-phone`, {
                phone: fullPhone
            }, { timeout: 10000 }); // 10s timeout

            setLoading(false);

            if (response.data.exists) {
                // User exists -> Password
                navigation.navigate('Password', { phone: fullPhone, role });
            } else {
                // User does not exist -> Signup (Skipping OTP for now as requested)
                navigation.navigate('Signup', { phone: fullPhone, role });
            }

        } catch (err) {
            console.error(err);
            setLoading(false);
            Alert.alert('Error', 'Could not verify phone number. Please try again.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingView}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.inner}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()}>
                                <ArrowLeft size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.content}>
                            <Text style={styles.title}>Enter your phone number</Text>
                            <Text style={styles.subtitle}>We'll send you a verification code</Text>

                            <View style={styles.inputContainer}>
                                <View style={styles.prefixContainer}>
                                    <Text style={styles.prefixText}>EG +20</Text>
                                </View>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="100 123 4567"
                                        keyboardType="phone-pad"
                                        value={phone}
                                        onChangeText={setPhone}
                                        maxLength={11}
                                        placeholderTextColor={Colors.textSecondary}
                                        autoComplete="off"
                                        textContentType="none"
                                        importantForAutofill="no"
                                        autoCorrect={false}
                                    />
                                </View>
                            </View>

                            <View style={{ flex: 1 }} />

                            <TouchableOpacity
                                style={[styles.button, (!phone || loading) && styles.buttonDisabled]}
                                onPress={handleContinue}
                                disabled={loading || !phone}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>Continue</Text>
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
    container: { flex: 1, backgroundColor: Colors.background },
    keyboardAvoidingView: { flex: 1 },
    inner: { flex: 1 },
    header: { padding: 16 },
    content: { flex: 1, padding: 24, justifyContent: 'flex-start' }, // Changed to flex-start + spacer
    title: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 16, color: Colors.textSecondary, marginBottom: 32 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
    prefixContainer: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    prefixText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
    inputWrapper: {
        flex: 1,
        height: 56,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        borderRadius: 12,
        justifyContent: 'center',
        paddingHorizontal: 16,
        backgroundColor: '#F9FAFB'
    },
    input: {
        fontSize: 18,
        color: Colors.textPrimary,
        height: '100%',
        backgroundColor: 'transparent',
        textAlignVertical: 'center',
    },
    button: {
        width: '100%',
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16
    },
    buttonDisabled: {
        opacity: 0.5,
        backgroundColor: '#E5E7EB'
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
