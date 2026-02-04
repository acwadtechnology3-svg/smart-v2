import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Animated, Modal, TouchableWithoutFeedback, I18nManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    BookOpen, CreditCard, Headphones, MessageSquare, ShieldCheck, Settings,
    Gift, CarFront, Tag, Scan, ChevronRight, User, LogOut
} from 'lucide-react-native';
import { RootStackParamList } from '../types/navigation';
import { Colors } from '../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;

interface SideMenuProps {
    visible: boolean;
    onClose: () => void;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SideMenu({ visible, onClose }: SideMenuProps) {
    const [modalVisible, setModalVisible] = React.useState(false);
    const { t, isRTL } = useLanguage();

    // Define hidden values based on direction
    const hiddenValue = isRTL ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH;

    // Use hiddenValue as initial value to avoid jump on reload/lang change
    const slideAnim = useRef(new Animated.Value(hiddenValue)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const navigation = useNavigation<NavigationProp>();

    useEffect(() => {
        if (visible) {
            // Reset position before showing (in case language changed while closed)
            slideAnim.setValue(hiddenValue);
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
                    toValue: hiddenValue,
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
    }, [visible, hiddenValue]); // Include hiddenValue dependency

    if (!modalVisible) return null;

    const handleNavigation = (screen: any) => {
        onClose();
        // Small delay to allow closing animation to start
        setTimeout(() => {
            navigation.navigate(screen);
        }, 300);
    };

    const handleSignOut = async () => {
        onClose();
        await AsyncStorage.multiRemove(['userSession', 'token']);
        navigation.reset({
            index: 0,
            routes: [{ name: 'SplashScreen' }],
        });
    };

    return (
        <Modal transparent visible={modalVisible} onRequestClose={onClose} animationType="none">
            <View style={[styles.overlay, { flexDirection: (isRTL === I18nManager.isRTL) ? 'row' : 'row-reverse' }]}>
                {/* Backdrop / Click outside to close */}
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
                </TouchableWithoutFeedback>

                {/* Sidebar Content */}
                <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
                    <View style={styles.safeArea}>
                        {/* Header */}
                        <View style={[styles.header, { flexDirection: (isRTL === I18nManager.isRTL) ? 'row' : 'row-reverse' }]}>
                            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                                <Text style={styles.userName}>Salah Ezzat</Text>
                                <TouchableOpacity style={[styles.editProfileRow, { flexDirection: (isRTL === I18nManager.isRTL) ? 'row' : 'row-reverse' }]} onPress={() => { /* Navigate to Profile Edit */ }}>
                                    <Text style={[styles.editProfileText, { marginRight: isRTL ? 0 : 2, marginLeft: isRTL ? 2 : 0 }]}>{t('editPersonalInfo')}</Text>
                                    <View style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }}>
                                        <ChevronRight size={14} color="#6B7280" />
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.avatarContainer, { marginLeft: isRTL ? 0 : 0, marginRight: isRTL ? 0 : 0 }]}>
                                {/* Using icon as placeholder if no image, user can replace later */}
                                <User size={30} color="#fff" />
                            </View>
                        </View>

                        {/* Top Menu Items */}
                        <View style={styles.menuSection}>
                            <MenuItem icon={<BookOpen size={22} color="#F97316" />} label={t('myTrips')} onPress={() => handleNavigation('MyTrips')} isRTL={isRTL} />
                            <MenuItem icon={<CreditCard size={22} color="#10B981" />} label={t('wallet')} onPress={() => handleNavigation('Wallet')} isRTL={isRTL} />
                            <MenuItem icon={<Headphones size={22} color="#3B82F6" />} label={t('support')} onPress={() => handleNavigation('Help')} isRTL={isRTL} />
                            <MenuItem icon={<MessageSquare size={22} color="#14B8A6" />} label={t('messages')} onPress={() => handleNavigation('Messages')} isRTL={isRTL} />
                            <MenuItem icon={<ShieldCheck size={22} color="#3B82F6" />} label={t('safetyCenter')} onPress={() => handleNavigation('Safety')} isRTL={isRTL} />
                            <MenuItem icon={<Settings size={22} color="#3B82F6" />} label={t('settings')} onPress={() => handleNavigation('Settings')} isRTL={isRTL} />
                        </View>

                        <View style={styles.divider} />

                        {/* Bottom Menu Items */}
                        <View style={styles.menuSection}>
                            <MenuItem icon={<Gift size={22} color="#F97316" />} label={t('inviteFriends')} onPress={() => handleNavigation('InviteFriends')} isRTL={isRTL} />
                            <MenuItem icon={<CarFront size={22} color="#F97316" />} label={t('driveWithUs')} onPress={() => handleNavigation('RoleSelection')} isRTL={isRTL} />
                            <MenuItem icon={<Tag size={22} color="#14B8A6" />} label={t('discounts')} onPress={() => handleNavigation('Discounts')} isRTL={isRTL} />
                            <MenuItem icon={<Scan size={22} color="#F97316" />} label={t('scan')} onPress={() => handleNavigation('Scan')} isRTL={isRTL} />

                            {/* Sign Out */}
                            <TouchableOpacity style={[styles.menuItem, { marginTop: 12, flexDirection: (isRTL === I18nManager.isRTL) ? 'row' : 'row-reverse' }]} onPress={handleSignOut}>
                                <View style={styles.iconBox}>
                                    <LogOut size={22} color={Colors.danger} />
                                </View>
                                <Text style={[styles.menuLabel, { color: Colors.danger, textAlign: isRTL ? 'right' : 'left' }]}>{t('signOut')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const MenuItem = ({ icon, label, onPress, isRTL }: { icon: React.ReactNode, label: string, onPress: () => void, isRTL: boolean }) => (
    <TouchableOpacity style={[styles.menuItem, { flexDirection: (isRTL === I18nManager.isRTL) ? 'row' : 'row-reverse' }]} onPress={onPress}>
        <View style={styles.iconBox}>
            {icon}
        </View>
        <Text style={[styles.menuLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        // flexDirection set dynamically
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        width: width, // Ensure covers full screen
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
        paddingTop: 60, // Adjust for status bar
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 40,
        // flexDirection set dynamically
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    editProfileRow: {
        alignItems: 'center',
        // flexDirection set dynamically
    },
    editProfileText: {
        fontSize: 14,
        color: '#6B7280',
        // margin set dynamically
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#3B82F6', // Using blue bg placeholder like image
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
        // flexDirection set dynamically
    },
    iconBox: {
        width: 24,
        alignItems: 'center',
    },
    menuLabel: {
        fontSize: 16,
        color: '#111827',
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 24,
    },
});
