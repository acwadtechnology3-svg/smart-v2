import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { ArrowLeft, ShieldAlert, PhoneCall, Share2, UserCheck, ChevronRight, AlertTriangle } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { RootStackParamList } from '../../types/navigation';
import { apiRequest } from '../../services/backend';

type SafetyScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Safety'>;
type SafetyScreenRouteProp = RouteProp<RootStackParamList, 'Safety'>;

export default function SafetyScreen() {
    const navigation = useNavigation<SafetyScreenNavigationProp>();
    const route = useRoute<SafetyScreenRouteProp>();
    const { tripId } = route.params || {};

    const [sending, setSending] = useState(false);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission to access location was denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);
        })();
    }, []);

    const handleSOS = () => {
        Alert.alert(
            "Send SOS Alert?",
            "This will instantly notify our Safety Team and share your live location and trip details.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "SEND ALERT",
                    style: "destructive",
                    onPress: confirmSOS
                }
            ]
        );
    };

    const confirmSOS = async () => {
        let currentLocation = location;
        if (!currentLocation) {
            Alert.alert("Error", "We cannot detect your location yet. Please wait a moment.");
            const loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);
            currentLocation = loc;
            if (!currentLocation) return;
        }

        setSending(true);

        try {
            // 1. Find Trip ID if missing
            let activeTripId = tripId;
            let tripSnapshot: any = null;

            if (activeTripId) {
                try {
                    const data = await apiRequest<{ trip: any }>(`/trips/${activeTripId}`);
                    tripSnapshot = data.trip;
                } catch {
                    // ignore
                }
            } else {
                try {
                    const data = await apiRequest<{ trip: any }>('/trips/active');
                    activeTripId = data.trip?.id;
                    tripSnapshot = data.trip;
                } catch {
                    // ignore
                }
            }

            if (!activeTripId) {
                Alert.alert("No Active Trip", "We couldn't find an active trip to attach this SOS alert.");
                return;
            }

            console.log("[SOS] Sending Alert. Trip:", activeTripId);

            // 3. Prepare Metadata Snapshot
            const metadata = {
                source: 'app_sos_button',
                timestamp: new Date().toISOString(),
                snapshot: {
                    trip: tripSnapshot,
                    location_text: tripSnapshot?.pickup_address || "Unknown Location",
                    device_info: "React Native App"
                }
            };

            await apiRequest('/sos', {
                method: 'POST',
                body: JSON.stringify({
                    tripId: activeTripId,
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude,
                    metadata
                })
            });

            Alert.alert(
                "SOS Alert Sent",
                "Our team has been notified and is tracking your location. Stay calm.",
                [{ text: "OK" }]
            );

        } catch (error: any) {
            console.error("SOS Error:", error);
            Alert.alert("Failed", "Could not send alert. Please call police directly.");
        } finally {
            setSending(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1e1e1e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Safety Center</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Hero Status */}
                <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={styles.statusCard}>
                    <ShieldAlert size={48} color="#3B82F6" />
                    <Text style={styles.statusTitle}>Safety Toolkit</Text>
                    <Text style={styles.statusDesc}>Your safety is our top priority. Access these tools anytime during your trip.</Text>
                </LinearGradient>

                <Text style={styles.sectionTitle}>Emergency Assistance</Text>

                {/* SOS Button */}
                <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
                    onPress={handleSOS}
                    disabled={sending}
                >
                    <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                        {sending ? <ActivityIndicator color="#EF4444" /> : <AlertTriangle size={24} color="#EF4444" />}
                    </View>
                    <View style={styles.btnTextConfig}>
                        <Text style={[styles.btnTitle, { color: '#EF4444' }]}>SOS Emergency Alert</Text>
                        <Text style={styles.btnSub}>Instantly notify support team</Text>
                    </View>
                    <ChevronRight size={20} color="#FCA5A5" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, { borderColor: '#E5E7EB', backgroundColor: '#fff' }]}>
                    <View style={[styles.iconCircle]}>
                        <PhoneCall size={24} color="#111827" />
                    </View>
                    <View style={styles.btnTextConfig}>
                        <Text style={styles.btnTitle}>Call Police</Text>
                        <Text style={styles.btnSub}>Direct line to 122</Text>
                    </View>
                    <ChevronRight size={20} color="#D1D5DB" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn}>
                    <View style={styles.iconCircle}>
                        <Share2 size={24} color="#3B82F6" />
                    </View>
                    <View style={styles.btnTextConfig}>
                        <Text style={styles.btnTitle}>Share Trip Details</Text>
                        <Text style={styles.btnSub}>Send location to trusted contacts</Text>
                    </View>
                    <ChevronRight size={20} color="#D1D5DB" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn}>
                    <View style={styles.iconCircle}>
                        <UserCheck size={24} color="#10B981" />
                    </View>
                    <View style={styles.btnTextConfig}>
                        <Text style={styles.btnTitle}>Trusted Contacts</Text>
                        <Text style={styles.btnSub}>Manage your emergency contacts</Text>
                    </View>
                    <ChevronRight size={20} color="#D1D5DB" />
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60 }, // 👽 02-02-2026: Increased top padding for header
    backBtn: { marginRight: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    content: { padding: 20 },
    statusCard: { padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 24 },
    statusTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E3A8A', marginTop: 12, marginBottom: 8 },
    statusDesc: { textAlign: 'center', color: '#60A5FA', lineHeight: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12, backgroundColor: '#fff' },
    iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    btnTextConfig: { flex: 1 },
    btnTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    btnSub: { fontSize: 13, color: '#6B7280' },
});
