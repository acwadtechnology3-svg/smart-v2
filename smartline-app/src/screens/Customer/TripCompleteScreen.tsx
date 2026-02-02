import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, Star } from 'lucide-react-native';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';
import { apiRequest } from '../../services/backend';

type TripCompleteScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TripComplete'>;
type TripCompleteScreenRouteProp = RouteProp<RootStackParamList, 'TripComplete'>;

export default function TripCompleteScreen() {
    const navigation = useNavigation<TripCompleteScreenNavigationProp>();
    const route = useRoute<TripCompleteScreenRouteProp>();
    const { tripId } = route.params;

    const [rating, setRating] = useState(0);
    const [trip, setTrip] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReceipt = async () => {
            try {
                const data = await apiRequest<{ trip: any }>(`/trips/${tripId}`);
                if (data.trip) setTrip(data.trip);
            } catch (err) {
                console.log("Error fetching receipt:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReceipt();
    }, [tripId]);

    const handleSubmit = () => {
        // Here you would normally save the rating to the DB
        navigation.reset({
            index: 0,
            routes: [{ name: 'CustomerHome' }],
        });
    };

    if (loading) {
        return (
            <View style={styles.content}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconCircle}>
                    <Check size={48} color="#fff" />
                </View>
                <Text style={styles.title}>Trip Completed!</Text>

                <View style={styles.card}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Total Price</Text>
                        <Text style={styles.price}>EGP {trip?.price || '0.00'}</Text>
                    </View>
                    <View style={styles.divider} />
                    <Text style={styles.details}>
                        {trip?.payment_method?.toUpperCase()} Payment • {trip?.distance || '5.2'} km • {trip?.duration || '15'} min
                    </Text>
                </View>

                <Text style={styles.rateTitle}>Rate your driver</Text>
                <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setRating(star)}>
                            <Star
                                size={40}
                                color={rating >= star ? Colors.warning : Colors.border}
                                fill={rating >= star ? Colors.warning : 'none'}
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                    <Text style={styles.buttonText}>Submit Review</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 32 },
    card: { width: '100%', backgroundColor: Colors.surface, padding: 24, borderRadius: 16, marginBottom: 32 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    label: { fontSize: 16, color: Colors.textSecondary },
    price: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary },
    divider: { height: 1, backgroundColor: Colors.border, marginBottom: 16 },
    details: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
    rateTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginBottom: 16 },
    stars: { flexDirection: 'row', gap: 12, marginBottom: 48 },
    button: { width: '100%', backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
