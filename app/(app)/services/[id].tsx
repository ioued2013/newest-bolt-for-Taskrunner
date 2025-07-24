import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, MapPin, Clock, MessageCircle, Star } from 'lucide-react-native';
import { useAuth } from '../../../src/contexts/AuthContext';
import { supabase, Database } from '../../../src/lib/supabase';

type Service = Database['public']['Tables']['services']['Row'] & {
  merchant: {
    id: string;
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
  category: {
    name: string;
  } | null;
};

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchService();
    }
  }, [id]);

  const fetchService = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          merchant:profiles!services_merchant_id_fkey(id, username, avatar_url, full_name),
          category:categories(name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setService(data);
    } catch (error) {
      console.error('Error fetching service:', error);
      Alert.alert('Error', 'Failed to load service details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleBookService = async () => {
    if (!user || !service) return;

    if (profile?.role !== 'client') {
      Alert.alert('Access Denied', 'Only clients can book services');
      return;
    }

    try {
      const { error } = await supabase
        .from('service_requests')
        .insert({
          client_id: user.id,
          merchant_id: service.merchant_id,
          service_id: service.id,
          description: `Request for: ${service.title}`,
          price_quoted: service.price,
        });

      if (error) throw error;

      Alert.alert('Success', 'Service request sent successfully!', [
        { text: 'OK', onPress: () => router.push('/(app)/requests') }
      ]);
    } catch (error) {
      console.error('Error booking service:', error);
      Alert.alert('Error', 'Failed to book service');
    }
  };

  const handleContactMerchant = async () => {
    if (!user || !service) return;

    try {
      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', user.id)
        .eq('merchant_id', service.merchant_id)
        .single();

      if (existingConversation) {
        router.push(`/(app)/messages/${existingConversation.id}`);
      } else {
        // Create new conversation
        const { data: newConversation, error } = await supabase
          .from('conversations')
          .insert({
            client_id: user.id,
            merchant_id: service.merchant_id,
          })
          .select('id')
          .single();

        if (error) throw error;

        router.push(`/(app)/messages/${newConversation.id}`);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!service) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Service not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Service Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {service.images && service.images.length > 0 && (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {service.images.map((image, index) => (
              <Image key={index} source={{ uri: image }} style={styles.heroImage} />
            ))}
          </ScrollView>
        )}

        <View style={styles.serviceInfo}>
          <Text style={styles.serviceTitle}>{service.title}</Text>
          
          {service.category && (
            <Text style={styles.categoryBadge}>{service.category.name}</Text>
          )}

          <Text style={styles.serviceDescription}>{service.description}</Text>

          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Clock size={16} color="#6B7280" />
              <Text style={styles.detailText}>{service.duration_minutes} minutes</Text>
            </View>
            
            {service.service_area && (
              <View style={styles.detailItem}>
                <MapPin size={16} color="#6B7280" />
                <Text style={styles.detailText}>{service.service_area}</Text>
              </View>
            )}
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              ${service.price?.toFixed(2) || 'Quote on request'}
              {service.price_type === 'hourly' && '/hr'}
              {service.price_type === 'per_item' && '/item'}
            </Text>
          </View>
        </View>

        <View style={styles.merchantSection}>
          <Text style={styles.sectionTitle}>Service Provider</Text>
          <View style={styles.merchantCard}>
            {service.merchant.avatar_url ? (
              <Image source={{ uri: service.merchant.avatar_url }} style={styles.merchantAvatar} />
            ) : (
              <View style={styles.merchantAvatarPlaceholder}>
                <Text style={styles.merchantAvatarText}>
                  {service.merchant.username?.charAt(0).toUpperCase() || 'M'}
                </Text>
              </View>
            )}
            <View style={styles.merchantInfo}>
              <Text style={styles.merchantName}>
                {service.merchant.full_name || service.merchant.username}
              </Text>
              <View style={styles.ratingContainer}>
                <Star size={16} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.ratingText}>4.8 (24 reviews)</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {profile?.role === 'client' && service.merchant_id !== user?.id && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContactMerchant}
          >
            <MessageCircle size={20} color="#3B82F6" />
            <Text style={styles.contactButtonText}>Message</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.bookButton}
            onPress={handleBookService}
          >
            <Text style={styles.bookButtonText}>Book Service</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: {
    width: 400,
    height: 240,
  },
  serviceInfo: {
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  serviceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  serviceDescription: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 20,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  priceContainer: {
    alignItems: 'flex-start',
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#059669',
  },
  merchantSection: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  merchantCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  merchantAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  merchantAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  merchantAvatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
    marginRight: 8,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 8,
  },
  bookButton: {
    flex: 2,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});