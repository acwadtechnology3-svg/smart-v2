import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Car, User } from 'lucide-react-native'; // Using User as fallback for Driver if SteeringWheel not available
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';

type RoleSelectionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'RoleSelection'>;

export default function RoleSelectionScreen() {
    const navigation = useNavigation<RoleSelectionScreenNavigationProp>();

    const handleSelectRole = (role: 'customer' | 'driver') => {
        navigation.navigate('PhoneInput', { role });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome to SmartLine</Text>
                    <Text style={styles.subtitle}>How would you like to use the app?</Text>
                </View>

                <View style={styles.cardsContainer}>
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => handleSelectRole('customer')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.iconBox}>
                            <User size={32} color="#4F46E5" />
                        </View>
                        <Text style={styles.roleTitle}>I need a ride</Text>
                        <Text style={styles.roleDescription}>Book rides to your destination</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => handleSelectRole('driver')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.iconBox}>
                            <Car size={32} color="#4F46E5" />
                        </View>
                        <Text style={styles.roleTitle}>I want to drive</Text>
                        <Text style={styles.roleDescription}>Earn money on your schedule</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>You can change this later in settings</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        padding: 24,
        paddingTop: 60,
    },
    header: {
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
    },
    cardsContainer: {
        gap: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        paddingVertical: 32,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconBox: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: '#EEF2FF', // Light Indigo/Purple
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    roleTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    roleDescription: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
    },
    footer: {
        marginTop: 'auto',
        alignItems: 'center',
        paddingBottom: 20,
    },
    footerText: {
        color: '#9CA3AF',
        fontSize: 14,
    },
});
