import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Animated, Modal, TouchableWithoutFeedback } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    BookOpen, CreditCard, Headphones, MessageSquare, ShieldCheck, Settings,
    Gift, CarFront, Tag, Scan, ChevronRight, User, LogOut
} from 'lucide-react-native';
import { RootStackParamList } from '../types/navigation';
import { Colors } from '../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;

interface SideMenuProps {
    visible: boolean;
    onClose: () => void;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SideMenu({ visible, onClose }: SideMenuProps) {
    const [modalVisible, setModalVisible] = React.useState(false);
    const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const navigation = useNavigation<NavigationProp>();

    useEffect(() => {
        if (visible) {
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
                    toValue: -SIDEBAR_WIDTH,
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
    }, [visible]);

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
        await AsyncStorage.removeItem('userSession');
        navigation.reset({
            index: 0,
            routes: [{ name: 'SplashScreen' }],
        });
    };

    return (
        <Modal transparent visible={modalVisible} onRequestClose={onClose} animationType="none">
            <View style={styles.overlay}>
                {/* Backdrop / Click outside to close */}
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
                </TouchableWithoutFeedback>

                {/* Sidebar Content */}
                <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
                    <View style={styles.safeArea}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.userName}>salah ezzat</Text>
                                <TouchableOpacity style={styles.editProfileRow} onPress={() => { /* Navigate to Profile Edit */ }}>
                                    <Text style={styles.editProfileText}>Edit Personal Info</Text>
                                    <ChevronRight size={14} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.avatarContainer}>
                                {/* Using icon as placeholder if no image, user can replace later */}
                                <User size={30} color="#fff" />
                            </View>
                        </View>

                        {/* Top Menu Items */}
                        <View style={styles.menuSection}>
                            <MenuItem icon={<BookOpen size={22} color="#F97316" />} label="My Trips" onPress={() => handleNavigation('MyTrips')} />
                            <MenuItem icon={<CreditCard size={22} color="#10B981" />} label="Payment" onPress={() => handleNavigation('Wallet')} />
                            <MenuItem icon={<Headphones size={22} color="#3B82F6" />} label="Help" onPress={() => handleNavigation('Help')} />
                            <MenuItem icon={<MessageSquare size={22} color="#14B8A6" />} label="Messages" onPress={() => handleNavigation('Messages')} />
                            <MenuItem icon={<ShieldCheck size={22} color="#3B82F6" />} label="Safety Center" onPress={() => handleNavigation('Safety')} />
                            <MenuItem icon={<Settings size={22} color="#3B82F6" />} label="Settings" onPress={() => handleNavigation('Settings')} />
                        </View>

                        <View style={styles.divider} />

                        {/* Bottom Menu Items */}
                        <View style={styles.menuSection}>
                            <MenuItem icon={<Gift size={22} color="#F97316" />} label="Invite Friends" onPress={() => handleNavigation('InviteFriends')} />
                            <MenuItem icon={<CarFront size={22} color="#F97316" />} label="Drive with Us" onPress={() => handleNavigation('RoleSelection')} />
                            <MenuItem icon={<Tag size={22} color="#14B8A6" />} label="Discounts" onPress={() => handleNavigation('Discounts')} />
                            <MenuItem icon={<Scan size={22} color="#F97316" />} label="Scan" onPress={() => handleNavigation('Scan')} />

                            {/* Sign Out */}
                            <TouchableOpacity style={[styles.menuItem, { marginTop: 12 }]} onPress={handleSignOut}>
                                <View style={styles.iconBox}>
                                    <LogOut size={22} color={Colors.danger} />
                                </View>
                                <Text style={[styles.menuLabel, { color: Colors.danger }]}>Sign Out</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const MenuItem = ({ icon, label, onPress }: { icon: React.ReactNode, label: string, onPress: () => void }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
        <View style={styles.iconBox}>
            {icon}
        </View>
        <Text style={styles.menuLabel}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        flexDirection: 'row',
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    editProfileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editProfileText: {
        fontSize: 14,
        color: '#6B7280',
        marginRight: 2,
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
        flexDirection: 'row',
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
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 24,
    },
});
