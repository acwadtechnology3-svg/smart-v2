import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { Shield, Phone, AlertTriangle, MapPin, X } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';

const { width, height } = Dimensions.get('window');

interface SafetyModalProps {
  visible: boolean;
  onClose: () => void;
  onCallEmergency: () => void;
  onSendSOS: () => void;
  onShareLocation: () => void;
}

export default function SafetyModal({
  visible,
  onClose,
  onCallEmergency,
  onSendSOS,
  onShareLocation,
}: SafetyModalProps) {
  const { t, isRTL } = useLanguage();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Modal Content */}
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { flexDirection: isRTL ? 'column-reverse' : 'column' }]}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X color={Colors.textSecondary} size={24} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Shield color="#fff" size={32} />
            </View>
            <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('safetyEmergency')}
            </Text>
            <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('chooseOption')}
            </Text>
          </View>

          {/* Options */}
          <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
            {/* Call Emergency */}
            <TouchableOpacity
              style={[styles.optionButton, styles.emergencyButton]}
              onPress={onCallEmergency}
              activeOpacity={0.8}
            >
              <View style={styles.optionIconContainer}>
                <Phone color="#fff" size={24} />
              </View>
              <View style={[styles.optionTextContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('callEmergency')}
                  </Text>
                  <Text style={[styles.optionSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                    Call 122 - Egyptian Emergency Services
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Send SOS */}
            <TouchableOpacity
              style={[styles.optionButton, styles.sosButton]}
              onPress={onSendSOS}
              activeOpacity={0.8}
            >
              <View style={styles.optionIconContainer}>
                <AlertTriangle color="#fff" size={24} />
              </View>
              <View style={[styles.optionTextContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('sendSOS')}
                  </Text>
                  <Text style={[styles.optionSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                    Send location to dispatch team
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Share Location */}
            <TouchableOpacity
              style={[styles.optionButton, styles.shareButton]}
              onPress={onShareLocation}
              activeOpacity={0.8}
            >
              <View style={styles.optionIconContainer}>
                <MapPin color="#fff" size={24} />
              </View>
              <View style={[styles.optionTextContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('shareLocation')}
                  </Text>
                  <Text style={[styles.optionSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                    Share your current location
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </ScrollView>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalView: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'android' ? 30 : 40,
    maxHeight: height * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e1e1e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  optionsContainer: {
    marginBottom: 16,
    maxHeight: height * 0.5,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 12,
    gap: 12,
  },
  emergencyButton: {
    backgroundColor: '#EF4444',
  },
  sosButton: {
    backgroundColor: '#F59E0B',
  },
  shareButton: {
    backgroundColor: '#3B82F6',
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  cancelButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
