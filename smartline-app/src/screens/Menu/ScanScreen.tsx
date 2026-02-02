import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { ArrowLeft, ScanLine } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export default function ScanScreen() {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                    <ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>

                <View style={styles.scannerFrame}>
                    <ScanLine size={300} color="#fff" strokeWidth={1} />
                    <View style={styles.line} />
                </View>

                <Text style={styles.instruction}>Scan QR Code to Ride</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    closeBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
    scannerFrame: { alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
    line: { width: 280, height: 2, backgroundColor: '#EF4444', position: 'absolute' },
    instruction: { color: '#fff', fontSize: 18, fontWeight: '500' },
});
