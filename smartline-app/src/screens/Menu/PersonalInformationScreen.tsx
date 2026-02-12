import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Image, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Mail, Smartphone, Camera, Lock } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { apiRequest } from '../../services/backend';
import { Colors } from '../../constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../context/LanguageContext';

export default function PersonalInformationScreen() {
    const navigation = useNavigation();
    const { t, isRTL } = useLanguage();

    // RTL Layout Logic
    const isSimulating = isRTL !== I18nManager.isRTL;
    const flexDirection = isSimulating ? 'row-reverse' : 'row';
    const textAlign = isRTL ? 'right' : 'left';
    const iconMargin = isRTL ? { marginLeft: 12, marginRight: 0 } : { marginRight: 12, marginLeft: 0 };

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // User Data
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // Initial data to check for changes
    const [initialData, setInitialData] = useState({ fullName: '', email: '', photo: '' });

    useEffect(() => {
        loadUserProfile(true);
    }, []);

    const loadUserProfile = async (withLoading = false) => {
        try {
            // 1. Load from cache first
            const session = await AsyncStorage.getItem('userSession');
            if (session) {
                const { user: cachedUser } = JSON.parse(session);
                if (cachedUser) {
                    setUserId(cachedUser.id);
                    setFullName(cachedUser.full_name || '');
                    setEmail(cachedUser.email || '');
                    setPhone(cachedUser.phone || '');
                    setPhoto(cachedUser.profile_photo_url || null);
                    setInitialData({
                        fullName: cachedUser.full_name || '',
                        email: cachedUser.email || '',
                        photo: cachedUser.profile_photo_url || ''
                    });
                }
            }

            if (withLoading && !userId) setLoading(true);

            // 2. Fetch latest from server
            const data = await apiRequest<{ user: any }>('/users/me');
            if (data.user) {
                setUserId(data.user.id);
                setFullName(data.user.full_name || '');
                setEmail(data.user.email || '');
                setPhone(data.user.phone || '');
                setPhoto(data.user.profile_photo_url || null);

                setInitialData({
                    fullName: data.user.full_name || '',
                    email: data.user.email || '',
                    photo: data.user.profile_photo_url || ''
                });

                // Update cache
                if (session) {
                    const parsed = JSON.parse(session);
                    await AsyncStorage.setItem('userSession', JSON.stringify({ ...parsed, user: data.user }));
                }
            }
        } catch (error) {
            console.error('Failed to load user profile:', error);
            // Don't alert if we already have cached data, but maybe toast if it's a persistent failure
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please grant permission to access your photos.');
                return;
            }

            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setPhoto(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const uploadProfilePhoto = async (uri: string): Promise<string> => {
        try {
            if (!userId) throw new Error('User ID not found');

            // Read file as Base64
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            const arrayBuffer = decode(base64);

            // Use 'avatars' bucket, usually public
            // If it fails, fallback might be needed or ensure bucket exists
            const path = `${userId}/profile_${Date.now()}.jpg`;

            const { data, error } = await supabase.storage
                .from('avatars') // Trying standard public bucket
                .upload(path, arrayBuffer, {
                    contentType: 'image/jpeg',
                    upsert: true,
                });

            if (error) {
                // Fallback to 'driver-documents' if 'avatars' fails (temporary hack)
                // In production, ensure correct bucket exists
                console.warn("Avatars upload failed, trying driver-documents as fallback", error);
                const { data: data2, error: error2 } = await supabase.storage
                    .from('driver-documents')
                    .upload(path, arrayBuffer, {
                        contentType: 'image/jpeg',
                        upsert: true,
                    });

                if (error2) throw error2;

                const { data: publicUrlData } = supabase.storage
                    .from('driver-documents')
                    .getPublicUrl(path);
                return publicUrlData.publicUrl;
            }

            const { data: publicUrlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(path);

            return publicUrlData.publicUrl;
        } catch (e) {
            console.error("Upload failed", e);
            throw e;
        }
    };

    const handleSave = async () => {
        if (!fullName.trim() || !email.trim()) {
            Alert.alert("Required", "Please fill in all fields");
            return;
        }

        const hasChanges = fullName !== initialData.fullName || email !== initialData.email || photo !== initialData.photo;

        if (!hasChanges) {
            navigation.goBack();
            return;
        }

        try {
            setSaving(true);
            Keyboard.dismiss();

            let profilePhotoUrl = initialData.photo;

            // If photo changed and it's a local URI (not http), upload it
            if (photo && photo !== initialData.photo && !photo.startsWith('http')) {
                profilePhotoUrl = await uploadProfilePhoto(photo);
            }

            await apiRequest('/users/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    full_name: fullName,
                    email: email,
                    profile_photo_url: profilePhotoUrl
                })
            });

            Alert.alert("Success", "Profile updated successfully");
            setInitialData({ fullName, email, photo: profilePhotoUrl || '' });
            setPhoto(profilePhotoUrl); // Update local state with remote URL

        } catch (error: any) {
            console.error('Failed to update profile:', error);
            Alert.alert("Error", error.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar style="dark" />
            <View style={[styles.header, { flexDirection }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <ArrowLeft size={24} color="#1e1e1e" style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('personalInfo') || 'Personal Information'}</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    {saving ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                        <Text style={[styles.saveText, { color: hasUnsavedChanges(fullName, email, photo, initialData) ? Colors.primary : '#9CA3AF' }]}>{t('save') || 'Save'}</Text>
                    )}
                </TouchableOpacity>
            </View>

            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                        {/* Profile Photo - Now Touchable */}
                        <View style={styles.photoContainer}>
                            <TouchableOpacity onPress={pickImage} activeOpacity={0.7} style={styles.avatarWrapper}>
                                {photo ? (
                                    <Image source={{ uri: photo }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <User size={40} color="#9CA3AF" />
                                    </View>
                                )}
                                <View style={styles.editBadge}>
                                    <Camera size={14} color="#fff" />
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={pickImage}>
                                <Text style={styles.changePhotoText}>Change Photo</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Form Fields */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { textAlign }]}>{t('fullName') || 'Full Name'}</Text>
                            <View style={[styles.inputContainer, { flexDirection }]}>
                                <User size={20} color="#9CA3AF" style={iconMargin} />
                                <TextInput
                                    style={[styles.input, { textAlign }]}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    placeholder={t('enterFullName') || "Enter your full name"}
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { textAlign }]}>{t('emailAddress') || 'Email Address'}</Text>
                            <View style={[styles.inputContainer, { flexDirection }]}>
                                <Mail size={20} color="#9CA3AF" style={iconMargin} />
                                <TextInput
                                    style={[styles.input, { textAlign }]}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder={t('enterEmail') || "Enter your email"}
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { textAlign }]}>{t('phoneNumber') || 'Phone Number'}</Text>
                            <View style={[styles.inputContainer, styles.disabledInput, { flexDirection }]}>
                                <Smartphone size={20} color="#9CA3AF" style={iconMargin} />
                                <TextInput
                                    style={[styles.input, { color: '#6B7280', textAlign }]}
                                    value={phone}
                                    editable={false}
                                    placeholder={t('phoneNumber') || "Phone number"}
                                />
                                <LockIcon />
                            </View>
                            <Text style={[styles.helperText, { textAlign }]}>{t('contactSupport') || 'Contact support to change phone number'}</Text>
                        </View>

                    </ScrollView>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
}

function hasUnsavedChanges(fullName: string, email: string, photo: string | null, initialData: any) {
    return fullName !== initialData.fullName || email !== initialData.email || photo !== initialData.photo;
}

const LockIcon = () => (
    <View style={{ paddingHorizontal: 4 }}>
        <Text style={{ fontSize: 10, color: '#9CA3AF' }}>LOCKED</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        // flexDirection handled dynamically
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 20, // SafeAreaView handles the top inset now
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    saveText: { fontSize: 16, fontWeight: '600' },

    content: { padding: 24, paddingBottom: 50 },

    photoContainer: { alignItems: 'center', marginBottom: 32 },
    avatarWrapper: {
        width: 110, height: 110,
        marginBottom: 12, position: 'relative',
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 4
    },
    avatar: { width: '100%', height: '100%', borderRadius: 55, borderWidth: 3, borderColor: '#fff' },
    avatarPlaceholder: {
        width: '100%', height: '100%', borderRadius: 55,
        backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
        borderWidth: 3, borderColor: '#fff'
    },
    editBadge: {
        position: 'absolute', bottom: 4, right: 4,
        backgroundColor: Colors.primary, width: 32, height: 32, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#fff',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2, shadowRadius: 3, elevation: 3
    },
    changePhotoText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },

    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    inputContainer: {
        // flexDirection handled dynamically
        alignItems: 'center',
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        paddingHorizontal: 16, height: 54,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 2, elevation: 1
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, color: '#111827' },
    disabledInput: { backgroundColor: '#F9FAFB', borderColor: '#F3F4F6', shadowOpacity: 0 },
    helperText: { fontSize: 12, color: '#9CA3AF', marginTop: 6, marginLeft: 4 }
});
