import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Animated, Modal, TouchableWithoutFeedback, I18nManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    Wallet, History, CircleDollarSign, Car, Settings, Headphones,
    LogOut, User, ChevronRight, RefreshCw
} from 'lucide-react-native';
import { RootStackParamList } from '../types/navigation';
import { Colors } from '../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../services/backend';
import { useLanguage } from '../context/LanguageContext';
import { CachedImage } from './CachedImage';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;

interface SideMenuProps {
    visible: boolean;
    onClose: () => void;
    initialProfile?: any;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DriverSideMenu({ visible, onClose, initialProfile }: SideMenuProps) {
    const { t, isRTL } = useLanguage();
    const [modalVisible, setModalVisible] = React.useState(false);

    // Initial position logic
    const hiddenValue = isRTL ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH;
    const slideAnim = useRef(new Animated.Value(hiddenValue)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const navigation = useNavigation<NavigationProp>();

    // User Data State
    const [driverName, setDriverName] = useState('Driver');
    const [profileUrl, setProfileUrl] = useState<string | null>(null);

    useEffect(() => {
        if (initialProfile) {
            if (initialProfile.users?.full_name) setDriverName(initialProfile.users.full_name);
            if (initialProfile.profile_photo_url) {
                setProfileUrl(initialProfile.profile_photo_url);
            }
        }
    }, [initialProfile]);

    useEffect(() => {
        // Reset animation value immediately when direction changes while hidden
        if (!visible) {
            slideAnim.setValue(isRTL ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH);
        }
    }, [isRTL, visible]);

    useEffect(() => {
        if (visible) {
            if (!initialProfile || (!initialProfile.users?.full_name && !initialProfile.profile_photo_url)) {
                fetchDriverData();
            }

            setModalVisible(true);
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: isRTL ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setModalVisible(false);
            });
        }
    }, [visible, isRTL]);

    const fetchDriverData = async () => {
        try {
            const summary = await apiRequest<{ driver: any }>('/drivers/summary');
            if (summary.driver?.users?.full_name) {
                setDriverName(summary.driver.users.full_name);
            }
            if (summary.driver?.profile_photo_url) {
                setProfileUrl(summary.driver.profile_photo_url);
            }
        } catch (e) {
            console.error("fetchDriverData exception:", e);
        }
    };

    if (!modalVisible) return null;

    const handleNavigation = (screen: any) => {
        onClose();
        setTimeout(() => {
            navigation.navigate(screen);
        }, 300);
    };

    const handleSignOut = async () => {
        onClose();
        await AsyncStorage.removeItem('userSession');
        navigation.reset({
            index: 0,
            routes: [{ name: 'SplashScreen' }],
        });
    };

    const flexDirection = (isRTL === I18nManager.isRTL) ? 'row' : 'row-reverse';
    const textAlign = isRTL ? 'right' : 'left';
    const itemFlexDirection = (isRTL === I18nManager.isRTL) ? 'row' : 'row-reverse';

    return (
        <Modal transparent visible={modalVisible} onRequestClose={onClose} animationType="none">
            <View style={[styles.overlay, { flexDirection }]}>
                {/* Backdrop / Click outside to close */}
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
                </TouchableWithoutFeedback>

                {/* Sidebar Content */}
                <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
                    <View style={styles.safeArea}>
                        {/* Header */}
                        <View style={[styles.header, { flexDirection }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.userName, { textAlign }]}>{driverName}</Text>
                                <TouchableOpacity
                                    style={[
                                        styles.editProfileRow,
                                        {
                                            flexDirection: isRTL ? 'row' : 'row-reverse',
                                            justifyContent: isRTL ? 'flex-end' : 'flex-start'
                                        }
                                    ]}
                                    onPress={() => handleNavigation('Settings')}
                                >
                                    <View style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }}>
                                        <ChevronRight size={14} color="#6B7280" />
                                    </View>
                                    <Text style={[styles.editProfileText, { marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }]}>
                                        {t('viewProfile')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.avatarContainer}>
                                {profileUrl ? (
                                    <CachedImage source={{ uri: profileUrl }} style={{ width: 60, height: 60 }} />
                                ) : (
                                    <User size={30} color="#fff" />
                                )}
                            </View>
                        </View>

                        {/* Top Menu Items */}
                        <View style={styles.menuSection}>
                            <MenuItem icon={<Wallet size={22} color={Colors.primary} />} label={t('wallet')} onPress={() => handleNavigation('DriverWallet')} isRTL={isRTL} />
                            <MenuItem icon={<History size={22} color="#F97316" />} label={t('tripHistory')} onPress={() => handleNavigation('DriverHistory')} isRTL={isRTL} />
                            <MenuItem icon={<CircleDollarSign size={22} color="#10B981" />} label={t('earnings')} onPress={() => handleNavigation('DriverEarnings')} isRTL={isRTL} />
                            <MenuItem icon={<Car size={22} color="#3B82F6" />} label={t('myVehicle')} onPress={() => handleNavigation('DriverMyVehicle')} isRTL={isRTL} />
                        </View>

                        <View style={styles.divider} />

                        {/* Bottom Menu Items */}
                        <View style={styles.menuSection}>
                            <MenuItem icon={<Headphones size={22} color="#3B82F6" />} label={t('support')} onPress={() => handleNavigation('DriverSupport')} isRTL={isRTL} />
                            <MenuItem icon={<Settings size={22} color="#6B7280" />} label={t('settings')} onPress={() => handleNavigation('Settings')} isRTL={isRTL} />

                            {/* Sign Out */}
                            <TouchableOpacity style={[styles.menuItem, { marginTop: 12, flexDirection: itemFlexDirection }]} onPress={handleSignOut}>
                                <View style={styles.iconBox}>
                                    <LogOut size={22} color={Colors.danger} />
                                </View>
                                <Text style={[styles.menuLabel, { color: Colors.danger, textAlign }]}>{t('signOut')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const MenuItem = ({ icon, label, onPress, isRTL }: { icon: React.ReactNode, label: string, onPress: () => void, isRTL: boolean }) => (
    <TouchableOpacity style={[styles.menuItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={onPress}>
        <View style={styles.iconBox}>
            {icon}
        </View>
        <Text style={[styles.menuLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        width: width,
    },
    sidebar: {
        width: SIDEBAR_WIDTH,
        height: '100%',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    safeArea: {
        flex: 1,
        paddingTop: 60,
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 40,
        gap: 15
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    editProfileRow: {
        alignItems: 'center',
        gap: 4
    },
    editProfileText: {
        fontSize: 14,
        color: '#6B7280',
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    menuSection: {
        gap: 24,
    },
    menuItem: {
        alignItems: 'center',
        gap: 16,
    },
    iconBox: {
        width: 24,
        alignItems: 'center',
    },
    menuLabel: {
        fontSize: 16,
        color: '#111827',
        fontWeight: '500',
        flex: 1
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 24,
    },
});
