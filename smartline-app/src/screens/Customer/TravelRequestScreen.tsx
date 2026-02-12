import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Switch, TextInput } from 'react-native';
import { ArrowLeft, MapPin, Calendar, Clock, Users, Car, Banknote } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../constants/Colors';
import { apiRequest } from '../../services/backend';

export default function TravelRequestScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();

    // State
    const [pickup, setPickup] = useState<any>(null);
    const [dest, setDest] = useState<any>(null);

    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [seats, setSeats] = useState(1);
    const [isEntireCar, setIsEntireCar] = useState(false);
    const [offerPrice, setOfferPrice] = useState('');
    const [loading, setLoading] = useState(false);

    // Handle incoming params (e.g. from SearchLocation)
    useEffect(() => {
        if (route.params?.pickup) setPickup(route.params.pickup);
        if (route.params?.destination) setDest(route.params.destination);
    }, [route.params]);

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const newDate = new Date(selectedDate);
            newDate.setHours(date.getHours());
            newDate.setMinutes(date.getMinutes());
            setDate(newDate);
        }
    };

    const handleTimeChange = (event: any, selectedDate?: Date) => {
        setShowTimePicker(false);
        if (selectedDate) {
            const newDate = new Date(date);
            newDate.setHours(selectedDate.getHours());
            newDate.setMinutes(selectedDate.getMinutes());
            setDate(newDate);
        }
    };

    const handleLocationSelect = (type: 'pickup' | 'destination') => {
        navigation.navigate('SearchLocation', {
            returnScreen: 'TravelRequest',
            field: type,
            // Pass current values to preserve them during round-trip
            currentPickup: pickup,
            currentDest: dest
        });
    };

    const submitRequest = async () => {
        if (!pickup || !dest) {
            Alert.alert("Missing Location", "Please select pickup and destination.");
            return;
        }

        const price = parseFloat(offerPrice);
        if (!price || isNaN(price) || price <= 0) {
            Alert.alert("Price Required", "Please enter a valid offer price for your trip.");
            return;
        }

        setLoading(true);
        try {
            // Rough distance calculation or 0 (Backend should calculate optimally, or use Google API in frontend)
            // For MVP, we send locations.

            const payload = {
                pickup_address: pickup.address,
                pickup_lat: pickup.lat || pickup.location?.latitude, // Handle both structures just in case
                pickup_lng: pickup.lng || pickup.location?.longitude,
                dest_address: dest.address,
                dest_lat: dest.lat || dest.location?.latitude,
                dest_lng: dest.lng || dest.location?.longitude,
                dest_lat: dest.lat || dest.location?.latitude,
                dest_lng: dest.lng || dest.location?.longitude,
                price: price,

                is_travel_request: true,
                scheduled_at: date.toISOString(),
                seats_required: isEntireCar ? 4 : seats,
                is_entire_car: isEntireCar,
                car_type: 'intercity', // Optional, helps logic
                payment_method: 'cash'
            };

            const data = await apiRequest<{ trip: any }>('/intercity/request', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            Alert.alert("Request Sent", "Your travel request has been broadcasted to Travel Captains. You will receive offers shortly.");

            // Navigate to Searching Driver (Offers view)
            navigation.navigate('SearchingDriver', { tripId: data.trip.id });

        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to submit request");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Intercity Travel</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Location Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Route</Text>

                    <TouchableOpacity style={styles.row} onPress={() => handleLocationSelect('pickup')}>
                        <MapPin size={20} color={Colors.primary} />
                        <Text style={[styles.input, !pickup && styles.placeholder]}>
                            {pickup?.address || "Select Pickup Location"}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.row} onPress={() => handleLocationSelect('destination')}>
                        <MapPin size={20} color="#EF4444" />
                        <Text style={[styles.input, !dest && styles.placeholder]}>
                            {dest?.address || "Select Destination"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Schedule Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Schedule</Text>

                    <View style={styles.row}>
                        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                            <Calendar size={20} color={Colors.textSecondary} />
                            <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowTimePicker(true)}>
                            <Clock size={20} color={Colors.textSecondary} />
                            <Text style={styles.dateText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </TouchableOpacity>
                    </View>

                    {showDatePicker && (
                        <DateTimePicker value={date} mode="date" onChange={handleDateChange} minimumDate={new Date()} />
                    )}
                    {showTimePicker && (
                        <DateTimePicker value={date} mode="time" onChange={handleTimeChange} />
                    )}
                </View>

                {/* Seats Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Seats</Text>

                    <View style={styles.rowBetween}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Users size={20} color={Colors.textSecondary} />
                            <Text style={styles.label}>Number of Seats</Text>
                        </View>

                        <View style={styles.counter}>
                            <TouchableOpacity
                                onPress={() => setSeats(Math.max(1, seats - 1))}
                                disabled={isEntireCar}
                                style={[styles.countBtn, isEntireCar && styles.disabledBtn]}>
                                <Text style={styles.countText}>-</Text>
                            </TouchableOpacity>
                            <Text style={styles.seatVal}>{isEntireCar ? '4' : seats}</Text>
                            <TouchableOpacity
                                onPress={() => setSeats(Math.min(4, seats + 1))}
                                disabled={isEntireCar}
                                style={[styles.countBtn, isEntireCar && styles.disabledBtn]}>
                                <Text style={styles.countText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.rowBetween}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Car size={20} color={Colors.textSecondary} />
                            <Text style={styles.label}>Request Entire Car</Text>
                        </View>
                        <Switch value={isEntireCar} onValueChange={setIsEntireCar} trackColor={{ false: "#767577", true: Colors.primary }} />
                    </View>
                </View>

                {/* Price Section */}
                <View style={styles.card}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <Banknote size={20} color={Colors.success} />
                        <Text style={styles.sectionTitle}>Offer Price (EGP)</Text>
                    </View>
                    <TextInput
                        style={styles.priceInput}
                        placeholder="e.g. 500"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        value={offerPrice}
                        onChangeText={setOfferPrice}
                    />
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={submitRequest} disabled={loading}>
                    <Text style={styles.submitText}>{loading ? "Sending Request..." : "Find Captain"}</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#fff' },
    backBtn: { marginRight: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary },
    content: { padding: 20 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.textSecondary, marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
    divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },
    input: { fontSize: 16, color: Colors.textPrimary, flex: 1 },
    placeholder: { color: '#9CA3AF' },
    dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, justifyContent: 'center' },
    dateText: { fontSize: 16, color: Colors.textPrimary },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    label: { fontSize: 16, color: Colors.textPrimary },
    counter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    countBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
    disabledBtn: { backgroundColor: '#F3F4F6', opacity: 0.5 },
    countText: { fontSize: 18, fontWeight: 'bold', color: Colors.primary },
    seatVal: { fontSize: 18, fontWeight: 'bold', minWidth: 20, textAlign: 'center' },
    submitBtn: { backgroundColor: Colors.primary, padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 24, shadowColor: Colors.primary, shadowOpacity: 0.3, elevation: 5 },
    submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    priceInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.textPrimary
    }
});
