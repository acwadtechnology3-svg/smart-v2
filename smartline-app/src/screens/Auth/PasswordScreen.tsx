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

export default function PasswordScreen() {
    const navigation = useNavigation<PasswordScreenNavigationProp>();
    const route = useRoute<PasswordScreenRouteProp>();
    const { phone, role } = route.params;

    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!password) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post(`${API_URL}/auth/login`, {
                phone: phone,
                password: password,
            });

            const { user, token } = response.data;
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
                    // Assume incomplete profile -> Redirect to Signup flow continuation
                    setLoading(false);
                    navigation.replace('DriverSignup', { phone: phone });
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
            console.error(err);
            const errorMessage = err.response?.data?.error || 'Login Failed';
            Alert.alert('Error', errorMessage);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined} // 👽 02-02-2026: Fixed jumping on Android
                // behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.inner}>
                        {/* Header Section */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <ArrowLeft size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                            <Text style={styles.title}>Welcome back! 👋</Text>
                            <Text style={styles.subtitle}>
                                Enter password for <Text style={styles.phoneHighlight}>{phone}</Text>
                            </Text>
                        </View>

                        {/* Form Section */}
                        <View style={styles.form}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Password</Text>
                                <View style={[styles.passwordInputWrapper, showPassword && styles.inputActive]}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter your password"
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
                                style={styles.forgotPassword}
                            // onPress={() => navigation.navigate('ForgotPassword')} 
                            >
                                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
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
                                    <Text style={styles.buttonText}>Log In</Text>
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
