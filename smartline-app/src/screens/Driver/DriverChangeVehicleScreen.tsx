import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, X } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { apiRequest } from '../../services/backend';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore
import { readAsStringAsync } from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { useLanguage } from '../../context/LanguageContext';

export default function DriverChangeVehicleScreen() {
    const navigation = useNavigation();
    const { t, isRTL } = useLanguage();

    const [vehicleType, setVehicleType] = useState('car');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehiclePlate, setVehiclePlate] = useState('');

    const [documents, setDocuments] = useState<{ [key: string]: string | null }>({
        vehicleFront: null,
        vehicleBack: null,
        vehicleRight: null,
        vehicleLeft: null,
        licenseFront: null,
        licenseBack: null,
    });
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    const pickImage = async (key: string) => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.2, // Highly compressed for speed
            aspect: [4, 3],
        });

        if (!result.canceled) {
            setDocuments(prev => ({ ...prev, [key]: result.assets[0].uri }));
        }
    };

    const uploadFile = async (uri: string, path: string) => {
        try {
            const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
            const arrayBuffer = decode(base64);

            const { error } = await supabase.storage
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
            console.error("Upload failed for " + path, e);
            throw e;
        }
    };

    const handleSubmit = async () => {
        if (!vehicleModel || !vehiclePlate) {
            Alert.alert(t('error'), t('fillVehicleInfo'));
            return;
        }

        const missing = Object.keys(documents).filter(k => !documents[k]);
        if (missing.length > 0) {
            Alert.alert(t('error'), t('uploadRequired'));
            return;
        }

        setLoading(true);

        try {
            const sessionStr = await AsyncStorage.getItem('userSession');
            if (!sessionStr) throw new Error('No user found');
            const { user } = JSON.parse(sessionStr);
            const userId = user?.id;

            const uploadedUrls: any = {};
            const docEntries = Object.entries(documents);

            for (let i = 0; i < docEntries.length; i++) {
                const [key, uri] = docEntries[i];
                if (uri) {
                    setUploadProgress(`${t('uploadPending')} ${i + 1}/${docEntries.length}...`);
                    const ext = uri.split('.').pop();
                    const path = `${userId}/change_req/${Date.now()}_${key}.${ext}`;
                    uploadedUrls[key] = await uploadFile(uri, path);
                }
            }

            setUploadProgress('Submitting...');

            await apiRequest('/drivers/request-change-vehicle', {
                method: 'POST',
                body: JSON.stringify({
                    new_vehicle_type: vehicleType,
                    new_vehicle_model: vehicleModel,
                    new_vehicle_plate: vehiclePlate,
                    new_vehicle_front_url: uploadedUrls.vehicleFront,
                    new_vehicle_back_url: uploadedUrls.vehicleBack,
                    new_vehicle_left_url: uploadedUrls.vehicleLeft,
                    new_vehicle_right_url: uploadedUrls.vehicleRight,
                    new_vehicle_license_front_url: uploadedUrls.licenseFront,
                    new_vehicle_license_back_url: uploadedUrls.licenseBack,
                })
            });

            setLoading(false);
            Alert.alert(t('success'), t('vehicleChangePending'), [
                { text: t('ok'), onPress: () => navigation.goBack() }
            ]);

        } catch (err: any) {
            setLoading(false);
            console.error(err);
            Alert.alert(t('error'), err.message || 'Failed to submit request.');
        }
    };

    const renderUploadBox = (key: string, label: string) => (
        <View style={styles.uploadBoxWrapper}>
            <Text style={[styles.boxLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
            <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(key)}>
                {documents[key] ? (
                    <>
                        <Image source={{ uri: documents[key]! }} style={styles.previewImage} />
                        <TouchableOpacity
                            style={styles.removeBtn}
                            onPress={() => setDocuments(prev => ({ ...prev, [key]: null }))}
                        >
                            <X size={14} color="#fff" />
                        </TouchableOpacity>
                    </>
                ) : (
                    <Camera size={24} color={Colors.textSecondary} />
                )}
            </TouchableOpacity>
        </View>
    );

    const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' } as any;
    const textAlign = { textAlign: isRTL ? 'right' : 'left' } as any;

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header, rowStyle]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }]}>
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('changeVehicle')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <Text style={[styles.label, textAlign]}>{t('vehicleType')}</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={vehicleType}
                        onValueChange={(itemValue) => setVehicleType(itemValue)}
                        itemStyle={{ textAlign: isRTL ? 'right' : 'left' }}
                    >
                        <Picker.Item label={t('car')} value="car" />
                        <Picker.Item label={t('motorcycle')} value="motorcycle" />
                        <Picker.Item label={t('taxi')} value="taxi" />
                    </Picker>
                </View>

                <Text style={[styles.label, textAlign]}>{t('vehicleModel')}</Text>
                <TextInput
                    style={[styles.input, textAlign]}
                    placeholder="e.g. Toyota Corolla 2020"
                    value={vehicleModel}
                    onChangeText={setVehicleModel}
                />

                <Text style={[styles.label, textAlign]}>{t('vehiclePlate')}</Text>
                <TextInput
                    style={[styles.input, textAlign]}
                    placeholder="e.g. ABC 123"
                    value={vehiclePlate}
                    onChangeText={setVehiclePlate}
                />

                <Text style={[styles.sectionTitle, textAlign]}>{t('licensePhotos')}</Text>
                <View style={[styles.grid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {renderUploadBox('licenseFront', t('licenseFront'))}
                    {renderUploadBox('licenseBack', t('licenseBack'))}
                </View>

                <Text style={[styles.sectionTitle, textAlign]}>{t('vehiclePhotos')}</Text>
                <View style={[styles.grid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {renderUploadBox('vehicleFront', t('front'))}
                    {renderUploadBox('vehicleBack', t('back'))}
                    {renderUploadBox('vehicleRight', t('rightSide'))}
                    {renderUploadBox('vehicleLeft', t('leftSide'))}
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, loading && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('submitRequest')}</Text>}
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        alignItems: 'center', justifyContent: 'space-between',
        padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB'
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    backButton: { padding: 4 },
    content: { padding: 20 },

    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 12 },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16 },
    pickerContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, overflow: 'hidden' },

    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginTop: 24, marginBottom: 12 },

    grid: { flexWrap: 'wrap', gap: 12 },
    uploadBoxWrapper: { width: '47%' },
    boxLabel: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
    uploadBox: {
        height: 100, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
        borderStyle: 'dashed', borderRadius: 8, alignItems: 'center', justifyContent: 'center'
    },
    previewImage: { width: '100%', height: '100%', borderRadius: 8 },
    removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 12 },

    submitButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 32, marginBottom: 40 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
