import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, Image, ImageSourcePropType } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';
import { Flag, ArrowLeft } from 'lucide-react-native';

type DriverVehicleScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DriverVehicle'>;
type DriverVehicleScreenRouteProp = RouteProp<RootStackParamList, 'DriverVehicle'>;

import { useLanguage } from '../../context/LanguageContext';

export default function DriverVehicleScreen() {
    const navigation = useNavigation<DriverVehicleScreenNavigationProp>();
    const route = useRoute<DriverVehicleScreenRouteProp>();
    const { phone, name, nationalId, city } = route.params;
    const { t, isRTL } = useLanguage();

    const [vehicleType, setVehicleType] = useState<'car' | 'motorcycle' | 'taxi' | null>(null);
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehiclePlate, setVehiclePlate] = useState('');

    const handleNext = () => {
        if (!vehicleType || !vehicleModel || !vehiclePlate) {
            Alert.alert(t('error'), t('pleaseFillAllFields'));
            return;
        }

        navigation.navigate('DriverProfilePhoto', {
            phone,
            name,
            nationalId,
            city,
            vehicleType,
            vehicleModel,
            vehiclePlate,
        });
    };

    const renderVehicleCard = (type: 'car' | 'motorcycle' | 'taxi', label: string, imageSource: ImageSourcePropType) => (
        <TouchableOpacity
            style={[
                styles.vehicleCard,
                vehicleType === type && styles.vehicleCardSelected,
            ]}
            onPress={() => setVehicleType(type)}
        >
            <Image
                source={imageSource}
                style={[
                    styles.vehicleImage,
                    vehicleType === type ? { opacity: 1 } : { opacity: 0.5 }
                ]}
                resizeMode="contain"
            />
            <Text style={[
                styles.vehicleLabel,
                vehicleType === type && styles.vehicleLabelSelected
            ]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
                    <ArrowLeft size={28} color={Colors.textPrimary} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{t('changeVehicle')}</Text>
                <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('step')} 2 {t('of')} 4</Text>

                <View style={[styles.vehiclesContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {renderVehicleCard('taxi', t('taxi'), require('../../../سمارت لاين ايقون/taxi.webp'))}
                    {renderVehicleCard('motorcycle', t('motorcycle'), require('../../../سمارت لاين ايقون/scooter.webp'))}
                    {renderVehicleCard('car', t('car'), require('../../../سمارت لاين ايقون/vip.webp'))}
                </View>

                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('vehicleModel')}</Text>
                    <TextInput
                        style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                        placeholder="e.g. Nissan Sunny 2024"
                        value={vehicleModel}
                        onChangeText={setVehicleModel}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('vehiclePlate')}</Text>
                    <TextInput
                        style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                        placeholder="e.g. ABC 123"
                        value={vehiclePlate}
                        onChangeText={setVehiclePlate}
                    />
                </View>

                <TouchableOpacity style={styles.button} onPress={handleNext}>
                    <Text style={styles.buttonText}>{t('nextProfilePhoto')}</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { padding: 16 },
    backButton: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
    content: { padding: 24, paddingTop: 0 },
    title: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 16, color: Colors.textSecondary, marginBottom: 32 },
    vehiclesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, gap: 10 },
    vehicleCard: { flex: 1, height: 140, backgroundColor: Colors.surface, borderRadius: 16, alignItems: 'center', justifyContent: 'center', padding: 8, borderWidth: 1.5, borderColor: Colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    vehicleCardSelected: { borderColor: Colors.primary, backgroundColor: '#F0F9FF', shadowOpacity: 0.1, shadowColor: Colors.primary },
    vehicleImage: { width: 100, height: 65, marginBottom: 12 },
    vehicleLabel: { marginTop: 8, fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
    vehicleLabelSelected: { color: Colors.primary },
    inputContainer: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
    input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 16, fontSize: 16, backgroundColor: Colors.surface, color: Colors.textPrimary },
    button: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
