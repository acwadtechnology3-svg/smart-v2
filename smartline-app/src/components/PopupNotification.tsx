import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X } from 'lucide-react-native';
import { apiRequest } from '../services/backend';

const { width } = Dimensions.get('window');

interface Popup {
    id: string;
    title: string;
    image_url: string;
    target_role: string;
}

interface Props {
    role: 'customer' | 'driver';
}

export default function PopupNotification({ role }: Props) {
    const [visible, setVisible] = useState(false);
    const [popup, setPopup] = useState<Popup | null>(null);
    const [aspectRatio, setAspectRatio] = useState<number>(1); // Default square

    useEffect(() => {
        checkPopup();
    }, []);

    const checkPopup = async () => {
        try {
            // Fetch active popup from public endpoint
            const response = await apiRequest<{ popup: Popup | null }>(`/popups/active?role=${role}`, { auth: false });

            if (response && response.popup) {
                const storedId = await AsyncStorage.getItem(`lastSeenPopup_${role}`);

                // Show if it's a new popup (ID mismatch)
                if (storedId !== response.popup.id) {
                    setPopup(response.popup);

                    // calculate aspect ratio
                    Image.getSize(response.popup.image_url, (w, h) => {
                        if (w && h) setAspectRatio(w / h);
                        setVisible(true);
                    }, (err) => {
                        console.warn("Failed to get image size", err);
                        setVisible(true); // Show anyway
                    });
                }
            }
        } catch (e) {
            console.error('Failed to fetch popup', e);
        }
    };

    const handleClose = async () => {
        if (popup) {
            // Persist that we've seen this popup
            await AsyncStorage.setItem(`lastSeenPopup_${role}`, popup.id);
        }
        setVisible(false);
    };

    if (!popup || !visible) return null;

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <View style={[styles.container, { aspectRatio }]}>
                    <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                        <X size={24} color="#333" />
                    </TouchableOpacity>

                    <Image
                        source={{ uri: popup.image_url }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)', // Dimmed background
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30
    },
    container: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 20,
        padding: 4,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        elevation: 2
    },
    image: {
        width: '100%',
        height: '100%'
    }
});
