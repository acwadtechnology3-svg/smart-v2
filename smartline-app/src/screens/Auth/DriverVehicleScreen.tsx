import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';
import { Car, Bike, Flag, ArrowLeft } from 'lucide-react-native';

type DriverVehicleScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DriverVehicle'>;
type DriverVehicleScreenRouteProp = RouteProp<RootStackParamList, 'DriverVehicle'>;

export default function DriverVehicleScreen() {
    const navigation = useNavigation<DriverVehicleScreenNavigationProp>();
    const route = useRoute<DriverVehicleScreenRouteProp>();
    const { phone, name, nationalId, city } = route.params;

    const [vehicleType, setVehicleType] = useState<'car' | 'motorcycle' | 'taxi' | null>(null);
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehiclePlate, setVehiclePlate] = useState('');

    const handleNext = () => {
        if (!vehicleType || !vehicleModel || !vehiclePlate) {
            Alert.alert('Error', 'Please fill in all fields');
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

    const renderVehicleCard = (type: 'car' | 'motorcycle' | 'taxi', label: string, Icon: React.ElementType) => (
        <TouchableOpacity
            style={[
                styles.vehicleCard,
                vehicleType === type && styles.vehicleCardSelected,
            ]}
            onPress={() => setVehicleType(type)}
        >
            <Icon size={32} color={vehicleType === type ? Colors.primary : Colors.textSecondary} />
            <Text style={[
                styles.vehicleLabel,
                vehicleType === type && styles.vehicleLabelSelected
            ]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Select your vehicle</Text>
                <Text style={styles.subtitle}>Step 2 of 3</Text>

                <View style={styles.vehiclesContainer}>
                    {renderVehicleCard('car', 'Car', Car)}
                    {renderVehicleCard('motorcycle', 'Motorcycle', Bike)}
                    {renderVehicleCard('taxi', 'Taxi', Car)}
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Vehicle Model</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Nissan Sunny 2024"
                        value={vehicleModel}
                        onChangeText={setVehicleModel}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Vehicle Plate Number</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. ABC 123"
                        value={vehiclePlate}
                        onChangeText={setVehiclePlate}
                    />
                </View>

                <TouchableOpacity style={styles.button} onPress={handleNext}>
                    <Text style={styles.buttonText}>Next</Text>
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
    vehiclesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
    vehicleCard: { flex: 1, aspectRatio: 1, backgroundColor: Colors.surface, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: Colors.border },
    vehicleCardSelected: { borderColor: Colors.primary, backgroundColor: '#EFF6FF' },
    vehicleLabel: { marginTop: 8, fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
    vehicleLabelSelected: { color: Colors.primary },
    inputContainer: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
    input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 16, fontSize: 16, backgroundColor: Colors.surface, color: Colors.textPrimary },
    button: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
