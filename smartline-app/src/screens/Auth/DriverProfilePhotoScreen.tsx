import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, User, X } from 'lucide-react-native';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
// @ts-ignore
import { readAsStringAsync } from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

type DriverProfilePhotoScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DriverProfilePhoto'>;
type DriverProfilePhotoScreenRouteProp = RouteProp<RootStackParamList, 'DriverProfilePhoto'>;

export default function DriverProfilePhotoScreen() {
    const navigation = useNavigation<DriverProfilePhotoScreenNavigationProp>();
    const route = useRoute<DriverProfilePhotoScreenRouteProp>();
    const { phone, name, nationalId, city, vehicleType, vehicleModel, vehiclePlate } = route.params;

    const [photo, setPhoto] = useState<string | null>(null);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.3,
        });

        if (!result.canceled) {
            setPhoto(result.assets[0].uri);
        }
    };

    const [uploading, setUploading] = useState(false);

    // ... class begins ...

    const uploadProfilePhoto = async (uri: string) => {
        try {
            // Get user ID first
            const sessionStr = await AsyncStorage.getItem('userSession');
            if (!sessionStr) throw new Error('No user found');
            const { user } = JSON.parse(sessionStr);
            const userId: string | undefined = user?.id;
            if (!userId) throw new Error('No user found');

            // Read file as Base64
            const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
            const arrayBuffer = decode(base64);

            const path = `${userId}/profile.jpg`;

            // Upload ArrayBuffer
            const { data, error } = await supabase.storage
                .from('driver-documents')
                .upload(path, arrayBuffer, {
                    contentType: 'image/jpeg',
                    upsert: true,
                });

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
                .from('driver-documents')
                .getPublicUrl(path);

            return publicUrlData.publicUrl;
        } catch (e) {
            console.error("Upload failed", e);
            throw e;
        }
    };

    const handleNext = async () => {
        if (!photo) {
            Alert.alert('Required', 'Please upload a profile photo to continue.');
            return;
        }

        // Pass local URI to next screen - upload will happen in batch at the end
        navigation.navigate('DriverDocuments', {
            phone,
            name,
            nationalId,
            city,
            vehicleType,
            vehicleModel,
            vehiclePlate,
            profilePhoto: photo
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Profile Photo</Text>
                <Text style={styles.subtitle}>Step 3 of 4</Text>
                <Text style={styles.description}>
                    Please upload a clear photo of yourself. This will be shown to customers when they book a ride with you.
                </Text>

                <View style={styles.photoContainer}>
                    <TouchableOpacity style={styles.photoUpload} onPress={pickImage}>
                        {photo ? (
                            <Image source={{ uri: photo }} style={styles.avatar} />
                        ) : (
                            <View style={styles.placeholder}>
                                <User size={64} color={Colors.textSecondary} />
                                <View style={styles.cameraIconBadge}>
                                    <Camera size={16} color="#fff" />
                                </View>
                            </View>
                        )}
                    </TouchableOpacity>
                    {photo && (
                        <TouchableOpacity onPress={() => setPhoto(null)} style={styles.removeTextContainer}>
                            <Text style={styles.removeText}>Remove Photo</Text>
                        </TouchableOpacity>
                    )}
                </View>


                <TouchableOpacity
                    style={[styles.button, (!photo || uploading) && styles.buttonDisabled]}
                    onPress={handleNext}
                    disabled={!photo || uploading}
                >
                    {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Next</Text>}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { padding: 16 },
    backButton: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
    content: { padding: 24, paddingTop: 0, alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 8, alignSelf: 'flex-start' },
    subtitle: { fontSize: 16, color: Colors.textSecondary, marginBottom: 16, alignSelf: 'flex-start' },
    description: { fontSize: 14, color: '#6B7280', marginBottom: 40, lineHeight: 22, alignSelf: 'flex-start' },

    photoContainer: { alignItems: 'center', marginBottom: 40 },
    photoUpload: {
        width: 160, height: 160, borderRadius: 80,
        backgroundColor: Colors.surface,
        borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        marginBottom: 16
    },
    avatar: { width: '100%', height: '100%' },
    placeholder: { alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
    cameraIconBadge: {
        position: 'absolute', bottom: 20, right: 30,
        backgroundColor: Colors.primary, padding: 8, borderRadius: 20,
        borderWidth: 2, borderColor: '#fff'
    },
    removeTextContainer: { padding: 8 },
    removeText: { color: Colors.danger, fontWeight: '600' },

    button: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 8, alignItems: 'center', width: '100%' },
    buttonDisabled: { opacity: 0.5, backgroundColor: '#9CA3AF' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
