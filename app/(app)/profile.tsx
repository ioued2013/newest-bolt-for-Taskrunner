import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/contexts/AuthContext';
import LanguageSelector from '../../src/components/LanguageSelector';
import { supabase } from '../../src/lib/supabase';

export default function Profile() {
  const { t } = useTranslation();
  const { profile, updateProfile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    username: profile?.username || '',
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  });

  const handleUpdateProfile = async () => {
    setLoading(true);
    const { error } = await updateProfile(formData);
    
    if (error) {
      Alert.alert(t('common.error'), t('profile.errors.updateFailed'));
    } else {
      Alert.alert(t('common.success'), t('profile.success.profileUpdated'));
    }
    setLoading(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('profile.errors.permissionNeeded'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!user) return;

    // Add memory safety checks
    const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB limit for avatars
    
    setUploading(true);
    
    try {
      const response = await fetch(uri);
      
      // Check content length before processing
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_AVATAR_SIZE) {
        throw new Error('Avatar too large. Maximum size is 5MB.');
      }
      
      const blob = await response.blob();
      
      // Additional size check after blob creation
      if (blob.size > MAX_AVATAR_SIZE) {
        throw new Error('Avatar too large. Maximum size is 5MB.');
      }
      
      const arrayBuffer = await blob.arrayBuffer();
      
      // Validate array buffer
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Invalid file: empty content');
      }
      
      if (arrayBuffer.byteLength > MAX_AVATAR_SIZE) {
        throw new Error('Avatar too large after processing');
      }
      
      const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await updateProfile({
        avatar_url: data.publicUrl,
      });

      if (updateError) {
        throw updateError;
      }

      Alert.alert(t('common.success'), t('profile.success.avatarUpdated'));
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('profile.errors.uploadFailed'));
    } finally {
      setUploading(false);
      // Force garbage collection hint
      if (global.gc) {
        global.gc();
      }
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'client':
        return t('auth.roles.client');
      case 'merchant':
        return t('auth.roles.merchant');
      case 'driver':
        return t('auth.roles.driver');
      case 'admin':
        return t('auth.roles.admin');
      default:
        return role;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t('profile.title')}</Text>
            <LanguageSelector showLabel={false} />
          </View>
        </View>

        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} disabled={uploading}>
            <View style={styles.avatarContainer}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>
                    {profile?.username?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <View style={styles.avatarOverlay}>
                <Text style={styles.avatarOverlayText}>
                  {uploading ? t('profile.uploading') : t('profile.changeAvatar')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.roleSection}>
          <Text style={styles.roleLabel}>{t('profile.role')}</Text>
          <Text style={styles.roleValue}>
            {profile?.role ? getRoleDisplayName(profile.role) : t('common.loading')}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.username')}</Text>
            <TextInput
              style={styles.input}
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
              placeholder={t('profile.placeholders.username')}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.fullName')}</Text>
            <TextInput
              style={styles.input}
              value={formData.full_name}
              onChangeText={(text) => setFormData({ ...formData, full_name: text })}
              placeholder={t('profile.placeholders.fullName')}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.phone')}</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder={t('profile.placeholders.phone')}
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity
            style={[styles.updateButton, loading && styles.updateButtonDisabled]}
            onPress={handleUpdateProfile}
            disabled={loading}
          >
            <Text style={styles.updateButtonText}>
              {loading ? t('profile.updating') : t('profile.updateProfile')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>{t('profile.accountInfo')}</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{t('profile.email')}</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{t('profile.memberSince')}</Text>
            <Text style={styles.infoValue}>
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    paddingVertical: 8,
    alignItems: 'center',
  },
  avatarOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  roleSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  form: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  updateButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});