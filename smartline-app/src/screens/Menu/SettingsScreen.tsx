import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { ArrowLeft, User, Bell, Lock, Globe, Moon, ChevronRight, LogOut } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { apiRequest } from '../../services/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await apiRequest<{ user: any }>('/users/me');
            setUser(data.user);

            // Safe access to preferences if they exist
            if (data.user?.preferences) {
                setNotificationsEnabled(data.user.preferences.notifications ?? true);
                setDarkMode(data.user.preferences.darkMode ?? false);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const updatePreference = async (key: string, value: boolean) => {
        try {
            // Optimistic update
            if (key === 'notifications') setNotificationsEnabled(value);
            if (key === 'darkMode') setDarkMode(value);

            const updatedPreferences = {
                notifications: key === 'notifications' ? value : notificationsEnabled,
                darkMode: key === 'darkMode' ? value : darkMode,
            };

            await apiRequest('/users/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    preferences: updatedPreferences
                })
            });
        } catch (error: any) {
            Alert.alert("Error", "Failed to update settings");
            // Revert on error
            if (key === 'notifications') setNotificationsEnabled(!value);
            if (key === 'darkMode') setDarkMode(!value);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log Out",
                    style: "destructive",
                    onPress: async () => {
                        await AsyncStorage.multiRemove(['userSession', 'token']);
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Auth' as never }],
                        });
                    }
                }
            ]
        );
    };

    if (loading && !user) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#1e1e1e" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1e1e1e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <Text style={styles.sectionHeader}>Account</Text>
                <SettingItem icon={<User size={20} color="#4B5563" />} label="Personal Information" onPress={() => navigation.navigate('PersonalInformation' as never)} />
                <SettingItem icon={<Lock size={20} color="#4B5563" />} label="Security & Login" onPress={() => navigation.navigate('ChangePassword' as never)} />

                <Text style={styles.sectionHeader}>Preferences</Text>

                <View style={styles.row}>
                    <View style={styles.rowLeft}>
                        <View style={styles.iconBox}><Bell size={20} color="#4B5563" /></View>
                        <Text style={styles.label}>Notifications</Text>
                    </View>
                    <Switch
                        value={notificationsEnabled}
                        onValueChange={(val) => updatePreference('notifications', val)}
                        trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                    />
                </View>

                <SettingItem icon={<Globe size={20} color="#4B5563" />} label="Language" value="English" onPress={() => { }} />

                <View style={styles.row}>
                    <View style={styles.rowLeft}>
                        <View style={styles.iconBox}><Moon size={20} color="#4B5563" /></View>
                        <Text style={styles.label}>Dark Mode</Text>
                    </View>
                    <Switch
                        value={darkMode}
                        onValueChange={(val) => updatePreference('darkMode', val)}
                        trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                    />
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <LogOut size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const SettingItem = ({ icon, label, value, onPress }: { icon: any, label: string, value?: string, onPress?: () => void }) => (
    <TouchableOpacity style={styles.row} onPress={onPress}>
        <View style={styles.rowLeft}>
            <View style={styles.iconBox}>{icon}</View>
            <Text style={styles.label}>{label}</Text>
        </View>
        <View style={styles.rowRight}>
            {value && <Text style={styles.value}>{value}</Text>}
            <ChevronRight size={20} color="#9CA3AF" />
        </View>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
    backBtn: { marginRight: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    content: { padding: 20 },
    sectionHeader: { fontSize: 13, fontWeight: 'bold', color: '#9CA3AF', marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
    row: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8,
        shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 2, elevation: 1
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { marginRight: 12 },
    // Moved label slightly down as requested
    label: { fontSize: 16, color: '#1F2937', fontWeight: '500', marginTop: 4 },
    rowRight: { flexDirection: 'row', alignItems: 'center', marginTop: 4 }, // Nudged right side elements down too
    value: { color: '#6B7280', marginRight: 8 },
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FEE2E2', padding: 16, borderRadius: 12, marginTop: 32, gap: 8
    },
    logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
    versionText: { textAlign: 'center', color: '#9CA3AF', marginTop: 24, fontSize: 12 },
});
