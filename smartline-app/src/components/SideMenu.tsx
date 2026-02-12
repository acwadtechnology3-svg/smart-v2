import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Modal, TouchableWithoutFeedback, I18nManager, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    BookOpen, CreditCard, Headphones, MessageSquare, ShieldCheck, Settings,
    Gift, Tag, ChevronRight, User, LogOut, ArrowRight, ArrowLeft
} from 'lucide-react-native';
import { RootStackParamList } from '../types/navigation';
import { Colors } from '../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;

interface SideMenuProps {
    visible: boolean;
    onClose: () => void;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SideMenu({ visible, onClose }: SideMenuProps) {
    const [modalVisible, setModalVisible] = React.useState(false);
    const { t, isRTL } = useLanguage();

    // Calculate correct hidden offset
    // XOR Logic: If isRTL matches I18nManager.isRTL, we use standard directions. 
    // If mismatch, we flip.
    // 
    // Goal:
    // Arabic (isRTL=true): Want sidebar on visual Right.
    // English (isRTL=false): Want sidebar on visual Left.
    //
    // Offsets:
    // Native LTR: Right is +W, Left is -W.
    // Native RTL: Right is -W, Left is +W.

    const getHiddenOffset = () => {
        const wantsRight = isRTL;
        const nativeRTL = I18nManager.isRTL;

        if (nativeRTL) {
            // Native RTL: 0 is Right, +X is Left, -X is Right(offscreen)
            return wantsRight ? -SIDEBAR_WIDTH : SIDEBAR_WIDTH;
        } else {
            // Native LTR: 0 is Left, +X is Right, -X is Left(offscreen)
            return wantsRight ? SIDEBAR_WIDTH : -SIDEBAR_WIDTH;
        }
    };

    const hiddenValue = getHiddenOffset();

    const slideAnim = useRef(new Animated.Value(hiddenValue)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const navigation = useNavigation<NavigationProp>();

    useEffect(() => {
        if (visible) {
            setModalVisible(true);
            // Instant reset to hidden position before animating in
            slideAnim.setValue(hiddenValue);

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
    }, [visible, isRTL]); // Re-run if RTL changes

    if (!modalVisible) return null;

    const handleNavigation = (screen: any) => {
        onClose();
        setTimeout(() => {
            navigation.navigate(screen);
        }, 300);
    };

    const handleSignOut = async () => {
        onClose();
        await AsyncStorage.multiRemove(['userSession', 'token']);
        navigation.reset({
            index: 0,
            routes: [{ name: 'Auth' as never }],
        });
    };

    // Layout Direction Helper
    // If isRTL matches native, use Row. If mismatch (simulating), use Row-Reverse.
    const flexDirection = (isRTL === I18nManager.isRTL) ? 'row' : 'row-reverse';
    const textAlign = isRTL ? 'right' : 'left';
    const iconMargin = isRTL ? { marginLeft: 16 } : { marginRight: 16 };

    // For specific inner items that need strict row-reverse regardless of container
    const itemDirection = isRTL ? 'row-reverse' : 'row';

    return (
        <Modal transparent visible={modalVisible} onRequestClose={onClose} animationType="none">
            {/* The Overlay Container determines which side the Sidebar sits on */}
            <View style={[styles.overlay, { flexDirection }]}>

                {/* Backdrop */}
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
                </TouchableWithoutFeedback>

                {/* Sidebar */}
                <Animated.View style={[
                    styles.sidebar,
                    { transform: [{ translateX: slideAnim }] }
                ]}>
                    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

                        {/* Header */}
                        <TouchableOpacity
                            style={[styles.header, { flexDirection }]}
                            onPress={() => handleNavigation('PersonalInformation')}
                        >
                            <View style={styles.avatarContainer}>
                                <User size={30} color="#fff" />
                            </View>
                            <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                                <Text style={styles.userName}>Salah Ezzat</Text>
                                <Text style={styles.editProfileText}>{t('viewProfile')}</Text>
                            </View>
                            {isRTL ? <ArrowLeft size={16} color="#9CA3AF" /> : <ArrowRight size={16} color="#9CA3AF" />}
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        {/* Menu Items */}
                        <View style={styles.menuContainer}>
                            <MenuItem
                                icon={<BookOpen size={22} color="#F97316" />}
                                label={t('tripHistory')}
                                onPress={() => handleNavigation('History')}
                                isRTL={isRTL}
                            />
                            <MenuItem
                                icon={<CreditCard size={22} color="#10B981" />}
                                label={t('wallet')}
                                onPress={() => handleNavigation('Wallet')}
                                isRTL={isRTL}
                            />
                            <MenuItem
                                icon={<Tag size={22} color="#14B8A6" />}
                                label={t('discounts')}
                                onPress={() => handleNavigation('Discounts')}
                                isRTL={isRTL}
                            />
                            <MenuItem
                                icon={<Headphones size={22} color="#3B82F6" />}
                                label={t('support')}
                                onPress={() => handleNavigation('Help')}
                                isRTL={isRTL}
                            />
                            <MenuItem
                                icon={<MessageSquare size={22} color="#8B5CF6" />}
                                label={t('messages')}
                                onPress={() => handleNavigation('Messages')}
                                isRTL={isRTL}
                            />
                            <MenuItem
                                icon={<ShieldCheck size={22} color="#EF4444" />}
                                label={t('safetyCenter')}
                                onPress={() => handleNavigation('Safety')}
                                isRTL={isRTL}
                            />
                            <MenuItem
                                icon={<Settings size={22} color="#6B7280" />}
                                label={t('settings')}
                                onPress={() => handleNavigation('Settings')}
                                isRTL={isRTL}
                            />
                            <MenuItem
                                icon={<Gift size={22} color="#EC4899" />}
                                label={t('inviteFriends')}
                                onPress={() => handleNavigation('InviteFriends')}
                                isRTL={isRTL}
                            />
                        </View>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <TouchableOpacity style={[styles.menuItem, { flexDirection }]} onPress={handleSignOut}>
                                <View style={styles.iconBox}>
                                    <LogOut size={22} color={Colors.danger} />
                                </View>
                                <Text style={[styles.menuLabel, { color: Colors.danger }]}>{t('signOut')}</Text>
                            </TouchableOpacity>
                        </View>

                    </SafeAreaView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const MenuItem = ({ icon, label, onPress, isRTL }: { icon: React.ReactNode, label: string, onPress: () => void, isRTL: boolean }) => {
    // If simulating RTL (Ar but Native LTR), we need row-reverse.
    // If simulating LTR (En but Native RTL), we need row-reverse.
    // Basically if isRTL != NativeRTL, use row-reverse.
    // Wait, simpler:
    // If isRTL: we want [Label ... Icon] ? No, sidebar usually [Icon Label]
    // Standard Sidebar: [Icon] [Label]
    // Arabic Sidebar: [Label] [Icon]? No, usually [Icon] [Label] right aligned.
    // Actually, standard material design RTL: [Icon] [Label] but aligned start (Right).

    // So we just want 'row' direction always (Start -> End), but the 'Start' changes.
    // If Native LTR + Ar: Start is Left. We want Right. So 'row-reverse'.
    // If Native RTL + Ar: Start is Right. We want Right. So 'row'.

    const flexDirection = (isRTL === I18nManager.isRTL) ? 'row' : 'row-reverse';

    return (
        <TouchableOpacity style={[styles.menuItem, { flexDirection }]} onPress={onPress}>
            <View style={styles.iconBox}>
                {icon}
            </View>
            <Text style={[styles.menuLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sidebar: {
        width: SIDEBAR_WIDTH,
        height: '100%',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    safeArea: {
        flex: 1,
        paddingTop: 20,
        paddingHorizontal: 20,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    editProfileText: {
        fontSize: 14,
        color: Colors.primary,
        marginTop: 2,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#3B82F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 10,
    },
    menuContainer: {
        flex: 1,
        paddingTop: 10,
    },
    menuItem: {
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 8,
    },
    iconBox: {
        width: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuLabel: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
        flex: 1,
        marginHorizontal: 12,
    },
    footer: {
        paddingVertical: 20,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    }
});
