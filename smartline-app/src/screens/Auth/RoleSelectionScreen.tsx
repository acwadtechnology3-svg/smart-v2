import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Image as RNImage } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Car, User, Globe, ArrowLeft } from 'lucide-react-native'; // Using User as fallback for Driver if SteeringWheel not available
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/Colors';
import { useLanguage } from '../../context/LanguageContext';

type RoleSelectionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'RoleSelection'>;

export default function RoleSelectionScreen() {
    const navigation = useNavigation<RoleSelectionScreenNavigationProp>();
    const { t, language, setLanguage, isRTL } = useLanguage();

    const handleSelectRole = (role: 'customer' | 'driver') => {
        navigation.navigate('PhoneInput', { role });
    };

    const toggleLanguage = () => {
        setLanguage(language === 'en' ? 'ar' : 'en');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Top Bar with Back Button (if applicable) and Language Switcher */}
                <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row', paddingHorizontal: 0 }]}>
                    {navigation.canGoBack() ? (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
                            <ArrowLeft size={24} color={Colors.textPrimary} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 40 }} /> // Spacer
                    )}


                </View>

                <View style={styles.header}>
                    <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'center' }]}>{t('welcomeTitle')}</Text>
                    <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'center' }]}>{t('welcomeSubtitle')}</Text>
                </View>

                <View style={styles.cardsContainer}>
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => handleSelectRole('customer')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.imageBox}>
                            <RNImage
                                source={require('../../assets/images/customer_role.webp')}
                                style={styles.roleImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.roleTitle}>{t('iNeedRide')}</Text>
                        <Text style={styles.roleDescription}>{t('bookRides')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => handleSelectRole('driver')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.imageBox}>
                            <RNImage
                                source={require('../../assets/images/driver_role.webp')}
                                style={styles.roleImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.roleTitle}>{t('iWantToDrive')}</Text>
                        <Text style={styles.roleDescription}>{t('earnMoney')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity onPress={toggleLanguage} style={[styles.langButton, { marginTop: 16 }]}>
                        <Globe size={20} color={Colors.textSecondary} />
                        <Text style={styles.langText}>{language === 'en' ? 'العربية' : 'English'}</Text>
                    </TouchableOpacity>
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
        paddingTop: 10, // Adjusted top padding since we have text above
    },
    topBar: {
        width: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: 20,
        height: 40
    },
    langButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: Colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border
    },
    langText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textPrimary
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
    imageBox: {
        width: 120, // Increased size for images
        height: 120,
        marginBottom: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleImage: {
        width: '100%',
        height: '100%',
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
