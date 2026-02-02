import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { ArrowLeft, User, Bell, Lock, Globe, Moon, ChevronRight, LogOut } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export default function SettingsScreen() {
    const navigation = useNavigation();

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
                <SettingItem icon={<User size={20} color="#4B5563" />} label="Personal Information" />
                <SettingItem icon={<Lock size={20} color="#4B5563" />} label="Security & Login" />

                <Text style={styles.sectionHeader}>Preferences</Text>
                <SettingItem icon={<Bell size={20} color="#4B5563" />} label="Notifications" />
                <SettingItem icon={<Globe size={20} color="#4B5563" />} label="Language" value="English" />
                <View style={styles.row}>
                    <View style={styles.rowLeft}>
                        <View style={styles.iconBox}><Moon size={20} color="#4B5563" /></View>
                        <Text style={styles.label}>Dark Mode</Text>
                    </View>
                    <Switch value={false} trackColor={{ false: '#E5E7EB', true: '#3B82F6' }} />
                </View>

                <TouchableOpacity style={styles.logoutBtn}>
                    <LogOut size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const SettingItem = ({ icon, label, value }: { icon: any, label: string, value?: string }) => (
    <TouchableOpacity style={styles.row}>
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
    label: { fontSize: 16, color: '#1F2937', fontWeight: '500' },
    rowRight: { flexDirection: 'row', alignItems: 'center' },
    value: { color: '#6B7280', marginRight: 8 },
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FEE2E2', padding: 16, borderRadius: 12, marginTop: 32, gap: 8
    },
    logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
    versionText: { textAlign: 'center', color: '#9CA3AF', marginTop: 24, fontSize: 12 },
});
