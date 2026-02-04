import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import {
  ArrowLeft,
  MapPin,
  Plus,
  Trash2,
  Navigation,
  AlertCircle,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { apiRequest } from '../../services/backend';
import { useLanguage } from '../../context/LanguageContext';

interface PreferredDestination {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius_meters: number;
  priority: number;
}

interface Preferences {
  enabled: boolean;
  maxDeviationMeters: number;
  destinations: PreferredDestination[];
}

export default function DriverDestinationsScreen() {
  const navigation = useNavigation();
  const { t, isRTL } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    enabled: false,
    maxDeviationMeters: 2000,
    destinations: [],
  });
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newDestName, setNewDestName] = useState('');
  const [newDestLat, setNewDestLat] = useState('');
  const [newDestLng, setNewDestLng] = useState('');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<Preferences>('/drivers/preferences/destinations');
      setPreferences(data);
    } catch (error: any) {
      console.error('Failed to load preferences:', error);
      Alert.alert(t('error'), t('loadingFailed'));
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = async (value: boolean) => {
    try {
      setSaving(true);
      await apiRequest('/drivers/preferences/destinations', {
        method: 'PUT',
        body: JSON.stringify({ enabled: value }),
      });
      setPreferences((prev) => ({ ...prev, enabled: value }));
    } catch (error: any) {
      Alert.alert(t('error'), t('updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const addDestination = async () => {
    const lat = parseFloat(newDestLat);
    const lng = parseFloat(newDestLng);

    if (!newDestName.trim() || isNaN(lat) || isNaN(lng)) {
      Alert.alert(t('error'), t('invalidInput'));
      return;
    }

    if (preferences.destinations.length >= 3) {
      Alert.alert(t('error'), t('maxDestinationsReached'));
      return;
    }

    try {
      setSaving(true);
      await apiRequest('/drivers/preferences/destinations/add', {
        method: 'POST',
        body: JSON.stringify({
          name: newDestName.trim(),
          lat,
          lng,
          radiusMeters: 5000,
          priority: preferences.destinations.length + 1,
        }),
      });

      setNewDestName('');
      setNewDestLat('');
      setNewDestLng('');
      setAddModalVisible(false);

      await loadPreferences();
    } catch (error: any) {
      const msg = error?.response?.data?.error || t('addFailed');
      Alert.alert(t('error'), msg);
    } finally {
      setSaving(false);
    }
  };

  const deleteDestination = async (destinationId: string) => {
    Alert.alert(
      t('deleteDestination'),
      t('confirmDeleteDestination'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await apiRequest(`/drivers/preferences/destinations/${destinationId}`, {
                method: 'DELETE',
              });
              await loadPreferences();
            } catch (error: any) {
              Alert.alert(t('error'), t('deleteFailed'));
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#1e1e1e" />
      </SafeAreaView>
    );
  }

  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' } as any;
  const textAlign = { textAlign: isRTL ? 'right' : 'left' } as any;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, rowStyle]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }}
        >
          <ArrowLeft size={24} color="#1e1e1e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('preferredDestinations')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Navigation size={24} color="#3B82F6" />
          <Text style={[styles.infoText, textAlign]}>
            {t('destinationPreferenceInfo')}
          </Text>
        </View>

        {/* Enable Toggle */}
        <View style={[styles.toggleRow, rowStyle]}>
          <View style={rowStyle}>
            <MapPin size={20} color="#4B5563" />
            <Text style={[styles.toggleLabel, textAlign]}>
              {t('enableDestinationMode')}
            </Text>
          </View>
          <Switch
            value={preferences.enabled}
            onValueChange={toggleEnabled}
            disabled={saving}
            trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
          />
        </View>

        {/* Destinations List */}
        {preferences.enabled && (
          <>
            <Text style={[styles.sectionTitle, textAlign]}>
              {t('yourDestinations')} ({preferences.destinations.length}/3)
            </Text>

            {preferences.destinations.length === 0 ? (
              <View style={styles.emptyState}>
                <AlertCircle size={48} color="#9CA3AF" />
                <Text style={[styles.emptyText, textAlign]}>
                  {t('noDestinationsSet')}
                </Text>
              </View>
            ) : (
              preferences.destinations.map((dest) => (
                <View key={dest.id} style={styles.destinationCard}>
                  <View style={styles.destinationInfo}>
                    <Text style={styles.destinationName}>{dest.name}</Text>
                    <Text style={styles.destinationCoords}>
                      {dest.lat.toFixed(4)}, {dest.lng.toFixed(4)}
                    </Text>
                    <Text style={styles.destinationRadius}>
                      {t('radius')}: {(dest.radius_meters / 1000).toFixed(1)} km
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteDestination(dest.id)}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* Add Button */}
            {preferences.destinations.length < 3 && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setAddModalVisible(true)}
              >
                <Plus size={24} color="#fff" />
                <Text style={styles.addButtonText}>{t('addDestination')}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Destination Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('addDestination')}</Text>

            <Text style={styles.inputLabel}>{t('destinationName')}</Text>
            <TextInput
              style={styles.input}
              value={newDestName}
              onChangeText={setNewDestName}
              placeholder={t('e.g. Home')}
            />

            <Text style={styles.inputLabel}>{t('latitude')}</Text>
            <TextInput
              style={styles.input}
              value={newDestLat}
              onChangeText={setNewDestLat}
              placeholder="30.0444"
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>{t('longitude')}</Text>
            <TextInput
              style={styles.input}
              value={newDestLng}
              onChangeText={setNewDestLng}
              placeholder="31.2357"
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={addDestination}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{t('save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  toggleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    marginLeft: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#9CA3AF',
    marginBottom: 12,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  destinationInfo: {
    flex: 1,
  },
  destinationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  destinationCoords: {
    fontSize: 13,
    color: '#6B7280',
  },
  destinationRadius: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: '#111827',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#3B82F6',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
