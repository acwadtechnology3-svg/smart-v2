
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Animated, Modal, TouchableWithoutFeedback } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    LayoutDashboard, History, CircleDollarSign, Car, Settings, Headphones,
    LogOut, User, ChevronRight, RefreshCw
} from 'lucide-react-native';
import { RootStackParamList } from '../types/navigation';
import { Colors } from '../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../services/backend';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;

interface SideMenuProps {
    visible: boolean;
    onClose: () => void;
    initialProfile?: any;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DriverSideMenu({ visible, onClose, initialProfile }: SideMenuProps) {
    const [modalVisible, setModalVisible] = React.useState(false);
    const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const navigation = useNavigation<NavigationProp>();

    // User Data State
    const [driverName, setDriverName] = useState('Driver');
    const [profileUrl, setProfileUrl] = useState<string | null>(null);

    useEffect(() => {
        if (initialProfile) {
            console.log("Hydrating SideMenu. Photo URL:", initialProfile.profile_photo_url); // Debug log
            if (initialProfile.users?.full_name) setDriverName(initialProfile.users.full_name);
            if (initialProfile.profile_photo_url) {
                setProfileUrl(initialProfile.profile_photo_url);
            }
        }
    }, [initialProfile]);

    useEffect(() => {
        if (visible) {
            if (!initialProfile) {
                fetchDriverData();
            } else {
                // Even if we have initial profile, maybe fetch fresh name just in case? 
                // Nah, trust initial data for speed, fetch if missing.
                if (!initialProfile.users?.full_name || !initialProfile.profile_photo_url) {
                    fetchDriverData();
                }
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
            // Ensure these routes exist in your RootStackParamList
            navigation.navigate(screen);
            console.log("Navigating to", screen);
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

    const handleSwitchRole = () => {
        onClose();
        // Logic to switch to passenger mode if applicable, or go to role selection
        navigation.reset({
            index: 0,
            routes: [{ name: 'RoleSelection' }],
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
                                <Text style={styles.userName}>{driverName}</Text>
                                <TouchableOpacity style={styles.editProfileRow} onPress={() => handleNavigation('Settings')}>
                                    <Text style={styles.editProfileText}>View Profile</Text>
                                    <ChevronRight size={14} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.avatarContainer}>
                                {profileUrl ? (
                                    <Image source={{ uri: profileUrl }} style={{ width: 60, height: 60 }} />
                                ) : (
                                    <User size={30} color="#fff" />
                                )}
                            </View>
                        </View>

                        {/* Top Menu Items */}
                        <View style={styles.menuSection}>
                            <MenuItem icon={<LayoutDashboard size={22} color={Colors.primary} />} label="Dashboard" onPress={() => handleNavigation('DriverHome')} />
                            <MenuItem icon={<History size={22} color="#F97316" />} label="Trip History" onPress={() => handleNavigation('DriverHistory')} />
                            <MenuItem icon={<CircleDollarSign size={22} color="#10B981" />} label="Earnings" onPress={() => handleNavigation('DriverEarnings')} />
                            <MenuItem icon={<Car size={22} color="#3B82F6" />} label="My Vehicle" onPress={() => handleNavigation('DriverMyVehicle')} />
                        </View>

                        <View style={styles.divider} />

                        {/* Bottom Menu Items */}
                        <View style={styles.menuSection}>
                            <MenuItem icon={<Headphones size={22} color="#3B82F6" />} label="Support" onPress={() => handleNavigation('DriverSupport')} />
                            <MenuItem icon={<Settings size={22} color="#6B7280" />} label="Settings" onPress={() => handleNavigation('Settings')} />

                            {/* Switch Role removed as requested */}

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
        backgroundColor: Colors.primary,
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
