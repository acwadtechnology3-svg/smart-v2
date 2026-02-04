import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Linking, I18nManager } from 'react-native';
import { ArrowLeft, ShieldAlert, PhoneCall, ChevronRight, AlertTriangle } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { RootStackParamList } from '../../types/navigation';
import { apiRequest } from '../../services/backend';
import { tripStatusService } from '../../services/tripStatusService';
import { useLanguage } from '../../context/LanguageContext';

type SafetyScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Safety'>;
type SafetyScreenRouteProp = RouteProp<RootStackParamList, 'Safety'>;

export default function SafetyScreen() {
    const navigation = useNavigation<SafetyScreenNavigationProp>();
    const route = useRoute<SafetyScreenRouteProp>();
    const { tripId } = route.params || {};
    const { t, isRTL } = useLanguage();

    const [sending, setSending] = useState(false);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('permissionDenied') || 'Permission denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);
        })();
    }, []);

    const handleSOS = () => {
        Alert.alert(
            t('sendSosAlert') || "Send SOS Alert?",
            t('sosAlertDescription') || "This will instantly notify our Safety Team and share your live location and trip details.",
            [
                { text: t('cancel') || "Cancel", style: "cancel" },
                {
                    text: t('sendAlert') || "SEND ALERT",
                    style: "destructive",
                    onPress: confirmSOS
                }
            ]
        );
    };

    const confirmSOS = async () => {
        let currentLocation = location;
        if (!currentLocation) {
            Alert.alert(t('error') || "Error", t('detectingLocation') || "We cannot detect your location yet. Please wait a moment.");
            const loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);
            currentLocation = loc;
            if (!currentLocation) return;
        }

        setSending(true);

        try {
            // 1. Find Trip ID and Snapshot
            let activeTripId = tripId;
            let tripSnapshot: any = (route.params as any).trip;

            if (!activeTripId && tripStatusService.isMonitoring()) {
                activeTripId = tripStatusService.getCurrentTripId() || undefined;
            }

            // If we have tripId but no snapshot (e.g. from deep link or missing params), fetch it
            if (activeTripId && !tripSnapshot) {
                try {
                    const data = await apiRequest<{ trip: any }>(`/trips/${activeTripId}`);
                    tripSnapshot = data.trip;
                } catch {
                    // ignore
                }
            }
            // If completely missing trip info, try to fetch active trip
            else if (!activeTripId) {
                try {
                    const data = await apiRequest<{ trip: any }>('/trips/active');
                    activeTripId = data.trip?.id;
                    tripSnapshot = data.trip;
                } catch {
                    // ignore
                }
            }

            if (!activeTripId) {
                Alert.alert(t('noActiveTrip') || "No Active Trip", t('noActiveTripDesc') || "We couldn't find an active trip to attach this SOS alert.");
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

            await apiRequest('/sos/create', {
                method: 'POST',
                body: JSON.stringify({
                    trip_id: activeTripId,
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude,
                    notes: "SOS from Customer App",
                    metadata
                })
            });

            Alert.alert(
                t('sosSent') || "SOS Alert Sent",
                t('sosSentDesc') || "Our team has been notified and is tracking your location. Stay calm.",
                [{ text: "OK" }]
            );

        } catch (error: any) {
            console.error("SOS Error:", error);
            Alert.alert(t('failed') || "Failed", t('sosFailed') || "Could not send alert. Please call police directly.");
        } finally {
            setSending(false);
        }
    };

    const handleCallPolice = () => {
        Linking.openURL('tel:122');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1e1e1e" style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('safetyCenter') || 'Safety Center'}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Hero Status */}
                <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={styles.statusCard}>
                    <ShieldAlert size={48} color="#3B82F6" />
                    <Text style={styles.statusTitle}>{t('safetyToolkit') || 'Safety Toolkit'}</Text>
                    <Text style={styles.statusDesc}>{t('safetyToolkitDesc') || 'Your safety is our top priority. Access these tools anytime during your trip.'}</Text>
                </LinearGradient>

                <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('emergencyAssistance') || 'Emergency Assistance'}</Text>

                {/* SOS Button */}
                <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: '#FECACA', backgroundColor: '#FEF2F2', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    onPress={handleSOS}
                    disabled={sending}
                >
                    <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2', marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }]}>
                        {sending ? <ActivityIndicator color="#EF4444" /> : <AlertTriangle size={24} color="#EF4444" />}
                    </View>
                    <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <Text style={[styles.btnTitle, { color: '#EF4444' }]}>{t('sosEmergency') || 'SOS Emergency Alert'}</Text>
                        <Text style={styles.btnSub}>{t('sosEmergencySub') || 'Instantly notify support team'}</Text>
                    </View>
                    <ChevronRight size={20} color="#FCA5A5" style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: '#E5E7EB', backgroundColor: '#fff', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    onPress={handleCallPolice}
                >
                    <View style={[styles.iconCircle, { marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }]}>
                        <PhoneCall size={24} color="#111827" />
                    </View>
                    <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <Text style={styles.btnTitle}>{t('callPolice') || 'Call Police'}</Text>
                        <Text style={styles.btnSub}>{t('callPoliceSub') || 'Direct line to 122'}</Text>
                    </View>
                    <ChevronRight size={20} color="#D1D5DB" style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
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
