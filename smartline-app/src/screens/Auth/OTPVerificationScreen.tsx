import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';

type OTPVerificationScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OTPVerification'>;
type OTPVerificationScreenRouteProp = RouteProp<RootStackParamList, 'OTPVerification'>;

import { useLanguage } from '../../context/LanguageContext';

export default function OTPVerificationScreen() {
    const navigation = useNavigation<OTPVerificationScreenNavigationProp>();
    const route = useRoute<OTPVerificationScreenRouteProp>();
    const { phone, role } = route.params;
    const { t, isRTL } = useLanguage();

    const [otp, setOtp] = useState(['', '', '', '']);
    const [timer, setTimer] = useState(30);

    // Refs for input fields to manage focus
    const inputRefs = useRef<Array<TextInput | null>>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Auto-focus first input on mount
    useEffect(() => {
        if (inputRefs.current[0]) {
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
    }, []);

    const handleOtpChange = (value: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        // Handle backspace to focus previous input
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = () => {
        const code = otp.join('');
        if (code.length === 4) {
            if (route.params.purpose === 'reset-password') {
                navigation.replace('ResetPassword', { phone });
            } else {
                navigation.replace('Signup', { phone, role });
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.inner}>
                        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }]}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
                                <ArrowLeft size={28} color={Colors.textPrimary} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.content}>
                            <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{t('verifyNumber')}</Text>
                            <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('enterCodeSentTo')} {phone}</Text>

                            <View style={[styles.otpContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                {otp.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        ref={(ref) => {
                                            inputRefs.current[index] = ref;
                                        }}
                                        style={[
                                            styles.otpInput,
                                            digit ? styles.otpInputFilled : null
                                        ]}
                                        value={digit}
                                        onChangeText={(text) => handleOtpChange(text, index)}
                                        onKeyPress={(e) => handleKeyPress(e, index)}
                                        keyboardType="number-pad"
                                        maxLength={1}
                                        textAlign="center"
                                        selectTextOnFocus
                                    />
                                ))}
                            </View>

                            <TouchableOpacity disabled={timer > 0}>
                                <Text style={[styles.resendText, timer === 0 && styles.resendTextActive]}>
                                    {timer > 0 ? `${t('resendCode')}\n${t('availableIn')} 0:${timer.toString().padStart(2, '0')}` : t('resendCode')}
                                </Text>
                            </TouchableOpacity>

                            <View style={{ flex: 1 }} />

                            <TouchableOpacity
                                style={[styles.button, otp.join('').length === 4 ? null : styles.buttonDisabled]}
                                onPress={handleVerify}
                                disabled={otp.join('').length !== 4}
                            >
                                <Text style={styles.buttonText}>{t('verify')}</Text>
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
    inner: { flex: 1 },
    header: { padding: 16 },
    content: { flex: 1, padding: 24 },
    title: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 16, color: Colors.textSecondary, marginBottom: 32 },
    otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, gap: 16 },
    otpInput: { flex: 1, height: 60, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: '#F3F4F6', fontSize: 24, color: Colors.textPrimary },
    otpInputFilled: { borderColor: Colors.primary, borderWidth: 2 },
    resendText: { textAlign: 'center', color: Colors.textSecondary, marginBottom: 32, lineHeight: 22 },
    resendTextActive: { color: Colors.primary, fontWeight: '600' },
    button: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 16 },
    buttonDisabled: { opacity: 0.5, backgroundColor: '#F3F4F6' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
