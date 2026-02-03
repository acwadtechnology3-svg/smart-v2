import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { ArrowLeft, User, Bell, Lock, Globe, Moon, ChevronRight, LogOut, Trash2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { apiRequest } from '../../services/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../context/LanguageContext';

export default function SettingsScreen() {
    const navigation = useNavigation();
    const { t, language, setLanguage, isRTL } = useLanguage();

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
            Alert.alert(t('error'), t('updateFailed'));
            if (key === 'notifications') setNotificationsEnabled(!value);
            if (key === 'darkMode') setDarkMode(!value);
        }
    };

    const handleLanguageChange = () => {
        Alert.alert(
            t('selectLanguage'),
            "",
            [
                { text: t('english'), onPress: () => setLanguage('en') },
                { text: t('arabic'), onPress: () => setLanguage('ar') },
                { text: t('cancel'), style: 'cancel' }
            ]
        );
    };

    const handleLogout = async () => {
        Alert.alert(
            t('signOut'),
            t('confirmLogout'),
            [
                { text: t('cancel'), style: "cancel" },
                {
                    text: t('signOut'),
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

    const handleDeleteAccount = async () => {
        Alert.alert(
            t('deleteAccount'),
            t('deleteAccountConfirm'),
            [
                { text: t('cancel'), style: "cancel" },
                {
                    text: t('delete'),
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await apiRequest('/users/account', { method: 'DELETE' });
                            await AsyncStorage.multiRemove(['userSession', 'token']);
                            Alert.alert(t('success'), t('accountDeleted'));
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Auth' as never }],
                            });
                        } catch (error: any) {
                            const msg = error?.response?.data?.error || t('deleteAccountFailed');
                            Alert.alert(t('error'), msg);
                        } finally {
                            setLoading(false);
                        }
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

    const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' } as any;
    const textAlign = { textAlign: isRTL ? 'right' : 'left' } as any;

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }}>
                    <ArrowLeft size={24} color="#1e1e1e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('settings')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <Text style={[styles.sectionHeader, textAlign]}>{t('account')}</Text>

                {/* Note: In a real implementation we would translate 'Personal Information' etc too */}
                <SettingItem
                    icon={<User size={20} color="#4B5563" />}
                    label="Personal Information" // Keep untranslated if not in context, or add to context
                    onPress={() => navigation.navigate('PersonalInformation' as never)}
                    isRTL={isRTL}
                />
                <SettingItem
                    icon={<Lock size={20} color="#4B5563" />}
                    label="Security & Login" // Keep untranslated if not in context
                    onPress={() => navigation.navigate('ChangePassword' as never)}
                    isRTL={isRTL}
                />

                <Text style={[styles.sectionHeader, textAlign]}>{t('preferences')}</Text>

                <View style={[styles.row, rowStyle]}>
                    <View style={[styles.rowLeft, rowStyle]}>
                        <View style={[styles.iconBox, { marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }]}>
                            <Bell size={20} color="#4B5563" />
                        </View>
                        <Text style={styles.label}>Notifications</Text>
                    </View>
                    <Switch
                        value={notificationsEnabled}
                        onValueChange={(val) => updatePreference('notifications', val)}
                        trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                    />
                </View>

                <SettingItem
                    icon={<Globe size={20} color="#4B5563" />}
                    label={t('language')}
                    value={language === 'ar' ? t('arabic') : t('english')}
                    onPress={handleLanguageChange}
                    isRTL={isRTL}
                />

                <View style={[styles.row, rowStyle]}>
                    <View style={[styles.rowLeft, rowStyle]}>
                        <View style={[styles.iconBox, { marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }]}>
                            <Moon size={20} color="#4B5563" />
                        </View>
                        <Text style={styles.label}>Dark Mode</Text>
                    </View>
                    <Switch
                        value={darkMode}
                        onValueChange={(val) => updatePreference('darkMode', val)}
                        trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                    />
                </View>

                <TouchableOpacity style={[
                    styles.logoutBtn,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' }
                ]} onPress={handleLogout}>
                    <LogOut size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>{t('signOut')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[
                    styles.deleteBtn,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' }
                ]} onPress={handleDeleteAccount}>
                    <Trash2 size={20} color="#DC2626" />
                    <Text style={styles.deleteText}>{t('deleteAccount')}</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const SettingItem = ({ icon, label, value, onPress, isRTL }: { icon: any, label: string, value?: string, onPress?: () => void, isRTL: boolean }) => (
    <TouchableOpacity style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={onPress}>
        <View style={[styles.rowLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.iconBox, { marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }]}>
                {icon}
            </View>
            <Text style={styles.label}>{label}</Text>
        </View>
        <View style={[styles.rowRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {value && <Text style={[styles.value, { marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }]}>{value}</Text>}
            <View style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }}>
                <ChevronRight size={20} color="#9CA3AF" />
            </View>
        </View>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    content: { padding: 20 },
    sectionHeader: { fontSize: 13, fontWeight: 'bold', color: '#9CA3AF', marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
    row: {
        alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8,
        shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 2, elevation: 1
    },
    rowLeft: { alignItems: 'center' },
    iconBox: {},
    label: { fontSize: 16, color: '#1F2937', fontWeight: '500', marginTop: 4 },
    rowRight: { alignItems: 'center', marginTop: 4 },
    value: { color: '#6B7280' },
    logoutBtn: {
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FEE2E2', padding: 16, borderRadius: 12, marginTop: 32, gap: 8
    },
    logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
    deleteBtn: {
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FECACA', padding: 16, borderRadius: 12, marginTop: 12, gap: 8
    },
    deleteText: { color: '#DC2626', fontWeight: 'bold', fontSize: 16 },
    versionText: { textAlign: 'center', color: '#9CA3AF', marginTop: 24, fontSize: 12 },
});
