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

export default function SignupScreen() {
    const navigation = useNavigation<SignupScreenNavigationProp>();
    const route = useRoute<SignupScreenRouteProp>();
    const { phone, role } = route.params;

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
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
            console.error('Signup logic error:', err);
            setLoading(false);
            const serverMsg = err.response?.data?.error || err.message || 'Signup Failed. Please try again.';
            const errorMessage = typeof serverMsg === 'object' ? JSON.stringify(serverMsg) : String(serverMsg);
            Alert.alert('Error', errorMessage);
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
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <Text style={styles.title}>Create your account</Text>
                        <Text style={styles.subtitle}>Sign up as a {role}</Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
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
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
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
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={styles.input}
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
                            <Text style={styles.label}>Confirm Password</Text>
                            <TextInput
                                style={styles.input}
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
                                <Text style={styles.buttonText}>Create Account</Text>
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
